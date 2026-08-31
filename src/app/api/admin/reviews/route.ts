import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { invalidateReviewsCache } from '@/lib/redis-cache'

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
    const status = searchParams.get('status') // 'pending' | 'approved' | 'hidden' | 'featured' | 'all'
    const rating = searchParams.get('rating')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const where: Record<string, unknown> = {}

    // Filter by status
    if (status === 'featured') {
      where.isFeatured = true
      where.isHidden = false
    } else if (status === 'hidden') {
      where.isHidden = true
    } else if (status === 'approved') {
      where.isHidden = false
    } else if (status !== 'all') {
      where.isHidden = false
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
        likes: true,
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })

    // Calculate stats using database aggregations for optimal performance
    const [totalReviews, aggregateStats, featuredCount, hiddenCount] = await prisma.$transaction([
      prisma.review.count(),
      prisma.review.aggregate({
        _avg: {
          rating: true,
        },
      }),
      prisma.review.count({
        where: { isFeatured: true, isHidden: false },
      }),
      prisma.review.count({
        where: { isHidden: true },
      }),
    ])

    return NextResponse.json({
      reviews,
      stats: {
        totalReviews,
        avgRating: Math.round((aggregateStats._avg.rating || 0) * 10) / 10,
        pendingCount: hiddenCount, // Send hidden count in place of pendingCount
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
    const { id, action } = body as { id: string; action: 'feature' | 'unfeature' | 'hide' | 'approve' | 'delete-comment' }

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
        updateData = { isHidden: false } // Make it visible
        break
      case 'hide':
        // Hide and unfeature
        updateData = { isHidden: true, isFeatured: false }
        break
      case 'delete-comment':
        updateData = { comment: null }
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
        likes: true,
        replies: {
          include: {
            user: {
              select: { id: true, name: true, image: true },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })

    await invalidateReviewsCache()

    return NextResponse.json({ success: true, review })
  } catch (error) {
    console.error('Update review error:', error)
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 })
  }
}

// DELETE: Remove a review or reply
export async function DELETE(req: Request) {
  try {
    const adminId = await verifyAdmin()
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const replyId = searchParams.get('replyId')

    if (replyId) {
      await prisma.reviewReply.delete({ where: { id: replyId } })
      await invalidateReviewsCache()
      return NextResponse.json({ success: true, message: 'Reply deleted successfully' })
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 })
    }

    await prisma.review.delete({ where: { id } })
    await invalidateReviewsCache()

    return NextResponse.json({ success: true, message: 'Review deleted successfully' })
  } catch (error) {
    console.error('Delete review/reply error:', error)
    return NextResponse.json({ error: 'Failed to delete review/reply' }, { status: 500 })
  }
}
