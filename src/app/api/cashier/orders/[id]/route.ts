import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { processOrderCompletion } from '@/lib/loyalty-utils'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user || (session.user.role !== 'CASHIER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()

    const order = await prisma.order.update({
      where: { id },
      data: { status: body.status }
    })

    // Otomatis tambah poin jika status berubah ke COMPLETED atau DELIVERED
    let loyaltyResult = null
    if (body.status === 'COMPLETED' || body.status === 'DELIVERED') {
      try {
        loyaltyResult = await processOrderCompletion(id)
      } catch (err) {
        console.error('Loyalty processing error (non-blocking):', err)
      }
    }

    return NextResponse.json({ success: true, order, loyaltyResult })
  } catch (error) {
    console.error('Update order error:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
