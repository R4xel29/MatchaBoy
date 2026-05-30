import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'MB-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const giftCards = await prisma.giftCard.findMany({
      include: {
        sender: {
          select: { id: true, name: true, phone: true, image: true },
        },
        claimedBy: {
          select: { id: true, name: true, phone: true, image: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    const totalIssued = giftCards.length;
    const totalClaimedValue = giftCards
      .filter(gc => gc.isClaimed)
      .reduce((sum, gc) => sum + gc.amount, 0);
    const totalActiveValue = giftCards
      .filter(gc => !gc.isClaimed && (!gc.expiresAt || new Date(gc.expiresAt) > now))
      .reduce((sum, gc) => sum + gc.amount, 0);
    const activeCount = giftCards.filter(gc => !gc.isClaimed && (!gc.expiresAt || new Date(gc.expiresAt) > now)).length;
    const claimedCount = giftCards.filter(gc => gc.isClaimed).length;
    const expiredCount = giftCards.filter(gc => !gc.isClaimed && gc.expiresAt && new Date(gc.expiresAt) <= now).length;

    return NextResponse.json({
      giftCards,
      stats: {
        totalIssued,
        totalClaimedValue,
        totalActiveValue,
        activeCount,
        claimedCount,
        expiredCount,
      },
    });
  } catch (error: unknown) {
    console.error('[ADMIN_GIFTCARDS_GET_ERROR]', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, recipientPhone, senderName, message, expiresInDays } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    const code = generateGiftCardCode();

    const expiresAt = expiresInDays
      ? new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000)
      : null;

    const giftCard = await prisma.giftCard.create({
      data: {
        code,
        amount: Number(amount),
        senderName: senderName || 'Matchaboy Admin',
        recipientPhone: recipientPhone || '',
        message: message || null,
        expiresAt,
      },
      include: {
        sender: {
          select: { id: true, name: true, phone: true, image: true },
        },
        claimedBy: {
          select: { id: true, name: true, phone: true, image: true },
        },
      },
    });

    return NextResponse.json({ giftCard }, { status: 201 });
  } catch (error: unknown) {
    console.error('[ADMIN_GIFTCARDS_POST_ERROR]', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
