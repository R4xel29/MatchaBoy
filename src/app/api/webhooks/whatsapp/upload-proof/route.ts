import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadToSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const requestUrl = new URL(req.url);
    const token = req.headers.get("x-api-key") || 
                  req.headers.get("Authorization")?.replace("Bearer ", "") ||
                  requestUrl.searchParams.get("token");
                  
    const expectedToken = process.env.WA_BOT_API_KEY;
    if (!expectedToken || token !== expectedToken) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { imageBase64, mimeType, phone, orderId: rawOrderId } = body;

    if (!imageBase64 || !phone) {
      return NextResponse.json({ success: false, error: "Missing imageBase64 or phone" }, { status: 400 });
    }

    // Standardize phone
    let standardizedPhone = phone.replace(/[^0-9]/g, '');
    if (standardizedPhone.startsWith('08')) {
      standardizedPhone = '62' + standardizedPhone.substring(1);
    } else if (standardizedPhone.startsWith('8')) {
      standardizedPhone = '62' + standardizedPhone;
    }

    let order = null;

    // 1. If rawOrderId (or caption) is provided, clean and search it
    if (rawOrderId) {
      const cleanOrderId = rawOrderId.trim().toUpperCase();
      order = await prisma.order.findUnique({
        where: { id: cleanOrderId }
      });
    }

    // 2. If no order found yet, search by phone and PENDING_PAYMENT status
    if (!order) {
      // Find the most recent order with PENDING_PAYMENT status, for this phone number, that is manual payment
      order = await prisma.order.findFirst({
        where: {
          customerPhone: standardizedPhone,
          status: 'PENDING_PAYMENT',
          paymentMethod: { in: ['QRIS', 'TRANSFER'] }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }

    if (!order) {
      return NextResponse.json({
        success: false,
        error: "No matching pending payment order found",
        replyMessage: "Maaf, kami tidak menemukan pesanan aktif dengan metode QRIS/Transfer yang menunggu pembayaran dari nomor Anda. Silakan ketik ID pesanan Anda terlebih dahulu (contoh: SPMB-XXXXXX) atau hubungi admin."
      });
    }

    // Decode base64 image
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    const extension = (mimeType || 'image/jpeg').split('/')[1] || 'jpeg';
    const timestamp = Date.now();
    const filename = `payments/wa-bot-${order.id}-${timestamp}.${extension}`;

    // Upload to Supabase
    const publicUrl = await uploadToSupabase(
      'products',
      filename,
      imageBuffer,
      mimeType || 'image/jpeg'
    );

    // Update order status to PENDING (Accept) and set paymentProofUrl
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentProofUrl: publicUrl,
        status: 'PENDING'
      }
    });

    const reply = `Bukti pembayaran untuk pesanan *${order.id}* telah terkirim! ✅\n\nAdmin akan segera memverifikasi pembayaran Anda. Mohon tunggu proses selanjutnya. Terima kasih! 🍵`;

    return NextResponse.json({
      success: true,
      orderId: order.id,
      paymentProofUrl: publicUrl,
      replyMessage: reply
    });

  } catch (error: any) {
    console.error("[WA_BOT_UPLOAD_PROOF_ERROR]", error);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
