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

export async function sendAdminOrderSummary() {
  try {
    const storeSettings = await prisma.storeSettings.findFirst();
    if (!storeSettings || !storeSettings.adminWaNumbers) {
      console.log('[WHATSAPP_SERVICE] No admin numbers configured for summary notification.');
      return;
    }

    const rawNumbers = storeSettings.adminWaNumbers;
    const adminNumbers = rawNumbers
      .split(',')
      .map(n => n.trim())
      .filter(n => n.length > 0)
      .map(n => {
        let std = n.replace(/[^0-9]/g, '');
        if (std.startsWith('08')) {
          std = '62' + std.substring(1);
        } else if (std.startsWith('8')) {
          std = '62' + std;
        }
        return std;
      });

    if (adminNumbers.length === 0) {
      console.log('[WHATSAPP_SERVICE] No valid admin numbers found after parsing.');
      return;
    }

    // Get today and tomorrow local dates in Jakarta timezone (WIB)
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' });
    const todayStr = formatter.format(now); // YYYY-MM-DD
    const tomorrowStr = formatter.format(new Date(now.getTime() + 24 * 60 * 60 * 1000)); // YYYY-MM-DD

    const todayStart = new Date(todayStr);
    const tomorrowEnd = new Date(tomorrowStr);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const orders = await prisma.order.findMany({
      where: {
        source: 'SPMB',
        status: { not: 'CANCELLED' },
        pickupDate: {
          gte: todayStart,
          lte: tomorrowEnd
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: [
        { pickupDate: 'asc' },
        { pickupTime: 'asc' }
      ]
    });

    if (orders.length === 0) {
      console.log('[WHATSAPP_SERVICE] No active SPMB orders found for today/tomorrow.');
      return;
    }

    // Helper to format date in Indonesian format
    const formatIndonesianDate = (date: Date): string => {
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const fullMonths = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      
      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Jakarta',
          year: 'numeric',
          month: 'numeric',
          day: 'numeric'
        });
        const parts = formatter.formatToParts(date);
        const year = parts.find(p => p.type === 'year')?.value;
        const month = parts.find(p => p.type === 'month')?.value;
        const day = parts.find(p => p.type === 'day')?.value;
        
        const d = new Date(Number(year), Number(month) - 1, Number(day));
        return `${days[d.getDay()]} ${day} ${fullMonths[d.getMonth()]} ${year}`;
      } catch {
        return `${days[date.getDay()]} ${date.getDate()} ${fullMonths[date.getMonth()]} ${date.getFullYear()}`;
      }
    };

    let message = `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n`;
    message += `┃     *DAFTAR PESANAN SPMB*  ┃\n`;
    message += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n`;

    // Group by date
    const ordersByDate: { [dateStr: string]: typeof orders } = {};
    for (const order of orders) {
      const dateStr = formatIndonesianDate(order.pickupDate || order.createdAt);
      if (!ordersByDate[dateStr]) {
        ordersByDate[dateStr] = [];
      }
      ordersByDate[dateStr].push(order);
    }

    for (const [dateStr, dateOrders] of Object.entries(ordersByDate)) {
      message += `*📅 ${dateStr}*\n`;
      message += `┌────────────────────────────\n`;

      // Group by time slot
      const ordersByTime: { [timeStr: string]: typeof orders } = {};
      for (const order of dateOrders) {
        const timeStr = order.pickupTime || '00:00';
        if (!ordersByTime[timeStr]) {
          ordersByTime[timeStr] = [];
        }
        ordersByTime[timeStr].push(order);
      }

      let dateTotal = 0;

      for (const [timeStr, timeOrders] of Object.entries(ordersByTime)) {
        const formattedTime = timeStr.replace(':', '.');
        message += `│  *( ${formattedTime} )*\n`;

        timeOrders.forEach((order, index) => {
          const num = index + 1;
          const itemsStr = order.items.map(item => `${item.product.name} ${item.qty}x`).join(', ');
          
          let payMethodStr = '';
          if (order.paymentMethod === 'QRIS') {
            const isPaid = order.status !== 'PENDING_PAYMENT';
            payMethodStr = `[ Qris ] ${isPaid ? '✅ Lunas' : '❌ belum lunas'}`;
          } else if (order.paymentMethod === 'COD') {
            payMethodStr = `[ COD ]`;
          } else {
            payMethodStr = `[ ${order.paymentMethod} ]`;
          }

          const formattedTotal = order.total.toLocaleString('id-ID');

          message += `│  ${num}. *${order.customerName}* - ${itemsStr}\n`;
          message += `│     ${payMethodStr} (${order.id}) ++ ${formattedTotal}\n`;
          dateTotal += order.total;
        });
        message += `│\n`;
      }
      
      // Remove trailing empty line for neat formatting
      message = message.replace(/│\n$/, '');
      message += `└────────────────────────────\n`;
      message += `💰 *Total:* Rp ${dateTotal.toLocaleString('id-ID')}\n\n`;
    }

    message = message.trim();

    // Send to all admin numbers
    for (const adminPhone of adminNumbers) {
      await sendWhatsAppMessage(adminPhone, message);
    }
  } catch (error) {
    console.error('[WHATSAPP_SERVICE] Gagal mengirim summary ke admin:', error);
  }
}


