export interface PaymentConfig {
  id: string;
  codEnabled: boolean;
  codWhatsApp: string;
  qrisEnabled: boolean;
  qrisImage: string | null;
  qrisLogo: string | null;
  qrisLabel: string;
  qrisAutoGenerate: boolean;
  qrisNmid: string;
  transferEnabled: boolean;
  dokuEnabled: boolean;
  dokuClientId: string;
  dokuSharedKey: string;
  dokuSandbox: boolean;
  walletTopUpEnabled: boolean;
  walletMinTopUp: number;
  walletBonusMinAmount: number;
  walletBonusPercent: number;
  walletBonusMode: string;
  walletFirstTimePromoEnabled: boolean;
  walletFirstTimePromoPackages: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  bankLogo: string | null;
  accountNumber: string;
  accountName: string;
  isActive: boolean;
  order: number;
}

export interface PromoPackage {
  amount: number;
  bonus: number;
}

export type PaymentTab = 'all' | 'cash-bank' | 'doku' | 'digital-qris';
