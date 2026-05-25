import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { expireOrder } from '@/lib/order-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// POST: Expire an unpaid order when countdown timer runs out
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const updatedOrder = await expireOrder(id, true); // Force cancellation if called explicitly

    if (!updatedOrder) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Pesanan berhasil dibatalkan/kedaluwarsa', 
      orderStatus: updatedOrder.status 
    })
  } catch (error: any) {
    console.error('[API ORDER EXPIRE ERROR]', error)
    return NextResponse.json({ error: error.message || 'Gagal membatalkan pesanan' }, { status: 500 })
  }
}
