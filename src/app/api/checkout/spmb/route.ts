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

    // 1. Validation
    if (!body.items || body.items.length === 0) {
      throw new ValidationError('Keranjang kosong');
    }

    if (!body.name || !body.phone) {
      throw new ValidationError('Nama dan nomor HP wajib diisi');
    }

    const phoneRegex = /^(\+62|62|0)8[0-9]{8,12}$/;
    if (!phoneRegex.test(body.phone)) {
      throw new ValidationError('Format nomor HP tidak valid');
    }

    if (!body.address || !body.address.trim()) {
      throw new ValidationError('Alamat/lokasi pengantaran wajib diisi');
    }

    if (!body.pickupTime) {
      throw new ValidationError('Jam pengantaran wajib diisi');
    }

    // Validate delivery time is between 08:00 and 13:00
    const [pickH, pickM] = body.pickupTime.split(':').map(Number);
    const pickMinutes = pickH * 60 + pickM;
    const startMinutes = 8 * 60; // 08:00
    const endMinutes = 13 * 60; // 13:00

    if (pickMinutes < startMinutes || pickMinutes > endMinutes) {
      throw new ValidationError('Waktu pengantaran harus berada di antara jam 08:00 - 13:00');
    }

    // Validate payment method
    const requestedMethod = body.paymentMethod?.toUpperCase();
    if (requestedMethod !== 'COD' && requestedMethod !== 'QRIS') {
      throw new ValidationError('Metode pembayaran harus COD atau QRIS');
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
          orderType: 'DELIVERY', // delivery only
          source: 'SPMB', // origin tag
          customerName: body.name,
          customerPhone: body.phone,
          address: body.address,
          distanceKm: 0,
          pickupDate: new Date(), // Today
          pickupTime: body.pickupTime,
          subtotal: secureSubtotal,
          deliveryFee: 0,
          total: secureTotal,
          paymentMethod: requestedMethod,
          status: requestedMethod === 'QRIS' ? 'PENDING_PAYMENT' : 'PENDING',
          notes: body.notes || null,
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

    // Auto-generate QRIS string if selected QRIS
    if (requestedMethod === 'QRIS') {
      try {
        const paymentSettings = await prisma.paymentSettings.findFirst();
        if (paymentSettings && paymentSettings.qrisAutoGenerate) {
          const { generateQrisString } = await import('@/lib/doku');
          const customNmid = paymentSettings.qrisNmid || undefined;
          const paymentQrContent = generateQrisString(secureTotal, order.id, customNmid);

          await prisma.order.update({
            where: { id: order.id },
            data: { paymentQrContent }
          });
        }
      } catch (qrisError) {
        console.error('[QRIS GENERATION ERROR]', qrisError);
      }
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      queueNumber: order.queueNumber,
      total: secureTotal
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
