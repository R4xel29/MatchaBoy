import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { processOrderCompletion } from '@/lib/loyalty-utils'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login diperlukan' }, { status: 401 })
    }

    // SECURITY FIX #L1: Enforce role-based access checks (CASHIER or ADMIN)
    if (session?.user?.role !== 'CASHIER' && session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak: Hanya Kasir atau Admin yang diperbolehkan' }, { status: 403 })
    }

    const body = await req.json()
    const { orderId, userId } = body

    if (!orderId || !userId) {
      return NextResponse.json({ error: 'orderId dan userId diperlukan' }, { status: 400 })
    }

    // 1. Validate order existence
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 })
    }

    // 2. Validate order ownership to prevent unauthorized re-linking of orders to arbitrary users
    if (existingOrder.userId && existingOrder.userId !== userId) {
      return NextResponse.json({ error: 'Order ini sudah ditautkan dengan pengguna lain' }, { status: 400 })
    }

    // 3. Validate that points have not been awarded already
    if (existingOrder.pointsAwarded) {
      return NextResponse.json({ error: 'Poin untuk order ini sudah pernah diberikan sebelumnya' }, { status: 400 })
    }

    // 4. Validate order flow (order must be completed to award points)
    if (existingOrder.status !== 'COMPLETED' && existingOrder.status !== 'SELESAI') {
      return NextResponse.json({ error: 'Hanya order dengan status SELESAI yang dapat memperoleh poin' }, { status: 400 })
    }

    // Link the order to the correct user if not already linked
    if (!existingOrder.userId) {
      await prisma.order.update({
        where: { id: orderId },
        data: { userId },
      })
    }

    // Award points safely using the consolidated transaction-wrapped completion function
    const result = await processOrderCompletion(orderId)

    return NextResponse.json({
      success: true,
      pointsEarned: result?.pointsToAdd || 0,
      newTotal: result?.newPoints || 0,
    })
  } catch (error: any) {
    console.error('Award points route error:', error)
    return NextResponse.json({ error: error.message || 'Gagal memberikan poin' }, { status: 500 })
  }
}
