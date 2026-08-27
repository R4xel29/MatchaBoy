import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { expireOrder } from '@/lib/order-utils';
import { standardizeJid, sendWhatsAppMessage } from '@/lib/whatsapp-service';

export async function POST(req: Request) {
  try {
    // Optional secret key validation (can be bypassed for general cron execution if needed,
    // but good to support validation if headers are passed)
    const authHeader = req.headers.get('Authorization');
    const expectedToken = process.env.WA_BOT_API_KEY;
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      console.warn('[CHECK-UNPAID] Unauthorized access attempt');
    }

    const orders = await prisma.order.findMany({
      where: {
        status: 'PENDING_PAYMENT'
      }
    });

    const now = new Date();
    const results = [];

    for (const order of orders) {
      const diffMs = now.getTime() - order.createdAt.getTime();
      const diffMins = diffMs / (1000 * 60);
      const isQris = order.paymentMethod === 'QRIS' || order.paymentMethod === 'QRIS_INSTAN';
      const timeoutLimit = isQris ? 5 : 30;

      if (diffMins >= timeoutLimit) {
        console.log(`[CHECK-UNPAID] Expiring order ${order.id} (unpaid for ${Math.round(diffMins)} minutes)`);
        await expireOrder(order.id, true, `Dibatalkan otomatis oleh sistem (QRIS belum terbayar > ${timeoutLimit} menit)`);

        // Notify user
        if (order.customerPhone && !order.customerPhone.startsWith('SPMB-PENDING')) {
          try {
            const userMsg = `Halo *${order.customerName}*!\n\nPesanan Anda *#${order.id.slice(-6).toUpperCase()}* telah dibatalkan secara otomatis karena belum ada pembayaran yang diterima setelah ${timeoutLimit} menit. ❌`;
            await sendWhatsAppMessage(standardizeJid(order.customerPhone), userMsg);
          } catch (err) {
            console.error(`[CHECK-UNPAID] Failed to notify user for expired order ${order.id}:`, err);
          }
        }

        // Notify admin/group
        const storeSettings = await prisma.storeSettings.findFirst();
        if (storeSettings && storeSettings.adminWaNumbers) {
          try {
            const adminNumbers = storeSettings.adminWaNumbers
              .split(',')
              .map(n => n.trim())
              .filter(n => n.length > 0)
              .map(n => standardizeJid(n));

            const adminMsg = `❌ *PESANAN DIBATALKAN (BELUM DIBAYAR >= ${timeoutLimit} MENIT)*\n\n` +
                             `*ID Pesanan:* ${order.id}\n` +
                             `*Pelanggan:* ${order.customerName} (${order.customerPhone})\n` +
                             `*Total:* Rp ${order.total.toLocaleString('id-ID')}\n` +
                             `*Metode:* ${order.paymentMethod}`;

            for (const adminPhone of adminNumbers) {
              await sendWhatsAppMessage(adminPhone, adminMsg);
            }
          } catch (err) {
            console.error(`[CHECK-UNPAID] Failed to notify admins for expired order ${order.id}:`, err);
          }
        }

        results.push({ id: order.id, status: 'CANCELLED', duration: diffMins });
      } else {
        console.log(`[CHECK-UNPAID] Sending payment reminder for order ${order.id} (unpaid for ${Math.round(diffMins)} minutes)`);
        
        // Send payment reminder
        if (order.customerPhone && !order.customerPhone.startsWith('SPMB-PENDING')) {
          try {
            const reminderMsg = `Halo *${order.customerName}*!\n\nPesanan Anda *#${order.id.slice(-6).toUpperCase()}* masih menunggu pembayaran. Mohon segera selesaikan pembayaran Anda menggunakan link/QRIS yang tersedia agar pesanan dapat segera diproses. Terima kasih! 🍵` + 
                                (order.paymentUrl ? `\n\nLink Pembayaran: ${order.paymentUrl}` : "");
            await sendWhatsAppMessage(standardizeJid(order.customerPhone), reminderMsg);
          } catch (err) {
            console.error(`[CHECK-UNPAID] Failed to send payment reminder for order ${order.id}:`, err);
          }
        }

        results.push({ id: order.id, status: 'REMINDER_SENT', duration: diffMins });
      }
    }

    return NextResponse.json({ success: true, processedCount: orders.length, details: results });
  } catch (error: any) {
    console.error('[CHECK-UNPAID ERROR]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
