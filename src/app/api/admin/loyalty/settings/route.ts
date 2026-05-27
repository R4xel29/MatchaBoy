import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// GET: Ambil loyalty settings
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    let settings = await prisma.loyaltySettings.findFirst();
    if (!settings) {
      settings = await prisma.loyaltySettings.create({
        data: { id: 'default-loyalty-settings' },
      });
    }

    if (session.user.role === 'ADMIN') {
      return NextResponse.json(settings);
    } else {
      // Saring field rahasia easter egg untuk pengguna biasa/customer
      const {
        easterEggVoucherCode,
        easterEggDiscount,
        easterEggQuota,
        ...publicSettings
      } = settings;
      return NextResponse.json(publicSettings);
    }
  } catch (error) {
    console.error('Error fetching loyalty settings:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// PUT: Update loyalty settings
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();

    // Pastikan ada row settings
    let settings = await prisma.loyaltySettings.findFirst();
    if (!settings) {
      settings = await prisma.loyaltySettings.create({
        data: { id: 'default-loyalty-settings' },
      });
    }

    const updated = await prisma.loyaltySettings.update({
      where: { id: settings.id },
      data: {
        milestone1Points: body.milestone1Points !== undefined ? Number(body.milestone1Points) : undefined,
        milestone1Reward: body.milestone1Reward !== undefined ? body.milestone1Reward : undefined,
        milestone1Desc: body.milestone1Desc !== undefined ? body.milestone1Desc : undefined,
        milestone1Enabled: body.milestone1Enabled !== undefined ? Boolean(body.milestone1Enabled) : undefined,
        milestone2Points: body.milestone2Points !== undefined ? Number(body.milestone2Points) : undefined,
        milestone2Reward: body.milestone2Reward !== undefined ? body.milestone2Reward : undefined,
        milestone2Desc: body.milestone2Desc !== undefined ? body.milestone2Desc : undefined,
        milestone2Enabled: body.milestone2Enabled !== undefined ? Boolean(body.milestone2Enabled) : undefined,
        milestone3Points: body.milestone3Points !== undefined ? Number(body.milestone3Points) : undefined,
        milestone3Reward: body.milestone3Reward !== undefined ? body.milestone3Reward : undefined,
        milestone3Desc: body.milestone3Desc !== undefined ? body.milestone3Desc : undefined,
        milestone3Enabled: body.milestone3Enabled !== undefined ? Boolean(body.milestone3Enabled) : undefined,
        milestone3ResetPoints: body.milestone3ResetPoints !== undefined ? Boolean(body.milestone3ResetPoints) : undefined,
        tumblerBonusEnabled: body.tumblerBonusEnabled !== undefined ? Boolean(body.tumblerBonusEnabled) : undefined,
        tumblerBonusPoints: body.tumblerBonusPoints !== undefined ? Number(body.tumblerBonusPoints) : undefined,
        tumblerDiscountPct: body.tumblerDiscountPct !== undefined ? Number(body.tumblerDiscountPct) : undefined,
        tumblerVoucherEnabled: body.tumblerVoucherEnabled !== undefined ? Boolean(body.tumblerVoucherEnabled) : undefined,
        tumblerVoucherType: body.tumblerVoucherType !== undefined ? body.tumblerVoucherType : undefined,
        tumblerVoucherDesc: body.tumblerVoucherDesc !== undefined ? body.tumblerVoucherDesc : undefined,
        referralEnabled: body.referralEnabled !== undefined ? Boolean(body.referralEnabled) : undefined,
        referralRewardType: body.referralRewardType !== undefined ? body.referralRewardType : undefined,
        referralRewardPoints: body.referralRewardPoints !== undefined ? Number(body.referralRewardPoints) : undefined,
        referralRewardVoucher: body.referralRewardVoucher !== undefined ? body.referralRewardVoucher : undefined,
        referralRewardDesc: body.referralRewardDesc !== undefined ? body.referralRewardDesc : undefined,
        referralMinPurchase: body.referralMinPurchase !== undefined ? Number(body.referralMinPurchase) : undefined,
        referralMaxClaims: body.referralMaxClaims !== undefined ? Number(body.referralMaxClaims) : undefined,
        pointMode: body.pointMode !== undefined ? body.pointMode : undefined,
        pointPerTransaction: body.pointPerTransaction !== undefined ? Number(body.pointPerTransaction) : undefined,
        pointPerAmount: body.pointPerAmount !== undefined ? Number(body.pointPerAmount) : undefined,
        pointValue: body.pointValue !== undefined ? Number(body.pointValue) : undefined,
        easterEggEnabled: body.easterEggEnabled !== undefined ? Boolean(body.easterEggEnabled) : undefined,
        easterEggVoucherCode: body.easterEggVoucherCode !== undefined ? body.easterEggVoucherCode : undefined,
        easterEggDiscount: body.easterEggDiscount !== undefined ? Number(body.easterEggDiscount) : undefined,
        easterEggQuota: body.easterEggQuota !== undefined ? Number(body.easterEggQuota) : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating loyalty settings:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Gagal menyimpan pengaturan loyalty', detail: message },
      { status: 500 }
    );
  }
}
