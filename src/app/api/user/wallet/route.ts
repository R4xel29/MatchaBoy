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

        const completedCount = await prisma.walletTransaction.count({
            where: {
                userId: session.user.id,
                type: 'TOP_UP',
                status: 'COMPLETED'
            }
        });
        const isFirstTime = completedCount === 0;

        let parsedPromoPackages = [];
        try {
            if (settings?.walletFirstTimePromoPackages) {
                parsedPromoPackages = JSON.parse(settings.walletFirstTimePromoPackages);
            } else {
                parsedPromoPackages = [
                    { amount: 50000, bonus: 5000 },
                    { amount: 200000, bonus: 10000 }
                ];
            }
        } catch (e) {
            console.error('Error parsing first-time promo packages:', e);
            parsedPromoPackages = [
                { amount: 50000, bonus: 5000 },
                { amount: 200000, bonus: 10000 }
            ];
        }

        return NextResponse.json({
            balance: user.walletBalance,
            transactions: user.walletTransactions,
            banks: banks,
            isFirstTime: isFirstTime,
            settings: {
                minTopUp: settings?.walletMinTopUp ?? 10000,
                bonusMinAmount: settings?.walletBonusMinAmount ?? 100000,
                bonusPercent: settings?.walletBonusPercent ?? 10,
                topUpEnabled: settings?.walletTopUpEnabled ?? true,
                firstTimePromoEnabled: settings?.walletFirstTimePromoEnabled ?? true,
                firstTimePromoPackages: parsedPromoPackages
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

        // Check if first-time top-up promo is enabled and active
        const completedCount = await prisma.walletTransaction.count({
            where: {
                userId: session.user.id,
                type: 'TOP_UP',
                status: 'COMPLETED'
            }
        });
        const isFirstTime = completedCount === 0;

        let calculatedPromoBonus = 0;
        let isPromoApplied = false;

        if (isFirstTime && settings?.walletFirstTimePromoEnabled) {
            let promoPackages = [];
            try {
                if (settings?.walletFirstTimePromoPackages) {
                    promoPackages = JSON.parse(settings.walletFirstTimePromoPackages);
                }
            } catch (e) {
                console.error('Error parsing first-time promo packages in POST:', e);
            }

            const matchedPackage = promoPackages.find((pkg: any) => pkg.amount === amount);
            if (matchedPackage) {
                calculatedPromoBonus = matchedPackage.bonus;
                isPromoApplied = true;
            }
        }

        // If payment method is specified and not DIRECT, create a PENDING transaction
        if (paymentMethod && paymentMethod !== 'DIRECT') {
            const paymentCode = `MB-TOPUP-${Math.floor(1000 + Math.random() * 9000)}`
            
            const transaction = await prisma.walletTransaction.create({
                data: {
                    userId: session.user.id,
                    amount: amount,
                    type: 'TOP_UP',
                    description: isPromoApplied 
                        ? `Top-up wallet sebesar Rp${amount.toLocaleString('id-ID')} via ${paymentMethod.toUpperCase()} (Promo Pertama)` 
                        : `Top-up wallet sebesar Rp${amount.toLocaleString('id-ID')} via ${paymentMethod.toUpperCase()}`,
                    status: 'PENDING',
                    paymentMethod: paymentMethod.toUpperCase(),
                    referenceId: paymentCode,
                    promoBonus: isPromoApplied ? calculatedPromoBonus : null
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
        const hasBonus = isPromoApplied || amount >= bonusMinAmount
        const bonusAmount = isPromoApplied ? calculatedPromoBonus : (hasBonus ? Math.floor(amount * (bonusPercent / 100)) : 0)
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
                    description: isPromoApplied
                        ? `Top-up wallet sebesar Rp${amount.toLocaleString('id-ID')} (Promo Pertama)`
                        : `Top-up wallet sebesar Rp${amount.toLocaleString('id-ID')}`,
                    status: 'COMPLETED',
                    paymentMethod: 'DIRECT',
                    promoBonus: isPromoApplied ? calculatedPromoBonus : null
                }
            })

            // If there's a bonus, create TOP_UP_BONUS transaction
            if (bonusAmount > 0) {
                await tx.walletTransaction.create({
                    data: {
                        userId: session.user.id,
                        amount: bonusAmount,
                        type: 'TOP_UP_BONUS',
                        description: isPromoApplied
                            ? `Bonus Top-up Pertama sebesar Rp${bonusAmount.toLocaleString('id-ID')}`
                            : `Bonus Top-up ${bonusPercent}% sebesar Rp${bonusAmount.toLocaleString('id-ID')}`,
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
