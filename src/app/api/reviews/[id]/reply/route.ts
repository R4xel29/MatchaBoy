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

        const body = await req.json()
        const { comment } = body

        if (!comment || typeof comment !== 'string' || !comment.trim()) {
            return NextResponse.json({ error: 'Komentar tidak boleh kosong' }, { status: 400 })
        }

        // Check if the review exists
        const review = await prisma.review.findUnique({
            where: { id: reviewId }
        })

        if (!review) {
            return NextResponse.json({ error: 'Review not found' }, { status: 404 })
        }

        // Create review reply
        const reply = await prisma.reviewReply.create({
            data: {
                reviewId,
                userId,
                comment: comment.trim()
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        image: true
                    }
                }
            }
        })

        return NextResponse.json({
            success: true,
            reply
        })

    } catch (error: any) {
        console.error('Error replying to review:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
