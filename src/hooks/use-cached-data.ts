'use client';

import useSWR, { SWRConfiguration } from 'swr';

/**
 * Struktur objek detail error yang dikembalikan oleh API endpoint.
 */
export interface FetchErrorInfo {
  error?: string;
  message?: string;
  [key: string]: unknown;
}

/**
 * Custom Error class untuk penanganan kegagalan fetch HTTP pada SWR.
 */
export class FetchError extends Error {
  status?: number;
  info?: FetchErrorInfo;

  constructor(message: string, status?: number, info?: FetchErrorInfo) {
    super(message);
    this.name = 'FetchError';
    this.status = status;
    this.info = info;
  }
}

/**
 * Universal JSON fetcher untuk SWR dengan wrapping status error HTTP.
 *
 * @template T - Tipe data JSON yang diharapkan dari endpoint
 * @param url - URL API endpoint tujuan
 * @returns Data respons JSON bertipe T
 */
export const fetcher = async <T = unknown>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    let errorInfo: FetchErrorInfo = {};
    try {
      errorInfo = (await res.json()) as FetchErrorInfo;
    } catch {
      errorInfo = { message: res.statusText };
    }
    const message = errorInfo?.error || errorInfo?.message || `Request failed with status ${res.status}`;
    throw new FetchError(message, res.status, errorInfo);
  }
  return res.json() as Promise<T>;
};

/**
 * Data dompet digital Arum Seduh Wallet pengguna.
 */
export interface WalletData {
  balance: number;
  transactions: any[];
  banks?: any[];
  isFirstTime?: boolean;
  settings?: {
    minTopUp: number;
    bonusMinAmount: number;
    bonusPercent: number;
    topUpEnabled: boolean;
    bonusMode: string;
    firstTimePromoEnabled: boolean;
    firstTimePromoPackages: Array<{ amount: number; bonus: number }>;
  };
}

/**
 * SWR Hook untuk saldo Arum Seduh Wallet pengguna dan riwayat transaksi.
 * Interval deduplikasi: 5 detik; otomatis revalidasi saat window kembali aktif & koneksi pulih.
 *
 * @param config - Konfigurasi opsional SWR
 */
export function useWallet(config?: SWRConfiguration) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<WalletData>(
    '/api/user/wallet',
    fetcher,
    {
      dedupingInterval: 5000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      ...config,
    }
  );

  return {
    wallet: data ? { balance: data.balance } : undefined,
    balance: data?.balance ?? 0,
    transactions: data?.transactions ?? [],
    banks: data?.banks ?? [],
    isFirstTime: data?.isFirstTime ?? false,
    settings: data?.settings,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

/**
 * Data program loyalitas member Arum Seduh.
 */
export interface LoyaltyData {
  points: number;
  arusLevel: string;
  referralCode?: string;
  totalReferrals: number;
  vouchers: any[];
  pointHistory: any[];
  milestones?: any;
  easterEgg?: any;
}

/**
 * SWR Hook untuk data loyalitas member (Tier tingkat Arus, poin reward, kode referral, dan voucher).
 * Interval deduplikasi: 5 detik; otomatis revalidasi saat window fokus.
 *
 * @param config - Konfigurasi opsional SWR
 */
export function useLoyalty(config?: SWRConfiguration) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<LoyaltyData>(
    '/api/user/loyalty',
    fetcher,
    {
      dedupingInterval: 5000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      ...config,
    }
  );

  return {
    loyalty: data
      ? {
          points: data.points,
          arusLevel: data.arusLevel,
          referralCode: data.referralCode,
          totalReferrals: data.totalReferrals,
        }
      : undefined,
    points: data?.points ?? 0,
    arusLevel: data?.arusLevel ?? 'Tunas Arus',
    referralCode: data?.referralCode,
    totalReferrals: data?.totalReferrals ?? 0,
    vouchers: data?.vouchers ?? [],
    pointHistory: data?.pointHistory ?? [],
    milestones: data?.milestones,
    easterEgg: data?.easterEgg,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

export interface WeatherRecommendationData {
  success: boolean;
  weather: {
    temp: number;
    condition: string;
    description: string;
    city: string;
    icon: string;
  };
  tagline: string;
  recommendations: any[];
}

/**
 * SWR Hook untuk rekomendasi menu kontekstual berbasis perkiraan cuaca lokal (suhu, cuaca panas/hujan).
 * Interval deduplikasi: 10 menit.
 *
 * @param lat - Latitude lokasi pelanggan (opsional)
 * @param lon - Longitude lokasi pelanggan (opsional)
 * @param config - Konfigurasi SWR opsional
 */
export function useWeather(lat?: number, lon?: number, config?: SWRConfiguration) {
  const queryParams = new URLSearchParams();
  if (lat !== undefined) queryParams.set('lat', String(lat));
  if (lon !== undefined) queryParams.set('lon', String(lon));

  const queryString = queryParams.toString();
  const url = `/api/weather-recommendation${queryString ? `?${queryString}` : ''}`;

  const { data, error, isLoading, isValidating, mutate } = useSWR<WeatherRecommendationData>(
    url,
    fetcher,
    {
      dedupingInterval: 600000, // 10 minutes
      revalidateOnFocus: false,
      ...config,
    }
  );

  return {
    weather: data?.weather,
    tagline: data?.tagline,
    recommendations: data?.recommendations ?? [],
    data,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

export interface ActiveOrderItem {
  id: string;
  status: string;
  orderType: string;
  total: number;
  paymentMethod: string;
  paymentUrl?: string;
  itemsSummary: string;
  createdAt: string;
}

/**
 * SWR Hook untuk memantau status pesanan aktif pelanggan (PENDING, PREPARING, ON_DELIVERY, READY).
 * Polling otomatis setiap 10 detik.
 *
 * @param config - Konfigurasi SWR opsional
 */
export function useActiveOrders(config?: SWRConfiguration) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<ActiveOrderItem[]>(
    '/api/orders/active',
    fetcher,
    {
      refreshInterval: 10000,
      dedupingInterval: 5000,
      revalidateOnFocus: true,
      ...config,
    }
  );

  return {
    activeOrders: Array.isArray(data) ? data : [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

export interface QueueOrder {
  id: string;
  queueNumber: string;
  customerName: string;
  status: 'PREPARING' | 'READY' | string;
  updatedAt: string;
}

export interface QueueData {
  orders: QueueOrder[];
}

/**
 * SWR Hook untuk papan display antrean dapur/barista publik (Live Queue Board).
 * Polling otomatis setiap 5 detik.
 *
 * @param config - Konfigurasi SWR opsional
 */
export function useQueueOrders(config?: SWRConfiguration) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<QueueData>(
    '/api/queue',
    fetcher,
    {
      refreshInterval: 5000,
      dedupingInterval: 2000,
      revalidateOnFocus: true,
      ...config,
    }
  );

  const orders = data?.orders ?? [];
  const preparingOrders = orders.filter((o) => o.status === 'PREPARING');
  const readyOrders = orders.filter((o) => o.status === 'READY');

  return {
    orders,
    preparingOrders,
    readyOrders,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

export interface FeaturedReviewsData {
  reviews: any[];
}

/**
 * SWR Hook untuk daftar testimoni/ulasan bintang 5 pilihan pelanggan di homepage.
 * Interval deduplikasi: 5 menit.
 *
 * @param config - Konfigurasi SWR opsional
 */
export function useFeaturedReviews(config?: SWRConfiguration) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<FeaturedReviewsData>(
    '/api/reviews/featured',
    fetcher,
    {
      dedupingInterval: 300000, // 5 minutes
      revalidateOnFocus: false,
      ...config,
    }
  );

  return {
    reviews: data?.reviews ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

/**
 * SWR Hook untuk modal pop-up promosi aktif Arum Seduh.
 * Interval deduplikasi: 10 menit.
 *
 * @param config - Konfigurasi SWR opsional
 */
export function useActivePopups(config?: SWRConfiguration) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<any[]>(
    '/api/promo-popup/active',
    fetcher,
    {
      dedupingInterval: 600000, // 10 minutes
      revalidateOnFocus: false,
      ...config,
    }
  );

  return {
    popups: Array.isArray(data) ? data : [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

export interface StoriesData {
  success: boolean;
  stories: any[];
}

/**
 * SWR Hook untuk feed cerita visual toko (Instagram-style stories bar).
 * Interval deduplikasi: 5 menit.
 *
 * @param config - Konfigurasi SWR opsional
 */
export function useStories(config?: SWRConfiguration) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<StoriesData>(
    '/api/stories',
    fetcher,
    {
      dedupingInterval: 300000, // 5 minutes
      revalidateOnFocus: false,
      ...config,
    }
  );

  return {
    stories: data?.stories ?? [],
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

export interface ProductCatalogData {
  products: any[];
  categories: any[];
  packagingStock: {
    cupRegular: number;
    cupJumbo: number;
  };
}

/**
 * SWR Hook untuk seluruh katalog produk Arum Seduh, kategori, dan ketersediaan stok packaging (Cup Regular & Jumbo).
 * Interval deduplikasi: 15 menit dengan auto-revalidasi saat window fokus.
 *
 * @param config - Konfigurasi SWR opsional
 */
export function useProducts(config?: SWRConfiguration) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<ProductCatalogData>(
    '/api/products',
    fetcher,
    {
      dedupingInterval: 900000, // 15 minutes
      revalidateOnFocus: true,
      ...config,
    }
  );

  return {
    products: data?.products ?? [],
    categories: data?.categories ?? [],
    packagingStock: data?.packagingStock ?? { cupRegular: 999, cupJumbo: 999 },
    isLoading,
    isValidating,
    error,
    mutate,
  };
}
