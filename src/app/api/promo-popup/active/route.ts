import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrSetCache, CACHE_KEYS, CACHE_TTL } from '@/lib/redis-cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const activePopups = await getOrSetCache(
      CACHE_KEYS.POPUPS_ACTIVE,
      async () => {
        return await prisma.promoPopup.findMany({
          where: { isActive: true },
          orderBy: { updatedAt: 'desc' },
        });
      },
      CACHE_TTL.POPUPS
    );
    return NextResponse.json(activePopups);
  } catch (error) {
    console.error('Error fetching active promo popups:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
