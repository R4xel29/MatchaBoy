import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })
    if (adminUser?.role !== 'ADMIN' && adminUser?.role !== 'CASHIER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data = await req.json()
    const { id } = await params // This is the user id of the driver

    // Extract fields
    const { name, phone, vehicleType, plateNumber, status, isOnline } = data

    // Handle user fields
    const updateUserData: any = {}
    if (name !== undefined) updateUserData.name = name
    if (phone !== undefined) updateUserData.phone = phone

    if (Object.keys(updateUserData).length > 0) {
      await prisma.user.update({
        where: { id },
        data: updateUserData
      })
    }

    // Handle profile fields
    const updateProfileData: any = {}
    if (vehicleType !== undefined) updateProfileData.vehicleType = vehicleType
    if (plateNumber !== undefined) updateProfileData.plateNumber = plateNumber
    if (status !== undefined) updateProfileData.status = status
    if (isOnline !== undefined) {
        updateProfileData.isOnline = isOnline
        if (!isOnline) {
             updateProfileData.shiftEnd = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        }
    }

    if (Object.keys(updateProfileData).length > 0) {
      await prisma.driverProfile.update({
        where: { userId: id },
        data: updateProfileData
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Update driver error:', error)
    return NextResponse.json({ error: 'Failed to update driver' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })
    
    // Only Admin can delete
    if (adminUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden. Hanya Admin yang dapat menghapus kurir.' }, { status: 403 })
    }

    const { id } = await params

    // Delete driver profile and change user role back to CUSTOMER
    // If the user was only a driver, they become a customer.
    // If we want to completely delete the user, we could, but it might break order relations.
    // So soft delete by removing driverProfile and changing role is safer.
    
    await prisma.$transaction([
      prisma.driverProfile.delete({
        where: { userId: id }
      }),
      prisma.user.update({
        where: { id },
        data: { role: 'CUSTOMER' }
      })
    ])

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete driver error:', error)
    return NextResponse.json({ error: 'Failed to delete driver' }, { status: 500 })
  }
}
