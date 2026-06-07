import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { expireOrder } from '@/lib/order-utils';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    console.log('[DOKU SNAP WEBHOOK BODY]', JSON.stringify(body, null, 2));

    const headers: Record<string, string> = {};
    req.headers.forEach((val, key) => {
      headers[key] = val;
    });

    const signature = headers['x-signature'] || headers['Signature'];
    const timestamp = headers['x-timestamp'] || headers['X-TIMESTAMP'];
    const authHeader = headers['authorization'] || headers['Authorization'];

    if (!signature || !timestamp || !authHeader) {
      console.error('[DOKU SNAP WEBHOOK] Missing validation headers');
      return NextResponse.json({
        responseCode: "4017300",
        responseMessage: "Unauthorized"
      }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    if (token !== 'snap-token-matchaboy-prod') {
      console.error('[DOKU SNAP WEBHOOK] Invalid access token');
      return NextResponse.json({
        responseCode: "4017300",
        responseMessage: "Unauthorized"
      }, { status: 401 });
    }

    const paymentSettings = await prisma.paymentSettings.findFirst();
    if (!paymentSettings || !paymentSettings.dokuEnabled) {
      console.error('[DOKU SNAP WEBHOOK] Doku payments are disabled in DB');
      return NextResponse.json({
        responseCode: "4007300",
        responseMessage: "Bad Request"
      }, { status: 400 });
    }

    // Verify Symmetric Signature
    // Format: POST:/api/payment/snap-webhook:AccessToken:bodyHash:Timestamp
    const requestTarget = '/api/payment/snap-webhook';
    const minifiedBody = JSON.stringify(body);
    const bodyHash = crypto.createHash('sha256').update(minifiedBody).digest('hex').toLowerCase();
    
    const stringToSign = `POST:${requestTarget}:${token}:${bodyHash}:${timestamp}`;
    const calculatedSignature = crypto.createHmac('sha512', paymentSettings.dokuSharedKey)
      .update(stringToSign)
      .digest('base64');

    if (calculatedSignature !== signature) {
      console.error('[DOKU SNAP WEBHOOK] Signature mismatch. Calculated:', calculatedSignature, 'Received:', signature);
      return NextResponse.json({
        responseCode: "4017300",
        responseMessage: "Unauthorized"
      }, { status: 401 });
    }

    const invoiceNumber = body.partnerReferenceNo;
    const paymentStatus = body.transactionStatus || body.paymentStatus;

    if (!invoiceNumber) {
      return NextResponse.json({
        responseCode: "4007300",
        responseMessage: "Bad Request"
      }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: invoiceNumber },
    });

    if (!order) {
      console.error(`[DOKU SNAP WEBHOOK] Order not found: ${invoiceNumber}`);
      return NextResponse.json({
        responseCode: "4047300",
        responseMessage: "Not Found"
      }, { status: 404 });
    }

    if (paymentStatus === 'SUCCESS') {
      if (order.status === 'PENDING_PAYMENT') {
        await prisma.order.update({
          where: { id: invoiceNumber },
          data: {
            status: 'PREPARING',
            notes: order.notes 
              ? `${order.notes}\n[DOKU SNAP Webhook] Pembayaran otomatis sukses via SNAP QRIS.`
              : '[DOKU SNAP Webhook] Pembayaran otomatis sukses via SNAP QRIS.',
          },
        });

        // Notifications
        try {
          const { sendNotification } = await import('@/lib/notification-service');
          
          // 1. Notify customer
          await sendNotification({
            userId: order.userId || '',
            type: 'order',
            title: 'Pembayaran Berhasil! 🍵',
            message: `Pembayaran pesanan ${order.id.slice(0, 8).toUpperCase()} telah berhasil diverifikasi. Kami sedang menyiapkan pesanan Anda!`,
            linkUrl: `/orders/${order.id}`,
            data: { orderId: order.id },
          });

          // 2. Notify Admin
          const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
          for (const admin of admins) {
            await sendNotification({
              userId: admin.id,
              type: 'order',
              title: 'Pesanan DOKU SNAP Lunas! 💰',
              message: `Pesanan ${order.id.slice(0, 8).toUpperCase()} (${order.customerName}) lunas via DOKU SNAP QRIS.`,
              linkUrl: `/admin/orders`,
              data: { orderId: order.id },
            });
          }
        } catch (notifError) {
          console.error('[DOKU SNAP WEBHOOK] Notification error:', notifError);
        }

        console.log(`[DOKU SNAP WEBHOOK] Order ${invoiceNumber} successfully updated to PREPARING.`);
      } else {
        console.log(`[DOKU SNAP WEBHOOK] Order ${invoiceNumber} was already processed. Current status: ${order.status}`);
      }
    } else if (paymentStatus === 'FAILED' || paymentStatus === 'EXPIRED' || paymentStatus === 'CANCELLED') {
      console.log(`[DOKU SNAP WEBHOOK] Payment status is ${paymentStatus}. Cancelling/Expiring order...`);
      const expiredResult = await expireOrder(invoiceNumber, true);
      if (expiredResult) {
        await prisma.order.update({
          where: { id: invoiceNumber },
          data: {
            notes: expiredResult.notes
              ? `${expiredResult.notes}\n[DOKU SNAP Webhook] Pembayaran gagal/expired via SNAP.`
              : '[DOKU SNAP Webhook] Pembayaran gagal/expired via SNAP.',
          }
        });
      }
    }

    return NextResponse.json({
      responseCode: "2007300",
      responseMessage: "Successful"
    });
  } catch (error: any) {
    console.error('[DOKU SNAP WEBHOOK EXCEPTION]', error);
    return NextResponse.json({
      responseCode: "5007300",
      responseMessage: "Internal Server Error"
    }, { status: 500 });
  }
}
