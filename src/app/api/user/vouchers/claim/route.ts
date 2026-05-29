import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit, getClientId } from '@/lib/rate-limit-redis'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// POST: Claim a voucher code
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login diperlukan untuk mengklaim voucher' }, { status: 401 })
    }

    // SECURITY FIX #L7-L8: Rate limiting aligned to 3/min using Redis-based sliding window rate limiter
    const clientKey = getClientId(req, session.user.id)
    const rateLimitResult = await rateLimit(`voucher_claim:${clientKey}`, {
      maxRequests: 3,
      windowMs: 60_000,
    })

    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan klaim. Tunggu 1 menit.' }, { status: 429 })
    }

    const { code } = await req.json()
    if (!code) {
      return NextResponse.json({ error: 'Kode voucher wajib diisi' }, { status: 400 })
    }

    const cleanCode = code.toUpperCase().trim()

    // 1. Fetch the voucher template by code
    const template = await prisma.voucherTemplate.findUnique({
      where: { code: cleanCode }
    })

    if (!template) {
      return NextResponse.json({ error: 'Kode voucher tidak valid atau tidak ditemukan' }, { status: 404 })
    }

    // SECURITY FIX #6: Validate template is claimable
    if (template.hideFromVoucherPack) {
      return NextResponse.json({ error: 'Voucher ini tidak tersedia untuk diklaim' }, { status: 403 })
    }

    // SECURITY FIX #6: Prevent claiming system vouchers
    const systemCodes = ['WELCOME', 'REFERRAL_REWARD', 'TUMBLER_REWARD', 'EASTERSTELLAR']
    if (systemCodes.some(sc => template.code.startsWith(sc))) {
      return NextResponse.json({ error: 'Voucher sistem tidak bisa diklaim manual' }, { status: 403 })
    }

    // 1b. Validate new user targeting
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
          return NextResponse.json({ error: 'Voucher ini hanya berlaku untuk pengguna baru (terdaftar kurang dari 14 hari)' }, { status: 400 })
        }
      }
    }

    // 2. Validate template expiration
    if (template.expiresAt && template.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Masa berlaku voucher ini sudah habis' }, { status: 400 })
    }

    // SECURITY FIX #1: Move all validation inside transaction with proper locking
    const voucher = await prisma.$transaction(async (tx) => {
      // Lock template row to prevent race condition
      const t = await tx.$queryRaw<Array<{
        id: string
        code: string
        title: string
        description: string
        type: string
        discountValue: number
        usageLimit: number
        usageCount: number
        expiresAt: Date | null
      }>>`
        SELECT * FROM "VoucherTemplate" 
        WHERE id = ${template.id}
        FOR UPDATE
      `
      
      if (!t || t.length === 0) {
        throw new Error('Template tidak ditemukan')
      }
      
      const lockedTemplate = t[0]

      // Re-validate quota after lock
      if (lockedTemplate.usageLimit > 0 && lockedTemplate.usageCount >= lockedTemplate.usageLimit) {
        throw new Error('Kuota penukaran voucher ini sudah habis')
      }

      // Check if user already claimed (inside transaction)
      const alreadyClaimed = await tx.voucher.findFirst({
        where: {
          userId: session.user.id,
          templateId: lockedTemplate.id
        }
      })

      if (alreadyClaimed) {
        throw new Error('Anda sudah pernah mengklaim voucher ini')
      }

      // Increment template claim count
      await tx.voucherTemplate.update({
        where: { id: lockedTemplate.id },
        data: { usageCount: { increment: 1 } }
      })

      // Calculate personal expiry: template expiry or default 30 days
      let voucherExpiresAt = lockedTemplate.expiresAt
      if (!voucherExpiresAt) {
        const d = new Date()
        d.setDate(d.getDate() + 30) // Default 30 days expiry
        voucherExpiresAt = d
      }

      // Set discountAmount: direct discount if DISCOUNT_RP, else fallback
      let discountAmount = 0
      if (lockedTemplate.type === 'DISCOUNT_RP') {
        discountAmount = lockedTemplate.discountValue
      } else if (lockedTemplate.type === 'FREE_DRINK') {
        discountAmount = lockedTemplate.discountValue || 25000
      } else if (lockedTemplate.type === 'FREE_TOPPING') {
        discountAmount = lockedTemplate.discountValue || 3000
      } else if (lockedTemplate.type === 'UPGRADE_SIZE') {
        discountAmount = lockedTemplate.discountValue || 5000
      }

      // Generate a unique voucher instance code with a longer suffix to prevent collisions (M9)
      const userVoucherCode = `${lockedTemplate.code}-${Math.random().toString(36).substring(2, 12).toUpperCase()}`

      // Create personal voucher
      return tx.voucher.create({
        data: {
          userId: session.user.id,
          code: userVoucherCode,
          type: lockedTemplate.type,
          description: lockedTemplate.description,
          discountAmount,
          expiresAt: voucherExpiresAt,
          templateId: lockedTemplate.id,
          isUsed: false
        }
      })
    }, {
      maxWait: 5000, // Maximum time to wait for transaction to start
      timeout: 10000, // Maximum time for transaction to complete
    })

    return NextResponse.json({ success: true, message: 'Voucher berhasil diklaim!', voucher })
  } catch (error: any) {
    console.error('[API USER VOUCHER CLAIM ERROR]', error)
    return NextResponse.json({ error: error.message || 'Gagal mengklaim voucher' }, { status: 500 })
  }
}
