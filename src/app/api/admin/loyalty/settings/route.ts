import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// GET: Ambil loyalty settings
export async function GET() {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    let settings = await prisma.loyaltySettings.findFirst();
    if (!settings) {
      settings = await prisma.loyaltySettings.create({
        data: { id: 'default-loyalty-settings' },
      });
    }

    return NextResponse.json(settings);
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
        milestone1Points: body.milestone1Points,
        milestone1Reward: body.milestone1Reward,
        milestone1Desc: body.milestone1Desc,
        milestone1Enabled: body.milestone1Enabled,
        milestone2Points: body.milestone2Points,
        milestone2Reward: body.milestone2Reward,
        milestone2Desc: body.milestone2Desc,
        milestone2Enabled: body.milestone2Enabled,
        milestone3Points: body.milestone3Points,
        milestone3Reward: body.milestone3Reward,
        milestone3Desc: body.milestone3Desc,
        milestone3Enabled: body.milestone3Enabled,
        milestone3ResetPoints: body.milestone3ResetPoints,
        tumblerBonusEnabled: body.tumblerBonusEnabled,
        tumblerBonusPoints: body.tumblerBonusPoints,
        tumblerDiscountPct: body.tumblerDiscountPct,
        tumblerVoucherEnabled: body.tumblerVoucherEnabled,
        tumblerVoucherType: body.tumblerVoucherType,
        tumblerVoucherDesc: body.tumblerVoucherDesc,
        referralEnabled: body.referralEnabled,
        referralRewardType: body.referralRewardType,
        referralRewardPoints: body.referralRewardPoints,
        referralRewardVoucher: body.referralRewardVoucher,
        referralRewardDesc: body.referralRewardDesc,
        easterEggEnabled: body.easterEggEnabled,
        easterEggVoucherCode: body.easterEggVoucherCode,
        easterEggDiscount: body.easterEggDiscount,
        easterEggQuota: body.easterEggQuota,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating loyalty settings:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
