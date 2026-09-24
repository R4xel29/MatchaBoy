'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  X,
  Plus,
  Minus,
  Check,
  Heart,
  MessageSquare,
  Send,
  Star,
  Flame,
  Coffee,
  UtensilsCrossed,
  Leaf,
  Scale,
  Award,
  Droplets,
  Info,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  CupSoda,
  ShoppingBag,
} from 'lucide-react';
import type { Product, Category, IceLevel, SugarLevel, AddOn } from '@/types';
import { formatRupiah, getActivePromo, cn } from '@/lib/utils';
import { isFoodItem } from '@/lib/receipt-modifiers';
import { useCartStore } from '@/stores/cart-store';
import { ADD_ONS } from '@/lib/constants';
import { PromoCountdown } from './PromoCountdown';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/ui/Toast';

const SWEETNESS_VALUES: SugarLevel[] = ['Less', 'Biasa', 'Lumayan', 'Manis Sekali'];
const SWEETNESS_MAP: { [key: string]: number } = {
  'Less': 0,
  'Less Sugar': 0,
  'Biasa': 1,
  'Normal Sugar': 1,
  'Normal': 1,
  'Lumayan': 2,
  'Manis Sekali': 3,
};

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  editCartItemId?: string;
  initialData?: any; // To preload ice, sugar, addOns, qty
  allProducts?: Product[];
  categories?: Category[];
  packagingStock?: { cupRegular: number; cupJumbo: number };
}

const ICE_LEVELS: IceLevel[] = ['Normal Ice', 'Less Ice', 'No Ice'];
const EMPTY_PRODUCTS: Product[] = [];
const EMPTY_CATEGORIES: Category[] = [];

export function ProductModal({
  product,
  isOpen,
  onClose,
  editCartItemId,
  initialData,
  allProducts = EMPTY_PRODUCTS,
  categories = EMPTY_CATEGORIES,
  packagingStock: propPackagingStock,
}: ProductModalProps) {
  const addItem = useCartStore((s) => s.addItem);
  const editItem = useCartStore((s) => s.editItem);
  const dragControls = useDragControls();

  const [iceLevel, setIceLevel] = useState<IceLevel>('Normal Ice');
  const [sugarLevel, setSugarLevel] = useState<SugarLevel>('Normal Sugar');
  const [selectedAddOns, setSelectedAddOns] = useState<AddOn[]>([]);
  const [size, setSize] = useState<string>('Normal');
  const [sizePrice, setSizePrice] = useState<number>(0);
  const [shot, setShot] = useState<string>('Single Shot');
  const [shotPrice, setShotPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState(1);
  const [isDesktop, setIsDesktop] = useState(false);
  const [matchaLevel, setMatchaLevel] = useState<number>(5);
  const [hasTumbler, setHasTumbler] = useState(false);
  const [loyaltySettings, setLoyaltySettings] = useState<any>(null);
  const [packagingStock, setPackagingStock] = useState<{ cupRegular: number; cupJumbo: number }>(
    propPackagingStock || {
      cupRegular: 999,
      cupJumbo: 999,
    }
  );

  useEffect(() => {
    if (propPackagingStock) {
      setPackagingStock(propPackagingStock);
    }
  }, [propPackagingStock]);

  // Bundle Selection State
  const [bundleSelections, setBundleSelections] = useState<{ [groupId: string]: any }>({});

  const { data: session } = useSession();
  const { showToast } = useToast();

  const checkProductIsFood = useCallback(
    (targetProduct?: Product | null, fallbackName?: string): boolean => {
      const targetName = targetProduct?.name || fallbackName || '';
      if (!targetProduct && !targetName) return false;
      const catObj = targetProduct
        ? categories.find((c) => c.id === targetProduct.category || c.slug === targetProduct.category)
        : undefined;
      const catLower = targetProduct
        ? `${targetProduct.category || ''} ${(targetProduct as any).categoryName || ''} ${(targetProduct as any).categorySlug || ''} ${catObj?.name || ''} ${catObj?.slug || ''}`.toLowerCase()
        : '';
      const nameLower = targetName.toLowerCase();
      const descLower = (targetProduct?.description || '').toLowerCase();
      return (
        isFoodItem(targetName) ||
        (targetProduct?.modifiers as any)?.productType === 'makanan' ||
        catLower.includes('pastries') ||
        catLower.includes('makan') ||
        catLower.includes('food') ||
        catLower.includes('snack') ||
        catLower.includes('roti') ||
        catLower.includes('pastry') ||
        catLower.includes('cemilan') ||
        nameLower.includes('croissant') ||
        nameLower.includes('cookie') ||
        nameLower.includes('tiramisu') ||
        descLower.includes('croissant') ||
        descLower.includes('cookie')
      );
    },
    [categories]
  );

  const isFood = useMemo(() => {
    if (!product) return false;
    return checkProductIsFood(product);
  }, [product, checkProductIsFood]);

  const isBeverage = !isFood;

  useEffect(() => {
    if (isOpen) {
      fetch('/api/admin/loyalty/settings')
        .then((r) => (r.ok ? r.json() : {}))
        .then((data) => setLoyaltySettings(data))
        .catch((err) => console.error('Error fetching settings in modal:', err));

      if (!propPackagingStock) {
        fetch('/api/products')
          .then((r) => (r.ok ? r.json() : {}))
          .then((data: any) => {
            if (data && data.packagingStock) {
              setPackagingStock(data.packagingStock);
              if (
                isBeverage &&
                data.packagingStock.cupRegular <= 0 &&
                data.packagingStock.cupJumbo > 0 &&
                !hasTumbler &&
                !initialData
              ) {
                const largeOpt = product?.modifiers?.sizes?.find(
                  (s: any) =>
                    s.name?.toLowerCase().includes('large') || s.name?.toLowerCase().includes('jumbo')
                );
                setSize(largeOpt?.name || 'Large');
                setSizePrice(largeOpt?.price ?? 3000);
              }
            }
          })
          .catch((err) => console.error('Error fetching packaging stock:', err));
      }
    }
  }, [isOpen, hasTumbler, propPackagingStock, initialData, product, isBeverage]);

  // Reviews state
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [replyComment, setReplyComment] = useState<{ [reviewId: string]: string }>({});
  const [replyLoading, setReplyLoading] = useState<{ [reviewId: string]: boolean }>({});

  const fetchReviews = async () => {
    if (!product) return;
    setLoadingReviews(true);
    try {
      const res = await fetch(`/api/products/${product.id}/reviews`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    if (isOpen && product) {
      fetchReviews();
    }
  }, [isOpen, product]);

  const handleToggleLike = async (reviewId: string) => {
    if (!session) {
      showToast('Silakan login terlebih dahulu untuk menyukai ulasan.', 'error');
      return;
    }
    try {
      const res = await fetch(`/api/reviews/${reviewId}/like`, { method: 'POST' });
      if (res.ok) {
        fetchReviews();
      }
    } catch (err) {
      console.error('Error liking review:', err);
    }
  };

  const handlePostReply = async (reviewId: string) => {
    if (!session) {
      showToast('Silakan login terlebih dahulu untuk membalas ulasan.', 'error');
      return;
    }
    const comment = replyComment[reviewId];
    if (!comment || comment.trim() === '') return;

    setReplyLoading((prev) => ({ ...prev, [reviewId]: true }));
    try {
      const res = await fetch(`/api/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      });
      if (res.ok) {
        setReplyComment((prev) => ({ ...prev, [reviewId]: '' }));
        fetchReviews();
      }
    } catch (err) {
      console.error('Error posting reply:', err);
    } finally {
      setReplyLoading((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  // Sweetness mapping helper
  const currentSweetnessIndex = useMemo(() => {
    return SWEETNESS_MAP[sugarLevel] ?? 1;
  }, [sugarLevel]);

  const handleSweetnessSliderChange = (val: number) => {
    setSugarLevel(SWEETNESS_VALUES[val]);
  };

  const isSoldOut = product?.badge === 'sold-out';
  const [subPhone, setSubPhone] = useState('');
  const [subEmail, setSubEmail] = useState('');
  const [subLoading, setSubLoading] = useState(false);
  const [subSuccess, setSubSuccess] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);

  // Initialize contact info from session
  useEffect(() => {
    if (isOpen && product && isSoldOut) {
      setSubPhone((session?.user as any)?.phone || '');
      setSubEmail(session?.user?.email || '');
      setSubSuccess(false);
      setSubError(null);
    }
  }, [isOpen, product, isSoldOut, session]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setSubLoading(true);
    setSubError(null);

    try {
      const res = await fetch(`/api/products/${product.id}/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: subPhone || undefined,
          email: subEmail || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal mendaftar notifikasi.');
      }

      setSubSuccess(true);
    } catch (err: any) {
      setSubError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSubLoading(false);
    }
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Sync state with initialData only when modal opens or product/cart item changes
  useEffect(() => {
    if (!isOpen || !product) return;

    if (initialData) {
      setIceLevel(initialData.iceLevel || 'Normal Ice');
      setSugarLevel(initialData.sugarLevel || 'Normal Sugar');
      setSelectedAddOns(initialData.addOns || []);
      setSize(initialData.size || 'Normal');
      setSizePrice(initialData.sizePrice || 0);
      setQuantity(initialData.quantity || 1);
      setMatchaLevel(initialData.matchaLevel || 5);
      setHasTumbler(initialData.hasTumbler || false);
      setShot(initialData.shot || 'Single Shot');
      setShotPrice(initialData.shotPrice || 0);
      if (initialData.bundleSelections) {
        const loaded: { [groupId: string]: any } = {};
        initialData.bundleSelections.forEach((s: any) => {
          loaded[s.groupId] = s;
        });
        setBundleSelections(loaded);
      }
    } else {
      const isRegularOut =
        isBeverage &&
        !product.modifiers?.isBundle &&
        packagingStock.cupRegular <= 0 &&
        packagingStock.cupJumbo > 0;
      const largeOpt = product.modifiers?.sizes?.find(
        (s: any) => s.name?.toLowerCase().includes('large') || s.name?.toLowerCase().includes('jumbo')
      );
      const defaultSize = isRegularOut ? largeOpt?.name || 'Large' : 'Normal';
      const defaultSizePrice = isRegularOut ? largeOpt?.price ?? 3000 : 0;

      setIceLevel((product.modifiers?.defaultIce as IceLevel) || 'Normal Ice');
      setSugarLevel((product.modifiers?.defaultSugar as SugarLevel) || 'Biasa');
      setSelectedAddOns([]);
      setSize(defaultSize);
      setSizePrice(defaultSizePrice);
      setShot('Single Shot');
      setShotPrice(0);
      setQuantity(1);
      setMatchaLevel(product.modifiers?.defaultMatcha ?? 5);
      setHasTumbler(false);

      if (product.modifiers?.isBundle && product.modifiers.bundleGroups) {
        const defaults: { [groupId: string]: any } = {};
        product.modifiers.bundleGroups.forEach((group) => {
          const firstOption = group.options?.[0];
          if (firstOption) {
            const optProduct = allProducts?.find((p) => p.id === firstOption.productId);
            const optIsFood = checkProductIsFood(optProduct, firstOption.name);
            defaults[group.id] = {
              groupId: group.id,
              groupName: group.name,
              productId: firstOption.productId,
              productName: firstOption.name,
              priceAdjustment: firstOption.priceAdjustment || 0,
              iceLevel:
                !optIsFood && optProduct?.modifiers?.iceLevel && optProduct.modifiers.iceLevel.length > 0
                  ? optProduct.modifiers.iceLevel[0]
                  : undefined,
              sugarLevel:
                !optIsFood && optProduct?.modifiers?.sugarLevel && optProduct.modifiers.sugarLevel.length > 0
                  ? optProduct.modifiers.sugarLevel[0]
                  : undefined,
            };
          }
        });
        setBundleSelections(defaults);
      } else {
        setBundleSelections({});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, product?.id, editCartItemId, initialData]);

  // Reset state on explicit close (fallback)
  const resetState = () => {
    if (!initialData) {
      const isRegularOut =
        isBeverage &&
        !product?.modifiers?.isBundle &&
        packagingStock.cupRegular <= 0 &&
        packagingStock.cupJumbo > 0;
      const largeOpt = product?.modifiers?.sizes?.find(
        (s: any) => s.name?.toLowerCase().includes('large') || s.name?.toLowerCase().includes('jumbo')
      );
      const defaultSize = isRegularOut ? largeOpt?.name || 'Large' : 'Normal';
      const defaultSizePrice = isRegularOut ? largeOpt?.price ?? 3000 : 0;

      setIceLevel((product?.modifiers?.defaultIce as IceLevel) || 'Normal Ice');
      setSugarLevel((product?.modifiers?.defaultSugar as SugarLevel) || 'Biasa');
      setSelectedAddOns([]);
      setSize(defaultSize);
      setSizePrice(defaultSizePrice);
      setShot('Single Shot');
      setShotPrice(0);
      setQuantity(1);
      setBundleSelections({});
      setMatchaLevel(product?.modifiers?.defaultMatcha ?? 5);
      setHasTumbler(false);
    }
  };

  const addOnTotal = useMemo(
    () => selectedAddOns.reduce((sum, a) => sum + a.price, 0),
    [selectedAddOns]
  );

  const bundleSelectionsArray = useMemo(
    () => Object.values(bundleSelections),
    [bundleSelections]
  );

  const bundleAdjustmentsTotal = useMemo(() => {
    return bundleSelectionsArray.reduce((sum, item: any) => sum + (item.priceAdjustment || 0), 0);
  }, [bundleSelectionsArray]);

  const isMatchaProduct = useMemo(() => {
    if (!product || isFood) return false;
    const nameLower = product.name.toLowerCase();
    const descLower = product.description.toLowerCase();
    return nameLower.includes('matcha') || nameLower.includes('green tea') || descLower.includes('matcha');
  }, [product, isFood]);

  const shouldShowEspressoCustomizer = useMemo(() => {
    if (!product || isFood) return false;
    return product.modifiers?.showEspressoShot === true;
  }, [product, isFood]);

  const availableShots: { name: string; price: number; label?: string; shots?: number }[] = useMemo(() => {
    if (product?.modifiers?.espressoShots && product.modifiers.espressoShots.length > 0) {
      return product.modifiers.espressoShots;
    }
    return [
      { name: 'Single Shot', price: 0, label: 'Single Shot (Standar)', shots: 1 },
      { name: 'Double Shot', price: 3000, label: 'Double Shot (+Rp 3.000)', shots: 2 },
      { name: 'Triple Shot', price: 6000, label: 'Triple Shot (+Rp 6.000)', shots: 3 }
    ];
  }, [product]);

  const availableSizes = useMemo(() => {
    if (isFood) return [];
    if (product?.modifiers?.sizes && product.modifiers.sizes.length > 0) {
      return product.modifiers.sizes;
    }
    if (isBeverage && !product?.modifiers?.isBundle) {
      return [
        { name: 'Normal', price: 0 },
        { name: 'Large', price: 3000 },
      ];
    }
    return [];
  }, [product, isBeverage, isFood]);

  const hasSugarOption = useMemo(() => {
    if (isFood) return false;
    return !!(product?.modifiers?.sugarLevel && product.modifiers.sugarLevel.length > 0);
  }, [product, isFood]);

  const shouldShowMatchaCustomizer = useMemo(() => {
    if (!product || isFood) return false;
    const isShown =
      product.modifiers?.showMatcha === true ||
      (isMatchaProduct && product.modifiers?.showMatcha !== false);
    return isShown && loyaltySettings?.showMatchaCustomizer !== false;
  }, [product, isMatchaProduct, loyaltySettings, isFood]);

  const shouldShowSweetnessCustomizer = useMemo(() => {
    if (!product || isFood) return false;
    const isShown =
      product.modifiers?.showSweetness === true ||
      ((hasSugarOption || isMatchaProduct) && product.modifiers?.showSweetness !== false);
    return isShown && loyaltySettings?.showSweetnessCustomizer !== false;
  }, [product, hasSugarOption, isMatchaProduct, loyaltySettings, isFood]);

  const activePromo = product ? getActivePromo(product) : null;
  const baseProductPrice = activePromo ? activePromo.promoPrice : (product?.price ?? 0);
  const originalBasePrice = activePromo
    ? product?.price ?? 0
    : product?.modifiers?.originalPrice && product.modifiers.originalPrice > (product?.price ?? 0)
    ? product.modifiers.originalPrice
    : null;
  const discountAmount = originalBasePrice && originalBasePrice > baseProductPrice ? originalBasePrice - baseProductPrice : 0;

  const shotPriceComputed = useMemo(() => {
    if (!shouldShowEspressoCustomizer) return 0;
    const found = availableShots.find((s) => s.name === shot);
    return found ? found.price || 0 : 0;
  }, [shouldShowEspressoCustomizer, availableShots, shot]);

  const effectiveSizePrice = isFood ? 0 : sizePrice;

  const unitPrice = product?.modifiers?.isBundle
    ? baseProductPrice + bundleAdjustmentsTotal
    : baseProductPrice + effectiveSizePrice + addOnTotal + shotPriceComputed;

  const totalPrice = unitPrice * quantity;

  const toggleAddOn = (addOn: AddOn) => {
    setSelectedAddOns((prev) => {
      const exists = prev.find((a) => a.id === addOn.id);
      return exists ? prev.filter((a) => a.id !== addOn.id) : [...prev, addOn];
    });
  };

  const handleSelectOption = (groupId: string, option: any) => {
    const optProduct = allProducts?.find((p) => p.id === option.productId);
    const optIsFood = checkProductIsFood(optProduct, option.name);
    setBundleSelections((prev) => ({
      ...prev,
      [groupId]: {
        groupId,
        groupName: product?.modifiers?.bundleGroups?.find((g) => g.id === groupId)?.name || '',
        productId: option.productId,
        productName: option.name,
        priceAdjustment: option.priceAdjustment || 0,
        iceLevel:
          !optIsFood && optProduct?.modifiers?.iceLevel && optProduct.modifiers.iceLevel.length > 0
            ? optProduct.modifiers.iceLevel[0]
            : undefined,
        sugarLevel:
          !optIsFood && optProduct?.modifiers?.sugarLevel && optProduct.modifiers.sugarLevel.length > 0
            ? optProduct.modifiers.sugarLevel[0]
            : undefined,
      },
    }));
  };

  const handleOptionIceChange = (groupId: string, ice: IceLevel) => {
    setBundleSelections((prev) => {
      const current = prev[groupId];
      if (!current) return prev;
      return {
        ...prev,
        [groupId]: { ...current, iceLevel: ice },
      };
    });
  };

  const handleOptionSugarChange = (groupId: string, sugar: SugarLevel) => {
    setBundleSelections((prev) => {
      const current = prev[groupId];
      if (!current) return prev;
      return {
        ...prev,
        [groupId]: { ...current, sugarLevel: sugar },
      };
    });
  };

  const handleAddToCart = () => {
    if (!product) return;

    // Validate Cup Stock Availability (Drinks only)
    if (!product.modifiers?.isBundle && !hasTumbler && isBeverage) {
      if (packagingStock.cupRegular <= 0 && packagingStock.cupJumbo <= 0) {
        showToast('Stok gelas Regular & Jumbo sedang habis. Silakan aktifkan opsi Bawa Tumbler Sendiri.', 'error');
        return;
      }
      const isLarge = size.toLowerCase().includes('large') || size.toLowerCase().includes('jumbo');
      const isRegular = size.toLowerCase().includes('normal') || size.toLowerCase().includes('regular');

      if (isRegular && packagingStock.cupRegular <= 0) {
        showToast('Gelas ukuran Regular sedang habis. Silakan pilih ukuran Large atau gunakan tumbler.', 'error');
        return;
      }
      if (isLarge && packagingStock.cupJumbo <= 0) {
        showToast('Gelas ukuran Large sedang habis. Silakan pilih ukuran Regular atau gunakan tumbler.', 'error');
        return;
      }
    }

    const promo = getActivePromo(product);
    const effectiveBasePrice = promo ? promo.promoPrice : product.price;

    const itemData = {
      productId: product.id,
      name: product.name,
      image: product.image,
      basePrice: effectiveBasePrice,
      quantity,
      iceLevel: product.modifiers?.isBundle || isFood ? ('Normal Ice' as const) : iceLevel,
      sugarLevel: product.modifiers?.isBundle || isFood ? ('Normal Sugar' as const) : sugarLevel,
      size: product.modifiers?.isBundle || isFood ? 'Normal' : size,
      sizePrice: product.modifiers?.isBundle || isFood ? 0 : sizePrice,
      shot: shouldShowEspressoCustomizer ? shot : undefined,
      shotPrice: shouldShowEspressoCustomizer ? shotPriceComputed : 0,
      addOns: product.modifiers?.isBundle ? [] : selectedAddOns,
      isBundle: product.modifiers?.isBundle || false,
      bundleSelections: product.modifiers?.isBundle ? (bundleSelectionsArray as any[]) : undefined,
      matchaLevel: shouldShowMatchaCustomizer ? matchaLevel : undefined,
      hasTumbler: isBeverage && loyaltySettings?.showTumblerCustomizer !== false ? hasTumbler : false,
    };

    if (editCartItemId) {
      editItem(editCartItemId, itemData);
    } else {
      addItem(itemData);
    }

    onClose();
    resetState();
  };

  const hasIceOption =
    !isFood &&
    (product?.modifiers?.showSweetness !== false ||
      !!(product?.modifiers?.iceLevel && product.modifiers.iceLevel.length > 0));
  const hasAddOns = product?.modifiers?.addOns && product.modifiers.addOns.length > 0;
  const hasSizeOption = !isFood && availableSizes.length > 0;
  const isBundleProduct = product?.modifiers?.isBundle === true;

  const renderReviewsSection = () => (
    <div className="border-t border-amber-100 pt-5 mt-6 space-y-4 text-left">
      <h3 className="text-xs sm:text-sm font-bold text-stone-900 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-orange-600" />
        <span>Ulasan Pelanggan ({reviews.length})</span>
      </h3>

      {loadingReviews ? (
        <div className="flex justify-center py-4">
          <span className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-xs text-stone-400 text-center py-4 bg-amber-50/40 rounded-2xl border border-amber-100/60">
          Belum ada ulasan untuk menu ini.
        </p>
      ) : (
        <div className="space-y-3">
          {reviews.map((rev) => {
            const isLikedByMe =
              session?.user?.id && rev.likes?.some((l: any) => l.userId === session.user.id);
            return (
              <div
                key={rev.id}
                className="p-3.5 bg-amber-50/30 rounded-2xl border border-amber-100/80 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {rev.user?.image ? (
                      <div className="relative w-6 h-6 rounded-full overflow-hidden">
                        <Image
                          src={rev.user.image}
                          alt={rev.user.name || 'User'}
                          fill
                          sizes="24px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-800">
                        {(rev.user?.name?.[0] || 'U').toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-stone-900">
                        {rev.user?.name || 'Pelanggan Arum Seduh'}
                      </p>
                      <p className="text-[9px] text-stone-400">
                        {new Date(rev.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star
                        key={idx}
                        className={`w-3 h-3 ${
                          idx < rev.rating ? 'text-amber-500 fill-amber-500' : 'text-stone-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {rev.comment && (
                  <p className="text-xs text-stone-700 leading-relaxed pl-1">{rev.comment}</p>
                )}

                {/* Likes & Action Panel */}
                <div className="flex items-center gap-4 text-[10px] font-semibold text-stone-500 pt-1 pl-1">
                  <button
                    onClick={() => handleToggleLike(rev.id)}
                    className={`flex items-center gap-1.5 transition-colors hover:text-rose-600 cursor-pointer ${
                      isLikedByMe ? 'text-rose-600' : ''
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isLikedByMe ? 'fill-rose-600' : ''}`} />
                    <span>{rev.likes?.length || 0} Suka</span>
                  </button>
                </div>

                {/* Replies List */}
                {rev.replies && rev.replies.length > 0 && (
                  <div className="mt-2 pl-3.5 border-l-2 border-amber-200 space-y-2">
                    {rev.replies.map((rep: any) => (
                      <div key={rep.id} className="text-[11px] space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-stone-800">{rep.user?.name || 'User'}</span>
                          <span className="text-[8px] text-stone-400">
                            {new Date(rep.createdAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        </div>
                        <p className="text-stone-600 leading-normal">{rep.comment}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Reply Form */}
                <div className="mt-2 flex items-center gap-2 pl-1">
                  <input
                    type="text"
                    placeholder="Balas ulasan ini..."
                    value={replyComment[rev.id] || ''}
                    onChange={(e) =>
                      setReplyComment((prev) => ({ ...prev, [rev.id]: e.target.value }))
                    }
                    className="flex-1 px-3 py-1.5 text-[11px] rounded-xl border border-amber-200/80 bg-white focus:outline-none focus:border-orange-400"
                  />
                  <button
                    onClick={() => handlePostReply(rev.id)}
                    disabled={replyLoading[rev.id]}
                    className="p-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                  >
                    {replyLoading[rev.id] ? (
                      <span className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin block" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && product && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal (Desktop 2-Column Split / Android & Mobile Swipeable Bottom Sheet) */}
          <motion.div
            initial={
              isDesktop ? { opacity: 0, scale: 0.95, x: '-50%', y: '-46%' } : { y: '100%' }
            }
            animate={isDesktop ? { opacity: 1, scale: 1, x: '-50%', y: '-50%' } : { y: 0 }}
            exit={
              isDesktop ? { opacity: 0, scale: 0.95, x: '-50%', y: '-46%' } : { y: '100%' }
            }
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            drag={isDesktop ? false : 'y'}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            onDragEnd={(_, { offset }) => {
              if (!isDesktop && offset.y > 140) onClose();
            }}
            className={cn(
              'fixed z-[101] bg-[#FFFDF9] shadow-2xl flex flex-col overflow-hidden border border-amber-100',
              isDesktop
                ? 'top-1/2 left-1/2 w-[calc(100%-2.5rem)] max-w-3xl rounded-[2rem] max-h-[88vh]'
                : 'bottom-0 left-0 right-0 rounded-t-[2rem] max-h-[92dvh]'
            )}
          >
            {/* Drag handle (Mobile / Android only) */}
            {!isDesktop && (
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="flex justify-center pt-3 pb-1.5 shrink-0 bg-[#FFFDF9] z-20 touch-none cursor-grab active:cursor-grabbing"
              >
                <div className="w-11 h-1.5 rounded-full bg-amber-200" />
              </div>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-30 w-9 h-9 flex items-center justify-center rounded-full bg-black/45 backdrop-blur-md hover:bg-black/65 text-white transition-colors touch-target cursor-pointer shadow-sm"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Body Container: Split on Desktop, Single Scroll + Sticky Footer on Mobile */}
            <div className="flex-1 min-h-0 flex flex-col md:grid md:grid-cols-12 overflow-y-auto md:overflow-hidden">
              {/* Left Column on Desktop / Top Hero on Mobile */}
              <div className="md:col-span-5 md:border-r md:border-amber-100/80 md:bg-amber-50/25 md:overflow-y-auto scrollbar-hide flex flex-col shrink-0 md:shrink">
                {/* Product Image */}
                <div className="relative w-full aspect-[16/10] md:aspect-[4/3] bg-amber-50 shrink-0 overflow-hidden">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 400px"
                      className="object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-amber-300">
                      {isFood ? (
                        <UtensilsCrossed className="w-12 h-12" />
                      ) : (
                        <Coffee className="w-12 h-12" />
                      )}
                    </div>
                  )}

                  {/* Category Type Badge on Image */}
                  <span
                    className={cn(
                      'absolute bottom-3 left-4 z-10 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-sm flex items-center gap-1.5 border',
                      isBundleProduct
                        ? 'bg-orange-600/90 text-white border-orange-400/40'
                        : isFood
                        ? 'bg-amber-950/85 text-amber-100 border-amber-400/30'
                        : 'bg-white/95 text-orange-800 border-amber-200'
                    )}
                  >
                    {isBundleProduct ? (
                      <>
                        <ShoppingBag className="w-3 h-3" />
                        <span>Paket Combo</span>
                      </>
                    ) : isFood ? (
                      <>
                        <UtensilsCrossed className="w-3 h-3 text-amber-300" />
                        <span>Hidangan Makanan</span>
                      </>
                    ) : (
                      <>
                        <Coffee className="w-3 h-3 text-orange-600" />
                        <span>Minuman Segar</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Flash Sale / Promo Banner */}
                {activePromo && (
                  <div className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-orange-500 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-white fill-white shrink-0" />
                      <span className="text-white font-black text-[11px] uppercase tracking-wider">
                        Flash Sale
                      </span>
                      <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Hemat {formatRupiah(product.price - activePromo.promoPrice)}
                      </span>
                    </div>
                    <PromoCountdown endDate={activePromo.endDate} className="text-white" />
                  </div>
                )}

                {/* Desktop-only Title, Description, Transparent Price & Reviews in Left Column */}
                <div className="hidden md:block p-5 space-y-4 text-left">
                  <div>
                    <h2 className="font-serif font-bold text-xl text-stone-900 leading-snug">
                      {product.name}
                    </h2>
                    <p className="mt-1.5 text-xs text-stone-500 leading-relaxed">
                      {product.description}
                    </p>

                    <div className="mt-3 flex items-baseline gap-2 flex-wrap">
                      {originalBasePrice && originalBasePrice > baseProductPrice && (
                        <span className="text-xs text-stone-400 line-through font-medium">
                          {formatRupiah(originalBasePrice)}
                        </span>
                      )}
                      <span
                        className={cn(
                          'font-extrabold text-xl',
                          activePromo ? 'text-rose-600' : 'text-orange-600'
                        )}
                      >
                        {formatRupiah(baseProductPrice)}
                      </span>
                    </div>

                    {/* Transparent Discount Breakdown (Rule 8) */}
                    {discountAmount > 0 && originalBasePrice && (
                      <div className="mt-2 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200/70 text-[11px] font-bold text-rose-700 inline-block">
                        Potongan: {formatRupiah(originalBasePrice)} - {formatRupiah(discountAmount)} ={' '}
                        {formatRupiah(baseProductPrice)}
                      </div>
                    )}
                  </div>

                  {renderReviewsSection()}
                </div>
              </div>

              {/* Right Column on Desktop / Main Scrollable Area on Mobile */}
              <div className="md:col-span-7 flex-1 min-h-0 flex flex-col md:overflow-hidden">
                <div className="flex-1 md:overflow-y-auto px-5 pt-4 pb-6 space-y-5">
                  {/* Mobile-only Title, Description & Price */}
                  <div className="md:hidden text-left">
                    <h2 className="font-serif font-bold text-xl text-stone-900 leading-snug">
                      {product.name}
                    </h2>
                    <p className="mt-1 text-xs text-stone-500 leading-relaxed">
                      {product.description}
                    </p>
                    <div className="mt-2.5 flex items-baseline gap-2 flex-wrap">
                      {originalBasePrice && originalBasePrice > baseProductPrice && (
                        <span className="text-xs text-stone-400 line-through font-medium">
                          {formatRupiah(originalBasePrice)}
                        </span>
                      )}
                      <span
                        className={cn(
                          'font-extrabold text-xl',
                          activePromo ? 'text-rose-600' : 'text-orange-600'
                        )}
                      >
                        {formatRupiah(baseProductPrice)}
                      </span>
                    </div>

                    {/* Transparent Discount Breakdown (Rule 8) */}
                    {discountAmount > 0 && originalBasePrice && (
                      <div className="mt-2 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200/70 text-[11px] font-bold text-rose-700 inline-block">
                        Potongan: {formatRupiah(originalBasePrice)} - {formatRupiah(discountAmount)} ={' '}
                        {formatRupiah(baseProductPrice)}
                      </div>
                    )}
                  </div>

                  {isSoldOut ? (
                    <div className="bg-orange-50/50 border border-amber-200/80 rounded-2xl p-5 space-y-4">
                      <div className="text-center space-y-1.5">
                        <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-orange-100 text-orange-600 mb-1">
                          {isFood ? (
                            <UtensilsCrossed className="w-5 h-5" />
                          ) : (
                            <Coffee className="w-5 h-5" />
                          )}
                        </span>
                        <h3 className="font-serif font-bold text-base text-stone-900">
                          Stok Sedang Habis
                        </h3>
                        <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                          Dapatkan notifikasi WhatsApp segera setelah{' '}
                          <strong>{product.name}</strong> tersedia kembali di Arum Seduh!
                        </p>
                      </div>

                      {subSuccess ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center space-y-1.5">
                          <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-bold text-sm">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Berhasil Mendaftar!</span>
                          </div>
                          <p className="text-xs text-emerald-700">
                            Kami akan mengirimkan notifikasi ke nomor WhatsApp Anda saat menu ini
                            siap dipesan kembali.
                          </p>
                        </div>
                      ) : (
                        <form onSubmit={handleSubscribe} className="space-y-3 text-left">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                              Nomor WhatsApp
                            </label>
                            <input
                              type="tel"
                              placeholder="Contoh: 081234567890"
                              required
                              value={subPhone}
                              onChange={(e) => setSubPhone(e.target.value)}
                              className="w-full px-4 py-2.5 text-sm rounded-xl border border-amber-200 bg-white focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                              Email (Opsional)
                            </label>
                            <input
                              type="email"
                              placeholder="nama@email.com"
                              value={subEmail}
                              onChange={(e) => setSubEmail(e.target.value)}
                              className="w-full px-4 py-2.5 text-sm rounded-xl border border-amber-200 bg-white focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          {subError && (
                            <p className="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>{subError}</span>
                            </p>
                          )}

                          <button
                            type="submit"
                            disabled={subLoading}
                            className="w-full py-3.5 px-6 mt-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            {subLoading ? (
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              'Beritahu Saya'
                            )}
                          </button>
                        </form>
                      )}
                    </div>
                  ) : (
                    <>
                      {isBundleProduct && product.modifiers?.bundleGroups ? (
                        /* ── Combo / Bundle Customization Grid ── */
                        <div className="space-y-5">
                          {product.modifiers.bundleGroups.map((group) => {
                            const selected = bundleSelections[group.id];
                            return (
                              <div key={group.id} className="space-y-3 text-left">
                                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider flex justify-between items-center">
                                  <span>{group.name}</span>
                                  <span className="text-[10px] text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full font-extrabold">
                                    Wajib Pilih 1
                                  </span>
                                </h3>

                                {/* Options list */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  {group.options.map((option) => {
                                    const isSelected = selected?.productId === option.productId;
                                    const optProduct = allProducts?.find(
                                      (p) => p.id === option.productId
                                    );
                                    const optIsFood = checkProductIsFood(optProduct, option.name);

                                    return (
                                      <div key={option.productId} className="flex flex-col">
                                        <button
                                          type="button"
                                          onClick={() => handleSelectOption(group.id, option)}
                                          className={cn(
                                            'flex items-center gap-3 p-3 rounded-2xl border text-left transition-all cursor-pointer',
                                            isSelected
                                              ? 'border-orange-500 bg-orange-50/60 shadow-xs'
                                              : 'border-amber-100 bg-white hover:border-orange-300'
                                          )}
                                        >
                                          {optProduct?.image && (
                                            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-amber-50 shrink-0">
                                              <Image
                                                src={optProduct.image}
                                                alt={option.name}
                                                fill
                                                sizes="48px"
                                                className="object-cover"
                                              />
                                            </div>
                                          )}
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-stone-900 line-clamp-1">
                                              {option.name}
                                            </p>
                                            {option.priceAdjustment > 0 && (
                                              <p className="text-[10px] text-orange-700 font-bold mt-0.5">
                                                +{formatRupiah(option.priceAdjustment)}
                                              </p>
                                            )}
                                          </div>
                                          <div
                                            className={cn(
                                              'w-4 h-4 rounded-full border flex items-center justify-center shrink-0',
                                              isSelected
                                                ? 'bg-orange-500 border-orange-600'
                                                : 'border-stone-300 bg-white'
                                            )}
                                          >
                                            {isSelected && (
                                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                            )}
                                          </div>
                                        </button>

                                        {/* Inline options for selected drinks inside combo */}
                                        {isSelected && optProduct && !optIsFood && (
                                          <div className="mt-1.5 ml-2 p-2.5 rounded-xl bg-amber-50/40 border border-amber-200/60 space-y-2">
                                            {/* Ice Selector */}
                                            {optProduct.modifiers?.iceLevel &&
                                              optProduct.modifiers.iceLevel.length > 0 && (
                                                <div>
                                                  <p className="text-[9px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                                                    Pilihan Es:
                                                  </p>
                                                  <div className="flex gap-1 flex-wrap">
                                                    {optProduct.modifiers.iceLevel.map((ice) => (
                                                      <button
                                                        key={ice}
                                                        type="button"
                                                        onClick={() =>
                                                          handleOptionIceChange(
                                                            group.id,
                                                            ice as IceLevel
                                                          )
                                                        }
                                                        className={cn(
                                                          'px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer',
                                                          selected.iceLevel === ice
                                                            ? 'bg-orange-500 text-white border-orange-600 shadow-2xs'
                                                            : 'bg-white text-stone-600 border-amber-200 hover:border-orange-300'
                                                        )}
                                                      >
                                                        {ice}
                                                      </button>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}

                                            {/* Sugar Selector */}
                                            {optProduct.modifiers?.sugarLevel &&
                                              optProduct.modifiers.sugarLevel.length > 0 && (
                                                <div>
                                                  <p className="text-[9px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                                                    Level Gula:
                                                  </p>
                                                  <div className="flex gap-1 flex-wrap">
                                                    {optProduct.modifiers.sugarLevel.map((sugar) => (
                                                      <button
                                                        key={sugar}
                                                        type="button"
                                                        onClick={() =>
                                                          handleOptionSugarChange(
                                                            group.id,
                                                            sugar as SugarLevel
                                                          )
                                                        }
                                                        className={cn(
                                                          'px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer',
                                                          selected.sugarLevel === sugar
                                                            ? 'bg-orange-500 text-white border-orange-600 shadow-2xs'
                                                            : 'bg-white text-stone-600 border-amber-200 hover:border-orange-300'
                                                        )}
                                                      >
                                                        {sugar}
                                                      </button>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        /* ── Standard Customization (Food vs Beverage Aware) ── */
                        <div className="space-y-5">
                          {/* Food Serving Info Card (Shown when product is Makanan) */}
                          {isFood && (
                            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-left">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                                <UtensilsCrossed className="w-5 h-5" />
                              </div>
                              <div className="space-y-1">
                                <h4 className="text-xs font-extrabold text-stone-900">
                                  Penyajian Hidangan Makanan
                                </h4>
                                <p className="text-[11px] text-stone-600 leading-relaxed">
                                  Disajikan hangat di atas piring (Makan di Tempat) atau kemasan
                                  food-grade (Bawa Pulang) •{' '}
                                  <strong className="text-orange-700">Bebas Biaya Cup</strong>.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Matcha Preference Customizer (Khusus Produk Minuman Matcha) */}
                          {shouldShowMatchaCustomizer && (
                            <div className="space-y-3.5 bg-amber-50/50 p-4 rounded-3xl border border-amber-200/80 shadow-2xs relative overflow-hidden">
                              <div className="flex items-center gap-4">
                                <div className="relative w-18 h-18 flex items-center justify-center shrink-0">
                                  <MatchaCupVisualizer level={matchaLevel} />
                                </div>
                                <div className="flex-1 space-y-1 text-left">
                                  <h3 className="text-xs sm:text-sm font-black text-stone-900 leading-snug">
                                    Kamu suka kepekatan matcha seperti apa?
                                  </h3>
                                  <p className="text-[10px] text-stone-500 font-medium leading-relaxed">
                                    Pilih rasa matcha yang kuat atau lebih ringan & creamy (Gratis).
                                  </p>
                                  <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-orange-100/80 border border-orange-200 text-orange-800 text-[10px] font-black uppercase tracking-wider">
                                    {matchaLevel <= 3 && (
                                      <>
                                        <Leaf className="w-3 h-3" />
                                        <span>Ringan & Creamy</span>
                                      </>
                                    )}
                                    {matchaLevel >= 4 && matchaLevel <= 6 && (
                                      <>
                                        <Scale className="w-3 h-3" />
                                        <span>Classic Balance</span>
                                      </>
                                    )}
                                    {matchaLevel >= 7 && matchaLevel <= 8 && (
                                      <>
                                        <Coffee className="w-3 h-3" />
                                        <span>Bold Matcha</span>
                                      </>
                                    )}
                                    {matchaLevel >= 9 && (
                                      <>
                                        <Award className="w-3 h-3" />
                                        <span>Pekat & Intens</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* 4 Pilihan Cepat / Preset Button */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                                {[
                                  { level: 2, label: 'Ringan & Creamy', Icon: Leaf },
                                  { level: 5, label: 'Classic Balance', Icon: Scale },
                                  { level: 7, label: 'Bold Matcha', Icon: Coffee },
                                  { level: 10, label: 'Pekat & Intens', Icon: Award },
                                ].map((opt) => {
                                  const PresetIcon = opt.Icon;
                                  const isSelected =
                                    (opt.level === 2 && matchaLevel <= 3) ||
                                    (opt.level === 5 && matchaLevel >= 4 && matchaLevel <= 6) ||
                                    (opt.level === 7 && matchaLevel >= 7 && matchaLevel <= 8) ||
                                    (opt.level === 10 && matchaLevel >= 9);
                                  return (
                                    <button
                                      key={opt.label}
                                      type="button"
                                      onClick={() => setMatchaLevel(opt.level)}
                                      className={cn(
                                        'p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer',
                                        isSelected
                                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-500 shadow-xs'
                                          : 'bg-white text-stone-700 border-amber-200/80 hover:border-orange-300'
                                      )}
                                    >
                                      <div className="flex items-center justify-between w-full">
                                        <PresetIcon className="w-3.5 h-3.5" />
                                        <span className="text-[9px] opacity-85 font-bold">
                                          +Rp 0
                                        </span>
                                      </div>
                                      <p className="text-[10px] font-bold mt-1.5 line-clamp-1 leading-tight">
                                        {opt.label}
                                      </p>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Range Slider Interaktif */}
                              <div className="pt-2 px-1 relative">
                                <input
                                  type="range"
                                  min="1"
                                  max="10"
                                  value={matchaLevel}
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onChange={(e) => setMatchaLevel(parseInt(e.target.value))}
                                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gradient-to-r from-amber-100 via-amber-400 to-orange-600 focus:outline-none"
                                  style={{
                                    WebkitAppearance: 'none',
                                  }}
                                />
                                <div className="flex justify-between text-[8px] font-black text-stone-400 uppercase tracking-widest mt-1.5 px-0.5 select-none">
                                  <span>Mild</span>
                                  <span>Medium</span>
                                  <span>Strong</span>
                                  <span>Intense</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Opsi Espresso Shot (Hanya tampil jika showEspressoShot aktif di produk minuman) */}
                          {shouldShowEspressoCustomizer && (
                            <div className="space-y-2.5 bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80 text-left">
                              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                  <Coffee className="w-3.5 h-3.5 text-orange-600" />
                                  <span>Pilihan Espresso Shot</span>
                                </span>
                                <span className="text-[10px] text-orange-700 font-extrabold">
                                  {shot}{' '}
                                  {shotPriceComputed > 0 ? `(+${formatRupiah(shotPriceComputed)})` : ''}
                                </span>
                              </h3>
                              <div className="grid grid-cols-3 gap-2">
                                {availableShots.map((sh) => {
                                  const isSelected = shot === sh.name;
                                  return (
                                    <button
                                      key={sh.name}
                                      type="button"
                                      onClick={() => {
                                        setShot(sh.name);
                                        setShotPrice(sh.price);
                                      }}
                                      className={cn(
                                        'p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer',
                                        isSelected
                                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-500 shadow-xs'
                                          : 'bg-white text-stone-700 border-amber-200/80 hover:border-orange-300'
                                      )}
                                    >
                                      <p className="text-xs font-bold truncate">{sh.name}</p>
                                      <p
                                        className={cn(
                                          'text-[10px] mt-0.5 font-semibold',
                                          isSelected ? 'text-amber-100' : 'text-stone-400'
                                        )}
                                      >
                                        {sh.price > 0 ? `+${formatRupiah(sh.price)}` : 'Standar'}
                                      </p>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Ukuran Gelas (Cup Size — Minuman saja) */}
                          {hasSizeOption && (
                            <div className="text-left">
                              <div className="flex items-center justify-between mb-2.5 flex-wrap gap-1">
                                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                                  <CupSoda className="w-3.5 h-3.5 text-orange-500" />
                                  <span>Ukuran Gelas (Cup Size)</span>
                                </h3>
                                {packagingStock.cupJumbo <= 0 && (
                                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                    Cup Jumbo Habis
                                  </span>
                                )}
                                {packagingStock.cupRegular <= 0 && (
                                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                    Cup Regular Habis
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-2.5">
                                {availableSizes.map((sz: any) => {
                                  const isLarge =
                                    sz.name.toLowerCase().includes('large') ||
                                    sz.name.toLowerCase().includes('jumbo');
                                  const isRegular =
                                    sz.name.toLowerCase().includes('normal') ||
                                    sz.name.toLowerCase().includes('regular');
                                  const isOutOfStock =
                                    (isLarge && packagingStock.cupJumbo <= 0) ||
                                    (isRegular && packagingStock.cupRegular <= 0);
                                  const isSelected = size === sz.name;

                                  return (
                                    <button
                                      key={sz.name}
                                      type="button"
                                      disabled={isOutOfStock && !hasTumbler}
                                      onClick={() => {
                                        setSize(sz.name);
                                        setSizePrice(sz.price);
                                      }}
                                      className={cn(
                                        'px-4 py-3 rounded-2xl text-xs font-bold transition-all touch-target border cursor-pointer flex items-center justify-between',
                                        isOutOfStock && !hasTumbler
                                          ? 'bg-stone-100 text-stone-400 border-stone-200 opacity-60 cursor-not-allowed line-through'
                                          : isSelected
                                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-500 shadow-xs'
                                          : 'bg-white text-stone-800 border-amber-200/80 hover:border-orange-300'
                                      )}
                                    >
                                      <span>
                                        {sz.name}
                                        {isOutOfStock && !hasTumbler ? ' (Habis)' : ''}
                                      </span>
                                      <span
                                        className={cn(
                                          'text-[11px] font-extrabold',
                                          isSelected ? 'text-white' : 'text-orange-600'
                                        )}
                                      >
                                        {sz.price > 0 ? `+${formatRupiah(sz.price)}` : 'Standar'}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Ice Level (Minuman saja) */}
                          {hasIceOption && (
                            <div className="text-left">
                              <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2.5">
                                Pilihan Es (Ice Level)
                              </h3>
                              <div className="grid grid-cols-3 gap-2">
                                {ICE_LEVELS.map((level) => {
                                  const isSelected = iceLevel === level;
                                  return (
                                    <button
                                      key={level}
                                      type="button"
                                      onClick={() => setIceLevel(level)}
                                      className={cn(
                                        'px-3 py-2.5 rounded-2xl text-xs font-bold transition-all touch-target border cursor-pointer text-center',
                                        isSelected
                                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-500 shadow-xs'
                                          : 'bg-white text-stone-700 border-amber-200/80 hover:border-orange-300'
                                      )}
                                    >
                                      {level}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Sugar Level Slider (Minuman saja) */}
                          {shouldShowSweetnessCustomizer && (
                            <div className="space-y-3 bg-amber-50/50 p-4 rounded-3xl border border-amber-200/80 relative overflow-hidden">
                              <div className="flex items-center gap-4">
                                <div className="relative w-18 h-18 flex items-center justify-center shrink-0">
                                  <SweetnessCupVisualizer level={currentSweetnessIndex} />
                                </div>
                                <div className="flex-1 space-y-1 w-full text-left">
                                  <h3 className="text-xs sm:text-sm font-black text-stone-900 flex items-center gap-1.5">
                                    <Droplets className="w-4 h-4 text-amber-500" />
                                    <span>Tingkat Kemanisan</span>
                                  </h3>
                                  <p className="text-[10px] text-stone-500 font-medium leading-normal">
                                    Tentukan takaran gula sesuai seleramu.
                                  </p>
                                  <div className="mt-1 flex items-baseline justify-start gap-1.5">
                                    <span className="text-base font-black text-orange-600 leading-none">
                                      {SWEETNESS_VALUES[currentSweetnessIndex]}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Quick Preset Sweetness Pills */}
                              <div className="grid grid-cols-4 gap-1.5 pt-1">
                                {SWEETNESS_VALUES.map((val, idx) => {
                                  const isSelected = currentSweetnessIndex === idx;
                                  return (
                                    <button
                                      key={val}
                                      type="button"
                                      onClick={() => handleSweetnessSliderChange(idx)}
                                      className={cn(
                                        'py-2 px-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer text-center truncate',
                                        isSelected
                                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-500 shadow-2xs'
                                          : 'bg-white text-stone-600 border-amber-200/80 hover:border-orange-300'
                                      )}
                                    >
                                      {val}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Sweetness Slider */}
                              <div className="pt-1 px-1 relative">
                                <input
                                  type="range"
                                  min="0"
                                  max="3"
                                  value={currentSweetnessIndex}
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onChange={(e) =>
                                    handleSweetnessSliderChange(parseInt(e.target.value))
                                  }
                                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gradient-to-r from-amber-100 via-amber-300 to-orange-500 focus:outline-none"
                                  style={{
                                    WebkitAppearance: 'none',
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Add-Ons / Extra Toppings */}
                          {hasAddOns && (
                            <div className="text-left">
                              <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2.5">
                                Tambahan Topping (Add-Ons)
                              </h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {(product.modifiers?.addOns ?? ADD_ONS).map((addOn) => {
                                  const isSelected = selectedAddOns.some(
                                    (a) => a.id === addOn.id
                                  );
                                  return (
                                    <button
                                      key={addOn.id}
                                      type="button"
                                      onClick={() => toggleAddOn(addOn)}
                                      className={cn(
                                        'w-full flex items-center justify-between px-3.5 py-3 rounded-2xl border transition-all touch-target cursor-pointer',
                                        isSelected
                                          ? 'border-orange-500 bg-orange-50/70 shadow-2xs'
                                          : 'border-amber-200/80 bg-white hover:border-orange-300'
                                      )}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div
                                          className={cn(
                                            'w-5 h-5 rounded-lg flex items-center justify-center transition-colors border shrink-0',
                                            isSelected
                                              ? 'bg-gradient-to-r from-orange-500 to-amber-500 border-orange-500'
                                              : 'bg-white border-stone-300'
                                          )}
                                        >
                                          {isSelected && (
                                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                          )}
                                        </div>
                                        <span className="text-xs font-bold text-stone-800 truncate">
                                          {addOn.name}
                                        </span>
                                      </div>
                                      <span className="text-xs text-orange-600 font-extrabold shrink-0 ml-2">
                                        +{formatRupiah(addOn.price)}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Opsi Tumbler Sendiri (Minuman saja) */}
                          {isBeverage && loyaltySettings?.showTumblerCustomizer !== false && (
                            <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 flex items-center justify-between gap-4 text-left">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-orange-100/80 text-orange-600 flex items-center justify-center shrink-0">
                                  <Leaf className="w-4.5 h-4.5" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                                    <span>Bawa Tumbler Sendiri</span>
                                    <span
                                      className="cursor-pointer text-stone-400 hover:text-orange-600 transition-colors inline-flex items-center"
                                      title="Dapatkan bonus poin & bantu kurangi sampah plastik!"
                                    >
                                      <Info className="w-3.5 h-3.5" />
                                    </span>
                                  </h4>
                                  <p className="text-[10px] text-stone-500 font-semibold leading-snug">
                                    Bantu kurangi kemasan gelas sekali pakai
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setHasTumbler(!hasTumbler)}
                                className="focus:outline-none shrink-0 cursor-pointer"
                                aria-label="Toggle Bawa Tumbler Sendiri"
                              >
                                <div
                                  className={cn(
                                    'w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5',
                                    hasTumbler ? 'bg-orange-500' : 'bg-stone-200'
                                  )}
                                >
                                  <motion.div
                                    layout
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    className="w-5 h-5 rounded-full bg-white shadow-xs"
                                    animate={{ x: hasTumbler ? 20 : 0 }}
                                  />
                                </div>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Mobile-only Reviews Section (Desktop renders reviews in left column) */}
                      <div className="md:hidden">{renderReviewsSection()}</div>
                    </>
                  )}
                </div>

                {/* Sticky Bottom Footer: Quantity + Add to Cart CTA */}
                {!isSoldOut && (
                  <div className="sticky bottom-0 md:static shrink-0 border-t border-amber-200/70 bg-white/95 backdrop-blur-md px-5 py-3.5 pb-safe z-20">
                    <div className="flex items-center gap-3.5">
                      {/* Quantity controls */}
                      <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200/80 rounded-2xl p-1">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          type="button"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white shadow-2xs text-stone-800 touch-target hover:bg-orange-50 transition-colors cursor-pointer"
                          aria-label="Kurangi jumlah"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </motion.button>
                        <span className="w-7 text-center font-extrabold text-sm text-stone-900">
                          {quantity}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          type="button"
                          onClick={() => setQuantity(quantity + 1)}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white shadow-2xs text-stone-800 touch-target hover:bg-orange-50 transition-colors cursor-pointer"
                          aria-label="Tambah jumlah"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>

                      {/* Add/Save to Cart */}
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={handleAddToCart}
                        className="flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/25 active:shadow-md transition-all flex items-center justify-between cursor-pointer"
                      >
                        <span>{editCartItemId ? 'Simpan Perubahan' : 'Tambah Pesanan'}</span>
                        <span className="font-black">{formatRupiah(totalPrice)}</span>
                      </motion.button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Premium Matcha Cup Visualizer Component ──
function MatchaCupVisualizer({ level }: { level: number }) {
  const h = 95 + (level - 1) * (45 / 9);
  const s = 45 + (level - 1) * (20 / 9);
  const l = 85 - (level - 1) * (73 / 9);

  const liquidColor = `hsl(${h}, ${s}%, ${l}%)`;

  const steamCount = Math.min(6, Math.floor(level / 1.5) + 1);
  const bubbleCount = Math.min(10, level);

  return (
    <div className="relative w-20 h-20 flex items-center justify-center select-none pointer-events-none">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes steam-rise {
          0% { transform: translateY(5px) scale(0.8); opacity: 0; }
          50% { opacity: 0.55; }
          100% { transform: translateY(-40px) scale(1.2); opacity: 0; }
        }
        @keyframes bubble-float {
          0% { transform: translateY(0) scale(0.6); opacity: 0.2; }
          80% { opacity: 0.7; }
          100% { transform: translateY(-25px) scale(1); opacity: 0; }
        }
        @keyframes cup-shake {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(${Math.min(3, level / 3)}deg); }
        }
      `,
        }}
      />

      {/* Steam rising */}
      <div className="absolute top-1 w-full flex justify-center gap-1.5 z-10 pointer-events-none">
        {Array.from({ length: steamCount }).map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-5 rounded-full bg-white/25 blur-[1.5px]"
            style={{
              animationName: 'steam-rise',
              animationDuration: `${1.5 + (i % 3) * 0.3}s`,
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>

      {/* The Cup SVG */}
      <svg
        width="72"
        height="72"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          animationName: level > 7 ? 'cup-shake' : 'none',
          animationDuration: '0.3s',
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
        }}
        className="relative z-20 drop-shadow-[0_4px_12px_rgba(212,165,116,0.18)]"
      >
        <path
          d="M72 40 C84 40, 84 64, 72 64"
          stroke="#D4A574"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M20 28 L28 76 C29 82, 35 86, 42 86 H58 C65 86, 71 82, 72 76 L80 28 Z"
          fill="rgba(255, 255, 255, 0.45)"
          stroke="#E5E2DD"
          strokeWidth="3.5"
        />
        <path
          d="M23 48 L28 76 C29 80, 34 83, 40 83 H60 C66 83, 71 80, 72 76 L77 48 Z"
          fill={liquidColor}
          className="transition-colors duration-500 ease-out"
        />
        <ellipse
          cx="50"
          cy="48"
          rx="27"
          ry="5.5"
          fill={liquidColor}
          className="transition-colors duration-500 ease-out"
        />
        <path
          d="M26 34 L32 70"
          stroke="rgba(255, 255, 255, 0.7)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>

      {/* Floating Bubbles */}
      <div className="absolute bottom-5 w-12 h-8 z-30 pointer-events-none">
        {Array.from({ length: bubbleCount }).map((_, i) => {
          const left = 20 + ((i * 17) % 60);
          const delay = (i * 0.3) % 2;
          const duration = 1 + ((i * 0.2) % 1.5);
          return (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full border border-white/20"
              style={{
                left: `${left}%`,
                bottom: '0px',
                backgroundColor: `hsla(${h}, ${s}%, ${l}%, 0.45)`,
                animationName: 'bubble-float',
                animationDuration: `${duration}s`,
                animationTimingFunction: 'ease-in',
                animationIterationCount: 'infinite',
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Sweetness Cup Visualizer Component ──
function SweetnessCupVisualizer({ level }: { level: number }) {
  const h = 38;
  const s = 70 + level * 8;
  const l = 90 - level * 12;
  const liquidColor = `hsl(${h}, ${s}%, ${l}%)`;

  const steamCount = Math.min(6, level + 1);
  const bubbleCount = Math.min(10, Math.floor((level + 1) * 2.5));

  return (
    <div className="relative w-20 h-20 flex items-center justify-center select-none pointer-events-none">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes sugar-steam-rise {
          0% { transform: translateY(5px) scale(0.8); opacity: 0; }
          50% { opacity: 0.55; }
          100% { transform: translateY(-40px) scale(1.2); opacity: 0; }
        }
        @keyframes sugar-bubble-float {
          0% { transform: translateY(0) scale(0.6); opacity: 0.2; }
          80% { opacity: 0.7; }
          100% { transform: translateY(-25px) scale(1); opacity: 0; }
        }
        @keyframes sugar-cup-shake {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(${Math.min(3, level * 1)}deg); }
        }
      `,
        }}
      />

      {/* Steam rising */}
      <div className="absolute top-1 w-full flex justify-center gap-1.5 z-10 pointer-events-none">
        {Array.from({ length: steamCount }).map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-5 rounded-full bg-white/25 blur-[1.5px]"
            style={{
              animationName: 'sugar-steam-rise',
              animationDuration: `${1.5 + (i % 3) * 0.3}s`,
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>

      {/* The Cup SVG */}
      <svg
        width="72"
        height="72"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          animationName: level > 2 ? 'sugar-cup-shake' : 'none',
          animationDuration: '0.3s',
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
        }}
        className="relative z-20 drop-shadow-[0_4px_12px_rgba(245,158,11,0.18)]"
      >
        <path
          d="M72 40 C84 40, 84 64, 72 64"
          stroke="#F59E0B"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M20 28 L28 76 C29 82, 35 86, 42 86 H58 C65 86, 71 82, 72 76 L80 28 Z"
          fill="rgba(255, 255, 255, 0.45)"
          stroke="#E5E2DD"
          strokeWidth="3.5"
        />
        <path
          d="M23 48 L28 76 C29 80, 34 83, 40 83 H60 C66 83, 71 80, 72 76 L77 48 Z"
          fill={liquidColor}
          className="transition-colors duration-500 ease-out"
        />
        <ellipse
          cx="50"
          cy="48"
          rx="27"
          ry="5.5"
          fill={liquidColor}
          className="transition-colors duration-500 ease-out"
        />
        <path
          d="M26 34 L32 70"
          stroke="rgba(255, 255, 255, 0.7)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>

      {/* Floating Bubbles */}
      <div className="absolute bottom-5 w-12 h-8 z-30 pointer-events-none">
        {Array.from({ length: bubbleCount }).map((_, i) => {
          const left = 20 + ((i * 17) % 60);
          const delay = (i * 0.3) % 2;
          const duration = 1 + ((i * 0.2) % 1.5);
          return (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full border border-white/20"
              style={{
                left: `${left}%`,
                bottom: '0px',
                backgroundColor: `hsla(${h}, ${s}%, ${l}%, 0.45)`,
                animationName: 'sugar-bubble-float',
                animationDuration: `${duration}s`,
                animationTimingFunction: 'ease-in',
                animationIterationCount: 'infinite',
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
