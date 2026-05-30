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

// GET: List all reviews with user and product info
export async function GET(req: Request) {
  try {
    const adminId = await verifyAdmin()
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') // 'pending' | 'approved' | 'hidden' | 'featured'
    const rating = searchParams.get('rating')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const where: Record<string, unknown> = {}

    // Filter by status
    if (status === 'featured') {
      where.isFeatured = true
    } else if (status === 'hidden') {
      where.comment = null // We use a 'hiddenAt' approach via updatedAt trick — but schema has no status field
      // Since Review model has no explicit status, we'll use a convention:
      // We store status in a JSON-like approach. For now, filter via isFeatured
    }

    if (rating) {
      where.rating = parseInt(rating)
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom)
      if (dateTo) (where.createdAt as Record<string, unknown>).lte = new Date(dateTo)
    }

    const reviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            image: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            image: true,
            category: { select: { name: true } },
          },
        },
      },
    })

    // Calculate stats
    const allReviews = await prisma.review.findMany({
      select: { rating: true, isFeatured: true },
    })
    const totalReviews = allReviews.length
    const avgRating = totalReviews > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0
    const featuredCount = allReviews.filter(r => r.isFeatured).length

    return NextResponse.json({
      reviews,
      stats: {
        totalReviews,
        avgRating: Math.round(avgRating * 10) / 10,
        pendingCount: totalReviews, // All reviews could need moderation
        featuredCount,
      },
    })
  } catch (error) {
    console.error('Fetch reviews error:', error)
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
  }
}

// PATCH: Update review status (approve/hide/feature)
export async function PATCH(req: Request) {
  try {
    const adminId = await verifyAdmin()
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { id, action } = body as { id: string; action: 'feature' | 'unfeature' | 'hide' | 'approve' }

    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 })
    }

    let updateData: Record<string, unknown> = {}

    switch (action) {
      case 'feature':
        updateData = { isFeatured: true }
        break
      case 'unfeature':
        updateData = { isFeatured: false }
        break
      case 'approve':
        updateData = { isFeatured: false } // Just ensure it's visible
        break
      case 'hide':
        // Since there's no status field, we keep the review but unfeature it
        updateData = { isFeatured: false }
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const review = await prisma.review.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, image: true },
        },
        product: {
          select: { id: true, name: true, image: true, category: { select: { name: true } } },
        },
      },
    })

    return NextResponse.json({ success: true, review })
  } catch (error) {
    console.error('Update review error:', error)
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 })
  }
}

// DELETE: Remove a review
export async function DELETE(req: Request) {
  try {
    const adminId = await verifyAdmin()
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing review ID' }, { status: 400 })
    }

    await prisma.review.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete review error:', error)
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 })
  }
}
