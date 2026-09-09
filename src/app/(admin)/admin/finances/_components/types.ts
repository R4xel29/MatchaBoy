import { CapitalInjectionItem } from '@/components/admin/finances/InjectCapitalModal';

export interface LedgerTransaction {
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

export interface FinanceSummary {
  currentCash: number;
  currentQris: number;
  netTotalMoney: number;
  grossTotalMoney: number;
  totalCashInflow: number;
  totalQrisInflow: number;
  totalCashOutflow: number;
  totalQrisOutflow: number;
  totalExpensesSum: number;
  totalTransactionsCount: number;
}

export type TabType = 'MUTASI' | 'CAPITAL' | 'SUMMARY';
export type RangeType = 'all' | 'today' | 'week' | 'month';
