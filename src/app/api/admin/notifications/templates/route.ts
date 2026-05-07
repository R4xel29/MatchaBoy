import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// GET: list all templates
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const templates = await prisma.notificationTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(templates)
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// POST: create or update template
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { id, trigger, title, message, isActive } = body

    if (!trigger || !title || !message) {
      return NextResponse.json({ error: 'Trigger, title, and message required' }, { status: 400 })
    }

    if (id) {
      // Update existing
      const updated = await prisma.notificationTemplate.update({
        where: { id },
        data: { trigger, title, message, isActive: isActive ?? true },
      })
      return NextResponse.json(updated)
    } else {
      // Create new
      const created = await prisma.notificationTemplate.create({
        data: { trigger, title, message, isActive: isActive ?? true },
      })
      return NextResponse.json(created)
    }
  } catch (error) {
    console.error('Template error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// DELETE: remove template
export async function DELETE(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    await prisma.notificationTemplate.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
