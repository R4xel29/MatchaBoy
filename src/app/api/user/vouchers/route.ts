import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login diperlukan' }, { status: 401 })
    }

    // Fetch all user's vouchers (both unused and used for Profile history)
    const allVouchers = await prisma.voucher.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        template: true
      }
    })

    // Active unused vouchers (for Checkout & active tab compatibility)
    const vouchers = allVouchers.filter(v => !v.isUsed)

    // Extract all template claims by user to hide already-claimed templates
    const claimedTemplateIds = allVouchers
      .map(v => v.templateId)
      .filter((id): id is string => !!id)

    const now = new Date()

    // Get user's registration date
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { createdAt: true }
    })

    const isNewUser = dbUser
      ? (now.getTime() - new Date(dbUser.createdAt).getTime()) <= 14 * 24 * 60 * 60 * 1000
      : false

    const rawTemplates = await prisma.voucherTemplate.findMany({
      where: {
        id: {
          notIn: claimedTemplateIds.length > 0 ? claimedTemplateIds : ['placeholder']
        },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ],
        hideFromVoucherPack: false,
        ...(isNewUser ? {} : { targetNewUserOnly: false })
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const systemCodes = ['WELCOME', 'REFERRAL_REWARD', 'TUMBLER_REWARD', 'EASTERSTELLAR']
    const claimableTemplates = rawTemplates.filter(t => {
      if (systemCodes.some(sc => t.code.toUpperCase().startsWith(sc))) return false
      if (t.usageLimit > 0 && t.usageCount >= t.usageLimit) return false
      return true
    })

    return NextResponse.json({
      success: true,
      vouchers,
      allVouchers,
      templates: claimableTemplates
    })
  } catch (error: any) {
    console.error('[API USER VOUCHERS GET ERROR]', error)
    return NextResponse.json({ error: 'Gagal mengambil voucher' }, { status: 500 })
  }
}
