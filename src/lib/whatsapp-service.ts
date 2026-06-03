import { prisma } from './prisma';

export async function sendWhatsAppMessage(phone: string, text: string) {
  const waProviderUrl = process.env.WA_PROVIDER_URL || "http://localhost:3001/send";
  const apiKey = process.env.WA_BOT_API_KEY || "";
  
  console.log(`[WHATSAPP_SERVICE] Mengirim ke ${phone}: ${text.substring(0, 80)}`);
  
  try {
    const res = await fetch(waProviderUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify({ phone, message: text }),
    });
    if (!res.ok) {
      console.error(`[WHATSAPP_SERVICE] Bot API error ${res.status}:`, await res.text());
    }
  } catch (error) {
    console.error("[WHATSAPP_SERVICE] Gagal memanggil API Provider WA:", error);
  }
}

export async function sendReadyNotification(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      console.warn(`[WHATSAPP_SERVICE] Order ${orderId} tidak ditemukan untuk notifikasi.`);
      return;
    }

    if (!order.customerPhone || order.customerPhone === 'SPMB-PENDING') {
      console.log(`[WHATSAPP_SERVICE] Phone number is empty or pending for order ${orderId}. Skipping notification.`);
      return;
    }

    // Standardize phone number for WhatsApp
    let standardizedPhone = order.customerPhone.replace(/[^0-9]/g, '');
    if (standardizedPhone.startsWith('08')) {
      standardizedPhone = '62' + standardizedPhone.substring(1);
    } else if (standardizedPhone.startsWith('8')) {
      standardizedPhone = '62' + standardizedPhone;
    }

    // Custom message format
    let message = '';
    if (order.source === 'SPMB') {
      message = `Halo *${order.customerName}*!\n\nPesanan SPMB Anda *${order.id}* sudah siap (READY) dan sedang dalam proses pengantaran ke kelas/lokasi Anda: *${order.address}*.\n\nJika sudah sampai, mohon klik tombol *Pesanan Diterima* di halaman pelacakan pesanan Anda ya! 🍵`;
    } else {
      const typeLabel = order.orderType === 'DELIVERY' ? 'diantar' : 'diambil';
      message = `Halo *${order.customerName}*!\n\nPesanan Anda *#${order.id.slice(-6).toUpperCase()}* sudah siap (READY) dan siap untuk ${typeLabel}.\n\nTerima kasih telah memesan di Matchaboy! 🍵`;
    }

    await sendWhatsAppMessage(standardizedPhone, message);
  } catch (error) {
    console.error(`[WHATSAPP_SERVICE] Gagal mengirim ready notification untuk order ${orderId}:`, error);
  }
}

export async function sendCompletedNotification(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      console.warn(`[WHATSAPP_SERVICE] Order ${orderId} tidak ditemukan untuk notifikasi.`);
      return;
    }

    if (!order.customerPhone || order.customerPhone === 'SPMB-PENDING') {
      console.log(`[WHATSAPP_SERVICE] Phone number is empty or pending for order ${orderId}. Skipping notification.`);
      return;
    }

    // Standardize phone number for WhatsApp
    let standardizedPhone = order.customerPhone.replace(/[^0-9]/g, '');
    if (standardizedPhone.startsWith('08')) {
      standardizedPhone = '62' + standardizedPhone.substring(1);
    } else if (standardizedPhone.startsWith('8')) {
      standardizedPhone = '62' + standardizedPhone;
    }

    // Custom message format
    let message = '';
    if (order.source === 'SPMB') {
      message = `Halo *${order.customerName}*!\n\nPesanan SPMB Anda *${order.id}* telah selesai dan sudah diterima. Terima kasih telah memesan di Matchaboy! 🍵`;
    } else {
      message = `Halo *${order.customerName}*!\n\nPesanan Anda *#${order.id.slice(-6).toUpperCase()}* telah selesai. Terima kasih telah memesan di Matchaboy! 🍵`;
    }

    await sendWhatsAppMessage(standardizedPhone, message);
  } catch (error) {
    console.error(`[WHATSAPP_SERVICE] Gagal mengirim completed notification untuk order ${orderId}:`, error);
  }
}

export async function sendCancelledNotification(orderId: string, reason?: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      console.warn(`[WHATSAPP_SERVICE] Order ${orderId} tidak ditemukan untuk notifikasi.`);
      return;
    }

    if (!order.customerPhone || order.customerPhone === 'SPMB-PENDING') {
      console.log(`[WHATSAPP_SERVICE] Phone number is empty or pending for order ${orderId}. Skipping notification.`);
      return;
    }

    // Standardize phone number for WhatsApp
    let standardizedPhone = order.customerPhone.replace(/[^0-9]/g, '');
    if (standardizedPhone.startsWith('08')) {
      standardizedPhone = '62' + standardizedPhone.substring(1);
    } else if (standardizedPhone.startsWith('8')) {
      standardizedPhone = '62' + standardizedPhone;
    }

    // Custom message format
    let message = '';
    const reasonText = reason ? `\nAlasan: *${reason}*` : '';
    if (order.source === 'SPMB') {
      message = `Halo *${order.customerName}*!\n\nPesanan SPMB Anda *${order.id}* telah ditolak/dibatalkan oleh Admin.${reasonText}\n\nSilakan hubungi admin jika ada pertanyaan. Terima kasih! 🍵`;
    } else {
      message = `Halo *${order.customerName}*!\n\nPesanan Anda *#${order.id.slice(-6).toUpperCase()}* telah ditolak/dibatalkan oleh Admin.${reasonText}\n\nSilakan hubungi admin jika ada pertanyaan. Terima kasih! 🍵`;
    }

    await sendWhatsAppMessage(standardizedPhone, message);
  } catch (error) {
    console.error(`[WHATSAPP_SERVICE] Gagal mengirim cancelled notification untuk order ${orderId}:`, error);
  }
}

