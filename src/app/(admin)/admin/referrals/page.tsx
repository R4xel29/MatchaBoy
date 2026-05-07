import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import ReferralTrackingClient from './ReferralTrackingClient';

export default async function ReferralTrackingPage() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') redirect('/login');

  const [referrals, totalReferrals, totalVouchersIssued, totalVouchersUsed] = await Promise.all([
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
            referralCode: true,
          },
        },
        _count: {
          select: {
            orders: { where: { status: { in: ['COMPLETED', 'DELIVERED'] } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.user.count({ where: { referredById: { not: null } } }),
    prisma.voucher.count({ where: { fromReferralUserId: { not: null } } }),
    prisma.voucher.count({ where: { fromReferralUserId: { not: null }, isUsed: true } }),
  ]);

  const data = referrals.map((ref) => ({
    referee: { id: ref.id, name: ref.name, email: ref.email, phone: ref.phone },
    referrer: ref.referredBy,
    hasPurchased: (ref._count?.orders || 0) > 0,
    purchaseCount: ref._count?.orders || 0,
    bonusPaid: ref.referralBonusPaid,
    joinedAt: ref.createdAt.toISOString(),
  }));

  return (
    <ReferralTrackingClient
      referrals={data}
      stats={{
        totalReferrals,
        totalVouchersIssued,
        totalVouchersUsed,
      }}
    />
  );
}
