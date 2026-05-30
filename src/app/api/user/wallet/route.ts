import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { ValidationError, getSafeErrorResponse, logError } from '@/lib/errors'
import { incrementQuestProgress } from '@/lib/loyalty-utils'

export async function GET(req: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                walletBalance: true,
                walletTransactions: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        })

        if (!user) {
            return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
        }

        return NextResponse.json({
            balance: user.walletBalance,
            transactions: user.walletTransactions
        })
    } catch (error) {
        logError(error, { route: 'user/wallet-get' });
        const safeError = getSafeErrorResponse(error);
        return NextResponse.json(
            { error: safeError.message, code: safeError.code },
            { status: safeError.statusCode }
        );
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const amount = parseInt(body.amount)

        if (isNaN(amount) || amount <= 0) {
            throw new ValidationError('Jumlah top-up harus berupa angka positif')
        }

        // Rule: 10% bonus for top-up >= 100K (100,000)
        const hasBonus = amount >= 100000
        const bonusAmount = hasBonus ? Math.floor(amount * 0.1) : 0
        const totalTopUp = amount + bonusAmount

        const updatedUser = await prisma.$transaction(async (tx) => {
            // Update user wallet balance
            const user = await tx.user.update({
                where: { id: session.user.id },
                data: {
                    walletBalance: { increment: totalTopUp }
                }
            })

            // Create TOP_UP transaction
            await tx.walletTransaction.create({
                data: {
                    userId: session.user.id,
                    amount: amount,
                    type: 'TOP_UP',
                    description: `Top-up wallet sebesar Rp${amount.toLocaleString('id-ID')}`,
                }
            })

            // If there's a bonus, create TOP_UP_BONUS transaction
            if (hasBonus && bonusAmount > 0) {
                await tx.walletTransaction.create({
                    data: {
                        userId: session.user.id,
                        amount: bonusAmount,
                        type: 'TOP_UP_BONUS',
                        description: `Bonus Top-up 10% sebesar Rp${bonusAmount.toLocaleString('id-ID')}`,
                    }
                })
            }

            // C1 Gamification Quests: Atomically increment top-up count quest progress
            await incrementQuestProgress(session.user.id, 'TOP_UP_COUNT', 1, tx)

            return user
        })

        return NextResponse.json({
            success: true,
            balance: updatedUser.walletBalance
        })
    } catch (error) {
        logError(error, { route: 'user/wallet-post' });
        const safeError = getSafeErrorResponse(error);
        return NextResponse.json(
            { error: safeError.message, code: safeError.code },
            { status: safeError.statusCode }
        );
    }
}
