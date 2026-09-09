export interface OrderReport {
  id: string;
  customerName: string;
  customerPhone: string;
  orderType: string;
  source: string;
  paymentMethod: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  cogs?: number;
  grossProfit?: number;
  status: string;
  createdAt: string;
  items: { qty: number; price: number; cogs?: number; productName: string }[];
}

export interface ReportSettings {
  storeName: string;
  storeLogo: string | null;
  storeAddress: string;
  storePhone: string;
  footerText: string;
}

export interface SalesSummary {
  totalRevenue: number;
  totalDeliveryFees: number;
  totalCogs: number;
  totalGrossProfit: number;
  grossProfitMargin: number;
  orderCount: number;
  avgOrderValue: number;
}
