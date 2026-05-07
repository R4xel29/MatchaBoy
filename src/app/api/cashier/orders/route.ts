import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

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

    // --- SECURE SERVER-SIDE PRICE CALCULATION ---
    const productIds = body.items.map((item: any) => item.productId)
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } }
    })

    let secureSubtotal = 0
    const orderItemsToCreate = []

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

      const secureItemPrice = dbProduct.price + addOnsTotal
      const secureItemTotal = secureItemPrice * item.quantity
      secureSubtotal += secureItemTotal

      orderItemsToCreate.push({
        productId: dbProduct.id,
        qty: item.quantity,
        price: secureItemPrice,
        modifiers: item.modsString || null
      })
    }

    const deliveryFee = orderType === 'DELIVERY' ? (body.deliveryFee || 0) : 0
    const secureTotal = secureSubtotal + deliveryFee

    // Determine initial status based on order type
    // Walk-in POS orders → directly COMPLETED
    // Delivery → ASSIGNED (needs processing)
    let initialStatus = 'COMPLETED'
    if (orderType === 'DELIVERY') {
      initialStatus = 'ASSIGNED'
    }

    // Create the order
    const order = await prisma.order.create({
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
        items: {
          create: orderItemsToCreate
        }
      }
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

    return NextResponse.json({ success: true, orderId: order.id, total: secureTotal })
  } catch (error) {
    console.error('POS order error:', error)
    return NextResponse.json({ error: 'Gagal membuat pesanan' }, { status: 500 })
  }
}
