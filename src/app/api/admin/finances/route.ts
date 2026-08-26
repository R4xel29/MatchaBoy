import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface LedgerItem {
  id: string;
  date: string;
  type: 'ORDER_INCOME' | 'CAPITAL_INJECTION' | 'CAPITAL_WITHDRAWAL' | 'EXPENSE';
  title: string;
  category: string;
  paymentMethod: 'CASH' | 'QRIS';
  inflow: number;
  outflow: number;
  netChange: number;
  runningCashBalance?: number;
  runningQrisBalance?: number;
  runningTotalBalance?: number;
  notes?: string | null;
  customerName?: string | null;
  orderNumber?: string | null;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || 'all';
    const methodFilter = searchParams.get('method') || 'ALL'; // ALL, CASH, QRIS
    const typeFilter = searchParams.get('type') || 'ALL'; // ALL, INCOME, EXPENSE, CAPITAL
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // 1. Fetch all data in parallel
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
        orderBy: { date: 'asc' },
        include: { createdBy: { select: { name: true } } },
      }),
      prisma.expense.findMany({
        orderBy: { date: 'asc' },
      }),
    ]);

    // 2. Build full chronological ledger from the beginning to compute running balances
    const rawLedger: LedgerItem[] = [];

    // Add Completed Orders
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

    // Add Capital Injections / Withdrawals
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

    // Add Expenses
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

    // Sort all events chronologically (oldest to newest for running balance)
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

    // Current Balances (Real-time database totals)
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

    // Filter ledger based on user criteria (for response view)
    let filteredLedger = [...rawLedger];

    // Date range filtering
    const now = new Date();
    if (range === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      filteredLedger = filteredLedger.filter((i) => new Date(i.date) >= start);
    } else if (range === 'week') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredLedger = filteredLedger.filter((i) => new Date(i.date) >= start);
    } else if (range === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      filteredLedger = filteredLedger.filter((i) => new Date(i.date) >= start);
    } else if (startDateParam && endDateParam) {
      const start = new Date(startDateParam);
      const end = new Date(endDateParam);
      end.setHours(23, 59, 59, 999);
      filteredLedger = filteredLedger.filter(
        (i) => new Date(i.date) >= start && new Date(i.date) <= end
      );
    }

    // Method Filter
    if (methodFilter !== 'ALL') {
      filteredLedger = filteredLedger.filter((i) => i.paymentMethod === methodFilter.toUpperCase());
    }

    // Type Filter
    if (typeFilter === 'INCOME') {
      filteredLedger = filteredLedger.filter((i) => i.type === 'ORDER_INCOME');
    } else if (typeFilter === 'CAPITAL') {
      filteredLedger = filteredLedger.filter(
        (i) => i.type === 'CAPITAL_INJECTION' || i.type === 'CAPITAL_WITHDRAWAL'
      );
    } else if (typeFilter === 'EXPENSE') {
      filteredLedger = filteredLedger.filter((i) => i.type === 'EXPENSE');
    }

    // Display order: newest first
    filteredLedger.reverse();

    return NextResponse.json({
      success: true,
      ledger: filteredLedger,
      summary: {
        currentCash,
        currentQris,
        netTotalMoney,
        grossTotalMoney,
        totalCashInflow,
        totalQrisInflow,
        totalCashOutflow,
        totalQrisOutflow,
        totalExpensesSum,
        totalTransactionsCount: filteredLedger.length,
      },
    });
  } catch (error) {
    console.error('Error in finances API route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
