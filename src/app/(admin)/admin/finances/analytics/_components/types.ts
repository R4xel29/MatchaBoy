export type Range = 'today' | 'week' | 'month' | 'all';

export const RANGE_LABELS: Record<Range, { label: string; periodText: string }> = {
  today: { label: 'Hari Ini', periodText: 'vs Kemarin' },
  week: { label: '7 Hari Terakhir', periodText: 'vs 7 Hari Sebelumnya' },
  month: { label: 'Bulan Ini', periodText: 'vs Bulan Lalu' },
  all: { label: 'Semua Waktu', periodText: 'Akumulasi Data' },
};

export interface TopProduct {
  id: string;
  name: string;
  image: string | null;
  qty: number;
  revenue: number;
  categoryName: string;
}

export interface TimelinePoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface AnalyticsData {
  kpis: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    totalCustomers: number;
    completedCount: number;
    revenueGrowth: number;
    ordersGrowth: number;
    aovGrowth: number;
  };
  statusDistribution: {
    PENDING: number;
    PREPARING: number;
    READY: number;
    COMPLETED: number;
    CANCELLED: number;
  };
  categoryRevenue: Array<{
    name: string;
    value: number;
    count: number;
    percentage: number;
  }>;
  topProducts: TopProduct[];
  timeline: TimelinePoint[];
  paymentMethods: Array<{
    method: string;
    count: number;
    percentage: number;
  }>;
  orderTypes: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  updatedAt?: string;
}
