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
        const { code } = body;

        if (!code) {
            return NextResponse.json({ error: "Kode gift card wajib diisi" }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            const giftCard = await tx.giftCard.findUnique({
                where: { code }
            });

            if (!giftCard) {
                throw new Error("Gift card tidak ditemukan");
            }

            if (giftCard.isClaimed) {
                throw new Error("Gift card ini sudah diklaim sebelumnya");
            }

            if (giftCard.expiresAt && giftCard.expiresAt < new Date()) {
                throw new Error("Gift card ini sudah kedaluwarsa");
            }

            // Add amount to user's walletBalance
            await tx.user.update({
                where: { id: session.user.id },
                data: {
                    walletBalance: { increment: giftCard.amount }
                }
            });

            // Create wallet transaction
            await tx.walletTransaction.create({
                data: {
                    userId: session.user.id,
                    amount: giftCard.amount,
                    type: "TOP_UP",
                    description: `Klaim Gift Card dari ${giftCard.senderName}`,
                    referenceId: giftCard.id
                }
            });

            // Mark gift card as claimed
            const updatedGc = await tx.giftCard.update({
                where: { id: giftCard.id },
                data: {
                    isClaimed: true,
                    claimedById: session.user.id,
                    claimedAt: new Date()
                }
            });

            return updatedGc;
        });

        return NextResponse.json({ giftCard: result });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
