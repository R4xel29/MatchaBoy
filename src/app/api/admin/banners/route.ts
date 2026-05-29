import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { logAdminAction } from '@/lib/admin-logger';

export async function GET() {
  const session = await auth();
  if (!session?.user || !['ADMIN', 'CASHIER'].includes(session.user.role || '')) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const banners = await prisma.heroBanner.findMany({
      orderBy: { order: 'asc' },
    });
    return NextResponse.json(banners);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch banners' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const json = await req.json();
    const { image, headline, subheadline, alt, isActive, isCover, order } = json;

    if (!image || !headline || !subheadline) {
        return new NextResponse('Missing required fields', { status: 400 });
    }

    const banner = await prisma.heroBanner.create({
      data: {
        image,
        headline,
        subheadline,
        alt: alt || 'Promo Banner',
        isActive: isActive !== undefined ? isActive : true,
        isCover: isCover !== undefined ? isCover : true,
        order: order || 0,
      },
    });

    await logAdminAction({
      userId: session.user.id,
      action: 'CREATE',
      entity: 'BANNER',
      entityId: banner.id,
      details: `Menambahkan Banner Promo baru: "${headline.replace(/\n/g, ' ')}"`,
    });

    return NextResponse.json(banner, { status: 201 });
  } catch (error) {
    console.error('Error creating banner:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
