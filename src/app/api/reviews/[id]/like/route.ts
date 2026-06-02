import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: reviewId } = await params
        const userId = session.user.id

        // Check if the review exists
        const review = await prisma.review.findUnique({
            where: { id: reviewId }
        })

        if (!review) {
            return NextResponse.json({ error: 'Review not found' }, { status: 404 })
        }

        // Toggle like: check if already liked
        const existingLike = await prisma.reviewLike.findUnique({
            where: {
                userId_reviewId: {
                    userId,
                    reviewId
                }
            }
        })

        let isLiked = false
        if (existingLike) {
            await prisma.reviewLike.delete({
                where: {
                    id: existingLike.id
                }
            })
        } else {
            await prisma.reviewLike.create({
                data: {
                    userId,
                    reviewId
                }
            })
            isLiked = true
        }

        // Get updated likes count
        const likesCount = await prisma.reviewLike.count({
            where: { reviewId }
        })

        return NextResponse.json({
            success: true,
            isLiked,
            likesCount
        })

    } catch (error: any) {
        console.error('Error toggling like:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
