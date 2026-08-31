'use client';

import useSWR, { SWRConfiguration } from 'swr';

/**
 * Universal JSON fetcher with error status wrapping
 */
export const fetcher = async <T = any>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    let errorInfo: any = {};
    try {
      errorInfo = await res.json();
    } catch {
      errorInfo = { message: res.statusText };
    }
    const error: any = new Error(errorInfo?.error || errorInfo?.message || `Request failed with status ${res.status}`);
    error.status = res.status;
    error.info = errorInfo;
    throw error;
  }
  return res.json();
};

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
 * SWR Hook for User Wallet balance & transaction history
 * Deduplication: 5s, auto-revalidates on window focus & reconnect
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
 * SWR Hook for User Loyalty tier, points, vouchers, and point history
 * Deduplication: 5s, auto-revalidates on window focus & reconnect
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
 * SWR Hook for Weather and Weather-Based recommendations
 * Deduplication: 10 minutes
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
 * SWR Hook for Active non-completed user orders
 * Auto-refresh: 10s interval
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
 * SWR Hook for Live Queue ticket board
 * Auto-refresh: 5s interval
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
 * SWR Hook for Featured customer reviews
 * Deduplication: 5 minutes
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
 * SWR Hook for Active Promotional Popups
 * Deduplication: 10 minutes
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
 * SWR Hook for Active Stories
 * Deduplication: 5 minutes
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
 * SWR Hook for Full Product Catalog & Categories
 * Deduplication: 15 minutes
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
