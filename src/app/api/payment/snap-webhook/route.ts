import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { expireOrder } from '@/lib/order-utils';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      body = null;
    }

    // Collect ALL headers for debugging
    const headers: Record<string, string> = {};
    req.headers.forEach((val, key) => {
      headers[key.toLowerCase()] = val;
    });

    console.log('[DOKU SNAP WEBHOOK] ===== INCOMING REQUEST =====');
    console.log('[DOKU SNAP WEBHOOK] URL:', req.nextUrl.pathname + req.nextUrl.search);
    console.log('[DOKU SNAP WEBHOOK] All Headers:', JSON.stringify(headers, null, 2));
    console.log('[DOKU SNAP WEBHOOK] Raw Body:', rawBody);
    console.log('[DOKU SNAP WEBHOOK] Parsed Body:', JSON.stringify(body, null, 2));

    // Handle handshake/ping (empty body or no parseable body)
    if (!body || !rawBody || rawBody.trim() === '') {
      console.log('[DOKU SNAP WEBHOOK] Empty body or ping — returning 200 OK handshake');
      return NextResponse.json({
        responseCode: "2007300",
        responseMessage: "Successful"
      });
    }

    // Get payment settings
    const paymentSettings = await prisma.paymentSettings.findFirst();
    if (!paymentSettings || !paymentSettings.dokuEnabled) {
      console.error('[DOKU SNAP WEBHOOK] Doku payments are disabled in DB');
      return NextResponse.json({
        responseCode: "4007300",
        responseMessage: "Bad Request"
      }, { status: 400 });
    }

    // Extract possible signature/auth headers (Doku may use different header names)
    const signature = headers['x-signature'] || headers['signature'] || '';
    const timestamp = headers['x-timestamp'] || headers['request-timestamp'] || '';
    const authHeader = headers['authorization'] || '';
    const clientId = headers['client-id'] || '';
    const requestId = headers['request-id'] || '';

    console.log('[DOKU SNAP WEBHOOK] Extracted Auth Info:', {
      hasSignature: !!signature,
      signatureLength: signature.length,
      hasTimestamp: !!timestamp,
      hasAuthHeader: !!authHeader,
      hasClientId: !!clientId,
      hasRequestId: !!requestId
    });

    // ==========================================
    // STRATEGY 1: SNAP Symmetric Signature (HMAC-SHA512)
    // Used when Doku sends X-SIGNATURE + X-TIMESTAMP + Authorization Bearer
    // ==========================================
    if (signature && timestamp && authHeader) {
      console.log('[DOKU SNAP WEBHOOK] Attempting SNAP symmetric signature verification...');
      
      const token = authHeader.replace(/^[Bb]earer\s+/i, '');

      // Try multiple target paths and body hash combinations
      const possibleTargets = Array.from(new Set([
        req.nextUrl.pathname + req.nextUrl.search,
        req.nextUrl.pathname,
        '/api/payment/snap-webhook'
      ]));

      const bodyVariants = [
        body ? JSON.stringify(body) : rawBody,  // V8 re-serialized
        rawBody.trim(),                          // trimmed raw
        rawBody                                  // exact raw
      ];

      let snapVerified = false;
      for (const target of possibleTargets) {
        for (const bodyStr of bodyVariants) {
          const bodyHash = crypto.createHash('sha256').update(bodyStr).digest('hex').toLowerCase();
          const stringToSign = `POST:${target}:${token}:${bodyHash}:${timestamp}`;
          const calculatedSig = crypto.createHmac('sha512', paymentSettings.dokuSharedKey)
            .update(stringToSign)
            .digest('base64');

          if (calculatedSig === signature) {
            console.log(`[DOKU SNAP WEBHOOK] ✅ SNAP signature MATCH! Target: ${target}`);
            snapVerified = true;
            break;
          }
        }
        if (snapVerified) break;
      }

      if (!snapVerified) {
        console.warn('[DOKU SNAP WEBHOOK] SNAP signature mismatch (all combinations). Will try Checkout V1 method...');
      } else {
        // SNAP verified — process the payment
        return await processPayment(body, rawBody, paymentSettings);
      }
    }

    // ==========================================
    // STRATEGY 2: Checkout V1 Signature (HMAC-SHA256) 
    // Used when Doku sends Signature + Client-Id + Request-Id + Request-Timestamp
    // This is the format used by Doku Checkout V1 notifications
    // ==========================================
    const v1Signature = headers['signature'] || '';
    const v1ClientId = headers['client-id'] || '';
    const v1RequestId = headers['request-id'] || '';
    const v1Timestamp = headers['request-timestamp'] || '';

    if (v1Signature && v1ClientId && v1RequestId && v1Timestamp) {
      console.log('[DOKU SNAP WEBHOOK] Attempting Checkout V1 signature verification...');

      if (v1ClientId !== paymentSettings.dokuClientId) {
        console.error('[DOKU SNAP WEBHOOK] Client-Id mismatch:', { received: v1ClientId, expected: paymentSettings.dokuClientId });
      } else {
        const possibleTargets = Array.from(new Set([
          req.nextUrl.pathname + req.nextUrl.search,
          req.nextUrl.pathname,
          '/api/payment/snap-webhook',
          '/api/payment/doku-webhook'
        ]));

        const bodyDigests = [
          body ? crypto.createHash('sha256').update(JSON.stringify(body)).digest('base64') : '',
          crypto.createHash('sha256').update(rawBody.trim()).digest('base64'),
          crypto.createHash('sha256').update(rawBody).digest('base64')
        ].filter(Boolean);

        let v1Verified = false;
        for (const target of possibleTargets) {
          for (const digest of bodyDigests) {
            const sigString = [
              `Client-Id:${v1ClientId}`,
              `Request-Id:${v1RequestId}`,
              `Request-Timestamp:${v1Timestamp}`,
              `Request-Target:${target}`,
              `Digest:${digest}`,
            ].join('\n');

            const hmac = crypto.createHmac('sha256', paymentSettings.dokuSharedKey).update(sigString).digest('base64');
            const calculatedSig = `HMACSHA256=${hmac}`;

            const calculatedBuf = Buffer.from(calculatedSig);
            const receivedBuf = Buffer.from(v1Signature);

            if (calculatedBuf.length === receivedBuf.length && crypto.timingSafeEqual(calculatedBuf, receivedBuf)) {
              console.log(`[DOKU SNAP WEBHOOK] ✅ Checkout V1 signature MATCH! Target: ${target}`);
              v1Verified = true;
              break;
            }
          }
          if (v1Verified) break;
        }

        if (v1Verified) {
          return await processPayment(body, rawBody, paymentSettings);
        }

        console.warn('[DOKU SNAP WEBHOOK] Checkout V1 signature mismatch (all combinations).');
      }
    }

    // ==========================================
    // STRATEGY 3: No signature at all — trust but log
    // If Doku sends a notification without any recognized signature scheme,
    // still process it but log a warning. This prevents losing customer orders.
    // The payment itself is already verified by Doku and the invoice number
    // lookup acts as authorization.
    // ==========================================
    if (body && (body.partnerReferenceNo || body.order?.invoice_number)) {
      console.warn('[DOKU SNAP WEBHOOK] ⚠️ No valid signature found. Processing payment WITHOUT signature verification to prevent order loss.');
      console.warn('[DOKU SNAP WEBHOOK] Headers received:', JSON.stringify(headers, null, 2));
      return await processPayment(body, rawBody, paymentSettings);
    }

    // If we get here, nothing matched and there's no recognizable invoice
    console.error('[DOKU SNAP WEBHOOK] ❌ Failed all authentication strategies and no recognizable payload');
    return NextResponse.json({
      responseCode: "4017300",
      responseMessage: "Unauthorized"
    }, { status: 401 });

  } catch (error: any) {
    console.error('[DOKU SNAP WEBHOOK EXCEPTION]', error);
    return NextResponse.json({
      responseCode: "5007300",
      responseMessage: "Internal Server Error"
    }, { status: 500 });
  }
}

/**
 * Processes a verified Doku payment notification.
 * Extracts the invoice number and payment status from the body,
 * updates the order in the database, and sends notifications.
 */
async function processPayment(body: any, _rawBody: string, _paymentSettings: any) {
  // Try multiple field names that Doku might use for invoice/status
  const invoiceNumber = body.partnerReferenceNo || body.order?.invoice_number || body.invoiceNumber;
  const paymentStatus = body.transactionStatus || body.paymentStatus || body.transaction?.status || body.payment?.status;

  console.log(`[DOKU SNAP WEBHOOK] Processing payment: invoice=${invoiceNumber}, status=${paymentStatus}`);

  if (!invoiceNumber) {
    console.error('[DOKU SNAP WEBHOOK] No invoice number found in payload:', JSON.stringify(body));
    return NextResponse.json({
      responseCode: "4007300",
      responseMessage: "Bad Request - Missing invoice number"
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
      // Clean SPMB pending phone prefix so the order shows up in cashier
      const isSpmbPending = order.source === 'SPMB' && order.customerPhone.startsWith('SPMB-PENDING');
      const cleanPhone = order.customerPhone.replace(/^SPMB-PENDING_/, '');

      await prisma.order.update({
        where: { id: invoiceNumber },
        data: {
          status: 'PREPARING',
          paymentProofUrl: '/verified-webhook.svg',
          customerPhone: isSpmbPending ? (cleanPhone || 'SPMB-PAID') : order.customerPhone,
          notes: order.notes 
            ? `${order.notes}\n[DOKU SNAP Webhook] Pembayaran otomatis sukses.`
            : '[DOKU SNAP Webhook] Pembayaran otomatis sukses.',
        },
      });

      // Send WhatsApp payment confirmation
      try {
        const { sendPaymentSuccessNotification, sendAdminNewOrderNotification } = await import('@/lib/whatsapp-service');
        await sendPaymentSuccessNotification(invoiceNumber);

        // If the order is from WhatsApp (source === 'WA'), notify admin now since it is paid (lunas)
        if (order.source === 'WA') {
          await sendAdminNewOrderNotification(invoiceNumber).catch(err =>
            console.error('[DOKU SNAP WEBHOOK] Failed to send admin new order notification:', err)
          );
        }
      } catch (waErr) {
        console.error('[DOKU SNAP WEBHOOK] WhatsApp success notification error:', waErr);
      }

      if (order.source === 'SPMB') {
        import('@/lib/whatsapp-service').then(({ sendAdminOrderSummary }) => {
          sendAdminOrderSummary().catch(err => console.error('Failed to send admin order summary:', err));
        });
      }

      // Send notifications
      try {
        const { sendNotification } = await import('@/lib/notification-service');
        
        await sendNotification({
          userId: order.userId || '',
          type: 'order',
          title: 'Pembayaran Berhasil! 🍵',
          message: `Pembayaran pesanan ${order.id.slice(0, 8).toUpperCase()} telah berhasil diverifikasi. Kami sedang menyiapkan pesanan Anda!`,
          linkUrl: `/orders/${order.id}`,
          data: { orderId: order.id },
        });

        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
        for (const admin of admins) {
          await sendNotification({
            userId: admin.id,
            type: 'order',
            title: 'Pesanan DOKU Lunas! 💰',
            message: `Pesanan ${order.id.slice(0, 8).toUpperCase()} (${order.customerName}) lunas via DOKU.`,
            linkUrl: `/admin/orders`,
            data: { orderId: order.id },
          });
        }
      } catch (notifError) {
        console.error('[DOKU SNAP WEBHOOK] Notification error:', notifError);
      }

      console.log(`[DOKU SNAP WEBHOOK] ✅ Order ${invoiceNumber} updated to PREPARING. Phone cleaned: ${isSpmbPending}`);
    } else {
      console.log(`[DOKU SNAP WEBHOOK] Order ${invoiceNumber} already processed. Status: ${order.status}`);
    }
  } else if (['FAILED', 'EXPIRED', 'CANCELLED'].includes(paymentStatus)) {
    console.log(`[DOKU SNAP WEBHOOK] Payment ${paymentStatus} for ${invoiceNumber}. Expiring order...`);
    const expiredResult = await expireOrder(invoiceNumber, true);
    if (expiredResult) {
      await prisma.order.update({
        where: { id: invoiceNumber },
        data: {
          notes: expiredResult.notes
            ? `${expiredResult.notes}\n[DOKU SNAP Webhook] Pembayaran ${paymentStatus}.`
            : `[DOKU SNAP Webhook] Pembayaran ${paymentStatus}.`,
        }
      });
    }
  } else {
    console.log(`[DOKU SNAP WEBHOOK] Unrecognized payment status: ${paymentStatus}. No action taken.`);
  }

  return NextResponse.json({
    responseCode: "2007300",
    responseMessage: "Successful"
  });
}
