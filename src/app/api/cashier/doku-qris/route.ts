import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createDokuMcpQrisPayment } from '@/lib/doku';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const amount = Number(body.amount) || 0;
    const invoiceNumber = body.invoiceNumber || `POS-QRIS-${Date.now()}`;

    if (amount <= 0) {
      return NextResponse.json({ error: 'Nominal pembayaran tidak valid' }, { status: 400 });
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
