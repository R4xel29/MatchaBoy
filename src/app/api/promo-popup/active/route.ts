import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const activePopup = await prisma.promoPopup.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json(activePopup);
  } catch (error) {
    console.error('Error fetching active promo popup:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
