import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit, getClientId } from '@/lib/rate-limit-redis'

export async function POST(req: Request) {
  try {
    const clientId = getClientId(req)
    const { success } = await rateLimit(`driver-register:${clientId}`, { maxRequests: 3, windowMs: 60_000 })
    if (!success) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan pendaftaran. Silakan coba lagi dalam 1 menit.' }, { status: 429 })
    }

    const { name, email, phone, vehicleType, plateNumber } = await req.json()

    if (!name || !email) {
      return NextResponse.json({ error: 'Nama dan email wajib diisi' }, { status: 400 })
    }

    // Cek apakah user sudah ada
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: { driverProfile: true }
    })

    if (existingUser) {
      if (existingUser.driverProfile) {
        return NextResponse.json({ error: 'Email ini sudah terdaftar sebagai kurir.' }, { status: 400 })
      }

      // Buat profile driver untuk user yang sudah ada
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          role: 'DRIVER',
          phone: phone || existingUser.phone,
          driverProfile: {
            create: {
              vehicleType: vehicleType || 'Motor',
              plateNumber: plateNumber || '',
              status: 'PENDING'
            }
          }
        }
      })
      
      return NextResponse.json({ success: true, message: 'Pendaftaran berhasil. Silakan tunggu persetujuan admin.' })
    }

    // Buat user baru
    await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        role: 'DRIVER',
        driverProfile: {
          create: {
            vehicleType: vehicleType || 'Motor',
            plateNumber: plateNumber || '',
            status: 'PENDING'
          }
        }
      }
    })

    return NextResponse.json({ success: true, message: 'Pendaftaran berhasil. Silakan tunggu persetujuan admin sebelum login.' })

  } catch (error: any) {
    console.error('Driver registration error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Email atau nomor telepon sudah digunakan.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Gagal melakukan pendaftaran. Silakan coba lagi.' }, { status: 500 })
  }
}
