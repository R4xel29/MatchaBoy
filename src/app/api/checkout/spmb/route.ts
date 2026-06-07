import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActivePromo } from '@/lib/utils';
import { ValidationError, getSafeErrorResponse, logError } from '@/lib/errors';

const formatCurrency = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

function generateSpmbId(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SPMB-${result}`;
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

    if (body.phone !== 'SPMB-PENDING') {
      const cleanPhone = body.phone.replace(/^SPMB-PENDING_/, '');
      const phoneRegex = /^(\+62|62|0)8[0-9]{8,15}$/;
      if (!phoneRegex.test(cleanPhone)) {
        throw new ValidationError('Format nomor HP tidak valid');
      }
    }

    if (!body.address || !body.address.trim()) {
      throw new ValidationError('Alamat/lokasi pengantaran wajib diisi');
    }

    if (!body.pickupTime) {
      throw new ValidationError('Jam pengantaran wajib diisi');
    }

    // Validate current WIB time & closing time
    let wibHour = 0;
    let wibMinute = 0;
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
      });
      const [h, m] = formatter.format(now).split(':').map(Number);
      wibHour = h;
      wibMinute = m;
    } catch {
      const now = new Date();
      wibHour = now.getHours();
      wibMinute = now.getMinutes();
    }

    const storeSettings = await prisma.storeSettings.findFirst();
    const spmbStartTime = storeSettings?.spmbStartTime || "08:00";
    const spmbEndTime = storeSettings?.spmbEndTime || "13:00";
    const spmbCloseTime = storeSettings?.spmbCloseTime || "16:00";

    const [closeH, closeM] = spmbCloseTime.split(':').map(Number);
    const [startH, startM] = spmbStartTime.split(':').map(Number);
    const [endH, endM] = spmbEndTime.split(':').map(Number);

    const closeMinutes = closeH * 60 + closeM;
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const currentTotalMinutes = wibHour * 60 + wibMinute;

    const now = new Date();
    const getJakartaDateString = (date: Date) => {
      try {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date);
      } catch {
        return date.toISOString().split('T')[0];
      }
    };
    const getJakartaTimeString = (date: Date) => {
      try {
        return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).format(date);
      } catch {
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      }
    };

    const todayStr = getJakartaDateString(now);
    const targetDateStr = body.pickupDate ? getJakartaDateString(new Date(body.pickupDate)) : todayStr;

    // Validate operational days
    let openDays: number[] = [0,1,2,3,4,5,6];
    try {
      openDays = JSON.parse(storeSettings?.operationalDays || '[0,1,2,3,4,5,6]');
    } catch {}
    let closedDates: string[] = [];
    try {
      closedDates = JSON.parse(storeSettings?.disabledDates || '[]');
    } catch {}

    const [yr, mo, dy] = targetDateStr.split('-').map(Number);
    const targetDayOfWeek = new Date(yr, mo - 1, dy).getDay();

    if (!openDays.includes(targetDayOfWeek)) {
      throw new ValidationError('Toko kami tutup pada hari yang dipilih');
    }

    if (closedDates.includes(targetDateStr)) {
      throw new ValidationError('Toko kami tutup pada tanggal yang dipilih (hari libur/khusus)');
    }

    // Validate delivery time is between spmbStartTime and spmbEndTime
    const [pickH, pickM] = body.pickupTime.split(':').map(Number);
    const pickMinutes = pickH * 60 + pickM;

    if (pickMinutes < startMinutes || pickMinutes > endMinutes) {
      throw new ValidationError(`Waktu pengantaran harus berada di antara jam ${spmbStartTime} - ${spmbEndTime}`);
    }

    // If target date is today, check timing constraints
    if (targetDateStr === todayStr) {
      const currentJakartaTime = getJakartaTimeString(now);
      const [curH, curM] = currentJakartaTime.split(':').map(Number);
      const currentMinutes = curH * 60 + curM;
      const leadTimeMinutes = 20;

      if (currentMinutes >= closeMinutes) {
        throw new ValidationError('Pemesanan SPMB untuk hari ini sudah tutup. Silakan pilih hari lain.');
      }

      if (pickMinutes - currentMinutes < leadTimeMinutes) {
        throw new ValidationError('Waktu pengantaran tidak valid atau sudah terlewati. Mohon pilih waktu pengantaran yang lain.');
      }
    }

    // Validate payment method
    const requestedMethod = body.paymentMethod?.toUpperCase();
    if (requestedMethod !== 'COD' && requestedMethod !== 'QRIS' && requestedMethod !== 'QRIS_INSTAN') {
      throw new ValidationError('Metode pembayaran harus COD, QRIS, atau QRIS_INSTAN');
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

      // Format addOnIds if client sent addOns array of objects
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

    const secureTotal = secureSubtotal; // 0 delivery fee for SPMB campus delivery

    // Generate unique order ID starting with SPMB-
    let orderId = '';
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 20) {
      orderId = generateSpmbId();
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

    // 3. Create the order
    const order = await prisma.$transaction(async (tx) => {
      // Advisory lock for serializing order counts
      await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(424242);');

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const countToday = await tx.order.count({
        where: {
          createdAt: { gte: startOfDay }
        }
      });
      const nextSeq = String(countToday + 1).padStart(3, '0');
      const queueNumber = `SPMB-${nextSeq}`;

      const newOrder = await tx.order.create({
        data: {
          id: orderId,
          userId: null, // guest account
          orderType: 'PICKUP', // pickup style (no courier)
          source: 'SPMB', // origin tag
          customerName: body.name,
          customerPhone: body.phone,
          address: body.address,
          distanceKm: 0,
          pickupDate: body.pickupDate ? new Date(body.pickupDate) : new Date(),
          pickupTime: body.pickupTime,
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

      return newOrder;
    }, {
      isolationLevel: 'Serializable',
      timeout: 10000,
    });

    // Generate QRIS via Doku Hosted Checkout V1 session for QRIS payment method
    if (requestedMethod === 'QRIS') {
      try {
        const paymentSettings = await prisma.paymentSettings.findFirst();
        if (paymentSettings) {
          if (!paymentSettings.dokuEnabled) {
            throw new Error('Metode pembayaran Doku sedang tidak aktif.');
          }

          const { createDokuCheckoutSession } = await import('@/lib/doku');
          const callbackUrl = `${appUrl}/orders/${order.id}`;
          const notificationUrl = `${appUrl}/api/payment/doku-webhook`;
          
          const dokuResult = await createDokuCheckoutSession({
            clientId: paymentSettings.dokuClientId,
            sharedKey: paymentSettings.dokuSharedKey,
            isSandbox: paymentSettings.dokuSandbox,
          }, {
            invoiceNumber: order.id,
            amount: secureTotal,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            customerEmail: 'arumseduh@gmail.com', // Guest fallback email
            callbackUrl,
            notificationUrl,
            paymentChannel: undefined // Show all channels including QRIS
          });

          if (dokuResult.error) {
            throw new Error(dokuResult.error);
          }

          await prisma.order.update({
            where: { id: order.id },
            data: { 
              paymentUrl: dokuResult.url,
              paymentQrContent: null,
            }
          });
          console.log('[SPMB QRIS] Doku Hosted Checkout URL generated successfully for QRIS.');
        }
      } catch (qrisError: any) {
        console.error('[QRIS DOKU CHECKOUT ERROR]', qrisError);
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED', notes: `DOKU Checkout QRIS Failure: ${qrisError.message}` }
        });
        return NextResponse.json({ error: `Gagal membuat sesi pembayaran DOKU: ${qrisError.message}` }, { status: 500 });
      }
    }

    if (requestedMethod === 'QRIS_INSTAN') {
      try {
        const paymentSettings = await prisma.paymentSettings.findFirst();
        if (paymentSettings) {
          if (!paymentSettings.dokuEnabled) {
            throw new Error('Metode pembayaran Doku sedang tidak aktif.');
          }

          const { createDokuCheckoutSession } = await import('@/lib/doku');
          const callbackUrl = `${appUrl}/orders/${order.id}`;
          const notificationUrl = `${appUrl}/api/payment/doku-webhook`;

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
            callbackUrl,
            notificationUrl,
            paymentChannel: 'QRIS', // Pre-select QRIS so user directly sees QR code on Doku page
          });

          if (dokuResult.error) {
            throw new Error(dokuResult.error);
          }

          await prisma.order.update({
            where: { id: order.id },
            data: { 
              paymentUrl: dokuResult.url,
              paymentQrContent: null,
            }
          });
          console.log('[SPMB QRIS INSTAN] Doku Hosted Checkout with pre-selected QRIS generated successfully.');
        }
      } catch (qrisError: any) {
        console.error('[QRIS INSTAN ERROR]', qrisError);
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED', notes: `Gagal membuat QRIS Instan: ${qrisError.message}` }
        });
        return NextResponse.json({ error: `Gagal membuat QRIS Instan: ${qrisError.message}` }, { status: 500 });
      }
    }

    const finalOrder = await prisma.order.findUnique({ 
      where: { id: order.id }, 
      select: { paymentUrl: true, paymentQrContent: true } 
    });
    return NextResponse.json({
      success: true,
      orderId: order.id,
      queueNumber: order.queueNumber,
      total: secureTotal,
      paymentUrl: finalOrder?.paymentUrl || undefined,
      paymentQrContent: finalOrder?.paymentQrContent || undefined
    });
  } catch (error) {
    logError(error, {
      route: 'checkout/spmb',
      timestamp: new Date().toISOString(),
    });

    const safeError = getSafeErrorResponse(error);
    return NextResponse.json(
      { error: safeError.message, code: safeError.code },
      { status: safeError.statusCode }
    );
  }
}
