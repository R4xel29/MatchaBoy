export interface Expense {
  id: string;
  name: string;
  amount: number;
  category: string;
  date: Date;
  notes: string | null;
}

export interface BalanceInfo {
  currentCash: number;
  currentQris: number;
  grossTotalMoney: number;
  netTotalMoney: number;
  cashInflowTotal: number;
  qrisInflowTotal: number;
  allTimeCashExpenses: number;
  allTimeTransferExpenses: number;
}

export interface ExpenseFormData {
  name: string;
  amount: string;
  category: string;
  date: string;
  notes: string;
  source: string;
}

export const CATEGORIES = [
  { value: 'RAW_MATERIAL', label: 'Bahan Baku / Restock', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'DAILY_OPS', label: 'Operasional Harian (Es/Gas/Galon/Cup)', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'UTILITIES', label: 'Listrik, Air & Wifi', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  { value: 'SALARY', label: 'Gaji & Uang Makan', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  { value: 'RENT', label: 'Sewa Tempat Kedai', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'MAINTENANCE', label: 'Maintenance / Servis Alat', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'MARKETING', label: 'Marketing & Promosi', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  { value: 'SUPPLIES', label: 'Perlengkapan & Kebersihan', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { value: 'OTHER', label: 'Lain-lain', color: 'bg-slate-100 text-slate-700 border-slate-200' }
];
