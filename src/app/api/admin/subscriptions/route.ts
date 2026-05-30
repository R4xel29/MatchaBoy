import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscriptions = await prisma.memberSubscription.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    const totalActive = subscriptions.filter(s => s.status === 'ACTIVE' && new Date(s.expiresAt) > now).length;
    const totalExpired = subscriptions.filter(s => s.status === 'EXPIRED' || (s.status === 'ACTIVE' && new Date(s.expiresAt) <= now)).length;
    const totalCancelled = subscriptions.filter(s => s.status === 'CANCELLED').length;

    // Average duration in days
    const durations = subscriptions.map(s => {
      const start = new Date(s.startedAt).getTime();
      const end = new Date(s.expiresAt).getTime();
      return (end - start) / (1000 * 60 * 60 * 24);
    });
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    return NextResponse.json({
      subscriptions,
      stats: {
        total: subscriptions.length,
        totalActive,
        totalExpired,
        totalCancelled,
        avgDuration,
      },
    });
  } catch (error: unknown) {
    console.error('[ADMIN_SUBSCRIPTIONS_GET_ERROR]', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscriptionId, action, extensionDays } = await req.json();

    if (!subscriptionId || !action) {
      return NextResponse.json({ error: 'subscriptionId and action are required' }, { status: 400 });
    }

    const subscription = await prisma.memberSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    let updated;

    switch (action) {
      case 'activate':
        updated = await prisma.memberSubscription.update({
          where: { id: subscriptionId },
          data: { status: 'ACTIVE' },
          include: { user: { select: { id: true, name: true, email: true, phone: true, image: true } } },
        });
        break;

      case 'cancel':
        updated = await prisma.memberSubscription.update({
          where: { id: subscriptionId },
          data: { status: 'CANCELLED' },
          include: { user: { select: { id: true, name: true, email: true, phone: true, image: true } } },
        });
        break;

      case 'expire':
        updated = await prisma.memberSubscription.update({
          where: { id: subscriptionId },
          data: { status: 'EXPIRED' },
          include: { user: { select: { id: true, name: true, email: true, phone: true, image: true } } },
        });
        break;

      case 'extend': {
        const days = Number(extensionDays);
        if (!days || days <= 0) {
          return NextResponse.json({ error: 'extensionDays must be a positive number' }, { status: 400 });
        }
        const currentExpiry = new Date(subscription.expiresAt);
        const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
        const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

        updated = await prisma.memberSubscription.update({
          where: { id: subscriptionId },
          data: {
            expiresAt: newExpiry,
            status: 'ACTIVE',
          },
          include: { user: { select: { id: true, name: true, email: true, phone: true, image: true } } },
        });
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid action. Use: activate, cancel, expire, extend' }, { status: 400 });
    }

    return NextResponse.json({ subscription: updated });
  } catch (error: unknown) {
    console.error('[ADMIN_SUBSCRIPTIONS_PATCH_ERROR]', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
