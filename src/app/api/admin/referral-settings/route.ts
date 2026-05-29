import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// GET — fetch referral tiers, events, and settings
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const [tiers, events, loyaltySettings, voucherTemplates] = await Promise.all([
      prisma.referralTier.findMany({ orderBy: { tierNumber: 'asc' } }),
      prisma.referralEvent.findMany({ orderBy: { startDate: 'desc' } }),
      prisma.loyaltySettings.findFirst({
        select: {
          referralEnabled: true,
          referralRewardType: true,
          referralRewardPoints: true,
          referralRewardVoucher: true,
          referralRewardDesc: true,
          referralShareImage: true,
          referralMinPurchase: true,
          referralMaxClaims: true,
          referralVoucherCode: true,
        },
      }),
      prisma.voucherTemplate.findMany({
        select: {
          id: true,
          code: true,
          title: true,
          description: true,
          type: true,
          discountValue: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Count total referrals
    const totalReferrals = await prisma.user.count({
      where: { referredById: { not: null } },
    });

    return NextResponse.json({ 
      tiers, 
      events, 
      loyaltySettings, 
      totalReferrals, 
      voucherTemplates 
    });
  } catch (error) {
    console.error('Error fetching referral settings:', error);
    return NextResponse.json(
      { error: 'Gagal memuat pengaturan referral' },
      { status: 500 }
    );
  }
}

// POST — create or update tier/event/settings
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

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
      // Validasi input
      if (body.referralMinPurchase && body.referralMinPurchase < 0) {
        return NextResponse.json(
          { error: 'Minimal belanja tidak boleh negatif' },
          { status: 400 }
        );
      }

      if (body.referralMaxClaims && body.referralMaxClaims < 0) {
        return NextResponse.json(
          { error: 'Batas maksimal tidak boleh negatif' },
          { status: 400 }
        );
      }

      if (body.referralRewardType === 'VOUCHER' && !body.referralRewardVoucher) {
        return NextResponse.json(
          { error: 'Template voucher harus dipilih' },
          { status: 400 }
        );
      }

      if (body.referralRewardType === 'POINTS' && (!body.referralRewardPoints || body.referralRewardPoints <= 0)) {
        return NextResponse.json(
          { error: 'Jumlah poin harus lebih dari 0' },
          { status: 400 }
        );
      }

      let settings = await prisma.loyaltySettings.findFirst();
      if (!settings) {
        settings = await prisma.loyaltySettings.create({
          data: { id: 'default-loyalty-settings' },
        });
      }

      settings = await prisma.loyaltySettings.update({
        where: { id: settings.id },
        data: {
          referralEnabled: body.referralEnabled ?? settings.referralEnabled,
          referralRewardType: body.referralRewardType ?? settings.referralRewardType,
          referralRewardPoints: body.referralRewardPoints ?? settings.referralRewardPoints,
          referralRewardVoucher: body.referralRewardVoucher ?? settings.referralRewardVoucher,
          referralRewardDesc: body.referralRewardDesc ?? settings.referralRewardDesc,
          referralShareImage: body.referralShareImage ?? settings.referralShareImage,
          referralMinPurchase: body.referralMinPurchase ?? settings.referralMinPurchase,
          referralMaxClaims: body.referralMaxClaims ?? settings.referralMaxClaims,
        },
      });

      return NextResponse.json(settings);
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error: any) {
    console.error('Error saving referral settings:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menyimpan pengaturan' },
      { status: 500 }
    );
  }
}

// DELETE — remove tier or event
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const id = req.nextUrl.searchParams.get('id');
    const type = req.nextUrl.searchParams.get('type');
    
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    if (type === 'event') {
      await prisma.referralEvent.delete({ where: { id } });
    } else if (type === 'tier') {
      await prisma.referralTier.delete({ where: { id } });
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error deleting:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menghapus data' },
      { status: 500 }
    );
  }
}
