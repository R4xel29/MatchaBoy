import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const activePopups = await prisma.promoPopup.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json(activePopups);
  } catch (error) {
    console.error('Error fetching active promo popups:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
