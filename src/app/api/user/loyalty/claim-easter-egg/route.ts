import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Login diperlukan' }, { status: 401 })
        }

        const userId = session.user.id

        // 1. Fetch LoyaltySettings (which contains our Easter Egg configuration)
        const settings = await prisma.loyaltySettings.findFirst()
        if (!settings) {
            return NextResponse.json({ error: 'Pengaturan loyalty tidak ditemukan' }, { status: 404 })
        }

        const isEnabled = (settings as any).easterEggEnabled !== false
        const codeBase = (settings as any).easterEggVoucherCode || 'EASTERSTELLAR'
        const discount = (settings as any).easterEggDiscount || 15000
        const quota = (settings as any).easterEggQuota || 10

        if (!isEnabled) {
            return NextResponse.json({ error: 'Easter Egg saat ini dinonaktifkan oleh Admin.' }, { status: 400 })
        }

        // Generate the unique user-bound code for the database unique field constraint
        const uniqueVoucherCode = `${codeBase}-${userId}`

        // 2. Check if user already claimed any Easter Egg voucher
        const existingVoucher = await prisma.voucher.findFirst({
            where: {
                userId,
                type: 'CUSTOM',
                description: {
                    startsWith: 'Easter Egg'
                }
            }
        })

        if (existingVoucher) {
            return NextResponse.json({ error: 'Kamu sudah mengklaim voucher rahasia ini! Cek keranjang belanjamu.' }, { status: 400 })
        }

        // 3. Check quota (count total vouchers starting with this code prefix)
        const claimCount = await prisma.voucher.count({
            where: {
                code: {
                    startsWith: `${codeBase}-`
                }
            }
        })

        if (claimCount >= quota) {
            return NextResponse.json({ error: 'Yah, kuota voucher rahasia ini sudah habis diperebutkan! Coba lagi lain kali.' }, { status: 400 })
        }

        // 4. Create the customer-bound Voucher record in DB
        await prisma.voucher.create({
            data: {
                userId,
                code: uniqueVoucherCode,
                type: 'CUSTOM',
                description: `Easter Egg Stellar Discount (Diskon Rp ${discount.toLocaleString('id-ID')})`,
                discountAmount: discount,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Valid for 30 days
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Selamat! Voucher rahasia berhasil diklaim!',
            voucherCode: uniqueVoucherCode,
            discount
        })
    } catch (error) {
        console.error('Claim easter egg voucher error:', error)
        return NextResponse.json({ error: 'Gagal mengklaim voucher rahasia' }, { status: 500 })
    }
}
