import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActivePromo } from '@/lib/utils';
import { ValidationError, getSafeErrorResponse, logError } from '@/lib/errors';
import { getNextQueueSequence } from '@/lib/rate-limit-redis';

function generateOrderId(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ORD-${result}`;
}

function calculateSecureItemPrice(item: any, dbProduct: any) {
  let dbModifiers: any = {};
  if (dbProduct.modifiers) {
    try {
      dbModifiers = JSON.parse(dbProduct.modifiers);
    } catch {}
  }
  const activePromo = getActivePromo(dbProduct);
  let secureItemPrice = activePromo ? activePromo.promoPrice : dbProduct.price;

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
    let secureSizePrice = 0;
    if (item.size && item.size !== 'Normal' && dbModifiers.sizes && Array.isArray(dbModifiers.sizes)) {
      const validSize = dbModifiers.sizes.find((s: any) => s.name === item.size);
      if (validSize) {
        secureSizePrice = validSize.price;
      }
    }

    let addOnsTotal = 0;
    if (item.addOnIds && Array.isArray(item.addOnIds) && dbModifiers.addOns) {
      for (const addOnId of item.addOnIds) {
        const validAddOn = dbModifiers.addOns.find((a: any) => a.id === addOnId);
        if (validAddOn) {
          addOnsTotal += validAddOn.price;
        }
      }
    }

    let matchaLevelAdjustment = 0;
    if (item.matchaLevel !== undefined && item.matchaLevel !== null) {
      const mLevel = Number(item.matchaLevel);
      if (mLevel === 7 || mLevel === 8) {
        matchaLevelAdjustment = 1000;
      } else if (mLevel === 9 || mLevel === 10) {
        matchaLevelAdjustment = 2000;
      }
    }

    secureItemPrice += secureSizePrice + addOnsTotal + matchaLevelAdjustment;
  }
  return secureItemPrice;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const requestHeaders = new Headers(req.headers);
    const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || 'localhost:3000';
    const protocol = requestHeaders.get('x-forwarded-proto') || 'http';
    const appUrl = `${protocol}://${host}`;

    // 1. Validation
    if (!body.items || body.items.length === 0) {
      throw new ValidationError('Keranjang kosong');
    }

    if (!body.name || !body.phone) {
      throw new ValidationError('Nama dan nomor HP wajib diisi');
    }

    const orderType = body.orderType || 'DINE_IN';
    const tableNumber = body.tableNumber || null;

    if (orderType === 'DINE_IN' && !tableNumber) {
      throw new ValidationError('Nomor meja wajib dipilih untuk pesanan Dine-In');
    }

    const requestedMethod = body.paymentMethod?.toUpperCase() || 'COD';
    if (requestedMethod !== 'COD' && requestedMethod !== 'QRIS' && requestedMethod !== 'QRIS_INSTAN' && requestedMethod !== 'CASH') {
      throw new ValidationError('Metode pembayaran tidak valid');
    }

    // 2. Secure price calculation
    const productIds = body.items.map((item: any) => item.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });

    let secureSubtotal = 0;
    const orderItemsToCreate: Array<{
      productId: string;
      qty: number;
      price: number;
      modifiers: string | null;
    }> = [];

    for (const item of body.items) {
      const dbProduct = dbProducts.find(p => p.id === item.productId);
      if (!dbProduct) {
        throw new ValidationError(`Produk tidak ditemukan: ${item.name}`);
      }

      const addOnIds = item.addOnIds || (item.addOns ? item.addOns.map((a: any) => a.id) : []);

      let dbModifiers: any = {};
      if (dbProduct.modifiers) {
        try {
          dbModifiers = JSON.parse(dbProduct.modifiers);
        } catch {}
      }

      const itemForPriceCalc = {
        ...item,
        addOnIds
      };

      const secureItemPrice = calculateSecureItemPrice(itemForPriceCalc, dbProduct);
      const secureItemTotal = secureItemPrice * item.quantity;
      secureSubtotal += secureItemTotal;

      orderItemsToCreate.push({
        productId: dbProduct.id,
        qty: item.quantity,
        price: secureItemPrice,
        modifiers: dbModifiers.isBundle 
          ? JSON.stringify({ isBundle: true, bundleSelections: item.bundleSelections }) 
          : (item.modsString || null)
      });
    }

    const secureTotal = secureSubtotal;

    // Generate order ID
    let orderId = '';
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 20) {
      orderId = generateOrderId();
      const existing = await prisma.order.findUnique({
        where: { id: orderId }
      });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new Error('Gagal men-generate ID Pesanan unik, silakan coba lagi.');
    }

    const queueNumber = `DIN-${await getNextQueueSequence('DINE_IN')}`;
    const cleanPhone = body.phone.replace(/[^0-9]/g, '');

    const formattedAddress = tableNumber 
      ? (tableNumber.toString().toLowerCase().includes('meja') ? tableNumber : `Meja ${tableNumber}`) 
      : (body.address || '');

    // Create the order
    const order = await prisma.order.create({
      data: {
        id: orderId,
        userId: null,
        orderType: 'DINE_IN',
        source: 'SPMB',
        customerName: body.name,
        customerPhone: cleanPhone || body.phone,
        tableNumber: tableNumber ? tableNumber.toString() : null,
        address: formattedAddress,
        distanceKm: 0,
        pickupDate: body.pickupDate ? new Date(body.pickupDate) : new Date(),
        pickupTime: body.pickupTime || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        subtotal: secureSubtotal,
        deliveryFee: 0,
        total: secureTotal,
        paymentMethod: requestedMethod === 'QRIS_INSTAN' ? 'QRIS' : requestedMethod,
        status: (requestedMethod === 'QRIS' || requestedMethod === 'QRIS_INSTAN') ? 'PENDING_PAYMENT' : 'PENDING',
        notes: body.notes || null,
        paymentExpiredAt: (requestedMethod === 'QRIS' || requestedMethod === 'QRIS_INSTAN') ? new Date(Date.now() + 60 * 60 * 1000) : null,
        queueNumber,
        items: {
          create: orderItemsToCreate
        }
      }
    });

    // Update table status if dining table exists
    if (tableNumber) {
      try {
        await prisma.diningTable.updateMany({
          where: { number: tableNumber.toString() },
          data: { status: 'OCCUPIED' }
        });
      } catch (e) {
        console.error('Failed to update table status:', e);
      }
    }

    // Handle QRIS Payment Generation
    if (requestedMethod === 'QRIS' || requestedMethod === 'QRIS_INSTAN') {
      const paymentSettings = await prisma.paymentSettings.findFirst();
      if (paymentSettings && paymentSettings.dokuEnabled) {
        try {
          if (requestedMethod === 'QRIS_INSTAN') {
            const { createDokuMcpQrisPayment } = await import('@/lib/doku');
            const mcpResult = await createDokuMcpQrisPayment({
              clientId: paymentSettings.dokuClientId,
              sharedKey: paymentSettings.dokuSharedKey,
              isSandbox: paymentSettings.dokuSandbox,
            }, {
              invoiceNumber: order.id,
              amount: secureTotal,
              postalCode: '67215'
            });

            if (mcpResult.qrContent) {
              await prisma.order.update({
                where: { id: order.id },
                data: { paymentQrContent: mcpResult.qrContent }
              });
            }
          }

          const currentOrder = await prisma.order.findUnique({ where: { id: order.id } });
          if (!currentOrder?.paymentQrContent) {
            const { createDokuCheckoutSession } = await import('@/lib/doku');
            const dokuResult = await createDokuCheckoutSession({
              clientId: paymentSettings.dokuClientId,
              sharedKey: paymentSettings.dokuSharedKey,
              isSandbox: paymentSettings.dokuSandbox,
            }, {
              invoiceNumber: order.id,
              amount: secureTotal,
              customerName: order.customerName,
              customerPhone: order.customerPhone,
              customerEmail: 'arumseduh@gmail.com',
              callbackUrl: `${appUrl}/orders/${order.id}`,
              notificationUrl: `${appUrl}/api/payment/doku-webhook`,
              paymentChannel: 'QRIS'
            });

            if (dokuResult.url) {
              await prisma.order.update({
                where: { id: order.id },
                data: { paymentUrl: dokuResult.url }
              });
            }
          }
        } catch (e) {
          console.error('[API ORDERS QRIS ERROR]', e);
        }
      }
    }

    const finalOrder = await prisma.order.findUnique({
      where: { id: order.id },
      select: { paymentUrl: true, paymentQrContent: true }
    });

    // Admin Notification
    try {
      const { sendAdminNewOrderNotification } = await import('@/lib/whatsapp-service');
      await sendAdminNewOrderNotification(order.id);
    } catch (e) {
      console.error('[API ORDERS] Admin notification error:', e);
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      queueNumber: order.queueNumber,
      total: secureTotal,
      status: order.status,
      paymentUrl: finalOrder?.paymentUrl || undefined,
      paymentQrContent: finalOrder?.paymentQrContent || undefined,
    });
  } catch (error) {
    logError(error, {
      route: 'orders',
      timestamp: new Date().toISOString(),
    });

    const safeError = getSafeErrorResponse(error);
    return NextResponse.json(
      { error: safeError.message, code: safeError.code },
      { status: safeError.statusCode }
    );
  }
}
