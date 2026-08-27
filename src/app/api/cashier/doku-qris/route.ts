import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createDokuMcpQrisPayment } from '@/lib/doku';

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

    // Create a PENDING_PAYMENT order in Prisma DB so DOKU Webhook & Polling can find & update it
    try {
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
          subtotal: Math.round(amount),
          total: Math.round(amount),
          status: 'PENDING_PAYMENT',
          paymentProofUrl: invoiceNumber,
          paymentExpiredAt: new Date(Date.now() + 5 * 60 * 1000),
          notes: '[POS QRIS Order]',
          items: items.length > 0 ? {
            create: items.map((i: any) => ({
              productId: i.productId,
              qty: i.quantity || i.qty || 1,
              price: i.basePrice || i.price || 0,
              modifiers: i.modsString || '',
            })),
          } : undefined,
        },
        update: {
          total: Math.round(amount),
          customerName: customerName,
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
    const fallbackQrContent = `00020101021226670016ID.CO.ARUMSEDUH.WWW0118936009143000000000520458125303360540${amount}5802ID5910ARUM SEDUH6007JAKARTA62070703A016304`;

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
