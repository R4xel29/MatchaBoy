import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ authenticated: false, cooldownActive: false });
    }

    const userId = session.user.id;
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const lastEarnReview = await prisma.pointHistory.findFirst({
      where: {
        userId,
        type: 'EARN_REVIEW',
        createdAt: { gte: threeDaysAgo }
      },
      orderBy: { createdAt: 'desc' },
    });

    if (lastEarnReview) {
      const timeSinceLastEarn = Date.now() - new Date(lastEarnReview.createdAt).getTime();
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      if (timeSinceLastEarn < threeDaysMs) {
        const remainingMs = threeDaysMs - timeSinceLastEarn;
        const nextAllowedReview = new Date(new Date(lastEarnReview.createdAt).getTime() + threeDaysMs);
        return NextResponse.json({
          cooldownActive: true,
          remainingMs,
          nextAllowedDate: nextAllowedReview.toISOString(),
          lastReviewDate: lastEarnReview.createdAt.toISOString()
        });
      }
    }

    return NextResponse.json({ cooldownActive: false });
  } catch (error) {
    console.error('Error checking review cooldown:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
