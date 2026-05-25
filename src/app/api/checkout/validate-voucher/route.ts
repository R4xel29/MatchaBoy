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

        const voucher = await prisma.voucher.findUnique({
            where: { code },
            include: { template: true }
        })

        if (!voucher) {
            return NextResponse.json({ error: 'Kode voucher tidak valid' }, { status: 400 })
        }

        if (voucher.userId !== session.user.id) {
            return NextResponse.json({ error: 'Voucher ini tidak valid untuk akun Anda' }, { status: 400 })
        }

        if (voucher.isUsed) {
            return NextResponse.json({ error: 'Voucher sudah digunakan' }, { status: 400 })
        }

        if (voucher.expiresAt && voucher.expiresAt < new Date()) {
            return NextResponse.json({ error: 'Voucher sudah kadaluarsa' }, { status: 400 })
        }

        return NextResponse.json({ 
            success: true, 
            voucher: {
                id: voucher.id,
                code: voucher.code,
                type: voucher.type,
                description: voucher.description,
                discountAmount: voucher.discountAmount,
                minPurchase: voucher.template?.minPurchase || 0,
                maxDiscount: voucher.template?.maxDiscount || null
            }
        })
    } catch (error) {
        console.error('Validate voucher error:', error)
        return NextResponse.json({ error: 'Gagal memvalidasi voucher' }, { status: 500 })
    }
}
