import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Function to send a message via WhatsApp bot
async function sendWhatsAppMessage(phone: string, text: string) {
  const waProviderUrl = process.env.WA_PROVIDER_URL || "http://localhost:3001/send";
  try {
    const res = await fetch(waProviderUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message: text }),
    });
    if (!res.ok) {
      console.error("[DELETE_ACCOUNT] Failed to send WhatsApp message via provider, status:", res.status);
    }
  } catch (error) {
    console.error("[DELETE_ACCOUNT] Error calling WhatsApp bot provider API:", error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    if (!user.phone) {
      return NextResponse.json({ error: "Nomor WhatsApp tidak terdaftar di profil Anda." }, { status: 400 });
    }

    // Standardize phone number for WhatsApp
    let standardizedPhone = user.phone.replace(/[^0-9]/g, '');
    if (standardizedPhone.startsWith('08')) {
      standardizedPhone = '62' + standardizedPhone.substring(1);
    } else if (standardizedPhone.startsWith('8')) {
      standardizedPhone = '62' + standardizedPhone;
    }

    // Generate a 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Clean up any existing delete requests for this user to avoid duplicates
    const identifier = `delete:${user.id}`;
    try {
      await prisma.verificationToken.deleteMany({
        where: { identifier }
      });
    } catch (dbErr) {
      console.warn("[DELETE_ACCOUNT] No existing token to delete or error during cleanup:", dbErr);
    }

    // Save the new verification code in the database (expires in 10 minutes)
    await prisma.verificationToken.create({
      data: {
        identifier,
        token: code,
        expires: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      }
    });

    // Send WhatsApp instructions to the user's phone
    const message = `Halo *${user.name || "Pelanggan"}*,\n\nKami menerima permintaan untuk menghapus akun Anda secara permanen dari sistem *Arum Seduh*.\n\nJika Anda benar-benar ingin memproses penghapusan akun, silakan balas pesan ini dengan mengetik:\n👉 *HAPUS-${code}*\n\n⚠️ *PENTING*: Tindakan ini bersifat permanen. Seluruh data profil, alamat, voucher, point, dan riwayat pesanan Anda akan terhapus selamanya dan tidak dapat dikembalikan.\n\nJika Anda tidak meminta ini, abaikan pesan ini.`;

    await sendWhatsAppMessage(standardizedPhone, message);

    return NextResponse.json({ success: true, code });
  } catch (error: any) {
    console.error("[DELETE_ACCOUNT_REQUEST] Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
