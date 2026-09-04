import { prisma } from './prisma';
import { supabaseAdmin } from './supabase';
import { revertVoucherUsage } from './discount-utils';
import type { Order } from '@prisma/client';

/**
 * Membatalkan pesanan yang telah kedaluwarsa atau dibatalkan secara manual,
 * serta memulihkan kuota voucher, poin loyalitas, reservasi meja, dan stok bahan baku.
 *
 * Sesuai aturan **AGENTS.md Bagian 5**:
 * Memanggil `revertVoucherUsage` untuk memastikan pemulihan voucher personal
 * maupun kuota pemakaian template voucher secara atomik dalam transaksi database.
 *
 * @param {string} orderId - ID pesanan unik yang akan dibatalkan
 * @param {boolean} [force=false] - Jika true, paksa batalkan tanpa mengecek batas waktu kedaluwarsa
 * @param {string} [cancelReasonText] - Catatan alasan pembatalan pesanan
 * @returns {Promise<Order | null>} Data pesanan setelah status diperbarui, atau null jika tidak ditemukan
 * @throws {Error} Jika terjadi kegagalan transaksi database
 *
 * @example
 * ```typescript
 * const cancelledOrder = await expireOrder('order-123', true, 'Dibatalkan oleh kasir');
 * ```
 */
export async function expireOrder(
  orderId: string,
  force: boolean = false,
  cancelReasonText?: string
): Promise<Order | null> {
  try {
    console.log(`[Order Expiry] Memproses pesanan ${orderId}. Force: ${force}`);
    
    let shouldRestoreStock = false;
    
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId }
      });

      if (!order) {
        console.log(`[Order Expiry] Pesanan ${orderId} tidak ditemukan`);
        return null;
      }

      // Pastikan status pesanan masih dapat dibatalkan
      if (order.status !== 'PENDING_PAYMENT' && order.status !== 'PENDING') {
        console.log(`[Order Expiry] Status pesanan ${orderId} adalah ${order.status}, lewati pembatalan`);
        return order;
      }

      // Cek apakah waktu pembayaran telah habis (batas QRIS standar: 5 menit)
      const isQris = order.paymentMethod === 'QRIS' || order.paymentMethod === 'QRIS_INSTAN';
      const orderAgeMinutes = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60);
      const isExpired = (order.paymentExpiredAt && new Date() > order.paymentExpiredAt) || (isQris && orderAgeMinutes >= 5);
      
      if (!isExpired && !force) {
        console.log(`[Order Expiry] Pesanan ${orderId} belum kedaluwarsa dan tidak dipaksa`);
        return order;
      }

      const defaultReason = isQris 
        ? 'Dibatalkan otomatis oleh sistem karena melewati batas waktu pembayaran QRIS (5 menit).'
        : 'Dibatalkan otomatis oleh sistem karena melewati batas waktu pembayaran.';
      const finalCancelReason = cancelReasonText || defaultReason;

      // Update status secara atomik
      const updateResult = await tx.order.updateMany({
        where: { 
          id: orderId,
          status: { in: ['PENDING_PAYMENT', 'PENDING'] }
        },
        data: {
          status: 'CANCELLED',
          cancelReason: finalCancelReason,
          notes: order.notes 
            ? `${order.notes}\n[Batal] ${finalCancelReason}`
            : `[Batal] ${finalCancelReason}`
        }
      });

      if (updateResult.count === 0) {
        console.log(`[Order Expiry] Status pesanan ${orderId} berubah saat transaksi berlangsung, lewati pengembalian dana`);
        return await tx.order.findUnique({ where: { id: orderId } });
      }

      shouldRestoreStock = true;
      console.log(`[Order Expiry] Pesanan ${orderId} berhasil dibatalkan, memproses pengembalian dana & pelepasan meja`);

      // 1. Bebaskan status meja jika Dine-In
      if (order.tableNumber) {
        await tx.diningTable.updateMany({
          where: { number: order.tableNumber },
          data: { status: 'AVAILABLE', occupiedSeats: 0 }
        });
      }

      // 2. Kembalikan poin loyalitas yang sempat ditukar jika ada
      const pointHistories = await tx.pointHistory.findMany({
        where: {
          orderId: orderId,
          amount: { lt: 0 }
        }
      });

      for (const ph of pointHistories) {
        const refundAmount = Math.abs(ph.amount);
        
        if (order.userId) {
          await tx.user.update({
            where: { id: order.userId },
            data: { points: { increment: refundAmount } }
          });
          
          await tx.pointHistory.create({
            data: {
              userId: order.userId,
              amount: refundAmount,
              type: 'ADMIN_ADJUST',
              description: `Pengembalian ${refundAmount} poin karena pesanan #${orderId.slice(0, 8).toUpperCase()} kedaluwarsa/batal`,
              orderId: orderId
            }
          });
          
          console.log(`[Order Expiry] Mengembalikan ${refundAmount} poin ke pengguna ${order.userId}`);
        }
      }

      // 3. Pulihkan voucher personal dan kuota template promo via universal helper
      if (order.voucherCode) {
        await revertVoucherUsage(tx, order.voucherCode);
        console.log(`[Order Expiry] Memulihkan voucher ${order.voucherCode}`);
      }

      return await tx.order.findUnique({ where: { id: orderId } });
    });
    
    if (shouldRestoreStock) {
      try {
        const { restoreStockForOrder } = await import('./inventory-utils');
        await restoreStockForOrder(orderId);
      } catch (stockErr) {
        console.error(`[Order Expiry Stock Restore Error] Failed to restore stock for order ${orderId}:`, stockErr);
      }
    }
    
    return result;
  } catch (e) {
    console.error(`[Order Expiry Error] Failed to expire/refund order ${orderId}:`, e);
    throw e; // Re-throw to let caller handle
  }
}

/**
 * Memindai dan membatalkan otomatis seluruh pesanan QRIS yang belum lunas
 * setelah melewati batas waktu 5 menit atau melebihi waktu `paymentExpiredAt`.
 *
 * Mengembalikan kuota voucher, poin, dan bahan baku untuk setiap pesanan yang dibatalkan.
 *
 * @returns {Promise<number>} Jumlah pesanan yang berhasil dibatalkan
 *
 * @example
 * ```typescript
 * const cancelledCount = await autoCancelExpiredQrisOrders();
 * console.log(`Dibatalkan: ${cancelledCount} pesanan QRIS kedaluwarsa.`);
 * ```
 */
export async function autoCancelExpiredQrisOrders(): Promise<number> {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const expiredPendingOrders = await prisma.order.findMany({
      where: {
        status: { in: ['PENDING_PAYMENT', 'PENDING'] },
        OR: [
          {
            paymentMethod: { in: ['QRIS', 'QRIS_INSTAN'] },
            createdAt: { lt: fiveMinutesAgo }
          },
          {
            paymentExpiredAt: { lt: new Date() }
          }
        ]
      },
      select: {
        id: true,
        paymentMethod: true,
        createdAt: true,
        paymentExpiredAt: true
      }
    });

    if (expiredPendingOrders.length === 0) return 0;

    console.log(`[Auto-Cancel QRIS] Ditemukan ${expiredPendingOrders.length} pesanan kedaluwarsa untuk dibatalkan.`);
    let cancelledCount = 0;

    for (const ord of expiredPendingOrders) {
      try {
        await expireOrder(
          ord.id, 
          true, 
          'Dibatalkan otomatis oleh sistem (QRIS kedaluwarsa > 5 menit).'
        );
        cancelledCount++;
      } catch (err) {
        console.error(`[Auto-Cancel QRIS Error] Gagal membatalkan pesanan ${ord.id}:`, err);
      }
    }

    return cancelledCount;
  } catch (err) {
    console.error('[Auto-Cancel QRIS Error] Gagal menjalankan pemindaian:', err);
    return 0;
  }
}

/**
 * Membersihkan berkas bukti pembayaran lama pelanggan yang berusia lebih dari 30 hari.
 * Menghapus fisik file dari Supabase Storage dan mengosongkan kolom `paymentProofUrl` di database.
 *
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * await cleanupOldPaymentProofs();
 * ```
 */
export async function cleanupOldPaymentProofs(): Promise<void> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
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

    console.log(`[Cleanup] Ditemukan ${oldOrders.length} bukti pembayaran lama > 30 hari.`);

    for (const order of oldOrders) {
      const url = order.paymentProofUrl;
      if (!url || url === '/verified-cashier.svg') continue;

      const storageMarker = '/storage/v1/object/public/products/';
      const markerIndex = url.indexOf(storageMarker);
      
      if (markerIndex !== -1) {
        const path = decodeURIComponent(url.slice(markerIndex + storageMarker.length));
        try {
          console.log(`[Cleanup] Menghapus file storage: ${path}`);
          const { error } = await supabaseAdmin.storage.from('products').remove([path]);
          if (error) {
            console.error(`[Cleanup Error] Gagal menghapus file ${path} dari storage:`, error);
          }
        } catch (storageErr) {
          console.error(`[Cleanup Error] Exception menghapus file ${path}:`, storageErr);
        }
      }

      await prisma.order.update({
        where: { id: order.id },
        data: { paymentProofUrl: null },
      });
      console.log(`[Cleanup] Dikosongkan paymentProofUrl untuk pesanan #${order.id}`);
    }
  } catch (err) {
    console.error('[Cleanup Error] Gagal mengeksekusi pembersihan bukti bayar:', err);
  }
}

/**
 * Menghapus pesanan tamu SPMB sementara yang belum terkonfirmasi (nomor telepon diawali 'SPMB-PENDING').
 * Batas waktu: 5 menit untuk pembayaran QRIS, atau 30 menit untuk Cash on Delivery (COD).
 *
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * await cleanupUnconfirmedSpmbOrders();
 * ```
 */
export async function cleanupUnconfirmedSpmbOrders(): Promise<void> {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const deleteResult = await prisma.order.deleteMany({
      where: {
        source: 'SPMB',
        customerPhone: { startsWith: 'SPMB-PENDING' },
        OR: [
          { paymentMethod: { in: ['QRIS', 'QRIS_INSTAN'] }, createdAt: { lt: fiveMinutesAgo } },
          { paymentMethod: 'COD', createdAt: { lt: thirtyMinutesAgo } }
        ]
      }
    });
    if (deleteResult.count > 0) {
      console.log(`[SPMB Cleanup] Berhasil menghapus ${deleteResult.count} pesanan SPMB unconfirmed.`);
    }
  } catch (err) {
    console.error('[SPMB Cleanup Error] Gagal menghapus pesanan SPMB unconfirmed:', err);
  }
}


