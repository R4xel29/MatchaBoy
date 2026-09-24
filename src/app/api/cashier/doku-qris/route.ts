import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createDokuMcpQrisPayment, buildFallbackQrisString } from '@/lib/doku';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const amount = Number(body.amount) || 0;
    const invoiceNumber = body.invoiceNumber || `POS-QRIS-${Date.now()}`;
    const customerName = body.customerName || 'Pelanggan Arum Seduh';
    const customerPhone = body.customerPhone || '-';
    const orderType = body.orderType || 'PICKUP';
    const tableNumber = body.tableNumber || undefined;
    const items = body.items || [];
    const userId = body.userId || null;

    if (amount <= 0) {
      return NextResponse.json({ error: 'Nominal pembayaran tidak valid' }, { status: 400 });
    }

    const voucherCode = body.voucherCode ? body.voucherCode.toString().trim() : null;
    const subtotal = Number(body.subtotal) || amount;
    const cleanNotes = body.notes ? body.notes.toString().trim() : null;

    // Create a PENDING_PAYMENT order in Prisma DB so DOKU Webhook & Polling can find & update it
    try {
      const productIds = items.map((i: any) => i.productId).filter(Boolean);
      const dbProducts = productIds.length > 0
        ? await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, price: true },
          })
        : [];
      const productPriceMap = new Map(dbProducts.map((p) => [p.id, p.price]));

      const parsedItems = items.map((i: any) => {
        const qty = Math.max(1, Number(i.quantity || i.qty) || 1);
        let unitPrice = Number(i.price) || Number(i.basePrice) || 0;
        if (unitPrice <= 0 && i.totalPrice && Number(i.totalPrice) > 0) {
          unitPrice = Math.round(Number(i.totalPrice) / qty);
        }
        if (unitPrice <= 0 && i.productId && productPriceMap.has(i.productId)) {
          unitPrice = productPriceMap.get(i.productId) || 0;
        }
        return {
          productId: i.productId,
          qty,
          price: Math.round(unitPrice),
          modifiers: i.modsString || '',
        };
      });

      await prisma.order.upsert({
        where: { id: invoiceNumber },
        create: {
          id: invoiceNumber,
          userId: userId,
          customerName: customerName,
          customerPhone: customerPhone,
          orderType: orderType,
          tableNumber: tableNumber,
          address: orderType === 'DINE_IN' ? `Dine In - Meja ${tableNumber}` : 'POS QRIS Order',
          paymentMethod: 'QRIS',
          subtotal: Math.round(subtotal),
          total: Math.round(amount),
          voucherCode: voucherCode,
          status: 'PENDING_PAYMENT',
          paymentProofUrl: invoiceNumber,
          paymentExpiredAt: new Date(Date.now() + 5 * 60 * 1000),
          notes: cleanNotes,
          items: parsedItems.length > 0 ? {
            create: parsedItems,
          } : undefined,
        },
        update: {
          subtotal: Math.round(subtotal),
          total: Math.round(amount),
          voucherCode: voucherCode,
          customerName: customerName,
          notes: cleanNotes,
          status: 'PENDING_PAYMENT',
          paymentExpiredAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });
    } catch (dbErr) {
      console.error('[DOKU QRIS DB CREATION NOTICE]', dbErr);
    }

    const paymentSettings = await prisma.paymentSettings.findFirst();

    if (
      paymentSettings?.dokuEnabled &&
      paymentSettings.dokuClientId &&
      paymentSettings.dokuSharedKey
    ) {
      const dokuCreds = {
        clientId: paymentSettings.dokuClientId,
        sharedKey: paymentSettings.dokuSharedKey,
        isSandbox: paymentSettings.dokuSandbox ?? true,
      };

      const result = await createDokuMcpQrisPayment(dokuCreds, {
        invoiceNumber,
        amount,
      });

      if (result.qrContent || result.qrImageUrl) {
        return NextResponse.json({
          success: true,
          qrContent: result.qrContent || null,
          qrImageUrl: result.qrImageUrl || null,
          invoiceNumber,
          isDoku: true,
        });
      }
    }

    // Fallback: Dynamic QRIS String for amount if DOKU API is not configured or in fallback mode
    const fallbackQrContent = buildFallbackQrisString(amount);

    return NextResponse.json({
      success: true,
      qrContent: fallbackQrContent,
      qrImageUrl: paymentSettings?.qrisImage || null,
      invoiceNumber,
      isDoku: false,
    });
  } catch (error: any) {
    console.error('[DOKU POS QRIS API ERROR]', error);
    return NextResponse.json({ error: error.message || 'Gagal menghasilkan QRIS DOKU' }, { status: 500 });
  }
}
