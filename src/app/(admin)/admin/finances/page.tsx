import { prisma } from '@/lib/prisma';
import FinancesClient, {
  LedgerTransaction,
  FinanceSummary,
} from './FinancesClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminFinancesPage() {
  const [allCompletedOrders, allCapitalInjections, allExpenses] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: { in: ['COMPLETED', 'DELIVERED'] },
        NOT: { source: 'SPMB', customerPhone: { startsWith: 'SPMB-PENDING' } },
      },
      select: {
        id: true,
        total: true,
        paymentMethod: true,
        customerName: true,
        createdAt: true,
        orderType: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.capitalInjection.findMany({
      orderBy: { date: 'desc' },
      include: { createdBy: { select: { name: true } } },
    }),
    prisma.expense.findMany({
      orderBy: { date: 'asc' },
    }),
  ]);

  // Build full chronological ledger
  const rawLedger: LedgerTransaction[] = [];

  allCompletedOrders.forEach((o) => {
    const pm = (o.paymentMethod || '').toUpperCase();
    const isQris = pm.includes('QRIS');
    const method: 'CASH' | 'QRIS' = isQris ? 'QRIS' : 'CASH';

    rawLedger.push({
      id: `order-${o.id}`,
      date: o.createdAt.toISOString(),
      type: 'ORDER_INCOME',
      title: `Pesanan #${o.id.slice(-6).toUpperCase()} - ${o.customerName || 'Pelanggan'}`,
      category: `Penjualan ${o.orderType || 'Menu'}`,
      paymentMethod: method,
      inflow: o.total,
      outflow: 0,
      netChange: o.total,
      customerName: o.customerName,
      orderNumber: o.id.slice(-6).toUpperCase(),
    });
  });

  allCapitalInjections.forEach((c) => {
    const isWithdrawal = c.amount < 0;
    const amount = Math.abs(c.amount);
    const isQris = c.paymentMethod === 'QRIS';
    const method: 'CASH' | 'QRIS' = isQris ? 'QRIS' : 'CASH';

    rawLedger.push({
      id: `capital-${c.id}`,
      date: c.date.toISOString(),
      type: isWithdrawal ? 'CAPITAL_WITHDRAWAL' : 'CAPITAL_INJECTION',
      title: c.name,
      category:
        c.category === 'INITIAL_BALANCE'
          ? 'Modal Awal'
          : c.category === 'OWNER_LOAN'
          ? 'Talangan Owner'
          : isWithdrawal
          ? 'Penarikan Modal / Prive'
          : 'Suntikan Modal',
      paymentMethod: method,
      inflow: isWithdrawal ? 0 : amount,
      outflow: isWithdrawal ? amount : 0,
      netChange: c.amount,
      notes: c.notes,
    });
  });

  allExpenses.forEach((e) => {
    const isTransfer = e.notes && e.notes.toLowerCase().includes('transfer');
    const method: 'CASH' | 'QRIS' = isTransfer ? 'QRIS' : 'CASH';

    rawLedger.push({
      id: `expense-${e.id}`,
      date: e.date.toISOString(),
      type: 'EXPENSE',
      title: e.name,
      category: e.category || 'Operasional',
      paymentMethod: method,
      inflow: 0,
      outflow: e.amount,
      netChange: -e.amount,
      notes: e.notes,
    });
  });

  rawLedger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningCash = 0;
  let runningQris = 0;

  rawLedger.forEach((item) => {
    if (item.paymentMethod === 'CASH') {
      runningCash += item.netChange;
    } else {
      runningQris += item.netChange;
    }
    item.runningCashBalance = runningCash;
    item.runningQrisBalance = runningQris;
    item.runningTotalBalance = runningCash + runningQris;
  });

  const currentCash = Math.max(0, runningCash);
  const currentQris = Math.max(0, runningQris);
  const netTotalMoney = currentCash + currentQris;

  const totalCashInflow = rawLedger
    .filter((i) => i.paymentMethod === 'CASH' && i.inflow > 0)
    .reduce((sum, i) => sum + i.inflow, 0);

  const totalQrisInflow = rawLedger
    .filter((i) => i.paymentMethod === 'QRIS' && i.inflow > 0)
    .reduce((sum, i) => sum + i.inflow, 0);

  const totalCashOutflow = rawLedger
    .filter((i) => i.paymentMethod === 'CASH' && i.outflow > 0)
    .reduce((sum, i) => sum + i.outflow, 0);

  const totalQrisOutflow = rawLedger
    .filter((i) => i.paymentMethod === 'QRIS' && i.outflow > 0)
    .reduce((sum, i) => sum + i.outflow, 0);

  const grossTotalMoney = totalCashInflow + totalQrisInflow;
  const totalExpensesSum = totalCashOutflow + totalQrisOutflow;

  const initialSummary: FinanceSummary = {
    currentCash,
    currentQris,
    netTotalMoney,
    grossTotalMoney,
    totalCashInflow,
    totalQrisInflow,
    totalCashOutflow,
    totalQrisOutflow,
    totalExpensesSum,
    totalTransactionsCount: rawLedger.length,
  };

  const initialLedger = [...rawLedger].reverse();

  return (
    <FinancesClient
      initialSummary={initialSummary}
      initialLedger={initialLedger}
      initialInjections={allCapitalInjections.map((c) => ({
        id: c.id,
        name: c.name,
        amount: c.amount,
        paymentMethod: c.paymentMethod as 'CASH' | 'QRIS',
        category: c.category,
        notes: c.notes,
        date: c.date.toISOString(),
        createdBy: c.createdBy ? { name: c.createdBy.name } : null,
      }))}
    />
  );
}
