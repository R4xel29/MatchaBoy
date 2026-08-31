import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrSetCache, CACHE_KEYS, CACHE_TTL } from '@/lib/redis-cache';

export const revalidate = 60; // Cache for 60 seconds

export async function GET() {
  try {
    const data = await getOrSetCache(
      CACHE_KEYS.REVIEWS_FEATURED,
      async () => {
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

        return { reviews: featuredReviews };
      },
      CACHE_TTL.REVIEWS
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching featured reviews:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
