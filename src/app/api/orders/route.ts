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
    const sizeStr = (item.size || '').toString().trim().toLowerCase();
    const isExplicitLarge = sizeStr.includes('large') || sizeStr.includes('jumbo');
    const isExplicitRegular = sizeStr === 'normal' || sizeStr === 'regular';

    if (item.size && !isExplicitRegular) {
      if (dbModifiers.sizes && Array.isArray(dbModifiers.sizes)) {
        const validSize = dbModifiers.sizes.find((s: any) => 
          s.name?.toString().trim().toLowerCase() === sizeStr ||
          (isExplicitLarge && (s.name?.toLowerCase().includes('large') || s.name?.toLowerCase().includes('jumbo')))
        );
        if (validSize) {
          secureSizePrice = validSize.price;
        } else if (isExplicitLarge) {
          secureSizePrice = 3000;
        }
      } else if (isExplicitLarge) {
        secureSizePrice = 3000;
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

    // Shot adjustment for Americano / Coffee
    let shotAdjustment = 0;
    if (item.shot === 'Double Shot' || item.shot === 'Double') {
      shotAdjustment = 5000;
    }

    // Matcha level customization is FREE (+Rp 0)
    const matchaLevelAdjustment = 0;

    secureItemPrice += secureSizePrice + addOnsTotal + shotAdjustment + matchaLevelAdjustment;
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

    if (!body.name) {
      throw new ValidationError('Nama pemesan wajib diisi');
    }

    const orderType = body.orderType || 'DINE_IN';
    const tableNumber = body.tableNumber || null;

    if (orderType !== 'DINE_IN' && !body.phone) {
      throw new ValidationError('Nomor HP wajib diisi');
    }

    if (orderType === 'DINE_IN' && !tableNumber) {
      throw new ValidationError('Nomor meja wajib dipilih untuk pesanan Dine-In');
    }

    const requestedMethod = body.paymentMethod?.toUpperCase() || 'COD';
    if (requestedMethod !== 'COD' && requestedMethod !== 'QRIS' && requestedMethod !== 'QRIS_INSTAN' && requestedMethod !== 'CASH') {
      throw new ValidationError('Metode pembayaran tidak valid');
    }

    // 2. Parallel product lookup & payment settings query
    const productIds = body.items.map((item: any) => item.productId);
    const [dbProducts, paymentSettings, packagingIngredients] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: productIds } }
      }),
      prisma.paymentSettings.findFirst(),
      prisma.ingredient.findMany({
        where: { isPackaging: true },
      }),
    ]);

    let cupRegularStock = 999;
    let cupJumboStock = 999;

    packagingIngredients.forEach((p) => {
      const name = p.name.toLowerCase();
      if (name.includes('jumbo') || name.includes('large') || name.includes('22')) {
        cupJumboStock = p.stock;
      } else if (name.includes('regular') || name.includes('14') || name.includes('16') || name.includes('gelas')) {
        cupRegularStock = p.stock;
      }
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

      let dbModifiers: any = {};
      if (dbProduct.modifiers) {
        try {
          dbModifiers = JSON.parse(dbProduct.modifiers);
        } catch {}
      }

      // Check cup availability if not bundle and no tumbler
      if (!body.hasTumbler && !dbModifiers.isBundle) {
        const sizeLower = (item.size || 'Normal').toLowerCase();
        const isLarge = sizeLower.includes('large') || sizeLower.includes('jumbo');
        const isRegular = sizeLower.includes('normal') || sizeLower.includes('regular');

        if (isRegular && cupRegularStock <= 0) {
          throw new ValidationError(`Gelas ukuran Regular untuk "${dbProduct.name}" sedang habis. Silakan pilih ukuran Large atau gunakan tumbler.`);
        }
        if (isLarge && cupJumboStock <= 0) {
          throw new ValidationError(`Gelas ukuran Large untuk "${dbProduct.name}" sedang habis. Silakan pilih ukuran Regular atau gunakan tumbler.`);
        }
      }

      const addOnIds = item.addOnIds || (item.addOns ? item.addOns.map((a: any) => a.id) : []);

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

    // Generate unique order ID instantly
    const timeStr = Date.now().toString(36).toUpperCase().slice(-4);
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let rand = '';
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const orderId = `ORD-${timeStr}${rand}`;

    const queueNumber = `DIN-${await getNextQueueSequence('DINE_IN')}`;
    const cleanPhone = body.phone ? body.phone.replace(/[^0-9]/g, '') : '-';

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
        paymentExpiredAt: (requestedMethod === 'QRIS' || requestedMethod === 'QRIS_INSTAN') ? new Date(Date.now() + 5 * 60 * 1000) : null,
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

    let paymentQrContent: string | null = null;
    let paymentUrl: string | null = null;

    // Handle QRIS Payment Generation
    if (requestedMethod === 'QRIS' || requestedMethod === 'QRIS_INSTAN') {
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
              paymentQrContent = mcpResult.qrContent;
            }
          }

          if (!paymentQrContent) {
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
              paymentUrl = dokuResult.url;
            }
          }

          // Single fast update if payment info generated
          if (paymentQrContent || paymentUrl) {
            await prisma.order.update({
              where: { id: order.id },
              data: {
                paymentQrContent: paymentQrContent || undefined,
                paymentUrl: paymentUrl || undefined
              }
            });
          }
        } catch (e) {
          console.error('[API ORDERS QRIS ERROR]', e);
        }
      }
    }

    // Admin Notification (Only for COD/immediate orders. QRIS orders will notify admin & kitchen once payment is confirmed via webhook)
    if (order.status !== 'PENDING_PAYMENT') {
      import('@/lib/whatsapp-service')
        .then(({ sendAdminNewOrderNotification }) => sendAdminNewOrderNotification(order.id))
        .catch((e) => console.error('[API ORDERS] Admin notification error:', e));
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      queueNumber: order.queueNumber,
      total: secureTotal,
      status: order.status,
      paymentUrl: paymentUrl || undefined,
      paymentQrContent: paymentQrContent || undefined,
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
