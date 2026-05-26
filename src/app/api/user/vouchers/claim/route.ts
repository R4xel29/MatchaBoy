import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// POST: Claim a voucher code
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login diperlukan untuk mengklaim voucher' }, { status: 401 })
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

    // 3. Validate usage limit
    if (template.usageLimit > 0 && template.usageCount >= template.usageLimit) {
      return NextResponse.json({ error: 'Kuota penukaran voucher ini sudah habis' }, { status: 400 })
    }

    // 4. Validate if user has already claimed this voucher
    const alreadyClaimed = await prisma.voucher.findFirst({
      where: {
        userId: session.user.id,
        templateId: template.id
      }
    })

    if (alreadyClaimed) {
      return NextResponse.json({ error: 'Anda sudah pernah mengklaim voucher ini' }, { status: 400 })
    }

    // 5. Create user voucher in an interactive transaction
    const voucher = await prisma.$transaction(async (tx) => {
      // Re-fetch template inside transaction with lock if possible, or verify count again
      const t = await tx.voucherTemplate.findUnique({
        where: { id: template.id }
      })

      if (!t) throw new Error('Template tidak ditemukan')
      if (t.usageLimit > 0 && t.usageCount >= t.usageLimit) {
        throw new Error('Kuota penukaran voucher ini sudah habis')
      }

      // Increment template claim count
      await tx.voucherTemplate.update({
        where: { id: t.id },
        data: { usageCount: { increment: 1 } }
      })

      // Calculate personal expiry: template expiry or default 30 days
      let voucherExpiresAt = t.expiresAt
      if (!voucherExpiresAt) {
        const d = new Date()
        d.setDate(d.getDate() + 30) // Default 30 days expiry
        voucherExpiresAt = d
      }

      // Set discountAmount: direct discount if DISCOUNT_RP, else fallback
      let discountAmount = 0
      if (t.type === 'DISCOUNT_RP') {
        discountAmount = t.discountValue
      } else if (t.type === 'FREE_DRINK') {
        discountAmount = t.discountValue || 25000
      } else if (t.type === 'FREE_TOPPING') {
        discountAmount = t.discountValue || 3000
      } else if (t.type === 'UPGRADE_SIZE') {
        discountAmount = t.discountValue || 5000
      }

      // Generate a unique voucher instance code for user (e.g. templateCode-CUID)
      const userVoucherCode = `${t.code}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`

      // Create personal voucher
      return tx.voucher.create({
        data: {
          userId: session.user.id,
          code: userVoucherCode,
          type: t.type,
          description: t.description,
          discountAmount,
          expiresAt: voucherExpiresAt,
          templateId: t.id,
          isUsed: false
        }
      })
    })

    return NextResponse.json({ success: true, message: 'Voucher berhasil diklaim!', voucher })
  } catch (error: any) {
    console.error('[API USER VOUCHER CLAIM ERROR]', error)
    return NextResponse.json({ error: error.message || 'Gagal mengklaim voucher' }, { status: 500 })
  }
}
