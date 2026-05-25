import { prisma } from './prisma';

/**
 * Reusable utility to check, cancel, and refund an order if it is expired,
 * or force-cancel it immediately (e.g. on manual user cancellation).
 * 
 * Automatically refunds points and restores any applied vouchers using a secure transaction.
 */
export async function expireOrder(orderId: string, force: boolean = false) {
  const order = await prisma.order.findUnique({
    where: { id: orderId }
  });

  if (!order) return null;

  const isExpired = order.status === 'PENDING_PAYMENT' && order.paymentExpiredAt && new Date() > order.paymentExpiredAt;

  if (isExpired || (force && order.status === 'PENDING_PAYMENT')) {
    try {
      console.log(`[Order Expiry] Order ${orderId} is being cancelled. Force: ${force}, Expired: ${isExpired}`);
      
      const result = await prisma.$transaction(async (tx) => {
        // Fetch order inside transaction to lock the row
        const currentOrder = await tx.order.findUnique({
          where: { id: orderId }
        });

        if (!currentOrder || currentOrder.status !== 'PENDING_PAYMENT') {
          return currentOrder;
        }

        // 1. Mark order as CANCELLED
        const updated = await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'CANCELLED',
            notes: currentOrder.notes 
              ? `${currentOrder.notes}\n[Sistem] Sesi pembayaran berakhir atau dibatalkan.`
              : '[Sistem] Sesi pembayaran berakhir atau dibatalkan.'
          }
        });

        // 2. Restore points if any
        const pointHistories = await tx.pointHistory.findMany({
          where: {
            orderId: orderId,
            amount: { lt: 0 } // Negative points (redeemed)
          }
        });

        for (const ph of pointHistories) {
          const refundAmount = Math.abs(ph.amount);
          // Return points to user
          await tx.user.update({
            where: { id: currentOrder.userId || '' },
            data: { points: { increment: refundAmount } }
          });
          // Log refund in history
          await tx.pointHistory.create({
            data: {
              userId: currentOrder.userId || '',
              amount: refundAmount,
              type: 'ADMIN_ADJUST',
              description: `Pengembalian ${refundAmount} poin karena pesanan #${orderId.slice(0, 8).toUpperCase()} kedaluwarsa/batal`,
              orderId: orderId
            }
          });
        }

        // 3. Restore used voucher if any
        if (currentOrder.voucherCode) {
          const voucher = await tx.voucher.findUnique({
            where: { code: currentOrder.voucherCode }
          });
          if (voucher && voucher.isUsed) {
            await tx.voucher.update({
              where: { id: voucher.id },
              data: {
                isUsed: false,
                usedAt: null
              }
            });
          }
        }

        return updated;
      });
      return result;
    } catch (e) {
      console.error(`[Order Expiry Error] Failed to expire/refund order ${orderId}:`, e);
    }
  }

  return order;
}
