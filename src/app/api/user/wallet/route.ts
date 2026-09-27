import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { ValidationError, getSafeErrorResponse, logError } from '@/lib/errors'
import { incrementQuestProgress } from '@/lib/loyalty-utils'
import {
    buildFallbackQrisString,
    createDokuMcpQrisPayment,
    checkDokuMcpQrisPaymentStatus,
} from '@/lib/doku'
import {
    QRIS_EXPIRE_MINUTES,
    parsePromoPackages,
    isQrisTransactionExpired,
    getQrisExpiresAt,
    calculateTopUpBonus,
    generateServerQrSvgData,
    getCachedWalletPaymentConfig,
} from '@/lib/wallet-utils'
import sharp from 'sharp'

// In-memory cache for client-rendered QRIS PNG downloads & DOKU QR strings (TTL 15 minutes)
const globalForQrisCache = globalThis as unknown as {
    __qrisPngCache?: Map<string, { buffer: Buffer; createdAt: number }>
    __dokuQrContentCache?: Map<string, { qrContent: string; createdAt: number }>
    __dokuQrPromiseCache?: Map<string, Promise<string | null>>
}
const qrisPngCache =
    globalForQrisCache.__qrisPngCache ??
    (globalForQrisCache.__qrisPngCache = new Map<string, { buffer: Buffer; createdAt: number }>())
const dokuQrContentCache =
    globalForQrisCache.__dokuQrContentCache ??
    (globalForQrisCache.__dokuQrContentCache = new Map<string, { qrContent: string; createdAt: number }>())
const dokuQrPromiseCache =
    globalForQrisCache.__dokuQrPromiseCache ??
    (globalForQrisCache.__dokuQrPromiseCache = new Map<string, Promise<string | null>>())

function cleanupQrisCache() {
    const now = Date.now()
    const ttl = 15 * 60 * 1000
    for (const [k, v] of qrisPngCache.entries()) {
        if (now - v.createdAt > ttl) {
            qrisPngCache.delete(k)
        }
    }
    for (const [k, v] of dokuQrContentCache.entries()) {
        if (now - v.createdAt > ttl) {
            dokuQrContentCache.delete(k)
        }
    }
}

async function completeTopUpTransaction(txId: string, settings: any) {
    const bonusPercent = settings?.walletBonusPercent ?? 10

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

        // Authoritative TOCTOU-safe check: count already-completed TOP_UP transactions for this user
        const priorCompletedCount = await prismaTx.walletTransaction.count({
            where: {
                userId: currentTx.userId,
                type: 'TOP_UP',
                status: 'COMPLETED',
                id: { not: currentTx.id },
            },
        })
        const isFirstTimeNow = priorCompletedCount === 0
        const amount = currentTx.amount
        const { bonusAmount, bonusType } = calculateTopUpBonus(amount, isFirstTimeNow, settings)
        const isPromoApplied = bonusType === 'FIRST_TIME'
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
                promoBonus: bonusAmount > 0 ? bonusAmount : null,
            },
        })

        // If this was the user's first completed top-up, recalculate any other still-pending top-ups of this user
        if (isFirstTimeNow) {
            const otherPending = await prismaTx.walletTransaction.findMany({
                where: {
                    userId: currentTx.userId,
                    type: 'TOP_UP',
                    status: { in: ['PENDING', 'VERIFYING'] },
                    id: { not: currentTx.id },
                },
                select: { id: true, amount: true },
            })
            for (const other of otherPending) {
                const nextBonus = calculateTopUpBonus(other.amount, false, settings).bonusAmount
                await prismaTx.walletTransaction.update({
                    where: { id: other.id },
                    data: { promoBonus: nextBonus > 0 ? nextBonus : null },
                })
            }
        }

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

async function buildFallbackServerQrisPng(
    code: string,
    amount: number,
    svgPath?: string | null,
    viewBoxSize?: number,
    qrPayloadOverride?: string | null
): Promise<Buffer> {
    const formattedAmount = `Rp ${amount.toLocaleString('id-ID')}`
    const safeCode = (code || 'AS-TOPUP').replace(/[^A-Za-z0-9-_]/g, '')

    let resolvedPath = svgPath || ''
    let resolvedVb = viewBoxSize && viewBoxSize > 0 ? viewBoxSize : 37

    if (!resolvedPath) {
        const qrContent = qrPayloadOverride || buildFallbackQrisString(amount)
        const generated = generateServerQrSvgData(qrContent)
        resolvedPath = generated.path
        resolvedVb = generated.viewBoxSize
    }

    const qrMarkup = resolvedPath
        ? `<svg x="130" y="190" width="340" height="340" viewBox="0 0 ${resolvedVb} ${resolvedVb}" shape-rendering="crispEdges">
             <rect width="${resolvedVb}" height="${resolvedVb}" fill="#FFFFFF"/>
             <path d="${resolvedPath.replace(/[^MmLlHhVvZz0-9.,\s-]/g, '')}" fill="#111827"/>
           </svg>`
        : `<rect x="150" y="210" width="300" height="300" rx="16" fill="#FFF7ED" stroke="#F97316" stroke-width="4"/>`

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="760" viewBox="0 0 600 760">
      <rect width="600" height="760" fill="#FFFBF5"/>
      <rect x="24" y="24" width="552" height="712" rx="32" fill="#FFFFFF" stroke="#FDE68A" stroke-width="3"/>
      <rect x="24" y="24" width="552" height="116" rx="32" fill="#24160E"/>
      <text x="300" y="72" text-anchor="middle" fill="#FBBF24" font-family="sans-serif" font-size="16" font-weight="bold" letter-spacing="3">ARUM SEDUH • ARUS PAY</text>
      <text x="300" y="108" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="26" font-weight="bold">QRIS PEMBAYARAN TOP UP</text>
      <rect x="114" y="174" width="372" height="372" rx="24" fill="#FFFFFF" stroke="#FDBA74" stroke-width="3"/>
      ${qrMarkup}
      <text x="300" y="590" text-anchor="middle" fill="#6B7280" font-family="sans-serif" font-size="15" font-weight="bold">NOMINAL PEMBAYARAN</text>
      <text x="300" y="632" text-anchor="middle" fill="#EA580C" font-family="sans-serif" font-size="36" font-weight="bold">${formattedAmount}</text>
      <text x="300" y="676" text-anchor="middle" fill="#374151" font-family="monospace" font-size="16" font-weight="bold">Ref: ${safeCode}</text>
      <text x="300" y="706" text-anchor="middle" fill="#9CA3AF" font-family="sans-serif" font-size="13">Berlaku 15 Menit sejak transaksi dibuat</text>
    </svg>`

    return sharp(Buffer.from(svg)).png().toBuffer()
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)

        // Binary PNG attachment download endpoint for QRIS image
        if (searchParams.get('downloadQr') === '1') {
            const code = (searchParams.get('code') || 'TOPUP').replace(/[^A-Za-z0-9-_]/g, '')
            const txId = searchParams.get('transactionId') || code
            const amount = parseInt(searchParams.get('amount') || '0', 10) || 50000
            const svgPath = searchParams.get('path')
            const vbSize = parseInt(searchParams.get('vb') || '37', 10) || 37
            const fileName = `QRIS_ARUSPAY_${code || 'TOPUP'}.png`

            cleanupQrisCache()
            const cached = qrisPngCache.get(txId) || qrisPngCache.get(code)
            let pngBuffer: Buffer
            if (cached) {
                pngBuffer = cached.buffer
            } else {
                const cachedQrContent =
                    dokuQrContentCache.get(txId)?.qrContent ||
                    dokuQrContentCache.get(code)?.qrContent ||
                    null
                pngBuffer = await buildFallbackServerQrisPng(
                    code,
                    amount,
                    svgPath,
                    vbSize,
                    cachedQrContent
                )
            }

            return new NextResponse(new Uint8Array(pngBuffer), {
                status: 200,
                headers: {
                    'Content-Type': 'image/png',
                    'Content-Disposition': `attachment; filename="${fileName}"`,
                    'Content-Length': String(pngBuffer.length),
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                },
            })
        }

        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const transactionId = searchParams.get('transactionId')

        if (transactionId) {
            // Fast background QR-only resolution endpoint for Step 2 dynamic DOKU QRIS upgrade
            if (searchParams.get('qrOnly') === '1') {
                const inFlight = dokuQrPromiseCache.get(transactionId)
                if (inFlight) {
                    await Promise.race([
                        inFlight,
                        new Promise((resolve) => setTimeout(resolve, 3000)),
                    ])
                }
                const resolvedQr = dokuQrContentCache.get(transactionId)?.qrContent || null
                return NextResponse.json({
                    success: true,
                    paymentQrContent: resolvedQr,
                })
            }

            const [initialTx, { settings }, userDb] = await Promise.all([
                prisma.walletTransaction.findUnique({
                    where: { id: transactionId },
                }),
                getCachedWalletPaymentConfig(prisma),
                prisma.user.findUnique({
                    where: { id: session.user.id },
                    select: { walletBalance: true },
                }),
            ])

            let tx = initialTx
            if (!tx || tx.userId !== session.user.id) {
                return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 })
            }

            // Enforce 15-minute expiration on PENDING QRIS transactions
            if (isQrisTransactionExpired(tx)) {
                tx = await prisma.walletTransaction.update({
                    where: { id: tx.id },
                    data: { status: 'REJECTED' },
                })
                return NextResponse.json({
                    success: true,
                    status: 'REJECTED',
                    expired: true,
                    error: 'Batas waktu pembayaran QRIS (15 menit) telah habis. Transaksi dibatalkan otomatis.',
                    amount: tx.amount,
                    promoBonus: tx.promoBonus ?? 0,
                    totalReceived: tx.amount + (tx.promoBonus ?? 0),
                    paymentCode: tx.referenceId,
                    paymentMethod: tx.paymentMethod,
                    balance: userDb?.walletBalance ?? 0,
                })
            }

            // If QRIS is still PENDING and DOKU MCP is configured, check live status with fast timeout (max 1500ms)
            let currentBalance = userDb?.walletBalance ?? 0
            if (
                tx.paymentMethod === 'QRIS' &&
                tx.status === 'PENDING' &&
                settings?.dokuEnabled &&
                settings.dokuClientId &&
                settings.dokuSharedKey
            ) {
                try {
                    const dokuStatus = await Promise.race([
                        checkDokuMcpQrisPaymentStatus(
                            {
                                clientId: settings.dokuClientId,
                                sharedKey: settings.dokuSharedKey,
                                isSandbox: settings.dokuSandbox ?? true,
                            },
                            { invoiceNumber: tx.referenceId || tx.id }
                        ),
                        new Promise<{ paid: false }>((resolve) =>
                            setTimeout(() => resolve({ paid: false }), 1500)
                        ),
                    ])

                    if (dokuStatus.paid) {
                        const completed = await completeTopUpTransaction(tx.id, settings)
                        tx = completed.transaction
                        currentBalance = completed.user?.walletBalance ?? currentBalance
                    }
                } catch (err) {
                    console.warn('[WALLET QRIS STATUS CHECK FALLBACK]', err)
                }
            }

            const bonusAmount = tx.promoBonus ?? 0
            const paymentQrContent =
                dokuQrContentCache.get(tx.id)?.qrContent ||
                (tx.referenceId ? dokuQrContentCache.get(tx.referenceId)?.qrContent : undefined) ||
                buildFallbackQrisString(tx.amount)

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
                expiresAt: tx.paymentMethod === 'QRIS' ? getQrisExpiresAt(tx.createdAt) : null,
                balance: currentBalance,
            })
        }

        const [user, { settings, banks }] = await Promise.all([
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
            getCachedWalletPaymentConfig(prisma),
        ])

        if (!user) {
            return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
        }

        // Derive isFirstTime from already-fetched transactions without an extra DB round-trip when possible
        const hasCompletedInRecent = user.walletTransactions.some(
            (t) => t.type === 'TOP_UP' && t.status === 'COMPLETED'
        )
        let isFirstTime = !hasCompletedInRecent
        if (!hasCompletedInRecent && user.walletTransactions.length >= 30) {
            const completedCount = await prisma.walletTransaction.count({
                where: {
                    userId: session.user.id,
                    type: 'TOP_UP',
                    status: 'COMPLETED',
                },
            })
            isFirstTime = completedCount === 0
        }

        // Auto-expire any PENDING QRIS transactions older than 15 minutes without slowing down response
        const expiredQrisIds: string[] = []
        const normalizedTransactions = user.walletTransactions.map((t) => {
            if (t.type === 'TOP_UP' && isQrisTransactionExpired(t)) {
                expiredQrisIds.push(t.id)
                return { ...t, status: 'REJECTED' }
            }
            return t
        })

        if (expiredQrisIds.length > 0) {
            Promise.resolve().then(() =>
                prisma.walletTransaction
                    .updateMany({
                        where: { id: { in: expiredQrisIds }, status: 'PENDING' },
                        data: { status: 'REJECTED' },
                    })
                    .catch((err) => console.error('[WALLET AUTO EXPIRE QRIS ERROR]', err))
            )
        }

        const parsedPromoPackages = parsePromoPackages(settings?.walletFirstTimePromoPackages)

        const pendingTransactions = normalizedTransactions
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
                paymentQrContent:
                    dokuQrContentCache.get(t.id)?.qrContent ||
                    (t.referenceId ? dokuQrContentCache.get(t.referenceId)?.qrContent : undefined) ||
                    buildFallbackQrisString(t.amount),
                createdAt: t.createdAt,
                expiresAt:
                    (t.paymentMethod || 'QRIS') === 'QRIS'
                        ? getQrisExpiresAt(t.createdAt)
                        : null,
            }))

        return NextResponse.json({
            balance: user.walletBalance,
            transactions: normalizedTransactions,
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
                transferEnabled: (settings?.transferEnabled ?? true) && banks.length > 0,
                dokuEnabled: settings?.dokuEnabled ?? false,
                dokuSandbox: settings?.dokuSandbox ?? true,
                qrisExpireMinutes: QRIS_EXPIRE_MINUTES,
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
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const amount = parseInt(body.amount, 10)
        const rawMethod = String(body.paymentMethod || 'QRIS').toUpperCase()

        if (isNaN(amount) || amount <= 0) {
            throw new ValidationError('Jumlah top-up harus berupa angka positif')
        }

        // Block instant/direct simulation methods for security
        if (rawMethod === 'DIRECT' || rawMethod === 'SIMULATE') {
            throw new ValidationError('Metode pembayaran tidak valid.')
        }

        const normalizedMethod =
            rawMethod === 'BANK' ? 'BANK' : rawMethod === 'OFFLINE' ? 'OFFLINE' : 'QRIS'

        const [{ settings, banks }, completedCount] = await Promise.all([
            getCachedWalletPaymentConfig(prisma),
            prisma.walletTransaction.count({
                where: {
                    userId: session.user.id,
                    type: 'TOP_UP',
                    status: 'COMPLETED',
                },
            }),
        ])

        const minTopUp = settings?.walletMinTopUp ?? 10000
        const topUpEnabled = settings?.walletTopUpEnabled ?? true

        if (!topUpEnabled) {
            throw new ValidationError('Fitur top-up saldo sedang dinonaktifkan sementara.')
        }

        if (amount < minTopUp) {
            throw new ValidationError(`Jumlah pengisian minimal adalah Rp${minTopUp.toLocaleString('id-ID')}`)
        }

        if (normalizedMethod === 'BANK' && (banks.length === 0 || settings?.transferEnabled === false)) {
            throw new ValidationError('Metode Transfer Bank belum tersedia saat ini. Silakan pilih metode lain.')
        }

        const isFirstTime = completedCount === 0
        const { bonusAmount, bonusType } = calculateTopUpBonus(amount, isFirstTime, settings)

        const paymentCode = `AS-TOPUP-${Math.floor(100000 + Math.random() * 900000)}`

        const methodLabel =
            normalizedMethod === 'QRIS'
                ? 'QRIS'
                : normalizedMethod === 'BANK'
                ? 'Transfer Bank'
                : 'Kasir Booth'

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

        const paymentQrContent = buildFallbackQrisString(amount)

        // Fire-and-forget DOKU MCP QRIS generation in background so POST returns immediately (< 100ms)
        if (
            normalizedMethod === 'QRIS' &&
            settings?.dokuEnabled &&
            settings.dokuClientId &&
            settings.dokuSharedKey
        ) {
            const dokuCreds = {
                clientId: settings.dokuClientId,
                sharedKey: settings.dokuSharedKey,
                isSandbox: settings.dokuSandbox ?? true,
            }

            const bgPromise = createDokuMcpQrisPayment(dokuCreds, {
                invoiceNumber: paymentCode,
                amount,
                postalCode: '67215',
            })
                .then((mcpResult) => {
                    if (mcpResult?.qrContent) {
                        cleanupQrisCache()
                        const now = Date.now()
                        dokuQrContentCache.set(transaction.id, {
                            qrContent: mcpResult.qrContent,
                            createdAt: now,
                        })
                        dokuQrContentCache.set(paymentCode, {
                            qrContent: mcpResult.qrContent,
                            createdAt: now,
                        })
                        return mcpResult.qrContent
                    }
                    return null
                })
                .catch((dokuErr) => {
                    console.warn('[WALLET TOPUP DOKU FALLBACK]', dokuErr)
                    return null
                })
                .finally(() => {
                    dokuQrPromiseCache.delete(transaction.id)
                })

            dokuQrPromiseCache.set(transaction.id, bgPromise)
        }

        const expiresAt =
            normalizedMethod === 'QRIS' ? getQrisExpiresAt(transaction.createdAt) : null

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
                qrisImage: settings?.qrisImage || null,
                createdAt: transaction.createdAt,
                expiresAt,
            },
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
        const { transactionId, paymentProofUrl, action, qrImageBase64, paymentCode } = body

        // Cache client-rendered QRIS PNG image for instant HTTP attachment download
        if (action === 'prepare_qr_download' && qrImageBase64) {
            const base64Clean = String(qrImageBase64).replace(/^data:image\/\w+;base64,/, '')
            const buffer = Buffer.from(base64Clean, 'base64')
            cleanupQrisCache()
            if (transactionId) {
                qrisPngCache.set(String(transactionId), { buffer, createdAt: Date.now() })
            }
            if (paymentCode) {
                qrisPngCache.set(String(paymentCode), { buffer, createdAt: Date.now() })
            }
            return NextResponse.json({ success: true })
        }

        if (action === 'simulate') {
            return NextResponse.json(
                { error: 'Simulasi pembayaran instan telah dinonaktifkan demi keamanan.' },
                { status: 403 }
            )
        }

        if (!transactionId) {
            return NextResponse.json({ error: 'transactionId diperlukan' }, { status: 400 })
        }

        const tx = await prisma.walletTransaction.findUnique({
            where: { id: transactionId },
        })

        if (!tx || tx.userId !== session.user.id) {
            return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 })
        }

        // Cancel or expire pending top-up transaction
        if (action === 'cancel' || action === 'expire') {
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

        // Submit payment proof image (ONLY allowed for Transfer Bank / BANK)
        if (!paymentProofUrl) {
            return NextResponse.json({ error: 'Bukti pembayaran (paymentProofUrl) diperlukan' }, { status: 400 })
        }

        if (String(tx.paymentMethod || '').toUpperCase() !== 'BANK') {
            return NextResponse.json(
                { error: 'Fitur unggah bukti pembayaran hanya tersedia untuk metode Transfer Bank.' },
                { status: 400 }
            )
        }

        if (tx.status !== 'PENDING' && tx.status !== 'VERIFYING') {
            return NextResponse.json({ error: 'Transaksi sudah diproses' }, { status: 400 })
        }

        const updatedTx = await prisma.walletTransaction.update({
            where: { id: transactionId },
            data: {
                paymentProofUrl,
                status: 'VERIFYING',
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
                        title: 'Verifikasi Transfer Top Up Arus Pay',
                        message: `${session.user?.name || 'Pelanggan'} mengunggah bukti transfer top up Rp${tx.amount.toLocaleString('id-ID')} (${tx.referenceId}).`,
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
