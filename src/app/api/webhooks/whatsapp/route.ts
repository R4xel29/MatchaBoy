import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// URL dasar aplikasi akan ditentukan secara dinamis dari origin request jika env tidak diatur

// Fungsi untuk mengirim pesan balasan WhatsApp
// CATATAN: Fungsi ini hanya dipakai untuk flow server-side (bukan dari bot).
// Flow dari bot menggunakan directReply:true sehingga fungsi ini tidak dipanggil.
async function sendWhatsAppMessage(phone: string, text: string, jid?: string) {
  const waProviderUrl = process.env.WA_PROVIDER_URL || "http://localhost:3001/send";
  console.log(`[WHATSAPP_BOT] Mengirim ke ${phone} (JID: ${jid || 'N/A'}): ${text.substring(0, 80)}`);
  
  try {
    const res = await fetch(waProviderUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message: text, jid }),
    });
    if (!res.ok) {
      console.error(`[WHATSAPP_BOT] Bot API error ${res.status}:`, await res.text());
    }
  } catch (error) {
    console.error("[WHATSAPP_BOT] Gagal memanggil API Provider WA:", error);
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const expectedToken = process.env.WA_BOT_API_KEY;

  if (mode && token) {
    if (mode === 'subscribe' && token === expectedToken) {
      console.log('WHATSAPP_WEBHOOK verified successfully!');
      return new Response(challenge, { status: 200 });
    } else {
      return new Response('Forbidden', { status: 403 });
    }
  }

  // Generic token check for GET testing
  const apiToken = req.headers.get("x-api-key") || searchParams.get("token");
  if (expectedToken && apiToken === expectedToken) {
    return NextResponse.json({ status: "ok" });
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const requestUrl = new URL(req.url);

    // Verify WhatsApp Webhook request authentication
    const token = req.headers.get("x-api-key") || 
                  req.headers.get("Authorization")?.replace("Bearer ", "") ||
                  requestUrl.searchParams.get("token") ||
                  body.secret;
                  
    const expectedToken = process.env.WA_BOT_API_KEY;
    if (!expectedToken || token !== expectedToken) {
      console.warn(`[WHATSAPP_WEBHOOK] Unauthorized webhook attempt.`);
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    let appUrl = process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin;
    
    // SAFETY OVERRIDE: Cegah link localhost di Vercel akibat salah setting Environment Variables
    if (appUrl.includes("localhost") && !requestUrl.origin.includes("localhost")) {
      appUrl = requestUrl.origin;
    }

    // Struktur body mungkin berbeda tergantung provider WA yang dipakai.
    // Asumsi kita menggunakan format generik: { phone: "628...", text: "LOGIN-123456" }
    // atau dari Fonnte: { sender: "628...", message: "LOGIN-123456" }
    
    const phone = body.phone || body.sender || body.from;
    const text = (body.text || body.message || body.body || "").trim();
    const jid = body.jid; // Ambil JID asli jika ada

    if (!phone || !text) {
      return NextResponse.json({ success: false, error: "Missing phone or text" }, { status: 400 });
    }

    console.log(`[WHATSAPP_WEBHOOK] Request diterima: phone=${phone}, text="${text}"`);

    const lowerText = text.toLowerCase();
    const isLoginRequest = lowerText.startsWith("login-") || 
                           lowerText.includes("request link untuk masuk / daftar");
    const isDeleteRequest = lowerText.startsWith("hapus-");
    const isVerificationRequest = lowerText.startsWith("verifikasi-");
    const isSpmbRequest = lowerText.startsWith("spmb-");
    const isCekSpmbRequest = lowerText.startsWith("cek spmb-");

    if (isCekSpmbRequest) {
      console.log(`[WHATSAPP_WEBHOOK] Mendeteksi CEK SPMB ORDER REQUEST: ${text}`);
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
      }

      if (!isAdmin) {
        console.warn(`[WHATSAPP_WEBHOOK] Percobaan akses ilegal CEK SPMB oleh nomor: ${phone}`);
        const reply = `Maaf, nomor WhatsApp Anda (*${phone}*) tidak terdaftar sebagai Admin untuk melihat detail pesanan. ❌`;
        return NextResponse.json({ success: false, error: "Unauthorized admin", replyMessage: reply });
      }

      // Fetch the order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: { include: { product: true } } }
      });

      if (!order) {
        console.warn(`[WHATSAPP_WEBHOOK] Order SPMB untuk CEK tidak ditemukan: ${orderId}`);
        const reply = `Maaf, pesanan dengan ID *${orderId}* tidak ditemukan. ❌`;
        return NextResponse.json({ success: false, error: "Order not found", replyMessage: reply });
      }

      // Standardize customer phone to a clickable link
      let custPhone = order.customerPhone.replace(/[^0-9]/g, '');
      if (custPhone.startsWith('08')) {
        custPhone = '62' + custPhone.substring(1);
      } else if (custPhone.startsWith('8')) {
        custPhone = '62' + custPhone;
      }
      const waLink = `wa.me/${custPhone}`;

      // Format items
      const itemsDetail = order.items.map(item => {
        let details = `${item.qty}x ${item.product.name}`;
        if (item.modifiers) {
          try {
            const parsed = JSON.parse(item.modifiers);
            if (typeof parsed === 'object') {
              const modStrings: string[] = [];
              if (parsed.iceLevel) modStrings.push(`Ice: ${parsed.iceLevel}`);
              if (parsed.sugarLevel) modStrings.push(`Sugar: ${parsed.sugarLevel}`);
              if (parsed.addOns && Array.isArray(parsed.addOns)) {
                const addons = parsed.addOns.map((a: any) => a.name).join(', ');
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

      // Helper to format date in Indonesian format
      const formatIndonesianDate = (date: Date): string => {
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

      // Waktu Pengambilan
      const formatDateOnly = (date: Date | null) => {
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
      const formatCurrency = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

      // Map Payment Method to readable Indonesian
      let paymentMethodFriendly = order.paymentMethod;
      if (order.paymentMethod === 'QRIS') paymentMethodFriendly = 'QRIS';
      else if (order.paymentMethod === 'COD') paymentMethodFriendly = 'Cash on Delivery (COD)';
      else if (order.paymentMethod === 'TRANSFER') paymentMethodFriendly = 'Transfer Bank';
      else if (order.paymentMethod === 'CASH') paymentMethodFriendly = 'Tunai (Cash)';
      else if (order.paymentMethod === 'MIDTRANS') paymentMethodFriendly = 'Midtrans';

      // Map Status to readable Indonesian
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
      let absolutePaymentProofUrl = order.paymentProofUrl;
      if (hasQrisProof && absolutePaymentProofUrl) {
        if (!absolutePaymentProofUrl.startsWith('http')) {
          const slash = absolutePaymentProofUrl.startsWith('/') ? '' : '/';
          absolutePaymentProofUrl = `${appUrl}${slash}${absolutePaymentProofUrl}`;
        }
      }
      
      if (order.paymentMethod === 'QRIS') {
        reply += `🖼️ *Bukti Pembayaran:* ${order.paymentProofUrl ? 'Terlampir' : 'Belum diunggah ❌'}\n`;
      }
      
      reply += `━━━━━━━━━━━━━━━━━━━`;

      return NextResponse.json({
        success: true,
        replyMessage: reply,
        image: hasQrisProof ? absolutePaymentProofUrl : undefined
      });
    }

    if (isSpmbRequest) {
      console.log(`[WHATSAPP_WEBHOOK] Mendeteksi SPMB ORDER REQUEST: ${text}`);
      const orderId = text.trim().toUpperCase(); // e.g. "SPMB-XXXXXX"
      
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: { include: { product: true } } }
      });

      if (!order) {
        console.warn(`[WHATSAPP_WEBHOOK] Order SPMB tidak ditemukan: ${orderId}`);
        const reply = `Maaf, pesanan dengan ID *${orderId}* tidak ditemukan. Silakan periksa kembali ID pesanan Anda atau lakukan pemesanan ulang.`;
        return NextResponse.json({ success: false, error: "Order not found", replyMessage: reply });
      }

      let standardizedSenderPhone = phone.replace(/[^0-9]/g, '');
      if (standardizedSenderPhone.startsWith('08')) {
        standardizedSenderPhone = '62' + standardizedSenderPhone.substring(1);
      } else if (standardizedSenderPhone.startsWith('8')) {
        standardizedSenderPhone = '62' + standardizedSenderPhone;
      }

      if (order.customerPhone.startsWith('SPMB-PENDING')) {
        await prisma.order.update({
          where: { id: order.id },
          data: { customerPhone: standardizedSenderPhone }
        });
        console.log(`[WHATSAPP_WEBHOOK] Updated SPMB order ${order.id} customerPhone to ${standardizedSenderPhone}`);
        order.customerPhone = standardizedSenderPhone;

        // Trigger admin summary notification only if COD
        if (order.paymentMethod === 'COD') {
          import('@/lib/whatsapp-service').then(({ sendAdminOrderSummary }) => {
            sendAdminOrderSummary().catch(err => console.error('Failed to send admin order summary:', err));
          });
        }
      }

      const formatCurrency = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

      if (order.paymentMethod === 'QRIS') {
        const paymentSettings = await prisma.paymentSettings.findFirst();
        const qrisImage = paymentSettings?.qrisImage;
        let absoluteQrisImage = qrisImage;
        if (qrisImage && !qrisImage.startsWith('http')) {
          const slash = qrisImage.startsWith('/') ? '' : '/';
          absoluteQrisImage = `${appUrl}${slash}${qrisImage}`;
        }

        const reply = `Halo *${order.customerName}*!\n\nBerikut adalah QRIS untuk pembayaran pesanan SPMB Anda *${order.id}*:\n\n*Detail Pesanan:*\n${order.items.map(item => `- ${item.qty}x ${item.product.name}`).join('\n')}\n\n*Total Pembayaran: ${formatCurrency(order.total)}*\n*Jam Pengantaran: ${order.pickupTime}*\n*Alamat: ${order.address}*\n\nSilakan scan QRIS di atas untuk melakukan pembayaran dan kirimkan bukti bayarnya ke sini ya! 🍵`;
        
        return NextResponse.json({
          success: true,
          replyMessage: reply,
          image: absoluteQrisImage || undefined
        });
      } else {
        // COD
        const reply = `Halo *${order.customerName}*!\n\nPesanan COD Anda *${order.id}* telah terkonfirmasi. ✅\n\n*Detail Pesanan:*\n${order.items.map(item => `- ${item.qty}x ${item.product.name}`).join('\n')}\n\n*Total Pembayaran: ${formatCurrency(order.total)}*\n*Jam Pengantaran: ${order.pickupTime}*\n*Alamat: ${order.address}*\n\nMohon siapkan uang pas saat pesanan diantarkan ya. Terima kasih! 🍵`;
        
        return NextResponse.json({
          success: true,
          replyMessage: reply
        });
      }
    }

    if (isVerificationRequest) {
      console.log(`[WHATSAPP_WEBHOOK] Mendeteksi VERIFICATION REQUEST`);
      const code = text.substring(11).trim(); // Extract the 6-digit code after "verifikasi-" or "VERIFIKASI-"
      
      // Look up code in VerificationToken table
      const dbToken = await prisma.verificationToken.findFirst({
        where: {
          token: code,
          expires: { gte: new Date() }
        }
      });

      if (!dbToken) {
        console.warn(`[WHATSAPP_WEBHOOK] Token verifikasi tidak valid atau kadaluarsa: ${code}`);
        const reply = "Verifikasi gagal ❌\n\nKode verifikasi tidak valid atau sudah kadaluarsa. Silakan ajukan kembali dari aplikasi.";
        try {
          await sendWhatsAppMessage(phone, reply, jid);
        } catch {}
        return NextResponse.json({ success: false, error: "Invalid or expired token", replyMessage: reply });
      }

      // Check if it's indeed a phone verification token
      if (!dbToken.identifier.startsWith("verify-phone:")) {
        console.warn(`[WHATSAPP_WEBHOOK] Token bukan untuk verifikasi HP: ${dbToken.identifier}`);
        const reply = "Verifikasi gagal ❌\n\nKode konfirmasi tersebut bukan untuk verifikasi WhatsApp.";
        try {
          await sendWhatsAppMessage(phone, reply, jid);
        } catch {}
        return NextResponse.json({ success: false, error: "Invalid token type", replyMessage: reply });
      }

      const parts = dbToken.identifier.split(":");
      const userId = parts[1];
      const targetPhone = parts[2];

      let standardizedSenderPhone = phone.replace(/[^0-9]/g, '');
      if (standardizedSenderPhone.startsWith('08')) {
        standardizedSenderPhone = '62' + standardizedSenderPhone.substring(1);
      } else if (standardizedSenderPhone.startsWith('8')) {
        standardizedSenderPhone = '62' + standardizedSenderPhone;
      }

      let standardizedTargetPhone = standardizedSenderPhone;

      if (targetPhone) {
        let stdTarget = targetPhone.replace(/[^0-9]/g, '');
        if (stdTarget.startsWith('08')) {
          stdTarget = '62' + stdTarget.substring(1);
        } else if (stdTarget.startsWith('8')) {
          stdTarget = '62' + stdTarget;
        }
        standardizedTargetPhone = stdTarget;

        if (standardizedSenderPhone !== standardizedTargetPhone) {
          console.warn(`[WHATSAPP_WEBHOOK] Phone mismatch. Sender: ${standardizedSenderPhone}, Target: ${standardizedTargetPhone}`);
          const reply = "Verifikasi gagal ❌\n\nNomor pengirim tidak cocok dengan nomor yang Anda masukkan di aplikasi.";
          try {
            await sendWhatsAppMessage(phone, reply, jid);
          } catch {}
          return NextResponse.json({ success: false, error: "Phone number mismatch", replyMessage: reply });
        }
      }

      // Check for phone conflict
      const phoneConflict = await prisma.user.findFirst({
        where: {
          phone: standardizedSenderPhone,
          phoneVerified: true,
          NOT: { id: userId }
        }
      });

      if (phoneConflict) {
        console.warn(`[WHATSAPP_WEBHOOK] Phone conflict. ${standardizedSenderPhone} already verified by another account.`);
        const reply = "Verifikasi gagal ❌\n\nNomor WhatsApp ini sudah terdaftar dan terverifikasi pada akun lain.";
        try {
          await sendWhatsAppMessage(phone, reply, jid);
        } catch {}
        return NextResponse.json({ success: false, error: "Phone conflict", replyMessage: reply });
      }

      console.log(`[WHATSAPP_WEBHOOK] Memulai verifikasi nomor HP user ID: ${userId} ke nomor: ${standardizedTargetPhone}`);

      // Update the user
      await prisma.user.update({
        where: { id: userId },
        data: {
          phone: standardizedTargetPhone,
          phoneVerified: true
        }
      });

      // Delete verification token
      await prisma.verificationToken.delete({
        where: { token: dbToken.token }
      });

      console.log(`[WHATSAPP_WEBHOOK] Nomor HP untuk user ${userId} berhasil diverifikasi.`);

      // Send WhatsApp confirmation back to the user
      const reply = `Verifikasi Berhasil! ✅\n\nNomor WhatsApp Anda telah berhasil diverifikasi untuk akun *Arum Seduh* Anda. Silakan kembali ke aplikasi untuk melanjutkan transaksi.`;
      try {
        await sendWhatsAppMessage(standardizedSenderPhone, reply, jid);
      } catch {}

      return NextResponse.json({ success: true, message: "Phone verified and confirmed via WhatsApp", replyMessage: reply, sent: true });
    }

    if (isDeleteRequest) {
      console.log(`[WHATSAPP_WEBHOOK] Mendeteksi DELETE REQUEST`);
      const code = text.substring(6).trim(); // Extract the 6-digit code after "hapus-" or "HAPUS-"
      
      // Look up code in VerificationToken table
      const dbToken = await prisma.verificationToken.findFirst({
        where: {
          token: code,
          expires: { gte: new Date() }
        }
      });

      if (!dbToken) {
        console.warn(`[WHATSAPP_WEBHOOK] Token delete tidak valid atau kadaluarsa: ${code}`);
        const reply = "Gagal memproses permintaan ❌\n\nKode konfirmasi penghapusan akun tidak valid atau sudah kadaluarsa. Silakan ajukan kembali dari menu Edit Profil di aplikasi.";
        try {
          await sendWhatsAppMessage(phone, reply, jid);
        } catch {}
        return NextResponse.json({ success: false, error: "Invalid or expired token", replyMessage: reply });
      }

      // Check if it's indeed a delete token
      if (!dbToken.identifier.startsWith("delete:")) {
        console.warn(`[WHATSAPP_WEBHOOK] Token bukan untuk hapus akun: ${dbToken.identifier}`);
        const reply = "Gagal memproses permintaan ❌\n\nKode konfirmasi tersebut bukan untuk penghapusan akun.";
        try {
          await sendWhatsAppMessage(phone, reply, jid);
        } catch {}
        return NextResponse.json({ success: false, error: "Invalid token type", replyMessage: reply });
      }

      const userId = dbToken.identifier.split(":")[1];

      // Fetch user to confirm identity and phone
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        console.warn(`[WHATSAPP_WEBHOOK] User untuk delete tidak ditemukan: ${userId}`);
        const reply = "Gagal memproses permintaan ❌\n\nAkun Anda tidak ditemukan di sistem kami.";
        try {
          await sendWhatsAppMessage(phone, reply, jid);
        } catch {}
        return NextResponse.json({ success: false, error: "User not found", replyMessage: reply });
      }

      // Verify that the sender's phone number matches the user's phone number in DB
      let standardizedSenderPhone = phone.replace(/[^0-9]/g, '');
      if (standardizedSenderPhone.startsWith('08')) {
        standardizedSenderPhone = '62' + standardizedSenderPhone.substring(1);
      } else if (standardizedSenderPhone.startsWith('8')) {
        standardizedSenderPhone = '62' + standardizedSenderPhone;
      }

      let standardizedUserPhone = (user.phone || "").replace(/[^0-9]/g, '');
      if (standardizedUserPhone.startsWith('08')) {
        standardizedUserPhone = '62' + standardizedUserPhone.substring(1);
      } else if (standardizedUserPhone.startsWith('8')) {
        standardizedUserPhone = '62' + standardizedUserPhone;
      }

      if (standardizedSenderPhone !== standardizedUserPhone) {
        console.warn(`[WHATSAPP_WEBHOOK] Phone mismatch. Sender: ${standardizedSenderPhone}, User DB: ${standardizedUserPhone}`);
        const reply = "Gagal memproses permintaan ❌\n\nNomor pengirim tidak cocok dengan nomor yang terdaftar di akun ini.";
        try {
          await sendWhatsAppMessage(phone, reply, jid);
        } catch {}
        return NextResponse.json({ success: false, error: "Phone number mismatch", replyMessage: reply });
      }

      console.log(`[WHATSAPP_WEBHOOK] Memulai proses penghapusan akun user: ${user.name} (${user.id})`);

      // Run transactional deletion to avoid constraint errors and preserve orders
      await prisma.$transaction([
        // Clear references on orders
        prisma.order.updateMany({
          where: { userId: user.id },
          data: { userId: null }
        }),
        prisma.order.updateMany({
          where: { cashierId: user.id },
          data: { cashierId: null }
        }),
        prisma.order.updateMany({
          where: { driverId: user.id },
          data: { driverId: null }
        }),
        // Clean shifts
        prisma.cashierShift.deleteMany({
          where: { cashierId: user.id }
        }),
        // Delete verification token
        prisma.verificationToken.delete({
          where: { token: dbToken.token }
        }),
        // Delete user cascade will handle the rest
        prisma.user.delete({
          where: { id: user.id }
        })
      ]);

      console.log(`[WHATSAPP_WEBHOOK] Akun user ${user.id} berhasil dihapus.`);

      // Send WhatsApp confirmation back to the user
      const deleteMessage = `Akun Anda dengan nama *${user.name || "Matcha Lover"}* telah berhasil dihapus secara permanen dari sistem *Arum Seduh*! ❌\n\nTerima kasih telah bersama kami. Semoga kita bisa bertemu kembali di lain kesempatan.`;
      try {
        await sendWhatsAppMessage(standardizedSenderPhone, deleteMessage, jid);
      } catch {}

      return NextResponse.json({ success: true, message: "Account deleted and confirmed via WhatsApp", replyMessage: deleteMessage, sent: true });
    }

    if (isLoginRequest) {
      console.log(`[WHATSAPP_WEBHOOK] Mendeteksi LOGIN REQUEST`);
      // ... (standardization)
      let standardizedPhone = phone.replace(/[^0-9]/g, '');
      if (standardizedPhone.startsWith('08')) {
        standardizedPhone = '62' + standardizedPhone.substring(1);
      } else if (standardizedPhone.startsWith('8')) {
        standardizedPhone = '62' + standardizedPhone;
      }

      // Pastikan nomor pengirim WA sesuai dengan nomor yang diinput di aplikasi jika ada
      const targetPhoneMatch = text.match(/HP:\s*([0-9]+)/i);
      if (targetPhoneMatch) {
        const targetPhone = targetPhoneMatch[1];
        let standardizedTarget = targetPhone.replace(/[^0-9]/g, '');
        if (standardizedTarget.startsWith('08')) {
          standardizedTarget = '62' + standardizedTarget.substring(1);
        } else if (standardizedTarget.startsWith('8')) {
          standardizedTarget = '62' + standardizedTarget;
        }

        if (standardizedPhone !== standardizedTarget) {
          console.warn(`[WHATSAPP_WEBHOOK] Login phone mismatch. Sender: ${standardizedPhone}, Target: ${standardizedTarget}`);
          
          const errorMessage = `Login Gagal! ❌\n\nNomor pengirim WhatsApp ini (*${standardizedPhone}*) tidak cocok dengan nomor yang Anda masukkan di aplikasi (*${standardizedTarget}*).\n\nSilakan gunakan akun WhatsApp yang sesuai dengan nomor tersebut untuk mengirim pesan.`;
          
          if (!body.directReply) {
            try {
              await sendWhatsAppMessage(standardizedPhone, errorMessage, jid);
            } catch {}
          }
          return NextResponse.json({ success: false, error: "Phone number mismatch", replyMessage: errorMessage });
        }
      }

      // ... (token creation)
      // Buat magic token
      const magicToken = crypto.randomBytes(32).toString('hex');
      
      // Simpan token ke database dengan masa berlaku 15 menit
      await prisma.verificationToken.create({
        data: {
          identifier: standardizedPhone,
          token: magicToken,
          expires: new Date(Date.now() + 15 * 60 * 1000), // 15 menit
        }
      });

      // Siapkan URL Magic Link - Regex lebih robust mencocokkan karakter non-spasi dan non-titik
      const refMatch = text.match(/Ref:\s*([^\s\.]+)/i);
      let magicLink = `${appUrl}/verify-wa?token=${magicToken}`;
      if (refMatch) {
        const parsedRef = refMatch[1].trim();
        magicLink += `&ref=${parsedRef}`;
        console.log(`[WHATSAPP_WEBHOOK] Mendeteksi referral code: "${parsedRef}"`);
      }

      // Pesan balasan ke user
      const replyMessage = `Login Berhasil Dikonfirmasi! ✅\n\nSilakan klik link berikut untuk kembali ke aplikasi dan masuk ke akun Anda:\n${magicLink}\n\n(Link berlaku selama 15 menit)`;

      console.log(`[WHATSAPP_WEBHOOK] Sukses memproses login request. Magic link: ${magicLink}`);

      // Kirim pesan ke WhatsApp user via API provider (asynchronous callback)
      if (!body.directReply) {
        try {
          await sendWhatsAppMessage(standardizedPhone, replyMessage, jid);
        } catch {}
      }

      return NextResponse.json({ success: true, message: "Magic link sent", magicLink, replyMessage, sent: true });
    }

    // -------------------------------------------------------------
    // CONVERSATIONAL ORDER STATE MACHINE
    // -------------------------------------------------------------

    // Fetch active products (not archived, not sold-out)
    const products = await prisma.product.findMany({
      where: {
        AND: [
          {
            OR: [
              { badge: null },
              { badge: { not: "archived" } }
            ]
          },
          {
            OR: [
              { badge: null },
              { badge: { not: "sold-out" } }
            ]
          }
        ]
      },
      include: { category: true },
      orderBy: { name: "asc" }
    });

    const sessionKey = `wa_order_session_${phone}`;
    const sessionRow = await prisma.waBotSession.findUnique({ where: { key: sessionKey } });
    const session = sessionRow ? JSON.parse(sessionRow.value || "{}") : null;

    const menuCommands = ["menu", "pesan", "order", "halo", "hi", "hei", "daftar menu"];

    if (menuCommands.includes(lowerText)) {
      // Delete existing session if any
      await prisma.waBotSession.deleteMany({ where: { key: sessionKey } });

      // Group products by category, while keeping global sequential index
      const categoriesMap: { [categoryName: string]: any[] } = {};
      products.forEach((product, index) => {
        const catName = product.category?.name || "Lainnya";
        if (!categoriesMap[catName]) {
          categoriesMap[catName] = [];
        }
        categoriesMap[catName].push({ product, globalIndex: index + 1 });
      });

      let menuListText = "";
      for (const catName of Object.keys(categoriesMap)) {
        menuListText += `${catName}:\n`;
        for (const item of categoriesMap[catName]) {
          menuListText += `${item.globalIndex}. ${item.product.name} - Rp${item.product.price.toLocaleString("id-ID")} (Ketik *ORDER ${item.globalIndex}*)\n`;
        }
        menuListText += "\n";
      }
      menuListText = menuListText.trim();

      const reply = `🍵 *SELAMAT DATANG DI ARUM SEDUH* 🍵\n━━━━━━━━━━━━━━━━━━━\nBerikut adalah menu kami:\n\n${menuListText}\n━━━━━━━━━━━━━━━━━━━\nKetik *ORDER [Nomor Menu]* untuk memesan.\nContoh: *ORDER 1*`;

      return NextResponse.json({
        success: true,
        replyMessage: reply
      });
    }

    if (session) {
      const state = session.state;

      if (state === "SELECTING_QUANTITY") {
        const qty = parseInt(text, 10);
        if (isNaN(qty) || qty <= 0) {
          return NextResponse.json({
            success: true,
            replyMessage: "Maaf, silakan masukkan jumlah pesanan dalam bentuk angka yang valid (contoh: *2*):"
          });
        }

        session.state = "SELECTING_DELIVERY";
        session.quantity = qty;

        await prisma.waBotSession.update({
          where: { key: sessionKey },
          data: { value: JSON.stringify(session) }
        });

        const reply = `Jumlah pesanan: *${qty}x ${session.productName}* (Total: Rp${qty * session.price}).\n\nPilih metode penyerahan:\n1. *Ambil Sendiri* (PICKUP)\n2. *Diantar* (DELIVERY)\n\nKetik *1* atau *2*.`;
        return NextResponse.json({ success: true, replyMessage: reply });
      }

      if (state === "SELECTING_DELIVERY") {
        const choice = text.trim();
        if (choice === "1") {
          session.orderType = "PICKUP";
          session.state = "ENTERING_NAME";
          await prisma.waBotSession.update({
            where: { key: sessionKey },
            data: { value: JSON.stringify(session) }
          });
          return NextResponse.json({
            success: true,
            replyMessage: "Metode: *Ambil Sendiri*.\n\nSilakan masukkan nama Anda:"
          });
        } else if (choice === "2") {
          session.orderType = "DELIVERY";
          session.state = "ENTERING_NAME";
          await prisma.waBotSession.update({
            where: { key: sessionKey },
            data: { value: JSON.stringify(session) }
          });
          return NextResponse.json({
            success: true,
            replyMessage: "Metode: *Diantar*.\n\nSilakan masukkan nama Anda:"
          });
        } else {
          return NextResponse.json({
            success: true,
            replyMessage: "Maaf, pilihan tidak valid. Pilih metode penyerahan:\n1. *Ambil Sendiri* (PICKUP)\n2. *Diantar* (DELIVERY)\n\nKetik *1* atau *2*."
          });
        }
      }

      if (state === "ENTERING_NAME") {
        const customerName = text.trim();
        session.customerName = customerName;

        if (session.orderType === "PICKUP") {
          session.state = "CONFIRMING";
          await prisma.waBotSession.update({
            where: { key: sessionKey },
            data: { value: JSON.stringify(session) }
          });
          const reply = `📝 *KONFIRMASI PESANAN*\n━━━━━━━━━━━━━━━━━━━\n👤 *Nama:* ${customerName}\n🛍️ *Pesanan:* ${session.quantity}x ${session.productName}\n💰 *Total:* Rp${session.quantity * session.price}\n🚦 *Metode:* Ambil Sendiri (PICKUP)\n━━━━━━━━━━━━━━━━━━━\nApakah data di atas sudah benar?\nKetik *YA* untuk konfirmasi, atau *BATAL* untuk membatalkan.`;
          return NextResponse.json({ success: true, replyMessage: reply });
        } else {
          session.state = "ENTERING_ADDRESS";
          await prisma.waBotSession.update({
            where: { key: sessionKey },
            data: { value: JSON.stringify(session) }
          });
          return NextResponse.json({
            success: true,
            replyMessage: "Silakan masukkan alamat pengiriman lengkap:"
          });
        }
      }

      if (state === "ENTERING_ADDRESS") {
        const address = text.trim();
        session.address = address;
        session.state = "CONFIRMING";
        await prisma.waBotSession.update({
          where: { key: sessionKey },
          data: { value: JSON.stringify(session) }
        });

        const reply = `📝 *KONFIRMASI PESANAN*\n━━━━━━━━━━━━━━━━━━━\n👤 *Nama:* ${session.customerName}\n🛍️ *Pesanan:* ${session.quantity}x ${session.productName}\n💰 *Total:* Rp${session.quantity * session.price}\n🚦 *Metode:* Diantar (DELIVERY)\n📍 *Alamat:* ${address}\n━━━━━━━━━━━━━━━━━━━\nApakah data di atas sudah benar?\nKetik *YA* untuk konfirmasi, atau *BATAL* untuk membatalkan.`;
        return NextResponse.json({ success: true, replyMessage: reply });
      }

      if (state === "CONFIRMING") {
        const confirmation = text.trim().toLowerCase();
        if (confirmation === "ya") {
          const orderId = `WA-${Math.floor(100000 + Math.random() * 900000)}`;

          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          const endOfToday = new Date();
          endOfToday.setHours(23, 59, 59, 999);

          const countToday = await prisma.order.count({
            where: {
              createdAt: {
                gte: startOfToday,
                lte: endOfToday
              }
            }
          });

          const queueNumber = `WA-${String(countToday + 1).padStart(3, "0")}`;

          let cleanPhone = phone.replace(/[^0-9]/g, "");
          if (cleanPhone.startsWith("08")) {
            cleanPhone = "62" + cleanPhone.substring(1);
          } else if (cleanPhone.startsWith("8")) {
            cleanPhone = "62" + cleanPhone;
          }

          const order = await prisma.order.create({
            data: {
              id: orderId,
              orderType: session.orderType,
              source: "WA",
              customerName: session.customerName,
              customerPhone: cleanPhone,
              address: session.address || "",
              subtotal: session.quantity * session.price,
              deliveryFee: 0,
              total: session.quantity * session.price,
              paymentMethod: "COD",
              status: "PENDING",
              queueNumber: queueNumber,
              items: {
                create: [
                  {
                    productId: session.productId,
                    qty: session.quantity,
                    price: session.price
                  }
                ]
              }
            }
          });

          await prisma.waBotSession.delete({
            where: { key: sessionKey }
          });

          // Trigger admin summary
          const { sendAdminOrderSummary } = await import("@/lib/whatsapp-service");
          sendAdminOrderSummary().catch(err => console.error("Gagal mengirim admin summary:", err));

          const reply = `✅ *PESANAN BERHASIL DIBUAT!*\n\nID Pesanan Anda: *${order.id}*\nNomor Antrean: *${order.queueNumber}*\n\nPesanan Anda akan segera diproses. Terima kasih! 🍵`;
          return NextResponse.json({ success: true, replyMessage: reply });
        } else if (confirmation === "batal") {
          await prisma.waBotSession.delete({
            where: { key: sessionKey }
          });
          return NextResponse.json({
            success: true,
            replyMessage: "❌ Pemesanan dibatalkan. Ketik *MENU* untuk mulai kembali."
          });
        } else {
          return NextResponse.json({
            success: true,
            replyMessage: "Maaf, pilihan tidak valid. Ketik *YA* untuk konfirmasi, atau *BATAL* untuk membatalkan."
          });
        }
      }
    }

    if (!session) {
      const orderMatch = lowerText.match(/^order\s+(\d+)$/);
      if (orderMatch) {
        const productIndex = parseInt(orderMatch[1], 10);
        const productItem = products[productIndex - 1]; // 1-indexed to 0-indexed

        if (productItem) {
          const sessionData = {
            state: "SELECTING_QUANTITY",
            productId: productItem.id,
            productName: productItem.name,
            price: productItem.price
          };

          await prisma.waBotSession.upsert({
            where: { key: sessionKey },
            update: { value: JSON.stringify(sessionData) },
            create: { key: sessionKey, value: JSON.stringify(sessionData) }
          });

          const reply = `Anda memilih *${productItem.name}* (Rp${productItem.price.toLocaleString("id-ID")}).\n\nSilakan masukkan jumlah pesanan (angka saja, contoh: *2*):`;
          return NextResponse.json({ success: true, replyMessage: reply });
        } else {
          return NextResponse.json({
            success: true,
            replyMessage: "Nomor menu tidak valid. Silakan ketik *MENU* untuk melihat daftar menu."
          });
        }
      }
    }

    return NextResponse.json({ success: true, message: "Ignored" });

  } catch (error) {
    console.error("[WHATSAPP_WEBHOOK] Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
