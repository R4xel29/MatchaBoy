'use client';

import { useState, useMemo, useEffect } from 'react';
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
  Leaf, Ticket, Coins, CheckCircle2, XCircle, Loader2, Building2, QrCode
} from 'lucide-react';
import dynamic from 'next/dynamic';
const MapPicker = dynamic(() => import('@/components/checkout/MapPicker').then(m => m.MapPicker), { ssr: false });
import { useCartStore } from '@/stores/cart-store';
import { formatRupiah } from '@/lib/utils';
import { ProductRecommendations } from '@/components/checkout/ProductRecommendations';
import { ProductModal } from '@/components/storefront/ProductModal';
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
type OrderType = 'PICKUP' | 'DELIVERY';

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { openLogin } = useStorefrontContext();

  const items = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);

  const [orderType, setOrderType] = useState<OrderType>('PICKUP');
  const [pickupDate, setPickupDate] = useState<string | null>(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const [pickupTime, setPickupTime] = useState<string | null>('Sekarang');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [tempPickupTime, setTempPickupTime] = useState<string>('Sekarang');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [showPickupWarning, setShowPickupWarning] = useState(false);
  const [showTumblerWarning, setShowTumblerWarning] = useState(false);

  // Tumbler state
  const [hasTumbler, setHasTumbler] = useState(false);
  const [tumblerBonusPoints, setTumblerBonusPoints] = useState(0);
  const [tumblerDiscountPct, setTumblerDiscountPct] = useState(0);
  const [tumblerEnabled, setTumblerEnabled] = useState(false);

  // Voucher state
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<{
    id: string;
    code: string;
    type: string;
    description: string;
    discountAmount?: number;
    minPurchase?: number;
    maxDiscount?: number | null;
    template?: {
      maxDiscount?: number | null;
      minPurchase?: number;
    } | null;
  } | null>(null);
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
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [pointValue, setPointValue] = useState(1000);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  // Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedVoucherDetail, setSelectedVoucherDetail] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);

  const voucherDetail = useMemo(() => {
    if (!selectedVoucherDetail) return null;
    const template = selectedVoucherDetail.template || selectedVoucherDetail;
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
    };
  }, [selectedVoucherDetail]);

  // Store settings
  const [storeSettings, setStoreSettings] = useState({
    openTime: '08:00', closeTime: '21:00', pickupSlotInterval: 5,
    deliveryFeePerKm: 2000, maxDeliveryDistance: 10,
    storeLat: -7.756928, storeLng: 113.211502
  });

  // Automatically reset tumbler option when shipping method changes to DELIVERY
  useEffect(() => {
    if (orderType === 'DELIVERY') {
      setHasTumbler(false);
    }
  }, [orderType]);

  const [deliveryAddress, setDeliveryAddress] = useState<{ label: string, detail: string, streetDetail: string, lat: number, lng: number, distance: number, deliveryFee: number } | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  // Saved locations/addresses from profile
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string>('');
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
          setTumblerEnabled(true);
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

  // Fetch user profile and locations on mount/auth
  useEffect(() => {
    if (session?.user && storeSettings.storeLat) {
      setLoadingAddresses(true);
      
      // Load profile and locations concurrently
      Promise.all([
        fetch('/api/user/profile').then(r => r.json()).catch(() => null),
        fetch('/api/user/locations').then(r => r.json()).catch(() => null)
      ])
      .then(([profileData, locs]) => {
        let pName = session.user.name || '';
        let pPhone = '';
        if (profileData) {
          if (profileData.name) pName = profileData.name;
          if (profileData.phone) pPhone = profileData.phone;
          if (profileData.points !== undefined) setUserPoints(profileData.points);
        }
        setProfileName(pName);
        setProfilePhone(pPhone);

        if (Array.isArray(locs)) {
          setSavedAddresses(locs);
          const defaultLoc = locs.find((l: any) => l.isDefault);
          if (defaultLoc) {
            setSelectedSavedAddressId(defaultLoc.id);
            const sLat = storeSettings.storeLat ?? -7.756928;
            const sLng = storeSettings.storeLng ?? 113.211502;
            const distance = calculateDistance(sLat, sLng, defaultLoc.lat, defaultLoc.lng);
            const fee = calculateDeliveryFee(distance, storeSettings.deliveryFeePerKm);
            const withinRange = isWithinDeliveryRange(distance, storeSettings.maxDeliveryDistance);

            const detailsArray = [];
            if (defaultLoc.notes) detailsArray.push(`Catatan: ${defaultLoc.notes}`);
            if (defaultLoc.recipient) detailsArray.push(`Penerima: ${defaultLoc.recipient}`);
            if (defaultLoc.phone) detailsArray.push(`No. Telp: ${defaultLoc.phone}`);
            const streetDetail = detailsArray.length > 0 ? detailsArray.join(', ') : 'Tidak ada detail tambahan';

            setDeliveryAddress({
              label: defaultLoc.name || defaultLoc.address.split(',')[0],
              detail: defaultLoc.address,
              streetDetail,
              lat: defaultLoc.lat,
              lng: defaultLoc.lng,
              distance,
              deliveryFee: withinRange ? fee : 0
            });

            if (!withinRange) {
              setToast({ message: `Alamat utama "${defaultLoc.name}" di luar jangkauan (${distance.toFixed(1)} km)`, type: 'error' });
            }

            // Set initial form inputs to address custom recipient details, with fallback to profile
            setValue('name', defaultLoc.recipient || pName);
            setValue('phone', defaultLoc.phone || pPhone);
          } else {
            // No default location, so set name and phone to profile values
            setValue('name', pName);
            setValue('phone', pPhone);
          }
        } else {
          // Fallback to profile values
          setValue('name', pName);
          setValue('phone', pPhone);
        }
      })
      .catch(e => {
        console.error("Error loading checkout profile/locations:", e);
        if (session.user.name) setValue('name', session.user.name);
      })
      .finally(() => setLoadingAddresses(false));
    }
  }, [session?.user?.id, storeSettings.storeLat, storeSettings.storeLng, storeSettings.deliveryFeePerKm, storeSettings.maxDeliveryDistance, setValue]);

  const handleSelectSavedAddress = (addrId: string) => {
    const addr = savedAddresses.find((a: any) => a.id === addrId);
    if (!addr) return;
    
    setSelectedSavedAddressId(addrId);

    const sLat = storeSettings.storeLat ?? -7.756928;
    const sLng = storeSettings.storeLng ?? 113.211502;
    const distance = calculateDistance(sLat, sLng, addr.lat, addr.lng);
    const fee = calculateDeliveryFee(distance, storeSettings.deliveryFeePerKm);
    const withinRange = isWithinDeliveryRange(distance, storeSettings.maxDeliveryDistance);

    const detailsArray = [];
    if (addr.notes) detailsArray.push(`Catatan: ${addr.notes}`);
    if (addr.recipient) detailsArray.push(`Penerima: ${addr.recipient}`);
    if (addr.phone) detailsArray.push(`No. Telp: ${addr.phone}`);
    const streetDetail = detailsArray.length > 0 ? detailsArray.join(', ') : 'Tidak ada detail tambahan';

    setDeliveryAddress({
      label: addr.name || addr.address.split(',')[0],
      detail: addr.address,
      streetDetail,
      lat: addr.lat,
      lng: addr.lng,
      distance,
      deliveryFee: withinRange ? fee : 0,
    });

    if (!withinRange) {
      setToast({ message: `Alamat "${addr.name || 'Pilihan'}" berada di luar jangkauan pengiriman (${distance.toFixed(1)} km)`, type: 'error' });
    }

    // Set form recipient details
    setValue('name', addr.recipient || profileName);
    setValue('phone', addr.phone || profilePhone);
  };

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

  const subtotal = totalPrice();

  const toppingTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.addOns ? item.addOns.reduce((s, a) => s + a.price, 0) * item.quantity : 0), 0);
  }, [items]);

  const sizeUpgradeTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + ((item.sizePrice || 0) * item.quantity), 0);
  }, [items]);

  const filteredUserVouchers = useMemo(() => {
    return userVouchers.filter(v => {
      if (voucherSearchQuery) {
        const q = voucherSearchQuery.toLowerCase();
        const codeMatch = v.code?.toLowerCase().includes(q);
        const descMatch = v.description?.toLowerCase().includes(q);
        const titleMatch = v.title?.toLowerCase().includes(q);
        if (!codeMatch && !descMatch && !titleMatch) return false;
      }

      if (selectedVoucherFilter === 'semua') return true;
      if (selectedVoucherFilter === 'diskon') {
        return v.type === 'DISCOUNT_RP' || v.type === 'DISCOUNT_PCT' || v.type === 'FREE_DRINK' || v.type === 'FREE_TOPPING' || v.type === 'UPGRADE_SIZE' || v.type === 'REFERRAL_REWARD';
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
    return filteredUserVouchers.filter(v => subtotal >= (v.template?.minPurchase || v.minPurchase || 0));
  }, [filteredUserVouchers, subtotal]);

  const unusableVouchers = useMemo(() => {
    return filteredUserVouchers.filter(v => subtotal < (v.template?.minPurchase || v.minPurchase || 0));
  }, [filteredUserVouchers, subtotal]);

  const hasUnusableVouchers = useMemo(() => {
    return userVouchers.some(v => subtotal < (v.template?.minPurchase || v.minPurchase || 0));
  }, [userVouchers, subtotal]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const tumblerDiscount = hasTumbler && tumblerDiscountPct > 0 ? Math.round(subtotal * tumblerDiscountPct / 100) : 0;
  const shippingFee = orderType === 'DELIVERY' && deliveryAddress ? deliveryAddress.deliveryFee : 0;
  
  const hasFreeShippingBundle = useMemo(() => {
    return items.some(item => {
      if (item.isBundle) {
        const prod = allProducts.find(p => p.id === item.productId);
        if (prod?.modifiers) {
          return (prod.modifiers as any).freeShipping === true;
        }
      }
      return false;
    });
  }, [items, allProducts]);

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

    if (appliedVoucher.type === 'FREE_TOPPING') {
      const allAddOns = items.flatMap(item => item.addOns || []);
      if (allAddOns.length === 0) return 0;
      const highestToppingPrice = Math.max(...allAddOns.map(a => a.price));
      return highestToppingPrice > 0 ? highestToppingPrice : 0;
    }

    if (appliedVoucher.type === 'UPGRADE_SIZE') {
      const maxSizeUpgrade = items.reduce((max, item) => {
        const itemSizePrice = item.sizePrice || 0;
        return itemSizePrice > max ? itemSizePrice : max;
      }, 0);
      return maxSizeUpgrade;
    }
    
    // Resolve discount value from either discountAmount or template.discountValue
    const discountVal = (appliedVoucher.discountAmount !== undefined && appliedVoucher.discountAmount !== null && appliedVoucher.discountAmount > 0)
      ? appliedVoucher.discountAmount
      : (appliedVoucher as any).template?.discountValue || (appliedVoucher as any).discountValue || 0;

    if (discountVal > 0) {
      if (appliedVoucher.type === 'DISCOUNT_PCT') {
        const rawDiscount = Math.round((subtotal * discountVal) / 100);
        const maxDiscount = appliedVoucher.maxDiscount ?? (appliedVoucher as any).template?.maxDiscount;
        if (maxDiscount && maxDiscount > 0) {
          return Math.min(rawDiscount, maxDiscount);
        }
        return rawDiscount;
      }
      return discountVal;
    }
    switch (appliedVoucher.type) {
      case 'FREE_DRINK': return 25000;
      case 'REFERRAL_REWARD': return 25000;
      case 'DISCOUNT_RP': return 10000;
      default: return 10000;
    }
  }, [appliedVoucher, subtotal, items]);

  const pointsDiscount = usePoints ? pointsToUse * pointValue : 0;
  const grandTotal = Math.max(0, subtotal - tumblerDiscount - voucherDiscount - pointsDiscount) + Math.max(0, shippingFee - ongkirDiscount);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const modalTimeSlots = useMemo(() => {
    const [openH, openM] = storeSettings.openTime.split(':').map(Number);
    const [closeH, closeM] = storeSettings.closeTime.split(':').map(Number);

    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const minSlot = currentMinutes + 15;

    const startMinutes = Math.max(openMinutes, minSlot);
    const slots: string[] = [];
    const interval = 15;

    const remainder = startMinutes % interval;
    const alignedStart = remainder === 0 ? startMinutes : startMinutes + (interval - remainder);

    for (let m = alignedStart; m < closeMinutes; m += interval) {
      const h = Math.floor(m / 60) % 24;
      const min = m % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
    }
    return slots;
  }, [storeSettings.openTime, storeSettings.closeTime]);

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
    }
  }, [isScheduleModalOpen, pickupTime, modalTimeSlots]);

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

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) return;
    setVoucherLoading(true);
    setVoucherError('');
    try {
      const res = await fetch('/api/checkout/validate-voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: voucherCode.trim() }),
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

  const canSubmit = useMemo(() => {
    if (items.length === 0) return false;
    if (orderType === 'PICKUP' && (!pickupDate || !pickupTime)) return false;
    if (orderType === 'DELIVERY' && !deliveryAddress) return false;
    if (!paymentMethod) return false;
    return true;
  }, [items.length, orderType, pickupDate, pickupTime, deliveryAddress, paymentMethod]);

  const onSubmit = async (data: CheckoutFormData) => {
    if (!canSubmit) return;
    setIsSubmitting(true);

    try {
      const payload = {
        name: data.name,
        phone: data.phone,
        notes: data.notes,
        orderType,
        hasTumbler,
        voucherCode: appliedVoucher?.code || undefined,
        pointsUsed: usePoints ? pointsToUse : 0,
        pickupDate: pickupDate || undefined,
        pickupTime: pickupTime || undefined,
        paymentMethod,
        items: items.map(item => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.basePrice,
          totalPrice: item.totalPrice,
          size: item.size || 'Normal',
          sizePrice: item.sizePrice || 0,
          modsString: item.isBundle && item.bundleSelections
            ? item.bundleSelections.map(s => `${s.groupName}: ${s.productName}${s.iceLevel || s.sugarLevel ? ` (${[s.iceLevel, s.sugarLevel].filter(Boolean).join(', ')})` : ''}`).join(' | ')
            : `${item.size || 'Normal'}, ${item.iceLevel}, ${item.sugarLevel}${item.addOns.length > 0 ? ', +' + item.addOns.map(a => a.name).join(', +') : ''}`,
          addOnIds: item.isBundle ? [] : item.addOns.map(a => a.id),
          isBundle: item.isBundle || false,
          bundleSelections: item.isBundle ? item.bundleSelections : undefined
        })),
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
      
      // COD redirects straight to Order Tracking, online methods redirect to Payment detail page
      if (paymentMethod === 'COD') {
        router.push(`/orders/${responseData.orderId}`);
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

  // Show pickup reminder when time is selected
  useEffect(() => {
    if (pickupTime) {
      setShowPickupWarning(true);
    }
  }, [pickupTime]);

  // Auth Guard
  if (status === 'loading') {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#B48A5E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
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
            Kamu harus masuk terlebih dahulu untuk melanjutkan pemesanan matcha favoritmu.
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
  if (items.length === 0) {
    return (
      <div className="min-h-dvh bg-[#FFFBF5] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mb-6 shadow-inner border border-orange-100/50">
          <ShoppingBag className="w-8 h-8 text-[#B48A5E]" />
        </div>
        <h2 className="font-serif font-bold text-xl text-gray-900 mb-2">Keranjang Kosong</h2>
        <p className="text-sm text-gray-500 mb-6 max-w-xs">Yuk, jelajahi menu artisanal matcha terbaik kami dan tambahkan minuman favoritmu!</p>
        <button onClick={() => router.push('/')} className="px-8 py-4 rounded-2xl bg-[#B48A5E] text-white font-bold text-sm shadow-lg shadow-[#B48A5E]/20 hover:bg-[#946F48] transition-all active:scale-[0.98]">
          Kembali ke Menu
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#FFFBF5] pb-safe noise relative">
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
                Demi kualitas citarasa minuman terbaik, disarankan untuk <strong>tidak mengambil pesanan lebih dari 7 menit</strong> dari waktu yang dijadwalkan. 🍵
              </p>
              <button
                type="button"
                onClick={() => setShowPickupWarning(false)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#B48A5E] to-[#946F48] text-white font-bold text-sm shadow-md shadow-[#B48A5E]/10"
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
              <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100/60 flex items-center justify-center">
                <Leaf className="w-7 h-7 text-emerald-600 animate-pulse" />
              </div>
              <h3 className="text-center font-serif text-lg font-bold text-gray-950 mb-2">Bawa Tumbler Sendiri</h3>
              <p className="text-center text-xs text-gray-500 mb-6 leading-relaxed">
                Pastikan Anda <strong>betul-betul membawa tumbler sendiri</strong> dengan ukuran yang cukup besar (disarankan ukuran Large/besar) saat mengambil pesanan di gerai Matchaboy. 🌿
              </p>
              <button
                type="button"
                onClick={() => setShowTumblerWarning(false)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold text-sm shadow-md shadow-emerald-600/10"
              >
                Saya Mengerti
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#FFFBF5]/90 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center gap-4 px-6 py-4 max-w-6xl mx-auto">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-serif font-bold text-xl text-gray-900">Checkout</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col lg:flex-row gap-8 items-start relative z-10">
        {/* LEFT COLUMN */}
        <div className="w-full lg:flex-1 space-y-6">
          {/* ── 1. Order Type Selector ────────────────────────── */}
          <section className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
            <h2 className="font-serif font-bold text-base text-gray-900 mb-4 flex items-center gap-2">
              <Store className="w-4.5 h-4.5 text-[#B48A5E]" /> Metode Pengambilan
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOrderType('PICKUP')}
                className={`flex items-center gap-3.5 px-5 py-4 rounded-2xl border-2 transition-all active:scale-[0.98] text-left
                  ${orderType === 'PICKUP'
                    ? 'border-[#B48A5E] bg-[#B48A5E]/5 shadow-sm shadow-[#B48A5E]/5'
                    : 'border-gray-150 bg-white hover:border-gray-300'}`}
              >
                <Store className={`w-5.5 h-5.5 shrink-0 ${orderType === 'PICKUP' ? 'text-[#B48A5E]' : 'text-gray-400'}`} />
                <div>
                  <p className="text-sm font-bold text-gray-900">Ambil Langsung</p>
                  <p className="text-[10px] text-gray-400 leading-none mt-0.5">Pre-order & pickup di toko</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setOrderType('DELIVERY')}
                className={`flex items-center gap-3.5 px-5 py-4 rounded-2xl border-2 transition-all active:scale-[0.98] text-left
                  ${orderType === 'DELIVERY'
                    ? 'border-[#B48A5E] bg-[#B48A5E]/5 shadow-sm shadow-[#B48A5E]/5'
                    : 'border-gray-150 bg-white hover:border-gray-300'}`}
              >
                <Truck className={`w-5.5 h-5.5 shrink-0 ${orderType === 'DELIVERY' ? 'text-[#B48A5E]' : 'text-gray-400'}`} />
                <div>
                  <p className="text-sm font-bold text-gray-900">Delivery</p>
                  <p className="text-[10px] text-gray-400 leading-none mt-0.5">Kirim ke alamat tujuan</p>
                </div>
              </button>
            </div>
          </section>

          {/* ── 2. Delivery Address (Leaflet Map) ────────────────────────────────── */}
          {orderType === 'DELIVERY' && (
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-4">
              <h2 className="font-serif font-bold text-base text-gray-900 flex items-center gap-2">
                <MapPin className="w-4.5 h-4.5 text-[#B48A5E]" /> Alamat Pengiriman
              </h2>

              {loadingAddresses ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-[#B48A5E]" />
                  <span className="text-xs font-semibold text-gray-400 ml-2">Memuat alamat tersimpan...</span>
                </div>
              ) : savedAddresses.length > 0 ? (
                <div className="space-y-2 select-none">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 pl-1">Pilih Alamat Tersimpan</label>
                  <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-hide">
                    {savedAddresses.map((addr) => {
                      const isSelected = selectedSavedAddressId === addr.id;
                      return (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => handleSelectSavedAddress(addr.id)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                            isSelected
                              ? 'border-[#B48A5E] text-[#B48A5E] bg-[#FFF8F0] shadow-sm'
                              : 'border-gray-200 text-gray-500 bg-white hover:bg-gray-50'
                          }`}
                        >
                          <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-[#B48A5E]' : 'text-gray-400'}`} />
                          <span>{addr.name || 'Alamat'}</span>
                          {addr.isDefault && (
                            <span className="text-[8px] font-black uppercase text-amber-600 bg-amber-100 px-1.5 py-0.2 rounded-full ml-1">
                              Utama
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {!deliveryAddress ? (
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-[2rem] p-8 bg-gray-50 text-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-[#B48A5E]/10 flex items-center justify-center text-[#B48A5E]">
                    <MapPin className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-gray-800">Belum Ada Lokasi Terpilih</p>
                    <p className="text-[11px] text-gray-400 max-w-[260px]">Tentukan koordinat peta dan detail alamat pengantaran Anda</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMapOpen(true)}
                    className="px-6 py-3 rounded-full bg-gradient-to-r from-[#B48A5E] to-[#946F48] text-white font-bold text-xs shadow-md shadow-[#B48A5E]/10 hover:shadow-[#B48A5E]/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    Pilih Alamat di Peta (Buka Map)
                  </button>
                </div>
              ) : (
                <div className="border border-[#B48A5E]/20 bg-[#FFFBF5] rounded-[2rem] p-5 shadow-sm space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#B48A5E]/10 flex items-center justify-center text-[#B48A5E] shrink-0 mt-0.5">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold text-gray-900 truncate">{deliveryAddress.label}</p>
                        <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5 line-clamp-2">{deliveryAddress.detail}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMapOpen(true)}
                      className="text-xs font-bold text-[#B48A5E] hover:underline shrink-0 cursor-pointer"
                    >
                      Ubah Alamat / Lihat Peta
                    </button>
                  </div>

                  {/* Detailed Info Badge Grid */}
                  <div className="grid grid-cols-2 gap-3.5 border-y border-gray-100 py-3.5">
                    <div>
                      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Jarak</span>
                      <span className="text-xs font-extrabold text-gray-800">{deliveryAddress.distance.toFixed(1)} km</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ongkir</span>
                      <span className="text-xs font-extrabold text-[#B48A5E]">{formatRupiah(deliveryAddress.deliveryFee)}</span>
                    </div>
                  </div>

                  {/* Custom Street Details Card */}
                  <div className="bg-white border border-gray-100 rounded-2xl p-3.5 space-y-1">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Detail Alamat Pengiriman</span>
                    <p className="text-xs font-semibold text-gray-700 leading-snug">
                      {deliveryAddress.streetDetail}
                    </p>
                  </div>
                </div>
              )}
            </motion.section>
          )}

          {/* ── 3. Customer Details ───────────────────────────── */}
          <section className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-4">
            <h2 className="font-serif font-bold text-base text-gray-900 flex items-center gap-2">
              <User className="w-4.5 h-4.5 text-[#B48A5E]" /> Detail Pemesan
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 pl-1">Nama Lengkap</label>
                <input {...register('name')} placeholder="Nama Anda"
                  className="w-full px-4.5 py-3.5 rounded-2xl border border-gray-200 bg-[#F9F8F6] text-sm focus:outline-none focus:bg-white focus:border-[#B48A5E] transition-all shadow-inner" />
                {errors.name && <p className="text-xs text-red-500 mt-1 pl-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 pl-1">Nomor HP (WhatsApp)</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input {...register('phone')} placeholder="08123456789" type="tel"
                    className="w-full pl-11 pr-4.5 py-3.5 rounded-2xl border border-gray-200 bg-[#F9F8F6] text-sm focus:outline-none focus:bg-white focus:border-[#B48A5E] transition-all shadow-inner" />
                </div>
                {errors.phone && <p className="text-xs text-red-500 mt-1 pl-1">{errors.phone.message}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 pl-1">Catatan Pesanan (opsional)</label>
                <input {...register('notes')} placeholder="Contoh: Es sedikit, gula 50%, patokan rumah depan pagar hitam"
                  className="w-full px-4.5 py-3.5 rounded-2xl border border-gray-200 bg-[#F9F8F6] text-sm focus:outline-none focus:bg-white focus:border-[#B48A5E] transition-all shadow-inner" />
              </div>
            </div>
          </section>

          {/* ── 3b. Tumbler Toggle (Eco Card Glassmorphic) ──────────────────── */}
          {tumblerEnabled && orderType === 'PICKUP' && (
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <button
                type="button"
                onClick={() => {
                  const newVal = !hasTumbler;
                  setHasTumbler(newVal);
                  if (newVal) {
                    setShowTumblerWarning(true);
                  }
                }}
                className={`w-full relative overflow-hidden rounded-[2rem] border-2 p-5 transition-all duration-300 text-left active:scale-[0.98] ${
                  hasTumbler
                    ? 'border-emerald-300 bg-gradient-to-r from-emerald-50 to-green-50 shadow-md shadow-emerald-100/50'
                    : 'border-gray-100 bg-white hover:border-emerald-200'
                }`}
              >
                {hasTumbler && (
                  <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-emerald-400/10 blur-xl" />
                )}

                <div className="relative z-10 flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                    hasTumbler ? 'bg-emerald-500 shadow-md shadow-emerald-400/10 text-white' : 'bg-gray-50 border border-gray-100 text-gray-400'
                  }`}>
                    <Leaf className="w-5.5 h-5.5" />
                  </div>

                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={`text-sm font-bold transition-colors ${hasTumbler ? 'text-emerald-800' : 'text-gray-900'}`}>
                        Saya Bawa Tumbler Sendiri
                      </p>
                      {hasTumbler && (
                        <span className="text-[8.5px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                          Aktif ✓
                        </span>
                      )}
                    </div>
                    <p className={`text-xs leading-relaxed transition-colors ${hasTumbler ? 'text-emerald-650' : 'text-gray-400 font-medium'}`}>
                      Mendukung gerakan kurangi sampah plastik, dapatkan <strong>+{tumblerBonusPoints} bonus poin</strong>
                      {tumblerDiscountPct > 0 && <> + <strong>diskon {tumblerDiscountPct}%</strong></>} pada pesanan ini! 🌍
                    </p>
                  </div>

                  {/* Micro toggle switch */}
                  <div className={`w-11 h-6 rounded-full transition-colors duration-300 shrink-0 mt-1 relative border ${
                    hasTumbler ? 'bg-emerald-500 border-emerald-500' : 'bg-gray-100 border-gray-250'
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

          {/* ── 4. Order Summary ──────────────────────────────── */}
          <section className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-4">
            <h2 className="font-serif font-bold text-base text-gray-900 flex items-center gap-2">
              <ShoppingBag className="w-4.5 h-4.5 text-[#B48A5E]" /> Pesanan ({itemCount} Item)
            </h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-gray-50/50 border border-gray-100/30 hover:border-gray-200 transition-colors">
                  {item.image ? (
                    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-white relative border border-gray-100 shadow-sm">
                      <Image src={item.image} alt={item.name} fill className="object-cover" sizes="56px" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl shrink-0 bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                      <ShoppingBag className="w-5.5 h-5.5 text-gray-300" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                    <p className="text-[11px] text-gray-400 font-medium leading-relaxed truncate mt-0.5">
                      {item.isBundle && item.bundleSelections
                        ? item.bundleSelections.map((s: any) => `${s.productName}`).join(' · ')
                        : `${item.size || 'Normal'} · ${item.iceLevel} · ${item.sugarLevel}${item.addOns.length > 0 ? ` · +${item.addOns.map(a => a.name).join(', ')}` : ''}`
                      }
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs font-bold text-[#B48A5E]">{formatRupiah(item.totalPrice)}</p>
                      <button 
                        type="button" 
                        onClick={() => handleEditOrAdd(item, true)} 
                        className="text-[10px] text-amber-600 font-bold hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-2 bg-white rounded-xl p-1 border border-gray-150 shadow-sm">
                      <button type="button" onClick={() => item.quantity <= 1 ? removeItem(item.id) : updateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors">
                        {item.quantity <= 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                      </button>
                      <span className="w-5 text-center text-xs font-bold text-gray-800">{item.quantity}</span>
                      <button type="button" onClick={() => handleEditOrAdd(item, false)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-50 text-gray-800 transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <button
              type="button"
              onClick={() => router.push('/?openMenu=true')}
              className="w-full py-4 rounded-2xl border-2 border-dashed border-[#B48A5E]/20 text-[#B48A5E] font-bold text-xs hover:bg-[#B48A5E]/5 hover:border-[#B48A5E]/40 transition-all text-center flex items-center justify-center gap-2"
            >
              + Tambah Menu Lain
            </button>
          </section>

          {/* ── Voucher Trigger Section matching screenshot 1 ── */}
          <div className="space-y-0 select-none">
            {hasUnusableVouchers && (
              <div className="bg-[#FFF4E6] text-[#D97706] text-xs font-semibold px-4 py-3.5 rounded-t-2xl border border-b-0 border-[#FAD9C1] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 shrink-0 text-[#D97706]" />
                  <span>Tambah pesanan untuk pakai voucher</span>
                </div>
                <button type="button" onClick={() => setIsVoucherModalOpen(true)} className="text-gray-400 font-bold hover:text-gray-600 text-lg leading-none pb-1">
                  •••
                </button>
              </div>
            )}
            
            <button
              type="button"
              onClick={() => setIsVoucherModalOpen(true)}
              className={`w-full bg-[#FFFBF4] border border-[#F5E3D0] px-5 py-4 flex items-center justify-between hover:bg-[#FFF8EE] active:scale-[0.99] transition-all text-left
                ${hasUnusableVouchers ? 'rounded-b-2xl border-t-0' : 'rounded-2xl'}`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#FDF0DF] border border-[#F6D2B1] flex items-center justify-center text-[#C05621] shrink-0">
                  <span className="font-extrabold text-base">%</span>
                </div>
                <div>
                  <p className="font-bold text-sm text-[#5C3D2E]">
                    {appliedVoucher ? appliedVoucher.description : 'Pakai Kode Voucher'}
                  </p>
                  {appliedVoucher && (
                    <p className="text-[10px] text-[#C05621] font-extrabold uppercase tracking-widest mt-0.5">
                      Kode: {appliedVoucher.code}
                    </p>
                  )}
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-[#8C7864]" />
            </button>
          </div>
        </div> {/* END LEFT COLUMN */}

        {/* RIGHT COLUMN */}
        <div className="w-full lg:w-[390px] space-y-6 lg:sticky lg:top-24">
          <ProductRecommendations onSelectProduct={handleSelectRecommendation} />

          {/* ── 5. Payment Selector (Brutal Premium Upgraded) ─────────────────── */}
          <section className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-4">
            <h2 className="font-serif font-bold text-base text-gray-900 flex items-center gap-2">
              <CreditCard className="w-4.5 h-4.5 text-[#B48A5E]" /> Metode Pembayaran
            </h2>
            
            {paymentConfigLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {paymentConfig?.qris?.enabled && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('QRIS')}
                    className={`flex flex-col items-center gap-1.5 p-4.5 rounded-2xl border-2 transition-all active:scale-[0.97]
                      ${paymentMethod === 'QRIS'
                        ? 'border-purple-500 bg-purple-50/50 text-purple-700 shadow-sm shadow-purple-100'
                        : 'border-gray-150 bg-white text-gray-500 hover:border-gray-250'}`}
                  >
                    <QrCode className="w-6 h-6 shrink-0" />
                    <span className="text-[11px] font-bold tracking-wide">QRIS Instan</span>
                  </button>
                )}
                {paymentConfig?.transfer?.enabled && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('TRANSFER')}
                    className={`flex flex-col items-center gap-1.5 p-4.5 rounded-2xl border-2 transition-all active:scale-[0.97]
                      ${paymentMethod === 'TRANSFER'
                        ? 'border-blue-500 bg-blue-50/50 text-blue-700 shadow-sm shadow-blue-100'
                        : 'border-gray-150 bg-white text-gray-500 hover:border-gray-250'}`}
                  >
                    <Building2 className="w-6 h-6 shrink-0" />
                    <span className="text-[11px] font-bold tracking-wide">Transfer Bank</span>
                  </button>
                )}
                {paymentConfig?.cod?.enabled && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('COD')}
                    className={`flex flex-col items-center gap-1.5 p-4.5 rounded-2xl border-2 transition-all active:scale-[0.97]
                      ${paymentMethod === 'COD'
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 shadow-sm shadow-emerald-100'
                        : 'border-gray-150 bg-white text-gray-500 hover:border-gray-250'}`}
                  >
                    <Banknote className="w-6 h-6 shrink-0" />
                    <span className="text-[11px] font-bold tracking-wide">COD (Toko/Kurir)</span>
                  </button>
                )}
              </div>
            )}
            <div className="bg-[#FFFDF9]/60 border border-[#EADFC9]/25 rounded-2xl p-4 text-[11px] text-[#8C7864] font-medium leading-relaxed">
              💡 {paymentMethod === 'COD' 
                ? 'Bayar langsung di tempat saat pesanan kamu diserahkan kurir atau diambil di toko.' 
                : 'Selesaikan transaksi dengan mudah lewat sistem pembayaran premium kami setelah checkout.'}
            </div>
          </section>



          {/* ── 5b. Points Section ──────────────────────────── */}
          {userPoints > 0 && (
            <section className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm space-y-3">
              <h2 className="font-serif font-bold text-base text-gray-900 flex items-center gap-2">
                <Coins className="w-4.5 h-4.5 text-[#B48A5E]" /> Tukar Arus Poin
              </h2>
              <button
                type="button"
                onClick={() => { setUsePoints(!usePoints); if (!usePoints) setPointsToUse(Math.min(userPoints, Math.floor(subtotal / pointValue))); }}
                className={`w-full flex items-center gap-3.5 p-4.5 rounded-2xl border-2 transition-all text-left active:scale-[0.98] ${
                  usePoints ? 'border-amber-400 bg-amber-50/20 shadow-sm' : 'border-gray-150 bg-white hover:border-gray-250'
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  usePoints ? 'bg-amber-500 shadow-md shadow-amber-400/20 text-white' : 'bg-gray-50 border border-gray-100 text-gray-400'
                }`}>
                  <Coins className="w-5.5 h-5.5" />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${usePoints ? 'text-amber-800' : 'text-gray-900'}`}>Tukarkan Poin</p>
                  <p className={`text-xs leading-none mt-1 ${usePoints ? 'text-amber-600' : 'text-gray-400 font-medium'}`}>
                    {usePoints ? `${pointsToUse} poin = diskon ${formatRupiah(pointsToUse * pointValue)}` : `Miliki ${userPoints} poin (1 poin = ${formatRupiah(pointValue)})`}
                  </p>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors duration-300 shrink-0 relative border ${
                  usePoints ? 'bg-amber-500 border-amber-500' : 'bg-gray-100 border-gray-250'
                }`}>
                  <motion.div initial={false} animate={{ x: usePoints ? 20 : 0 }} className="absolute left-0.5 top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm" />
                </div>
              </button>
              {usePoints && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                  <div className="flex items-center gap-3 px-1 pt-2">
                    <span className="text-[10px] font-bold text-gray-400">1p</span>
                    <input
                      type="range"
                      min={1}
                      max={Math.min(userPoints, Math.floor(subtotal / pointValue))}
                      value={pointsToUse}
                      onChange={(e) => setPointsToUse(parseInt(e.target.value))}
                      className="flex-1 accent-amber-500 h-1.5 bg-gray-150 rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] font-bold text-gray-400">{Math.min(userPoints, Math.floor(subtotal / pointValue))}p</span>
                  </div>
                </motion.div>
              )}
            </section>
          )}

          {/* ── 6. Price Summary Receipt Card ─────────────────── */}
          <section className="rounded-[2.5rem] bg-white border border-gray-100 shadow-sm overflow-hidden ticket-card">
            <div className="px-6 py-6 space-y-4">
              <h2 className="font-serif font-black text-lg text-gray-900 border-b border-gray-50 pb-3">Ringkasan Tagihan</h2>
              <div className="space-y-3 text-xs font-semibold text-gray-500">
                <div className="flex justify-between">
                  <span className="font-medium">Subtotal</span>
                  <span className="text-gray-800">{formatRupiah(subtotal)}</span>
                </div>
                {toppingTotal > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">Total Topping/Add-on</span>
                    <span className="text-gray-800">{formatRupiah(toppingTotal)}</span>
                  </div>
                )}
                {sizeUpgradeTotal > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">Total Upgrade Ukuran</span>
                    <span className="text-gray-850">{formatRupiah(sizeUpgradeTotal)}</span>
                  </div>
                )}
                {orderType === 'PICKUP' && pickupTime && (
                  <div className="flex justify-between items-center bg-[#FFFDF9] border border-[#EADFC9]/20 p-2.5 rounded-xl">
                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-[#B48A5E]" /> Waktu Ambil</span>
                    <span className="font-bold text-[#B48A5E]">
                      {pickupTime === 'Sekarang' ? 'Pickup Sekarang (~15 mnt)' : `Hari Ini, ${pickupTime} - ${getEndTime(pickupTime)}`}
                    </span>
                  </div>
                )}
                {orderType === 'DELIVERY' && deliveryAddress && (
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1.5"><Truck className="w-4 h-4" /> Ongkir ({deliveryAddress.distance.toFixed(1)} km)</span>
                    <span className="text-gray-850 font-bold">{formatRupiah(deliveryAddress.deliveryFee)}</span>
                  </div>
                )}
                {hasTumbler && tumblerDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span className="flex items-center gap-1.5"><Leaf className="w-4 h-4" /> Diskon Tumbler</span>
                    <span className="font-bold">-{formatRupiah(tumblerDiscount)}</span>
                  </div>
                )}
                {appliedVoucher && voucherDiscount > 0 && (
                  <div className="flex justify-between text-purple-600">
                    <span className="flex items-center gap-1.5"><Ticket className="w-4 h-4" /> Diskon Voucher</span>
                    <span className="font-bold">-{formatRupiah(voucherDiscount)}</span>
                  </div>
                )}
                {(hasFreeShippingBundle || (appliedVoucher && (appliedVoucher.type === 'GRATIS_ONGKIR' || appliedVoucher.type === 'DISKON_ONGKIR') && ongkirDiscount > 0)) && (
                  <div className="flex justify-between text-emerald-600">
                    <span className="flex items-center gap-1.5">
                      <Truck className="w-4 h-4" />
                      Potongan Ongkos Kirim {hasFreeShippingBundle && <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold ml-1">Combo</span>}
                    </span>
                    <span className="font-bold">-{formatRupiah(ongkirDiscount)}</span>
                  </div>
                )}
                {usePoints && pointsDiscount > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span className="flex items-center gap-1.5"><Coins className="w-4 h-4" /> Diskon Poin ({pointsToUse})</span>
                    <span className="font-bold">-{formatRupiah(pointsDiscount)}</span>
                  </div>
                )}
                {hasTumbler && (
                  <div className="flex justify-between text-emerald-600 bg-emerald-50/20 border border-emerald-100/25 p-2 rounded-xl text-[10px]">
                    <span className="flex items-center gap-1">🌿 Bonus Arus Poin</span>
                    <span className="font-bold">+{tumblerBonusPoints} poin</span>
                  </div>
                )}
              </div>
              
              <div className="border-t border-dashed border-gray-200 pt-4 flex flex-col gap-1">
                <div className="flex items-baseline justify-between">
                  <span className="font-serif font-black text-gray-900 text-sm">Total Pembayaran</span>
                  <span className="font-serif font-black text-2xl text-[#B48A5E] tracking-tight">{formatRupiah(grandTotal)}</span>
                </div>
                {(voucherDiscount + tumblerDiscount + pointsDiscount + ongkirDiscount) > 0 && (
                  <p className="text-right text-[11px] font-bold text-emerald-600">
                    (Kamu hemat {formatRupiah(voucherDiscount + tumblerDiscount + pointsDiscount + ongkirDiscount)})
                  </p>
                )}
              </div>
            </div>

            <div className="px-6 pb-6 pt-3 bg-gray-50/40 border-t border-gray-50">
              {orderType === 'PICKUP' && (
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="w-full mb-3.5 py-4 rounded-2xl border-2 border-[#946F48] text-[#946F48] font-bold text-xs bg-white hover:bg-[#FAF6EE]/50 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Clock className="w-4.5 h-4.5 text-[#946F48]" />
                  {pickupTime === 'Sekarang' ? 'Jadwalkan Waktu Ambil' : `Jam Ambil: ${pickupTime}`}
                </button>
              )}

              <motion.button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                whileTap={canSubmit ? { scale: 0.98 } : {}}
                className={`w-full py-4.5 font-bold text-sm tracking-wide transition-all rounded-2xl hidden md:block
                  ${canSubmit && !isSubmitting
                    ? 'bg-gradient-to-r from-[#B48A5E] to-[#946F48] text-white shadow-xl shadow-[#946F48]/15 hover:opacity-95'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-250/20'}`}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    <span>Memproses...</span>
                  </div>
                ) : orderType === 'PICKUP' && (!pickupDate || !pickupTime) ? (
                  'Tentukan Waktu Pengambilan'
                ) : orderType === 'DELIVERY' && !deliveryAddress ? (
                  'Tentukan Alamat Kirim'
                ) : !paymentMethod ? (
                  'Pilih Metode Pembayaran'
                ) : (
                  `Buat Pesanan · ${formatRupiah(grandTotal)}`
                )}
              </motion.button>
            </div>
          </section>
        </div> {/* END RIGHT COLUMN */}
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
                    <Ticket className="w-12 h-12 stroke-1 text-[#B48A5E]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Matchaboy Promo</span>
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

                {/* S&K */}
                {voucherDetail.terms && (
                  <div className="bg-[#FFFBF5] rounded-2xl p-4 border border-[#EADFC9]/30 space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-450">Syarat & Ketentuan</h4>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-gray-650 font-medium leading-relaxed">
                      {voucherDetail.terms.split('\n').filter((t: string) => t.trim().length > 0).map((term: string, idx: number) => (
                        <li key={idx}>{term}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Close Action */}
              <div className="p-6 border-t border-gray-50 bg-gray-50/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="w-full py-3.5 bg-[#B48A5E] hover:bg-[#946F48] text-white font-bold rounded-2xl text-xs shadow-md shadow-[#B48A5E]/10 transition-all text-center cursor-pointer"
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
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-150 md:hidden pb-safe flex flex-col shadow-[0_-8px_24px_rgba(0,0,0,0.035)]">
        {/* Green Discount Notification Banner */}
        {(voucherDiscount + tumblerDiscount + pointsDiscount + ongkirDiscount) > 0 && (
          <div className="bg-[#E8F8F0] border-b border-[#D1F0DB] px-4 py-2.5 text-xs font-bold text-[#1E7D44] flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#1E7D44] text-white flex items-center justify-center font-extrabold text-[10px] shrink-0">%</span>
            <span>Kamu dapat diskon {formatRupiah(voucherDiscount + tumblerDiscount + pointsDiscount + ongkirDiscount)}!</span>
          </div>
        )}

        <div className="p-4 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif font-black text-lg text-gray-900 leading-none">
                {formatRupiah(grandTotal)}
              </span>
              {(voucherDiscount + tumblerDiscount + pointsDiscount + ongkirDiscount) > 0 && (
                <span className="text-[10px] text-gray-400 line-through">
                  {formatRupiah(subtotal + shippingFee)}
                </span>
              )}
            </div>
            {(voucherDiscount + tumblerDiscount + pointsDiscount + ongkirDiscount) > 0 && (
              <span className="text-[9px] font-extrabold text-[#1E7D44] mt-0.5">
                (Kamu hemat {formatRupiah(voucherDiscount + tumblerDiscount + pointsDiscount + ongkirDiscount)})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {orderType === 'PICKUP' && (
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(true)}
                className="flex items-center justify-center gap-1 px-3 py-3.5 rounded-xl border border-gray-200 text-[#8C7864] font-bold text-xs bg-white active:scale-95 transition-all"
              >
                <Clock className="w-4 h-4 text-[#8C7864]" />
                <span>{pickupTime === 'Sekarang' ? 'Jadwal' : pickupTime}</span>
              </button>
            )}
            
            <button
              type="button"
              onClick={() => {
                if (canSubmit && !isSubmitting) {
                  handleSubmit(onSubmit)();
                }
              }}
              disabled={!canSubmit || isSubmitting}
              className={`px-6 py-3.5 rounded-xl font-bold text-xs tracking-wider text-center transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
                canSubmit && !isSubmitting
                  ? 'bg-[#B82B32] text-white shadow-md shadow-[#B82B32]/10 hover:bg-[#9B2026]'
                  : 'bg-gray-250 text-gray-400 cursor-not-allowed border border-gray-300/10'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : orderType === 'PICKUP' && (!pickupDate || !pickupTime) ? (
                'Jadwalkan Ambil'
              ) : orderType === 'DELIVERY' && !deliveryAddress ? (
                'Tentukan Alamat'
              ) : !paymentMethod ? (
                'Pilih Pembayaran'
              ) : (
                'Bayar'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Pickup Schedule Modal (Framer Motion spring based wheel) */}
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

              <div className="flex flex-col items-center text-center mt-2 mb-6 select-none">
                <div className="w-14 h-14 rounded-2xl bg-[#FAF6EE] border border-[#EADFC9]/30 flex items-center justify-center mb-3.5">
                  <Clock className="w-7 h-7 text-[#946F48]" strokeWidth={1.8} />
                </div>
                <h3 className="font-serif font-black text-lg text-[#2A1A0F]">
                  Jadwalkan Waktu Ambil
                </h3>
                <p className="text-[11px] text-[#8C7864] font-bold mt-1 uppercase tracking-wider">
                  {tempPickupTime === 'Sekarang' 
                    ? 'Hari Ini, Sekarang' 
                    : `Hari Ini, Jam ${tempPickupTime} - ${getEndTime(tempPickupTime)}`}
                </p>
              </div>

              <div className="relative border border-[#EADFC9]/30 bg-[#FAF6EE]/40 rounded-3xl p-4 mb-6 overflow-hidden">
                <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-14 bg-white border border-[#EADFC9]/40 rounded-2xl -z-10 shadow-sm shadow-[#946F48]/5" />

                <div className="flex justify-center items-center h-[180px] py-2 relative">
                  {modalTimeSlots.length === 0 ? (
                    <p className="text-xs text-amber-800 font-bold py-6 text-center w-full">
                      Toko sudah tutup. Silakan pesan lagi besok pagi! ☕
                    </p>
                  ) : (
                    <>
                      {/* Hour Picker */}
                      <div 
                        className="w-1/2 h-[160px] overflow-y-auto scrollbar-hide flex flex-col items-center py-12 gap-2 select-none snap-y snap-mandatory scroll-smooth"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                      >
                        {availableHours.map((hour) => {
                          const isSelected = tempHour === hour;
                          return (
                            <button
                              key={hour}
                              type="button"
                              onClick={() => handleHourSelect(hour)}
                              className={`flex justify-center items-center py-1.5 px-4 rounded-xl transition-all duration-300 w-full max-w-[80px] shrink-0 snap-center ${
                                isSelected
                                  ? 'scale-115 font-serif font-black text-xl text-[#946F48]'
                                  : 'text-gray-350 text-sm hover:text-gray-600 font-bold opacity-60'
                              }`}
                            >
                              {hour}
                            </button>
                          );
                        })}
                      </div>

                      {/* Divider */}
                      <span className="text-xl font-black text-[#946F48]/60 px-3 shrink-0 animate-pulse">:</span>

                      {/* Minute Picker */}
                      <div 
                        className="w-1/2 h-[160px] overflow-y-auto scrollbar-hide flex flex-col items-center py-12 gap-2 select-none snap-y snap-mandatory scroll-smooth"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                      >
                        {availableMinutesForSelectedHour.map((min) => {
                          const isSelected = tempMin === min;
                          return (
                            <button
                              key={min}
                              type="button"
                              onClick={() => handleMinSelect(min)}
                              className={`flex justify-center items-center py-1.5 px-4 rounded-xl transition-all duration-300 w-full max-w-[80px] shrink-0 snap-center ${
                                isSelected
                                  ? 'scale-115 font-serif font-black text-xl text-[#946F48]'
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
                <button
                  type="button"
                  onClick={() => {
                    setPickupTime('Sekarang');
                    setTempPickupTime('Sekarang');
                    setIsScheduleModalOpen(false);
                  }}
                  className="w-full py-4 rounded-2xl border-2 border-[#946F48] text-[#946F48] font-bold text-xs hover:bg-[#FAF6EE]/50 active:scale-95 transition-all text-center"
                >
                  Pickup Sekarang
                </button>
                <button
                  type="button"
                  disabled={modalTimeSlots.length === 0}
                  onClick={() => {
                    if (tempPickupTime !== 'Sekarang') {
                      setPickupTime(tempPickupTime);
                    } else {
                      setPickupTime('Sekarang');
                    }
                    setIsScheduleModalOpen(false);
                  }}
                  className="w-full py-4 rounded-2xl bg-[#946F48] text-white font-bold text-xs hover:bg-[#745432] active:scale-[0.98] transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#946F48]/15"
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
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 flex items-center justify-between px-6 py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsVoucherModalOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 text-gray-700 transition-colors"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <h2 className="font-serif font-black text-xl text-gray-900">Vouchers</h2>
              </div>
              <button type="button" className="p-2 hover:bg-gray-50 rounded-full text-gray-700 transition-colors">
                <Ticket className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs: Vouchers vs Voucher Pack */}
            <div className="p-4 bg-gray-50 flex gap-2 border-b border-gray-100">
              <button
                type="button"
                onClick={() => setVoucherModalTab('vouchers')}
                className={`flex-1 py-3 text-center rounded-2xl font-bold text-sm transition-all ${
                  voucherModalTab === 'vouchers'
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50'
                    : 'text-gray-500 hover:bg-white/50'
                }`}
              >
                Vouchers
              </button>
              <button
                type="button"
                onClick={() => setVoucherModalTab('pack')}
                className={`flex-1 py-3 text-center rounded-2xl font-bold text-sm transition-all ${
                  voucherModalTab === 'pack'
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50'
                    : 'text-gray-500 hover:bg-white/50'
                }`}
              >
                Voucher Pack
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {/* Search input */}
              <div className="relative">
                <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#B48A5E]" />
                <input
                  value={voucherSearchQuery}
                  onChange={(e) => setVoucherSearchQuery(e.target.value)}
                  placeholder="Masukkan kode voucher ..."
                  className="w-full pl-12 pr-24 py-4 rounded-2xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-[#B48A5E] shadow-sm"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!voucherSearchQuery.trim()) return;
                    setVoucherLoading(true);
                    try {
                      const res = await fetch('/api/checkout/validate-voucher', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code: voucherSearchQuery.trim() })
                      });
                      const d = await res.json();
                      if (!res.ok) throw new Error(d.error);
                      setAppliedVoucher(d.voucher);
                      setIsVoucherModalOpen(false);
                      setToast({ message: 'Voucher berhasil diterapkan!', type: 'success' });
                    } catch (err: any) {
                      setToast({ message: err.message || 'Gagal menggunakan voucher', type: 'error' });
                    } finally {
                      setVoucherLoading(false);
                    }
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 bg-[#B48A5E] text-white rounded-xl font-bold text-xs hover:bg-[#946F48] transition-all"
                >
                  Pakai
                </button>
              </div>

              {/* Filters bar */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {(['semua', 'diskon', 'cashback', 'delivery'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setSelectedVoucherFilter(f)}
                    className={`px-4.5 py-2 rounded-full border text-xs font-bold capitalize transition-all whitespace-nowrap ${
                      selectedVoucherFilter === f
                        ? 'border-[#B48A5E] text-[#B48A5E] bg-[#FFF8F0]'
                        : 'border-gray-200 text-gray-500 bg-white hover:bg-gray-50'
                    }`}
                  >
                    {f === 'semua' ? 'Semua' : f === 'delivery' ? 'Delivery' : f}
                  </button>
                ))}
              </div>

              {loadingVouchers ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#B48A5E]" />
                </div>
              ) : (
                <div className="space-y-6">
                  {voucherModalTab === 'vouchers' ? (
                    <>
                      {/* Available & Usable Vouchers */}
                      {usableVouchers.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="font-serif font-black text-sm text-gray-800 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                            Diskon & Cashback
                          </h3>
                          <div className="space-y-3.5">
                            {usableVouchers.map((v) => (
                              <div
                                key={v.id}
                                className="relative border border-emerald-150 rounded-2xl bg-white p-5 shadow-sm overflow-hidden"
                              >
                                <div className="absolute left-0 top-[70%] -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#FFFBF5] border-r border-emerald-150 z-10" />
                                <div className="absolute right-0 top-[70%] translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#FFFBF5] border-l border-emerald-150 z-10" />
                                
                                <div className="pb-3.5 border-b border-dashed border-gray-150 flex items-start justify-between gap-4">
                                  <div className="space-y-1 flex-1 min-w-0">
                                    <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50">
                                      {v.type}
                                    </span>
                                    <h4 className="font-serif font-black text-base text-gray-900 leading-snug truncate">{v.description}</h4>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      <span className="text-[10px] font-bold text-gray-500">
                                        Min. Belanja: {formatRupiah(v.template?.minPurchase || v.minPurchase || 0)}
                                      </span>
                                      {(v.type === 'DISCOUNT_PCT' || v.template?.type === 'DISCOUNT_PCT') && (v.maxDiscount || v.template?.maxDiscount) && (
                                        <span className="text-[10px] font-bold text-[#D97706]">
                                          Maks. Potongan: {formatRupiah(v.maxDiscount || v.template?.maxDiscount || 0)}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-1">Kode: {v.code}</p>
                                  </div>
                                  <div className="flex flex-col items-end gap-2.5 shrink-0">
                                    {v.template?.bannerImage && (
                                      <div className="relative w-16 h-12 rounded-xl overflow-hidden border border-gray-100">
                                        <Image src={v.template.bannerImage} alt={v.description} fill className="object-cover" sizes="64px" />
                                      </div>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAppliedVoucher(v);
                                        setIsVoucherModalOpen(false);
                                        setToast({ message: 'Voucher berhasil diterapkan!', type: 'success' });
                                      }}
                                      className="px-4 py-2 bg-[#B48A5E] text-white rounded-xl font-bold text-xs hover:bg-[#946F48] transition-all"
                                    >
                                      Gunakan
                                    </button>
                                  </div>
                                </div>
                                <div className="pt-3 flex justify-between items-center text-[11px] text-gray-400">
                                  <span>Berlaku hingga {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Selamanya'}</span>
                                  <span 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedVoucherDetail(v.template || v);
                                      setIsDetailModalOpen(true);
                                    }}
                                    className="text-[#B48A5E] font-bold hover:underline cursor-pointer"
                                  >
                                    Detail
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Voucher Belum Bisa Dipakai (Unusable Vouchers) */}
                      {unusableVouchers.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="font-serif font-black text-sm text-gray-500">
                            Voucher Belum Bisa dipakai
                          </h3>
                          <div className="space-y-3.5 opacity-70">
                            {unusableVouchers.map((v) => (
                              <div
                                key={v.id}
                                className="relative border border-gray-200 rounded-2xl bg-white p-5 shadow-sm overflow-hidden"
                              >
                                <div className="absolute left-0 top-[70%] -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#FFFBF5] border-r border-gray-250 z-10" />
                                <div className="absolute right-0 top-[70%] translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#FFFBF5] border-l border-gray-250 z-10" />
                                
                                <div className="pb-3.5 border-b border-dashed border-gray-150 flex items-start justify-between gap-4">
                                  <div className="space-y-1 flex-1 min-w-0">
                                    <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100">
                                      {v.type}
                                    </span>
                                    <h4 className="font-serif font-black text-base text-gray-700 leading-snug truncate">{v.description}</h4>
                                    <p className="text-[11px] text-red-500 font-bold">Min. Belanja {formatRupiah(v.template?.minPurchase || v.minPurchase || 0)}</p>
                                    {(v.type === 'DISCOUNT_PCT' || v.template?.type === 'DISCOUNT_PCT') && (v.maxDiscount || v.template?.maxDiscount) && (
                                      <p className="text-[10px] font-bold text-gray-400">
                                        Maks. Potongan: {formatRupiah(v.maxDiscount || v.template?.maxDiscount || 0)}
                                      </p>
                                    )}
                                    <p className="text-[11px] text-gray-450 mt-0.5">Kode: {v.code}</p>
                                  </div>
                                  <div className="flex flex-col items-end gap-2.5 shrink-0">
                                    {v.template?.bannerImage ? (
                                      <div className="relative w-16 h-12 rounded-xl overflow-hidden border border-gray-100">
                                        <Image src={v.template.bannerImage} alt={v.description} fill className="object-cover" sizes="64px" />
                                      </div>
                                    ) : (
                                      <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-150 flex items-center justify-center text-gray-400">
                                        <Ticket className="w-5.5 h-5.5" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="pt-3 flex justify-between items-center text-[11px] text-gray-400">
                                  <span>Berlaku hingga {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Selamanya'}</span>
                                  <span 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedVoucherDetail(v.template || v);
                                      setIsDetailModalOpen(true);
                                    }}
                                    className="text-[#B48A5E] font-bold hover:underline cursor-pointer"
                                  >
                                    Detail
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {usableVouchers.length === 0 && unusableVouchers.length === 0 && (
                        <div className="text-center py-12 text-gray-400 text-sm font-medium">
                          Tidak ada voucher tersedia
                        </div>
                      )}
                    </>
                  ) : (
                    // Voucher Pack / Templates to Claim
                    <div className="space-y-3.5">
                      {claimableTemplates.map((t) => (
                        <div
                          key={t.id}
                          className="relative border border-amber-100 rounded-2xl bg-white p-5 shadow-sm overflow-hidden"
                        >
                          <div className="absolute left-0 top-[70%] -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#FFFBF5] border-r border-amber-100 z-10" />
                          <div className="absolute right-0 top-[70%] translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#FFFBF5] border-l border-amber-100 z-10" />
                          
                          <div className="pb-3.5 border-b border-dashed border-gray-150 flex items-start justify-between gap-4">
                            <div className="space-y-1 flex-1 min-w-0">
                              <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50">
                                {t.type}
                              </span>
                              <h4 className="font-serif font-black text-base text-gray-900 leading-snug truncate">{t.title}</h4>
                              <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">{t.description}</p>
                              <p className="text-[10px] text-[#B48A5E] font-bold mt-1">Kode: {t.code}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2.5 shrink-0">
                              {t.bannerImage && (
                                <div className="relative w-16 h-12 rounded-xl overflow-hidden border border-gray-100">
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
                                      body: JSON.stringify({ code: t.code })
                                    });
                                    const d = await res.json();
                                    if (!res.ok) throw new Error(d.error);
                                    setToast({ message: 'Voucher berhasil diklaim!', type: 'success' });
                                    fetchVouchers();
                                  } catch (err: any) {
                                    setToast({ message: err.message || 'Gagal mengklaim voucher', type: 'error' });
                                  }
                                }}
                                className="px-4.5 py-2 border-2 border-[#B48A5E] text-[#B48A5E] hover:bg-[#B48A5E] hover:text-white rounded-xl font-bold text-xs transition-all"
                              >
                                Klaim
                              </button>
                            </div>
                          </div>
                          <div className="pt-3 flex justify-between items-center text-[11px] text-gray-400">
                            <span>Masa Berlaku hingga {t.expiresAt ? new Date(t.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '30 Hari'}</span>
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVoucherDetail(t);
                                setIsDetailModalOpen(true);
                              }}
                              className="text-[#B48A5E] font-bold hover:underline cursor-pointer"
                            >
                              Detail
                            </span>
                          </div>
                        </div>
                      ))}

                      {claimableTemplates.length === 0 && (
                        <div className="text-center py-12 text-gray-400 text-sm font-medium">
                          Tidak ada voucher pack baru untuk diklaim
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
              setSelectedSavedAddressId('');
              setIsMapOpen(false);
            }}
            initialLat={deliveryAddress?.lat}
            initialLng={deliveryAddress?.lng}
            deliveryFeePerKm={storeSettings.deliveryFeePerKm}
            maxDeliveryDistance={storeSettings.maxDeliveryDistance}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
