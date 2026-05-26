import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Helper to check admin/cashier authorization
async function checkAuth() {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized', status: 401 }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true }
  })

  if (dbUser?.role !== 'ADMIN' && dbUser?.role !== 'CASHIER') {
    return { error: 'Forbidden', status: 403 }
  }

  return { success: true, userId: session.user.id }
}

// GET: List all voucher templates or get a single template by ID
export async function GET(req: Request) {
  try {
    const authResult = await checkAuth()
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { searchParams } = new URL(req.url)
    const templateId = searchParams.get('id')

    if (templateId) {
      const template = await prisma.voucherTemplate.findUnique({
        where: { id: templateId },
        include: {
          vouchers: {
            select: {
              id: true,
              code: true,
              isUsed: true,
              usedAt: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      })
      if (!template) {
        return NextResponse.json({ error: 'Voucher tidak ditemukan' }, { status: 404 })
      }
      return NextResponse.json(template)
    }

    const templates = await prisma.voucherTemplate.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { vouchers: true }
        }
      }
    })

    return NextResponse.json(templates)
  } catch (error: any) {
    console.error('[API ADMIN VOUCHER GET ERROR]', error)
    return NextResponse.json({ error: error.message || 'Gagal mengambil data voucher' }, { status: 500 })
  }
}

// POST: Create a new voucher template
export async function POST(req: Request) {
  try {
    const authResult = await checkAuth()
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const body = await req.json()
    const {
      code,
      title,
      description,
      bannerImage,
      type,
      discountValue,
      minPurchase,
      maxDiscount,
      validProductIds,
      terms,
      expiresAt,
      usageLimit,
      targetNewUserOnly,
      hideFromVoucherPack
    } = body

    if (!code || !title || !description || !type || !terms) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    // Check code uniqueness
    const existing = await prisma.voucherTemplate.findUnique({
      where: { code: code.toUpperCase().trim() }
    })
    if (existing) {
      return NextResponse.json({ error: 'Kode voucher sudah digunakan' }, { status: 400 })
    }

    const template = await prisma.voucherTemplate.create({
      data: {
        code: code.toUpperCase().trim(),
        title,
        description,
        bannerImage: bannerImage || null,
        type,
        discountValue: Number(discountValue) || 0,
        minPurchase: Number(minPurchase) || 0,
        maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        validProductIds: validProductIds ? JSON.stringify(validProductIds) : null,
        terms,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        usageLimit: Number(usageLimit) || 0,
        targetNewUserOnly: Boolean(targetNewUserOnly),
        hideFromVoucherPack: Boolean(hideFromVoucherPack)
      }
    })

    return NextResponse.json({ success: true, template })
  } catch (error: any) {
    console.error('[API ADMIN VOUCHER POST ERROR]', error)
    return NextResponse.json({ error: error.message || 'Gagal membuat voucher' }, { status: 500 })
  }
}

// PUT: Update an existing voucher template
export async function PUT(req: Request) {
  try {
    const authResult = await checkAuth()
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const body = await req.json()
    const {
      id,
      code,
      title,
      description,
      bannerImage,
      type,
      discountValue,
      minPurchase,
      maxDiscount,
      validProductIds,
      terms,
      expiresAt,
      usageLimit,
      targetNewUserOnly,
      hideFromVoucherPack
    } = body

    if (!id || !code || !title || !description || !type || !terms) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    // Check code uniqueness excluding self
    const existing = await prisma.voucherTemplate.findUnique({
      where: { code: code.toUpperCase().trim() }
    })
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: 'Kode voucher sudah digunakan oleh template lain' }, { status: 400 })
    }

    const template = await prisma.voucherTemplate.update({
      where: { id },
      data: {
        code: code.toUpperCase().trim(),
        title,
        description,
        bannerImage: bannerImage || null,
        type,
        discountValue: Number(discountValue) || 0,
        minPurchase: Number(minPurchase) || 0,
        maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        validProductIds: validProductIds ? JSON.stringify(validProductIds) : null,
        terms,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        usageLimit: Number(usageLimit) || 0,
        targetNewUserOnly: Boolean(targetNewUserOnly),
        hideFromVoucherPack: Boolean(hideFromVoucherPack)
      }
    })

    return NextResponse.json({ success: true, template })
  } catch (error: any) {
    console.error('[API ADMIN VOUCHER PUT ERROR]', error)
    return NextResponse.json({ error: error.message || 'Gagal mengubah voucher' }, { status: 500 })
  }
}

// DELETE: Delete a voucher template
export async function DELETE(req: Request) {
  try {
    const authResult = await checkAuth()
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID voucher diperlukan' }, { status: 400 })
    }

    await prisma.voucherTemplate.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: 'Voucher berhasil dihapus' })
  } catch (error: any) {
    console.error('[API ADMIN VOUCHER DELETE ERROR]', error)
    return NextResponse.json({ error: error.message || 'Gagal menghapus voucher' }, { status: 500 })
  }
}
