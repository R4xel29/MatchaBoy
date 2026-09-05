'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, Trash2, Plus, Minus, User, MapPin, 
  CreditCard, Banknote, CheckCircle, Loader2, ArrowRight, X, UtensilsCrossed, Lock, 
  ExternalLink, Download, MessageCircle, AlertCircle, ChefHat, Check, Grid, Sparkles,
  Flame, Clock, AlertTriangle, DoorOpen, Tv, Archive, Coffee, Flower2, Columns, Accessibility, Compass, Map,
  Tag, Ticket
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useCartStore } from '@/stores/cart-store';
import { ProductModal } from '@/components/storefront/ProductModal';
import { PromoCountdown } from '@/components/storefront/PromoCountdown';
import { formatRupiah, getActivePromo, getEffectiveProductDisplay } from '@/lib/utils';
import { isFoodItem } from '@/lib/receipt-modifiers';
import type { Product, Category } from '@/types';
import { 
  FloorElementVisual,
  type FloorElementData 
} from '@/app/(admin)/admin/tables/AdminTablesClient';
import { checkStoreOperationalStatus, type StoreOperationalStatus } from '@/lib/store-hours';

interface SpmbClientProps {
  categories: Category[];
  products: Product[];
  botNumber?: string;
  openTime?: string;
  closeTime?: string;
  spmbStartTime?: string;
  spmbEndTime?: string;
  spmbCloseTime?: string;
  operationalDays?: string;
  disabledDates?: string;
  customHours?: string;
  initialTables?: Array<{ id: string; number: string; capacity?: number; shape?: string; x?: number; y?: number; rotation?: number; status?: string; chairsJson?: string | null }>;
  initialFloorElements?: FloorElementData[];
  packagingStock?: { cupRegular: number; cupJumbo: number };
}

export default function SpmbClient({ 
  categories, 
  products, 
  botNumber,
  openTime,
  closeTime,
  spmbStartTime,
  spmbEndTime,
  spmbCloseTime,
  operationalDays,
  disabledDates,
  customHours,
  initialTables,
  initialFloorElements,
  packagingStock
}: SpmbClientProps) {
  const searchParams = useSearchParams();
  const tableParam = searchParams.get('table');

  // Service Mode: DINE_IN (Makan di Tempat) vs PICKUP (Ambil Sendiri di Toko)
  const [serviceMode, setServiceMode] = useState<'DINE_IN' | 'PICKUP'>('DINE_IN');
  const [pickupTimeOption, setPickupTimeOption] = useState<string>('ASAP'); // 'ASAP', '30_MIN', '45_MIN', 'CUSTOM'
  const [customPickupTime, setCustomPickupTime] = useState<string>('15:00');

  // Table State
  const [tableNumber, setTableNumber] = useState<string>('');
  const [isTableLocked, setIsTableLocked] = useState<boolean>(false);
  const [activeTables, setActiveTables] = useState<Array<{ id: string; number: string; capacity?: number; shape?: string; x?: number; y?: number; rotation?: number; status?: string; chairsJson?: string | null }>>(initialTables || []);
  const [floorElements, setFloorElements] = useState<FloorElementData[]>(initialFloorElements || []);
  const [loadingTables, setLoadingTables] = useState<boolean>(false);

  // Modals
  const [showTableModal, setShowTableModal] = useState<boolean>(false);

  // Cart State
  const cartItems = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice());
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);

  // UI State
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Store Operational Hours Status
  const [isMounted, setIsMounted] = useState(false);
  const [storeStatus, setStoreStatus] = useState<StoreOperationalStatus | null>(null);

  useEffect(() => {
    setIsMounted(true);
    const evaluateStatus = () => {
      setStoreStatus(
        checkStoreOperationalStatus(
          {
            openTime,
            closeTime,
            spmbStartTime,
            spmbEndTime,
            spmbCloseTime,
            operationalDays,
            disabledDates,
            customHours
          },
          { isSpmb: true }
        )
      );
    };

    evaluateStatus();
    const timer = setInterval(evaluateStatus, 30000);
    return () => clearInterval(timer);
  }, [openTime, closeTime, spmbStartTime, spmbEndTime, spmbCloseTime, operationalDays, disabledDates, customHours]);

  // Form State - Clean 2 payment methods, no phone required for SPMB
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'QRIS' | 'COD'>('QRIS');
  
  // Voucher & Promo State
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountAmount: number;
    description: string;
    type?: string;
  } | null>(null);

  const promoDiscount = appliedPromo?.discountAmount || 0;
  const finalPayable = Math.max(0, totalPrice - promoDiscount);

  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    try {
      const itemsPayload = cartItems.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        size: item.size || 'Normal',
        sizePrice: (item as any).sizePrice || 0,
        addOnIds: item.addOns ? item.addOns.map((a: any) => a.id) : [],
        price: (item as any).price || item.basePrice,
      }));

      const res = await fetch('/api/checkout/validate-voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCodeInput.trim(),
          subtotal: totalPrice,
          items: itemsPayload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kode promo tidak valid');
      setAppliedPromo({
        code: data.voucher.code,
        discountAmount: data.voucher.discountAmount,
        description: data.voucher.description,
        type: data.voucher.type,
      });
    } catch (err: any) {
      setPromoError(err.message || 'Gagal menerapkan promo');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCodeInput('');
    setPromoError('');
  };

  // Auto-revalidate applied promo if cart items change (e.g. B2G1 quantity drops below 3)
  useEffect(() => {
    if (!appliedPromo) return;
    if (cartItems.length === 0) {
      setAppliedPromo(null);
      return;
    }

    let active = true;
    const revalidate = async () => {
      try {
        const itemsPayload = cartItems.map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          size: item.size || 'Normal',
          sizePrice: (item as any).sizePrice || 0,
          addOnIds: item.addOns ? item.addOns.map((a: any) => a.id) : [],
          price: (item as any).price || item.basePrice,
        }));

        const res = await fetch('/api/checkout/validate-voucher', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: appliedPromo.code,
            subtotal: totalPrice,
            items: itemsPayload,
          }),
        });
        const data = await res.json();
        if (!active) return;
        if (res.ok && data.voucher) {
          setAppliedPromo({
            code: data.voucher.code,
            discountAmount: data.voucher.discountAmount,
            description: data.voucher.description,
            type: data.voucher.type,
          });
        } else {
          setAppliedPromo(null);
          setPromoError(data.error || 'Promo dilepas karena keranjang tidak memenuhi syarat.');
        }
      } catch {
        // silent
      }
    };

    const timer = setTimeout(revalidate, 400);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [cartItems, totalPrice]);


  // Checkout Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Realtime Active Order Tracking
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeOrderStatus, setActiveOrderStatus] = useState<any>(null);

  // QRIS Payment Modal
  const [showQrisModal, setShowQrisModal] = useState(false);
  const [qrisQrContent, setQrisQrContent] = useState('');
  const [qrisOrderId, setQrisOrderId] = useState('');
  const [qrisTotal, setQrisTotal] = useState(0);
  const [qrisPaymentPaid, setQrisPaymentPaid] = useState(false);

  // 1. Initialize table parameter or fetch active tables
  useEffect(() => {
    if (tableParam) {
      const clean = tableParam.trim();
      setTableNumber(clean);
      setIsTableLocked(true);
      setServiceMode('DINE_IN');
    }
  }, [tableParam]);

  useEffect(() => {
    setLoadingTables(true);
    fetch('/api/tables/active')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setActiveTables(data);
          if (tableParam) {
            const clean = tableParam.trim();
            setTableNumber(clean);
            setIsTableLocked(true);
          } else if (data.length > 0 && !tableNumber) {
            setTableNumber(data[0].number.toString());
          }
        }
      })
      .catch((err) => console.error('Error fetching active tables:', err))
      .finally(() => setLoadingTables(false));
  }, [tableParam]);

  const currentTableObj = useMemo(() => {
    return activeTables.find(t => t.number.toString() === tableNumber.toString()) || null;
  }, [activeTables, tableNumber]);

  const currentTableCapacity = currentTableObj?.capacity || 4;

  // 2. Read saved active order ID from local storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem('spmb_active_order_id');
      if (savedId) {
        setActiveOrderId(savedId);
      }
    }
  }, []);

  // 3. Realtime Order Status Polling
  useEffect(() => {
    if (!activeOrderId) {
      setActiveOrderStatus(null);
      return;
    }

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/orders/${activeOrderId}/status`);
        if (res.ok) {
          const data = await res.json();
          setActiveOrderStatus(data);
        }
      } catch (err) {
        console.error('Error polling order status:', err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [activeOrderId]);

  // 4. Poll payment status for QRIS Modal
  useEffect(() => {
    if (!showQrisModal || !qrisOrderId || qrisPaymentPaid) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${qrisOrderId}/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.status !== 'PENDING_PAYMENT' && data.status !== 'CANCELLED') {
            setQrisPaymentPaid(true);
            clearInterval(interval);
            setTimeout(() => {
              window.location.href = `/orders/${qrisOrderId}`;
            }, 2000);
          }
        }
      } catch (err) {
        console.error('Error polling QRIS payment status:', err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [showQrisModal, qrisOrderId, qrisPaymentPaid]);

  const isOrderOver20Min = useMemo(() => {
    if (!activeOrderStatus?.createdAt) return false;
    const created = new Date(activeOrderStatus.createdAt).getTime();
    const now = Date.now();
    const diffMinutes = (now - created) / (1000 * 60);
    return diffMinutes >= 20 && !['READY', 'COMPLETED', 'CANCELLED'].includes(activeOrderStatus.status);
  }, [activeOrderStatus]);

  const filteredProducts = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'all') return products;
    const targetCat = categories.find(c => c.id === selectedCategory || c.slug === selectedCategory);
    return products.filter((p: any) => {
      return (
        p.category === selectedCategory ||
        p.categorySlug === selectedCategory ||
        (targetCat && (p.category === targetCat.id || p.categorySlug === targetCat.slug))
      );
    });
  }, [products, selectedCategory, categories]);

  const handleProductClick = (product: Product) => {
    if (product.badge === 'sold-out') return;
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  const validateForm = () => {
    if (!tableNumber || !tableNumber.trim()) {
      setErrorMsg('Nomor meja wajib dipilih.');
      return false;
    }
    if (!name || name.trim().length < 2) {
      setErrorMsg('Nama pemesan minimal 2 karakter.');
      return false;
    }
    setErrorMsg('');
    return true;
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (storeStatus && !storeStatus.isOpen) {
      setErrorMsg(storeStatus.message || 'Kedai Arum Seduh saat ini sedang tutup.');
      return;
    }
    if (!validateForm()) return;
    if (cartItems.length === 0) {
      setErrorMsg('Keranjang belanja Anda masih kosong.');
      return;
    }
    executeCheckout();
  };

  const handleDownloadQris = () => {
    try {
      const canvas = document.getElementById('spmb-qris-canvas') as HTMLCanvasElement;
      if (!canvas) return;
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `QRIS_ArumSeduh_Meja${tableNumber}_${qrisOrderId.slice(0, 8)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download QRIS:', err);
    }
  };

  const executeCheckout = async () => {
    setShowConfirmModal(false);
    if (storeStatus && !storeStatus.isOpen) {
      setErrorMsg(storeStatus.message || 'Kedai Arum Seduh saat ini sedang tutup.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const itemsPayload = cartItems.map((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const category = categories?.find((c: any) => c.id === (prod as any)?.categoryId || c.slug === (prod as any)?.category?.slug);
        const isFood = isFoodItem(prod?.name || item.name) || (
          (prod?.modifiers as any)?.productType === 'makanan' ||
          category?.slug === 'makanan' ||
          category?.slug === 'snack' ||
          category?.slug === 'food' ||
          category?.name?.toLowerCase().includes('makan')
        );

        const parts: string[] = [];
        if (!isFood && item.matchaLevel !== undefined && item.matchaLevel !== null && prod?.modifiers?.showMatcha === true) {
          parts.push(`Matcha Lvl: ${item.matchaLevel}`);
        }
        if (!isFood && (item as any).shot && (prod?.modifiers?.showEspressoShot === true || (prod?.modifiers?.espressoShots && prod.modifiers.espressoShots.length > 0))) {
          parts.push(`${(item as any).shot}`);
        }
        if (!isFood && item.size && item.size !== 'Normal' && item.size !== 'Regular') {
          parts.push(`Size: ${item.size}`);
        }
        if (!isFood) {
          if (item.iceLevel && item.sugarLevel) {
            parts.push(`${item.iceLevel} → ${item.sugarLevel}`);
          } else if (item.iceLevel) {
            parts.push(item.iceLevel);
          } else if (item.sugarLevel) {
            parts.push(item.sugarLevel);
          }
        }
        if (item.addOns && item.addOns.length > 0) {
          parts.push('+' + item.addOns.map((a: any) => a.name).join(', +'));
        }

        const activePromo = getActivePromo(prod);
        if (activePromo && prod && activePromo.promoPrice < prod.price) {
          const pot = prod.price - activePromo.promoPrice;
          parts.push(`Potongan: ${formatRupiah(prod.price)} - ${formatRupiah(pot)} = ${formatRupiah(activePromo.promoPrice)}`);
        }

        return {
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          size: isFood ? undefined : (item.size || 'Normal'),
          sizePrice: (item as any).sizePrice || 0,
          shot: isFood ? undefined : ((item as any).shot || undefined),
          addOnIds: item.addOns ? item.addOns.map((a: any) => a.id) : [],
          modsString: parts.length > 0 ? parts.join(', ') : null,
          bundleSelections: item.bundleSelections,
          matchaLevel: isFood ? undefined : (item as any).matchaLevel
        };
      });

      const backendPaymentMethod = paymentMethod === 'QRIS' ? 'QRIS_INSTAN' : 'COD';
      
      let pickupTimeStr = 'ASAP / 15-20 Menit';
      if (pickupTimeOption === '30_MIN') pickupTimeStr = '30 Menit Lagi';
      else if (pickupTimeOption === '45_MIN') pickupTimeStr = '45 Menit Lagi';
      else if (pickupTimeOption === 'CUSTOM') pickupTimeStr = `Pukul ${customPickupTime}`;

      const isPickUp = serviceMode === 'PICKUP';
      const fullTableLabel = isPickUp 
        ? 'Pick Up di Bar / Kasir Arum Seduh'
        : `Meja ${tableNumber.trim()}`;

      const payload = {
        name,
        phone: '-',
        tableNumber: isPickUp ? null : tableNumber.trim(),
        orderType: serviceMode,
        address: fullTableLabel,
        pickupTime: isPickUp ? pickupTimeStr : undefined,
        paymentMethod: backendPaymentMethod,
        items: itemsPayload,
        voucherCode: appliedPromo?.code || undefined,
        notes: isPickUp 
          ? (notes ? `[Pick Up: ${pickupTimeStr}] ${notes}` : `[Pick Up: ${pickupTimeStr}]`)
          : (notes || undefined)
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses pesanan.');
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('spmb_active_order_id', data.orderId);
      }
      setActiveOrderId(data.orderId);

      clearCart();
      setAppliedPromo(null);
      setPromoCodeInput('');
      setPromoError('');
      setIsCartOpen(false);

      if (paymentMethod === 'QRIS') {
        if (data.paymentQrContent) {
          setQrisQrContent(data.paymentQrContent);
          setQrisOrderId(data.orderId);
          setQrisTotal(data.total);
          setQrisPaymentPaid(false);
          setShowQrisModal(true);
        } else if (data.paymentUrl) {
          window.location.href = data.paymentUrl;
        } else {
          window.location.href = `/orders/${data.orderId}`;
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C1917] pb-32 font-sans selection:bg-orange-500/20 selection:text-orange-700">
      {/* Top Ambient Glow in Arum Seduh Orange-Amber */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-56 bg-gradient-to-b from-orange-500/10 via-amber-500/5 to-transparent pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 pt-6 sm:pt-8">
        
        {/* Editorial Header */}
        <header className="mb-6 bg-white/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] text-left">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200/80 text-orange-700 text-[11px] font-bold tracking-wide">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-orange-600" />
                  <span>Self-Service Dine-In</span>
                </div>
                {isMounted && storeStatus && (
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border tracking-wide ${
                    storeStatus.isOpen
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${storeStatus.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    <span>{storeStatus.isOpen ? `Buka • Tutup ${storeStatus.closeTime} WIB` : 'Kedai Tutup'}</span>
                  </div>
                )}
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 flex items-center gap-2">
                Arum Seduh
                <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
              </h1>
              <p className="text-xs sm:text-sm text-stone-600 max-w-lg leading-relaxed">
                Pesan hidangan & minuman matcha autentik langsung dari meja Anda. Pesanan akan diantarkan setelah siap disajikan.
              </p>
            </div>

            {/* Service Mode Switcher & Location Badge */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              {/* Segmented Mode Switcher */}
              <div className="flex bg-stone-100 p-1 rounded-2xl border border-stone-200 shadow-inner">
                <button
                  type="button"
                  onClick={() => setServiceMode('DINE_IN')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    serviceMode === 'DINE_IN'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <UtensilsCrossed className="w-3.5 h-3.5" />
                  <span>Dine In</span>
                </button>

                <button
                  type="button"
                  onClick={() => setServiceMode('PICKUP')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    serviceMode === 'PICKUP'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Pick Up</span>
                </button>
              </div>

              {/* Dynamic Badge for Dine In vs Pick Up */}
              {serviceMode === 'DINE_IN' ? (
                <div 
                  onClick={() => {
                    if (!isTableLocked) {
                      setShowTableModal(true);
                    }
                  }}
                  className={`p-3 sm:p-3.5 rounded-2xl bg-stone-50/90 border border-stone-200 flex items-center gap-3 ${!isTableLocked ? 'cursor-pointer hover:border-orange-300 hover:bg-orange-50/30' : ''} transition-all group shadow-sm text-left`}
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center font-serif text-lg font-bold shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
                    {tableNumber || '—'}
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
                      <span>Makan di Tempat</span>
                      {!isTableLocked && <span className="text-[9px] text-orange-600 font-bold">(Ganti)</span>}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-serif font-bold text-stone-900 text-xs sm:text-sm">
                        Meja {tableNumber || '—'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center gap-3 shadow-sm text-left">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-amber-800">
                      Bawa Pulang / Takeaway
                    </p>
                    <p className="font-serif font-bold text-stone-900 text-xs sm:text-sm mt-0.5">
                      Ambil di Kasir / Bar
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Store Operational Status Announcement */}
        {isMounted && storeStatus && !storeStatus.isOpen && (
          <div className="mb-6 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-500/30 rounded-3xl p-5 sm:p-6 flex items-start gap-4 shadow-sm text-stone-800 text-left">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0 shadow-inner">
              <Clock className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-serif font-bold text-base sm:text-lg text-stone-900">Kedai Sedang Tutup</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200 text-amber-900 uppercase tracking-wider">
                  Di Luar Jam Operasional
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-600 mt-1 leading-relaxed">
                {storeStatus.message}
              </p>
              <p className="text-[11px] text-amber-800 font-medium mt-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                Anda tetap dapat melihat daftar menu. Pemesanan mandiri akan dibuka kembali pada jadwal operasional kedai.
              </p>
            </div>
          </div>
        )}

        {/* Realtime Active Order Status Card */}
        {activeOrderStatus && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-5 sm:p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-4 text-left"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900">
                    Status Pesanan {activeOrderStatus.tableNumber ? `${activeOrderStatus.tableNumber}` : ''}
                  </h3>
                  <p className="text-[11px] font-mono text-stone-400">ID: {activeOrderStatus.id}</p>
                </div>
              </div>

              <div>
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5
                  ${activeOrderStatus.status === 'PENDING_PAYMENT' ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse' : ''}
                  ${activeOrderStatus.status === 'PENDING' ? 'bg-orange-100 text-orange-900 border border-orange-200' : ''}
                  ${activeOrderStatus.status === 'PREPARING' ? 'bg-blue-50 text-blue-800 border border-blue-200 animate-pulse' : ''}
                  ${activeOrderStatus.status === 'READY' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 animate-bounce' : ''}
                  ${activeOrderStatus.status === 'COMPLETED' ? 'bg-stone-100 text-stone-700' : ''}
                  ${activeOrderStatus.status === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border border-rose-200' : ''}
                `}>
                  {activeOrderStatus.status === 'PENDING_PAYMENT' && 'Menunggu Pembayaran QRIS'}
                  {activeOrderStatus.status === 'PENDING' && 'Pesanan Diterima'}
                  {activeOrderStatus.status === 'PREPARING' && 'Sedang Disiapkan'}
                  {activeOrderStatus.status === 'READY' && 'Pesanan Siap'}
                  {activeOrderStatus.status === 'COMPLETED' && 'Selesai'}
                  {activeOrderStatus.status === 'CANCELLED' && 'Dibatalkan'}
                </span>
              </div>
            </div>

            {/* 3-Step Simple Progress Bar */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className={`p-3 rounded-2xl border transition-all ${
                activeOrderStatus.status === 'PENDING_PAYMENT'
                  ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold animate-pulse'
                  : ['PENDING', 'PREPARING', 'READY', 'COMPLETED'].includes(activeOrderStatus.status)
                  ? 'bg-orange-50 border-orange-300 text-orange-800 font-bold'
                  : 'bg-stone-50 border-stone-200 text-stone-400'
              }`}>
                <p className="text-[9px] uppercase tracking-wider font-bold">Langkah 1</p>
                <p className="text-xs font-bold mt-0.5">
                  {activeOrderStatus.status === 'PENDING_PAYMENT' ? 'Bayar QRIS' : 'Diterima'}
                </p>
              </div>

              <div className={`p-3 rounded-2xl border transition-all ${
                ['PREPARING', 'READY', 'COMPLETED'].includes(activeOrderStatus.status)
                  ? 'bg-orange-50 border-orange-300 text-orange-800 font-bold'
                  : 'bg-stone-50 border-stone-200 text-stone-400'
              }`}>
                <p className="text-[9px] uppercase tracking-wider font-bold">Langkah 2</p>
                <p className="text-xs font-bold mt-0.5">Disiapkan</p>
              </div>

              <div className={`p-3 rounded-2xl border transition-all ${
                ['READY', 'COMPLETED'].includes(activeOrderStatus.status)
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-sm'
                  : 'bg-stone-50 border-stone-200 text-stone-400'
              }`}>
                <p className="text-[9px] uppercase tracking-wider font-bold">Langkah 3</p>
                <p className="text-xs font-bold mt-0.5">Selesai</p>
              </div>
            </div>

            {/* Alert if unpaid QRIS */}
            {activeOrderStatus.status === 'PENDING_PAYMENT' && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-950">Pesanan belum dibayar</p>
                    <p className="text-[11px] text-amber-800 font-medium">Selesaikan pembayaran QRIS agar pesanan Anda segera dibuat oleh barista.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQrisOrderId(activeOrderStatus.id);
                    setQrisTotal(activeOrderStatus.total);
                    setQrisPaymentPaid(false);
                    setShowQrisModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shrink-0 transition-all shadow-sm cursor-pointer"
                >
                  Buka QRIS
                </button>
              </div>
            )}

            {/* 20-Minute Alert Notification */}
            {isOrderOver20Min && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0"><Clock className="w-4 h-4" /></div>
                  <div>
                    <p className="text-xs font-bold text-amber-950">Pesanan belum selesai lebih dari 20 menit?</p>
                    <p className="text-[11px] text-amber-800 font-medium">Silakan hubungi kasir atau barista kami untuk konfirmasi langsung.</p>
                  </div>
                </div>
                <a
                  href={`https://wa.me/${botNumber || ''}?text=${encodeURIComponent(`Halo Arum Seduh, saya ingin menanyakan pesanan Meja ${activeOrderStatus.tableNumber || tableNumber} dengan ID ${activeOrderStatus.id} yang belum selesai.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold shrink-0 inline-flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Hubungi Kasir via WA
                </a>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-stone-100">
              <button
                onClick={() => window.location.href = `/orders/${activeOrderStatus.id}`}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold hover:from-orange-600 hover:to-amber-600 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Lihat Rincian Pesanan
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('spmb_active_order_id');
                  setActiveOrderId(null);
                  setActiveOrderStatus(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-bold hover:bg-stone-50 transition-all cursor-pointer"
              >
                Pesan Menu Baru
              </button>
            </div>
          </motion.div>
        )}

        {/* Category Navigation Pills */}
        <nav className="flex gap-2 overflow-x-auto pb-3 scrollbar-none select-none">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id || selectedCategory === cat.slug;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold tracking-wide shrink-0 transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-transparent shadow-md shadow-orange-500/20'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </nav>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white rounded-3xl border border-stone-200 mt-4 shadow-sm">
            <UtensilsCrossed className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-700 font-bold text-sm">Tidak ada menu dalam kategori ini</p>
            <p className="text-stone-400 text-xs mt-1">Silakan pilih kategori menu lainnya</p>
            <button
              onClick={() => setSelectedCategory('all')}
              className="mt-4 px-4 py-2 rounded-full bg-orange-50 text-orange-600 text-xs font-bold hover:bg-orange-100 transition-colors cursor-pointer"
            >
              Lihat Semua Menu
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-4 mt-4">
            {filteredProducts.map((product) => {
              const {
                displayPrice,
                originalPrice,
                promo,
                isRegularOut,
                sizeNotice,
                isSoldOut,
              } = getEffectiveProductDisplay(product, packagingStock);

              return (
                <motion.div
                  key={product.id}
                  whileHover={isSoldOut ? {} : { y: -3 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => handleProductClick(product)}
                  className={`bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col group relative transition-all ${
                    isSoldOut ? 'opacity-65 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg hover:shadow-orange-500/5 hover:border-orange-300'
                  }`}
                >
                  {/* Promo Overlay */}
                  {promo && !isSoldOut && (
                    <div className="absolute top-2.5 right-2.5 z-20">
                      <PromoCountdown endDate={promo.endDate} compact />
                    </div>
                  )}

                  {/* Size Notice Badge if Regular is Out */}
                  {isRegularOut && !isSoldOut && (
                    <span className="absolute top-3 right-3 z-10 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide uppercase bg-amber-500 text-white shadow-sm flex items-center gap-0.5">
                      🥤 {sizeNotice}
                    </span>
                  )}

                  {/* Badges */}
                  {promo && !isSoldOut ? (
                    <span className="absolute top-3 left-3 z-10 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-rose-600 text-white shadow-sm">
                      Promo
                    </span>
                  ) : product.badge && (
                    <span className={`absolute top-3 left-3 z-10 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-sm ${
                      product.badge === 'best-seller' ? 'bg-[#8C6239] text-white' : ''
                    }${product.badge === 'new' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' : ''}${
                      product.badge === 'sold-out' ? 'bg-stone-400 text-white' : ''
                    }`}>
                      {product.badge === 'best-seller' && 'Best Seller'}
                      {product.badge === 'new' && 'Baru'}
                      {product.badge === 'sold-out' && 'Habis'}
                    </span>
                  )}

                  {/* Product Image */}
                  <div className="relative w-full aspect-square bg-[#FAF9F6] overflow-hidden">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className={`object-cover group-hover:scale-105 transition-transform duration-300 ${
                          isSoldOut ? 'grayscale opacity-60' : ''
                        }`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><UtensilsCrossed className="w-8 h-8 text-stone-300" /></div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between text-left">
                    <div className="space-y-1">
                      <h3 className="font-bold text-xs sm:text-sm text-stone-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                        {product.name}
                      </h3>
                      <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>
                    </div>
                    
                    <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between">
                      <div className="flex flex-col text-left">
                        {originalPrice && originalPrice > displayPrice && (
                          <span className="text-[10px] text-stone-400 line-through leading-none mb-0.5">
                            {formatRupiah(originalPrice)}
                          </span>
                        )}
                        <div className="flex items-baseline gap-1">
                          <span className="font-bold text-xs sm:text-sm text-orange-600">
                            {formatRupiah(displayPrice)}
                          </span>
                          {isRegularOut && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                              (Jumbo)
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {!isSoldOut && (
                        <span className="w-7 h-7 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-xs font-bold group-hover:bg-gradient-to-r group-hover:from-orange-500 group-hover:to-amber-500 group-hover:text-white transition-all shadow-sm">
                          +
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Bottom Cart Bar (Modern Luxury Arus Design) */}
      <AnimatePresence>
        {cartItems.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="fixed bottom-4 sm:bottom-6 left-0 right-0 z-40 px-4 pointer-events-none"
          >
            <div className="pointer-events-auto max-w-xl mx-auto bg-[#18120E]/95 backdrop-blur-xl text-[#FFFBF5] rounded-[1.75rem] p-3 sm:p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.45),0_0_0_1px_rgba(212,165,116,0.25)] border border-[#D4A574]/30 flex items-center justify-between gap-3 sm:gap-4 transition-all">
              {/* Left: Bag icon + count badge + price + location badge */}
              <div className="flex items-center gap-3 pl-1 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 flex items-center justify-center shadow-md shadow-orange-500/30">
                    <ShoppingBag className="w-5 h-5 text-stone-950 stroke-[2.5]" />
                  </div>
                  <motion.span
                    key={cartItems.reduce((acc, i) => acc + i.quantity, 0)}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-white text-orange-700 font-black text-[10px] flex items-center justify-center border-2 border-[#18120E] shadow-sm"
                  >
                    {cartItems.reduce((acc, i) => acc + i.quantity, 0)}
                  </motion.span>
                </div>
                
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#EFDCA7] font-semibold truncate">
                    {serviceMode === 'DINE_IN' ? (
                      <>
                        <UtensilsCrossed className="w-3 h-3 text-[#D4A574] shrink-0" />
                        <span className="truncate">Meja {tableNumber || '—'}</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-3 h-3 text-[#D4A574] shrink-0" />
                        <span>Ambil Sendiri (Pick Up)</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm sm:text-base font-extrabold text-white mt-0.5 tracking-tight font-sans">
                    {formatRupiah(totalPrice)}
                  </p>
                </div>
              </div>
              
              {/* Right: CTA Button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => setIsCartOpen(true)}
                className="px-4 sm:px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-stone-950 font-extrabold text-xs sm:text-sm tracking-wide transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-orange-500/25 shrink-0"
              >
                <span>Lihat Pesanan</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clean Figma-Grade Cart & Checkout Slide-Over Panel */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 cursor-pointer"
              onClick={() => setIsCartOpen(false)}
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 240 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/60 shrink-0">
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                    <UtensilsCrossed className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-serif font-bold text-base text-stone-900">Pesanan Meja</h2>
                    <p className="text-[11px] text-stone-500 font-medium">Meja {tableNumber || '—'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-8 h-8 rounded-full border border-stone-200 bg-white flex items-center justify-center hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 text-stone-500" />
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                
                {/* Cart Items List */}
                <div className="space-y-2.5">
                  <h3 className="text-[11px] font-bold text-stone-400 uppercase tracking-wider text-left">
                    Menu yang Dipesan ({cartItems.reduce((acc, i) => acc + i.quantity, 0)} item)
                  </h3>

                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-3 p-3.5 rounded-2xl border border-stone-150 bg-stone-50/70 hover:bg-stone-50 transition-colors items-start">
                      {item.image && (
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200/60">
                          <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 text-left">
                        <h4 className="text-xs font-bold text-stone-900 line-clamp-1">{item.name}</h4>
                        {(() => {
                          const prod = products.find((p) => p.id === item.productId);
                          const category = categories?.find((c: any) => c.id === (prod as any)?.categoryId || c.slug === (prod as any)?.category?.slug);
                          const isFood = isFoodItem(prod?.name || item.name) || (
                            (prod?.modifiers as any)?.productType === 'makanan' ||
                            category?.slug === 'makanan' ||
                            category?.slug === 'snack' ||
                            category?.slug === 'food' ||
                            category?.name?.toLowerCase().includes('makan')
                          );
                          const activePromo = prod ? getActivePromo(prod) : null;
                          const promoPotongan = activePromo && prod && activePromo.promoPrice < prod.price ? (prod.price - activePromo.promoPrice) : 0;

                          return (
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              {!isFood && (item.size && item.size !== 'Normal' && item.size !== 'Regular') && (
                                <span className="inline-block text-[9px] font-semibold bg-stone-200/70 text-stone-700 px-1.5 py-0.5 rounded">
                                  {item.size}
                                </span>
                              )}
                              {!isFood && (item.iceLevel || item.sugarLevel) && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-semibold bg-stone-200/70 text-stone-700 px-1.5 py-0.5 rounded">
                                  {item.iceLevel && <span>{item.iceLevel}</span>}
                                  {item.iceLevel && item.sugarLevel && <span className="text-orange-600 font-bold">→</span>}
                                  {item.sugarLevel && <span>{item.sugarLevel}</span>}
                                </span>
                              )}
                              {!isFood && item.matchaLevel !== undefined && prod?.modifiers?.showMatcha === true && (
                                <span className="inline-block text-[9px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                                  Matcha Lvl {item.matchaLevel}
                                </span>
                              )}
                              {!isFood && (item as any).shot && (prod?.modifiers?.showEspressoShot === true || (prod?.modifiers?.espressoShots && prod.modifiers.espressoShots.length > 0)) && (
                                <span className="inline-block text-[9px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                                  {(item as any).shot}
                                </span>
                              )}
                              {item.addOns && item.addOns.length > 0 && item.addOns.map((a: any) => (
                                <span key={a.id} className="inline-block text-[9px] font-semibold bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded">
                                  +{a.name}
                                </span>
                              ))}
                              {promoPotongan > 0 && prod && activePromo && (
                                <span className="inline-block text-[9px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">
                                  Potongan: {formatRupiah(prod.price)} - {formatRupiah(promoPotongan)} = {formatRupiah(activePromo.promoPrice)}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                        <p className="text-xs font-extrabold text-orange-600 mt-1.5">{formatRupiah(item.totalPrice)}</p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-stone-300 hover:text-rose-500 transition-colors cursor-pointer p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        
                        <div className="flex items-center gap-1.5 border border-stone-200 bg-white rounded-xl p-0.5 shrink-0 shadow-xs">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 text-stone-500 hover:bg-stone-50 rounded-lg cursor-pointer transition-colors"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="text-xs font-bold w-4 text-center text-stone-800">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 text-stone-500 hover:bg-stone-50 rounded-lg cursor-pointer transition-colors"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <hr className="border-stone-100" />

                {/* Clean Form Input */}
                <form onSubmit={handlePreSubmit} className="space-y-4">
                  <h3 className="text-[11px] font-bold text-stone-400 uppercase tracking-wider text-left">
                    Informasi Pemesan
                  </h3>

                  {/* Service Mode Selector in Drawer */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[11px] font-bold text-stone-700">
                      Jenis Layanan
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setServiceMode('DINE_IN')}
                        className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          serviceMode === 'DINE_IN'
                            ? 'bg-orange-50 border-orange-500 text-orange-800 ring-2 ring-orange-500/20 shadow-sm'
                            : 'bg-stone-50/70 border-stone-200 text-stone-600 hover:border-stone-400'
                        }`}
                      >
                        <UtensilsCrossed className="w-4 h-4 text-orange-600" />
                        <span>Makan di Tempat</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setServiceMode('PICKUP')}
                        className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          serviceMode === 'PICKUP'
                            ? 'bg-orange-50 border-orange-500 text-orange-800 ring-2 ring-orange-500/20 shadow-sm'
                            : 'bg-stone-50/70 border-stone-200 text-stone-600 hover:border-stone-400'
                        }`}
                      >
                        <ShoppingBag className="w-4 h-4 text-orange-600" />
                        <span>Ambil Sendiri (Pick Up)</span>
                      </button>
                    </div>
                  </div>

                  {/* Lokasi Meja (Hanya jika Dine In) */}
                  {serviceMode === 'DINE_IN' ? (
                    <div className="space-y-1.5 text-left">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5">
                          <UtensilsCrossed className="w-3.5 h-3.5 text-orange-500" />
                          <span>Nomor Meja</span>
                        </label>
                        {!isTableLocked && (
                          <button
                            type="button"
                            onClick={() => setShowTableModal(true)}
                            className="text-orange-600 font-bold text-[11px] hover:underline cursor-pointer"
                          >
                            Buka Denah Meja
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!isTableLocked) setShowTableModal(true);
                        }}
                        className={`w-full px-4 py-3 rounded-2xl border text-xs font-bold text-left flex items-center justify-between transition-all ${
                          isTableLocked 
                            ? 'bg-orange-50/50 border-orange-200 text-orange-950'
                            : 'bg-stone-50/70 border-stone-200 text-stone-800 hover:border-orange-400 cursor-pointer'
                        }`}
                      >
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-stone-400 font-medium">Tempat Duduk</p>
                          <p className="text-sm font-bold mt-0.5">Meja {tableNumber || '—'}</p>
                        </div>
                        {isTableLocked ? (
                          <span className="text-[10px] text-orange-700 bg-orange-100 px-2 py-1 rounded-xl flex items-center gap-1 font-bold">
                            <Lock className="w-3 h-3" /> Terkunci QR
                          </span>
                        ) : (
                          <span className="text-[10px] text-orange-600 font-bold">Ganti Meja &rarr;</span>
                        )}
                      </button>
                    </div>
                  ) : (
                    /* Pick Up Estimated Time Options */
                    <div className="space-y-2 text-left p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-700" />
                        <label className="text-[11px] font-bold text-amber-950 uppercase tracking-wider">
                          Estimasi Waktu Pengambilan
                        </label>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        {[
                          { id: 'ASAP', label: 'Segera (15-20 mnt)' },
                          { id: '30_MIN', label: '30 Menit Lagi' },
                          { id: '45_MIN', label: '45 Menit Lagi' },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setPickupTimeOption(opt.id)}
                            className={`py-2 px-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer text-center ${
                              pickupTimeOption === opt.id
                                ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                                : 'bg-white text-stone-700 border-amber-200 hover:border-amber-400'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      <p className="text-[10px] text-stone-600 pt-1">
                        Pesanan akan langsung disiapkan di cup/kantong takeaway dan dapat Anda ambil di kasir/bar Arum Seduh.
                      </p>
                    </div>
                  )}

                  {/* Nama Pemesan */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-orange-500" />
                      <span>Nama Pemesan</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Masukkan nama Anda (misal: Budi)"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50/50 text-xs font-medium focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all placeholder:text-stone-400"
                    />
                  </div>

                  {/* Catatan Tambahan */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-orange-500" />
                      <span>Catatan Tambahan (Opsional)</span>
                    </label>
                    <textarea
                      placeholder="Contoh: Less ice, jangan pakai sedotan"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-stone-200 bg-stone-50/50 text-xs font-medium focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all resize-none placeholder:text-stone-400"
                    />
                  </div>

                  {/* Clean Radio Option: QRIS & Tunai */}
                  <div className="space-y-2 text-left">
                    <label className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-orange-500" />
                      <span>Metode Pembayaran</span>
                    </label>

                    <div className="grid grid-cols-2 gap-2.5">
                      {/* QRIS */}
                      <label className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-2 ${
                        paymentMethod === 'QRIS'
                          ? 'border-orange-500 bg-orange-50/50 text-orange-900 shadow-sm ring-2 ring-orange-500/20'
                          : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                      }`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'QRIS'}
                          onChange={() => setPaymentMethod('QRIS')}
                          className="hidden"
                        />
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          paymentMethod === 'QRIS' ? 'bg-orange-500 text-white shadow-sm' : 'bg-stone-100 text-stone-600'
                        }`}>
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold">QRIS</p>
                          <p className="text-[10px] text-stone-400 font-medium">BCA, GoPay, Dana, dll</p>
                        </div>
                      </label>

                      {/* Tunai */}
                      <label className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-2 ${
                        paymentMethod === 'COD'
                          ? 'border-orange-500 bg-orange-50/50 text-orange-900 shadow-sm ring-2 ring-orange-500/20'
                          : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                      }`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'COD'}
                          onChange={() => setPaymentMethod('COD')}
                          className="hidden"
                        />
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          paymentMethod === 'COD' ? 'bg-orange-500 text-white shadow-sm' : 'bg-stone-100 text-stone-600'
                        }`}>
                          <Banknote className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold">Tunai</p>
                          <p className="text-[10px] text-stone-400 font-medium">Bayar di Kasir</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Kode Diskon / Voucher Promo */}
                  <div className="space-y-2 text-left pt-1">
                    <label className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-orange-500" />
                      <span>Kode Diskon / Voucher</span>
                    </label>

                    {!appliedPromo ? (
                      <div className="space-y-1.5">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Contoh: HEMAT10..."
                            value={promoCodeInput}
                            onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleApplyPromo();
                              }
                            }}
                            className="flex-1 px-4 py-2.5 rounded-2xl border border-stone-200 bg-stone-50/50 text-xs font-semibold uppercase focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:normal-case placeholder:font-normal text-stone-900"
                          />
                          <button
                            type="button"
                            onClick={handleApplyPromo}
                            disabled={promoLoading || !promoCodeInput.trim()}
                            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all disabled:opacity-50 flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            {promoLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5" />
                            )}
                            <span>Pakai</span>
                          </button>
                        </div>
                        {promoError && (
                          <p className="text-[11px] text-rose-600 font-medium px-1">{promoError}</p>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 rounded-2xl bg-orange-50/80 border border-orange-200/90 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div className="w-7 h-7 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                            <Ticket className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-orange-950 truncate">
                              {appliedPromo.code} <span className="text-orange-600 font-extrabold">(-{formatRupiah(appliedPromo.discountAmount)})</span>
                            </p>
                            <p className="text-[10px] text-stone-500 truncate">{appliedPromo.description}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemovePromo}
                          className="w-7 h-7 rounded-full hover:bg-orange-200/50 text-stone-400 hover:text-stone-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                          title="Hapus Promo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Ringkasan Biaya */}
                  <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-1.5 text-xs">
                    <div className="flex justify-between text-stone-600">
                      <span>Subtotal Pesanan</span>
                      <span>{formatRupiah(totalPrice)}</span>
                    </div>
                    {appliedPromo && promoDiscount > 0 && (
                      <div className="flex justify-between text-orange-600 font-semibold">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" /> Diskon Promo ({appliedPromo.code})
                        </span>
                        <span>-{formatRupiah(promoDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-stone-900 pt-1.5 border-t border-stone-200 text-sm">
                      <span>Total Pembayaran</span>
                      <span className="text-orange-600">{formatRupiah(finalPayable)}</span>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-rose-50 text-rose-700 rounded-2xl text-xs font-medium text-left border border-rose-200">
                       {errorMsg}
                    </div>
                  )}

                  {isMounted && storeStatus && !storeStatus.isOpen && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-950 flex items-start gap-2.5 text-left">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-amber-900">Kedai Sedang Tutup</p>
                        <p className="text-[11px] text-stone-600 mt-0.5 leading-relaxed">
                          {storeStatus.message}
                        </p>
                      </div>
                    </div>
                  )}

                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.98 }}
                    disabled={isSubmitting || (isMounted && storeStatus !== null && !storeStatus.isOpen)}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-stone-950 font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-stone-950" /> Memproses Pesanan...
                      </>
                    ) : isMounted && storeStatus && !storeStatus.isOpen ? (
                      <>
                        <Clock className="w-4 h-4 text-stone-950" />
                        <span>Kedai Sedang Tutup</span>
                      </>
                    ) : (
                      <>
                        <span>Kirim Pesanan</span>
                        <span className="opacity-80">•</span>
                        <span>{formatRupiah(finalPayable)}</span>
                      </>
                    )}
                  </motion.button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Pop-up Floor Plan Denah Meja (Identical 16:9 Scaling to Admin Canvas - No Collisions on Mobile) */}
      <AnimatePresence>
        {showTableModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
              onClick={() => setShowTableModal(false)}
            />

            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl relative z-10 border border-stone-200 max-h-[90vh] flex flex-col text-left space-y-3"
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div>
                  <h3 className="font-serif font-bold text-base sm:text-lg text-stone-900 flex items-center gap-2">
                    <Grid className="w-4 h-4 text-orange-600" />
                    <span>Denah Tata Letak Meja Ruangan</span>
                  </h3>
                  <p className="text-[11px] text-stone-500">Pilih meja tempat Anda duduk. Geser ke samping jika di layar HP.</p>
                </div>
                <button
                  onClick={() => setShowTableModal(false)}
                  className="w-8 h-8 rounded-full border border-stone-200 flex items-center justify-center hover:bg-stone-50 cursor-pointer"
                >
                  <X className="w-4 h-4 text-stone-500" />
                </button>
              </div>

              {/* Scrollable Container with exact 16:9 Blueprint Canvas */}
              <div className="w-full overflow-x-auto overflow-y-hidden rounded-2xl border-2 border-stone-300 shadow-inner bg-[#FAF7F2] p-1 select-none">
                <div 
                  className="relative min-w-[540px] aspect-[16/9] w-full rounded-xl overflow-hidden"
                  style={{
                    backgroundImage: 'radial-gradient(#F97316 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                  }}
                >
                  <div className="absolute top-3 left-4 text-stone-400 text-[9px] font-mono tracking-widest uppercase pointer-events-none z-0">
                    [Denah Arum Seduh • Geser & Ketuk Meja]
                  </div>

                  {/* Floor Elements (Doors, TV, Shelves, Bar, Plant, Window, Restroom) */}
                  {floorElements.map((el) => (
                    <div
                      key={el.id}
                      style={{
                        position: 'absolute',
                        left: `${Math.max(5, Math.min(95, el.x))}%`,
                        top: `${Math.max(5, Math.min(95, el.y))}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className="absolute flex items-center justify-center pointer-events-none z-10"
                    >
                      <FloorElementVisual element={el} />
                    </div>
                  ))}

                  {activeTables.map((t) => {
                    const isCurrent = tableNumber === t.number.toString();
                    const isOccupied = t.status === 'OCCUPIED';
                    const xPos = t.x !== undefined ? t.x : 50;
                    const yPos = t.y !== undefined ? t.y : 50;
                    const isRound = t.shape === 'ROUND';
                    return (
                      <div
                        key={t.id}
                        style={{
                          position: 'absolute',
                          left: `${Math.max(10, Math.min(90, xPos))}%`,
                          top: `${Math.max(10, Math.min(90, yPos))}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                        className="absolute flex items-center justify-center z-20"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setTableNumber(t.number.toString());
                            setShowTableModal(false);
                          }}
                          style={{
                            transform: `rotate(${t.rotation || 0}deg)`,
                          }}
                          className={`border-2 shadow-md flex flex-col items-center justify-center transition-all cursor-pointer ${
                            isRound ? 'w-20 h-20 rounded-full p-2' : 'w-28 h-18 rounded-2xl p-2'
                          } ${
                            isCurrent
                              ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white border-transparent ring-4 ring-orange-400/40 scale-105 z-30 shadow-orange-500/30'
                              : isOccupied
                              ? 'bg-blue-50 text-blue-900 border-blue-200 hover:border-blue-400 z-20'
                              : 'bg-white text-stone-800 border-stone-300 hover:border-orange-400 hover:scale-105 z-20'
                          }`}
                        >
                          <span className="text-[7px] font-bold uppercase tracking-wider opacity-80">
                            {isRound ? 'Bulat' : 'Kotak'}
                          </span>
                          <span className="font-serif font-bold text-xs sm:text-sm leading-tight">
                            Meja {t.number}
                          </span>
                          {isCurrent && (
                            <span className="text-[7px] bg-white/20 px-1.5 py-0.2 rounded mt-0.5 font-bold">
                              Meja Anda
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Table Grid List (Tap-Friendly for HP) */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Atau Pilih Langsung dari Daftar Meja:
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {activeTables.map((t) => {
                    const isCur = tableNumber === t.number.toString();
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setTableNumber(t.number.toString());
                          setShowTableModal(false);
                        }}
                        className={`px-3 py-2 rounded-xl border text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                          isCur
                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-500 shadow-sm'
                            : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        Meja {t.number} ({t.shape === 'ROUND' ? 'Bulat' : 'Kotak'})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-stone-500 pt-2 border-t border-stone-100">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Meja Anda</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-white border border-stone-300" /> Tersedia</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTableModal(false)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs cursor-pointer shadow-sm"
                >
                  Pilih Meja {tableNumber}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowConfirmModal(false)}
            />
            
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative z-10 text-center border border-stone-200"
            >
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-lg text-stone-900 mb-1">Konfirmasi Pesanan Meja</h3>
              <p className="text-xs text-stone-600 leading-relaxed mb-5">
                Pesanan akan dibuat untuk <span className="font-bold text-stone-900">Meja {tableNumber}</span> atas nama <span className="font-bold text-stone-900">{name}</span>.
              </p>

              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs uppercase tracking-wider hover:bg-stone-50 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={executeCheckout}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                >
                  Ya, Kirim
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Detail Modal */}
      <ProductModal
        product={selectedProduct}
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setSelectedProduct(null);
        }}
        allProducts={products}
        packagingStock={packagingStock}
      />

      {/* Dynamic QRIS Payment Modal */}
      <AnimatePresence>
        {showQrisModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => {
                if (!qrisPaymentPaid) {
                  setShowQrisModal(false);
                }
              }}
            />

            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative z-10 text-center border border-stone-200 flex flex-col items-center"
            >
              {!qrisPaymentPaid && (
                <button
                  onClick={() => setShowQrisModal(false)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full border border-stone-200 bg-white flex items-center justify-center hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 text-stone-500" />
                </button>
              )}

              {/* QRIS Header */}
              <div className="w-full flex items-center justify-between border-b border-stone-100 pb-3 mb-4 shrink-0">
                <span className="text-lg font-black tracking-tight text-[#1b4353]">
                  QR<span className="text-[#e26d5c]">IS</span>
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-md">
                  GPN Dynamic
                </span>
              </div>

              {qrisPaymentPaid ? (
                <div className="py-8 space-y-3 flex flex-col items-center">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-200">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h3 className="font-serif font-bold text-lg text-stone-900">Pembayaran Berhasil!</h3>
                  <p className="text-xs text-stone-500">Mengarahkan Anda ke halaman rincian pesanan...</p>
                </div>
              ) : (
                <>
                  <div className="relative w-64 h-64 bg-white rounded-2xl p-2 border border-stone-200 shadow-inner flex items-center justify-center">
                    <QRCodeCanvas
                      id="spmb-qris-canvas"
                      value={qrisQrContent}
                      size={240}
                      level="M"
                      includeMargin={false}
                      className="w-full h-full object-contain rounded-xl"
                    />
                  </div>

                  <div className="mt-3 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-100 w-full text-center">
                    <p className="text-[10px] text-orange-700 font-bold">
                      Scan QR dengan BCA, GoPay, OVO, ShopeePay, Dana, dll.
                    </p>
                  </div>

                  <div className="mt-3 text-center">
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Total Tagihan</p>
                    <p className="text-xl font-serif font-bold text-orange-600 mt-0.5">
                      {formatRupiah(qrisTotal)}
                    </p>
                  </div>

                  {/* Unduh QRIS Button */}
                  <button
                    type="button"
                    onClick={handleDownloadQris}
                    className="mt-3 w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-stone-600" />
                    <span>Unduh Gambar QRIS</span>
                  </button>

                  <div className="mt-4 w-full flex items-center justify-center gap-2 text-xs text-stone-500 font-bold">
                    <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                    <span>Menunggu verifikasi pembayaran...</span>
                  </div>

                  <button
                    onClick={() => {
                      window.location.href = `/orders/${qrisOrderId}`;
                    }}
                    className="w-full mt-3 py-2 text-stone-500 hover:text-stone-800 text-[11px] font-semibold underline cursor-pointer"
                  >
                    Buka Rincian Pesanan
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
