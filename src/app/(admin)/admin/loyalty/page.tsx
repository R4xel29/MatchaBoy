import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import LoyaltySettingsClient from './LoyaltySettingsClient';

export default async function LoyaltySettingsPage() {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') redirect('/login');

  let settings = await prisma.loyaltySettings.findFirst();
  if (!settings) {
    settings = await prisma.loyaltySettings.create({
      data: { id: 'default-loyalty-settings' },
    });
  }

  // Stats
  const [totalPoints, totalVouchers, totalUsedVouchers] = await Promise.all([
    prisma.pointHistory.aggregate({ _sum: { amount: true }, where: { amount: { gt: 0 } } }),
    prisma.voucher.count(),
    prisma.voucher.count({ where: { isUsed: true } }),
  ]);

  return (
    <LoyaltySettingsClient
      initialSettings={settings}
      stats={{
        totalPointsDistributed: totalPoints._sum.amount || 0,
        totalVouchersIssued: totalVouchers,
        totalVouchersUsed: totalUsedVouchers,
      }}
    />
  );
}
