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

    // Fetch user's vouchers
    const vouchers = await prisma.voucher.findMany({
      where: {
        userId: session.user.id,
        isUsed: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        template: true
      }
    })

    // Fetch active claimable templates that the user hasn't claimed yet (Voucher Pack)
    const claimedTemplateIds = vouchers
      .map(v => v.templateId)
      .filter((id): id is string => !!id)

    const now = new Date()
    const claimableTemplates = await prisma.voucherTemplate.findMany({
      where: {
        id: {
          notIn: claimedTemplateIds.length > 0 ? claimedTemplateIds : ['placeholder']
        },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      vouchers,
      templates: claimableTemplates
    })
  } catch (error: any) {
    console.error('[API USER VOUCHERS GET ERROR]', error)
    return NextResponse.json({ error: 'Gagal mengambil voucher' }, { status: 500 })
  }
}
