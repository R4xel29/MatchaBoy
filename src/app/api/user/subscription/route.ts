import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const prices: Record<string, number> = {
    GREEN_TEA: 20000,
    MATCHA_LATTE: 50500,
    GOLDEN_MATCHA: 99000
};

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const subscription = await prisma.memberSubscription.findUnique({
            where: { userId: session.user.id }
        });

        return NextResponse.json({ subscription });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { tier } = body;

        if (!tier || !prices[tier]) {
            return NextResponse.json({ error: "Tier langganan tidak valid" }, { status: 400 });
        }

        const now = new Date();
        const durationDays = 30;

        const subscription = await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { id: session.user.id },
                select: { walletBalance: true }
            });

            if (!user) {
                throw new Error("User tidak ditemukan");
            }

            const price = prices[tier];
            if (user.walletBalance < price) {
                throw new Error(`Saldo wallet tidak mencukupi. Saldo Anda: Rp ${user.walletBalance.toLocaleString('id-ID')}, Harga: Rp ${price.toLocaleString('id-ID')}`);
            }

            // Deduct wallet
            await tx.user.update({
                where: { id: session.user.id },
                data: {
                    walletBalance: { decrement: price }
                }
            });

            // Write transaction
            await tx.walletTransaction.create({
                data: {
                    userId: session.user.id,
                    amount: -price,
                    type: "PAYMENT",
                    description: `Pembelian Langganan ${tier.replace('_', ' ')}`
                }
            });

            // Check if there is an existing subscription
            const existing = await tx.memberSubscription.findUnique({
                where: { userId: session.user.id }
            });

            let newExpiresAt: Date;
            if (existing && existing.status === 'ACTIVE' && existing.expiresAt > now) {
                newExpiresAt = new Date(existing.expiresAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
            } else {
                newExpiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
            }

            const sub = await tx.memberSubscription.upsert({
                where: { userId: session.user.id },
                create: {
                    userId: session.user.id,
                    tier,
                    status: "ACTIVE",
                    startedAt: now,
                    expiresAt: newExpiresAt
                },
                update: {
                    tier,
                    status: "ACTIVE",
                    expiresAt: newExpiresAt
                }
            });

            return sub;
        });

        return NextResponse.json({ subscription });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
