const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateWebhook(phone, text) {
  // Same logic as in route.ts
  const lowerText = text.toLowerCase();
  const isCekSpmbRequest = lowerText.startsWith("cek spmb-");
  
  if (isCekSpmbRequest) {
    const orderId = text.replace(/^cek\s+/i, '').trim().toUpperCase();
    
    // Check admin authorization
    let isAdmin = false;
    const storeSettings = await prisma.storeSettings.findFirst();
    if (storeSettings && storeSettings.adminWaNumbers) {
      const adminNumbers = storeSettings.adminWaNumbers
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
        
      let standardizedSenderPhone = phone.replace(/[^0-9]/g, '');
      if (standardizedSenderPhone.startsWith('08')) {
        standardizedSenderPhone = '62' + standardizedSenderPhone.substring(1);
      } else if (standardizedSenderPhone.startsWith('8')) {
        standardizedSenderPhone = '62' + standardizedSenderPhone;
      }
      
      isAdmin = adminNumbers.includes(standardizedSenderPhone);
      console.log(`[AUTH] Sender: ${standardizedSenderPhone}, Admins: ${adminNumbers.join(', ')}, IsAdmin: ${isAdmin}`);
    }

    if (!isAdmin) {
      return { success: false, error: "Unauthorized admin", replyMessage: `Maaf, nomor WhatsApp Anda (*${phone}*) tidak terdaftar sebagai Admin untuk melihat detail pesanan. ❌` };
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } }
    });

    if (!order) {
      return { success: false, error: "Order not found", replyMessage: `Maaf, pesanan dengan ID *${orderId}* tidak ditemukan. ❌` };
    }

    let custPhone = order.customerPhone.replace(/[^0-9]/g, '');
    if (custPhone.startsWith('08')) {
      custPhone = '62' + custPhone.substring(1);
    } else if (custPhone.startsWith('8')) {
      custPhone = '62' + custPhone;
    }
    const waLink = `wa.me/${custPhone}`;

    const itemsDetail = order.items.map(item => {
      let details = `${item.qty}x ${item.product.name}`;
      if (item.modifiers) {
        try {
          const parsed = JSON.parse(item.modifiers);
          if (typeof parsed === 'object') {
            const modStrings = [];
            if (parsed.iceLevel) modStrings.push(`Ice: ${parsed.iceLevel}`);
            if (parsed.sugarLevel) modStrings.push(`Sugar: ${parsed.sugarLevel}`);
            if (parsed.addOns && Array.isArray(parsed.addOns)) {
              const addons = parsed.addOns.map(a => a.name).join(', ');
              if (addons) modStrings.push(`Add-ons: ${addons}`);
            }
            if (modStrings.length > 0) {
              details += ` (${modStrings.join(', ')})`;
            }
          }
        } catch {
          if (item.modifiers.trim()) {
            details += ` (${item.modifiers})`;
          }
        }
      }
      return `- ${details}`;
    }).join('\n');

    const formatIndonesianDate = (date) => {
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const fullMonths = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      
      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Jakarta',
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        const parts = formatter.formatToParts(date);
        const year = parts.find(p => p.type === 'year')?.value;
        const month = parts.find(p => p.type === 'month')?.value;
        const day = parts.find(p => p.type === 'day')?.value;
        const hour = parts.find(p => p.type === 'hour')?.value;
        const minute = parts.find(p => p.type === 'minute')?.value;
        
        const d = new Date(Number(year), Number(month) - 1, Number(day));
        return `${days[d.getDay()]}, ${day} ${fullMonths[d.getMonth()]} ${year} pukul ${hour}:${minute} WIB`;
      } catch {
        return `${date.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`;
      }
    };

    const formatDateOnly = (date) => {
      if (!date) return '-';
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
    const pickupTimeStr = order.pickupTime || '-';
    const waktuPengambilan = `${pickupDateStr} ${pickupTimeStr !== '-' ? 'pukul ' + pickupTimeStr + ' WIB' : ''}`;

    const confirmTimeStr = formatIndonesianDate(order.updatedAt);
    const formatCurrency = (n) => `Rp${n.toLocaleString('id-ID')}`;

    let paymentMethodFriendly = order.paymentMethod;
    if (order.paymentMethod === 'QRIS') paymentMethodFriendly = 'QRIS';
    else if (order.paymentMethod === 'COD') paymentMethodFriendly = 'Cash on Delivery (COD)';
    else if (order.paymentMethod === 'TRANSFER') paymentMethodFriendly = 'Transfer Bank';
    else if (order.paymentMethod === 'CASH') paymentMethodFriendly = 'Tunai (Cash)';
    else if (order.paymentMethod === 'MIDTRANS') paymentMethodFriendly = 'Midtrans';

    let statusFriendly = order.status;
    if (order.status === 'PENDING_PAYMENT') statusFriendly = 'Menunggu Pembayaran ⏳';
    else if (order.status === 'PENDING') statusFriendly = 'Menunggu Konfirmasi/Verifikasi ⏳';
    else if (order.status === 'PREPARING') statusFriendly = 'Sedang Disiapkan 🍵';
    else if (order.status === 'READY') statusFriendly = 'Siap Diambil/Diantar ✅';
    else if (order.status === 'COMPLETED') statusFriendly = 'Selesai 🎉';
    else if (order.status === 'CANCELLED') statusFriendly = 'Dibatalkan ❌';

    let reply = `🍵 *DETAIL PENGGUNA & PESANAN SPMB*\n`;
    reply += `━━━━━━━━━━━━━━━━━━━\n\n`;
    reply += `🆔 *ID Pesanan:* ${order.id}\n`;
    reply += `👤 *Nama:* ${order.customerName}\n`;
    reply += `📞 *Nomor HP:* ${waLink}\n`;
    reply += `📍 *Tempat:* ${order.address || '-'}\n\n`;
    reply += `🛍️ *Pesanan:*\n${itemsDetail}\n\n`;
    reply += `💵 *Total Belanja:* ${formatCurrency(order.total)}\n`;
    reply += `💳 *Metode Pembayaran:* ${paymentMethodFriendly}\n`;
    reply += `🚦 *Status Pesanan:* ${statusFriendly}\n\n`;
    reply += `📅 *Konfirmasi Terakhir:* ${confirmTimeStr}\n`;
    reply += `⏰ *Waktu Pengambilan:* ${waktuPengambilan}\n`;

    let hasQrisProof = order.paymentMethod === 'QRIS' && order.paymentProofUrl;
    
    if (order.paymentMethod === 'QRIS') {
      reply += `🖼️ *Bukti Pembayaran:* ${order.paymentProofUrl ? 'Terlampir' : 'Belum diunggah ❌'}\n`;
    }
    
    reply += `━━━━━━━━━━━━━━━━━━━`;

    return {
      success: true,
      replyMessage: reply,
      image: hasQrisProof ? order.paymentProofUrl : undefined
    };
  }
}

async function runTests() {
  console.log("=== TEST 1: Unauthorized Number ===");
  const res1 = await simulateWebhook("628111111111", "CEK SPMB-2H73H");
  console.log(res1);

  console.log("\n=== TEST 2: Authorized Admin Number, Valid Order ===");
  const res2 = await simulateWebhook("6281344446442", "CEK SPMB-2H73H");
  console.log(res2);

  console.log("\n=== TEST 3: Authorized Admin Number, Non-existent Order ===");
  const res3 = await simulateWebhook("6281344446442", "CEK SPMB-NONEXISTENT");
  console.log(res3);
}

runTests()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
