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

        if (!voucher) {
            return NextResponse.json({ error: 'Voucher tidak valid atau belum diklaim' }, { status: 400 })
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
