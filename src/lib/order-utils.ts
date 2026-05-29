import { prisma } from './prisma';
import { supabaseAdmin } from './supabase';

/**
 * ✅ BUG FIX #6: Fixed race condition in order expiry
 * 
 * Reusable utility to check, cancel, and refund an order if it is expired,
 * or force-cancel it immediately (e.g. on manual user cancellation).
 * 
 * Automatically refunds points and restores any applied vouchers using a secure transaction.
 * 
 * FIXES:
 * - Removed pre-transaction query that caused race conditions
 * - All checks now happen inside transaction with atomic updates
 * - Uses updateMany with WHERE condition for atomic status check
 */
export async function expireOrder(orderId: string, force: boolean = false) {
  try {
    console.log(`[Order Expiry] Processing order ${orderId}. Force: ${force}`);
    
    const result = await prisma.$transaction(async (tx) => {
      // ✅ FIX: Query order INSIDE transaction (no pre-check outside)
      const order = await tx.order.findUnique({
        where: { id: orderId }
      });

      if (!order) {
        console.log(`[Order Expiry] Order ${orderId} not found`);
        return null;
      }

      // Check if order is still in PENDING_PAYMENT status
      if (order.status !== 'PENDING_PAYMENT') {
        console.log(`[Order Expiry] Order ${orderId} status is ${order.status}, skipping cancellation`);
        return order;
      }

      // Check if expired (only if not forced)
      const isExpired = order.paymentExpiredAt && new Date() > order.paymentExpiredAt;
      
      if (!isExpired && !force) {
        console.log(`[Order Expiry] Order ${orderId} not expired yet and not forced`);
        return order;
      }

      // ✅ FIX: Use updateMany with atomic WHERE condition
      // This ensures status is still PENDING_PAYMENT at the moment of update
      const updateResult = await tx.order.updateMany({
        where: { 
          id: orderId,
          status: 'PENDING_PAYMENT' // Atomic check: only update if still PENDING_PAYMENT
        },
        data: {
          status: 'CANCELLED',
          notes: order.notes 
            ? `${order.notes}\n[Sistem] Sesi pembayaran berakhir atau dibatalkan.`
            : '[Sistem] Sesi pembayaran berakhir atau dibatalkan.'
        }
      });

      // If updateMany affected 0 rows, status changed between our check and update
      if (updateResult.count === 0) {
        console.log(`[Order Expiry] Order ${orderId} status changed during transaction, skipping refund`);
        // Re-fetch to return current state
        return await tx.order.findUnique({ where: { id: orderId } });
      }

      console.log(`[Order Expiry] Order ${orderId} cancelled successfully, processing refunds`);

      // 2. Restore points if any
      const pointHistories = await tx.pointHistory.findMany({
        where: {
          orderId: orderId,
          amount: { lt: 0 } // Negative points (redeemed)
        }
      });

      for (const ph of pointHistories) {
        const refundAmount = Math.abs(ph.amount);
        
        if (order.userId) {
          // Return points to user
          await tx.user.update({
            where: { id: order.userId },
            data: { points: { increment: refundAmount } }
          });
          
          // Log refund in history
          await tx.pointHistory.create({
            data: {
              userId: order.userId,
              amount: refundAmount,
              type: 'ADMIN_ADJUST',
              description: `Pengembalian ${refundAmount} poin karena pesanan #${orderId.slice(0, 8).toUpperCase()} kedaluwarsa/batal`,
              orderId: orderId
            }
          });
          
          console.log(`[Order Expiry] Refunded ${refundAmount} points to user ${order.userId}`);
        }
      }

      // 3. Restore used voucher if any
      if (order.voucherCode) {
        const voucher = await tx.voucher.findUnique({
          where: { code: order.voucherCode }
        });
        
        if (voucher && voucher.isUsed) {
          await tx.voucher.update({
            where: { id: voucher.id },
            data: {
              isUsed: false,
              usedAt: null
            }
          });
          console.log(`[Order Expiry] Restored voucher ${order.voucherCode}`);
        }
      }

      // Return updated order
      return await tx.order.findUnique({ where: { id: orderId } });
    });
    
    return result;
  } catch (e) {
    console.error(`[Order Expiry Error] Failed to expire/refund order ${orderId}:`, e);
    throw e; // Re-throw to let caller handle
  }
}

/**
 * Automatically cleans up old user-uploaded payment proof files.
 * Finds orders older than 30 days that have a payment proof URL.
 * Deletes the files from Supabase Storage and clears the DB fields.
 */
export async function cleanupOldPaymentProofs() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Find orders older than 30 days with a payment proof
    const oldOrders = await prisma.order.findMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        paymentProofUrl: {
          not: null,
        },
      },
      select: {
        id: true,
        paymentProofUrl: true,
      },
    });

    if (oldOrders.length === 0) return;

    console.log(`[Cleanup] Found ${oldOrders.length} orders older than 30 days with payment proof urls.`);

    for (const order of oldOrders) {
      const url = order.paymentProofUrl;
      if (!url || url === '/verified-cashier.svg') continue;

      // Parse Supabase filename/path
      const storageMarker = '/storage/v1/object/public/products/';
      const markerIndex = url.indexOf(storageMarker);
      
      if (markerIndex !== -1) {
        const path = decodeURIComponent(url.slice(markerIndex + storageMarker.length));
        try {
          console.log(`[Cleanup] Deleting storage file: ${path}`);
          const { error } = await supabaseAdmin.storage.from('products').remove([path]);
          if (error) {
            console.error(`[Cleanup Error] Failed to delete file ${path} from storage:`, error);
          }
        } catch (storageErr) {
          console.error(`[Cleanup Error] Exception deleting file ${path}:`, storageErr);
        }
      }

      // Clear from database
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentProofUrl: null },
      });
      console.log(`[Cleanup] Cleared paymentProofUrl for order #${order.id}`);
    }
  } catch (err) {
    console.error('[Cleanup Error] Failed to execute payment proof cleanup:', err);
  }
}
