import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import CustomerDetailClient from './CustomerDetailClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const { id: rawIdentifier } = await params;
  const identifier = decodeURIComponent(rawIdentifier).trim();

  // Resolusi fleksibel: Cari berdasarkan System ID, Slug (@handle), Kode Referral, atau Nomor Telepon
  const customer = await prisma.user.findFirst({
    where: {
      OR: [
        { id: identifier },
        { slug: identifier },
        { slug: identifier.startsWith('@') ? identifier.slice(1) : identifier },
        { referralCode: identifier },
        { phone: identifier },
      ],
    },
    include: {
      accounts: true,
      vouchers: {
        orderBy: { createdAt: 'desc' },
      },
      orders: {
        take: 30,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { items: true } } },
      },
      sessions: {
        take: 10,
        orderBy: { lastActive: 'desc' },
      },
      activityLogs: {
        take: 30,
        orderBy: { createdAt: 'desc' },
      },
      pointHistory: {
        take: 30,
        orderBy: { createdAt: 'desc' },
      },
      walletTransactions: {
        take: 30,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!customer) {
    notFound();
  }

  // Ambil template voucher aktif untuk pilihan modal pemberian voucher manual
  const voucherTemplates = await prisma.voucherTemplate.findMany({
    where: {
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      code: true,
      title: true,
      type: true,
      discountValue: true,
      minPurchase: true,
    },
  });

  // Kalkulasi statistik pesanan pelanggan
  const completedOrders = customer.orders.filter((o) => o.status === 'COMPLETED');
  const totalSpent = completedOrders.reduce((acc, o) => acc + (o.total || 0), 0);

  return (
    <CustomerDetailClient
      customer={customer}
      voucherTemplates={voucherTemplates}
      stats={{
        totalSpent,
        completedOrders: completedOrders.length,
      }}
    />
  );
}
