import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import KaryawanDashboardClient from './KaryawanDashboardClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function KaryawanDashboardPage() {
  const session = await auth();

  // Dashboard karyawan hanya untuk sesi dan role karyawan (bukan admin)
  const isKaryawan = session?.user && (session.user.role === 'CASHIER' || session.user.role === 'KARYAWAN');
  if (!isKaryawan) {
    if (session?.user?.role === 'ADMIN') {
      redirect('/admin');
    }
    redirect('/adminarus');
  }

  const userId = session.user.id;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  // Parallel data fetching for optimal performance
  const [
    activeShift,
    recentShifts,
    liveOrders,
    sopTemplates,
    userTodaySubmissions,
    criticalIngredients,
    activeStaff,
    storeSettings,
    allJobdesks,
  ] = await Promise.all([
    prisma.cashierShift.findFirst({
      where: { cashierId: userId, closedAt: null },
    }),
    prisma.cashierShift.findMany({
      where: { cashierId: userId },
      orderBy: { openedAt: 'desc' },
      take: 5,
    }),
    prisma.order.findMany({
      where: {
        createdAt: { gte: todayStart },
        status: { in: ['PENDING', 'PREPARING', 'READY'] },
        NOT: {
          source: 'SPMB',
          customerPhone: { startsWith: 'SPMB-PENDING' },
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                category: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.sopTemplateItem.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    }),
    prisma.sopSubmission.findMany({
      where: {
        userId,
        createdAt: { gte: todayStart },
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.ingredient.findMany({
      where: { stock: { lte: 10 } },
      select: { id: true, name: true, stock: true, unit: true },
      orderBy: { stock: 'asc' },
      take: 8,
    }),
    prisma.cashierShift.findMany({
      where: { closedAt: null },
      include: {
        cashier: {
          select: {
            id: true,
            name: true,
            image: true,
            jobdeskCode: true,
          },
        },
      },
      orderBy: { openedAt: 'desc' },
    }),
    prisma.storeSettings.findFirst({
      select: {
        storeName: true,
        announcementText: true,
        isOpen: true,
      },
    }),
    prisma.sopJobdesk.findMany({
      where: { isActive: true },
      select: { code: true, name: true },
    }),
  ]);

  // Compute shift reconciliation if shift is active
  let initialReconciliation = null;
  if (activeShift) {
    const shiftOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: activeShift.openedAt },
        status: { in: ['COMPLETED', 'DELIVERED'] },
      },
      select: { total: true, paymentMethod: true },
    });

    let cashIn = 0;
    let qrisIn = 0;
    let otherIn = 0;
    shiftOrders.forEach((o) => {
      const pm = (o.paymentMethod || '').toUpperCase();
      if (pm === 'CASH' || pm === 'TUNAI' || pm === 'COD') {
        cashIn += o.total;
      } else if (pm.includes('QRIS')) {
        qrisIn += o.total;
      } else {
        otherIn += o.total;
      }
    });

    const shiftExpenses = await prisma.expense.findMany({
      where: {
        date: { gte: activeShift.openedAt },
        notes: { contains: '[Kas Laci' },
      },
      select: { id: true, name: true, amount: true, date: true },
    });

    const cashOut = shiftExpenses.reduce((sum, e) => sum + e.amount, 0);
    const expectedCash = activeShift.openingCash + cashIn - cashOut;

    initialReconciliation = {
      openingCash: activeShift.openingCash,
      cashIn,
      qrisIn,
      otherIn,
      cashOut,
      expectedCash,
      totalOrders: shiftOrders.length,
      totalRevenue: cashIn + qrisIn + otherIn,
      expensesList: shiftExpenses,
    };
  }

  // Serializable sanitization
  const initialData = {
    user: {
      id: session.user.id,
      name: session.user.name || 'Karyawan',
      email: session.user.email || '',
      role: session.user.role,
      jobdeskCode: (session.user as any).jobdeskCode || null,
    },
    activeShift: activeShift
      ? {
          ...activeShift,
          openedAt: activeShift.openedAt.toISOString(),
          closedAt: activeShift.closedAt ? activeShift.closedAt.toISOString() : null,
          createdAt: activeShift.createdAt.toISOString(),
          updatedAt: activeShift.updatedAt.toISOString(),
        }
      : null,
    reconciliation: initialReconciliation,
    recentShifts: recentShifts.map((s) => ({
      ...s,
      openedAt: s.openedAt.toISOString(),
      closedAt: s.closedAt ? s.closedAt.toISOString() : null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    liveOrders: liveOrders.map((o) => ({
      ...o,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      pickupDate: o.pickupDate ? o.pickupDate.toISOString() : null,
      paymentExpiredAt: o.paymentExpiredAt ? o.paymentExpiredAt.toISOString() : null,
      lastUnpaidReminderSent: o.lastUnpaidReminderSent ? o.lastUnpaidReminderSent.toISOString() : null,
      items: o.items.map((it) => ({
        ...it,
        createdAt: it.createdAt.toISOString(),
        updatedAt: it.updatedAt.toISOString(),
      })),
    })),
    sopTemplates,
    userTodaySubmissions: userTodaySubmissions.map((sub) => ({
      ...sub,
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.updatedAt.toISOString(),
      reviewedAt: sub.reviewedAt ? sub.reviewedAt.toISOString() : null,
      revisedAt: sub.revisedAt ? sub.revisedAt.toISOString() : null,
      items: sub.items.map((it) => ({
        ...it,
        createdAt: it.createdAt.toISOString(),
      })),
    })),
    criticalIngredients,
    activeStaff: activeStaff.map((st) => ({
      ...st,
      openedAt: st.openedAt.toISOString(),
      closedAt: st.closedAt ? st.closedAt.toISOString() : null,
      createdAt: st.createdAt.toISOString(),
      updatedAt: st.updatedAt.toISOString(),
    })),
    storeSettings,
    allJobdesks,
  };

  return <KaryawanDashboardClient initialData={initialData} />;
}
