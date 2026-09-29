'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useStorefrontContext } from '@/app/(storefront)/layout';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft, Phone, User, CreditCard, Banknote,
  ChevronDown, ChevronUp, ChevronRight, Trash2, Plus, Minus,
  ShoppingBag, Truck, X, ArrowRight, Store, Clock, AlertTriangle, MapPin,
  Leaf, Ticket, Coins, CheckCircle2, XCircle, Loader2, Building2, QrCode, Wallet, Check, Coffee, Utensils, Users,
  Sparkles, ShieldCheck, Receipt, Gift
} from 'lucide-react';
import dynamic from 'next/dynamic';
const MapPicker = dynamic(() => import('@/components/checkout/MapPicker').then(m => m.MapPicker), { ssr: false });
import { useCartStore } from '@/stores/cart-store';
import { formatRupiah } from '@/lib/utils';
import { ProductRecommendations } from '@/components/checkout/ProductRecommendations';
import { ProductModal } from '@/components/storefront/ProductModal';
import { TopUpOverlay } from '@/components/storefront/TopUpOverlay';
import { ArusPayPinModal } from '@/components/storefront/ArusPayPinModal';
import { CheckoutSummarySkeleton } from '@/components/ui/ShimmerSkeleton';
import Image from 'next/image';
import type { Product, CartItem } from '@/types';
import { calculateDistance, calculateDeliveryFee, isWithinDeliveryRange } from '@/lib/delivery-utils';

// ── Zod Schema ──────────────────────────────────────────────
const checkoutSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  phone: z.string().min(10, 'Nomor HP minimal 10 digit')
    .regex(/^(\+62|62|0)8[0-9]{8,12}$/, 'Format nomor HP tidak valid'),
  notes: z.string().optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;
type OrderType = 'PICKUP' | 'DELIVERY' | 'DINE_IN';

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { openLogin } = useStorefrontContext();

  const items = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const tableNumber = useCartStore((s) => s.tableNumber);

  const [groupCartItems, setGroupCartItems] = useState<any[]>([]);
  const [loadingGroupCart, setLoadingGroupCart] = useState<boolean>(false);

  const searchParamsObj = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const groupCartId = searchParamsObj?.get('groupCartId') || null;

  useEffect(() => {
    if (groupCartId) {
      setLoadingGroupCart(true);
      fetch(`/api/group-cart/${groupCartId}/items`)
        .then(r => r.json())
        .then(data => {
          if (data && data.groupedItems) {
            const itemsList = Object.values(data.groupedItems).flat();
            const mappedItems = itemsList.map((item: any) => {
              const parsedMods = item.modifiers ? JSON.parse(item.modifiers) : {};
              return {
                id: item.id,
                productId: item.productId,
                name: item.product.name,
                image: item.product.image,
                basePrice: item.product.price,
                quantity: item.qty,
                iceLevel: parsedMods.iceLevel || 'Normal Ice',
                sugarLevel: parsedMods.sugarLevel || 'Normal Sugar',
                size: parsedMods.size || 'Normal',
                sizePrice: parsedMods.size === 'Large' ? 5000 : 0,
                addOns: parsedMods.addOns || [],
                totalPrice: item.price * item.qty,
                memberName: item.memberName
              };
            });
            setGroupCartItems(mappedItems);
          }
        })
        .catch(err => console.error("Error loading group cart for checkout:", err))
        .finally(() => setLoadingGroupCart(false));
    }
  }, [groupCartId]);

  const checkoutItems = useMemo(() => {
    return groupCartId ? groupCartItems : items;
  }, [groupCartId, groupCartItems, items]);

  const [orderType, setOrderType] = useState<OrderType>('PICKUP');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [dbTables, setDbTables] = useState<any[]>([]);
  const [showFloorPlanModal, setShowFloorPlanModal] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/admin/tables')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDbTables(data);
        }
      })
      .catch(err => console.error('Failed to load tables list:', err));
  }, []);

  useEffect(() => {
    if (tableNumber) {
      setSelectedTable(tableNumber);
      setOrderType('DINE_IN');
    }
  }, [tableNumber]);

  const [pickupDate, setPickupDate] = useState<string | null>(null);
  const [tempPickupDate, setTempPickupDate] = useState<string | null>(null);
  const [pickupTime, setPickupTime] = useState<string | null>('Sekarang');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [tempPickupTime, setTempPickupTime] = useState<string>('Sekarang');

  const hourContainerRef = useRef<HTMLDivElement>(null);
  const minContainerRef = useRef<HTMLDivElement>(null);
  const hourScrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const minScrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const isScrollingProgrammatically = useRef<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('WALLET');
  const [paymentChannel, setPaymentChannel] = useState('');
  const [showPickupWarning, setShowPickupWarning] = useState(false);
  const [showTumblerWarning, setShowTumblerWarning] = useState(false);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [showArusPayPinModal, setShowArusPayPinModal] = useState(false);
  const [tempFormData, setTempFormData] = useState<CheckoutFormData | null>(null);

  // Voucher restore tracking
  const [isVoucherRestored, setIsVoucherRestored] = useState(false);

  // Tumbler state
  const [hasTumbler, setHasTumbler] = useState(false);
  const [hasInitializedTumbler, setHasInitializedTumbler] = useState(false);
  const [tumblerBonusPoints, setTumblerBonusPoints] = useState(0);
  const [tumblerDiscountPct, setTumblerDiscountPct] = useState(0);
  const [tumblerEnabled, setTumblerEnabled] = useState(false);

  useEffect(() => {
    if (items.length > 0 && !hasInitializedTumbler) {
      const cartHasTumbler = items.some((item) => (item as any).hasTumbler === true);
      if (cartHasTumbler) {
        setHasTumbler(true);
      }
      setHasInitializedTumbler(true);
    }
  }, [items, hasInitializedTumbler]);

  // Voucher state
  const [voucherCode, setVoucherCode] = useState('');
  const appliedVoucher = useCartStore((s) => s.appliedVoucher);
  const setAppliedVoucher = useCartStore((s) => s.setAppliedVoucher);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState('');
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [userVouchers, setUserVouchers] = useState<any[]>([]);
  const [claimableTemplates, setClaimableTemplates] = useState<any[]>([]);
  const [voucherModalTab, setVoucherModalTab] = useState<'vouchers' | 'pack'>('vouchers');
  const [selectedVoucherFilter, setSelectedVoucherFilter] = useState<'semua' | 'diskon' | 'cashback' | 'delivery'>('semua');
  const [voucherSearchQuery, setVoucherSearchQuery] = useState('');
  const [loadingVouchers, setLoadingVouchers] = useState(false);

  // Points state
  const [userPoints, setUserPoints] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [hasFreeDeliverySubscription, setHasFreeDeliverySubscription] = useState(false);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [pointValue, setPointValue] = useState(1000);

  // Reset voucher search query when modal is closed (M3)
  useEffect(() => {
    if (!isVoucherModalOpen) {
      setVoucherSearchQuery('');
    }
  }, [isVoucherModalOpen]);

  // Keep user points updated on client navigation mount (M8)
  useEffect(() => {
    if (session?.user) {
      fetch('/api/user/profile')
        .then(r => r.json())
        .then(data => {
          if (data && data.points !== undefined) {
            setUserPoints(data.points);
          }
          if (data && data.walletBalance !== undefined) {
            setWalletBalance(data.walletBalance);
          }
          if (data && data.subscription) {
            const isActive = data.subscription.status === 'ACTIVE' && new Date(data.subscription.expiresAt) > new Date();
            const tier = data.subscription.tier;
            setHasFreeDeliverySubscription(isActive && (tier === 'MATCHA_LATTE' || tier === 'GOLDEN_MATCHA'));
          }
        })
        .catch(() => {});
    }
  }, [session?.user?.id]);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  // Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedVoucherDetail, setSelectedVoucherDetail] = useState<any | null>(null);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  const refreshCheckoutWallet = useCallback(() => {
    fetch('/api/user/wallet')
      .then((r) => r.json())
      .then((d) => {
        if (d && typeof d.balance === 'number') {
          setWalletBalance(d.balance);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      refreshCheckoutWallet();
    }
  }, [session?.user?.id, refreshCheckoutWallet]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAllPaymentsOpen, setIsAllPaymentsOpen] = useState(false);
  const [isOvoSheetOpen, setIsOvoSheetOpen] = useState(false);
  const [ovoPhone, setOvoPhone] = useState('');
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  const voucherDetail = useMemo(() => {
    if (!selectedVoucherDetail) return null;
    const template = selectedVoucherDetail.template || selectedVoucherDetail;

    let validProductIds: string[] | null = null;
    let validProductNames: string[] | null = null;

    const rawProductIds = selectedVoucherDetail.validProductIds || template.validProductIds || null;
    if (rawProductIds) {
      if (Array.isArray(rawProductIds)) {
        validProductIds = rawProductIds;
      } else {
        try {
          const parsed = JSON.parse(rawProductIds);
          if (Array.isArray(parsed)) validProductIds = parsed;
        } catch {}
      }
    }

    if (validProductIds && allProducts.length > 0) {
      validProductNames = allProducts
        .filter(p => validProductIds?.includes(p.id))
        .map(p => p.name);
    } else if (selectedVoucherDetail.validProductNames) {
      validProductNames = selectedVoucherDetail.validProductNames;
    }

    return {
      title: template.title || selectedVoucherDetail.title || 'Detail Voucher',
      description: template.description || selectedVoucherDetail.description || '',
      bannerImage: template.bannerImage || selectedVoucherDetail.bannerImage || null,
      code: selectedVoucherDetail.code || template.code || '',
      type: template.type || selectedVoucherDetail.type || '',
      discountValue: template.discountValue || selectedVoucherDetail.discountValue || template.discountAmount || selectedVoucherDetail.discountAmount || 0,
      minPurchase: template.minPurchase ?? selectedVoucherDetail.minPurchase ?? 0,
      maxDiscount: template.maxDiscount ?? selectedVoucherDetail.maxDiscount ?? null,
      expiresAt: selectedVoucherDetail.expiresAt || template.expiresAt || null,
      terms: template.terms || selectedVoucherDetail.terms || '',
      validProductIds,
      validProductNames,
    };
  }, [selectedVoucherDetail, allProducts]);

  // Store settings
  const [storeSettings, setStoreSettings] = useState({
    openTime: '08:00', closeTime: '21:00', pickupSlotInterval: 5,
    deliveryFeePerKm: 2000, maxDeliveryDistance: 10,
    storeLat: -7.756928, storeLng: 113.211502,
    operationalDays: '[0,1,2,3,4,5,6]',
    disabledDates: '[]',
    customHours: '{}'
  });

  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [isStoreCurrentlyOpen, setIsStoreCurrentlyOpen] = useState(false);
  const [pickupWarningShown, setPickupWarningShown] = useState(() => {
    if (typeof window !== 'undefined') {
      return (sessionStorage.getItem('arumseduh_pickup_warning_shown') || sessionStorage.getItem('matchaboy_pickup_warning_shown')) === 'true';
    }
    return false;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const {
    openTime: storeOpenTime,
    closeTime: storeCloseTime,
    pickupSlotInterval: storePickupSlotInterval,
    operationalDays: storeOperationalDays,
    disabledDates: storeDisabledDates,
    customHours: storeCustomHours
  } = storeSettings;

  const getStoreHoursForDate = useCallback((dateStr: string) => {
    let openT = storeOpenTime;
    let closeT = storeCloseTime;
    try {
      const custom = typeof storeCustomHours === 'string'
        ? JSON.parse(storeCustomHours || '{}')
        : storeCustomHours || {};

      if (custom?.dates?.[dateStr]) {
        openT = custom.dates[dateStr].openTime;
        closeT = custom.dates[dateStr].closeTime;
      } else {
        const dayIdx = String(new Date(dateStr).getDay());
        if (custom?.weekdays?.[dayIdx]) {
          openT = custom.weekdays[dayIdx].openTime;
          closeT = custom.weekdays[dayIdx].closeTime;
        }
      }
    } catch (e) {
      console.error("Error parsing customHours:", e);
    }
    return { openTime: openT, closeTime: closeT };
  }, [storeOpenTime, storeCloseTime, storeCustomHours]);

  const getTimeSlotsForDate = useCallback((dateStr: string, type: OrderType) => {
    const { openTime: targetOpenTime, closeTime: targetCloseTime } = getStoreHoursForDate(dateStr);
    const [openH, openM] = targetOpenTime.split(':').map(Number);
    const [closeH, closeM] = targetCloseTime.split(':').map(Number);

    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    const now = new Date();
    const isToday = dateStr === now.toLocaleDateString('en-CA');

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const minSlot = isToday ? currentMinutes + 15 : openMinutes;

    const deliveryMinSlot = type === 'DELIVERY' ? openMinutes + 30 : openMinutes;
    const startMinutes = Math.max(deliveryMinSlot, minSlot);
    const slots: string[] = [];
    const interval = storePickupSlotInterval || 15;

    const remainder = startMinutes % interval;
    const alignedStart = remainder === 0 ? startMinutes : startMinutes + (interval - remainder);

    for (let m = alignedStart; m < closeMinutes; m += interval) {
      const h = Math.floor(m / 60) % 24;
      const min = m % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
    }
    return slots;
  }, [getStoreHoursForDate, storePickupSlotInterval]);

  useEffect(() => {
    const now = currentTime;
    const todayStr = now.toLocaleDateString('en-CA');
    
    let openDays: number[] = [0,1,2,3,4,5,6];
    try {
      openDays = JSON.parse(storeOperationalDays || '[0,1,2,3,4,5,6]');
    } catch {}
    let closedDates: string[] = [];
    try {
      closedDates = JSON.parse(storeDisabledDates || '[]');
    } catch {}
    
    const dayOfWeek = now.getDay();
    const isOpenDay = openDays.includes(dayOfWeek);
    const isHoliday = closedDates.includes(todayStr);
    
    if (!isOpenDay || isHoliday) {
      setIsStoreCurrentlyOpen(false);
      return;
    }
    
    const { openTime, closeTime } = getStoreHoursForDate(todayStr);
    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);
    
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    setIsStoreCurrentlyOpen(currentMinutes >= openMinutes && currentMinutes < closeMinutes - 15);
  }, [currentTime, storeOperationalDays, storeDisabledDates, getStoreHoursForDate]);

  const availableDates = useMemo(() => {
    const dates: { value: string; label: string; dayLabel: string; isToday: boolean }[] = [];
    let openDays: number[] = [0,1,2,3,4,5,6];
    try {
      openDays = JSON.parse(storeOperationalDays || '[0,1,2,3,4,5,6]');
    } catch {}
    let closedDates: string[] = [];
    try {
      closedDates = JSON.parse(storeDisabledDates || '[]');
    } catch {}
    
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    const now = new Date();
    const baseDate = new Date(now.getTime());
    let iterations = 0;
    while (dates.length < 3 && iterations < 30) {
      const d = new Date(baseDate.getTime() + iterations * 24 * 60 * 60 * 1000);
      iterations++;
      const dayOfWeek = d.getDay();
      const dateString = d.toLocaleDateString('en-CA');
      
      const isOpenDay = openDays.includes(dayOfWeek);
      const isHoliday = closedDates.includes(dateString);
      
      let isAvailable = isOpenDay && !isHoliday;
      
      const isToday = dateString === now.toLocaleDateString('en-CA');
      if (isToday && isAvailable) {
        const { closeTime: todayCloseTime } = getStoreHoursForDate(dateString);
        const [closeH, closeM] = todayCloseTime.split(':').map(Number);
        const closeMinutes = closeH * 60 + closeM;
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        if (currentMinutes >= closeMinutes - 15) {
          isAvailable = false;
        }
      }
      
      if (isAvailable) {
        dates.push({
          value: dateString,
          label: `${d.getDate()} ${monthNames[d.getMonth()]}`,
          dayLabel: isToday ? 'Hari ini' : dayNames[d.getDay()],
          isToday
        });
      }
    }
    return dates;
  }, [storeOperationalDays, storeDisabledDates, getStoreHoursForDate]);

  // Synchronize pickupDate and pickupTime when availableDates changes
  useEffect(() => {
    if (availableDates.length > 0) {
      const isCurrentPickupDateAvailable = availableDates.some(ad => ad.value === pickupDate);
      if (!pickupDate || !isCurrentPickupDateAvailable) {
        const firstDate = availableDates[0];
        setPickupDate(firstDate.value);
        setTempPickupDate(firstDate.value);
        
        // If today is not open or not currently open, set default schedule slot
        if (!firstDate.isToday || !isStoreCurrentlyOpen) {
          const slots = getTimeSlotsForDate(firstDate.value, orderType);
          const defaultSlot = slots[0] || null;
          setPickupTime(defaultSlot);
          setTempPickupTime(defaultSlot || '');
        } else {
          setPickupTime('Sekarang');
          setTempPickupTime('Sekarang');
        }
      } else {
        const matched = availableDates.find(d => d.value === pickupDate);
        if (matched) {
          if ((!matched.isToday || !isStoreCurrentlyOpen) && pickupTime === 'Sekarang') {
            const slots = getTimeSlotsForDate(matched.value, orderType);
            const defaultSlot = slots[0] || null;
            setPickupTime(defaultSlot);
            setTempPickupTime(defaultSlot || '');
          }
        }
      }
    } else {
      setPickupDate(null);
      setPickupTime(null);
    }
  }, [availableDates, pickupDate, pickupTime, isStoreCurrentlyOpen, orderType, getTimeSlotsForDate]);

  // Automatically reset tumbler option when shipping method changes to DELIVERY
  useEffect(() => {
    if (orderType === 'DELIVERY') {
      setHasTumbler(false);
    }
  }, [orderType]);

  // Reset pickupTime if invalid for delivery when switching to DELIVERY
  useEffect(() => {
    if (orderType === 'DELIVERY' && pickupTime && pickupTime !== 'Sekarang') {
      const targetDate = pickupDate || new Date().toLocaleDateString('en-CA');
      const { openTime: targetOpenTime } = getStoreHoursForDate(targetDate);
      const [openH, openM] = targetOpenTime.split(':').map(Number);
      const openMinutes = openH * 60 + openM;
      const deliveryMinSlot = openMinutes + 30; // 30 minutes after opening
      
      const [pH, pM] = pickupTime.split(':').map(Number);
      const pickupMinutes = pH * 60 + pM;
      
      if (pickupMinutes < deliveryMinSlot) {
        setPickupTime(null);
        setTempPickupTime('');
      }
    }
  }, [orderType, pickupTime, pickupDate]);

  const [deliveryAddress, setDeliveryAddress] = useState<{ label: string, detail: string, streetDetail: string, lat: number, lng: number, distance: number, deliveryFee: number } | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);

  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');

  // Payment Config State
  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  const [paymentConfigLoading, setPaymentConfigLoading] = useState(true);

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(d => { if (d.products) setAllProducts(d.products); })
      .catch(() => {});

    fetch('/api/admin/store-settings')
      .then(r => r.json())
      .then(d => { if (d.openTime) setStoreSettings(prev => ({ ...prev, ...d })); })
      .catch(() => {});

    // Fetch loyalty settings
    fetch('/api/admin/loyalty/settings')
      .then(r => r.json())
      .then(d => {
        if (d.pointValue !== undefined) {
          setPointValue(d.pointValue || 1000);
        }
        if (d.tumblerBonusEnabled) {
          setTumblerEnabled(d.showTumblerCustomizer !== false);
          setTumblerBonusPoints(d.tumblerBonusPoints || 0);
          setTumblerDiscountPct(d.tumblerDiscountPct || 0);
        }
      })
      .catch(() => {});

    // Fetch payment methods config
    fetch('/api/payment-methods')
      .then(r => r.json())
      .then(d => {
        setPaymentConfig(d);
      })
      .catch(() => {})
      .finally(() => setPaymentConfigLoading(false));
  }, []);

  const {
    register, handleSubmit, setValue, getValues,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
  });

  // Fetch user profile on mount/auth
  useEffect(() => {
    if (session?.user) {
      fetch('/api/user/profile')
        .then(r => r.json())
        .then((profileData) => {
          let pName = session.user.name || '';
          let pPhone = '';
          if (profileData) {
            if (profileData.phoneVerified === false) {
              router.push('/setup-phone?callbackUrl=/checkout');
              return;
            }
            if (profileData.name) pName = profileData.name;
            if (profileData.phone) pPhone = profileData.phone;
            if (profileData.points !== undefined) setUserPoints(profileData.points);
            if (profileData.walletBalance !== undefined) setWalletBalance(profileData.walletBalance);
            if (profileData.subscription) {
              const isActive = profileData.subscription.status === 'ACTIVE' && new Date(profileData.subscription.expiresAt) > new Date();
              const tier = profileData.subscription.tier;
              setHasFreeDeliverySubscription(isActive && (tier === 'MATCHA_LATTE' || tier === 'GOLDEN_MATCHA'));
            }
          }
          setProfileName(pName);
          setProfilePhone(pPhone);
          setOvoPhone(pPhone || '');
          setValue('name', pName);
          setValue('phone', pPhone);
        })
        .catch(e => {
          console.error("Error loading checkout profile:", e);
          if (session.user.name) setValue('name', session.user.name);
        });
    }
  }, [session?.user?.id, setValue]);

  const fetchVouchers = async () => {
    setLoadingVouchers(true);
    try {
      const res = await fetch('/api/user/vouchers');
      if (res.ok) {
        const data = await res.json();
        setUserVouchers(data.vouchers || []);
        setClaimableTemplates(data.templates || []);
      }
    } catch (e) {
      console.error('Error fetching vouchers:', e);
    } finally {
      setLoadingVouchers(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchVouchers();
    }
  }, [session?.user?.id]);

  const subtotal = useMemo(() => {
    return checkoutItems.reduce((sum: number, item: any) => sum + item.totalPrice, 0);
  }, [checkoutItems]);

  const toppingTotal = useMemo(() => {
    return checkoutItems.reduce((sum: number, item: any) => sum + (item.addOns ? item.addOns.reduce((s: number, a: any) => s + a.price, 0) * item.quantity : 0), 0);
  }, [checkoutItems]);

  const sizeUpgradeTotal = useMemo(() => {
    return checkoutItems.reduce((sum: number, item: any) => sum + ((item.sizePrice || 0) * item.quantity), 0);
  }, [checkoutItems]);

  const filteredUserVouchers = useMemo(() => {
    const now = new Date();
    return userVouchers.filter(v => {
      // SECURITY FIX #L6: Filter out expired vouchers from active checkout selection
      const isExpired = v.expiresAt ? new Date(v.expiresAt) < now : false;
      if (isExpired) return false;

      if (voucherSearchQuery) {
        const q = voucherSearchQuery.toLowerCase();
        const codeMatch = v.code?.toLowerCase().includes(q);
        const descMatch = v.description?.toLowerCase().includes(q);
        const titleMatch = v.title?.toLowerCase().includes(q);
        if (!codeMatch && !descMatch && !titleMatch) return false;
      }

      if (selectedVoucherFilter === 'semua') return true;
      if (selectedVoucherFilter === 'diskon') {
        return v.type === 'DISCOUNT_RP' || v.type === 'DISCOUNT_PCT' || v.type === 'FREE_DRINK' || v.type === 'FREE_TOPPING' || v.type === 'UPGRADE_SIZE' || v.type === 'REFERRAL_REWARD' || v.type === 'B2G1' || v.type === 'BUY_X_GET_Y';
      }
      if (selectedVoucherFilter === 'cashback') {
        return v.type === 'CASHBACK' || v.description?.toLowerCase().includes('cashback') || v.title?.toLowerCase().includes('cashback');
      }
      if (selectedVoucherFilter === 'delivery') {
        return v.type === 'GRATIS_ONGKIR' || v.type === 'DISKON_ONGKIR';
      }
      return true;
    });
  }, [userVouchers, selectedVoucherFilter, voucherSearchQuery]);

  const usableVouchers = useMemo(() => {
    return filteredUserVouchers.filter(v => {
      let validProductIds: string[] | null = null;
      const rawProductIds = v.validProductIds || v.template?.validProductIds || null;
      if (rawProductIds) {
        if (Array.isArray(rawProductIds)) {
          validProductIds = rawProductIds;
        } else {
          try {
            const parsed = JSON.parse(rawProductIds);
            if (Array.isArray(parsed)) validProductIds = parsed;
          } catch {}
        }
      }

      let eligibleSub = subtotal;
      if (validProductIds && validProductIds.length > 0) {
        eligibleSub = checkoutItems
          .filter(item => validProductIds.includes(item.productId))
          .reduce((sum: number, item: any) => sum + item.totalPrice, 0);
        if (eligibleSub === 0) return false;
      }
      return eligibleSub >= (v.template?.minPurchase || v.minPurchase || 0);
    });
  }, [filteredUserVouchers, subtotal, items]);

  const unusableVouchers = useMemo(() => {
    return filteredUserVouchers.filter(v => {
      let validProductIds: string[] | null = null;
      const rawProductIds = v.validProductIds || v.template?.validProductIds || null;
      if (rawProductIds) {
        if (Array.isArray(rawProductIds)) {
          validProductIds = rawProductIds;
        } else {
          try {
            const parsed = JSON.parse(rawProductIds);
            if (Array.isArray(parsed)) validProductIds = parsed;
          } catch {}
        }
      }

      let eligibleSub = subtotal;
      if (validProductIds && validProductIds.length > 0) {
        eligibleSub = checkoutItems
          .filter(item => validProductIds.includes(item.productId))
          .reduce((sum: number, item: any) => sum + item.totalPrice, 0);
        if (eligibleSub === 0) return true;
      }
      return eligibleSub < (v.template?.minPurchase || v.minPurchase || 0);
    });
  }, [filteredUserVouchers, subtotal, items]);

  const hasUnusableVouchers = useMemo(() => {
    return unusableVouchers.length > 0;
  }, [unusableVouchers]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const tumblerDiscount = hasTumbler && tumblerDiscountPct > 0 ? Math.round(subtotal * tumblerDiscountPct / 100) : 0;
  const shippingFee = orderType === 'DELIVERY' && deliveryAddress 
    ? (hasFreeDeliverySubscription ? 0 : deliveryAddress.deliveryFee) 
    : 0;
  
  const hasFreeShippingBundle = useMemo(() => {
    return checkoutItems.some(item => {
      if (item.isBundle) {
        const prod = allProducts.find(p => p.id === item.productId);
        if (prod?.modifiers) {
          return (prod.modifiers as any).freeShipping === true;
        }
      }
      return false;
    });
  }, [checkoutItems, allProducts]);

  const ongkirDiscount = useMemo(() => {
    if (hasFreeShippingBundle) return shippingFee;
    if (!appliedVoucher) return 0;
    if (appliedVoucher.type === 'GRATIS_ONGKIR') return shippingFee;
    if (appliedVoucher.type === 'DISKON_ONGKIR') return Math.min(shippingFee, appliedVoucher.discountAmount || 10000);
    return 0;
  }, [hasFreeShippingBundle, appliedVoucher, shippingFee]);

  const voucherDiscount = useMemo(() => {
    if (!appliedVoucher) return 0;
    if (appliedVoucher.type === 'GRATIS_ONGKIR' || appliedVoucher.type === 'DISKON_ONGKIR') return 0;

    let validProductIds: string[] | null = null;
    const rawProductIds = appliedVoucher.validProductIds || (appliedVoucher as any).template?.validProductIds || null;
    if (rawProductIds) {
      if (Array.isArray(rawProductIds)) {
        validProductIds = rawProductIds;
      } else {
        try {
          const parsed = JSON.parse(rawProductIds);
          if (Array.isArray(parsed)) {
            validProductIds = parsed;
          }
        } catch (e) {
          console.error(e);
        }
      }
    }

    const eligibleItems = validProductIds && validProductIds.length > 0
      ? checkoutItems.filter(item => validProductIds.includes(item.productId))
      : checkoutItems;

    const eligibleSubtotal = validProductIds && validProductIds.length > 0
      ? eligibleItems.reduce((sum: number, item: any) => sum + item.totalPrice, 0)
      : subtotal;

    const maxSingleUnitEligiblePrice = eligibleItems.length > 0
      ? Math.max(...eligibleItems.map((item: any) => {
          const singleUnit = item.isBundle && item.bundleSelections
            ? (item.basePrice + item.bundleSelections.reduce((sum: number, a: any) => sum + (a.priceAdjustment || 0), 0))
            : (item.basePrice + (item.sizePrice || 0) + (item.addOns ? item.addOns.reduce((s: number, a: any) => s + a.price, 0) : 0));
          return singleUnit;
        }))
      : 0;

    if (appliedVoucher.type === 'FREE_TOPPING') {
      const allAddOns = eligibleItems.flatMap((item: any) => item.addOns || []);
      if (allAddOns.length === 0) return 0;
      const highestToppingPrice = Math.max(...allAddOns.map((a: any) => a.price));
      return highestToppingPrice > 0 ? highestToppingPrice : 0;
    }

    if (appliedVoucher.type === 'UPGRADE_SIZE') {
      const maxSizeUpgrade = eligibleItems.reduce((max: number, item: any) => {
        const itemSizePrice = item.sizePrice || 0;
        return itemSizePrice > max ? itemSizePrice : max;
      }, 0);
      return maxSizeUpgrade;
    }

    if (appliedVoucher.type === 'B2G1' || appliedVoucher.type === 'BUY_X_GET_Y') {
      const rawBuyQty = (appliedVoucher as any).template?.discountValue || (appliedVoucher as any).discountValue || 2;
      const buyQty = rawBuyQty > 0 ? rawBuyQty : 2;
      const getQty = 1;
      const requiredSetQty = buyQty + getQty;

      const individualUnitPrices: number[] = [];
      for (const item of eligibleItems) {
        const singlePrice = item.isBundle && item.bundleSelections
          ? (item.basePrice + item.bundleSelections.reduce((sum: number, a: any) => sum + (a.priceAdjustment || 0), 0))
          : (item.basePrice + (item.sizePrice || 0) + (item.addOns ? item.addOns.reduce((s: number, a: any) => s + a.price, 0) : 0));
        for (let q = 0; q < (item.quantity || 1); q++) {
          individualUnitPrices.push(singlePrice);
        }
      }

      if (individualUnitPrices.length < requiredSetQty) {
        return 0;
      }

      const numFree = Math.floor(individualUnitPrices.length / requiredSetQty) * getQty;
      individualUnitPrices.sort((a, b) => a - b);

      const maxDiscount = appliedVoucher.maxDiscount ?? (appliedVoucher as any).template?.maxDiscount;
      let totalDiscount = 0;
      for (let i = 0; i < numFree; i++) {
        let price = individualUnitPrices[i];
        if (maxDiscount && maxDiscount > 0) {
          price = Math.min(price, maxDiscount);
        }
        totalDiscount += price;
      }
      return Math.min(totalDiscount, eligibleSubtotal);
    }
    
    // Resolve discount value from either discountAmount or template.discountValue
    const discountVal = (appliedVoucher.discountAmount !== undefined && appliedVoucher.discountAmount !== null && appliedVoucher.discountAmount > 0)
      ? appliedVoucher.discountAmount
      : (appliedVoucher as any).template?.discountValue || (appliedVoucher as any).discountValue || 0;

    if (discountVal > 0) {
      if (appliedVoucher.type === 'DISCOUNT_PCT') {
        const rawDiscount = Math.round((eligibleSubtotal * discountVal) / 100);
        const maxDiscount = appliedVoucher.maxDiscount ?? (appliedVoucher as any).template?.maxDiscount;
        if (maxDiscount && maxDiscount > 0) {
          return Math.min(rawDiscount, maxDiscount);
        }
        return rawDiscount;
      }
      if (appliedVoucher.type === 'FREE_DRINK' || appliedVoucher.type === 'REFERRAL_REWARD') {
        return Math.min(maxSingleUnitEligiblePrice, discountVal);
      }
      return Math.min(eligibleSubtotal, discountVal);
    }
    switch (appliedVoucher.type) {
      case 'FREE_DRINK': return Math.min(maxSingleUnitEligiblePrice, 25000);
      case 'REFERRAL_REWARD': return Math.min(maxSingleUnitEligiblePrice, 25000);
      case 'DISCOUNT_RP': return Math.min(eligibleSubtotal, 10000);
      default: return Math.min(eligibleSubtotal, 10000);
    }
  }, [appliedVoucher, subtotal, checkoutItems]);

  const maxPointsAllowed = useMemo(() => {
    const remainingAmount = Math.max(0, subtotal - tumblerDiscount - voucherDiscount);
    return Math.min(userPoints, Math.floor(remainingAmount / pointValue));
  }, [userPoints, subtotal, tumblerDiscount, voucherDiscount, pointValue]);

  const pointsDiscount = usePoints ? Math.min(pointsToUse, maxPointsAllowed) * pointValue : 0;

  useEffect(() => {
    if (usePoints && pointsToUse > maxPointsAllowed) {
      setPointsToUse(maxPointsAllowed);
    }
  }, [usePoints, pointsToUse, maxPointsAllowed]);

  const grandTotal = Math.max(0, subtotal - tumblerDiscount - voucherDiscount - pointsDiscount) + Math.max(0, shippingFee - ongkirDiscount);
  const itemCount = checkoutItems.reduce((sum: number, i: any) => sum + i.quantity, 0);

  const modalTimeSlots = useMemo(() => {
    const targetDate = tempPickupDate || new Date().toLocaleDateString('en-CA');
    return getTimeSlotsForDate(targetDate, orderType);
  }, [tempPickupDate, orderType, getTimeSlotsForDate]);

  // Automatic payment switches to COD and QRIS/Transfer cannot be selected when grandTotal reaches 0
  useEffect(() => {
    if (grandTotal === 0) {
      setPaymentMethod('COD');
    }
  }, [grandTotal]);

  // Persist applied voucher code to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && isVoucherRestored) {
      if (appliedVoucher?.code) {
        localStorage.setItem('arumseduh_applied_voucher_code', appliedVoucher.code);
      } else {
        localStorage.removeItem('arumseduh_applied_voucher_code');
        localStorage.removeItem('matchaboy_applied_voucher_code');
      }
    }
  }, [appliedVoucher, isVoucherRestored]);

  // Restore applied voucher code on mount/auth/vouchers load
  useEffect(() => {
    if (session?.user && userVouchers.length > 0 && !isVoucherRestored) {
      const savedCode = localStorage.getItem('arumseduh_applied_voucher_code') || localStorage.getItem('matchaboy_applied_voucher_code');
      if (savedCode) {
        const matched = usableVouchers.find(v => v.code === savedCode);
        if (matched) {
          setAppliedVoucher(matched);
        } else {
          fetch('/api/checkout/validate-voucher', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: savedCode }),
          })
          .then(async res => {
            if (res.ok) {
              const data = await res.json();
              setAppliedVoucher(data.voucher);
            } else {
              localStorage.removeItem('arumseduh_applied_voucher_code');
              localStorage.removeItem('matchaboy_applied_voucher_code');
            }
          })
          .catch(() => {});
        }
      }
      setIsVoucherRestored(true);
    }
  }, [session, userVouchers, usableVouchers, isVoucherRestored]);

  const getEndTime = (timeStr: string | null) => {
    if (!timeStr || timeStr === 'Sekarang') return '';
    const [h, m] = timeStr.split(':').map(Number);
    const totalMins = h * 60 + m + 15;
    const endH = Math.floor(totalMins / 60) % 24;
    const endM = totalMins % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isScheduleModalOpen) {
      if (pickupTime && pickupTime !== 'Sekarang') {
        setTempPickupTime(pickupTime);
      } else if (modalTimeSlots.length > 0) {
        setTempPickupTime(modalTimeSlots[0]);
      }
      setTempPickupDate(pickupDate || (availableDates.length > 0 ? availableDates[0].value : null));
    }
  }, [isScheduleModalOpen]);

  const [tempHour, tempMin] = useMemo(() => {
    if (!tempPickupTime || tempPickupTime === 'Sekarang') {
      if (modalTimeSlots.length > 0) {
        return modalTimeSlots[0].split(':');
      }
      return [null, null];
    }
    return tempPickupTime.split(':');
  }, [tempPickupTime, modalTimeSlots]);

  const availableHours = useMemo(() => {
    const hours = new Set<string>();
    modalTimeSlots.forEach((slot) => {
      const [h] = slot.split(':');
      hours.add(h);
    });
    return Array.from(hours).sort();
  }, [modalTimeSlots]);

  const availableMinutesForSelectedHour = useMemo(() => {
    const activeHour = tempHour || (availableHours.length > 0 ? availableHours[0] : null);
    if (!activeHour) return [];
    const minutes = new Set<string>();
    modalTimeSlots.forEach((slot) => {
      const [h, m] = slot.split(':');
      if (h === activeHour) {
        minutes.add(m);
      }
    });
    return Array.from(minutes).sort();
  }, [modalTimeSlots, tempHour, availableHours]);

  const handleHourSelect = (hour: string) => {
    const minsForHour = modalTimeSlots
      .filter((slot) => slot.startsWith(`${hour}:`))
      .map((slot) => slot.split(':')[1]);
    let newMin = tempMin;
    if (!newMin || !minsForHour.includes(newMin)) {
      newMin = minsForHour[0] || '00';
    }
    setTempPickupTime(`${hour}:${newMin}`);
  };

  const handleMinSelect = (min: string) => {
    const hour = tempHour || (availableHours.length > 0 ? availableHours[0] : '08');
    setTempPickupTime(`${hour}:${min}`);
  };

  // Scroll synchronization effect
  useEffect(() => {
    if (isScheduleModalOpen) {
      isScrollingProgrammatically.current = true;
      const timer = setTimeout(() => {
        if (hourContainerRef.current) {
          const selectedEl = hourContainerRef.current.querySelector('[data-selected="true"]');
          if (selectedEl) {
            selectedEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
        }
        if (minContainerRef.current) {
          const selectedEl = minContainerRef.current.querySelector('[data-selected="true"]');
          if (selectedEl) {
            selectedEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
        }
        // Let programmatic scrolling finish before allowing scroll listener
        setTimeout(() => {
          isScrollingProgrammatically.current = false;
        }, 500);
      }, 80);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [isScheduleModalOpen, tempHour, tempMin]);

  // Robust Date Selection and State Reset
  useEffect(() => {
    if (!tempPickupDate) return;
    const now = new Date();
    const isToday = tempPickupDate === now.toLocaleDateString('en-CA');
    
    if (isToday && isStoreCurrentlyOpen) {
      if (!tempPickupTime) {
        setTempPickupTime('Sekarang');
      }
    } else {
      if (tempPickupTime === 'Sekarang' || !modalTimeSlots.includes(tempPickupTime)) {
        if (modalTimeSlots.length > 0) {
          setTempPickupTime(modalTimeSlots[0]);
        } else {
          setTempPickupTime('');
        }
      }
    }
  }, [tempPickupDate, modalTimeSlots, isStoreCurrentlyOpen]);

  const handleScroll = (container: HTMLDivElement, isHour: boolean) => {
    if (isScrollingProgrammatically.current) return;
    const rect = container.getBoundingClientRect();
    const containerCenter = rect.top + rect.height / 2;
    
    const children = Array.from(container.children) as HTMLElement[];
    let closestVal = '';
    let minDistance = Infinity;
    
    children.forEach((child) => {
      const childRect = child.getBoundingClientRect();
      const childCenter = childRect.top + childRect.height / 2;
      const distance = Math.abs(containerCenter - childCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestVal = child.getAttribute('data-value') || '';
      }
    });
    
    if (closestVal) {
      if (isHour) {
        if (closestVal !== tempHour) {
          handleHourSelect(closestVal);
        }
      } else {
        if (closestVal !== tempMin) {
          handleMinSelect(closestVal);
        }
      }
    }
  };

  const handleHourScrollEvent = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (hourScrollTimeout.current) clearTimeout(hourScrollTimeout.current);
    hourScrollTimeout.current = setTimeout(() => {
      handleScroll(container, true);
    }, 150);
  };

  const handleMinScrollEvent = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (minScrollTimeout.current) clearTimeout(minScrollTimeout.current);
    minScrollTimeout.current = setTimeout(() => {
      handleScroll(container, false);
    }, 150);
  };

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) return;
    setVoucherLoading(true);
    setVoucherError('');
    try {
      const res = await fetch('/api/checkout/validate-voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: voucherCode.trim(),
          items: checkoutItems,
          subtotal,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAppliedVoucher(data.voucher);
      setToast({ message: `Voucher "${data.voucher.description}" berhasil diterapkan!`, type: 'success' });
    } catch (e: any) {
      setVoucherError(e.message);
    } finally {
      setVoucherLoading(false);
    }
  };

  const isStoreClosedToday = useMemo(() => {
    if (availableDates.length === 0) return true;
    return !availableDates[0].isToday;
  }, [availableDates]);

  const canSubmit = useMemo(() => {
    if (items.length === 0) return false;
    
    if (orderType === 'DINE_IN') {
      if (!selectedTable) return false;
    }

    // Check if selecting "Sekarang" but store is currently closed/not open
    if (orderType !== 'DINE_IN' && pickupTime === 'Sekarang' && (!isStoreCurrentlyOpen || isStoreClosedToday)) {
      return false;
    }

    if (orderType === 'PICKUP') {
      if (!pickupDate || !pickupTime) return false;
      
      // If scheduled time, validate against valid slots
      if (pickupTime !== 'Sekarang' && pickupDate) {
        const slots = getTimeSlotsForDate(pickupDate, 'PICKUP');
        if (!slots.includes(pickupTime)) return false;
      }
    }
    if (orderType === 'DELIVERY') {
      if (!deliveryAddress) return false;
      if (!pickupDate || !pickupTime) return false;
      
      // If scheduled time, validate against valid slots
      if (pickupTime !== 'Sekarang' && pickupDate) {
        const slots = getTimeSlotsForDate(pickupDate, 'DELIVERY');
        if (!slots.includes(pickupTime)) return false;
      }
      
      if (isStoreClosedToday) return false;
    }
    if (!paymentMethod) return false;
    return true;
  }, [items.length, orderType, pickupDate, pickupTime, deliveryAddress, paymentMethod, isStoreClosedToday, isStoreCurrentlyOpen, getTimeSlotsForDate, selectedTable]);

  const onSubmit = (data: CheckoutFormData) => {
    if (!canSubmit) return;
    setTempFormData(data);

    // If Arus Pay is selected but balance is insufficient, prompt Top Up directly
    if (paymentMethod === 'WALLET' && walletBalance < grandTotal) {
      const shortfall = Math.max(0, grandTotal - walletBalance);
      setToast({
        message: `Saldo Arus Pay kurang ${formatRupiah(shortfall)}. Silakan Top Up terlebih dahulu atau pilih metode lain.`,
        type: 'error',
      });
      setIsTopUpOpen(true);
      return;
    }
    
    // Intercept OVO to ask for phone number if not present
    if (paymentMethod === 'DOKU' && paymentChannel === 'OVO' && !ovoPhone) {
      setIsOvoSheetOpen(true);
      return;
    }

    setShowPaymentConfirmation(true);
  };

  const confirmAndSubmitOrder = async (verifiedPin?: string) => {
    if (!tempFormData || !canSubmit) return;
    if (orderType === 'DELIVERY' && (!pickupDate || !pickupTime)) {
      setToast({ message: 'Waktu pengiriman harus ditentukan', type: 'error' });
      return;
    }
    if (paymentMethod === 'WALLET' && walletBalance < grandTotal) {
      setToast({ message: `Saldo Arus Pay tidak mencukupi. Saldo Anda: ${formatRupiah(walletBalance)}, Tagihan: ${formatRupiah(grandTotal)}`, type: 'error' });
      return;
    }
    if (paymentMethod === 'WALLET' && !verifiedPin) {
      setShowPaymentConfirmation(false);
      setShowArusPayPinModal(true);
      return;
    }
    setIsSubmitting(true);
    setShowPaymentConfirmation(false);
    setShowArusPayPinModal(false);

    try {
      const payload = {
        name: tempFormData.name,
        phone: (paymentMethod === 'DOKU' && paymentChannel === 'OVO' && ovoPhone) 
          ? ovoPhone 
          : tempFormData.phone,
        notes: tempFormData.notes,
        orderType,
        tableNumber: orderType === 'DINE_IN' ? selectedTable : undefined,
        hasTumbler,
        voucherCode: appliedVoucher?.code || undefined,
        pointsUsed: usePoints ? Math.min(pointsToUse, maxPointsAllowed) : 0,
        pickupDate: pickupDate || undefined,
        pickupTime: pickupTime || undefined,
        paymentMethod,
        paymentChannel: paymentMethod === 'DOKU' ? paymentChannel : undefined,
        pin: paymentMethod === 'WALLET' ? verifiedPin : undefined,
        groupCartId: groupCartId || undefined,
        items: checkoutItems.map((item: any) => {
          const isMatcha = item.name.toLowerCase().includes('matcha') || item.name.toLowerCase().includes('green tea');
          const matchaString = isMatcha && item.matchaLevel !== undefined ? `, Matcha Lvl: ${item.matchaLevel}` : '';
          return {
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: item.basePrice,
            totalPrice: item.totalPrice,
            size: item.size || 'Normal',
            sizePrice: item.sizePrice || 0,
            modsString: item.isBundle && item.bundleSelections
              ? item.bundleSelections.map((s: any) => `${s.groupName}: ${s.productName}${s.iceLevel || s.sugarLevel ? ` (${[s.iceLevel, s.sugarLevel].filter(Boolean).join(' → ')})` : ''}`).join(' | ')
              : (() => {
                  const p: string[] = [];
                  if (item.matchaLevel !== undefined && item.matchaLevel !== null) p.push(`Matcha Lvl: ${item.matchaLevel}`);
                  if (item.size && item.size !== 'Normal' && item.size !== 'Regular') p.push(`Size: ${item.size}`);
                  if (item.iceLevel && item.sugarLevel) p.push(`${item.iceLevel} → ${item.sugarLevel}`);
                  else if (item.iceLevel) p.push(item.iceLevel);
                  else if (item.sugarLevel) p.push(item.sugarLevel);
                  if (item.addOns && item.addOns.length > 0) p.push('+' + item.addOns.map((a: any) => a.name).join(', +'));
                  return p.length > 0 ? p.join(', ') : null;
                })(),
            isBundle: item.isBundle || false,
            bundleSelections: item.isBundle ? item.bundleSelections : undefined
          };
        }),
        address: deliveryAddress ? { ...deliveryAddress } : undefined,
        deliveryFee: orderType === 'DELIVERY' && deliveryAddress ? deliveryAddress.deliveryFee : 0,
      };

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.error || 'Gagal membuat pesanan');

      clearCart();
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('arumseduh_pickup_warning_shown');
        sessionStorage.removeItem('matchaboy_pickup_warning_shown');
      }
      
      setIsSubmitting(false);
      
      // COD and WALLET redirect straight to Order Tracking, QRIS goes directly to in-app QRIS Payment page
      if (paymentMethod === 'COD' || paymentMethod === 'WALLET') {
        router.push(`/orders/${responseData.orderId}`);
      } else if (paymentMethod === 'QRIS') {
        router.push(`/orders/${responseData.orderId}/payment`);
      } else if (responseData.paymentUrl) {
        window.location.href = responseData.paymentUrl;
      } else {
        router.push(`/orders/${responseData.orderId}/payment`);
      }
    } catch (error: any) {
      setToast({ message: error.message, type: 'error' });
      setIsSubmitting(false);
    }
  };

  const handleEditOrAdd = async (cartItem: CartItem, isEdit: boolean) => {
    try {
      const res = await fetch(`/api/products/${cartItem.productId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedProduct(data.product);
        setEditingCartItem(isEdit ? cartItem : { ...cartItem, id: '' });
        setIsProductModalOpen(true);
      }
    } catch (e) {
      console.error('Failed to fetch product details', e);
    }
  };

  const handleSelectRecommendation = (product: Product) => {
    setSelectedProduct(product);
    setEditingCartItem(null);
    setIsProductModalOpen(true);
  };

  // Show pickup reminder when time is selected (Only once!)
  useEffect(() => {
    if (pickupTime && !pickupWarningShown) {
      setShowPickupWarning(true);
    }
  }, [pickupTime, pickupWarningShown]);

  // Auth Guard
  if (status === 'loading') {
    return <CheckoutSummarySkeleton />;
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-dvh bg-[#FFFBF5] flex items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm rounded-[2rem] bg-white p-8 shadow-[0_15px_40px_rgba(0,0,0,0.03)] border border-[#EADFC9]/30 text-center"
        >
          <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-gradient-to-br from-[#B48A5E] to-[#946F48] flex items-center justify-center shadow-md">
            <User className="w-8 h-8 text-white" />
          </div>
          <h3 className="font-serif text-xl font-bold text-gray-900 mb-2">
            Login Diperlukan
          </h3>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Kamu harus masuk terlebih dahulu untuk melanjutkan pemesanan menu Arum Seduh favoritmu.
          </p>
          <button
            type="button"
            onClick={openLogin}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-[#B48A5E] to-[#946F48] text-white font-bold text-[15px] hover:opacity-95 transition-opacity shadow-lg shadow-[#B48A5E]/15 active:scale-[0.98] transition-all duration-200"
          >
            Masuk / Daftar
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    );
  }

  // Empty cart guard
  if (checkoutItems.length === 0) {
    if (loadingGroupCart) {
      return <CheckoutSummarySkeleton />;
    }
    return (
      <div className="min-h-dvh bg-[#FFFBF5] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mb-6 shadow-inner border border-orange-100">
          <ShoppingBag className="w-8 h-8 text-orange-600" />
        </div>
        <h2 className="font-serif font-bold text-xl text-gray-900 mb-2">Keranjang Kosong</h2>
        <p className="text-sm text-gray-500 mb-6 max-w-xs">Yuk, jelajahi menu terbaik Arum Seduh dan tambahkan minuman atau camilan favoritmu!</p>
        <button onClick={() => router.push('/')} className="px-8 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-sm shadow-lg shadow-orange-500/20 hover:from-orange-600 hover:to-amber-600 transition-all active:scale-[0.98]">
          Kembali ke Menu
        </button>
      </div>
    );
  }

  const totalDiscountAmount = voucherDiscount + tumblerDiscount + pointsDiscount + ongkirDiscount;
  const grossBeforeDiscount = subtotal + shippingFee;
  const isWalletShortfall = paymentMethod === 'WALLET' && walletBalance < grandTotal;
  const walletShortfallAmount = Math.max(0, grandTotal - walletBalance);
  const walletRemainingAfterPay = Math.max(0, walletBalance - grandTotal);

  const activePaymentLabel =
    paymentMethod === 'WALLET'
      ? 'Arus Pay (Saldo)'
      : paymentMethod === 'COD'
      ? 'Cash (Bayar Tunai)'
      : paymentMethod === 'QRIS'
      ? 'QRIS'
      : 'Belum Dipilih';

  return (
    <div className="min-h-dvh bg-[#FFFBF5] pb-28 md:pb-16 noise relative">
      {/* Pickup Warning Modal */}
      <AnimatePresence>
        {showPickupWarning && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm rounded-[2rem] bg-white p-7 shadow-2xl border border-gray-100"
            >
              <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100/60 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-center font-serif text-lg font-bold text-gray-950 mb-2">Waktu Pengambilan</h3>
              <p className="text-center text-xs text-gray-500 mb-6 leading-relaxed">
                Demi kualitas citarasa minuman terbaik, disarankan untuk <strong>tidak mengambil pesanan lebih dari 7 menit</strong> dari waktu yang dijadwalkan.
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowPickupWarning(false);
                  setPickupWarningShown(true);
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem('arumseduh_pickup_warning_shown', 'true');
                  }
                }}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-sm shadow-md shadow-orange-500/10"
              >
                Saya Mengerti
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tumbler Warning Modal */}
      <AnimatePresence>
        {showTumblerWarning && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm rounded-[2rem] bg-white p-7 shadow-2xl border border-gray-100"
            >
              <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100/60 flex items-center justify-center">
                <Leaf className="w-7 h-7 text-orange-600 animate-pulse" />
              </div>
              <h3 className="text-center font-serif text-lg font-bold text-gray-950 mb-2">Bawa Tumbler Sendiri</h3>
              <p className="text-center text-xs text-gray-500 mb-6 leading-relaxed">
                Pastikan Anda <strong>betul-betul membawa tumbler sendiri</strong> dengan ukuran yang cukup besar (disarankan ukuran Large/besar) saat mengambil pesanan di gerai Arum Seduh.
              </p>
              <button
                type="button"
                onClick={() => setShowTumblerWarning(false)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-sm shadow-md shadow-orange-500/10"
              >
                Saya Mengerti
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#FFFBF5]/90 backdrop-blur-md border-b border-orange-100/80">
        <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3.5 max-w-6xl mx-auto">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white shadow-sm border border-orange-100 text-gray-800 hover:bg-orange-50/50 transition-colors cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-serif font-black text-lg sm:text-xl text-gray-900 leading-tight">Checkout Pesanan</h1>
              <p className="text-[11px] font-semibold text-gray-500">Arum Seduh · {itemCount} Item di Keranjang</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200/70 text-orange-700 text-[11px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
            <span>Transaksi Aman</span>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col lg:flex-row gap-6 lg:gap-8 items-start relative z-10">
        {/* ══════════════════════════════════════════════════════════════════
            LEFT COLUMN: Order Type, Table, Customer Info, Eco Tumbler, Items
            ══════════════════════════════════════════════════════════════════ */}
        <div className="w-full lg:flex-1 space-y-6">
          {/* ── 1. Order Type Selector ────────────────────────── */}
          <section className="bg-white rounded-[2rem] border border-orange-100/80 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif font-bold text-base text-gray-900 flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                  <Store className="w-4 h-4" />
                </div>
                <span>Metode Pengambilan</span>
              </h2>
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">
                Langkah 1
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOrderType('PICKUP')}
                className={`flex items-center gap-3 px-4 py-4 rounded-2xl border-2 transition-all active:scale-[0.98] text-left cursor-pointer
                  ${orderType === 'PICKUP'
                    ? 'border-orange-500 bg-gradient-to-br from-orange-50/90 to-amber-50/50 shadow-sm shadow-orange-500/10'
                    : 'border-gray-100 bg-gray-50/50 hover:border-orange-200 hover:bg-white'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  orderType === 'PICKUP' ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-400'
                }`}>
                  <Store className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-black text-gray-900">Pickup</span>
                  <span className="block text-[10px] font-semibold text-gray-500 truncate">Ambil di Booth</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setOrderType('DINE_IN')}
                className={`flex items-center gap-3 px-4 py-4 rounded-2xl border-2 transition-all active:scale-[0.98] text-left cursor-pointer
                  ${orderType === 'DINE_IN'
                    ? 'border-orange-500 bg-gradient-to-br from-orange-50/90 to-amber-50/50 shadow-sm shadow-orange-500/10'
                    : 'border-gray-100 bg-gray-50/50 hover:border-orange-200 hover:bg-white'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  orderType === 'DINE_IN' ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-400'
                }`}>
                  <Coffee className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-black text-gray-900">Dine In</span>
                  <span className="block text-[10px] font-semibold text-gray-500 truncate">Minum di Tempat</span>
                </div>
              </button>
            </div>

            {orderType === 'PICKUP' && isStoreClosedToday && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 text-red-800">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-extrabold text-gray-900">Toko Tutup Hari Ini</p>
                  <p className="text-xs text-red-700 leading-relaxed font-semibold">
                    Maaf, toko kami tutup hari ini. Silakan jadwalkan waktu pengambilan Anda di tanggal buka lain yang tersedia di bawah.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* ── Dine-In Table Selection ────────────────────────── */}
          {orderType === 'DINE_IN' && (
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2rem] border border-orange-100/80 p-6 shadow-sm space-y-4">
              <h2 className="font-serif font-bold text-base text-gray-900 flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                  <Coffee className="w-4 h-4" />
                </div>
                <span>Informasi Meja Dine-In</span>
              </h2>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 pl-1">Nomor Meja</label>
                  {tableNumber ? (
                    <div className="flex items-center justify-between p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-emerald-800">Meja Terkunci: Meja {tableNumber}</span>
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full mt-0.5 self-start">
                          <Check className="w-2.5 h-2.5" /> Scan QR
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          useCartStore.getState().setTableNumber(null);
                          setSelectedTable('');
                        }}
                        className="px-3.5 py-2 bg-white border border-emerald-200 hover:border-amber-400 text-xs font-black text-emerald-800 hover:text-amber-800 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        Pindah Meja
                      </button>
                    </div>
                  ) : (
                    <select
                      value={selectedTable}
                      onChange={(e) => setSelectedTable(e.target.value)}
                      className="w-full px-4.5 py-3.5 rounded-2xl border border-gray-200 bg-[#F9F8F6] text-sm focus:outline-none focus:bg-white focus:border-orange-500 transition-all shadow-inner"
                    >
                      <option value="">Pilih Nomor Meja</option>
                      {dbTables.map(t => {
                        const isOccupied = t.status === 'OCCUPIED';
                        return (
                          <option key={t.id} value={t.number} disabled={isOccupied}>
                            Meja {t.number} ({isOccupied ? 'Terisi' : 'Tersedia'})
                          </option>
                        );
                      })}
                      {dbTables.length === 0 && (
                        <>
                          <option value="1">Meja 1</option>
                          <option value="2">Meja 2</option>
                          <option value="3">Meja 3</option>
                          <option value="4">Meja 4</option>
                          <option value="5">Meja 5</option>
                        </>
                      )}
                    </select>
                  )}
                </div>
              </div>

              {!tableNumber && (
                <button
                  type="button"
                  onClick={() => setShowFloorPlanModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-orange-50/40 border border-orange-200/70 hover:bg-orange-50 hover:border-orange-400 text-orange-700 text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Lihat Denah Meja Ruangan</span>
                </button>
              )}
            </motion.section>
          )}

          {/* ── 2. Customer Details ───────────────────────────── */}
          <section className="bg-white rounded-[2rem] border border-orange-100/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-bold text-base text-gray-900 flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                  <User className="w-4 h-4" />
                </div>
                <span>Detail Pemesan</span>
              </h2>
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">
                Langkah 2
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 pl-1">Nama Lengkap</label>
                <input {...register('name')} placeholder="Nama Anda"
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-[#F9F8F6] text-sm focus:outline-none focus:bg-white focus:border-orange-500 transition-all shadow-inner" />
                {errors.name && <p className="text-xs text-red-500 mt-1 pl-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 pl-1">Nomor HP (WhatsApp)</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input {...register('phone')} placeholder="08123456789" type="tel"
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-[#F9F8F6] text-sm focus:outline-none focus:bg-white focus:border-orange-500 transition-all shadow-inner" />
                </div>
                {errors.phone && <p className="text-xs text-red-500 mt-1 pl-1">{errors.phone.message}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 pl-1">Catatan Pesanan (opsional)</label>
                <input {...register('notes')} placeholder="Contoh: Es dipisah, ekstra sedotan, atau catatan pengambilan"
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-[#F9F8F6] text-sm focus:outline-none focus:bg-white focus:border-orange-500 transition-all shadow-inner" />
              </div>
            </div>
          </section>

          {/* ── 3. Tumbler Toggle (Eco Card) ──────────────────── */}
          {tumblerEnabled && (orderType === 'PICKUP' || orderType === 'DINE_IN') && (
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <button
                type="button"
                onClick={() => {
                  const newVal = !hasTumbler;
                  setHasTumbler(newVal);
                  if (newVal) {
                    setShowTumblerWarning(true);
                  }
                }}
                className={`w-full relative overflow-hidden rounded-[2rem] border-2 p-5 transition-all duration-300 text-left active:scale-[0.99] cursor-pointer ${
                  hasTumbler
                    ? 'border-amber-400 bg-gradient-to-r from-amber-50/90 to-orange-50/70 shadow-md shadow-orange-100/50'
                    : 'border-orange-100/80 bg-white hover:border-amber-300'
                }`}
              >
                <div className="relative z-10 flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                    hasTumbler ? 'bg-gradient-to-br from-orange-500 to-amber-500 shadow-md shadow-orange-500/20 text-white' : 'bg-orange-50 border border-orange-100 text-orange-500'
                  }`}>
                    <Leaf className="w-5.5 h-5.5" />
                  </div>

                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className={`text-sm font-bold transition-colors ${hasTumbler ? 'text-gray-900' : 'text-gray-900'}`}>
                        Saya Bawa Tumbler Sendiri
                      </p>
                      
                      {/* Tooltip Info Popover */}
                      <div className="relative group inline-block z-30">
                        <span className="w-4 h-4 rounded-full bg-amber-100 text-orange-700 flex items-center justify-center text-[10px] font-black cursor-help hover:bg-amber-200 transition-colors">
                          ?
                        </span>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-gray-900 text-white rounded-xl text-[10px] font-medium leading-relaxed opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-xl pointer-events-none">
                          <div className="space-y-1">
                            <p className="font-black text-amber-400 flex items-center gap-1 uppercase tracking-wider text-[9px]">
                              <Leaf className="w-3 h-3" /> Eco-Friendly Impact
                            </p>
                            <p className="text-gray-200">Dengan menggunakan reusable cup:</p>
                            <p className="pl-2 border-l border-amber-500/50 text-gray-300">
                              • Hemat: <span className="font-bold text-amber-300">Diskon {tumblerDiscountPct}%</span> ({formatRupiah(tumblerDiscount)})
                            </p>
                            <p className="pl-2 border-l border-amber-500/50 text-gray-300">
                              • Eco-Points: <span className="font-bold text-amber-300">+{tumblerBonusPoints} Poin</span>
                            </p>
                          </div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                        </div>
                      </div>

                      {hasTumbler && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-orange-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          <Check className="w-2.5 h-2.5" /> Aktif
                        </span>
                      )}
                    </div>
                    <p className={`text-xs leading-relaxed transition-colors ${hasTumbler ? 'text-orange-900/80 font-medium' : 'text-gray-500 font-medium'}`}>
                      Kurangi sampah gelas sekali pakai dan dapatkan <strong>+{tumblerBonusPoints} bonus poin</strong>
                      {tumblerDiscountPct > 0 && <> serta <strong>diskon {tumblerDiscountPct}%</strong></>} pada pesanan ini.
                    </p>
                  </div>

                  {/* Micro toggle switch */}
                  <div className={`w-11 h-6 rounded-full transition-colors duration-300 shrink-0 mt-1 relative border ${
                    hasTumbler ? 'bg-orange-500 border-orange-500' : 'bg-gray-100 border-gray-200'
                  }`}>
                    <motion.div
                      initial={false}
                      animate={{ x: hasTumbler ? 20 : 0 }}
                      className="absolute left-0.5 top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm"
                    />
                  </div>
                </div>
              </button>
            </motion.section>
          )}

          {/* ── 4. Order Items List ──────────────────────────────── */}
          <section className="bg-white rounded-[2rem] border border-orange-100/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-bold text-base text-gray-900 flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <span>Daftar Pesanan ({itemCount} Item)</span>
              </h2>
              {!groupCartId && (
                <button
                  type="button"
                  onClick={() => router.push('/?openMenu=true')}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Menu</span>
                </button>
              )}
            </div>
            <div className="space-y-3">
              {checkoutItems.map((item: any) => (
                <div key={item.id} className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl bg-[#FFFBF5]/70 border border-orange-100/60 hover:border-orange-200 transition-colors">
                  {item.image ? (
                    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-white relative border border-orange-100 shadow-sm">
                      <Image src={item.image} alt={item.name} fill className="object-cover" sizes="56px" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl shrink-0 bg-orange-50/50 border border-orange-100 flex items-center justify-center shadow-sm">
                      <Coffee className="w-5.5 h-5.5 text-orange-400" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 flex items-center flex-wrap gap-1.5 truncate">
                      {item.memberName && (
                        <span className="inline-block px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase text-orange-800 bg-orange-50 border border-orange-200">
                          {item.memberName}
                        </span>
                      )}
                      <span>{item.name}</span>
                      {hasTumbler && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase text-amber-800 bg-amber-50 border border-amber-200">
                          <Leaf className="w-2.5 h-2.5" /> Tumbler
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-gray-500 font-medium leading-relaxed truncate mt-0.5">
                      {item.isBundle && item.bundleSelections
                        ? item.bundleSelections.map((s: any) => `${s.productName}`).join(' · ')
                        : [
                            item.size || 'Normal',
                            item.iceLevel && item.sugarLevel
                              ? `${item.iceLevel} → ${item.sugarLevel}`
                              : item.iceLevel || item.sugarLevel || null,
                            item.espressoShot ? `${item.espressoShot}` : null,
                            item.addOns && item.addOns.length > 0 ? `+${item.addOns.map((a: any) => a.name).join(', ')}` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')
                      }
                    </p>
                    <div className="flex items-center gap-2.5 mt-1">
                      <p className="text-xs font-black text-orange-600">{formatRupiah(item.totalPrice)}</p>
                      {!groupCartId && (
                        <button 
                          type="button" 
                          onClick={() => handleEditOrAdd(item, true)} 
                          className="text-[10px] text-amber-700 font-bold hover:underline cursor-pointer"
                        >
                          Ubah Opsi
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {groupCartId ? (
                      <span className="text-xs font-bold text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-xl">
                        x{item.quantity}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-white rounded-xl p-1 border border-orange-100 shadow-sm">
                        <button type="button" onClick={() => item.quantity <= 1 ? removeItem(item.id) : updateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors cursor-pointer">
                          {item.quantity <= 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                        </button>
                        <span className="w-5 text-center text-xs font-bold text-gray-900">{item.quantity}</span>
                        <button type="button" onClick={() => handleEditOrAdd(item, false)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-orange-50 text-orange-600 transition-colors cursor-pointer">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {!groupCartId && (
              <button
                type="button"
                onClick={() => router.push('/?openMenu=true')}
                className="w-full py-3.5 rounded-2xl border-2 border-dashed border-orange-200 text-orange-600 font-bold text-xs hover:bg-orange-50/50 hover:border-orange-300 transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Menu Lain</span>
              </button>
            )}
          </section>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            RIGHT STICKY COLUMN: Promo/Points, Arus Pay & Payment, Receipt Summary
            ══════════════════════════════════════════════════════════════════ */}
        <div className="w-full lg:w-[420px] xl:w-[440px] space-y-6 lg:sticky lg:top-24">
          {/* ── 5. Voucher & Loyalty Points ── */}
          <div className="space-y-4">
            <div className="space-y-0 select-none">
              {!appliedVoucher && claimableTemplates.length > 0 ? (
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 text-orange-800 text-xs font-bold px-4 py-2.5 rounded-t-2xl border border-b-0 border-orange-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 shrink-0 text-orange-600" />
                    <span>Ada {claimableTemplates.length} promo gratis siap diklaim & dipakai!</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setVoucherModalTab('pack');
                      setIsVoucherModalOpen(true);
                    }}
                    className="text-orange-600 font-black hover:underline text-[11px] cursor-pointer"
                  >
                    Klaim Gratis
                  </button>
                </div>
              ) : hasUnusableVouchers && !appliedVoucher ? (
                <div className="bg-[#FFF4E6] text-[#D97706] text-xs font-semibold px-4 py-3 rounded-t-2xl border border-b-0 border-[#FAD9C1] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 shrink-0 text-[#D97706]" />
                    <span>Tambah pesanan untuk pakai voucher hemat</span>
                  </div>
                  <button type="button" onClick={() => setIsVoucherModalOpen(true)} className="text-orange-600 font-bold hover:underline text-[11px] cursor-pointer">
                    Lihat
                  </button>
                </div>
              ) : null}
              
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setVoucherModalTab('vouchers');
                    setIsVoucherModalOpen(true);
                  }}
                  className={`w-full bg-white border border-orange-200/80 pl-5 pr-12 py-4 flex items-center justify-between hover:bg-orange-50/40 active:scale-[0.99] transition-all text-left shadow-sm cursor-pointer
                    ${(!appliedVoucher && (claimableTemplates.length > 0 || hasUnusableVouchers)) ? 'rounded-b-2xl border-t-0' : 'rounded-2xl'}`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                      <Ticket className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm text-gray-900 truncate">
                          {appliedVoucher
                            ? String((appliedVoucher as any).template?.title || appliedVoucher.description || appliedVoucher.code || 'Voucher Aktif')
                            : 'Pakai Promo / Kode Voucher'}
                        </p>
                        {!appliedVoucher && (usableVouchers.length > 0 || claimableTemplates.length > 0) && (
                          <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-black">
                            {usableVouchers.length > 0
                              ? `${usableVouchers.length} Siap Pakai`
                              : `${claimableTemplates.length} Promo Gratis`}
                          </span>
                        )}
                      </div>
                      {appliedVoucher ? (
                        <p className="text-[11px] text-emerald-700 font-extrabold mt-0.5">
                          Hemat {formatRupiah(voucherDiscount + ongkirDiscount)} · Kode: {String(appliedVoucher.code || '')}
                        </p>
                      ) : (
                        <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                          {usableVouchers.length > 0
                            ? `Tersedia ${usableVouchers.length} voucher yang langsung bisa menghemat pesananmu`
                            : 'Pilih voucher, klaim promo gratis, atau masukkan kode promo'}
                        </p>
                      )}
                    </div>
                  </div>
                  {!appliedVoucher && <ArrowRight className="w-5 h-5 text-orange-500 shrink-0" />}
                </button>
                {appliedVoucher && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAppliedVoucher(null);
                      setToast({ message: 'Voucher dibatalkan', type: 'success' });
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Points Section */}
            {userPoints > 0 && (
              <section className="bg-white rounded-2xl border border-orange-100/80 p-4 shadow-sm space-y-3">
                <button
                  type="button"
                  disabled={maxPointsAllowed === 0 && !usePoints}
                  onClick={() => { setUsePoints(!usePoints); if (!usePoints) setPointsToUse(maxPointsAllowed); }}
                  className={`w-full flex items-center gap-3.5 p-3 rounded-xl border transition-all text-left active:scale-[0.99] cursor-pointer ${
                    maxPointsAllowed === 0 && !usePoints
                      ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50'
                      : usePoints ? 'border-amber-400 bg-amber-50/40' : 'border-gray-100 bg-white hover:border-amber-200'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    usePoints ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm' : 'bg-amber-50 border border-amber-100 text-amber-600'
                  }`}>
                    <Coins className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900">Tukar Arus Poin</p>
                    <p className={`text-[11px] leading-tight mt-0.5 ${usePoints ? 'text-orange-700 font-bold' : 'text-gray-500 font-medium'}`}>
                      {usePoints ? `${pointsToUse} poin = hemat ${formatRupiah(pointsToUse * pointValue)}` : `Punya ${userPoints} poin (1 poin = ${formatRupiah(pointValue)})`}
                    </p>
                  </div>
                  <div className={`w-11 h-6 rounded-full transition-colors duration-300 shrink-0 relative border ${
                    usePoints ? 'bg-orange-500 border-orange-500' : 'bg-gray-100 border-gray-200'
                  }`}>
                    <motion.div initial={false} animate={{ x: usePoints ? 20 : 0 }} className="absolute left-0.5 top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm" />
                  </div>
                </button>
                {usePoints && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                    {maxPointsAllowed === 0 ? (
                      <p className="text-xs text-amber-600 font-semibold px-1 pt-1">
                        Semua tagihan sudah tercover oleh diskon lain.
                      </p>
                    ) : (
                      <div className="flex items-center gap-3 px-2 pt-1">
                        <span className="text-[10px] font-bold text-gray-400">1p</span>
                        <input
                          type="range"
                          min={1}
                          max={maxPointsAllowed}
                          value={pointsToUse > maxPointsAllowed ? maxPointsAllowed : pointsToUse}
                          onChange={(e) => setPointsToUse(Math.min(maxPointsAllowed, parseInt(e.target.value)))}
                          className="flex-1 accent-orange-500 h-1.5 bg-gray-100 rounded-lg cursor-pointer"
                        />
                        <span className="text-[10px] font-bold text-gray-400">{maxPointsAllowed}p</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </section>
            )}
          </div>

          {/* ── 6. Metode Pembayaran (Arus Pay Utama + Metode Lainnya) ─────────────────── */}
          <section className="bg-white rounded-[2rem] border border-orange-100/80 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-bold text-base text-gray-900 flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                  <Wallet className="w-4 h-4" />
                </div>
                <span>Metode Pembayaran</span>
              </h2>
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">
                Langkah 3
              </span>
            </div>

            {/* A. ARUS PAY (Eksklusif & Utama) */}
            {(paymentConfig?.wallet?.enabled ?? true) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between pl-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-700 flex items-center gap-1 select-none">
                    <Sparkles className="w-3 h-3 text-orange-500" /> Rekomendasi Utama · Bebas Biaya Admin
                  </span>
                  {paymentMethod === 'WALLET' && (
                    <span className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      walletBalance >= grandTotal
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {walletBalance >= grandTotal ? 'Saldo Cukup' : 'Saldo Kurang'}
                    </span>
                  )}
                </div>

                <div
                  onClick={() => { setPaymentMethod('WALLET'); setPaymentChannel(''); }}
                  className={`w-full text-left rounded-[1.75rem] p-5 shadow-md flex flex-col relative overflow-hidden transition-all active:scale-[0.99] cursor-pointer border-2
                    ${paymentMethod === 'WALLET'
                      ? 'border-amber-400 bg-gradient-to-br from-[#24160E] via-[#2F1D12] to-[#180E08] text-white shadow-orange-950/15'
                      : 'border-orange-100 bg-[#FFFBF5] hover:border-amber-300 text-gray-800'}`}
                >
                  <div className="absolute -top-12 -right-12 w-36 h-36 bg-orange-500/20 rounded-full blur-2xl pointer-events-none select-none" />

                  <div className="flex justify-between items-start w-full relative z-10 gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm
                        ${paymentMethod === 'WALLET' ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white' : 'bg-gradient-to-br from-orange-100 to-amber-50 text-orange-600 border border-orange-200'}`}>
                        <Wallet className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-xs font-black uppercase tracking-wider ${paymentMethod === 'WALLET' ? 'text-amber-300' : 'text-orange-700'}`}>
                            Arus Pay
                          </p>
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                            paymentMethod === 'WALLET' ? 'bg-amber-400/20 text-amber-300' : 'bg-orange-100 text-orange-700'
                          }`}>
                            Instan
                          </span>
                        </div>
                        <h4 className={`text-xl font-serif font-black tracking-tight mt-0.5 ${paymentMethod === 'WALLET' ? 'text-white' : 'text-gray-900'}`}>
                          {formatRupiah(walletBalance)}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsTopUpOpen(true);
                        }}
                        className={`px-3 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl border transition-all active:scale-95 flex items-center gap-1 select-none cursor-pointer
                          ${paymentMethod === 'WALLET'
                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 border-amber-400/40 text-white shadow-sm hover:from-orange-600 hover:to-amber-600'
                            : 'bg-white border-orange-200 text-orange-700 hover:bg-orange-50'}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Top Up</span>
                      </button>

                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                        ${paymentMethod === 'WALLET' ? 'border-amber-400 bg-amber-400 text-[#24160E]' : 'border-gray-300 bg-white'}`}>
                        {paymentMethod === 'WALLET' && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  </div>

                  {/* Live Balance vs Bill Calculation Strip */}
                  <div className={`mt-4 pt-3 border-t border-dashed w-full text-[11px] flex items-center justify-between gap-2 relative z-10
                    ${paymentMethod === 'WALLET' ? 'border-white/15' : 'border-orange-200/60'}`}>
                    {walletBalance >= grandTotal ? (
                      <>
                        <span className={paymentMethod === 'WALLET' ? 'text-amber-100/80 font-medium' : 'text-gray-600 font-medium'}>
                          Sisa saldo setelah bayar:
                        </span>
                        <span className={`font-black ${paymentMethod === 'WALLET' ? 'text-emerald-300' : 'text-emerald-700'}`}>
                          {formatRupiah(walletRemainingAfterPay)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className={paymentMethod === 'WALLET' ? 'text-amber-200 font-semibold' : 'text-amber-800 font-semibold'}>
                          Kurang {formatRupiah(walletShortfallAmount)} untuk bayar pesanan ini
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsTopUpOpen(true);
                          }}
                          className={`font-black underline cursor-pointer shrink-0 ${
                            paymentMethod === 'WALLET' ? 'text-amber-300 hover:text-white' : 'text-orange-600 hover:text-orange-800'
                          }`}
                        >
                          Isi Saldo
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* B. QRIS & CASH (2 Opsi Pembayaran Lainnya) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between pl-1">
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400 select-none">
                  Metode Pembayaran Lainnya
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* 1. QRIS (Otomatis) */}
                {((paymentConfig?.qris?.enabled || paymentConfig?.doku?.enabled) ?? true) && (
                  <button
                    type="button"
                    onClick={() => { setPaymentMethod('QRIS'); setPaymentChannel(''); }}
                    className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-3 text-left transition-all active:scale-[0.98] cursor-pointer relative overflow-hidden
                      ${paymentMethod === 'QRIS'
                        ? 'border-orange-500 bg-orange-50/50 text-orange-950 shadow-sm'
                        : 'border-gray-100 bg-gray-50/60 text-gray-700 hover:border-orange-200 hover:bg-white'}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-colors ${
                        paymentMethod === 'QRIS'
                          ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white'
                          : 'bg-white border border-orange-100 text-orange-600'
                      }`}>
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-extrabold tracking-tight text-gray-900 truncate">QRIS</p>
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 shrink-0">
                            Otomatis
                          </span>
                        </div>
                        <p className="text-[10px] font-semibold text-gray-500 truncate mt-0.5">
                          Semua E-Wallet & Bank
                        </p>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      paymentMethod === 'QRIS' ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-300 bg-white'
                    }`}>
                      {paymentMethod === 'QRIS' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </button>
                )}

                {/* 2. Cash / Bayar Tunai (COD) */}
                {(paymentConfig?.cod?.enabled ?? true) && (
                  <button
                    type="button"
                    onClick={() => { setPaymentMethod('COD'); setPaymentChannel(''); }}
                    className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-3 text-left transition-all active:scale-[0.98] cursor-pointer relative overflow-hidden
                      ${paymentMethod === 'COD'
                        ? 'border-orange-500 bg-orange-50/50 text-orange-950 shadow-sm'
                        : 'border-gray-100 bg-gray-50/60 text-gray-700 hover:border-orange-200 hover:bg-white'}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-colors ${
                        paymentMethod === 'COD'
                          ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white'
                          : 'bg-white border border-orange-100 text-orange-600'
                      }`}>
                        <Banknote className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold tracking-tight text-gray-900 truncate">Cash</p>
                        <p className="text-[10px] font-semibold text-gray-500 truncate mt-0.5">
                          Bayar Tunai di Kasir
                        </p>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      paymentMethod === 'COD' ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-300 bg-white'
                    }`}>
                      {paymentMethod === 'COD' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </button>
                )}
              </div>
            </div>

            <div className="bg-orange-50/60 border border-orange-100 rounded-2xl p-3.5 text-[11px] text-gray-600 font-medium leading-relaxed select-none flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <span>
                {paymentMethod === 'COD' 
                  ? 'Bayar tunai langsung di kasir saat pesanan diambil atau diserahkan.' 
                  : paymentMethod === 'WALLET'
                  ? 'Pembayaran memotong saldo Arus Pay secara instan dan dilindungi verifikasi 6 angka PIN Arum Seduh Anda.'
                  : 'Scan kode QRIS dinamis menggunakan aplikasi E-Wallet atau Mobile Banking apa saja. Terverifikasi otomatis.'}
              </span>
            </div>
          </section>

          {/* ── 7. Price Summary Receipt Card (Struk Tagihan Preview) ─────────────────── */}
          <section className="rounded-[2rem] bg-white border border-orange-100/90 shadow-sm overflow-hidden ticket-card">
            <div className="px-6 py-6 space-y-4">
              <div className="flex items-center justify-between border-b border-dashed border-gray-200 pb-3.5">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4.5 h-4.5 text-orange-600" />
                  <h2 className="font-serif font-black text-base text-gray-900">Ringkasan Struk</h2>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200/60">
                  {activePaymentLabel}
                </span>
              </div>

              <div className="space-y-2.5 text-xs font-semibold text-gray-500">
                <div className="flex justify-between">
                  <span className="font-medium">Subtotal ({itemCount} item)</span>
                  <span className="text-gray-900 font-bold">{formatRupiah(subtotal)}</span>
                </div>
                {toppingTotal > 0 && (
                  <div className="flex justify-between text-[11px] text-gray-400 pl-2 border-l-2 border-orange-100">
                    <span>Termasuk Topping / Add-on</span>
                    <span>{formatRupiah(toppingTotal)}</span>
                  </div>
                )}
                {sizeUpgradeTotal > 0 && (
                  <div className="flex justify-between text-[11px] text-gray-400 pl-2 border-l-2 border-orange-100">
                    <span>Termasuk Upgrade Ukuran</span>
                    <span>{formatRupiah(sizeUpgradeTotal)}</span>
                  </div>
                )}
                {pickupTime && (pickupTime !== 'Sekarang' || orderType === 'PICKUP') && (
                  <div className="flex justify-between items-center bg-[#FFFBF5] border border-orange-100/80 p-2.5 rounded-xl">
                    <span className="flex items-center gap-1.5 text-gray-600"><Clock className="w-3.5 h-3.5 text-orange-600" /> {orderType === 'PICKUP' ? 'Waktu Ambil' : 'Waktu Saji'}</span>
                    <span className="font-bold text-orange-700 text-[11px]">
                      {(() => {
                        if (pickupTime === 'Sekarang') {
                          return 'Sekarang (~15 mnt)';
                        }
                        const matchedDate = availableDates.find(d => d.value === pickupDate);
                        const dayLabel = matchedDate ? `${matchedDate.dayLabel}, ${matchedDate.label}` : pickupDate;
                        return `${dayLabel} @ ${pickupTime} - ${getEndTime(pickupTime)}`;
                      })()}
                    </span>
                  </div>
                )}
                {orderType === 'DELIVERY' && deliveryAddress && (
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1.5"><Truck className="w-4 h-4" /> Ongkir ({deliveryAddress.distance.toFixed(1)} km)</span>
                    <span className="text-gray-900 font-bold">{formatRupiah(deliveryAddress.deliveryFee)}</span>
                  </div>
                )}
                {hasTumbler && tumblerDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span className="flex items-center gap-1.5"><Leaf className="w-4 h-4" /> » Potongan Tumbler</span>
                    <span className="font-bold">-{formatRupiah(tumblerDiscount)}</span>
                  </div>
                )}
                {appliedVoucher && voucherDiscount > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span className="flex items-center gap-1.5"><Ticket className="w-4 h-4" /> » Potongan Voucher ({appliedVoucher.code})</span>
                    <span className="font-bold">-{formatRupiah(voucherDiscount)}</span>
                  </div>
                )}
                {(hasFreeShippingBundle || (appliedVoucher && (appliedVoucher.type === 'GRATIS_ONGKIR' || appliedVoucher.type === 'DISKON_ONGKIR') && ongkirDiscount > 0)) && (
                  <div className="flex justify-between text-emerald-600">
                    <span className="flex items-center gap-1.5">
                      <Truck className="w-4 h-4" />
                      » Potongan Ongkir {hasFreeShippingBundle && <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold ml-1">Combo</span>}
                    </span>
                    <span className="font-bold">-{formatRupiah(ongkirDiscount)}</span>
                  </div>
                )}
                {usePoints && pointsDiscount > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span className="flex items-center gap-1.5"><Coins className="w-4 h-4" /> » Potongan Poin ({pointsToUse} poin)</span>
                    <span className="font-bold">-{formatRupiah(pointsDiscount)}</span>
                  </div>
                )}
                {hasTumbler && (
                  <div className="flex justify-between text-orange-700 bg-amber-50/60 border border-amber-200/50 p-2 rounded-xl text-[10px]">
                    <span className="flex items-center gap-1.5 font-bold"><Leaf className="w-3.5 h-3.5 text-orange-600" /> Bonus Eco Arus Poin</span>
                    <span className="font-black">+{tumblerBonusPoints} poin</span>
                  </div>
                )}
              </div>

              {/* Rule 8: Explicit Discount Breakdown Formula */}
              {totalDiscountAmount > 0 && (
                <div className="rounded-2xl bg-amber-50/70 border border-amber-200/80 p-3 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-orange-700">
                    <span>Rincian Potongan Harga</span>
                    <span>Hemat {formatRupiah(totalDiscountAmount)}</span>
                  </div>
                  <p className="text-xs font-black text-gray-900 font-mono">
                    {formatRupiah(grossBeforeDiscount)} - {formatRupiah(totalDiscountAmount)} = <span className="text-orange-600">{formatRupiah(grandTotal)}</span>
                  </p>
                </div>
              )}
              
              <div className="border-t border-dashed border-gray-200 pt-4 flex flex-col gap-1">
                <div className="flex items-baseline justify-between">
                  <span className="font-serif font-black text-gray-900 text-sm">Total Pembayaran</span>
                  <span className="font-serif font-black text-2xl text-orange-600 tracking-tight">{formatRupiah(grandTotal)}</span>
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 pt-3 bg-[#FFFBF5] border-t border-orange-100/60 space-y-3">
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(true)}
                className="w-full py-3.5 rounded-2xl border-2 border-orange-200 text-orange-700 font-bold text-xs bg-white hover:bg-orange-50/50 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Clock className="w-4 h-4 text-orange-600" />
                {(() => {
                  if (pickupTime === 'Sekarang') {
                    return orderType === 'PICKUP' ? 'Ambil Sekarang (~15 mnt)' : 'Sajikan Sekarang';
                  }
                  if (!pickupDate || !pickupTime) {
                    return orderType === 'PICKUP' ? 'Jadwalkan Waktu Ambil' : 'Jadwalkan Waktu Saji';
                  }
                  const matchedDate = availableDates.find(d => d.value === pickupDate);
                  const dayLabel = matchedDate ? `${matchedDate.dayLabel}, ${matchedDate.label}` : pickupDate;
                  return orderType === 'PICKUP'
                    ? `Jadwal Ambil: ${dayLabel} @ ${pickupTime} - ${getEndTime(pickupTime)}`
                    : `Jadwal Saji: ${dayLabel} @ ${pickupTime} - ${getEndTime(pickupTime)}`;
                })()}
              </button>

              <motion.button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                whileTap={canSubmit ? { scale: 0.98 } : {}}
                className={`w-full py-4 font-bold text-sm tracking-wide transition-all rounded-2xl hidden md:flex items-center justify-center gap-2 cursor-pointer
                  ${canSubmit && !isSubmitting
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/20'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-200'}`}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    <span>Memproses Pesanan...</span>
                  </div>
                ) : (!pickupDate || !pickupTime) ? (
                  orderType === 'PICKUP' ? 'Tentukan Waktu Pengambilan' : 'Tentukan Waktu Penyajian'
                ) : orderType === 'DELIVERY' && isStoreClosedToday ? (
                  'Toko Tutup Hari Ini'
                ) : orderType === 'DELIVERY' && !deliveryAddress ? (
                  'Tentukan Alamat Kirim'
                ) : !paymentMethod ? (
                  'Pilih Metode Pembayaran'
                ) : isWalletShortfall ? (
                  `Top Up Arus Pay (+${formatRupiah(walletShortfallAmount)})`
                ) : (
                  `Bayar dengan ${paymentMethod === 'WALLET' ? 'Arus Pay' : activePaymentLabel} · ${formatRupiah(grandTotal)}`
                )}
              </motion.button>
            </div>
          </section>
        </div>
      </form>

      {/* Product Modal for Editing / Adding */}
      <ProductModal
        product={selectedProduct}
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        editCartItemId={editingCartItem?.id || undefined}
        initialData={editingCartItem || undefined}
        allProducts={allProducts}
      />

      {/* Voucher Detail Modal */}
      <AnimatePresence>
        {isDetailModalOpen && voucherDetail && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[85vh] select-none"
            >
              {/* Image Banner */}
              <div className="relative h-48 w-full bg-gray-100 shrink-0 flex items-center justify-center border-b border-gray-100">
                {voucherDetail.bannerImage ? (
                  <Image 
                    src={voucherDetail.bannerImage} 
                    alt={voucherDetail.title} 
                    fill 
                    className="object-cover"
                    sizes="400px"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Ticket className="w-12 h-12 stroke-1 text-orange-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Arum Seduh Promo</span>
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/75 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-white font-extrabold text-[10px] tracking-wide uppercase">
                  {voucherDetail.type === 'DISCOUNT_PCT' 
                    ? `Potongan ${voucherDetail.discountValue}%` 
                    : `Potongan ${formatRupiah(voucherDetail.discountValue)}`}
                </div>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-xs font-black text-amber-800 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">
                      {voucherDetail.code}
                    </span>
                  </div>
                  <h3 className="font-serif font-black text-lg text-gray-900 leading-snug">{voucherDetail.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed mt-1">{voucherDetail.description}</p>
                </div>

                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-450 font-medium">Minimal Belanja</span>
                    <span className="font-bold text-gray-800">{formatRupiah(voucherDetail.minPurchase)}</span>
                  </div>
                  {voucherDetail.type === 'DISCOUNT_PCT' && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-450 font-medium">Maksimal Diskon</span>
                      <span className="font-bold text-red-600">
                        {voucherDetail.maxDiscount ? formatRupiah(voucherDetail.maxDiscount) : 'Tanpa Batas'}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-450 font-medium">Berlaku Hingga</span>
                    <span className="font-bold text-gray-800">
                      {voucherDetail.expiresAt 
                        ? new Date(voucherDetail.expiresAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) 
                        : 'Selamanya'}
                    </span>
                  </div>
                </div>

                {/* Products */}
                {voucherDetail.validProductNames && voucherDetail.validProductNames.length > 0 && (
                  <div className="border-t border-gray-100 pt-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Berlaku untuk Produk</span>
                    <div className="flex flex-wrap gap-1.5">
                      {voucherDetail.validProductNames.map((name: string, idx: number) => (
                        <span key={idx} className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-bold">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* S&K */}
                <div className="bg-[#FFFBF5] rounded-2xl p-4 border border-orange-100 space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Syarat & Ketentuan</h4>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-gray-650 font-medium leading-relaxed">
                    {voucherDetail.terms && voucherDetail.terms.split('\n').filter((t: string) => t.trim().length > 0).map((term: string, idx: number) => (
                      <li key={`custom-${idx}`}>{term}</li>
                    ))}
                    <li>
                      Minimum nilai pembelanjaan subtotal keranjang belanja adalah <span className="font-bold text-gray-800">{voucherDetail.minPurchase > 0 ? formatRupiah(voucherDetail.minPurchase) : 'tanpa minimum belanja'}</span>.
                    </li>
                    {voucherDetail.maxDiscount && (
                      <li>
                        Maksimum potongan belanja yang bisa didapatkan dari voucher ini adalah <span className="font-bold text-gray-800">{formatRupiah(voucherDetail.maxDiscount)}</span>.
                      </li>
                    )}
                    {voucherDetail.validProductNames && voucherDetail.validProductNames.length > 0 ? (
                      <li>
                        Voucher ini hanya berlaku untuk produk-produk pilihan berikut: <span className="font-bold text-gray-800">{voucherDetail.validProductNames.join(', ')}</span>.
                      </li>
                    ) : (
                      voucherDetail.validProductIds && voucherDetail.validProductIds.length > 0 && (
                        <li>
                          Voucher ini hanya berlaku untuk produk-produk pilihan tertentu.
                        </li>
                      )
                    )}
                    <li>
                      Voucher hanya dapat digunakan satu kali saja per transaksi dan tidak dapat digabungkan dengan kode kupon promo lainnya.
                    </li>
                    <li>
                      Masa kedaluwarsa voucher adalah sampai <span className="font-bold text-gray-800">{voucherDetail.expiresAt ? new Date(voucherDetail.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'selamanya'}</span>. Jika melewati batas waktu tersebut, voucher otomatis hangus.
                    </li>
                    <li>
                      Apabila transaksi dibatalkan atau kedaluwarsa sebelum pembayaran berhasil diproses penuh, voucher akan otomatis dipulihkan kembali menjadi aktif pada profil Anda.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Close Action */}
              <div className="p-6 border-t border-gray-50 bg-gray-50/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-2xl text-xs shadow-md shadow-orange-500/15 transition-all text-center cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -40, x: '-50%' }}
            className={`fixed top-6 left-1/2 z-[200] max-w-sm w-[90vw] px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            {toast.type === 'error' ? <XCircle className="w-5 h-5 text-red-500 shrink-0" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
            <p className="text-xs font-semibold flex-1 leading-snug">{toast.message}</p>
            <button onClick={() => setToast(null)} className="p-1 rounded-full hover:bg-black/5"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Bottom Bar for Mobile Checkout */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-orange-100 md:hidden pb-safe flex flex-col shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
        {/* Discount Notification Banner */}
        {totalDiscountAmount > 0 && (
          <div className="bg-amber-50 border-b border-amber-200/70 px-4 py-2 text-[11px] font-bold text-orange-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-600 shrink-0" />
              <span>Hemat {formatRupiah(totalDiscountAmount)}</span>
            </div>
            <span className="font-mono text-[10px] font-extrabold text-orange-700">
              {formatRupiah(grossBeforeDiscount)} - {formatRupiah(totalDiscountAmount)} = {formatRupiah(grandTotal)}
            </span>
          </div>
        )}

        <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</span>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200/60 truncate">
                {paymentMethod === 'WALLET' ? 'Arus Pay' : activePaymentLabel}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="font-serif font-black text-lg text-orange-600 leading-none">
                {formatRupiah(grandTotal)}
              </span>
              {totalDiscountAmount > 0 && (
                <span className="text-[10px] text-gray-400 line-through">
                  {formatRupiah(grossBeforeDiscount)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsScheduleModalOpen(true)}
              className="flex items-center justify-center gap-1 px-3 py-3.5 rounded-xl border border-orange-200 text-orange-700 font-bold text-xs bg-orange-50/40 active:scale-95 transition-all cursor-pointer"
            >
              <Clock className="w-4 h-4 text-orange-600" />
              <span>
                {!pickupTime || pickupTime === 'Sekarang'
                  ? 'Jadwal'
                  : `${pickupTime}`}
              </span>
            </button>
            
            <button
              type="button"
              onClick={() => {
                if (canSubmit && !isSubmitting) {
                  handleSubmit(onSubmit)();
                }
              }}
              disabled={!canSubmit || isSubmitting}
              className={`px-5 py-3.5 rounded-xl font-bold text-xs tracking-wide text-center transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer ${
                canSubmit && !isSubmitting
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/20'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300/20'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Proses...</span>
                </>
              ) : (!pickupDate || !pickupTime) ? (
                orderType === 'PICKUP' ? 'Jadwalkan Ambil' : 'Jadwalkan Saji'
              ) : orderType === 'DELIVERY' && isStoreClosedToday ? (
                'Toko Tutup'
              ) : orderType === 'DELIVERY' && !deliveryAddress ? (
                'Pilih Alamat'
              ) : !paymentMethod ? (
                'Pilih Bayar'
              ) : isWalletShortfall ? (
                'Top Up & Bayar'
              ) : (
                'Bayar Sekarang'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Pickup Schedule Modal (Framer Motion spring based wheel with Day Selector) */}
      <AnimatePresence>
        {isScheduleModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsScheduleModalOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="relative w-full max-w-md bg-white rounded-t-[2.5rem] shadow-2xl p-6 pb-safe z-10 flex flex-col border-t border-gray-100"
            >
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors border border-gray-100"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center text-center mt-2 mb-4 select-none">
                <div className="w-14 h-14 rounded-2xl bg-[#FAF6EE] border border-[#EADFC9]/30 flex items-center justify-center mb-3.5">
                  <Clock className="w-7 h-7 text-[#946F48]" strokeWidth={1.8} />
                </div>
                <h3 className="font-serif font-black text-lg text-[#2A1A0F]">
                  Jadwalkan Waktu Ambil
                </h3>
                <p className="text-[11px] text-[#8C7864] font-bold mt-1 uppercase tracking-wider">
                  {tempPickupTime === 'Sekarang' 
                    ? 'Hari Ini, Sekarang' 
                    : (() => {
                        const matchedDate = availableDates.find(d => d.value === tempPickupDate);
                        const dayLabel = matchedDate ? `${matchedDate.dayLabel}, ${matchedDate.label}` : tempPickupDate;
                        return `${dayLabel}, Jam ${tempPickupTime} - ${getEndTime(tempPickupTime)}`;
                      })()}
                </p>
              </div>

              {/* Day Selector */}
              <div className="mb-4 select-none">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 pl-1">
                  Pilih Hari
                </label>
                <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {availableDates.map((date) => {
                    const isSelected = tempPickupDate === date.value;
                    return (
                      <button
                        key={date.value}
                        type="button"
                        onClick={() => {
                          setTempPickupDate(date.value);
                        }}
                        className={`flex-1 min-w-[95px] p-3.5 rounded-2xl border text-center transition-all active:scale-95 cursor-pointer
                          ${isSelected
                            ? 'border-[#946F48] bg-[#FAF6EE] text-[#946F48] font-bold shadow-sm'
                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
                      >
                        <p className="text-[9px] uppercase tracking-wider opacity-75">{date.dayLabel}</p>
                        <p className="text-xs font-black mt-0.5">{date.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="relative border border-[#EADFC9]/30 bg-[#FAF6EE]/40 rounded-3xl p-4 mb-6 overflow-hidden">
                <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-14 bg-white border border-[#EADFC9]/40 rounded-2xl -z-10 shadow-sm shadow-[#946F48]/5" />

                <div className="flex justify-center items-center h-[180px] py-2 relative">
                  {modalTimeSlots.length === 0 ? (
                    <p className="text-xs text-amber-800 font-bold py-6 text-center w-full">
                      Toko sudah tutup. Silakan pesan lagi besok pagi.
                    </p>
                  ) : (
                    <>
                      {/* Hour Picker */}
                      <div 
                        ref={hourContainerRef}
                        onScroll={handleHourScrollEvent}
                        className="w-1/2 h-[160px] overflow-y-auto scrollbar-hide flex flex-col items-center py-12 gap-2 select-none snap-y snap-mandatory scroll-smooth"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                      >
                        {availableHours.map((hour) => {
                          const isSelected = tempHour === hour;
                          return (
                            <button
                              key={hour}
                              type="button"
                              data-value={hour}
                              data-selected={isSelected ? "true" : "false"}
                              onClick={() => handleHourSelect(hour)}
                              className={`flex justify-center items-center py-1.5 px-4 rounded-xl transition-all duration-300 w-full max-w-[80px] shrink-0 snap-center ${
                                isSelected
                                  ? 'scale-115 font-serif font-black text-xl text-orange-600'
                                  : 'text-gray-350 text-sm hover:text-gray-600 font-bold opacity-60'
                              }`}
                            >
                              {hour}
                            </button>
                          );
                        })}
                      </div>

                      {/* Divider */}
                      <span className="text-xl font-black text-orange-500/60 px-3 shrink-0 animate-pulse">:</span>

                      {/* Minute Picker */}
                      <div 
                        ref={minContainerRef}
                        onScroll={handleMinScrollEvent}
                        className="w-1/2 h-[160px] overflow-y-auto scrollbar-hide flex flex-col items-center py-12 gap-2 select-none snap-y snap-mandatory scroll-smooth"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                      >
                        {availableMinutesForSelectedHour.map((min) => {
                          const isSelected = tempMin === min;
                          return (
                            <button
                              key={min}
                              type="button"
                              data-value={min}
                              data-selected={isSelected ? "true" : "false"}
                              onClick={() => handleMinSelect(min)}
                              className={`flex justify-center items-center py-1.5 px-4 rounded-xl transition-all duration-300 w-full max-w-[80px] shrink-0 snap-center ${
                                isSelected
                                  ? 'scale-115 font-serif font-black text-xl text-orange-600'
                                  : 'text-gray-350 text-sm hover:text-gray-600 font-bold opacity-60'
                              }`}
                            >
                              {min}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2.5">
                {tempPickupDate === new Date().toLocaleDateString('en-CA') && isStoreCurrentlyOpen && (
                  <button
                    type="button"
                    onClick={() => {
                      setPickupDate(new Date().toLocaleDateString('en-CA'));
                      setPickupTime('Sekarang');
                      setTempPickupTime('Sekarang');
                      setIsScheduleModalOpen(false);
                    }}
                    className="w-full py-4 rounded-2xl border-2 border-orange-200 text-orange-700 font-bold text-xs hover:bg-orange-50 active:scale-95 transition-all text-center cursor-pointer"
                  >
                    Pickup Sekarang
                  </button>
                )}
                <button
                  type="button"
                  disabled={modalTimeSlots.length === 0}
                  onClick={() => {
                    if (tempPickupTime !== 'Sekarang') {
                      setPickupTime(tempPickupTime);
                      setPickupDate(tempPickupDate);
                    } else {
                      setPickupTime('Sekarang');
                      setPickupDate(tempPickupDate);
                    }
                    setIsScheduleModalOpen(false);
                  }}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs hover:from-orange-600 hover:to-amber-600 active:scale-[0.98] transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-orange-500/15 cursor-pointer"
                >
                  Gunakan Jadwal Ini
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Voucher Selection Modal */}
      <AnimatePresence>
        {isVoucherModalOpen && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-[#FFFBF5] select-none">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-orange-100 flex items-center justify-between px-6 py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsVoucherModalOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-orange-50 text-gray-700 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                  <h2 className="font-serif font-black text-lg text-gray-900 leading-tight">Promo & Voucher</h2>
                  <p className="text-[11px] text-gray-500 font-medium">Pilih voucher aktif atau klaim promo gratis Arum Seduh</p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                <Ticket className="w-5 h-5" />
              </div>
            </div>

            {/* Tabs: Voucher Saya vs Klaim Promo Gratis */}
            <div className="px-6 py-3 bg-white border-b border-orange-100">
              <div className="flex gap-1.5 p-1.5 bg-orange-50/70 border border-orange-100 rounded-2xl max-w-2xl mx-auto">
                <button
                  type="button"
                  onClick={() => setVoucherModalTab('vouchers')}
                  className={`flex-1 py-2.5 px-3 text-center rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    voucherModalTab === 'vouchers'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-white/60'
                  }`}
                >
                  <Ticket className="w-4 h-4 shrink-0" />
                  <span>Voucher Saya</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    voucherModalTab === 'vouchers' ? 'bg-white/25 text-white' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {usableVouchers.length + unusableVouchers.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setVoucherModalTab('pack')}
                  className={`flex-1 py-2.5 px-3 text-center rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    voucherModalTab === 'pack'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-white/60'
                  }`}
                >
                  <Gift className="w-4 h-4 shrink-0" />
                  <span>Klaim Promo Gratis</span>
                  {claimableTemplates.length > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      voucherModalTab === 'pack'
                        ? 'bg-white/25 text-white'
                        : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white animate-pulse'
                    }`}>
                      {claimableTemplates.length} Baru
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 max-w-2xl w-full mx-auto">
              {/* Manual Promo Code Input */}
              <div className="bg-white p-3.5 rounded-2xl border border-orange-200/80 shadow-sm space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-orange-700 flex items-center gap-1.5 px-1">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  Punya Kode Promo Khusus?
                </label>
                <div className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <Ticket className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
                    <input
                      value={voucherSearchQuery}
                      onChange={(e) => setVoucherSearchQuery(e.target.value)}
                      placeholder="Ketik kode promo atau cari voucher..."
                      className="w-full pl-10 pr-9 py-3 rounded-xl border border-orange-200/70 bg-orange-50/30 text-sm font-bold uppercase placeholder:normal-case placeholder:font-medium placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-orange-500 transition-all"
                    />
                    {voucherSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setVoucherSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={voucherLoading || !voucherSearchQuery.trim()}
                    onClick={async () => {
                      if (!voucherSearchQuery.trim()) return;
                      setVoucherLoading(true);
                      try {
                        const res = await fetch('/api/checkout/validate-voucher', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            code: voucherSearchQuery.trim(),
                            items: checkoutItems,
                            subtotal,
                          }),
                        });
                        const d = await res.json();
                        if (!res.ok) throw new Error(d.error);
                        setAppliedVoucher(d.voucher);
                        setIsVoucherModalOpen(false);
                        setToast({ message: 'Kode promo berhasil diterapkan!', type: 'success' });
                      } catch (err: any) {
                        setToast({ message: err.message || 'Gagal menggunakan kode voucher', type: 'error' });
                      } finally {
                        setVoucherLoading(false);
                      }
                    }}
                    className="px-5 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-gray-100 disabled:to-gray-100 disabled:text-gray-400 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-sm transition-all shrink-0 cursor-pointer"
                  >
                    {voucherLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pakai Kode'}
                  </button>
                </div>
              </div>

              {/* Category Filters Bar */}
              {voucherModalTab === 'vouchers' && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {([
                    { id: 'semua', label: 'Semua Promo' },
                    { id: 'diskon', label: 'Diskon Menu' },
                    { id: 'delivery', label: 'Gratis Ongkir' },
                    { id: 'cashback', label: 'Cashback' },
                  ] as const).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedVoucherFilter(f.id)}
                      className={`px-4 py-2 rounded-full border text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        selectedVoucherFilter === f.id
                          ? 'border-orange-500 text-orange-700 bg-orange-50 font-black shadow-xs'
                          : 'border-gray-200 text-gray-500 bg-white hover:bg-orange-50/40'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}

              {loadingVouchers ? (
                <div className="flex flex-col items-center justify-center py-14 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                  <p className="text-xs font-bold text-gray-500">Memuat daftar promo terbaik untukmu...</p>
                </div>
              ) : (
                <div className="space-y-6 pb-8">
                  {voucherModalTab === 'vouchers' ? (
                    <>
                      {/* 1. Available & Usable Vouchers */}
                      {usableVouchers.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                              Siap Digunakan ({usableVouchers.length})
                            </h3>
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                              Memenuhi Syarat Keranjang
                            </span>
                          </div>
                          <div className="space-y-3.5">
                            {usableVouchers.map((v) => {
                              const isCurrentlyApplied = appliedVoucher?.id === v.id || appliedVoucher?.code === v.code;
                              const title = v.template?.title || v.description;
                              const subtitle = v.template?.title ? v.description : null;
                              const minReq = v.template?.minPurchase || v.minPurchase || 0;
                              const maxDisc = v.maxDiscount || v.template?.maxDiscount || 0;
                              const val = v.template?.discountValue || v.discountAmount || 0;
                              const badgeText =
                                v.type === 'DISCOUNT_RP'
                                  ? val > 0 ? `Potongan ${formatRupiah(val)}` : 'Potongan Harga'
                                  : v.type === 'DISCOUNT_PCT'
                                  ? `Diskon ${val}%`
                                  : v.type === 'B2G1'
                                  ? 'Beli 2 Gratis 1'
                                  : v.type === 'FREE_DRINK'
                                  ? 'Gratis Minuman'
                                  : v.type === 'FREE_TOPPING'
                                  ? 'Gratis Topping'
                                  : v.type === 'UPGRADE_SIZE'
                                  ? 'Gratis Upsize'
                                  : v.type === 'GRATIS_ONGKIR'
                                  ? 'Gratis Ongkir'
                                  : 'Promo Spesial';

                              return (
                                <div
                                  key={v.id}
                                  className={`relative border-2 rounded-3xl bg-white p-5 shadow-sm transition-all overflow-hidden ${
                                    isCurrentlyApplied
                                      ? 'border-orange-500 bg-orange-50/20 ring-2 ring-orange-500/15'
                                      : 'border-orange-200/80 hover:border-orange-400'
                                  }`}
                                >
                                  <div className="pb-3.5 border-b border-dashed border-orange-100 flex items-start justify-between gap-4">
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                      <div className="flex items-center flex-wrap gap-1.5">
                                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-orange-700 bg-orange-100">
                                          {badgeText}
                                        </span>
                                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold text-gray-600 bg-gray-100">
                                          {minReq > 0 ? `Min. Belanja ${formatRupiah(minReq)}` : 'Tanpa Min. Belanja'}
                                        </span>
                                        {maxDisc > 0 && (v.type === 'DISCOUNT_PCT' || v.template?.type === 'DISCOUNT_PCT') && (
                                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-700 bg-amber-50">
                                            Maks. {formatRupiah(maxDisc)}
                                          </span>
                                        )}
                                      </div>

                                      <h4 className="font-black text-base text-gray-900 leading-snug">{title}</h4>
                                      {subtitle && (
                                        <p className="text-xs text-gray-500 font-medium leading-relaxed">{subtitle}</p>
                                      )}
                                      <p className="text-[11px] font-mono font-bold text-orange-700 pt-0.5">
                                        Kode: {v.code}
                                      </p>

                                      {(() => {
                                        const rawProductIds = v.validProductIds || v.template?.validProductIds || null;
                                        let validIds: string[] | null = null;
                                        if (rawProductIds) {
                                          if (Array.isArray(rawProductIds)) {
                                            validIds = rawProductIds;
                                          } else {
                                            try {
                                              const parsed = JSON.parse(rawProductIds);
                                              if (Array.isArray(parsed)) validIds = parsed;
                                            } catch {}
                                          }
                                        }
                                        if (validIds && validIds.length > 0 && allProducts.length > 0) {
                                          const names = allProducts.filter(p => validIds?.includes(p.id)).map(p => p.name);
                                          if (names.length > 0) {
                                            return (
                                              <div className="pt-1 flex flex-wrap gap-1">
                                                <span className="text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full">
                                                  Khusus menu: {names.join(', ')}
                                                </span>
                                              </div>
                                            );
                                          }
                                        }
                                        return null;
                                      })()}
                                    </div>

                                    <div className="flex flex-col items-end gap-2.5 shrink-0">
                                      {v.template?.bannerImage && (
                                        <div className="relative w-16 h-12 rounded-xl overflow-hidden border border-orange-100">
                                          <Image src={v.template.bannerImage} alt={title} fill className="object-cover" sizes="64px" />
                                        </div>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setAppliedVoucher(v);
                                          setIsVoucherModalOpen(false);
                                          setToast({ message: `Voucher "${title}" berhasil diterapkan!`, type: 'success' });
                                        }}
                                        className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                                          isCurrentlyApplied
                                            ? 'bg-emerald-600 text-white shadow-sm'
                                            : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm shadow-orange-500/20'
                                        }`}
                                      >
                                        {isCurrentlyApplied ? (
                                          <>
                                            <Check className="w-3.5 h-3.5" />
                                            <span>Dipakai</span>
                                          </>
                                        ) : (
                                          <span>Gunakan</span>
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  <div className="pt-3 flex justify-between items-center text-[11px] text-gray-500 font-medium">
                                    <span>
                                      Berlaku s/d{' '}
                                      {v.expiresAt
                                        ? new Date(v.expiresAt).toLocaleDateString('id-ID', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                          })
                                        : 'Selamanya'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedVoucherDetail(v.template || v);
                                        setIsDetailModalOpen(true);
                                      }}
                                      className="text-orange-600 font-black hover:underline cursor-pointer"
                                    >
                                      Lihat Syarat & Detail
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 2. Quick Claimable Free Promos right inside Voucher Saya so users never miss them */}
                      {claimableTemplates.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
                              <Gift className="w-4 h-4 text-orange-500" />
                              Promo Gratis Siap Klaim & Pakai ({claimableTemplates.length})
                            </h3>
                            <span className="text-[11px] font-bold text-orange-700 bg-orange-100 px-2.5 py-0.5 rounded-full">
                              1-Klik Klaim
                            </span>
                          </div>
                          <div className="space-y-3">
                            {claimableTemplates.map((t) => {
                              const minReq = t.minPurchase || 0;
                              const isCartEligible = subtotal >= minReq;
                              const shortfall = Math.max(0, minReq - subtotal);
                              return (
                                <div
                                  key={t.id}
                                  className="relative border border-orange-200 rounded-3xl bg-gradient-to-br from-white to-orange-50/40 p-4 shadow-sm flex items-center justify-between gap-4"
                                >
                                  <div className="space-y-1 min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-orange-100 text-orange-700">
                                        Promo Gratis
                                      </span>
                                      <span className="text-[10px] font-bold text-gray-500">
                                        {minReq > 0 ? `Min. ${formatRupiah(minReq)}` : 'Tanpa Min. Belanja'}
                                      </span>
                                    </div>
                                    <h4 className="font-black text-sm text-gray-900 truncate">{t.title}</h4>
                                    <p className="text-xs text-gray-600 line-clamp-1">{t.description}</p>
                                    {!isCartEligible && (
                                      <p className="text-[11px] font-bold text-amber-700">
                                        Tambah belanja {formatRupiah(shortfall)} lagi untuk langsung pakai
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        const res = await fetch('/api/user/vouchers/claim', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ code: t.code }),
                                        });
                                        const d = await res.json();
                                        if (!res.ok) throw new Error(d.error);
                                        await fetchVouchers();
                                        if (isCartEligible && d.voucher) {
                                          setAppliedVoucher(d.voucher);
                                          setIsVoucherModalOpen(false);
                                          setToast({ message: `Promo "${t.title}" berhasil diklaim & dipakai!`, type: 'success' });
                                        } else {
                                          setToast({ message: `Promo "${t.title}" berhasil diklaim ke Voucher Saya!`, type: 'success' });
                                        }
                                      } catch (err: any) {
                                        setToast({ message: err.message || 'Gagal mengklaim promo', type: 'error' });
                                      }
                                    }}
                                    className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-black text-xs shrink-0 shadow-sm shadow-orange-500/20 transition-all cursor-pointer"
                                  >
                                    {isCartEligible ? 'Klaim & Pakai' : 'Klaim Gratis'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 3. Voucher Belum Memenuhi Syarat (Unusable Vouchers) */}
                      {unusableVouchers.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="font-black text-sm text-gray-500 flex items-center gap-2">
                            <span>Belum Memenuhi Syarat Keranjang ({unusableVouchers.length})</span>
                          </h3>
                          <div className="space-y-3.5">
                            {unusableVouchers.map((v) => {
                              const title = v.template?.title || v.description;
                              const minReq = v.template?.minPurchase || v.minPurchase || 0;
                              const shortfall = Math.max(0, minReq - subtotal);
                              const progressPct = minReq > 0 ? Math.min(100, Math.round((subtotal / minReq) * 100)) : 0;

                              return (
                                <div
                                  key={v.id}
                                  className="relative border border-gray-200 rounded-3xl bg-white/80 p-5 shadow-xs overflow-hidden"
                                >
                                  <div className="pb-3.5 border-b border-dashed border-gray-100 flex items-start justify-between gap-4">
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100">
                                        Min. Belanja {formatRupiah(minReq)}
                                      </span>
                                      <h4 className="font-black text-base text-gray-700 leading-snug">{title}</h4>
                                      <p className="text-xs text-gray-500">{v.description}</p>

                                      {shortfall > 0 ? (
                                        <div className="pt-1 space-y-1.5">
                                          <div className="flex justify-between text-[11px] font-bold">
                                            <span className="text-orange-600">
                                              Kurang belanja {formatRupiah(shortfall)} lagi
                                            </span>
                                            <span className="text-gray-400">{progressPct}%</span>
                                          </div>
                                          <div className="w-full h-1.5 bg-orange-100 rounded-full overflow-hidden">
                                            <div
                                              className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full"
                                              style={{ width: `${progressPct}%` }}
                                            />
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-[11px] text-amber-700 font-bold pt-1">
                                          Khusus pembelian menu pilihan tertentu
                                        </p>
                                      )}

                                      {(() => {
                                        const rawProductIds = v.validProductIds || v.template?.validProductIds || null;
                                        let validIds: string[] | null = null;
                                        if (rawProductIds) {
                                          if (Array.isArray(rawProductIds)) {
                                            validIds = rawProductIds;
                                          } else {
                                            try {
                                              const parsed = JSON.parse(rawProductIds);
                                              if (Array.isArray(parsed)) validIds = parsed;
                                            } catch {}
                                          }
                                        }
                                        if (validIds && validIds.length > 0 && allProducts.length > 0) {
                                          const names = allProducts.filter(p => validIds?.includes(p.id)).map(p => p.name);
                                          if (names.length > 0) {
                                            return (
                                              <div className="pt-1 flex flex-wrap gap-1">
                                                <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full">
                                                  Khusus menu: {names.join(', ')}
                                                </span>
                                              </div>
                                            );
                                          }
                                        }
                                        return null;
                                      })()}
                                    </div>
                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                      <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
                                        <Ticket className="w-5 h-5" />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="pt-3 flex justify-between items-center text-[11px] text-gray-400 font-medium">
                                    <span>
                                      Berlaku s/d{' '}
                                      {v.expiresAt
                                        ? new Date(v.expiresAt).toLocaleDateString('id-ID', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                          })
                                        : 'Selamanya'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedVoucherDetail(v.template || v);
                                        setIsDetailModalOpen(true);
                                      }}
                                      className="text-orange-600 font-bold hover:underline cursor-pointer"
                                    >
                                      Lihat Syarat
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {usableVouchers.length === 0 && unusableVouchers.length === 0 && claimableTemplates.length === 0 && (
                        <div className="text-center py-12 bg-white rounded-3xl border border-orange-100 p-6 space-y-2">
                          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto">
                            <Ticket className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-black text-gray-900">Belum Ada Voucher Tersedia</p>
                          <p className="text-xs text-gray-500 font-medium max-w-xs mx-auto">
                            Jika Anda memiliki kode promo khusus, silakan ketik pada kolom kode promo di atas.
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Tab 2: Klaim Promo Gratis (Templates to Claim) */
                    <div className="space-y-4">
                      {claimableTemplates.map((t) => {
                        const minReq = t.minPurchase || 0;
                        const isCartEligible = subtotal >= minReq;
                        const val = t.discountValue || 0;
                        const badgeText =
                          t.type === 'DISCOUNT_RP'
                            ? val > 0 ? `Potongan ${formatRupiah(val)}` : 'Potongan Harga'
                            : t.type === 'DISCOUNT_PCT'
                            ? `Diskon ${val}%`
                            : t.type === 'B2G1'
                            ? 'Beli 2 Gratis 1'
                            : t.type === 'FREE_DRINK'
                            ? 'Gratis Minuman'
                            : 'Promo Spesial';

                        return (
                          <div
                            key={t.id}
                            className="relative border border-orange-200 rounded-3xl bg-white p-5 shadow-sm overflow-hidden"
                          >
                            <div className="pb-3.5 border-b border-dashed border-orange-100 flex items-start justify-between gap-4">
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-orange-700 bg-orange-100">
                                    {badgeText}
                                  </span>
                                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold text-gray-600 bg-gray-100">
                                    {minReq > 0 ? `Min. Belanja ${formatRupiah(minReq)}` : 'Tanpa Min. Belanja'}
                                  </span>
                                </div>
                                <h4 className="font-black text-base text-gray-900 leading-snug">{t.title}</h4>
                                <p className="text-xs text-gray-600 leading-relaxed">{t.description}</p>
                                <p className="text-[11px] font-mono text-orange-700 font-bold pt-0.5">Kode: {t.code}</p>
                              </div>
                              <div className="flex flex-col items-end gap-2 shrink-0">
                                {t.bannerImage && (
                                  <div className="relative w-16 h-12 rounded-xl overflow-hidden border border-orange-100">
                                    <Image src={t.bannerImage} alt={t.title} fill className="object-cover" sizes="64px" />
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      const res = await fetch('/api/user/vouchers/claim', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ code: t.code }),
                                      });
                                      const d = await res.json();
                                      if (!res.ok) throw new Error(d.error);
                                      await fetchVouchers();
                                      if (isCartEligible && d.voucher) {
                                        setAppliedVoucher(d.voucher);
                                        setIsVoucherModalOpen(false);
                                        setToast({ message: `Promo "${t.title}" berhasil diklaim & langsung dipakai!`, type: 'success' });
                                      } else {
                                        setVoucherModalTab('vouchers');
                                        setToast({ message: 'Promo berhasil diklaim ke Voucher Saya!', type: 'success' });
                                      }
                                    } catch (err: any) {
                                      setToast({ message: err.message || 'Gagal mengklaim voucher', type: 'error' });
                                    }
                                  }}
                                  className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-black text-xs shadow-sm shadow-orange-500/20 transition-all cursor-pointer"
                                >
                                  {isCartEligible ? 'Klaim & Pakai' : 'Klaim Gratis'}
                                </button>
                              </div>
                            </div>
                            <div className="pt-3 flex justify-between items-center text-[11px] text-gray-500 font-medium">
                              <span>
                                Berlaku s/d{' '}
                                {t.expiresAt
                                  ? new Date(t.expiresAt).toLocaleDateString('id-ID', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    })
                                  : '30 Hari setelah klaim'}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedVoucherDetail(t);
                                  setIsDetailModalOpen(true);
                                }}
                                className="text-orange-600 font-black hover:underline cursor-pointer"
                              >
                                Lihat Syarat & Detail
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {claimableTemplates.length === 0 && (
                        <div className="text-center py-12 bg-white rounded-3xl border border-orange-100 p-6 space-y-2">
                          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto">
                            <Check className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-black text-gray-900">Semua Promo Gratis Sudah Diklaim</p>
                          <p className="text-xs text-gray-500 font-medium max-w-xs mx-auto">
                            Silakan pilih voucher Anda yang sudah diklaim pada tab Voucher Saya.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Map Picker Modal rendered at root level to prevent stacking context conflicts */}
      <AnimatePresence>
        {isMapOpen && (
          <MapPicker
            isOpen={isMapOpen}
            onClose={() => setIsMapOpen(false)}
            onLocationSelect={(data) => {
              setDeliveryAddress(data);
              setIsMapOpen(false);
            }}
            initialLat={deliveryAddress?.lat}
            initialLng={deliveryAddress?.lng}
            deliveryFeePerKm={storeSettings.deliveryFeePerKm}
            maxDeliveryDistance={storeSettings.maxDeliveryDistance}
          />
        )}
      </AnimatePresence>

      {/* Payment/Location Confirmation Dialog */}
      <AnimatePresence>
        {showPaymentConfirmation && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] border border-orange-100 p-6 shadow-2xl space-y-4"
            >
              <div className="mx-auto w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-orange-600" />
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="font-serif font-black text-lg text-gray-900">
                  {orderType === 'PICKUP' ? 'Konfirmasi Pengambilan' : 'Konfirmasi Pengiriman'}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                  {orderType === 'PICKUP' ? (
                    <>
                      Harap diingat bahwa untuk pickup, lokasi pengambilan pesanan Anda berada di <strong className="text-orange-600 font-black">sekolah / ASD (sebelah BC)</strong>.
                    </>
                  ) : (
                    <>
                      Harap diingat bahwa layanan pengiriman (delivery) hanya berlaku untuk lokasi <strong className="text-red-600 font-black">selain SMKN 1 Probolinggo</strong>.
                    </>
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-[#FFFBF5] border border-orange-100 p-3.5 space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-gray-500">
                  <span>Metode Pembayaran</span>
                  <span className="font-black text-orange-700">{activePaymentLabel}</span>
                </div>
                <div className="flex justify-between items-center text-gray-900 pt-1 border-t border-dashed border-orange-200/70">
                  <span className="font-bold">Total Tagihan</span>
                  <span className="font-serif font-black text-sm text-orange-600">{formatRupiah(grandTotal)}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPaymentConfirmation(false)}
                  className="flex-1 py-3.5 border border-gray-200 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-2xl text-xs font-extrabold transition-all active:scale-95 cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => confirmAndSubmitOrder()}
                  className="flex-1 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl text-xs font-extrabold shadow-md shadow-orange-500/20 transition-all active:scale-[0.98] cursor-pointer text-center"
                >
                  {paymentMethod === 'WALLET' ? 'Lanjut Masukkan PIN' : 'Konfirmasi & Bayar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Floor Plan Selection Modal ────────────────── */}
      <AnimatePresence>
        {showFloorPlanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl rounded-[2.5rem] bg-white border border-gray-100 shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-amber-50/30 to-orange-50/10">
                <div className="flex items-center gap-2">
                  <Coffee className="w-5 h-5 text-[#B48A5E]" />
                  <div>
                    <h3 className="font-serif font-bold text-lg text-gray-900">Pilih Meja Dine-In</h3>
                    <p className="text-[11px] text-gray-400 font-medium">Tentukan meja dan jumlah orang untuk kunjungan Anda</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFloorPlanModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1 max-h-[70vh]">
                {/* Legend */}
                <div className="flex flex-wrap gap-4 text-xs font-bold justify-center text-gray-500 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 border-2 border-emerald-500 bg-white rounded-lg" />
                    <span>Meja (Tersedia)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 border-2 border-red-200 bg-red-50 rounded-lg" />
                    <span>Meja (Terisi)</span>
                  </div>
                </div>

                {/* Visual Blueprint floor plan */}
                <div
                  style={{
                    backgroundImage: `radial-gradient(rgba(180, 138, 94, 0.08) 1px, transparent 0)`,
                    backgroundSize: '20px 20px'
                  }}
                  className="relative w-full aspect-[4/3] rounded-[2rem] bg-[#FAFAFA] border border-gray-200 shadow-inner overflow-hidden select-none min-h-[340px]"
                >
                  <div className="absolute top-3 left-4 text-gray-400 text-[8px] font-mono tracking-widest uppercase pointer-events-none select-none">
                    [DENAH RUANGAN DINE-IN ARUM SEDUH]
                  </div>

                  {dbTables.map((table) => {
                    const isRound = table.shape === 'ROUND';
                    const isOccupied = table.status === 'OCCUPIED';
                    const isSelected = selectedTable === table.number;

                    return (
                      <button
                        key={table.id}
                        type="button"
                        disabled={isOccupied}
                        onClick={() => {
                          setSelectedTable(table.number);
                          setShowFloorPlanModal(false);
                        }}
                        style={{
                          left: `${table.x}%`,
                          top: `${table.y}%`,
                        }}
                        className={`absolute select-none transition-all duration-300 ${
                          isRound ? 'w-14 h-14 rounded-full' : 'w-20 h-12 rounded-xl'
                        } flex flex-col items-center justify-center border-2 shadow-sm ${
                          isSelected
                            ? 'ring-4 ring-amber-400 border-amber-500 bg-amber-50 text-amber-950 scale-105 z-30'
                            : isOccupied
                            ? 'border-red-200 bg-red-50 text-red-500 opacity-60 cursor-not-allowed'
                            : 'border-emerald-500 bg-white hover:bg-emerald-50 hover:scale-105 text-emerald-800 cursor-pointer'
                        }`}
                      >
                        <span className="font-serif font-black text-xs">
                          {table.number}
                        </span>
                        <span className="text-[8px] opacity-80 mt-0.5 font-bold leading-none">
                          {isOccupied ? 'Terisi' : 'Tersedia'}
                        </span>
                      </button>
                    );
                  })}

                  {dbTables.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-center text-gray-400 font-mono text-xs p-6">
                      [Tidak ada data meja aktif untuk ditampilkan]
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TopUpOverlay
        isOpen={isTopUpOpen}
        onClose={() => setIsTopUpOpen(false)}
        refreshWallet={refreshCheckoutWallet}
        showToast={(msg, type) => setToast({ message: msg, type })}
      />

      <ArusPayPinModal
        isOpen={showArusPayPinModal}
        onClose={() => setShowArusPayPinModal(false)}
        amount={grandTotal}
        description="Pembayaran Pesanan Arum Seduh"
        onSuccess={(verifiedPin) => confirmAndSubmitOrder(verifiedPin)}
      />
    </div>
  );
}
