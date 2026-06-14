import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { cleanupUnconfirmedSpmbOrders } from '@/lib/order-utils'
import { getNextQueueSequence } from '@/lib/rate-limit-redis'

// Lightweight JSON endpoint for client-side polling (replaces router.refresh)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'CASHIER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Clean up old unconfirmed SPMB orders
    await cleanupUnconfirmedSpmbOrders().catch(err => console.error('[Background Cleanup Error]', err));

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: {
        AND: [
          {
            OR: [
              { createdAt: { gte: startOfDay } },
              {
                status: {
                  in: ['PENDING', 'PENDING_PAYMENT', 'PREPARING', 'READY', 'ASSIGNED', 'TO_STORE', 'PICKED_UP', 'ON_DELIVERY']
                }
              }
            ]
          },
          {
            NOT: {
              source: 'SPMB',
              customerPhone: { startsWith: 'SPMB-PENDING' }
            }
          }
        ]
      },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const mappedOrders = orders.map((o) => ({
      id: o.id,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      orderType: o.orderType,
      tableNumber: o.tableNumber,
      address: o.address,
      paymentMethod: o.paymentMethod,
      total: o.total,
      status: o.status,
      cancelReason: o.cancelReason,
      notes: o.notes,
      source: o.source,
      createdAt: o.createdAt.toISOString(),
      paymentProofUrl: o.paymentProofUrl,
      pickupDate: o.pickupDate ? o.pickupDate.toISOString() : null,
      pickupTime: o.pickupTime,
      queueNumber: o.queueNumber,
      items: o.items.map((item) => ({
        id: item.id,
        qty: item.qty,
        price: item.price,
        modifiers: item.modifiers,
        product: { name: item.product.name, image: item.product.image },
      })),
    }));

    const settings = await prisma.storeSettings.findFirst();
    const pickupAlarmLeadTime = settings?.pickupAlarmLeadTime ?? 30;

    return NextResponse.json({ orders: mappedOrders, pickupAlarmLeadTime });
  } catch (error) {
    console.error('Cashier orders polling error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}


export async function POST(req: Request) {
  try {
    const session = await auth()
    
    // Only CASHIER or ADMIN can create POS orders
    if (!session?.user || (session.user.role !== 'CASHIER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    
    // Validation
    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'Keranjang kosong' }, { status: 400 })
    }
    
    if (!body.customerName) {
      return NextResponse.json({ error: 'Nama pelanggan wajib diisi' }, { status: 400 })
    }

    const orderType = body.orderType || 'PICKUP'
    
    if (orderType === 'DELIVERY' && !body.address) {
      return NextResponse.json({ error: 'Alamat pengiriman wajib diisi untuk delivery' }, { status: 400 })
    }

    if (orderType === 'DINE_IN') {
      if (!body.tableNumber) {
        return NextResponse.json({ error: 'Nomor meja wajib diisi untuk Dine-In' }, { status: 400 })
      }
      const table = await prisma.diningTable.findUnique({
        where: { number: body.tableNumber }
      })
      if (!table) {
        return NextResponse.json({ error: `Meja ${body.tableNumber} tidak ditemukan` }, { status: 400 })
      }
    }

    // --- SECURE SERVER-SIDE PRICE CALCULATION ---
    const productIds = body.items.map((item: any) => item.productId)
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } }
    })

    let secureSubtotal = 0
    const orderItemsToCreate: any[] = []

    for (const item of body.items) {
      const dbProduct = dbProducts.find(p => p.id === item.productId)
      if (!dbProduct) {
        return NextResponse.json({ error: `Produk tidak ditemukan` }, { status: 400 })
      }

      // Parse DB modifiers
      let dbModifiers: any = {}
      if (dbProduct.modifiers) {
        try {
          dbModifiers = JSON.parse(dbProduct.modifiers)
        } catch {
          // Ignore parse error
        }
      }

      let secureItemPrice = dbProduct.price;

      if (dbModifiers.isBundle && item.bundleSelections && Array.isArray(item.bundleSelections)) {
        let secureBundleAdjustments = 0;
        for (const sel of item.bundleSelections) {
          const group = dbModifiers.bundleGroups?.find((g: any) => g.id === sel.groupId);
          if (group) {
            const option = group.options?.find((o: any) => o.productId === sel.productId);
            if (option) {
              secureBundleAdjustments += option.priceAdjustment || 0;
            }
          }
        }
        secureItemPrice += secureBundleAdjustments;
      } else {
        // Calculate Add-Ons total
        let addOnsTotal = 0
        if (item.addOnIds && Array.isArray(item.addOnIds) && dbModifiers.addOns) {
          for (const addOnId of item.addOnIds) {
            const validAddOn = dbModifiers.addOns.find((a: any) => a.id === addOnId)
            if (validAddOn) {
              addOnsTotal += validAddOn.price
            }
          }
        }
        secureItemPrice += addOnsTotal;
      }

      const secureItemTotal = secureItemPrice * item.quantity
      secureSubtotal += secureItemTotal

      orderItemsToCreate.push({
        productId: dbProduct.id,
        qty: item.quantity,
        price: secureItemPrice,
        modifiers: dbModifiers.isBundle 
          ? JSON.stringify({ isBundle: true, bundleSelections: item.bundleSelections }) 
          : (item.modsString || null)
      })
    }

    const deliveryFee = orderType === 'DELIVERY' ? (body.deliveryFee || 0) : 0

    // Tumbler discount
    const hasTumbler = body.hasTumbler === true
    let tumblerDiscount = 0
    if (hasTumbler) {
      const loyaltySettings = await prisma.loyaltySettings.findFirst()
      if (loyaltySettings?.tumblerBonusEnabled && loyaltySettings.tumblerDiscountPct > 0) {
        tumblerDiscount = Math.round(secureSubtotal * loyaltySettings.tumblerDiscountPct / 100)
      }
    }

    const secureTotal = secureSubtotal - tumblerDiscount + deliveryFee

    // Determine initial status based on order type
    // Walk-in POS orders → directly COMPLETED
    // Delivery → ASSIGNED (needs processing)
    // Dine In → PREPARING (goes to kitchen queue)
    let initialStatus = 'COMPLETED'
    if (orderType === 'DELIVERY') {
      initialStatus = 'ASSIGNED'
    } else if (orderType === 'DINE_IN') {
      initialStatus = 'PREPARING'
    }

    const prefix = orderType === 'DELIVERY' ? 'DLV' : (orderType === 'DINE_IN' ? 'DIN' : 'POS')
    const queueNumber = `${prefix}-${await getNextQueueSequence(prefix)}`

    // Create the order with sequential queue number in a transaction
    const order = await prisma.$transaction(async (tx) => {

      const newOrder = await tx.order.create({
        data: {
          userId: null, // POS orders don't need a user
          cashierId: session.user.id,
          orderType,
          source: 'POS',
          customerName: body.customerName,
          customerPhone: body.customerPhone || '-',
          address: body.address || '',
          tableNumber: body.tableNumber || null,
          notes: body.notes || null,
          subtotal: secureSubtotal,
          deliveryFee,
          total: secureTotal,
          paymentMethod: body.paymentMethod || 'CASH',
          status: initialStatus,
          hasTumbler,
          queueNumber,
          items: {
            create: orderItemsToCreate
          }
        }
      })

      if (orderType === 'DINE_IN' && body.tableNumber) {
        await tx.diningTable.update({
          where: { number: body.tableNumber },
          data: { status: 'OCCUPIED' }
        })
      }

      return newOrder
    })

    // Update shift stats if cashier has an active shift
    const activeShift = await prisma.cashierShift.findFirst({
      where: {
        cashierId: session.user.id,
        closedAt: null
      }
    })

    if (activeShift) {
      await prisma.cashierShift.update({
        where: { id: activeShift.id },
        data: {
          totalOrders: { increment: 1 },
          totalRevenue: { increment: secureTotal }
        }
      })
    }

    // Send admin notification
    try {
      const { sendAdminNewOrderNotification } = await import('@/lib/whatsapp-service');
      await sendAdminNewOrderNotification(order.id);
    } catch (e) {
      console.error('[POS CHECKOUT] Admin notification error:', e);
    }

    return NextResponse.json({ success: true, orderId: order.id, total: secureTotal })
  } catch (error) {
    console.error('POS order error:', error)
    return NextResponse.json({ error: 'Gagal membuat pesanan' }, { status: 500 })
  }
}
