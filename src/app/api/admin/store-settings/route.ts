import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const settings = await prisma.storeSettings.findFirst()

    if (!settings) {
      // Return defaults
      return NextResponse.json({
        openTime: '08:00',
        closeTime: '21:00',
        pickupSlotInterval: 5,
        cancellationTimeLimit: 15,
        deliveryFeePerKm: 2000,
        maxDeliveryDistance: 10,
        storeName: 'Arus HQ',
        storeAddress: 'Jl. Matcha No. 1, Jakarta Selatan',
        storeLat: -6.2088,
        storeLng: 106.8456,
      })
    }

    return NextResponse.json({
      id: settings.id,
      openTime: settings.openTime,
      closeTime: settings.closeTime,
      pickupSlotInterval: settings.pickupSlotInterval,
      cancellationTimeLimit: settings.cancellationTimeLimit,
      deliveryFeePerKm: settings.deliveryFeePerKm,
      maxDeliveryDistance: settings.maxDeliveryDistance,
      storeName: settings.storeName,
      storeAddress: settings.storeAddress,
      storeLat: settings.storeLat,
      storeLng: settings.storeLng,
      operationalDays: settings.operationalDays || "[0,1,2,3,4,5,6]",
      disabledDates: settings.disabledDates || "[]",
      customHours: settings.customHours || "{}",
      whatsappNumber: settings.whatsappNumber || "",
      whatsappMessage: settings.whatsappMessage || "Halo Matchaboy, saya ingin bertanya...",
    })
  } catch {
    return NextResponse.json({
      openTime: '08:00',
      closeTime: '21:00',
      pickupSlotInterval: 5,
      cancellationTimeLimit: 15,
      deliveryFeePerKm: 2000,
      maxDeliveryDistance: 10,
      storeName: 'Arus HQ',
      storeAddress: 'Jl. Matcha No. 1, Jakarta Selatan',
      storeLat: -6.2088,
      storeLng: 106.8456,
      operationalDays: "[0,1,2,3,4,5,6]",
      disabledDates: "[]",
      customHours: "{}",
      whatsappNumber: "",
      whatsappMessage: "Halo Matchaboy, saya ingin bertanya...",
    })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })
    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = await req.json()
    const existing = await prisma.storeSettings.findFirst()

    if (existing) {
      const updated = await prisma.storeSettings.update({
        where: { id: existing.id },
        data: {
          openTime: body.openTime || existing.openTime,
          closeTime: body.closeTime || existing.closeTime,
          pickupSlotInterval: body.pickupSlotInterval ?? existing.pickupSlotInterval,
          cancellationTimeLimit: body.cancellationTimeLimit ?? existing.cancellationTimeLimit,
          deliveryFeePerKm: body.deliveryFeePerKm ?? existing.deliveryFeePerKm,
          maxDeliveryDistance: body.maxDeliveryDistance ?? existing.maxDeliveryDistance,
          storeName: body.storeName ?? existing.storeName,
          storeAddress: body.storeAddress ?? existing.storeAddress,
          storeLat: body.storeLat !== undefined ? body.storeLat : existing.storeLat,
          storeLng: body.storeLng !== undefined ? body.storeLng : existing.storeLng,
          operationalDays: body.operationalDays !== undefined ? body.operationalDays : existing.operationalDays,
          disabledDates: body.disabledDates !== undefined ? body.disabledDates : existing.disabledDates,
          customHours: body.customHours !== undefined ? body.customHours : existing.customHours,
          whatsappNumber: body.whatsappNumber !== undefined ? body.whatsappNumber : existing.whatsappNumber,
          whatsappMessage: body.whatsappMessage !== undefined ? body.whatsappMessage : existing.whatsappMessage,
        },
      })
      return NextResponse.json(updated)
    } else {
      const created = await prisma.storeSettings.create({
        data: {
          openTime: body.openTime || '08:00',
          closeTime: body.closeTime || '21:00',
          pickupSlotInterval: body.pickupSlotInterval ?? 5,
          cancellationTimeLimit: body.cancellationTimeLimit ?? 15,
          deliveryFeePerKm: body.deliveryFeePerKm ?? 2000,
          maxDeliveryDistance: body.maxDeliveryDistance ?? 10,
          storeName: body.storeName || 'Arus HQ',
          storeAddress: body.storeAddress || 'Jl. Matcha No. 1, Jakarta Selatan',
          storeLat: body.storeLat ?? -6.2088,
          storeLng: body.storeLng ?? 106.8456,
          operationalDays: body.operationalDays || '[0,1,2,3,4,5,6]',
          disabledDates: body.disabledDates || '[]',
          customHours: body.customHours || '{}',
          whatsappNumber: body.whatsappNumber || '',
          whatsappMessage: body.whatsappMessage || 'Halo Matchaboy, saya ingin bertanya...',
        },
      })
      return NextResponse.json(created)
    }
  } catch (error) {
    console.error('Store settings error:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
