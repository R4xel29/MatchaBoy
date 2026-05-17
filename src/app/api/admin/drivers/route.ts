import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })
    
    if (user?.role !== 'ADMIN' && user?.role !== 'CASHIER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all drivers and their active orders
    const drivers = await prisma.user.findMany({
      where: {
        role: 'DRIVER',
        driverProfile: {
          status: 'APPROVED'
        }
      },
      select: {
        id: true,
        name: true,
        image: true,
        driverProfile: {
          select: {
            isOnline: true,
            vehicleType: true,
            plateNumber: true,
            driverImageUrl: true,
          }
        },
        driverOrders: {
          where: {
            status: {
              in: ['ASSIGNED', 'PICKED_UP', 'ON_DELIVERY']
            }
          },
          select: {
            id: true,
            address: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    return NextResponse.json(drivers)
  } catch (error) {
    console.error('Fetch drivers error:', error)
    return NextResponse.json({ error: 'Failed to fetch drivers' }, { status: 500 })
  }
}
