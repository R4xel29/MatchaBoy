import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

/**
 * GET: Admin melihat data referral tracking.
 * Query params: page, limit
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Ambil semua user yang punya referrer (yang diajak / referee)
    const [referrals, total] = await Promise.all([
      prisma.user.findMany({
        where: { referredById: { not: null } },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          referralBonusPaid: true,
          createdAt: true,
          referredBy: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              referralCode: true,
            },
          },
          _count: {
            select: {
              orders: { where: { status: 'COMPLETED' } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where: { referredById: { not: null } } }),
    ]);

    // Hitung total voucher referral yang sudah keluar
    const totalReferralVouchers = await prisma.voucher.count({
      where: { fromReferralUserId: { not: null } },
    });

    // Hitung total voucher referral yang sudah dipakai
    const usedReferralVouchers = await prisma.voucher.count({
      where: { fromReferralUserId: { not: null }, isUsed: true },
    });

    const data = referrals.map((ref) => ({
      referee: {
        id: ref.id,
        name: ref.name,
        email: ref.email,
        phone: ref.phone,
      },
      referrer: ref.referredBy,
      hasPurchased: (ref._count?.orders || 0) > 0,
      bonusPaid: ref.referralBonusPaid,
      joinedAt: ref.createdAt,
    }));

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      stats: {
        totalReferrals: total,
        totalVouchersIssued: totalReferralVouchers,
        totalVouchersUsed: usedReferralVouchers,
      },
    });
  } catch (error) {
    console.error('Error fetching referrals:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
