import { prisma } from '@/lib/prisma';
import ExpensesClient from './ExpensesClient';

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminExpensesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params?.page) || 1);
  const pageSize = 15;

  const [
    totalExpenses,
    totalAmountAgg,
    expenses,
    allCompletedOrders,
    allExpensesList,
    activeCashierShifts,
  ] = await Promise.all([
    prisma.expense.count(),
    prisma.expense.aggregate({ _sum: { amount: true } }),
    prisma.expense.findMany({
      orderBy: { date: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.findMany({
      where: {
        status: { in: ['COMPLETED', 'DELIVERED'] },
        NOT: { source: 'SPMB', customerPhone: { startsWith: 'SPMB-PENDING' } },
      },
      select: { total: true, paymentMethod: true },
    }),
    prisma.expense.findMany({
      select: { amount: true, notes: true },
    }),
    prisma.cashierShift.findMany({
      where: { closedAt: null },
      select: { openingCash: true },
    }),
  ]);

  // Balance calculations (Cash & QRIS Saat Ini)
  const BASE_CASH_BALANCE = 245000;
  const BASE_QRIS_BALANCE = 722000;
  const activeShiftOpeningCash = activeCashierShifts.reduce((sum, s) => sum + s.openingCash, 0);

  let allTimeCash = 0;
  let allTimeQris = 0;
  allCompletedOrders.forEach((o) => {
    const pm = (o.paymentMethod || '').toUpperCase();
    if (pm === 'CASH' || pm === 'TUNAI' || pm === 'COD') {
      allTimeCash += o.total;
    } else if (pm.includes('QRIS')) {
      allTimeQris += o.total;
    }
  });

  let allTimeCashExpenses = 0;
  let allTimeTransferExpenses = 0;
  allExpensesList.forEach((e) => {
    if (e.notes && e.notes.toLowerCase().includes('transfer')) {
      allTimeTransferExpenses += e.amount;
    } else {
      allTimeCashExpenses += e.amount;
    }
  });

  const cashInflowTotal = BASE_CASH_BALANCE + activeShiftOpeningCash + allTimeCash;
  const qrisInflowTotal = BASE_QRIS_BALANCE + allTimeQris;
  const currentCash = Math.max(0, cashInflowTotal - allTimeCashExpenses);
  const currentQris = Math.max(0, qrisInflowTotal - allTimeTransferExpenses);
  const grossTotalMoney = cashInflowTotal + qrisInflowTotal;
  const netTotalMoney = currentCash + currentQris;

  const totalPages = Math.ceil(totalExpenses / pageSize) || 1;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">Pengeluaran & Posisi Kas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Kelola biaya operasional, bahan baku, utilitas, dan pantau saldo riil kasir & QRIS</p>
      </div>
      <ExpensesClient
        initialExpenses={expenses}
        currentPage={page}
        totalPages={totalPages}
        totalExpenses={totalExpenses}
        totalAmountSum={totalAmountAgg._sum.amount || 0}
        pageSize={pageSize}
        balanceInfo={{
          currentCash,
          currentQris,
          grossTotalMoney,
          netTotalMoney,
          cashInflowTotal,
          qrisInflowTotal,
          allTimeCashExpenses,
          allTimeTransferExpenses,
        }}
      />
    </div>
  );
}
