import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyDokuWebhookSignature } from '@/lib/doku';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    
    // Extract headers into a simple record
    const headers: Record<string, string> = {};
    req.headers.forEach((val, key) => {
      headers[key] = val;
    });

    // Fetch the merchant configuration singleton
    const paymentSettings = await prisma.paymentSettings.findFirst();
    if (!paymentSettings || !paymentSettings.dokuEnabled) {
      console.warn('[DOKU WEBHOOK] Webhook received but DOKU payment setting is disabled/missing');
      return NextResponse.json({ error: 'DOKU disabled' }, { status: 400 });
    }

    const requestTarget = '/api/payment/doku-webhook';

    // Extract signature header
    const signatureHeader = headers['signature'] || headers['Signature'];

    // Handle DOKU dashboard save handshake ping (empty body or missing signature)
    if (!signatureHeader || !rawBody || rawBody.trim() === '') {
      console.log('[DOKU WEBHOOK] Received handshake/ping check from DOKU. Returning 200 OK.');
      return NextResponse.json({ status: 'OK', message: 'Handshake successful' });
    }

    // Verify webhook authenticity
    const isValid = verifyDokuWebhookSignature({
      clientId: paymentSettings.dokuClientId,
      sharedKey: paymentSettings.dokuSharedKey,
      headers,
      rawBody,
      requestTarget,
    });

    if (!isValid) {
      console.error('[DOKU WEBHOOK] Invalid signature received! Rejecting request.');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse the payload body
    const payload = JSON.parse(rawBody);
    const invoiceNumber = payload.order?.invoice_number;
    const paymentStatus = payload.payment?.status;

    console.log(`[DOKU WEBHOOK] Signature valid. Invoice: ${invoiceNumber}, Status: ${paymentStatus}`);

    if (!invoiceNumber) {
      return NextResponse.json({ error: 'Missing invoice number' }, { status: 400 });
    }

    // Update matched orders to PREPARING on SUCCESS
    if (paymentStatus === 'SUCCESS') {
      const order = await prisma.order.findUnique({
        where: { id: invoiceNumber },
      });

      if (!order) {
        console.error(`[DOKU WEBHOOK] Order not found for invoice: ${invoiceNumber}`);
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      if (order.status === 'PENDING_PAYMENT') {
        await prisma.order.update({
          where: { id: invoiceNumber },
          data: {
            status: 'PREPARING',
            notes: order.notes 
              ? `${order.notes}\n[DOKU Webhook] Pembayaran otomatis sukses via DOKU.`
              : '[DOKU Webhook] Pembayaran otomatis sukses via DOKU.',
          },
        });

        // Fire real-time notification alerts
        try {
          const { sendNotification } = await import('@/lib/notification-service');
          
          // 1. Notify the customer
          await sendNotification({
            userId: order.userId || '',
            type: 'order',
            title: 'Pembayaran Berhasil! 🍵',
            message: `Pembayaran pesanan ${order.id.slice(0, 8).toUpperCase()} telah berhasil diverifikasi. Kami sedang menyiapkan pesanan Anda!`,
            linkUrl: `/orders/${order.id}`,
            data: { orderId: order.id },
          });

          // 2. Notify admin/cashiers
          const admins = await prisma.user.findMany({
            where: { role: 'ADMIN' },
          });
          for (const admin of admins) {
            await sendNotification({
              userId: admin.id,
              type: 'order',
              title: 'Pesanan DOKU Lunas! 💰',
              message: `Pesanan ${order.id.slice(0, 8).toUpperCase()} (${order.customerName}) lunas via DOKU dan siap dibuat.`,
              linkUrl: `/admin/orders`,
              data: { orderId: order.id },
            });
          }
        } catch (notifError) {
          console.error('[DOKU WEBHOOK] Failed to send webhook push notifications:', notifError);
        }

        console.log(`[DOKU WEBHOOK] Order ${invoiceNumber} updated to PREPARING.`);
      } else {
        console.log(`[DOKU WEBHOOK] Order ${invoiceNumber} was already processed. Current status: ${order.status}`);
      }
    }

    return NextResponse.json({ status: 'OK' });
  } catch (error: any) {
    console.error('[DOKU WEBHOOK EXCEPTION]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
