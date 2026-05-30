import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { recipientPhone, amount, message } = body;

        if (!recipientPhone) {
            return NextResponse.json({ error: "Nomor HP penerima wajib diisi" }, { status: 400 });
        }

        const parsedAmount = parseInt(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return NextResponse.json({ error: "Jumlah gift card tidak valid" }, { status: 400 });
        }

        // Standardize recipient phone number for WhatsApp
        let stdPhone = recipientPhone.replace(/[^0-9]/g, '');
        if (stdPhone.startsWith('08')) {
            stdPhone = '62' + stdPhone.substring(1);
        } else if (stdPhone.startsWith('8')) {
            stdPhone = '62' + stdPhone;
        }

        // Create a unique gift card code
        const code = `GC-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;

        const giftCard = await prisma.$transaction(async (tx) => {
            const sender = await tx.user.findUnique({
                where: { id: session.user.id },
                select: { walletBalance: true, name: true }
            });

            if (!sender) {
                throw new Error("Pengirim tidak ditemukan");
            }

            if (sender.walletBalance < parsedAmount) {
                throw new Error(`Saldo wallet Anda tidak mencukupi. Saldo Anda: Rp ${sender.walletBalance.toLocaleString('id-ID')}`);
            }

            // Deduct sender wallet balance
            await tx.user.update({
                where: { id: session.user.id },
                data: {
                    walletBalance: { decrement: parsedAmount }
                }
            });

            // Log wallet transaction for sender
            await tx.walletTransaction.create({
                data: {
                    userId: session.user.id,
                    amount: -parsedAmount,
                    type: "PAYMENT",
                    description: `Membeli Gift Card untuk nomor ${recipientPhone}`
                }
            });

            // Create GiftCard in DB
            const gc = await tx.giftCard.create({
                data: {
                    code,
                    senderId: session.user.id,
                    senderName: sender.name || "Matchaboy Customer",
                    recipientPhone: stdPhone,
                    amount: parsedAmount,
                    message: message || null
                }
            });

            return gc;
        });

        // Send WhatsApp Message
        const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const claimLink = `${appUrl}/gift-card/claim?code=${giftCard.code}`;

        const waMessage = `🎁 *GIFT CARD MATCHABOY SPECIAL UNTUKMU* 🎁
Dari: *${giftCard.senderName}*
Jumlah: *Rp ${giftCard.amount.toLocaleString('id-ID')}*

${giftCard.message ? `Pesan: "${giftCard.message}"\n` : ''}
Kamu mendapatkan Matchaboy Gift Card! Klik tautan di bawah ini untuk klaim saldo ke Matchaboy Wallet-mu:
👉 ${claimLink}

Nikmati matcha favoritmu di Arum Seduh Matchaboy! 🍃💚`;

        const waProviderUrl = process.env.WA_PROVIDER_URL || "http://localhost:3001/send";
        const apiKey = process.env.WA_BOT_API_KEY || "";

        try {
            await fetch(waProviderUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey
                },
                body: JSON.stringify({ phone: stdPhone, message: waMessage }),
            });
        } catch (err) {
            console.error("Failed to send WhatsApp message for Gift Card:", err);
        }

        return NextResponse.json({ giftCard });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
