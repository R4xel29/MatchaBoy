import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// POST: Create a new support ticket
export async function POST(req: Request) {
  try {
    const session = await auth()
    const body = await req.json()
    const { type, name, email, phone, title, description } = body

    if (!type || !name || !title || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: session?.user?.id || null,
        type,
        name,
        email: email || null,
        phone: phone || null,
        title,
        description,
        status: 'OPEN',
      },
    })

    return NextResponse.json({ success: true, ticket })
  } catch (error) {
    console.error('Create ticket error:', error)
    return NextResponse.json({ error: 'Failed to submit ticket' }, { status: 500 })
  }
}

// GET: Fetch history for the logged-in user
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ tickets: [] })
    }

    const tickets = await prisma.supportTicket.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('Fetch tickets error:', error)
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
  }
}
