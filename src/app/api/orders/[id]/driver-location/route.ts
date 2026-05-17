import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get order with driver relation and address info
    const order = await prisma.order.findUnique({
      where: { id, userId: session.user.id },
      select: {
        address: true,
        driver: {
          select: {
            id: true,
            name: true,
            driverProfile: {
              select: {
                lastLat: true, lastLng: true, lastLocationUpdate: true,
                vehicleType: true, plateNumber: true, driverImageUrl: true,
              }
            }
          }
        }
      }
    })

    if (!order?.driver?.driverProfile) {
      return NextResponse.json({ lat: null, lng: null })
    }

    const dp = order.driver.driverProfile

    // Try to parse destination coordinates from the stored address
    // The address field may contain lat/lng info encoded, or we resolve from store settings
    let destLat: number | null = null
    let destLng: number | null = null

    // Check if address contains coordinate data (from checkout flow)
    // The checkout saves address as text, but we can look for coordinates in the order
    // For now, let's try to get from the location store or return null
    // We'll use a simple regex to check if coords are embedded
    if (order.address) {
      const coordMatch = order.address.match(/\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)/)
      if (coordMatch) {
        destLat = parseFloat(coordMatch[1])
        destLng = parseFloat(coordMatch[2])
      }
    }

    return NextResponse.json({
      lat: dp.lastLat,
      lng: dp.lastLng,
      updatedAt: dp.lastLocationUpdate,
      driverName: order.driver.name,
      vehicleType: dp.vehicleType,
      plateNumber: dp.plateNumber,
      driverImage: dp.driverImageUrl,
      destinationAddress: order.address || null,
      destinationLat: destLat,
      destinationLng: destLng,
    })
  } catch (error) {
    console.error('Fetch driver location error:', error)
    return NextResponse.json({ error: 'Failed to fetch location' }, { status: 500 })
  }
}
