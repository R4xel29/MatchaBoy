import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const revalidate = 60; // Cache for 60 seconds

export async function GET() {
  try {
    const featuredReviews = await prisma.review.findMany({
      where: {
        isFeatured: true,
      },
      include: {
        user: {
          select: {
            name: true,
            image: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            image: true,
            price: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ reviews: featuredReviews });
  } catch (error) {
    console.error('Error fetching featured reviews:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
