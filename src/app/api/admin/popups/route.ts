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
    const popups = await prisma.promoPopup.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(popups);
  } catch (error) {
    console.error('Failed to fetch popups:', error);
    return NextResponse.json({ error: 'Failed to fetch popups' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const json = await req.json();
    const { title, image, linkUrl, isActive, displayFrequency } = json;

    if (!title || !image) {
        return new NextResponse('Missing required fields', { status: 400 });
    }

    const popup = await prisma.promoPopup.create({
      data: {
        title,
        image,
        linkUrl: linkUrl || null,
        isActive: isActive !== undefined ? isActive : true,
        displayFrequency: displayFrequency || 'ONCE',
      },
    });

    await logAdminAction({
      userId: session.user.id,
      action: 'CREATE',
      entity: 'PROMO_POPUP',
      entityId: popup.id,
      details: `Menambahkan Promo Popup baru: "${title}"`,
    });

    return NextResponse.json(popup, { status: 201 });
  } catch (error) {
    console.error('Error creating popup:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
