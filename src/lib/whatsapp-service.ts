import { prisma } from './prisma';
import { parseItemModifiers, getReceiptModifierLines } from './receipt-modifiers';

/**
 * Menstandarisasi nomor telepon lokal Indonesia atau JID WhatsApp ke format internasional resmi (62...).
 * Mendukung format grup (`@g.us`), awalan '08', atau awalan '8'.
 *
 * @param {string} phone - Nomor telepon atau WhatsApp JID mentah
 * @returns {string} Nomor telepon terstandarisasi dengan kode negara 62 atau JID grup
 *
 * @example
 * ```typescript
 * standardizeJid('08123456789'); // '628123456789'
 * standardizeJid('12036302@g.us'); // '12036302@g.us'
 * ```
 */
export function standardizeJid(phone: string): string {
  if (phone.endsWith('@g.us')) {
    return phone;
  }
  let standardized = phone.replace(/[^0-9]/g, '');
  if (standardized.startsWith('08')) {
    standardized = '62' + standardized.substring(1);
  } else if (standardized.startsWith('8')) {
    standardized = '62' + standardized;
  }
  return standardized;
}

/**
 * Mengirim pesan teks atau media via WhatsApp Gateway secara asinkron (*fire-and-forget*).
 *
 * Sesuai aturan **AGENTS.md Bagian 4**:
 * Seluruh pemanggilan fetch ke provider WhatsApp WAJIB menyertakan `signal: AbortSignal.timeout(2500)`
 * agar proses server tidak menggantung jika bot/gateway offline.
 *
 * @param {string} phone - Nomor tujuan atau WhatsApp group JID
 * @param {string} text - Konten pesan WhatsApp
 * @param {string} [imageUrl] - URL gambar opsional untuk dikirimkan
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * await sendWhatsAppMessage('628123456789', 'Halo dari Arum Seduh!');
 * ```
 */
export async function sendWhatsAppMessage(phone: string, text: string, imageUrl?: string): Promise<void> {
  const cleanDigits = phone.replace(/[^0-9]/g, '');
  if (!phone || phone.trim() === '' || (!phone.endsWith('@g.us') && cleanDigits.length < 7)) {
    console.log(`[WHATSAPP_SERVICE] Nomor telepon "${phone}" tidak valid atau terlalu pendek. Skip kirim WA.`);
    return;
  }

  const waProviderUrl = process.env.WA_PROVIDER_URL || "http://localhost:3001/send";
  const apiKey = process.env.WA_BOT_API_KEY || "";
  
  console.log(`[WHATSAPP_SERVICE] Mengirim ke ${phone}: ${text.substring(0, 80)}`);
  
  try {
    const isGroup = phone.endsWith('@g.us');
    const res = await fetch(waProviderUrl, {
      method: "POST",
      signal: AbortSignal.timeout(2500),
      headers: { 
        "Content-Type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify({ 
        phone: isGroup ? undefined : phone, 
        message: text,
        jid: isGroup ? phone : undefined,
        image: imageUrl
      }),
    });
    if (!res.ok) {
      console.error(`[WHATSAPP_SERVICE] Bot API error ${res.status}:`, await res.text());
    }
  } catch (error) {
    console.error("[WHATSAPP_SERVICE] Gagal memanggil API Provider WA:", error);
  }
}

/**
 * Mengirim notifikasi bahwa pesanan telah siap (status READY) kepada pelanggan.
 *
 * @param {string} orderId - ID pesanan unik
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * await sendReadyNotification(order.id);
 * ```
 */
export async function sendReadyNotification(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      console.warn(`[WHATSAPP_SERVICE] Order ${orderId} tidak ditemukan untuk notifikasi.`);
      return;
    }

    if (!order.customerPhone || order.customerPhone.startsWith('SPMB-PENDING')) {
      console.log(`[WHATSAPP_SERVICE] Phone number is empty or pending for order ${orderId}. Skipping notification.`);
      return;
    }

    // Standardize phone number for WhatsApp
    const standardizedPhone = standardizeJid(order.customerPhone);

    // Custom message format
    let message = '';
    if (order.source === 'SPMB') {
      message = `Halo *${order.customerName}*!\n\nPesanan SPMB Anda *${order.id}* sudah siap (READY) dan sedang dalam proses pengantaran ke kelas/lokasi Anda: *${order.address}*.\n\nJika sudah sampai, mohon klik tombol *Pesanan Diterima* di halaman pelacakan pesanan Anda ya! 🍵`;
    } else {
      const typeLabel = order.orderType === 'DELIVERY' ? 'diantar' : 'diambil';
      message = `Halo *${order.customerName}*!\n\nPesanan Anda *#${order.id.slice(-6).toUpperCase()}* sudah siap (READY) dan siap untuk ${typeLabel}.\n\nTerima kasih telah memesan di Arum Seduh! 🍵`;
    }

    await sendWhatsAppMessage(standardizedPhone, message);
  } catch (error) {
    console.error(`[WHATSAPP_SERVICE] Gagal mengirim ready notification untuk order ${orderId}:`, error);
  }
}

/**
 * Mengirim notifikasi bahwa pesanan telah selesai (status COMPLETED) kepada pelanggan
 * beserta ajakan promo/referral di web resmi Arum Seduh.
 *
 * @param {string} orderId - ID pesanan unik yang selesai
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * await sendCompletedNotification(order.id);
 * ```
 */
export async function sendCompletedNotification(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      console.warn(`[WHATSAPP_SERVICE] Order ${orderId} tidak ditemukan untuk notifikasi.`);
      return;
    }

    if (!order.customerPhone || order.customerPhone.startsWith('SPMB-PENDING')) {
      console.log(`[WHATSAPP_SERVICE] Phone number is empty or pending for order ${orderId}. Skipping notification.`);
      return;
    }

    const standardizedPhone = standardizeJid(order.customerPhone);

    let message = '';
    const isCod = order.paymentMethod === 'COD';
    const lunasSuffix = isCod ? ' (Lunas)' : '';
    if (order.source === 'SPMB') {
      message = `Halo *${order.customerName}*!\n\nPesanan SPMB Anda *${order.id}* telah selesai dan sudah diterima${lunasSuffix}. Terima kasih telah memesan di Arum Seduh! 🍵`;
    } else {
      message = `Halo *${order.customerName}*!\n\nPesanan Anda *#${order.id.slice(-6).toUpperCase()}* telah selesai${lunasSuffix}. Terima kasih telah memesan di Arum Seduh! 🍵`;
    }

    message += `\n\n💡 *Promo Menarik & Referral:*\nGunakan web resmi kami di https://arumseduh.vercel.app untuk pemesanan berikutnya. Dengan login menggunakan web, dapatkan banyak promo menarik serta referral dan berbagai keuntungan lainnya! ✨`;

    await sendWhatsAppMessage(standardizedPhone, message);
  } catch (error) {
    console.error(`[WHATSAPP_SERVICE] Gagal mengirim completed notification untuk order ${orderId}:`, error);
  }
}

/**
 * Mengirim notifikasi pembatalan pesanan (status CANCELLED) kepada pelanggan
 * beserta alasan pembatalan jika ada.
 *
 * @param {string} orderId - ID pesanan unik yang dibatalkan
 * @param {string} [reason] - Alasan pembatalan pesanan
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * await sendCancelledNotification(order.id, 'Stok bahan habis');
 * ```
 */
export async function sendCancelledNotification(orderId: string, reason?: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      console.warn(`[WHATSAPP_SERVICE] Order ${orderId} tidak ditemukan untuk notifikasi.`);
      return;
    }

    if (!order.customerPhone || order.customerPhone.startsWith('SPMB-PENDING')) {
      console.log(`[WHATSAPP_SERVICE] Phone number is empty or pending for order ${orderId}. Skipping notification.`);
      return;
    }

    const standardizedPhone = standardizeJid(order.customerPhone);

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

/**
 * Mengirimkan rangkuman rekap pesanan SPMB hari ini dan besok kepada seluruh nomor WhatsApp Admin Arum Seduh.
 *
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * await sendAdminOrderSummary();
 * ```
 */
export async function sendAdminOrderSummary(): Promise<void> {
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
      .map(n => standardizeJid(n));

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
            const isPaid = order.status === 'COMPLETED' || order.status === 'DELIVERED';
            payMethodStr = `[ COD ] ${isPaid ? '✅ Lunas' : '⏳ bayar di tempat'}`;
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

/**
 * Mengirim pesan pengingat pengambilan (*pickup reminder*) kepada pelanggan
 * untuk pesanan Takeaway/Pickup yang sudah siap namun belum diambil di outlet.
 *
 * @param {string} orderId - ID pesanan unik yang siap diambil
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * await sendPickupReminder(order.id);
 * ```
 */
export async function sendPickupReminder(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      console.warn(`[WHATSAPP_SERVICE] Order ${orderId} tidak ditemukan untuk notifikasi pickup reminder.`);
      return;
    }

    if (!order.customerPhone || order.customerPhone.startsWith('SPMB-PENDING')) {
      console.log(`[WHATSAPP_SERVICE] Phone number is empty or pending for order ${orderId}. Skipping pickup reminder.`);
      return;
    }

    const standardizedPhone = standardizeJid(order.customerPhone);

    const formatDateOnly = (date: Date | null) => {
      if (!date) return '';
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
        return `${days[d.getDay()]}, ${day} ${fullMonths[d.getMonth()]} ${year}`;
      } catch {
        return date.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });
      }
    };

    const pickupDateStr = formatDateOnly(order.pickupDate);
    const pickupTimeStr = order.pickupTime || '';
    let waktuPengambilan = '';
    if (pickupDateStr || pickupTimeStr) {
      waktuPengambilan = `\n📅 *Waktu Pengambilan:* ${pickupDateStr}${pickupTimeStr ? ' pukul ' + pickupTimeStr + ' WIB' : ''}`;
    }

    const message = `Halo *${order.customerName}*!\n\nPesanan Anda *#${orderId.slice(-6).toUpperCase()}* sudah READY dan belum diambil di outlet.${waktuPengambilan}\n\nMohon segera diambil ya! Terima kasih! 🍵`;

    await sendWhatsAppMessage(standardizedPhone, message);
  } catch (error) {
    console.error(`[WHATSAPP_SERVICE] Gagal mengirim pickup reminder untuk order ${orderId}:`, error);
  }
}

/**
 * Mengirimkan pesan pemberitahuan pesanan baru masuk ke nomor WhatsApp Admin secara asinkron.
 *
 * @param {string} orderId - ID pesanan unik yang baru dibuat
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * await sendAdminNewOrderNotification(order.id);
 * ```
 */
export async function sendAdminNewOrderNotification(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        cashier: {
          select: {
            name: true
          }
        },
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      console.warn(`[WHATSAPP_SERVICE] Order ${orderId} tidak ditemukan untuk notifikasi admin.`);
      return;
    }

    const storeSettings = await prisma.storeSettings.findFirst();
    if (!storeSettings || !storeSettings.adminWaNumbers) {
      console.log('[WHATSAPP_SERVICE] No admin numbers configured for new order notification.');
      return;
    }

    const rawNumbers = storeSettings.adminWaNumbers;
    const adminNumbers = rawNumbers
      .split(',')
      .map(n => n.trim())
      .filter(n => n.length > 0)
      .map(n => standardizeJid(n));

    if (adminNumbers.length === 0) {
      console.log('[WHATSAPP_SERVICE] No valid admin numbers found after parsing.');
      return;
    }

    const itemsStr = order.items.map(item => {
      const parsed = parseItemModifiers({
        name: item.product?.name || 'Item',
        price: item.price,
        modifiersString: item.modifiers || undefined,
      });
      const modLines = getReceiptModifierLines(parsed, true);
      const modStr = modLines.length > 0 ? '\n' + modLines.map((l) => `    » ${l.label}: ${l.value}`).join('\n') : '';
      return `- ${item.product.name} ${item.qty}x @ Rp ${item.price.toLocaleString('id-ID')}${modStr}`;
    }).join('\n');

    const formattedSubtotal = order.subtotal.toLocaleString('id-ID');
    const formattedDeliveryFee = order.deliveryFee.toLocaleString('id-ID');
    const formattedTotal = order.total.toLocaleString('id-ID');

    let orderDetails = `*📢 PESANAN BARU MASUK!* 🍵\n\n`;
    orderDetails += `*ID Pesanan:* ${order.id}\n`;
    orderDetails += `*Sumber:* ${order.source}\n`;
    if (order.cashier?.name) {
      orderDetails += `*Kasir:* ${order.cashier.name}\n`;
    }
    orderDetails += `*Pelanggan:* ${order.customerName} (${order.customerPhone})\n`;
    
    if (order.orderType === 'DELIVERY') {
      orderDetails += `*Tipe:* Pengiriman (Delivery)\n`;
      orderDetails += `*Alamat:* ${order.address}\n`;
    } else if (order.orderType === 'PICKUP') {
      orderDetails += `*Tipe:* Ambil Sendiri (Pickup)\n`;
      if (order.pickupDate || order.pickupTime) {
        const dateStr = order.pickupDate ? new Date(order.pickupDate).toLocaleDateString('id-ID') : '';
        orderDetails += `*Waktu Pickup:* ${dateStr} ${order.pickupTime || ''}\n`;
      }
    } else if (order.orderType === 'DINE_IN') {
      orderDetails += `*Tipe:* Dine In (Makan di Tempat)\n`;
      if (order.tableNumber) {
        orderDetails += `*Nomor Meja:* ${order.tableNumber}\n`;
      }
    }

    orderDetails += `\n*Daftar Produk:*\n${itemsStr}\n\n`;
    orderDetails += `*Ringkasan Pembayaran:*\n`;
    orderDetails += `Subtotal: Rp ${formattedSubtotal}\n`;
    const discountAmount = Math.max(0, order.subtotal + order.deliveryFee - order.total);
    if (discountAmount > 0) {
      orderDetails += `Diskon / Promo${order.voucherCode ? ` (${order.voucherCode})` : ''}: -Rp ${discountAmount.toLocaleString('id-ID')}\n`;
    }
    if (order.orderType === 'DELIVERY') {
      orderDetails += `Ongkir: Rp ${formattedDeliveryFee}\n`;
    }
    orderDetails += `*Total: Rp ${formattedTotal}*\n`;
    orderDetails += `*Metode Pembayaran:* ${order.paymentMethod}\n`;
    orderDetails += `*Status:* ${order.status}\n`;

    // Send to all admin numbers concurrently
    await Promise.allSettled(adminNumbers.map((adminPhone) => sendWhatsAppMessage(adminPhone, orderDetails)));
  } catch (error) {
    console.error(`[WHATSAPP_SERVICE] Gagal mengirim new order notification untuk order ${orderId}:`, error);
  }
}

/**
 * Mengirim pesan konfirmasi pembayaran sukses kepada pelanggan beserta tautan pelacakan pesanan.
 *
 * @param {string} orderId - ID pesanan unik yang telah lunas
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * await sendPaymentSuccessNotification(order.id);
 * ```
 */
export async function sendPaymentSuccessNotification(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      console.warn(`[WHATSAPP_SERVICE] Order ${orderId} tidak ditemukan untuk notifikasi pembayaran sukses.`);
      return;
    }

    if (!order.customerPhone || order.customerPhone.startsWith('SPMB-PENDING')) {
      console.log(`[WHATSAPP_SERVICE] Phone number is empty or pending for order ${orderId}. Skipping payment success notification.`);
      return;
    }

    const standardizedPhone = standardizeJid(order.customerPhone);
    const formattedTotal = order.total.toLocaleString('id-ID');
    const orderShortId = order.id.slice(-6).toUpperCase();
    const trackingUrl = `https://arumseduh.vercel.app/orders/${orderId}`;

    let message = `Halo *${order.customerName}*!\n\nPembayaran untuk pesanan *#${orderShortId}* sebesar *Rp ${formattedTotal}* telah BERHASIL diverifikasi dan diterima. ✅\n\n`;
    if (order.orderType === 'DELIVERY') {
      message += `Pesanan Anda sedang dipersiapkan dan akan segera dikirim ke alamat Anda. Silakan pantau status pesanan Anda secara realtime di sini:\n📍 ${trackingUrl}\n\nTerima kasih! 🍵`;
    } else if (order.orderType === 'PICKUP') {
      message += `Pesanan Anda sedang dipersiapkan. Kami akan mengabari Anda jika pesanan sudah siap untuk diambil. Anda juga dapat memantau status pesanan Anda di sini:\n📍 ${trackingUrl}\n\nTerima kasih! 🍵`;
    } else {
      message += `Pesanan Anda sedang dipersiapkan. Anda dapat memantau status pesanan Anda di sini:\n📍 ${trackingUrl}\n\nTerima kasih telah memesan di Arum Seduh! 🍵`;
    }

    await sendWhatsAppMessage(standardizedPhone, message);
  } catch (error) {
    console.error(`[WHATSAPP_SERVICE] Gagal mengirim payment success notification untuk order ${orderId}:`, error);
  }
}

/**
 * Mengirim notifikasi bahwa pesanan sedang diantar oleh kurir (status ON_DELIVERY)
 * beserta informasi nama kurir, kendaraan, pelat nomor, tautan GPS, dan 4-digit PIN verifikasi serah terima.
 *
 * @param {string} orderId - ID pesanan unik yang sedang dikirim
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * await sendOnDeliveryNotification(order.id);
 * ```
 */
export async function sendOnDeliveryNotification(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        driver: {
          include: {
            driverProfile: true
          }
        }
      }
    });

    if (!order) {
      console.warn(`[WHATSAPP_SERVICE] Order ${orderId} tidak ditemukan untuk notifikasi ON_DELIVERY.`);
      return;
    }

    if (!order.customerPhone || order.customerPhone.startsWith('SPMB-PENDING')) {
      console.log(`[WHATSAPP_SERVICE] Phone number is empty or pending for order ${orderId}. Skipping notification.`);
      return;
    }

    const standardizedPhone = standardizeJid(order.customerPhone);
    const orderShortId = order.id.slice(-6).toUpperCase();
    
    // Calculate verification PIN deterministically
    const { getDeliveryPin } = await import('./delivery-utils');
    const pin = getDeliveryPin(orderId);

    // Build driver info text if driver is assigned
    let driverInfoText = '';
    if (order.driver) {
      const dp = order.driver.driverProfile;
      driverInfoText = `\n\n👤 *Informasi Kurir:*\nNama: *${order.driver.name}*`;
      if (order.driver.phone) {
        driverInfoText += `\nNo. WA/Telp: *${order.driver.phone}*`;
      }
      if (dp) {
        driverInfoText += `\nKendaraan: *${dp.vehicleType || 'Motor'}*`;
        if (dp.plateNumber) {
          driverInfoText += ` (${dp.plateNumber})`;
        }
      }
    }

    const trackingUrl = `https://arumseduh.vercel.app/orders/${orderId}`;
    const message = `🛵 *PESANAN SEDANG DIANTAR!* 🛵\n\nHalo *${order.customerName}*,\n\nPesanan Anda *#${orderShortId}* sedang diantarkan oleh kurir kami ke alamat Anda: *${order.address?.split('(')[0]?.trim() || order.address}*.${driverInfoText}\n\n📍 *Lacak Lokasi Kurir:* ${trackingUrl}\n\n🔑 *PIN Verifikasi Kurir:* *${pin}*\n\nMohon berikan PIN verifikasi di atas kepada kurir saat pesanan Anda tiba agar kurir dapat menyelesaikan pengiriman. Terima kasih! 🍵`;

    await sendWhatsAppMessage(standardizedPhone, message);
  } catch (error) {
    console.error(`[WHATSAPP_SERVICE] Gagal mengirim on-delivery notification untuk order ${orderId}:`, error);
  }
}

/**
 * Mengirimkan tiket notifikasi pesanan dapur ke nomor atau grup WhatsApp Kitchen / Barista Arum Seduh.
 *
 * @param {string} orderId - ID pesanan unik yang masuk proses persiapan
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * await sendKitchenNotification(order.id);
 * ```
 */
export async function sendKitchenNotification(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      console.warn(`[WHATSAPP_SERVICE] Order ${orderId} tidak ditemukan untuk notifikasi dapur.`);
      return;
    }

    const storeSettings = await prisma.storeSettings.findFirst();
    const envKitchenTarget = process.env.KITCHEN_WA_NUMBER || process.env.KITCHEN_WA_JID;

    let targetList: string[] = [];
    if (envKitchenTarget) {
      targetList.push(envKitchenTarget.endsWith('@g.us') ? envKitchenTarget : standardizeJid(envKitchenTarget));
    } else if (storeSettings?.adminWaNumbers) {
      targetList = storeSettings.adminWaNumbers
        .split(',')
        .map(n => n.trim())
        .filter(n => n.length > 0)
        .map(n => (n.endsWith('@g.us') ? n : standardizeJid(n)));
    } else if (storeSettings?.whatsappNumber) {
      targetList.push(standardizeJid(storeSettings.whatsappNumber));
    }

    if (targetList.length === 0) {
      console.log('[WHATSAPP_SERVICE] Tidak ada nomor/grup WA dapur yang dikonfigurasi. Skipping kitchen alert.');
      return;
    }

    const tableInfo = order.tableNumber
      ? `*MEJA ${order.tableNumber}*`
      : (order.source === 'SPMB' ? `*SPMB (${order.address || 'Gedung Sekolah'})*` : `*-*`);

    const itemsStr = order.items.map(item => {
      const parsed = parseItemModifiers({
        name: item.product?.name || 'Item',
        price: item.price,
        modifiersString: item.modifiers || undefined,
      });
      const modLines = getReceiptModifierLines(parsed, false);
      const modStr = modLines.length > 0 ? '\n' + modLines.map((l) => `     » ${l.label}: ${l.value}`).join('\n') : '';
      return `• *${item.qty}x ${item.product.name}*${modStr}`;
    }).join('\n');

    let orderTypeLabel = order.orderType;
    if (order.source === 'SPMB') orderTypeLabel = 'SPMB (Antar Kelas)';
    else if (order.orderType === 'DINE_IN') orderTypeLabel = 'DINE IN (Makan di Tempat)';
    else if (order.orderType === 'PICKUP') orderTypeLabel = 'PICKUP (Takeaway)';
    else if (order.orderType === 'DELIVERY') orderTypeLabel = 'DELIVERY (Pengiriman)';

    const queueStr = order.queueNumber || order.id.slice(-6).toUpperCase();
    const timeStr = new Date(order.createdAt).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });

    let message = `🍳 *NOTIFIKASI PESANAN DAPUR BARU!* 🚨\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📌 *LOKASI / MEJA:* ${tableInfo}\n`;
    message += `🆔 *No. Antrean:* #${queueStr} (${order.id})\n`;
    message += `📋 *Tipe Pesanan:* ${orderTypeLabel}\n`;
    message += `👤 *Pelanggan:* ${order.customerName} (${order.customerPhone})\n`;
    if (order.notes) {
      message += `📝 *Catatan Khusus:* ${order.notes}\n`;
    }
    message += `\n🛒 *RINCIAN MENU PESANAN:*\n${itemsStr}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `⏰ *Waktu Pesanan:* ${timeStr} WIB\n`;
    message += `💳 *Pembayaran:* ${order.paymentMethod} (Status: ${order.status})`;

    // Send to all kitchen targets concurrently
    await Promise.allSettled(targetList.map((target) => sendWhatsAppMessage(target, message)));
  } catch (error) {
    console.error(`[WHATSAPP_SERVICE] Gagal mengirim kitchen notification untuk order ${orderId}:`, error);
  }
}





