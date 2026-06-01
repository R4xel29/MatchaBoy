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

        const { searchParams } = new URL(req.url)
        const transactionId = searchParams.get('transactionId')

        if (transactionId) {
            const tx = await prisma.walletTransaction.findUnique({
                where: { id: transactionId }
            })
            if (!tx || tx.userId !== session.user.id) {
                return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 })
            }
            return NextResponse.json({
                success: true,
                status: tx.status,
                amount: tx.amount,
                paymentCode: tx.referenceId
            })
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

        const settings = await prisma.paymentSettings.findFirst();
        const banks = await prisma.bankAccount.findMany({
            where: { isActive: true },
            orderBy: { order: 'asc' }
        });

        return NextResponse.json({
            balance: user.walletBalance,
            transactions: user.walletTransactions,
            banks: banks,
            settings: {
                minTopUp: settings?.walletMinTopUp ?? 10000,
                bonusMinAmount: settings?.walletBonusMinAmount ?? 100000,
                bonusPercent: settings?.walletBonusPercent ?? 10,
                topUpEnabled: settings?.walletTopUpEnabled ?? true,
            }
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
        const paymentMethod = body.paymentMethod // Optional, e.g. 'qris' | 'bank' | 'offline'

        if (isNaN(amount) || amount <= 0) {
            throw new ValidationError('Jumlah top-up harus berupa angka positif')
        }

        const settings = await prisma.paymentSettings.findFirst();
        const minTopUp = settings?.walletMinTopUp ?? 10000;
        const bonusMinAmount = settings?.walletBonusMinAmount ?? 100000;
        const bonusPercent = settings?.walletBonusPercent ?? 10;
        const topUpEnabled = settings?.walletTopUpEnabled ?? true;

        if (!topUpEnabled) {
            throw new ValidationError('Fitur top-up saldo sedang dinonaktifkan sementara.')
        }

        if (amount < minTopUp) {
            throw new ValidationError(`Jumlah pengisian minimal adalah Rp${minTopUp.toLocaleString('id-ID')}`)
        }

        // If payment method is specified and not DIRECT, create a PENDING transaction
        if (paymentMethod && paymentMethod !== 'DIRECT') {
            const paymentCode = `MB-TOPUP-${Math.floor(1000 + Math.random() * 9000)}`
            
            const transaction = await prisma.walletTransaction.create({
                data: {
                    userId: session.user.id,
                    amount: amount,
                    type: 'TOP_UP',
                    description: `Top-up wallet sebesar Rp${amount.toLocaleString('id-ID')} via ${paymentMethod.toUpperCase()}`,
                    status: 'PENDING',
                    paymentMethod: paymentMethod.toUpperCase(),
                    referenceId: paymentCode
                }
            })

            return NextResponse.json({
                success: true,
                transaction: {
                    id: transaction.id,
                    amount: transaction.amount,
                    paymentCode: transaction.referenceId,
                    status: transaction.status,
                    paymentMethod: transaction.paymentMethod
                }
            })
        }

        // Legacy / Direct Credit flow (used when no paymentMethod is specified)
        const hasBonus = amount >= bonusMinAmount
        const bonusAmount = hasBonus ? Math.floor(amount * (bonusPercent / 100)) : 0
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
                    status: 'COMPLETED',
                    paymentMethod: 'DIRECT'
                }
            })

            // If there's a bonus, create TOP_UP_BONUS transaction
            if (hasBonus && bonusAmount > 0) {
                await tx.walletTransaction.create({
                    data: {
                        userId: session.user.id,
                        amount: bonusAmount,
                        type: 'TOP_UP_BONUS',
                        description: `Bonus Top-up ${bonusPercent}% sebesar Rp${bonusAmount.toLocaleString('id-ID')}`,
                        status: 'COMPLETED'
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
