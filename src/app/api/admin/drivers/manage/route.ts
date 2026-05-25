import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET: List all drivers
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

    const drivers = await prisma.user.findMany({
      where: { role: 'DRIVER' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        password: true,
        createdAt: true,
        driverProfile: {
          select: {
            isOnline: true,
            vehicleType: true,
            plateNumber: true,
            driverImageUrl: true,
            shiftStart: true,
            shiftEnd: true,
            status: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Map to include hasPassword flag without leaking the hash
    const safeDrivers = drivers.map(d => ({
      ...d,
      hasPassword: !!d.password,
      password: undefined,
    }))

    return NextResponse.json(safeDrivers)
  } catch (error) {
    console.error('List drivers error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// POST: Create a new driver (Admin manual registration)
export async function POST(req: Request) {
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

    const { name, email, phone, vehicleType, plateNumber, password } = await req.json()

    if (!name || !email) {
      return NextResponse.json({ error: 'Nama dan email wajib diisi' }, { status: 400 })
    }

    // Hash password if provided
    let hashedPassword: string | undefined = undefined
    if (password && password.length >= 6) {
      hashedPassword = await bcrypt.hash(password, 10)
    }

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true }
    })

    if (existingUser) {
      // If user exists but is not DRIVER, promote to DRIVER
      if (existingUser.role === 'DRIVER') {
        return NextResponse.json({ error: 'Kurir dengan email ini sudah terdaftar' }, { status: 400 })
      }

      // Update existing user to DRIVER role
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { 
          role: 'DRIVER', 
          name, 
          phone: phone || undefined,
          ...(hashedPassword ? { password: hashedPassword } : {}),
        }
      })

      // Create or update driver profile
      await prisma.driverProfile.upsert({
        where: { userId: existingUser.id },
        create: {
          userId: existingUser.id,
          vehicleType: vehicleType || 'Motor',
          plateNumber: plateNumber || '',
          status: 'APPROVED',
        },
        update: {
          vehicleType: vehicleType || 'Motor',
          plateNumber: plateNumber || '',
          status: 'APPROVED',
        }
      })

      return NextResponse.json({ success: true, message: 'Akun sudah ada, dipromosikan ke DRIVER' })
    }

    // Create new user + driver profile
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        role: 'DRIVER',
        ...(hashedPassword ? { password: hashedPassword } : {}),
        driverProfile: {
          create: {
            vehicleType: vehicleType || 'Motor',
            plateNumber: plateNumber || '',
            status: 'APPROVED',
          }
        }
      }
    })


    return NextResponse.json({ success: true, userId: newUser.id })
  } catch (error: any) {
    console.error('Create driver error:', error)

    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Email atau nomor HP sudah digunakan' }, { status: 400 })
    }
    // Debugging: return the actual error message
    return NextResponse.json({ error: error.message || 'Gagal menambahkan kurir' }, { status: 500 })
  }
}
