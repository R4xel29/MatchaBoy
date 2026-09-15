import { prisma } from '@/lib/prisma';
import CustomerListClient from './CustomerListClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    arusLevel?: string;
    orderStatus?: string;
    sortBy?: string;
  }>;
}

export default async function AdminCustomersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params?.page) || 1);
  const pageSize = 15;
  const searchQuery = params?.search?.trim() || '';
  const arusLevel = params?.arusLevel?.trim() || '';
  const orderStatus = params?.orderStatus?.trim() || '';
  const sortBy = params?.sortBy?.trim() || 'newest';

  // Base customer filter
  const whereCondition: any = { role: 'CUSTOMER' };

  // Filter pencarian teks bebas (Name, Email, WhatsApp, Slug, ID, Referral Code)
  if (searchQuery) {
    whereCondition.OR = [
      { name: { contains: searchQuery, mode: 'insensitive' } },
      { email: { contains: searchQuery, mode: 'insensitive' } },
      { phone: { contains: searchQuery, mode: 'insensitive' } },
      { slug: { contains: searchQuery, mode: 'insensitive' } },
      { id: { contains: searchQuery, mode: 'insensitive' } },
      { referralCode: { contains: searchQuery, mode: 'insensitive' } },
    ];
  }

  // Filter Tingkat Loyalitas (Arus Level)
  if (arusLevel && arusLevel !== 'ALL') {
    whereCondition.arusLevel = arusLevel;
  }

  // Filter Keaktifan Pesanan
  if (orderStatus === 'has_orders') {
    whereCondition.orders = { some: {} };
  } else if (orderStatus === 'no_orders') {
    whereCondition.orders = { none: {} };
  }

  // Pengurutan (Sorting)
  let orderBy: any = { createdAt: 'desc' };
  if (sortBy === 'orders') {
    orderBy = { orders: { _count: 'desc' } };
  } else if (sortBy === 'points') {
    orderBy = { points: 'desc' };
  } else if (sortBy === 'wallet') {
    orderBy = { walletBalance: 'desc' };
  } else if (sortBy === 'name') {
    orderBy = { name: 'asc' };
  }

  // Waktu 30 hari yang lalu untuk metrik member baru
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Jalankan query secara paralel untuk performa optimal
  const [
    totalCustomers,
    filteredCustomersCount,
    newCustomersCount,
    aggregates,
    customers,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.user.count({ where: whereCondition }),
    prisma.user.count({
      where: {
        role: 'CUSTOMER',
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.user.aggregate({
      where: { role: 'CUSTOMER' },
      _sum: {
        points: true,
        walletBalance: true,
      },
    }),
    prisma.user.findMany({
      where: whereCondition,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        points: true,
        walletBalance: true,
        arusLevel: true,
        referralCode: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    }),
  ]);

  const totalPages = Math.ceil(filteredCustomersCount / pageSize) || 1;

  return (
    <CustomerListClient
      customers={customers}
      stats={{
        totalCustomers,
        newCustomers: newCustomersCount,
        totalPoints: aggregates._sum.points || 0,
        totalWallet: aggregates._sum.walletBalance || 0,
      }}
      pagination={{
        currentPage: page,
        totalPages,
        totalItems: filteredCustomersCount,
        pageSize,
      }}
      filters={{
        search: searchQuery,
        arusLevel,
        orderStatus,
        sortBy,
      }}
    />
  );
}
