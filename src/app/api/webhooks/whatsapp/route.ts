import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// URL dasar aplikasi akan ditentukan secara dinamis dari origin request jika env tidak diatur

// Fungsi untuk mengirim pesan balasan WhatsApp
async function sendWhatsAppMessage(phone: string, text: string, jid?: string) {
  // TODO: Implementasi pemanggilan API provider WA yang digunakan (misal Fonnte, WATSAP, dll)
  // Untuk saat ini karena belum ditentukan provider-nya, kita buat console log.
  console.log(`[WHATSAPP_BOT] Mengirim ke ${phone} (JID: ${jid || 'N/A'}): ${text}`);
  
  // Memanggil API lokal dari Bot Baileys yang kita buat
  const waProviderUrl = process.env.WA_PROVIDER_URL || "http://localhost:3001/send";
  if (waProviderUrl) {
    try {
      await fetch(waProviderUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, message: text, jid }),
      });
    } catch (error) {
      console.error("[WHATSAPP_BOT] Gagal memanggil API Provider WA", error);
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const requestUrl = new URL(req.url);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin;

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

      // Verify that the sender's phone number matches the target phone number
      let standardizedSenderPhone = phone.replace(/[^0-9]/g, '');
      if (standardizedSenderPhone.startsWith('08')) {
        standardizedSenderPhone = '62' + standardizedSenderPhone.substring(1);
      } else if (standardizedSenderPhone.startsWith('8')) {
        standardizedSenderPhone = '62' + standardizedSenderPhone;
      }

      let standardizedTargetPhone = targetPhone.replace(/[^0-9]/g, '');
      if (standardizedTargetPhone.startsWith('08')) {
        standardizedTargetPhone = '62' + standardizedTargetPhone.substring(1);
      } else if (standardizedTargetPhone.startsWith('8')) {
        standardizedTargetPhone = '62' + standardizedTargetPhone;
      }

      if (standardizedSenderPhone !== standardizedTargetPhone) {
        console.warn(`[WHATSAPP_WEBHOOK] Phone mismatch. Sender: ${standardizedSenderPhone}, Target: ${standardizedTargetPhone}`);
        const reply = "Verifikasi gagal ❌\n\nNomor pengirim tidak cocok dengan nomor yang Anda masukkan di aplikasi.";
        try {
          await sendWhatsAppMessage(phone, reply, jid);
        } catch {}
        return NextResponse.json({ success: false, error: "Phone number mismatch", replyMessage: reply });
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

      return NextResponse.json({ success: true, message: "Phone verified and confirmed via WhatsApp", replyMessage: reply });
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

      return NextResponse.json({ success: true, message: "Account deleted and confirmed via WhatsApp", replyMessage: deleteMessage });
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
          
          try {
            await sendWhatsAppMessage(standardizedPhone, errorMessage, jid);
          } catch {}
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

      // Siapkan URL Magic Link
      const magicLink = `${appUrl}/verify-wa?token=${magicToken}`;

      // Pesan balasan ke user
      const replyMessage = `Login Berhasil Dikonfirmasi! ✅\n\nSilakan klik link berikut untuk kembali ke aplikasi dan masuk ke akun Anda:\n${magicLink}\n\n(Link berlaku selama 15 menit)`;

      // Kirim pesan ke WhatsApp user via API provider (asynchronous callback)
      try {
        await sendWhatsAppMessage(standardizedPhone, replyMessage, jid);
      } catch {}

      return NextResponse.json({ success: true, message: "Magic link sent", magicLink, replyMessage });
    }

    return NextResponse.json({ success: true, message: "Ignored" });

  } catch (error) {
    console.error("[WHATSAPP_WEBHOOK] Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
