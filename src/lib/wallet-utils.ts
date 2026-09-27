import { encodeQrMatrix } from '@/lib/qr-encoder';

export interface PromoPackage {
  amount: number;
  bonus: number;
}

export const QRIS_EXPIRE_MINUTES = 15;
export const QRIS_EXPIRE_MS = QRIS_EXPIRE_MINUTES * 60 * 1000;

export const DEFAULT_PROMO_PACKAGES: PromoPackage[] = [
  { amount: 50000, bonus: 3000 },
  { amount: 100000, bonus: 5000 },
  { amount: 200000, bonus: 10000 },
];

export function parsePromoPackages(raw?: string | null): PromoPackage[] {
  if (!raw) return DEFAULT_PROMO_PACKAGES;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const normalized = parsed
        .map((p: any) => ({
          amount: Number(p.amount ?? p.minAmount) || 0,
          bonus: Number(p.bonus) || 0,
        }))
        .filter((p) => p.amount > 0 && p.bonus >= 0)
        .sort((a, b) => a.amount - b.amount);

      // Auto-migrate legacy 2-tier default (50k->5k, 200k->10k) to new 3-tier default (50k->3k, 100k->5k, 200k->10k)
      if (
        normalized.length === 2 &&
        normalized[0].amount === 50000 &&
        normalized[0].bonus === 5000 &&
        normalized[1].amount === 200000 &&
        normalized[1].bonus === 10000
      ) {
        return DEFAULT_PROMO_PACKAGES;
      }

      return normalized.length > 0 ? normalized : DEFAULT_PROMO_PACKAGES;
    }
    return DEFAULT_PROMO_PACKAGES;
  } catch {
    return DEFAULT_PROMO_PACKAGES;
  }
}

export function isQrisTransactionExpired(tx: {
  paymentMethod?: string | null;
  status: string;
  createdAt: Date | string;
}): boolean {
  if (String(tx.paymentMethod || 'QRIS').toUpperCase() !== 'QRIS') return false;
  if (tx.status !== 'PENDING') return false;
  const createdMs = new Date(tx.createdAt).getTime();
  if (isNaN(createdMs)) return false;
  return Date.now() - createdMs >= QRIS_EXPIRE_MS;
}

export function getQrisExpiresAt(createdAt: Date | string): string {
  const createdMs = new Date(createdAt).getTime();
  return new Date(createdMs + QRIS_EXPIRE_MS).toISOString();
}

export function calculateTopUpBonus(
  amount: number,
  isFirstTime: boolean,
  settings: any
): {
  bonusAmount: number;
  isPromoApplied: boolean;
  bonusType: 'FIRST_TIME' | 'REGULAR' | 'NONE';
} {
  const bonusMinAmount = settings?.walletBonusMinAmount ?? 100000;
  const bonusPercent = settings?.walletBonusPercent ?? 10;
  const bonusMode = settings?.walletBonusMode ?? 'BOTH';
  const firstTimePromoEnabled = settings?.walletFirstTimePromoEnabled ?? true;
  const promoPackages = parsePromoPackages(settings?.walletFirstTimePromoPackages);

  const isFirstTimeMode = bonusMode === 'FIRST_TIME' || bonusMode === 'BOTH';
  const isRegularMode = bonusMode === 'REGULAR' || bonusMode === 'BOTH';

  // First-time top-up uses the First-Time Promo Packages (50rb->3rb, 100rb->5rb, 200rb->10rb)
  if (isFirstTime && isFirstTimeMode && firstTimePromoEnabled) {
    const sortedDesc = [...promoPackages].sort((a, b) => b.amount - a.amount);
    const matchedPackage =
      promoPackages.find((pkg) => Number(pkg.amount) === amount) ||
      sortedDesc.find((pkg) => amount >= Number(pkg.amount));
    if (matchedPackage && matchedPackage.bonus > 0) {
      return {
        bonusAmount: matchedPackage.bonus,
        isPromoApplied: true,
        bonusType: 'FIRST_TIME',
      };
    }
    return { bonusAmount: 0, isPromoApplied: false, bonusType: 'NONE' };
  }

  if (isRegularMode && bonusPercent > 0 && amount >= bonusMinAmount) {
    const regularBonus = Math.floor(amount * (bonusPercent / 100));
    if (regularBonus > 0) {
      return {
        bonusAmount: regularBonus,
        isPromoApplied: false,
        bonusType: 'REGULAR',
      };
    }
  }

  return { bonusAmount: 0, isPromoApplied: false, bonusType: 'NONE' };
}

/**
 * Generates QR code SVG path, boolean modules, and viewBox size directly using pure TypeScript encoder.
 */
export function generateServerQrSvgData(qrValue: string): {
  modules: boolean[][];
  path: string;
  svgPath: string;
  viewBoxSize: number;
} {
  const { modules, path, viewBoxSize } = encodeQrMatrix(qrValue || 'ARUM-SEDUH-QRIS', 3);
  return { modules, path, svgPath: path, viewBoxSize };
}

// Fast in-memory cache for global PaymentSettings & active BankAccount list (TTL 30s)
const globalForWalletConfig = globalThis as unknown as {
  __walletPaymentConfigCache?: {
    settings: any;
    banks: any[];
    fetchedAt: number;
  } | null;
};

export function invalidateWalletPaymentConfigCache() {
  globalForWalletConfig.__walletPaymentConfigCache = null;
}

export async function getCachedWalletPaymentConfig(prismaClient: any): Promise<{
  settings: any;
  banks: any[];
}> {
  const now = Date.now();
  const cached = globalForWalletConfig.__walletPaymentConfigCache;
  if (cached && now - cached.fetchedAt < 30_000) {
    return { settings: cached.settings, banks: cached.banks };
  }

  const [settings, banks] = await Promise.all([
    prismaClient.paymentSettings.findFirst(),
    prismaClient.bankAccount.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    }),
  ]);

  // Auto-persist 3-tier default migration in background if DB still holds legacy 2-tier string
  if (settings) {
    const normalizedStr = JSON.stringify(parsePromoPackages(settings.walletFirstTimePromoPackages));
    if (settings.walletFirstTimePromoPackages !== normalizedStr) {
      settings.walletFirstTimePromoPackages = normalizedStr;
      Promise.resolve().then(() =>
        prismaClient.paymentSettings
          .update({
            where: { id: settings.id },
            data: { walletFirstTimePromoPackages: normalizedStr },
          })
          .catch(() => {})
      );
    }
  }

  globalForWalletConfig.__walletPaymentConfigCache = {
    settings,
    banks,
    fetchedAt: now,
  };

  return { settings, banks };
}

