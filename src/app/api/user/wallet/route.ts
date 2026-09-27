import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { ValidationError, getSafeErrorResponse, logError } from '@/lib/errors'
import { incrementQuestProgress } from '@/lib/loyalty-utils'
import {
    buildFallbackQrisString,
    createDokuMcpQrisPayment,
    checkDokuMcpQrisPaymentStatus,
    createDokuCheckoutSession,
} from '@/lib/doku'

interface PromoPackage {
    amount: number
    bonus: number
}

function parsePromoPackages(raw?: string | null): PromoPackage[] {
    const fallback: PromoPackage[] = [
        { amount: 50000, bonus: 5000 },
        { amount: 200000, bonus: 10000 },
    ]
    if (!raw) return fallback
    try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((p: any) => ({
                amount: Number(p.amount) || 0,
                bonus: Number(p.bonus) || 0,
            }))
        }
        return fallback
    } catch {
        return fallback
    }
}

function calculateTopUpBonus(
    amount: number,
    isFirstTime: boolean,
    settings: any
): { bonusAmount: number; isPromoApplied: boolean; bonusType: 'FIRST_TIME' | 'REGULAR' | 'NONE' } {
    const bonusMinAmount = settings?.walletBonusMinAmount ?? 100000
    const bonusPercent = settings?.walletBonusPercent ?? 10
    const bonusMode = settings?.walletBonusMode ?? 'BOTH'
    const firstTimePromoEnabled = settings?.walletFirstTimePromoEnabled ?? true
    const promoPackages = parsePromoPackages(settings?.walletFirstTimePromoPackages)

    const isFirstTimeMode = bonusMode === 'FIRST_TIME' || bonusMode === 'BOTH'
    const isRegularMode = bonusMode === 'REGULAR' || bonusMode === 'BOTH'

    if (isFirstTime && isFirstTimeMode && firstTimePromoEnabled) {
        const matchedPackage = promoPackages.find((pkg) => Number(pkg.amount) === amount)
        if (matchedPackage && matchedPackage.bonus > 0) {
            return {
                bonusAmount: matchedPackage.bonus,
                isPromoApplied: true,
                bonusType: 'FIRST_TIME',
            }
        }
    }

    if (isRegularMode && bonusPercent > 0 && amount >= bonusMinAmount) {
        const regularBonus = Math.floor(amount * (bonusPercent / 100))
        if (regularBonus > 0) {
            return {
                bonusAmount: regularBonus,
                isPromoApplied: false,
                bonusType: 'REGULAR',
            }
        }
    }

    return { bonusAmount: 0, isPromoApplied: false, bonusType: 'NONE' }
}

async function completeTopUpTransaction(txId: string, settings: any) {
    const bonusMinAmount = settings?.walletBonusMinAmount ?? 100000
    const bonusPercent = settings?.walletBonusPercent ?? 10
    const bonusMode = settings?.walletBonusMode ?? 'BOTH'
    const isPromoActiveMode = bonusMode === 'FIRST_TIME' || bonusMode === 'BOTH'
    const isRegularActiveMode = bonusMode === 'REGULAR' || bonusMode === 'BOTH'

    return prisma.$transaction(async (prismaTx) => {
        const currentTx = await prismaTx.walletTransaction.findUnique({
            where: { id: txId },
        })

        if (!currentTx) {
            throw new ValidationError('Transaksi tidak ditemukan')
        }

        if (currentTx.status === 'COMPLETED') {
            const existingUser = await prismaTx.user.findUnique({
                where: { id: currentTx.userId },
                select: { walletBalance: true },
            })
            const existingBonus = currentTx.promoBonus ?? 0
            return {
                user: existingUser,
                transaction: currentTx,
                bonusAmount: existingBonus,
                totalTopUp: currentTx.amount + existingBonus,
                alreadyCompleted: true,
            }
        }

        const amount = currentTx.amount
        const hasStoredBonus = currentTx.promoBonus !== null && currentTx.promoBonus !== undefined && currentTx.promoBonus > 0
        const isPromoApplied = isPromoActiveMode && hasStoredBonus
        const hasRegularBonus = isRegularActiveMode && bonusPercent > 0 && amount >= bonusMinAmount
        const bonusAmount = hasStoredBonus
            ? currentTx.promoBonus!
            : hasRegularBonus
            ? Math.floor(amount * (bonusPercent / 100))
            : 0
        const totalTopUp = amount + bonusAmount

        const updatedUser = await prismaTx.user.update({
            where: { id: currentTx.userId },
            data: { walletBalance: { increment: totalTopUp } },
            select: { id: true, name: true, walletBalance: true },
        })

        const completedTx = await prismaTx.walletTransaction.update({
            where: { id: currentTx.id },
            data: {
                status: 'COMPLETED',
                promoBonus: bonusAmount > 0 ? bonusAmount : currentTx.promoBonus,
            },
        })

        if (bonusAmount > 0) {
            await prismaTx.walletTransaction.create({
                data: {
                    userId: currentTx.userId,
                    amount: bonusAmount,
                    type: 'TOP_UP_BONUS',
                    description: isPromoApplied
                        ? `Bonus Top-Up Pertama Arus Pay +Rp${bonusAmount.toLocaleString('id-ID')}`
                        : `Bonus Top-Up Arus Pay (${bonusPercent}%) +Rp${bonusAmount.toLocaleString('id-ID')}`,
                    status: 'COMPLETED',
                    paymentMethod: currentTx.paymentMethod,
                    referenceId: currentTx.referenceId,
                },
            })
        }

        await incrementQuestProgress(currentTx.userId, 'TOP_UP_COUNT', 1, prismaTx)

        return {
            user: updatedUser,
            transaction: completedTx,
            bonusAmount,
            totalTopUp,
            alreadyCompleted: false,
        }
    })
}

export async function GET(req: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const transactionId = searchParams.get('transactionId')

        if (transactionId) {
            let tx = await prisma.walletTransaction.findUnique({
                where: { id: transactionId },
            })
            if (!tx || tx.userId !== session.user.id) {
                return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 })
            }

            const settings = await prisma.paymentSettings.findFirst()

            // If QRIS is still PENDING/VERIFYING and DOKU MCP is configured, check live status non-fatally
            if (
                tx.paymentMethod === 'QRIS' &&
                (tx.status === 'PENDING' || tx.status === 'VERIFYING') &&
                settings?.dokuEnabled &&
                settings.dokuClientId &&
                settings.dokuSharedKey
            ) {
                try {
                    const dokuStatus = await checkDokuMcpQrisPaymentStatus(
                        {
                            clientId: settings.dokuClientId,
                            sharedKey: settings.dokuSharedKey,
                            isSandbox: settings.dokuSandbox ?? true,
                        },
                        { invoiceNumber: tx.referenceId || tx.id }
                    )

                    if (dokuStatus.paid) {
                        const completed = await completeTopUpTransaction(tx.id, settings)
                        tx = completed.transaction
                    }
                } catch (err) {
                    console.warn('[WALLET QRIS STATUS CHECK FALLBACK]', err)
                }
            }

            const userDb = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { walletBalance: true },
            })

            const bonusAmount = tx.promoBonus ?? 0
            const paymentQrContent = buildFallbackQrisString(tx.amount)

            return NextResponse.json({
                success: true,
                status: tx.status,
                amount: tx.amount,
                promoBonus: bonusAmount,
                totalReceived: tx.amount + bonusAmount,
                paymentCode: tx.referenceId,
                paymentMethod: tx.paymentMethod,
                paymentProofUrl: tx.paymentProofUrl,
                paymentQrContent,
                qrisImage: settings?.qrisImage || null,
                balance: userDb?.walletBalance ?? 0,
            })
        }

        const [user, settings, banks, completedCount] = await Promise.all([
            prisma.user.findUnique({
                where: { id: session.user.id },
                select: {
                    walletBalance: true,
                    walletTransactions: {
                        orderBy: { createdAt: 'desc' },
                        take: 30,
                    },
                },
            }),
            prisma.paymentSettings.findFirst(),
            prisma.bankAccount.findMany({
                where: { isActive: true },
                orderBy: { order: 'asc' },
            }),
            prisma.walletTransaction.count({
                where: {
                    userId: session.user.id,
                    type: 'TOP_UP',
                    status: 'COMPLETED',
                },
            }),
        ])

        if (!user) {
            return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
        }

        const isFirstTime = completedCount === 0
        const parsedPromoPackages = parsePromoPackages(settings?.walletFirstTimePromoPackages)

        const pendingTransactions = user.walletTransactions
            .filter((t) => t.type === 'TOP_UP' && (t.status === 'PENDING' || t.status === 'VERIFYING'))
            .map((t) => ({
                id: t.id,
                amount: t.amount,
                promoBonus: t.promoBonus ?? 0,
                totalReceived: t.amount + (t.promoBonus ?? 0),
                paymentCode: t.referenceId,
                status: t.status,
                paymentMethod: t.paymentMethod || 'QRIS',
                paymentProofUrl: t.paymentProofUrl,
                paymentQrContent: buildFallbackQrisString(t.amount),
                createdAt: t.createdAt,
            }))

        return NextResponse.json({
            balance: user.walletBalance,
            transactions: user.walletTransactions,
            pendingTransactions,
            banks,
            isFirstTime,
            settings: {
                minTopUp: settings?.walletMinTopUp ?? 10000,
                bonusMinAmount: settings?.walletBonusMinAmount ?? 100000,
                bonusPercent: settings?.walletBonusPercent ?? 10,
                topUpEnabled: settings?.walletTopUpEnabled ?? true,
                bonusMode: settings?.walletBonusMode ?? 'BOTH',
                firstTimePromoEnabled: settings?.walletFirstTimePromoEnabled ?? true,
                firstTimePromoPackages: parsedPromoPackages,
                qrisEnabled: settings?.qrisEnabled ?? true,
                qrisImage: settings?.qrisImage ?? null,
                transferEnabled: settings?.transferEnabled ?? true,
                dokuEnabled: settings?.dokuEnabled ?? false,
                dokuSandbox: settings?.dokuSandbox ?? true,
            },
        })
    } catch (error) {
        logError(error, { route: 'user/wallet-get' })
        const safeError = getSafeErrorResponse(error)
        return NextResponse.json(
            { error: safeError.message, code: safeError.code },
            { status: safeError.statusCode }
        )
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth()
        const requestHeaders = new Headers(req.headers)
        const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || 'localhost:3000'
        const protocol = requestHeaders.get('x-forwarded-proto') || 'http'
        const appUrl = `${protocol}://${host}`

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const amount = parseInt(body.amount)
        const paymentMethod = body.paymentMethod // e.g. 'qris' | 'bank' | 'offline' | 'DIRECT'

        if (isNaN(amount) || amount <= 0) {
            throw new ValidationError('Jumlah top-up harus berupa angka positif')
        }

        const settings = await prisma.paymentSettings.findFirst()
        const minTopUp = settings?.walletMinTopUp ?? 10000
        const topUpEnabled = settings?.walletTopUpEnabled ?? true

        if (!topUpEnabled) {
            throw new ValidationError('Fitur top-up saldo sedang dinonaktifkan sementara.')
        }

        if (amount < minTopUp) {
            throw new ValidationError(`Jumlah pengisian minimal adalah Rp${minTopUp.toLocaleString('id-ID')}`)
        }

        const completedCount = await prisma.walletTransaction.count({
            where: {
                userId: session.user.id,
                type: 'TOP_UP',
                status: 'COMPLETED',
            },
        })
        const isFirstTime = completedCount === 0

        const { bonusAmount, isPromoApplied, bonusType } = calculateTopUpBonus(amount, isFirstTime, settings)

        // Interactive multi-method top-up flow (QRIS, BANK, OFFLINE)
        if (paymentMethod && paymentMethod.toUpperCase() !== 'DIRECT') {
            const normalizedMethod = paymentMethod.toUpperCase()
            const paymentCode = `AS-TOPUP-${Math.floor(100000 + Math.random() * 900000)}`

            const methodLabel =
                normalizedMethod === 'QRIS'
                    ? 'QRIS'
                    : normalizedMethod === 'BANK'
                    ? 'Transfer Bank'
                    : normalizedMethod === 'OFFLINE'
                    ? 'Kasir Booth'
                    : normalizedMethod

            const bonusLabel =
                bonusAmount > 0
                    ? bonusType === 'FIRST_TIME'
                        ? ` (+Bonus Promo Pertama Rp${bonusAmount.toLocaleString('id-ID')})`
                        : ` (+Bonus Rp${bonusAmount.toLocaleString('id-ID')})`
                    : ''

            const transaction = await prisma.walletTransaction.create({
                data: {
                    userId: session.user.id,
                    amount,
                    type: 'TOP_UP',
                    description: `Top Up Arus Pay Rp${amount.toLocaleString('id-ID')} via ${methodLabel}${bonusLabel}`,
                    status: 'PENDING',
                    paymentMethod: normalizedMethod,
                    referenceId: paymentCode,
                    promoBonus: bonusAmount > 0 ? bonusAmount : null,
                },
            })

            let paymentQrContent = buildFallbackQrisString(amount)
            let paymentUrl = ''

            if (
                (normalizedMethod === 'QRIS' || normalizedMethod === 'DOKU') &&
                settings?.dokuEnabled &&
                settings.dokuClientId &&
                settings.dokuSharedKey
            ) {
                try {
                    const dokuCreds = {
                        clientId: settings.dokuClientId,
                        sharedKey: settings.dokuSharedKey,
                        isSandbox: settings.dokuSandbox ?? true,
                    }

                    const mcpResult = await createDokuMcpQrisPayment(dokuCreds, {
                        invoiceNumber: paymentCode,
                        amount,
                        postalCode: '67215',
                    })

                    if (mcpResult.qrContent) {
                        paymentQrContent = mcpResult.qrContent
                    } else if (normalizedMethod === 'DOKU') {
                        const userDb = await prisma.user.findUnique({
                            where: { id: session.user.id },
                            select: { phone: true, name: true, email: true },
                        })
                        const dokuResult = await createDokuCheckoutSession(dokuCreds, {
                            invoiceNumber: paymentCode,
                            amount,
                            customerName: userDb?.name || session.user.name || 'Pelanggan Arum Seduh',
                            customerPhone: userDb?.phone || '628123456789',
                            customerEmail: userDb?.email || session.user.email || 'arumseduh@gmail.com',
                            callbackUrl: `${appUrl}/profile`,
                            notificationUrl: `${appUrl}/api/payment/doku-webhook`,
                        })
                        if (dokuResult.url) {
                            paymentUrl = dokuResult.url
                        }
                    }
                } catch (dokuErr) {
                    console.warn('[WALLET TOPUP DOKU FALLBACK]', dokuErr)
                }
            }

            return NextResponse.json({
                success: true,
                transaction: {
                    id: transaction.id,
                    amount: transaction.amount,
                    promoBonus: bonusAmount,
                    totalReceived: transaction.amount + bonusAmount,
                    paymentCode: transaction.referenceId,
                    status: transaction.status,
                    paymentMethod: transaction.paymentMethod,
                    paymentQrContent,
                    paymentUrl,
                    qrisImage: settings?.qrisImage || null,
                    createdAt: transaction.createdAt,
                },
            })
        }

        // Direct / Instant credit flow (when paymentMethod is omitted or 'DIRECT')
        const totalTopUp = amount + bonusAmount
        const bonusPercent = settings?.walletBonusPercent ?? 10

        const updatedUser = await prisma.$transaction(async (tx) => {
            const user = await tx.user.update({
                where: { id: session.user.id },
                data: {
                    walletBalance: { increment: totalTopUp },
                },
            })

            await tx.walletTransaction.create({
                data: {
                    userId: session.user.id,
                    amount,
                    type: 'TOP_UP',
                    description: isPromoApplied
                        ? `Top Up Arus Pay Rp${amount.toLocaleString('id-ID')} (Promo Pertama)`
                        : `Top Up Arus Pay Rp${amount.toLocaleString('id-ID')}`,
                    status: 'COMPLETED',
                    paymentMethod: 'DIRECT',
                    promoBonus: bonusAmount > 0 ? bonusAmount : null,
                },
            })

            if (bonusAmount > 0) {
                await tx.walletTransaction.create({
                    data: {
                        userId: session.user.id,
                        amount: bonusAmount,
                        type: 'TOP_UP_BONUS',
                        description: isPromoApplied
                            ? `Bonus Top-Up Pertama Arus Pay +Rp${bonusAmount.toLocaleString('id-ID')}`
                            : `Bonus Top-Up Arus Pay (${bonusPercent}%) +Rp${bonusAmount.toLocaleString('id-ID')}`,
                        status: 'COMPLETED',
                        paymentMethod: 'DIRECT',
                    },
                })
            }

            await incrementQuestProgress(session.user.id, 'TOP_UP_COUNT', 1, tx)

            return user
        })

        return NextResponse.json({
            success: true,
            balance: updatedUser.walletBalance,
            amount,
            bonusAmount,
            totalReceived: totalTopUp,
        })
    } catch (error) {
        logError(error, { route: 'user/wallet-post' })
        const safeError = getSafeErrorResponse(error)
        return NextResponse.json(
            { error: safeError.message, code: safeError.code },
            { status: safeError.statusCode }
        )
    }
}

export async function PUT(req: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { transactionId, paymentProofUrl, action, paymentMethod } = body

        if (!transactionId) {
            return NextResponse.json({ error: 'transactionId diperlukan' }, { status: 400 })
        }

        const tx = await prisma.walletTransaction.findUnique({
            where: { id: transactionId },
        })

        if (!tx || tx.userId !== session.user.id) {
            return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 })
        }

        // Action 1: Instant simulation / approval (Sandbox & Demo flow)
        if (action === 'simulate') {
            if (tx.status !== 'PENDING' && tx.status !== 'VERIFYING') {
                return NextResponse.json({ error: 'Transaksi sudah selesai diproses' }, { status: 400 })
            }

            const settings = await prisma.paymentSettings.findFirst()
            const completed = await completeTopUpTransaction(tx.id, settings)

            return NextResponse.json({
                success: true,
                status: 'COMPLETED',
                balance: completed.user?.walletBalance ?? 0,
                amount: tx.amount,
                bonusAmount: completed.bonusAmount,
                totalReceived: completed.totalTopUp,
                transaction: completed.transaction,
            })
        }

        // Action 2: Cancel pending top-up transaction
        if (action === 'cancel') {
            if (tx.status !== 'PENDING' && tx.status !== 'VERIFYING') {
                return NextResponse.json({ error: 'Transaksi sudah diproses' }, { status: 400 })
            }

            const cancelledTx = await prisma.walletTransaction.update({
                where: { id: transactionId },
                data: { status: 'REJECTED' },
            })

            return NextResponse.json({
                success: true,
                status: cancelledTx.status,
            })
        }

        // Action 3: Switch payment method on an active PENDING transaction
        if (action === 'change_method' && paymentMethod) {
            if (tx.status !== 'PENDING') {
                return NextResponse.json({ error: 'Transaksi sudah diproses' }, { status: 400 })
            }

            const normalizedMethod = String(paymentMethod).toUpperCase()
            const methodLabel =
                normalizedMethod === 'QRIS'
                    ? 'QRIS'
                    : normalizedMethod === 'BANK'
                    ? 'Transfer Bank'
                    : normalizedMethod === 'OFFLINE'
                    ? 'Kasir Booth'
                    : normalizedMethod

            const updatedTx = await prisma.walletTransaction.update({
                where: { id: transactionId },
                data: {
                    paymentMethod: normalizedMethod,
                    description: tx.description.replace(/via (QRIS|Transfer Bank|Kasir Booth|BANK|OFFLINE)/i, `via ${methodLabel}`),
                },
            })

            return NextResponse.json({
                success: true,
                transaction: {
                    id: updatedTx.id,
                    status: updatedTx.status,
                    paymentMethod: updatedTx.paymentMethod,
                },
            })
        }

        // Action 4: Submit payment proof image
        if (!paymentProofUrl) {
            return NextResponse.json({ error: 'Bukti pembayaran (paymentProofUrl) diperlukan' }, { status: 400 })
        }

        if (tx.status !== 'PENDING' && tx.status !== 'VERIFYING') {
            return NextResponse.json({ error: 'Transaksi sudah diproses' }, { status: 400 })
        }

        const updatedTx = await prisma.walletTransaction.update({
            where: { id: transactionId },
            data: {
                paymentProofUrl,
                status: 'VERIFYING',
                ...(paymentMethod ? { paymentMethod: String(paymentMethod).toUpperCase() } : {}),
            },
        })

        // Notify admins in background (fire-and-forget per Rule 4)
        Promise.resolve().then(async () => {
            try {
                const { sendNotification } = await import('@/lib/notification-service')
                const admins = await prisma.user.findMany({
                    where: { role: { in: ['ADMIN', 'CASHIER'] } },
                    select: { id: true },
                })
                for (const admin of admins) {
                    await sendNotification({
                        userId: admin.id,
                        type: 'system',
                        title: 'Verifikasi Top Up Arus Pay',
                        message: `${session.user?.name || 'Pelanggan'} mengunggah bukti top up Rp${tx.amount.toLocaleString('id-ID')} (${tx.referenceId}).`,
                        linkUrl: '/admin/wallet',
                        data: { transactionId: tx.id },
                    })
                }
            } catch (notifErr) {
                console.error('[WALLET PROOF NOTIF ERROR]', notifErr)
            }
        })

        return NextResponse.json({
            success: true,
            transaction: {
                id: updatedTx.id,
                status: updatedTx.status,
                paymentProofUrl: updatedTx.paymentProofUrl,
                paymentMethod: updatedTx.paymentMethod,
            },
        })
    } catch (error) {
        logError(error, { route: 'user/wallet-put' })
        const safeError = getSafeErrorResponse(error)
        return NextResponse.json(
            { error: safeError.message, code: safeError.code },
            { status: safeError.statusCode }
        )
    }
}
