import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function verifyAdmin() {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (user?.role !== 'ADMIN') return null
  return session.user.id
}

// GET: List upcoming birthdays, birthday stats, and voucher history
export async function GET(req: Request) {
  try {
    const adminId = await verifyAdmin()
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const range = searchParams.get('range') || '7' // 7 or 30 days

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Fetch all users who have a birthDate
    const usersWithBirthday = await prisma.user.findMany({
      where: {
        birthDate: { not: null },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        birthDate: true,
        createdAt: true,
      },
      orderBy: { birthDate: 'asc' },
    })

    // Calculate upcoming birthdays within the range
    const rangeDays = parseInt(range)
    const futureDate = new Date(now.getTime() + rangeDays * 24 * 60 * 60 * 1000)

    const upcomingBirthdays = usersWithBirthday
      .map(u => {
        if (!u.birthDate) return null
        // Create this year's birthday
        const bday = new Date(u.birthDate)
        const thisYearBday = new Date(currentYear, bday.getMonth(), bday.getDate())
        
        // If birthday already passed this year, use next year
        if (thisYearBday < now) {
          thisYearBday.setFullYear(currentYear + 1)
        }

        const daysUntil = Math.ceil((thisYearBday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        const age = currentYear - bday.getFullYear()

        return {
          ...u,
          nextBirthday: thisYearBday.toISOString(),
          daysUntil,
          age,
        }
      })
      .filter((u): u is NonNullable<typeof u> => u !== null && u.daysUntil >= 0 && u.daysUntil <= rangeDays)
      .sort((a, b) => a.daysUntil - b.daysUntil)

    // Get birthdays this month
    const birthdaysThisMonth = usersWithBirthday.filter(u => {
      if (!u.birthDate) return false
      return new Date(u.birthDate).getMonth() === currentMonth
    })

    // Get recent birthday vouchers (vouchers with type containing birthday-related keywords)
    const birthdayVouchers = await prisma.voucher.findMany({
      where: {
        description: { contains: 'Birthday', mode: 'insensitive' },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Stats
    const totalBirthdaysThisMonth = birthdaysThisMonth.length
    const totalRewardsSent = birthdayVouchers.length
    const avgVoucherValue = totalRewardsSent > 0
      ? birthdayVouchers.reduce((sum, v) => sum + v.discountAmount, 0) / totalRewardsSent
      : 0

    return NextResponse.json({
      upcomingBirthdays,
      birthdaysThisMonth: birthdaysThisMonth.map(u => ({
        ...u,
        dayOfMonth: u.birthDate ? new Date(u.birthDate).getDate() : 0,
      })),
      birthdayVouchers,
      stats: {
        totalBirthdaysThisMonth,
        totalRewardsSent,
        avgVoucherValue: Math.round(avgVoucherValue),
        totalUsersWithBirthday: usersWithBirthday.length,
      },
    })
  } catch (error) {
    console.error('Fetch birthdays error:', error)
    return NextResponse.json({ error: 'Failed to fetch birthday data' }, { status: 500 })
  }
}

// PATCH: Send birthday reward to user
export async function PATCH(req: Request) {
  try {
    const adminId = await verifyAdmin()
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { userId, voucherType, voucherValue, description } = body as {
      userId: string
      voucherType: string
      voucherValue: number
      description: string
    }

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // Create a birthday voucher for the user
    const voucher = await prisma.voucher.create({
      data: {
        userId,
        type: voucherType || 'DISCOUNT_RP',
        description: description || 'Selamat Ulang Tahun! 🎂 Voucher spesial dari Matchaboy',
        discountAmount: voucherValue || 25000,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days validity
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    })

    // Create a notification for the user
    await prisma.notification.create({
      data: {
        userId,
        type: 'promo',
        title: 'Selamat Ulang Tahun! 🎂🎉',
        message: `Matchaboy mengucapkan selamat ulang tahun! Kami memberikan voucher spesial senilai Rp ${(voucherValue || 25000).toLocaleString('id-ID')} untukmu. Cek di halaman voucher ya!`,
      },
    })

    return NextResponse.json({ success: true, voucher })
  } catch (error) {
    console.error('Send birthday reward error:', error)
    return NextResponse.json({ error: 'Failed to send birthday reward' }, { status: 500 })
  }
}
