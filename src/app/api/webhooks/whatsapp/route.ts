import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// URL dasar aplikasi untuk mengarahkan kembali user setelah klik magic link
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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

    if (isLoginRequest) {
      console.log(`[WHATSAPP_WEBHOOK] Mendeteksi LOGIN REQUEST`);
      // ... (standardization)
      let standardizedPhone = phone.replace(/[^0-9]/g, '');
      if (standardizedPhone.startsWith('08')) {
        standardizedPhone = '62' + standardizedPhone.substring(1);
      } else if (standardizedPhone.startsWith('8')) {
        standardizedPhone = '62' + standardizedPhone;
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
      const magicLink = `${APP_URL}/verify-wa?token=${magicToken}`;

      // Pesan balasan ke user
      const replyMessage = `Login Berhasil Dikonfirmasi! ✅\n\nSilakan klik link berikut untuk kembali ke aplikasi dan masuk ke akun Anda:\n${magicLink}\n\n(Link berlaku selama 15 menit)`;

      // Kirim pesan ke WhatsApp user via API provider
      await sendWhatsAppMessage(standardizedPhone, replyMessage, jid);

      return NextResponse.json({ success: true, message: "Magic link sent" });
    }

    return NextResponse.json({ success: true, message: "Ignored" });

  } catch (error) {
    console.error("[WHATSAPP_WEBHOOK] Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
