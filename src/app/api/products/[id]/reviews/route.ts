import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    const currentUserId = session?.user?.id || null;

    const reviews = await prisma.review.findMany({
      where: { productId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedReviews = reviews.map(review => {
      const likesCount = review.likes.length;
      const isLiked = currentUserId ? review.likes.some(like => like.userId === currentUserId) : false;
      return {
        ...review,
        likesCount,
        isLiked,
      };
    });

    return NextResponse.json({ reviews: formattedReviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { rating, comment, images, orderId } = body;

    // Validate rating
    const ratingNum = Number(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json(
        { error: 'Rating must be an integer between 1 and 5' },
        { status: 400 }
      );
    }

    // Verify if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return new NextResponse('Product not found', { status: 404 });
    }

    // Check PointHistory for any EARN_REVIEW type in the last 72 hours (3 days)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const recentEarnReview = await prisma.pointHistory.findFirst({
      where: {
        userId,
        type: 'EARN_REVIEW',
        createdAt: {
          gte: threeDaysAgo,
        },
      },
    });

    // Create the review
    const review = await prisma.review.create({
      data: {
        productId,
        userId,
        rating: Math.floor(ratingNum),
        comment: comment || null,
        images: images ? JSON.stringify(images) : null,
        isFeatured: false, // Default is not featured, admin will mark it featured
        orderId: orderId || null,
      },
      include: {
        user: {
          select: {
            name: true,
            image: true,
          },
        },
      },
    });

    let pointAwarded = false;
    if (!recentEarnReview) {
      // Award 1 point and add a PointHistory entry
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: {
            points: {
              increment: 1,
            },
          },
        }),
        prisma.pointHistory.create({
          data: {
            userId,
            amount: 1,
            type: 'EARN_REVIEW',
            description: `Mendapatkan 1 poin dari review produk`,
            orderId: orderId || undefined,
          },
        }),
      ]);
      pointAwarded = true;
    }

    return NextResponse.json({ review, pointAwarded }, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
