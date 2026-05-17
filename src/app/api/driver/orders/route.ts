import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use relation filter instead of direct driverId field
    const orders = await prisma.order.findMany({
      where: {
        driver: { id: session.user.id },
        status: {
          in: ['ASSIGNED', 'PICKED_UP', 'ON_DELIVERY', 'DELIVERED']
        }
      },
      include: {
        items: {
          include: {
            product: { select: { name: true } }
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Fetch driver orders error:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}
