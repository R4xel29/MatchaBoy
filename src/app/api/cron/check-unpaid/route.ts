import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage, standardizeJid } from "@/lib/whatsapp-service";
import { restoreStockForOrder } from "@/lib/inventory-utils";
import { revertVoucherUsage } from "@/lib/discount-utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const requestUrl = new URL(req.url);
    const token = req.headers.get("x-api-key") || 
                  requestUrl.searchParams.get("token");

    const expectedToken = process.env.WA_BOT_API_KEY;
    if (!expectedToken || token !== expectedToken) {
      console.warn(`[CHECK_UNPAID_CRON] Unauthorized attempt.`);
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Fetch orders with PENDING_PAYMENT status
    const pendingOrders = await prisma.order.findMany({
      where: {
        status: "PENDING_PAYMENT"
      },
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        createdAt: true,
        lastUnpaidReminderSent: true,
        total: true,
        paymentUrl: true,
        paymentQrContent: true,
        paymentMethod: true,
        notes: true,
        userId: true,
        voucherCode: true
      }
    });

    const now = new Date();
    const cancelledIds: string[] = [];
    const remindedIds: string[] = [];

    for (const order of pendingOrders) {
      const createdAt = new Date(order.createdAt);
      const minutesSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60);
      const isQris = order.paymentMethod === 'QRIS' || order.paymentMethod === 'QRIS_INSTAN';
      const timeoutLimit = isQris ? 5 : 30;

      if (minutesSinceCreated >= timeoutLimit) {
        // Cancel the order
        console.log(`[CHECK_UNPAID_CRON] Order ${order.id} is unpaid for >= ${timeoutLimit} mins. Cancelling...`);

        await prisma.$transaction(async (tx) => {
          // 1. Update order status
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: "CANCELLED",
              cancelReason: `Dibatalkan otomatis oleh sistem karena melewati batas waktu pembayaran (${timeoutLimit} menit).`,
              notes: order.notes
                ? `${order.notes}\n[Batal] Dibatalkan otomatis oleh sistem karena melewati batas waktu pembayaran (${timeoutLimit} menit).`
                : `[Batal] Dibatalkan otomatis oleh sistem karena melewati batas waktu pembayaran (${timeoutLimit} menit).`
            }
          });

          // 2. Restore points if any
          const pointHistories = await tx.pointHistory.findMany({
            where: {
              orderId: order.id,
              amount: { lt: 0 } // Negative points (redeemed)
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
                  type: "ADMIN_ADJUST",
                  description: `Pengembalian ${refundAmount} poin karena pesanan #${order.id.slice(0, 8).toUpperCase()} dibatalkan otomatis`,
                  orderId: order.id
                }
              });
            }
          }

          // 3. Restore used voucher or template quota if any
          if (order.voucherCode) {
            await revertVoucherUsage(tx, order.voucherCode);
          }
        });

        // Restore stock
        try {
          await restoreStockForOrder(order.id);
        } catch (stockErr) {
          console.error(`[CHECK_UNPAID_CRON] Failed to restore stock for order ${order.id}:`, stockErr);
        }

        // Send WhatsApp cancellation notice
        const cancelMsg = `⚠️ *PESANAN DIBATALKAN OTOMATIS* ⚠️\n\nHalo *${order.customerName}*,\n\nPesanan Anda *${order.id}* dengan total *Rp${order.total.toLocaleString("id-ID")}* telah dibatalkan secara otomatis oleh sistem karena melewati batas waktu pembayaran ${timeoutLimit} menit.\n\nSilakan lakukan pemesanan kembali jika Anda masih ingin memesan. Terima kasih! 🍵`;
        try {
          await sendWhatsAppMessage(standardizeJid(order.customerPhone), cancelMsg);
        } catch (waErr) {
          console.error(`[CHECK_UNPAID_CRON] Failed to send WA cancellation for order ${order.id}:`, waErr);
        }

        cancelledIds.push(order.id);
      } else if (minutesSinceCreated >= 2) {
        // Send payment reminder if 2 minutes passed since last reminder (or creation if no reminder sent yet)
        const lastReminder = order.lastUnpaidReminderSent 
          ? new Date(order.lastUnpaidReminderSent) 
          : createdAt;
        
        const minutesSinceLastReminder = (now.getTime() - lastReminder.getTime()) / (1000 * 60);

        if (minutesSinceLastReminder >= 2) {
          console.log(`[CHECK_UNPAID_CRON] Order ${order.id} is unpaid for >= 2 mins since last check. Sending reminder...`);

          // Update reminder timestamp
          await prisma.order.update({
            where: { id: order.id },
            data: {
              lastUnpaidReminderSent: now
            }
          });

          // Resolve QRIS image URL (dynamic QRIS)
          let imageUrl = order.paymentUrl;
          if (imageUrl) {
            if (imageUrl.includes('api.doku.com/doku-mcp-server')) {
              imageUrl = imageUrl.replace('api.doku.com/doku-mcp-server', 'mcp.doku.com');
            }
          } else if (order.paymentQrContent) {
            const isSandbox = process.env.DOKU_SANDBOX === 'true';
            const apiDomain = isSandbox ? 'https://api-sandbox.doku.com' : 'https://api.doku.com';
            imageUrl = `${apiDomain}/doku-mcp-server/api/qr/generate?qr=${encodeURIComponent(order.paymentQrContent)}`;
          }

          // Send WhatsApp reminder
          const reminderMsg = `⚠️ *PENGINGAT PEMBAYARAN* ⚠️\n\nHalo *${order.customerName}*,\n\nPesanan Anda *${order.id}* dengan total *Rp ${order.total.toLocaleString("id-ID")}* belum terbayar.\n\n*Cara Pembayaran QRIS:*\n1. Simpan/Screenshot gambar QRIS di atas.\n2. Buka aplikasi e-wallet Anda (GoPay, OVO, DANA, ShopeePay, dll.) atau M-Banking.\n3. Pilih menu *Scan / Bayar* lalu unggah gambar QRIS tadi dari galeri.\n4. Konfirmasi pembayaran dan masukkan PIN Anda.\n\n_Pesanan akan dibatalkan otomatis oleh sistem jika belum terbayar dalam waktu ${timeoutLimit} menit sejak pemesanan._\n\nTerima kasih! 🍵`;

          try {
            await sendWhatsAppMessage(standardizeJid(order.customerPhone), reminderMsg, imageUrl || undefined);
          } catch (waErr) {
            console.error(`[CHECK_UNPAID_CRON] Failed to send WA reminder for order ${order.id}:`, waErr);
          }

          remindedIds.push(order.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: pendingOrders.length,
      cancelledCount: cancelledIds.length,
      cancelledOrders: cancelledIds,
      remindedCount: remindedIds.length,
      remindedOrders: remindedIds
    });

  } catch (error) {
    console.error("[CHECK_UNPAID_CRON] Error running unpaid check cron:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
