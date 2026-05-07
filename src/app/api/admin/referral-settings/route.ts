import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET — fetch referral tiers, events, and settings
export async function GET() {
  const [tiers, events, loyaltySettings] = await Promise.all([
    prisma.referralTier.findMany({ orderBy: { tierNumber: 'asc' } }),
    prisma.referralEvent.findMany({ orderBy: { startDate: 'desc' } }),
    prisma.loyaltySettings.findFirst({
      select: {
        referralEnabled: true,
        referralRewardType: true,
        referralRewardPoints: true,
        referralRewardVoucher: true,
        referralRewardDesc: true,
      },
    }),
  ]);

  // Count total referrals
  const totalReferrals = await prisma.user.count({
    where: { referredById: { not: null } },
  });

  return NextResponse.json({ tiers, events, loyaltySettings, totalReferrals });
}

// POST — create or update tier/event
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    if (body.type === 'tier') {
      const tier = body.id
        ? await prisma.referralTier.update({
            where: { id: body.id },
            data: {
              tierNumber: body.tierNumber,
              targetInvites: body.targetInvites,
              rewardType: body.rewardType,
              rewardValue: body.rewardValue,
              rewardDesc: body.rewardDesc,
              isActive: body.isActive,
            },
          })
        : await prisma.referralTier.create({
            data: {
              tierNumber: body.tierNumber,
              targetInvites: body.targetInvites,
              rewardType: body.rewardType,
              rewardValue: body.rewardValue,
              rewardDesc: body.rewardDesc,
              isActive: body.isActive ?? true,
            },
          });
      return NextResponse.json(tier);
    }

    if (body.type === 'event') {
      const event = body.id
        ? await prisma.referralEvent.update({
            where: { id: body.id },
            data: {
              name: body.name,
              description: body.description,
              rewardType: body.rewardType,
              rewardValue: body.rewardValue,
              rewardDesc: body.rewardDesc,
              refereeReward: body.refereeReward,
              startDate: new Date(body.startDate),
              endDate: new Date(body.endDate),
              isActive: body.isActive,
            },
          })
        : await prisma.referralEvent.create({
            data: {
              name: body.name,
              description: body.description,
              rewardType: body.rewardType,
              rewardValue: body.rewardValue,
              rewardDesc: body.rewardDesc,
              refereeReward: body.refereeReward,
              startDate: new Date(body.startDate),
              endDate: new Date(body.endDate),
              isActive: body.isActive ?? true,
            },
          });
      return NextResponse.json(event);
    }

    // Update general referral settings
    if (body.type === 'settings') {
      let settings = await prisma.loyaltySettings.findFirst();
      if (settings) {
        settings = await prisma.loyaltySettings.update({
          where: { id: settings.id },
          data: {
            referralEnabled: body.referralEnabled,
            referralRewardType: body.referralRewardType,
            referralRewardPoints: body.referralRewardPoints,
            referralRewardVoucher: body.referralRewardVoucher,
            referralRewardDesc: body.referralRewardDesc,
          },
        });
      }
      return NextResponse.json(settings);
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — remove tier or event
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    const type = req.nextUrl.searchParams.get('type');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    if (type === 'event') {
      await prisma.referralEvent.delete({ where: { id } });
    } else {
      await prisma.referralTier.delete({ where: { id } });
    }
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
