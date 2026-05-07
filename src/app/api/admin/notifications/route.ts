import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// GET: list sent notifications (admin)
export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get('page') || '1')
    const limit = 20

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.notification.count(),
    ])

    return NextResponse.json({ notifications, total, page, pages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Admin notif error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// POST: send notification to user(s)
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (adminUser?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { title, message, type, target, userIds } = body

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message required' }, { status: 400 })
    }

    let targetUserIds: string[] = []

    if (target === 'all') {
      const users = await prisma.user.findMany({
        where: { role: 'CUSTOMER' },
        select: { id: true },
      })
      targetUserIds = users.map(u => u.id)
    } else if (target === 'specific' && userIds?.length > 0) {
      targetUserIds = userIds
    } else {
      return NextResponse.json({ error: 'No target specified' }, { status: 400 })
    }

    const { sendBulkNotification } = await import('@/lib/notification-service')
    const result = await sendBulkNotification({
      userIds: targetUserIds,
      type: type || 'promo',
      title,
      message,
      senderId: session.user.id,
    })

    return NextResponse.json({ success: true, count: result.count })
  } catch (error) {
    console.error('Send notif error:', error)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
