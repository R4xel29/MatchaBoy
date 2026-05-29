import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// Rate limiting helper
const easterEggAttempts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userAttempts = easterEggAttempts.get(userId)
  
  if (!userAttempts || now > userAttempts.resetAt) {
    easterEggAttempts.set(userId, { count: 1, resetAt: now + 60000 })
    return true
  }
  
  if (userAttempts.count >= 3) {
    return false
  }
  
  userAttempts.count++
  return true
}

export async function POST() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Login diperlukan' }, { status: 401 })
        }

        const userId = session.user.id

        // SECURITY FIX #4: Rate limiting
        if (!checkRateLimit(userId)) {
            return NextResponse.json({ error: 'Terlalu banyak percobaan. Tunggu 1 menit.' }, { status: 429 })
        }

        // SECURITY FIX #2: Use transaction with proper locking
        const result = await prisma.$transaction(async (tx) => {
            // 1. Lock settings row to prevent race condition
            const settings = await tx.$queryRaw<Array<{
                id: string
                easterEggEnabled: boolean
                easterEggVoucherCode: string
                easterEggDiscount: number
                easterEggQuota: number
            }>>`
                SELECT * FROM "LoyaltySettings"
                LIMIT 1
                FOR UPDATE
            `

            if (!settings || settings.length === 0) {
                throw new Error('Pengaturan loyalty tidak ditemukan')
            }

            const setting = settings[0]
            const isEnabled = setting.easterEggEnabled !== false
            const codeBase = setting.easterEggVoucherCode || 'EASTERSTELLAR'
            const discount = setting.easterEggDiscount || 15000
            const quota = setting.easterEggQuota || 10

            if (!isEnabled) {
                throw new Error('Easter Egg saat ini dinonaktifkan oleh Admin.')
            }

            // 2. Check if user already claimed (inside transaction)
            const existingVoucher = await tx.voucher.findFirst({
                where: {
                    userId,
                    type: 'CUSTOM',
                    description: {
                        startsWith: 'Easter Egg'
                    }
                }
            })

            if (existingVoucher) {
                throw new Error('Kamu sudah mengklaim voucher rahasia ini! Cek keranjang belanjamu.')
            }

            // 3. Count and check quota (inside transaction with lock)
            const claimCount = await tx.voucher.count({
                where: {
                    code: {
                        startsWith: `${codeBase}-`
                    }
                }
            })

            if (claimCount >= quota) {
                throw new Error('Yah, kuota voucher rahasia ini sudah habis diperebutkan! Coba lagi lain kali.')
            }

            // 4. Generate unique code
            const uniqueVoucherCode = `${codeBase}-${userId}`

            // 5. Create voucher
            const voucher = await tx.voucher.create({
                data: {
                    userId,
                    code: uniqueVoucherCode,
                    type: 'CUSTOM',
                    description: `Easter Egg Stellar Discount (Diskon Rp ${discount.toLocaleString('id-ID')})`,
                    discountAmount: discount,
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Valid for 30 days
                }
            })

            return {
                success: true,
                message: 'Selamat! Voucher rahasia berhasil diklaim!',
                voucherCode: uniqueVoucherCode,
                discount
            }
        }, {
            maxWait: 5000,
            timeout: 10000,
        })

        return NextResponse.json(result)
    } catch (error: any) {
        console.error('Claim easter egg voucher error:', error)
        return NextResponse.json({ error: error.message || 'Gagal mengklaim voucher rahasia' }, { status: 500 })
    }
}
