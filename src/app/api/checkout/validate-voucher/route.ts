import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const session = await auth()
        const body = await req.json()

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Login diperlukan' }, { status: 401 })
        }

        const { code } = body
        if (!code) {
            return NextResponse.json({ error: 'Kode voucher kosong' }, { status: 400 })
        }

        const cleanCode = code.trim().toUpperCase()

        // 1. Check if the user already has a claimed unused voucher matching either the instance code or the template code
        let voucher = await prisma.voucher.findFirst({
            where: {
                userId: session.user.id,
                isUsed: false,
                OR: [
                    { code: cleanCode },
                    { template: { code: cleanCode } }
                ]
            },
            include: { template: true }
        })

        // 2. If no claimed voucher is found, check if a claimable master template exists
        if (!voucher) {
            const template = await prisma.voucherTemplate.findUnique({
                where: { code: cleanCode }
            })

            if (template) {
                // Check if user has already claimed from this template
                const alreadyClaimed = await prisma.voucher.findFirst({
                    where: {
                        userId: session.user.id,
                        templateId: template.id
                    }
                })

                if (alreadyClaimed) {
                    return NextResponse.json({ error: 'Anda sudah pernah mengklaim voucher ini' }, { status: 400 })
                }

                // Validate targetNewUserOnly (registration < 14 days)
                if (template.targetNewUserOnly) {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: session.user.id },
                        select: { createdAt: true }
                    })
                    if (dbUser) {
                        const now = new Date()
                        const diffTime = now.getTime() - new Date(dbUser.createdAt).getTime()
                        const diffDays = diffTime / (1000 * 60 * 60 * 24)
                        if (diffDays > 14) {
                            return NextResponse.json({ error: 'Voucher hanya berlaku untuk pengguna baru (daftar < 14 hari)' }, { status: 400 })
                        }
                    }
                }

                // Validate template expiration
                if (template.expiresAt && template.expiresAt < new Date()) {
                    return NextResponse.json({ error: 'Masa berlaku voucher ini sudah habis' }, { status: 400 })
                }

                // Validate usage limit
                if (template.usageLimit > 0 && template.usageCount >= template.usageLimit) {
                    return NextResponse.json({ error: 'Kuota penukaran voucher ini sudah habis' }, { status: 400 })
                }

                // Auto-claim the voucher inside a transaction with proper row locking
                voucher = await prisma.$transaction(async (tx) => {
                    // Lock template row to prevent race condition (overclaiming)
                    const templates = await tx.$queryRaw<any[]>`
                        SELECT * FROM "VoucherTemplate" 
                        WHERE id = ${template.id} 
                        FOR UPDATE
                    `
                    const t = templates?.[0]
                    if (!t) throw new Error('Template tidak ditemukan')

                    // Re-validate quota after locking
                    if (t.usageLimit > 0 && t.usageCount >= t.usageLimit) {
                        throw new Error('Kuota penukaran voucher ini sudah habis')
                    }

                    // Increment template claim count
                    await tx.voucherTemplate.update({
                        where: { id: t.id },
                        data: { usageCount: { increment: 1 } }
                    })

                    // Calculate personal expiry: template expiry or default 30 days
                    let expiresAt = t.expiresAt
                    if (!expiresAt) {
                        const d = new Date()
                        d.setDate(d.getDate() + 30) // Default 30 days
                        expiresAt = d
                    }

                    // Determine discountAmount
                    let discountAmount = t.discountValue
                    if (t.type === 'FREE_DRINK' && !discountAmount) {
                        discountAmount = 25000
                    } else if (t.type === 'FREE_TOPPING' && !discountAmount) {
                        discountAmount = 3000
                    } else if (t.type === 'UPGRADE_SIZE' && !discountAmount) {
                        discountAmount = 5000
                    }

                    // Generate a unique voucher instance code with a longer suffix to prevent collisions (M9)
                    const userVoucherCode = `${t.code}-${Math.random().toString(36).substring(2, 12).toUpperCase()}`

                    // Create personal voucher
                    return tx.voucher.create({
                        data: {
                            userId: session.user.id,
                            code: userVoucherCode,
                            type: t.type,
                            description: t.description,
                            discountAmount,
                            expiresAt,
                            templateId: t.id,
                            isUsed: false
                        },
                        include: { template: true }
                    })
                })
            }
        }

        if (!voucher) {
            return NextResponse.json({ error: 'Kode voucher tidak valid atau tidak ditemukan' }, { status: 400 })
        }

        if (voucher.isUsed) {
            return NextResponse.json({ error: 'Voucher sudah digunakan' }, { status: 400 })
        }

        if (voucher.expiresAt && voucher.expiresAt < new Date()) {
            return NextResponse.json({ error: 'Voucher sudah kadaluarsa' }, { status: 400 })
        }

        let validProductIds: string[] = []
        let validProductNames: string[] = []
        if (voucher.template?.validProductIds) {
            try {
                const parsed = JSON.parse(voucher.template.validProductIds)
                if (Array.isArray(parsed)) {
                    validProductIds = parsed
                    const products = await prisma.product.findMany({
                        where: { id: { in: validProductIds } },
                        select: { name: true }
                    })
                    validProductNames = products.map(p => p.name)
                }
            } catch (e) {
                console.error('Error parsing validProductIds:', e)
            }
        }

        // Return unified voucher shape
        return NextResponse.json({ 
            success: true, 
            voucher: {
                id: voucher.id,
                code: voucher.code,
                type: voucher.type,
                description: voucher.description,
                discountAmount: voucher.discountAmount || voucher.template?.discountValue || 0,
                minPurchase: voucher.template?.minPurchase || 0,
                maxDiscount: voucher.template?.maxDiscount || null,
                validProductIds,
                validProductNames,
                template: voucher.template ? {
                    discountValue: voucher.template.discountValue,
                    minPurchase: voucher.template.minPurchase,
                    maxDiscount: voucher.template.maxDiscount,
                    validProductIds: voucher.template.validProductIds
                } : null
            }
        })
    } catch (error: any) {
        console.error('Validate voucher error:', error)
        return NextResponse.json({ error: error.message || 'Gagal memvalidasi voucher' }, { status: 500 })
    }
}
