import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

/**
 * GET: User melihat poin, voucher, referral code, dan riwayat poin mereka.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userId = session.user.id;

    const [user, vouchers, pointHistory, loyaltySettings] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          points: true,
          referralCode: true,
          referredById: true,
          _count: {
            select: { referrals: true },
          },
        },
      }),
      prisma.voucher.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.pointHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.loyaltySettings.findFirst(),
    ]);

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    const hasClaimedEasterEgg = loyaltySettings ? await prisma.voucher.findFirst({
      where: { 
        userId,
        type: 'CUSTOM',
        description: {
          startsWith: 'Easter Egg'
        }
      }
    }).then(v => !!v) : false;

    return NextResponse.json({
      points: user.points,
      referralCode: user.referralCode,
      totalReferrals: user._count?.referrals || 0,
      vouchers,
      pointHistory,
      milestones: loyaltySettings
        ? {
            milestone1: {
              target: loyaltySettings.milestone1Points,
              reward: loyaltySettings.milestone1Desc,
              enabled: loyaltySettings.milestone1Enabled,
            },
            milestone2: {
              target: loyaltySettings.milestone2Points,
              reward: loyaltySettings.milestone2Desc,
              enabled: loyaltySettings.milestone2Enabled,
            },
            milestone3: {
              target: loyaltySettings.milestone3Points,
              reward: loyaltySettings.milestone3Desc,
              enabled: loyaltySettings.milestone3Enabled,
            },
            tumblerBonus: {
              enabled: loyaltySettings.tumblerBonusEnabled,
              points: loyaltySettings.tumblerBonusPoints,
              discountPct: loyaltySettings.tumblerDiscountPct,
            },
          }
        : null,
      easterEgg: loyaltySettings
        ? {
            enabled: (loyaltySettings as any).easterEggEnabled !== false,
            discount: (loyaltySettings as any).easterEggDiscount || 15000,
            quota: (loyaltySettings as any).easterEggQuota || 10,
            hasClaimed: hasClaimedEasterEgg
          }
        : null,
    });
  } catch (error) {
    console.error('Error fetching user loyalty data:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
