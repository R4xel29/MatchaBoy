import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyDokuWebhookSignature } from '@/lib/doku';
import { expireOrder } from '@/lib/order-utils';
import fs from 'fs';
import path from 'path';

function logWebhookEvent(info: any) {
  // Always log to stdout so it shows up in Vercel logs
  console.log('[DOKU WEBHOOK DEBUG]', JSON.stringify({
    timestamp: new Date().toISOString(),
    ...info
  }, null, 2));

  try {
    const logFilePath = path.join(process.cwd(), 'doku-webhook-debug.log');
    const logEntry = JSON.stringify({
      timestamp: new Date().toISOString(),
      ...info
    }, null, 2) + '\n---\n';
    fs.appendFileSync(logFilePath, logEntry, 'utf8');
  } catch (err) {
    // Only log file writing error if it's not a read-only filesystem error to keep logs clean
    if (err instanceof Error && !err.message.includes('EROFS') && !err.message.includes('read-only')) {
      console.error('[DOKU WEBHOOK LOG FILE ERROR]', err);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    
    // Extract headers into a simple record with lowercase keys
    const headers: Record<string, string> = {};
    req.headers.forEach((val, key) => {
      headers[key.toLowerCase()] = val;
    });

    // Fetch the merchant configuration singleton
    const paymentSettings = await prisma.paymentSettings.findFirst();
    
    logWebhookEvent({
      event: 'RECEIVED',
      headers,
      rawBody,
      settingsFound: !!paymentSettings,
      dokuEnabled: paymentSettings?.dokuEnabled,
      clientId: paymentSettings?.dokuClientId,
      sharedKeyLength: paymentSettings?.dokuSharedKey?.length || 0,
      dokuSandbox: paymentSettings?.dokuSandbox
    });

    if (!paymentSettings || !paymentSettings.dokuEnabled) {
      console.warn('[DOKU WEBHOOK] Webhook received but DOKU payment setting is disabled/missing');
      logWebhookEvent({ event: 'REJECTED_DISABLED', reason: 'Doku disabled or no settings' });
      return NextResponse.json({ error: 'DOKU disabled' }, { status: 400 });
    }

    const requestTarget = req.nextUrl.pathname + req.nextUrl.search;

    // Extract signature header
    const signatureHeader = headers['signature'];

    // Handle DOKU dashboard save handshake ping (empty body or missing signature)
    if (!signatureHeader || !rawBody || rawBody.trim() === '') {
      console.log('[DOKU WEBHOOK] Received handshake/ping check from DOKU. Returning 200 OK.');
      logWebhookEvent({ event: 'HANDSHAKE_OR_PING' });
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

    logWebhookEvent({
      event: 'SIGNATURE_CHECK',
      isValid,
      requestTarget,
      signatureHeader,
      receivedClientId: headers['client-id'],
      receivedRequestId: headers['request-id'],
      receivedTimestamp: headers['request-timestamp']
    });

    if (!isValid) {
      console.error('[DOKU WEBHOOK] Invalid signature received! Rejecting request.');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse the payload body
    const payload = JSON.parse(rawBody);
    const invoiceNumber = payload.order?.invoice_number;
    const paymentStatus = payload.transaction?.status || payload.payment?.status;

    console.log(`[DOKU WEBHOOK] Signature valid. Invoice: ${invoiceNumber}, Status: ${paymentStatus}`);
    
    logWebhookEvent({
      event: 'PROCESSING_PAYMENT',
      invoiceNumber,
      paymentStatus,
      payload
    });

    if (!invoiceNumber) {
      return NextResponse.json({ error: 'Missing invoice number' }, { status: 400 });
    }

    // Update matched orders or wallet transactions to COMPLETED/PREPARING on SUCCESS
    if (paymentStatus === 'SUCCESS') {
      if (invoiceNumber.startsWith('MB-TOPUP-')) {
        const tx = await prisma.walletTransaction.findFirst({
          where: { referenceId: invoiceNumber, status: { in: ['PENDING', 'VERIFYING'] } }
        });

        if (!tx) {
          console.error(`[DOKU WEBHOOK] Wallet transaction not found for invoice: ${invoiceNumber}`);
          return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        }

        const amount = tx.amount;
        const settings = await prisma.paymentSettings.findFirst();
        const bonusMinAmount = settings?.walletBonusMinAmount ?? 100000;
        const bonusPercent = settings?.walletBonusPercent ?? 10;
        const bonusMode = settings?.walletBonusMode ?? "BOTH";

        const isPromoActiveMode = settings?.walletFirstTimePromoEnabled && (bonusMode === "FIRST_TIME" || bonusMode === "BOTH");
        const isRegularActiveMode = bonusMode === "REGULAR" || bonusMode === "BOTH";

        const isPromoApplied = isPromoActiveMode && tx.promoBonus !== null && tx.promoBonus > 0;
        const hasBonus = isPromoApplied || (isRegularActiveMode && amount >= bonusMinAmount);
        const bonusAmount = isPromoApplied ? tx.promoBonus! : (hasBonus ? Math.floor(amount * (bonusPercent / 100)) : 0);
        const totalTopUp = amount + bonusAmount;

        const { incrementQuestProgress } = await import('@/lib/loyalty-utils');

        await prisma.$transaction(async (prismaTx) => {
          // Increment user's wallet balance
          await prismaTx.user.update({
            where: { id: tx.userId },
            data: { walletBalance: { increment: totalTopUp } }
          });

          // Mark transaction as COMPLETED
          await prismaTx.walletTransaction.update({
            where: { id: tx.id },
            data: { status: 'COMPLETED' }
          });

          // If there's a bonus, create a COMPLETED TOP_UP_BONUS transaction
          if (bonusAmount > 0) {
            await prismaTx.walletTransaction.create({
              data: {
                userId: tx.userId,
                amount: bonusAmount,
                type: 'TOP_UP_BONUS',
                description: isPromoApplied
                  ? `Bonus Top-up Pertama sebesar Rp${bonusAmount.toLocaleString('id-ID')}`
                  : `Bonus Top-up ${bonusPercent}% sebesar Rp${bonusAmount.toLocaleString('id-ID')}`,
                status: 'COMPLETED',
                paymentMethod: tx.paymentMethod,
                referenceId: tx.referenceId
              }
            });
          }

          // C1 Gamification Quests: Atomically increment top-up count quest progress
          await incrementQuestProgress(tx.userId, 'TOP_UP_COUNT', 1, prismaTx);
        });

        console.log(`[DOKU WEBHOOK] Wallet top-up transaction ${tx.id} completed successfully via webhook.`);
      } else {
        const order = await prisma.order.findUnique({
          where: { id: invoiceNumber },
        });

        if (!order) {
          console.error(`[DOKU WEBHOOK] Order not found for invoice: ${invoiceNumber}`);
          return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        if (order.status === 'PENDING_PAYMENT') {
          const isSpmbPending = order.source === 'SPMB' && order.customerPhone.startsWith('SPMB-PENDING');
          const cleanPhone = order.customerPhone.replace(/^SPMB-PENDING_/, '');
          await prisma.order.update({
            where: { id: invoiceNumber },
            data: {
              status: 'PREPARING',
              paymentProofUrl: '/verified-webhook.svg',
              customerPhone: isSpmbPending ? (cleanPhone || 'SPMB-PAID') : order.customerPhone,
              notes: order.notes 
                ? `${order.notes}\n[DOKU Webhook] Pembayaran otomatis sukses via DOKU.`
                : '[DOKU Webhook] Pembayaran otomatis sukses via DOKU.',
            },
          });

          // Send WhatsApp payment confirmation
          try {
            const { sendPaymentSuccessNotification } = await import('@/lib/whatsapp-service');
            await sendPaymentSuccessNotification(invoiceNumber);
          } catch (waErr) {
            console.error('[DOKU WEBHOOK] WhatsApp success notification error:', waErr);
          }

          if (order.source === 'SPMB') {
            import('@/lib/whatsapp-service').then(({ sendAdminOrderSummary }) => {
              sendAdminOrderSummary().catch(err => console.error('Failed to send admin order summary:', err));
            });
          }

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
    } else if (paymentStatus === 'FAILED' || paymentStatus === 'EXPIRED' || paymentStatus === 'CANCELLED') {
      if (invoiceNumber.startsWith('MB-TOPUP-')) {
        console.log(`[DOKU WEBHOOK] Top-up payment failed/expired/cancelled for invoice ${invoiceNumber}.`);
        await prisma.walletTransaction.updateMany({
          where: { referenceId: invoiceNumber, status: { in: ['PENDING', 'VERIFYING'] } },
          data: { status: 'REJECTED' }
        });
      } else {
        console.log(`[DOKU WEBHOOK] Payment failed/expired/cancelled for invoice ${invoiceNumber}. Expiring order...`);
        const expiredResult = await expireOrder(invoiceNumber, true); // Force cancel order
        if (expiredResult) {
          // Appending the specific DOKU cancellation note
          await prisma.order.update({
            where: { id: invoiceNumber },
            data: {
              notes: expiredResult.notes
                ? `${expiredResult.notes}\n[DOKU Webhook] Pembayaran kedaluwarsa/gagal dari DOKU.`
                : '[DOKU Webhook] Pembayaran kedaluwarsa/gagal dari DOKU.',
            }
          });
          console.log(`[DOKU WEBHOOK] Order ${invoiceNumber} expired and refunded successfully via centralized expireOrder.`);
        }
      }
    }

    return NextResponse.json({ status: 'OK' });
  } catch (error: any) {
    console.error('[DOKU WEBHOOK EXCEPTION]', error);
    logWebhookEvent({
      event: 'EXCEPTION',
      error: error.message || String(error),
      stack: error.stack
    });
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
