import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import StaffDetailClient from './StaffDetailClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function StaffDetailPage({ params }: PageProps) {
  const { id } = await params;

  const staff = await prisma.user.findUnique({
    where: { id },
    include: {
      cashierShifts: {
        orderBy: { openedAt: 'desc' },
        take: 30,
      },
      cashierOrders: {
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
          id: true,
          total: true,
          status: true,
          paymentMethod: true,
          createdAt: true,
          customerName: true,
          orderType: true,
        },
      },
      activityLogs: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  });

  if (!staff) {
    notFound();
  }

  // Agregat statistik performa
  const totalShifts = staff.cashierShifts.length;
  const totalOrdersProcessed = staff.cashierOrders.length;
  const totalRevenueProcessed = staff.cashierOrders.reduce((acc, o) => acc + o.total, 0);

  return (
    <div className="space-y-6">
      <StaffDetailClient
        staff={staff}
        stats={{
          totalShifts,
          totalOrdersProcessed,
          totalRevenueProcessed,
        }}
      />
    </div>
  );
}
