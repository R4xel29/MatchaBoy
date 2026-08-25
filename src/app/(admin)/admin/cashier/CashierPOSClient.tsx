'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Truck,
  X,
  Check,
  Loader2,
  QrCode,
  User,
  SkipForward,
  Gift,
  Phone,
  Camera,
  CheckCircle2,
  Leaf,
  Coffee,
  Monitor,
  Sparkles,
  Receipt,
  Banknote,
  Coins,
  AlertCircle,
  ArrowDownRight,
  Lock,
  Unlock,
  Clock,
  Save,
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import QRCameraScanner from '@/components/cashier/QRCameraScanner';
import { PosTablePickerModal } from '@/components/cashier/PosTablePickerModal';
import { useToast } from '@/components/ui/Toast';

const DEFAULT_DRINK_SIZES = [
  { name: 'Regular', price: 0 },
  { name: 'Large', price: 3000 },
];

const DEFAULT_ESPRESSO_SHOTS = [
  { name: 'Single Shot', shots: 1, price: 0 },
  { name: 'Double Shot', shots: 2, price: 5000 },
  { name: 'Triple Shot', shots: 3, price: 10000 },
];

function getEffectiveSizes(productMods: POSProduct['modifiers']) {
  if (productMods?.sizes && productMods.sizes.length > 0) {
    return productMods.sizes;
  }
  if (productMods?.showSweetness !== false) {
    return DEFAULT_DRINK_SIZES;
  }
  return [];
}

function getEffectiveShots(productMods: POSProduct['modifiers']) {
  if (productMods?.espressoShots && productMods.espressoShots.length > 0) {
    return productMods.espressoShots;
  }
  if (productMods?.showEspressoShot === true) {
    return DEFAULT_ESPRESSO_SHOTS;
  }
  return [];
}

type POSProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string | null;
  badge?: string | null;
  isSoldOut?: boolean;
  categoryId: string;
  categoryName: string;
  modifiers: {
    iceLevel?: string[];
    sugarLevel?: string[];
    addOns?: { id: string; name: string; price: number }[];
    showSweetness?: boolean;
    defaultSugar?: string;
    defaultIce?: string;
    showMatcha?: boolean;
    defaultMatcha?: number;
    showEspressoShot?: boolean;
    defaultEspressoShot?: number;
    espressoShotPrice?: number;
    espressoShots?: { name: string; shots: number; price: number }[];
    sizes?: { name: string; price: number }[];
  } | null;
};

type CartItemPOS = {
  id: string;
  productId: string;
  name: string;
  basePrice: number;
  quantity: number;
  iceLevel: string;
  sugarLevel: string;
  matchaLevel?: number;
  size?: string;
  sizePrice?: number;
  shotName?: string;
  shotCount?: number;
  shotPrice?: number;
  addOns: { id: string; name: string; price: number }[];
  totalPrice: number;
  image?: string | null;
};

type OrderType = 'DELIVERY' | 'PICKUP' | 'DINE_IN';

interface Props {
  products: POSProduct[];
  categories: { id: string; name: string; slug: string }[];
  packagingStock?: { cupRegular: number; cupJumbo: number };
}

export default function CashierPOSClient({ products, categories, packagingStock }: Props) {
  const { showToast } = useToast();
  const router = useRouter();

  // State
  const [packStock, setPackStock] = useState(packagingStock || { cupRegular: 999, cupJumbo: 999 });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [cart, setCart] = useState<CartItemPOS[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('PICKUP');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastOrderId, setLastOrderId] = useState('');
  const [hasTumbler, setHasTumbler] = useState(false);
  const [loyaltySettings, setLoyaltySettings] = useState<{ tumblerBonusPoints: number; tumblerDiscountPct: number } | null>(null);
  const [selectedTable, setSelectedTable] = useState('');
  const [activeTables, setActiveTables] = useState<any[]>([]);
  const [showTableManagerModal, setShowTableManagerModal] = useState(false);
  const [showPosTablePicker, setShowPosTablePicker] = useState(false);
  const [posPeopleCount, setPosPeopleCount] = useState(1);

  // Cashier Shift & Petty Cash State
  const [shiftData, setShiftData] = useState<{ activeShift: any; reconciliation: any; history: any[] } | null>(null);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [showPettyCashModal, setShowPettyCashModal] = useState(false);
  const [openShiftCash, setOpenShiftCash] = useState('245000');
  const [actualCashInput, setActualCashInput] = useState('');
  const [shiftCloseNotes, setShiftCloseNotes] = useState('');
  const [shiftSaving, setShiftSaving] = useState(false);
  const [pettyCashForm, setPettyCashForm] = useState({ name: '', amount: '', notes: '' });

  const fetchShiftData = async () => {
    try {
      const res = await fetch('/api/cashier/shift');
      if (res.ok) {
        const d = await res.json();
        setShiftData(d);
      }
    } catch (err) {
      console.error('Failed to load shift:', err);
    }
  };

  useEffect(() => {
    fetchShiftData();
  }, []);

  useEffect(() => {
    fetch('/api/admin/tables')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setActiveTables(data);
        }
      })
      .catch((err) => console.error('Failed to fetch tables:', err));
  }, []);

  // QR Scan + Points state
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrCustomer, setQrCustomer] = useState<{ id: string; name: string; points: number } | null>(null);
  const [qrError, setQrError] = useState('');
  const [pointsAwarded, setPointsAwarded] = useState(false);

  useEffect(() => {
    fetch('/api/user/loyalty')
      .then((r) => r.json())
      .then((d) => {
        if (d.milestones?.tumblerBonus) {
          setLoyaltySettings({
            tumblerBonusPoints: d.milestones.tumblerBonus.points,
            tumblerDiscountPct: d.milestones.tumblerBonus.discountPct,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Member lookup state (via QR scan, unique ID, or phone)
  const [phoneLookupResult, setPhoneLookupResult] = useState<{ id: string; name: string; phone?: string; points: number; referralCode?: string; arusLevel?: string } | null>(null);
  const [phoneLookupLoading, setPhoneLookupLoading] = useState(false);
  const phoneDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Reset tumbler option if member is removed
  useEffect(() => {
    if (!phoneLookupResult) {
      setHasTumbler(false);
    }
  }, [phoneLookupResult]);

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const tumblerDiscount = useMemo(() => {
    if (!hasTumbler || !loyaltySettings) return 0;
    return Math.round((subtotal * loyaltySettings.tumblerDiscountPct) / 100);
  }, [hasTumbler, loyaltySettings, subtotal]);

  const totalPayable = subtotal - tumblerDiscount;

  const [isQrisConfirmed, setIsQrisConfirmed] = useState(false);
  const [dokuQrContent, setDokuQrContent] = useState<string | null>(null);
  const [dokuQrImageUrl, setDokuQrImageUrl] = useState<string | null>(null);
  const [currentInvoiceNumber, setCurrentInvoiceNumber] = useState<string | null>(null);
  const pendingQrisInvoiceRef = useRef<string | null>(null);

  // Request DOKU QRIS dynamic code only when paymentMethod is QRIS AND cashier clicked confirm/continue
  useEffect(() => {
    if (paymentMethod === 'QRIS' && isQrisConfirmed && cart.length > 0 && totalPayable > 0) {
      const invNum = `POS-${Date.now().toString().slice(-6)}`;
      setCurrentInvoiceNumber(invNum);
      pendingQrisInvoiceRef.current = invNum;

      fetch('/api/cashier/doku-qris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalPayable,
          invoiceNumber: invNum,
          customerName: customerName || 'Pelanggan Arum Seduh',
          customerPhone: customerPhone || phoneLookupResult?.phone || '-',
          orderType,
          tableNumber: selectedTable,
          userId: phoneLookupResult?.id || null,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            basePrice: item.quantity > 0 ? (item.totalPrice / item.quantity) : item.basePrice,
            modsString: `${item.matchaLevel !== undefined ? `Matcha Lvl: ${item.matchaLevel}, ` : ''}${item.iceLevel}, ${item.sugarLevel}${item.addOns.length > 0 ? ', +' + item.addOns.map((a) => a.name).join(', +') : ''}`,
          })),
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.qrContent || data.qrImageUrl) {
            setDokuQrContent(data.qrContent || null);
            setDokuQrImageUrl(data.qrImageUrl || null);
          }
        })
        .catch(() => {});
    } else if (paymentMethod !== 'QRIS') {
      setIsQrisConfirmed(false);
      setDokuQrContent(null);
      setDokuQrImageUrl(null);
      setCurrentInvoiceNumber(null);
    }
  }, [paymentMethod, isQrisConfirmed, totalPayable, cart.length]);

  // Automatic Polling (every 2 seconds) for QRIS Payment Status
  useEffect(() => {
    if (paymentMethod !== 'QRIS' || !currentInvoiceNumber || cart.length === 0 || showSuccess || isSubmitting) {
      return;
    }

    const pollTimer = setInterval(() => {
      if (isSubmitting) return;

      fetch('/api/cashier/doku-qris-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: currentInvoiceNumber,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.paid === true && !isSubmitting) {
            // Instantly update second monitor display with completed state for maximum responsiveness
            const instantCompletedPayload = {
              cart,
              subtotal,
              tumblerDiscount,
              totalPayable,
              customerName: customerName || 'Pelanggan Arum Seduh',
              orderType,
              paymentMethod,
              hasTumbler,
              tableNumber: selectedTable,
              isCompleted: true,
              orderId: currentInvoiceNumber,
              dokuQrContent,
              dokuQrImageUrl,
              timestamp: Date.now(),
            };

            if (displayChannelRef.current) {
              try {
                displayChannelRef.current.postMessage(instantCompletedPayload);
              } catch {}
            }
            try {
              localStorage.setItem('pos_customer_display_state', JSON.stringify(instantCompletedPayload));
            } catch {}

            handleSubmitOrder();
          }
        })
        .catch(() => {});
    }, 2000);

    return () => clearInterval(pollTimer);
  }, [paymentMethod, currentInvoiceNumber, cart.length, showSuccess, isSubmitting]);

  // Modifier modal state
  const [modifierProduct, setModifierProduct] = useState<POSProduct | null>(null);
  const [modIce, setModIce] = useState('Normal Ice');
  const [modSugar, setModSugar] = useState('Biasa');
  const [modMatcha, setModMatcha] = useState(5);
  const [modSize, setModSize] = useState('Normal');
  const [modSizePrice, setModSizePrice] = useState(0);
  const [modShot, setModShot] = useState('Single Shot');
  const [modShotCount, setModShotCount] = useState(1);
  const [modShotPrice, setModShotPrice] = useState(0);
  const [activeStep, setActiveStep] = useState<'MATCHA' | 'SWEETNESS' | 'ICE' | 'SIZE' | 'ESPRESSO'>('SWEETNESS');
  const [modAddOns, setModAddOns] = useState<{ id: string; name: string; price: number }[]>([]);
  const [modQty, setModQty] = useState(1);

  // Persistent BroadcastChannel reference for second monitor display sync
  const displayChannelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      displayChannelRef.current = new BroadcastChannel('pos_customer_display');
    }
    return () => {
      displayChannelRef.current?.close();
    };
  }, []);

  // Real-time synchronization with Customer Facing Display (Second Monitor)
  useEffect(() => {
    try {
      const statePayload = {
        cart,
        subtotal,
        tumblerDiscount,
        totalPayable,
        customerName,
        orderType,
        paymentMethod,
        hasTumbler,
        tableNumber: selectedTable,
        isCompleted: showSuccess,
        orderId: lastOrderId,
        dokuQrContent,
        dokuQrImageUrl,
        activeModifier: modifierProduct ? {
          productName: modifierProduct.name,
          productImage: modifierProduct.image,
          price: modifierProduct.price + modSizePrice + modShotPrice + (modMatcha >= 9 ? 2000 : (modMatcha >= 7 ? 1000 : 0)),
          iceLevel: modIce,
          sugarLevel: modSugar,
          matchaLevel: modMatcha,
          size: modSize,
          sizePrice: modSizePrice,
          shotName: modShot,
          shotCount: modShotCount,
          shotPrice: modShotPrice,
          shots: getEffectiveShots(modifierProduct.modifiers),
          sizes: getEffectiveSizes(modifierProduct.modifiers),
          showSweetness: modifierProduct.modifiers?.showSweetness !== false,
          showMatcha: modifierProduct.modifiers?.showMatcha === true,
          showEspressoShot: modifierProduct.modifiers?.showEspressoShot === true,
          defaultMatcha: modifierProduct.modifiers?.defaultMatcha ?? 5,
          activeStep,
        } : null,
        timestamp: Date.now(),
      };

      if (displayChannelRef.current) {
        displayChannelRef.current.postMessage(statePayload);
      }
      localStorage.setItem('pos_customer_display_state', JSON.stringify(statePayload));
    } catch {}
  }, [cart, subtotal, tumblerDiscount, totalPayable, customerName, orderType, paymentMethod, hasTumbler, selectedTable, showSuccess, lastOrderId, dokuQrContent, dokuQrImageUrl, modifierProduct, modIce, modSugar, modMatcha, modSize, modSizePrice, modShot, modShotCount, modShotPrice, activeStep]);

  // User activity tracker for Cashier POS to keep customer display active

  const lastUserActivityRef = useRef<number>(Date.now());
  useEffect(() => {
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastUserActivityRef.current >= 3000) {
        lastUserActivityRef.current = now;
        try {
          const currentSaved = localStorage.getItem('pos_customer_display_state');
          if (currentSaved) {
            const parsed = JSON.parse(currentSaved);
            parsed.timestamp = now;
            if (displayChannelRef.current) {
              displayChannelRef.current.postMessage(parsed);
            }
            localStorage.setItem('pos_customer_display_state', JSON.stringify(parsed));
          }
        } catch {}
      }
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
    };
  }, []);


  // Pre-order QR scan state
  const [showPreScanQR, setShowPreScanQR] = useState(false);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || p.categoryId === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, categoryFilter]);

  // Phone number auto-lookup with debounce
  const handlePhoneChange = (phone: string) => {
    setCustomerPhone(phone);
    setPhoneLookupResult(null);
    
    if (phoneDebounceRef.current) clearTimeout(phoneDebounceRef.current);
    if (phone.length < 8) return;
    
    phoneDebounceRef.current = setTimeout(async () => {
      setPhoneLookupLoading(true);
      try {
        const res = await fetch(`/api/cashier/lookup-phone?phone=${encodeURIComponent(phone)}`);
        const data = await res.json();
        if (data.found) {
          setPhoneLookupResult(data.user);
          if (!customerName) setCustomerName(data.user.name);
        }
      } catch {}
      finally { setPhoneLookupLoading(false); }
    }, 500);
  };

  // Handle pre-order QR scan result (Confirm Unique ID & Member)
  const handlePreScanResult = async (code: string) => {
    setShowPreScanQR(false);
    setPhoneLookupLoading(true);
    try {
      const res = await fetch(`/api/cashier/orders/lookup-customer?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (data.user) {
        setCustomerName(data.user.name);
        setPhoneLookupResult({
          id: data.user.id,
          name: data.user.name,
          phone: data.user.phone || '',
          points: data.user.points,
          referralCode: data.user.referralCode || data.user.id,
          arusLevel: data.user.arusLevel || 'Member',
        });
        showToast(`ID Unik Terkonfirmasi: ${data.user.name}`, 'success');
      } else {
        showToast('ID Unik / Kode Pelanggan tidak ditemukan', 'error');
      }
    } catch {
      showToast('Gagal memverifikasi ID Unik pelanggan', 'error');
    } finally {
      setPhoneLookupLoading(false);
    }
  };

  // Add to cart
  const handleProductClick = (product: POSProduct) => {
    if (product.isSoldOut) {
      showToast(`Stok menu "${product.name}" sedang habis!`, 'error');
      return;
    }

    if (!customerName.trim()) {
      showToast('Langkah 1: Harap isi Nama Pelanggan atau Scan Member terlebih dahulu!', 'error');
      const inputEl = document.getElementById('customer-name-input');
      if (inputEl) inputEl.focus();
      return;
    }

    const mods = product.modifiers;
    const effectiveSizes = getEffectiveSizes(mods);
    const effectiveShots = getEffectiveShots(mods);
    const hasModifiers = mods && (
      mods.showSweetness !== false ||
      mods.showMatcha === true ||
      effectiveShots.length > 0 ||
      effectiveSizes.length > 0 ||
      mods.iceLevel?.length ||
      mods.sugarLevel?.length ||
      (mods.addOns && mods.addOns.length > 0)
    );

    if (hasModifiers) {
      setModifierProduct(product);
      setModIce(mods?.defaultIce || mods?.iceLevel?.[0] || 'Normal Ice');
      setModSugar(mods?.defaultSugar || mods?.sugarLevel?.[0] || 'Biasa');
      setModMatcha(mods?.defaultMatcha ?? 5);
      const cupRegStock = packagingStock?.cupRegular ?? 999;
      const cupJumboStock = packagingStock?.cupJumbo ?? 999;

      if (cupRegStock <= 0 && cupJumboStock > 0 && !hasTumbler) {
        const largeOpt = effectiveSizes.find(
          (s) => s.name.toLowerCase().includes('large') || s.name.toLowerCase().includes('jumbo')
        );
        setModSize(largeOpt?.name || 'Large');
        setModSizePrice(largeOpt?.price ?? 3000);
      } else {
        const firstSize = effectiveSizes[0];
        setModSize(firstSize?.name || 'Regular');
        setModSizePrice(firstSize?.price || 0);
      }

      const firstShot = effectiveShots[0];
      setModShot(firstShot?.name || 'Single Shot');
      setModShotCount(firstShot?.shots || 1);
      setModShotPrice(firstShot?.price || 0);

      if (effectiveShots.length > 0) {
        setActiveStep('ESPRESSO');
      } else if (mods?.showMatcha) {
        setActiveStep('MATCHA');
      } else if (mods?.showSweetness !== false) {
        setActiveStep('SWEETNESS');
      } else if (effectiveSizes.length > 0) {
        setActiveStep('SIZE');
      } else {
        setActiveStep('ICE');
      }

      setModAddOns([]);
      setModQty(1);
    } else {
      addToCart(product, 'Normal Ice', 'Biasa', 5, 'Regular', 0, 'Single Shot', 1, 0, [], 1);
    }
  };

  const getMatchaCharge = (level?: number) => 0;

  const addToCart = (
    product: POSProduct,
    iceLevel: string,
    sugarLevel: string,
    matchaLevel: number,
    size: string,
    sizePrice: number,
    shotName: string,
    shotCount: number,
    shotPrice: number,
    addOns: { id: string; name: string; price: number }[],
    qty: number
  ) => {
    const addOnIds = addOns.map((a) => a.id).sort().join(',');
    const cartId = `${product.id}__${iceLevel}__${sugarLevel}__${matchaLevel}__${size}__${shotName}__${addOnIds}`;
    const addOnTotal = addOns.reduce((sum, a) => sum + a.price, 0);
    const matchaCharge = getMatchaCharge(matchaLevel);
    const itemPrice = product.price + sizePrice + shotPrice + addOnTotal + matchaCharge;

    setCart((prev) => {
      const existing = prev.find((i) => i.id === cartId);
      if (existing) {
        return prev.map((i) =>
          i.id === cartId
            ? { ...i, quantity: i.quantity + qty, totalPrice: itemPrice * (i.quantity + qty) }
            : i
        );
      }
      return [
        ...prev,
        {
          id: cartId,
          productId: product.id,
          name: product.name,
          basePrice: product.price,
          quantity: qty,
          iceLevel,
          sugarLevel,
          matchaLevel,
          size,
          sizePrice,
          shotName,
          shotCount,
          shotPrice,
          addOns,
          totalPrice: itemPrice * qty,
          image: product.image,
        },
      ];
    });
  };

  const handleModifierConfirm = () => {
    if (!modifierProduct) return;

    if (!hasTumbler) {
      const isLarge = modSize.toLowerCase().includes('large') || modSize.toLowerCase().includes('jumbo');
      const isRegular = modSize.toLowerCase().includes('normal') || modSize.toLowerCase().includes('regular');
      const cupRegStock = packagingStock?.cupRegular ?? 999;
      const cupJumboStock = packagingStock?.cupJumbo ?? 999;

      if (isRegular && cupRegStock <= 0) {
        showToast('Cup Regular sedang habis! Silakan pilih Jumbo atau gunakan Tumbler.', 'error');
        return;
      }
      if (isLarge && cupJumboStock <= 0) {
        showToast('Cup Jumbo sedang habis! Silakan pilih Regular atau gunakan Tumbler.', 'error');
        return;
      }
    }

    addToCart(modifierProduct, modIce, modSugar, modMatcha, modSize, modSizePrice, modShot, modShotCount, modShotPrice, modAddOns, modQty);
    setModifierProduct(null);
  };

  const updateCartQty = (id: string, newQty: number) => {
    if (newQty <= 0) {
      setCart((prev) => prev.filter((i) => i.id !== id));
    } else {
      setCart((prev) =>
        prev.map((i) => {
          if (i.id !== id) return i;
          const unitPrice = i.quantity > 0 ? (i.totalPrice / i.quantity) : (i.basePrice + (i.sizePrice || 0) + (i.shotPrice || 0) + getMatchaCharge(i.matchaLevel) + i.addOns.reduce((s, a) => s + a.price, 0));
          return {
            ...i,
            quantity: newQty,
            totalPrice: unitPrice * newQty,
          };
        })
      );
    }
  };

  const handleUpdateTableSeats = async (id: string, newOccupied: number) => {
    try {
      const res = await fetch(`/api/admin/tables/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ occupiedSeats: newOccupied })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui kursi');
      
      // Update local activeTables state
      setActiveTables(prev => prev.map(t => t.id === id ? data : t));
      showToast(`Meja ${data.number} diperbarui menjadi ${newOccupied} kursi terisi`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Submit order
  const handleSubmitOrder = async () => {
    if (isSubmitting) return;
    if (cart.length === 0 || !customerName) return;
    
    if (orderType === 'DINE_IN' && !selectedTable) {
      showToast('Harap pilih meja terlebih dahulu', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        userId: phoneLookupResult?.id || null,
        orderType,
        customerName,
        customerPhone: customerPhone || phoneLookupResult?.phone || '-',
        address: orderType === 'DELIVERY' ? address : (orderType === 'DINE_IN' ? `Dine In - Meja ${selectedTable}` : ''),
        tableNumber: orderType === 'DINE_IN' ? selectedTable : undefined,
        peopleCount: orderType === 'DINE_IN' ? posPeopleCount : undefined,
        notes,
        paymentMethod,
        hasTumbler,
        isQrisConfirm: paymentMethod === 'QRIS',
        invoiceNumber: currentInvoiceNumber || pendingQrisInvoiceRef.current || undefined,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          addOnIds: item.addOns.map((a) => a.id),
          sizePrice: item.sizePrice || 0,
          shotPrice: item.shotPrice || 0,
          matchaLevel: item.matchaLevel,
          modsString: `${item.matchaLevel !== undefined ? `Matcha Lvl: ${item.matchaLevel}, ` : ''}${item.iceLevel}, ${item.sugarLevel}${item.addOns.length > 0 ? ', +' + item.addOns.map((a) => a.name).join(', +') : ''}`,
        })),
      };

      const res = await fetch('/api/cashier/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Gagal membuat pesanan');

      setLastOrderId(data.orderId);
      setShowSuccess(true);

      const wasPointsAwarded = data.pointsAwarded;
      const earnedPoints = data.pointsEarned || 0;
      const memberName = phoneLookupResult?.name || customerName;

      // Broadcast completed state payload to second monitor display FIRST before clearing cart
      const completedPayload = {
        cart,
        subtotal,
        tumblerDiscount,
        totalPayable,
        customerName: memberName || customerName,
        orderType,
        paymentMethod,
        hasTumbler,
        tableNumber: selectedTable,
        isCompleted: true,
        orderId: data.orderId,
        dokuQrContent,
        dokuQrImageUrl,
        timestamp: Date.now(),
      };

      if (displayChannelRef.current) {
        try {
          displayChannelRef.current.postMessage(completedPayload);
        } catch {}
      }
      try {
        localStorage.setItem('pos_customer_display_state', JSON.stringify(completedPayload));
      } catch {}

      if (wasPointsAwarded) {
        showToast(`Pesanan berhasil! +${earnedPoints} Poin reward otomatis ditambahkan ke akun ${memberName}`, 'success');
      }

      // Reset form after short delay so second monitor retains completed state smoothly
      setTimeout(() => {
        pendingQrisInvoiceRef.current = null;
        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setPhoneLookupResult(null);
        setAddress('');
        setNotes('');
        setHasTumbler(false);
        setSelectedTable('');
        setPosPeopleCount(1);
      }, 600);

      setTimeout(() => {
        setShowSuccess(false);
      }, 4000);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenShift = async () => {
    setShiftSaving(true);
    try {
      const res = await fetch('/api/cashier/shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openingCash: parseInt(openShiftCash) || 0 }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Gagal membuka shift');
      setShowOpenShiftModal(false);
      showToast('Shift kasir berhasil dibuka', 'success');
      fetchShiftData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setShiftSaving(false);
    }
  };

  const handleCloseShift = async () => {
    setShiftSaving(true);
    try {
      const res = await fetch('/api/cashier/shift', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualCash: parseInt(actualCashInput) || 0,
          notes: shiftCloseNotes,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Gagal menutup shift');
      setShowCloseShiftModal(false);
      showToast(`Shift ditutup. ${d.reconciliation?.varianceStatus || ''}`, 'success');
      fetchShiftData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setShiftSaving(false);
    }
  };

  const handlePettyCashSubmit = async () => {
    if (!pettyCashForm.name || !pettyCashForm.amount) {
      showToast('Nama dan nominal kas keluar wajib diisi', 'error');
      return;
    }
    setShiftSaving(true);
    try {
      const res = await fetch('/api/cashier/petty-cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pettyCashForm),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Gagal mencatat kas keluar');
      setShowPettyCashModal(false);
      setPettyCashForm({ name: '', amount: '', notes: '' });
      showToast('Kas keluar berhasil dicatat', 'success');
      fetchShiftData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setShiftSaving(false);
    }
  };

  const toggleAddOn = (addOn: { id: string; name: string; price: number }) => {
    setModAddOns((prev) =>
      prev.find((a) => a.id === addOn.id)
        ? prev.filter((a) => a.id !== addOn.id)
        : [...prev, addOn]
    );
  };

  const activeShift = shiftData?.activeShift;
  const recon = shiftData?.reconciliation;

  return (
    <div className="space-y-6">
      {/* Header with Dual Display & Shift Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-150/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200">
              Terminal POS
            </span>
            <span className="text-xs font-semibold text-slate-300">•</span>
            {activeShift ? (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Shift Aktif (Modal: {formatRupiah(activeShift.openingCash)})
              </span>
            ) : (
              <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                Shift Belum Dibuka
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Kasir Arum Seduh
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {activeShift && recon
              ? `Kas Laci Seharusnya: ${formatRupiah(recon.expectedCash)} (Tunai: +${formatRupiah(recon.cashIn)} | Keluar: -${formatRupiah(recon.cashOut)})`
              : 'Sistem kasir real-time terhubung layar monitor 2 dan manajemen laci kasir'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Petty Cash Button */}
          {activeShift && (
            <button
              type="button"
              onClick={() => setShowPettyCashModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-all active:scale-95 shadow-sm"
              title="Catat pengeluaran kecil dari laci"
            >
              <ArrowDownRight className="w-3.5 h-3.5 text-amber-600" />
              Kas Keluar (Petty Cash)
            </button>
          )}

          {/* Open / Close Shift Button */}
          {activeShift ? (
            <button
              type="button"
              onClick={() => {
                setActualCashInput(recon?.expectedCash ? String(recon.expectedCash) : '');
                setShowCloseShiftModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold transition-all active:scale-95"
            >
              <Lock className="w-3.5 h-3.5 text-slate-600" />
              Tutup Shift
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowOpenShiftModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm transition-all active:scale-95"
            >
              <Unlock className="w-3.5 h-3.5" />
              Buka Shift Kasir
            </button>
          )}

          {/* Customer Display Button */}
          <button
            type="button"
            onClick={() => {
              window.open('/display', 'CustomerDisplayWindow', 'width=1280,height=800');
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-extrabold shadow-md shadow-orange-500/20 hover:opacity-95 transition-all active:scale-95"
          >
            <Monitor className="w-3.5 h-3.5" />
            Layar Monitor 2
          </button>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* LEFT: Product Grid */}
        <div className="xl:col-span-3 space-y-4">
          {/* Step 1 Requirement Banner */}
          {!customerName.trim() && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-900 shadow-sm animate-pulse">
              <span className="font-semibold flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black flex items-center justify-center text-[11px] shrink-0">1</span>
                Isi <strong>Nama Pelanggan</strong> atau <strong>Scan Member</strong> di kolom kanan terlebih dahulu sebelum memilih produk.
              </span>
            </div>
          )}

          {/* Search + Category Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Cari produk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                categoryFilter === 'all'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                  : 'bg-white border border-border/40 text-muted-foreground hover:bg-muted/60'
              }`}
            >
              Semua
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  categoryFilter === cat.id
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                    : 'bg-white border border-border/40 text-muted-foreground hover:bg-muted/60'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => handleProductClick(product)}
                className={`group bg-white rounded-2xl border shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-200 overflow-hidden text-left relative ${
                  product.isSoldOut
                    ? 'opacity-60 border-slate-200 cursor-not-allowed bg-slate-50'
                    : 'hover:shadow-md hover:border-orange-300 border-border/40'
                }`}
              >
                <div className="relative aspect-square bg-muted/30 overflow-hidden">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className={`w-full h-full object-cover transition-transform duration-300 ${
                        product.isSoldOut ? 'grayscale opacity-60' : 'group-hover:scale-105'
                      }`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                      <Coffee className="w-8 h-8" />
                    </div>
                  )}

                  {product.isSoldOut ? (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center">
                      <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-extrabold text-[10px] uppercase tracking-wider shadow-md">
                        Stok Habis
                      </span>
                    </div>
                  ) : product.badge ? (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[9px] font-black uppercase tracking-wider shadow-sm">
                      {product.badge}
                    </span>
                  ) : null}
                </div>

                <div className="p-3">
                  <p className="text-[13px] font-semibold text-foreground line-clamp-1">{product.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{product.categoryName}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm font-bold text-orange-600">{formatRupiah(product.price)}</p>
                    {product.isSoldOut && (
                      <span className="text-[10px] font-bold text-rose-600">Habis</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: Cart & Order Panel */}
        <div className="xl:col-span-2 space-y-4">
          {/* Order Type Tabs */}
          <div className="bg-white rounded-2xl border border-border/40 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-1.5">
            <div className="grid grid-cols-2 gap-1.5">
              {([
                { type: 'PICKUP' as OrderType, label: 'Pickup', icon: ShoppingBag },
                { type: 'DINE_IN' as OrderType, label: 'Dine In', icon: Coffee },
              ]).map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    orderType === type
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                      : 'text-muted-foreground hover:bg-muted/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-white rounded-2xl border border-border/40 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">Detail Pelanggan</p>
              <div className="flex items-center gap-2">
                {orderType === 'DINE_IN' && (
                  <button
                    type="button"
                    onClick={() => setShowTableManagerModal(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-orange-600 text-[10px] font-bold hover:bg-amber-100 transition-colors"
                  >
                    <Coffee className="w-3 h-3" /> Meja
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPreScanQR(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white text-xs font-bold shadow-sm hover:shadow transition-all active:scale-[0.97]"
                >
                  <QrCode className="w-3.5 h-3.5" /> Scan ID / QR Member
                </button>
              </div>
            </div>

            {/* Input Primary: Nama Pelanggan */}
            <div>
              <div className="flex items-center justify-between mb-1.5 pl-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  Nama Pelanggan <span className="text-red-500">*</span>
                </label>
                {!customerName.trim() ? (
                  <span className="text-[10px] font-extrabold text-orange-600 bg-amber-100/80 px-2 py-0.5 rounded-md border border-orange-300 animate-pulse">
                    Langkah 1: Isi Nama / Scan Member
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-300">
                    ✓ Pelanggan Aktif
                  </span>
                )}
              </div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <input
                  id="customer-name-input"
                  type="text"
                  placeholder="Isi nama pelanggan..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all font-medium ${
                    !customerName.trim() ? 'bg-amber-50/50 border-orange-300/80' : 'bg-muted/30 border-border/40'
                  }`}
                />
              </div>
            </div>

            {/* Confirmed Member Card (Unique ID scan confirmation) */}
            {phoneLookupResult ? (
              <div className="p-3 rounded-xl bg-emerald-50/90 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                      <CheckCircle2 className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        {phoneLookupResult.name}
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-200/80 text-emerald-900 uppercase tracking-wider">
                          ID Terkonfirmasi
                        </span>
                      </p>
                      <p className="text-[10px] text-emerald-700 font-medium">
                        ID: #{phoneLookupResult.referralCode || phoneLookupResult.id.slice(0, 8)} · {phoneLookupResult.points} Poin ({phoneLookupResult.arusLevel || 'Member'})
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneLookupResult(null);
                      setCustomerPhone('');
                    }}
                    className="p-1 text-emerald-600 hover:text-rose-600 transition-colors"
                    title="Batalkan Member"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-2 rounded-lg bg-white/70 border border-emerald-100 text-[10px] font-semibold text-emerald-800 flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Poin reward otomatis ditambahkan ke aplikasi saat pesanan dibuat!
                </div>
              </div>
            ) : (
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                <input
                  type="tel"
                  placeholder="Cari no. HP member (opsional)..."
                  value={customerPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs bg-muted/20 border border-border/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500/20 text-muted-foreground"
                />
                {phoneLookupLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-amber-600" />}
              </div>
            )}

            {orderType === 'DELIVERY' && (
              <textarea
                placeholder="Alamat pengiriman *"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all resize-none"
              />
            )}

            {orderType === 'DINE_IN' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1 pl-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Nomor Meja *</label>
                    <button
                      type="button"
                      onClick={() => setShowPosTablePicker(true)}
                      className="text-[10px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Coffee className="w-3 h-3" /> Denah 2D
                    </button>
                  </div>
                  <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
                  >
                    <option value="">Pilih Nomor Meja</option>
                    {activeTables.map((t) => (
                      <option key={t.id} value={t.number} disabled={(t.occupiedSeats || 0) >= t.capacity}>
                        Meja {t.number} ({t.occupiedSeats || 0}/{t.capacity} terisi)
                      </option>
                    ))}
                    {activeTables.length === 0 && (
                      <>
                        <option value="1">Meja 1</option>
                        <option value="2">Meja 2</option>
                        <option value="3">Meja 3</option>
                        <option value="4">Meja 4</option>
                        <option value="5">Meja 5</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1 pl-1">Jumlah Orang *</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={posPeopleCount}
                    onChange={(e) => setPosPeopleCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
                  />
                </div>
              </div>
            )}

            <input
              type="text"
              placeholder="Catatan (opsional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
            />

            {/* Tumbler Toggle - Only for Pickup/Dine-in and Registered Member */}
            {orderType !== 'DELIVERY' && (
              phoneLookupResult ? (
                <button
                  type="button"
                  onClick={() => setHasTumbler(!hasTumbler)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                    hasTumbler
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-border/40 bg-muted/20 hover:border-emerald-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                    hasTumbler ? 'bg-emerald-500' : 'bg-gray-100'
                  }`}>
                    <Leaf className={`w-4 h-4 ${hasTumbler ? 'text-white' : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold ${hasTumbler ? 'text-emerald-700' : 'text-muted-foreground'}`}>
                      Pelanggan Bawa Tumbler 🌿
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Bonus +{loyaltySettings?.tumblerBonusPoints || 0} poin & diskon {loyaltySettings?.tumblerDiscountPct || 0}%
                    </p>
                  </div>
                  <div className={`w-9 h-5 rounded-full transition-colors shrink-0 relative ${
                    hasTumbler ? 'bg-emerald-500' : 'bg-gray-200'
                  }`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${
                      hasTumbler ? 'left-[18px]' : 'left-0.5'
                    }`} />
                  </div>
                </button>
              ) : (
                <div className="p-3 rounded-xl border border-dashed border-border bg-muted/10 text-center">
                  <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                    Bawa Tumbler? Masukkan nomor HP member di atas untuk mendapatkan bonus poin & diskon tumbler. 🌿
                  </p>
                </div>
              )
            )}
          </div>

          {/* Cart Items */}
          <div className="bg-white rounded-2xl border border-border/40 shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="px-4 py-3 border-b border-border/30">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
                Keranjang ({totalItems} item)
              </p>
            </div>

            {cart.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground/50">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Klik produk untuk menambahkan</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30 max-h-[320px] overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-foreground truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {item.iceLevel} · {item.sugarLevel}
                        {item.addOns.length > 0 && ` · +${item.addOns.map((a) => a.name).join(', ')}`}
                      </p>
                      <p className="text-xs font-bold text-orange-600 mt-0.5">{formatRupiah(item.totalPrice)}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateCartQty(item.id, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                      >
                        {item.quantity <= 1 ? <Trash2 className="w-3 h-3 text-red-500" /> : <Minus className="w-3 h-3" />}
                      </button>
                      <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQty(item.id, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Payment & Total */}
            {cart.length > 0 && (
              <div className="border-t border-border/30 p-4 space-y-3">
                {/* Payment method */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1.5 pl-1">
                    Metode Pembayaran
                  </label>
                  <div className="flex gap-2">
                    {['CASH', 'QRIS'].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method as 'CASH' | 'QRIS')}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          paymentMethod === method
                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md scale-[1.02]'
                            : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {method === 'QRIS' ? '📱 QRIS DOKU' : '💵 TUNAI (CASH)'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* QRIS Active Notice & Proceed Button */}
                {paymentMethod === 'QRIS' && !isQrisConfirmed && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-3">
                    <p className="text-xs font-semibold text-amber-900 leading-relaxed">
                      Tekan tombol di bawah untuk men-generate kode QRIS DOKU dan menayangkannya pada Layar Pelanggan.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsQrisConfirmed(true)}
                      disabled={cart.length === 0 || !customerName.trim()}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      🚀 Lanjutkan ke QRIS (Generasikan QR Code)
                    </button>
                  </div>
                )}

                {paymentMethod === 'QRIS' && isQrisConfirmed && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs text-emerald-950 font-medium">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
                        <span>Kode QRIS aktif! Menunggu pembayaran...</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('CASH');
                        setIsQrisConfirmed(false);
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 border border-orange-300 shadow-sm"
                    >
                      💵 Pelanggan Ganti ke Tunai (Batalkan QRIS)
                    </button>
                  </div>
                )}

                {hasTumbler && tumblerDiscount > 0 && (
                  <div className="flex justify-between items-center text-xs text-emerald-600 font-semibold px-1">
                    <span className="flex items-center gap-1"><Leaf className="w-3.5 h-3.5" /> Diskon Tumbler ({loyaltySettings?.tumblerDiscountPct}%)</span>
                    <span>-{formatRupiah(tumblerDiscount)}</span>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between items-center pt-1">
                  <span className="text-sm font-semibold text-foreground">Total Pembayaran</span>
                  <span className="text-xl font-black text-orange-600">{formatRupiah(totalPayable)}</span>
                </div>

                {/* Submit */}
                <button
                  type="button"
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting || !customerName || cart.length === 0}
                  className={`w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2 ${
                    paymentMethod === 'QRIS'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
                      : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memproses Transaksi...
                    </>
                  ) : paymentMethod === 'QRIS' ? (
                    <>
                      <Check className="w-4 h-4" />
                      ✓ Konfirmasi QRIS Lunas ({formatRupiah(totalPayable)})
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      💰 Selesaikan & Bayar Tunai ({formatRupiah(totalPayable)})
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modifier Modal */}
      <AnimatePresence>
        {modifierProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setModifierProduct(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-border overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-border/30">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-heading font-bold text-lg">{modifierProduct.name}</h3>
                    <p className="text-sm text-orange-600 font-semibold">{formatRupiah(modifierProduct.price)}</p>
                  </div>
                  <button onClick={() => setModifierProduct(null)} className="p-1.5 hover:bg-muted rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
                {(() => {
                  const effectiveSizes = getEffectiveSizes(modifierProduct.modifiers);
                  const effectiveShots = getEffectiveShots(modifierProduct.modifiers);
                  return (
                    <>
                      {/* Step Focus Bar (Display Sync Control) */}
                      <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-100 border border-slate-200 overflow-x-auto">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1.5 shrink-0">Focus Display:</span>
                        {effectiveShots.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setActiveStep('ESPRESSO')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                              activeStep === 'ESPRESSO' ? 'bg-amber-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            ☕ Espresso
                          </button>
                        )}
                        {modifierProduct.modifiers?.showMatcha && (
                          <button
                            type="button"
                            onClick={() => setActiveStep('MATCHA')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                              activeStep === 'MATCHA' ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            🍵 Matcha
                          </button>
                        )}
                        {modifierProduct.modifiers?.showSweetness !== false && (
                          <button
                            type="button"
                            onClick={() => setActiveStep('SWEETNESS')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                              activeStep === 'SWEETNESS' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            🍯 Manis
                          </button>
                        )}
                        {modifierProduct.modifiers?.showSweetness !== false && (
                          <button
                            type="button"
                            onClick={() => setActiveStep('ICE')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                              activeStep === 'ICE' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            🧊 Es Batu
                          </button>
                        )}
                        {effectiveSizes.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setActiveStep('SIZE')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                              activeStep === 'SIZE' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            🥤 Ukuran Gelas
                          </button>
                        )}
                      </div>

                      {/* Espresso Shot Options */}
                      {effectiveShots.length > 0 && (
                        <div
                          onClick={() => setActiveStep('ESPRESSO')}
                          className={`p-3 rounded-2xl border transition-all ${
                            activeStep === 'ESPRESSO' ? 'border-amber-800 bg-amber-50/70 shadow-sm' : 'border-border/40'
                          }`}
                        >
                          <p className="text-xs font-bold text-amber-950 uppercase tracking-wider mb-2 flex items-center justify-between">
                            <span>☕ Espresso Shot</span>
                            <span className="text-[10px] text-amber-800 font-semibold">{modShot} {modShotPrice > 0 ? `(+${formatRupiah(modShotPrice)})` : ''}</span>
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {effectiveShots.map((st) => (
                              <button
                                key={st.name}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setModShot(st.name);
                                  setModShotCount(st.shots || 1);
                                  setModShotPrice(st.price);
                                  setActiveStep('ESPRESSO');
                                }}
                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                  modShot === st.name
                                    ? 'bg-amber-800 text-white shadow-sm'
                                    : 'bg-white border border-border/60 text-foreground hover:border-amber-400'
                                }`}
                              >
                                <span>{st.name}</span>
                                <span className="text-[10px] opacity-80">{st.price > 0 ? `(+${formatRupiah(st.price)})` : 'Gratis'}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Size Options */}
                      {effectiveSizes.length > 0 && (
                        <div
                          onClick={() => setActiveStep('SIZE')}
                          className={`p-3 rounded-2xl border transition-all ${
                            activeStep === 'SIZE' ? 'border-indigo-500 bg-indigo-50/50 shadow-sm' : 'border-border/40'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                            <p className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                              <span>🥤 Ukuran Gelas</span>
                              {packStock.cupJumbo <= 0 && (
                                <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                  Cup Jumbo Habis
                                </span>
                              )}
                              {packStock.cupRegular <= 0 && (
                                <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                  Cup Regular Habis
                                </span>
                              )}
                            </p>
                            <span className="text-[10px] text-indigo-600 font-semibold">
                              {modSize} {modSizePrice > 0 ? `(+${formatRupiah(modSizePrice)})` : ''}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {effectiveSizes.map((sz) => {
                              const isLarge = sz.name.toLowerCase().includes('large') || sz.name.toLowerCase().includes('jumbo');
                              const isRegular = sz.name.toLowerCase().includes('normal') || sz.name.toLowerCase().includes('regular');
                              const isOutOfStock = (isLarge && packStock.cupJumbo <= 0) || (isRegular && packStock.cupRegular <= 0);

                              return (
                                <button
                                  key={sz.name}
                                  type="button"
                                  disabled={isOutOfStock && !hasTumbler}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModSize(sz.name);
                                    setModSizePrice(sz.price);
                                    setActiveStep('SIZE');
                                  }}
                                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    isOutOfStock && !hasTumbler
                                      ? 'bg-slate-100 text-slate-400 border border-slate-200 opacity-60 cursor-not-allowed line-through'
                                      : modSize === sz.name
                                      ? 'bg-indigo-600 text-white shadow-sm'
                                      : 'bg-white border border-border/60 text-foreground hover:border-indigo-300'
                                  }`}
                                >
                                  <span>{sz.name}</span>
                                  <span className="text-[10px] opacity-80">
                                    {sz.price > 0 ? `(+${formatRupiah(sz.price)})` : 'Gratis'}
                                  </span>
                                  {isOutOfStock && !hasTumbler && (
                                    <span className="text-[9px] text-rose-600 font-extrabold">(Habis)</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Ice Level */}
                {modifierProduct.modifiers?.showSweetness !== false && (
                  <div
                    onClick={() => setActiveStep('ICE')}
                    className={`p-3 rounded-2xl border transition-all ${
                      activeStep === 'ICE' ? 'border-cyan-500 bg-cyan-50/50 shadow-sm' : 'border-border/40'
                    }`}
                  >
                    <p className="text-xs font-bold text-cyan-900 uppercase tracking-wider mb-2">🧊 Ice Level (Level Es)</p>
                    <div className="flex flex-wrap gap-2">
                      {['Normal Ice', 'Less Ice', 'No Ice'].map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setModIce(level);
                            setActiveStep('ICE');
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            modIce === level
                              ? 'bg-cyan-600 text-white shadow-sm'
                              : 'bg-white border border-border/60 text-foreground hover:bg-muted'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sugar Level */}
                {modifierProduct.modifiers?.showSweetness !== false && (
                  <div
                    onClick={() => setActiveStep('SWEETNESS')}
                    className={`p-3 rounded-2xl border transition-all ${
                      activeStep === 'SWEETNESS' ? 'border-amber-500 bg-amber-50/50 shadow-sm' : 'border-border/40'
                    }`}
                  >
                    <p className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2">🍯 Kemanisan (Sugar Level)</p>
                    <div className="flex flex-wrap gap-2">
                      {['Less', 'Biasa', 'Lumayan', 'Manis Sekali'].map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setModSugar(level);
                            setActiveStep('SWEETNESS');
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            modSugar === level || (level === 'Biasa' && modSugar === 'Normal Sugar') || (level === 'Less' && modSugar === 'Less Sugar')
                              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                              : 'bg-white border border-border/60 text-foreground hover:bg-muted'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matcha Intensity */}
                {modifierProduct.modifiers?.showMatcha === true && (
                  <div
                    onClick={() => setActiveStep('MATCHA')}
                    className={`p-3 rounded-2xl border transition-all ${
                      activeStep === 'MATCHA' ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' : 'border-border/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                        🍵 Kepekatan Matcha
                      </p>
                      <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                        Level {modMatcha} {modMatcha >= 9 ? '(+Rp 2.000)' : (modMatcha >= 7 ? '(+Rp 1.000)' : '')}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={modMatcha}
                      onChange={(e) => {
                        setModMatcha(parseInt(e.target.value));
                        setActiveStep('MATCHA');
                      }}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gradient-to-r from-emerald-100 via-emerald-400 to-emerald-900"
                    />
                    <div className="flex justify-between text-[9px] text-muted-foreground font-semibold px-0.5 select-none pt-1">
                      <span>Subtle (1)</span>
                      <span>Standard (5)</span>
                      <span>Extra Strong (10)</span>
                    </div>
                  </div>
                )}

                {/* Add-ons */}
                {modifierProduct.modifiers?.addOns && modifierProduct.modifiers.addOns.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Add-ons</p>
                    <div className="space-y-2">
                      {modifierProduct.modifiers.addOns.map((addOn) => {
                        const selected = modAddOns.find((a) => a.id === addOn.id);
                        return (
                          <button
                            key={addOn.id}
                            onClick={() => toggleAddOn(addOn)}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                              selected
                                ? 'border-amber-500 bg-amber-50'
                                : 'border-border/40 hover:border-orange-300'
                            }`}
                          >
                            <span className="text-sm font-medium">{addOn.name}</span>
                            <span className="text-xs font-semibold text-orange-600">+{formatRupiah(addOn.price)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Jumlah</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setModQty(Math.max(1, modQty - 1))}
                      className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-lg font-bold w-8 text-center">{modQty}</span>
                    <button
                      onClick={() => setModQty(modQty + 1)}
                      className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Confirm button */}
              <div className="p-5 border-t border-border/30">
                <button
                  onClick={handleModifierConfirm}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold text-sm hover:shadow-md transition-all active:scale-[0.98]"
                >
                  Tambah ke Pesanan — {formatRupiah(
                    (modifierProduct.price + modSizePrice + modShotPrice + getMatchaCharge(modMatcha) + modAddOns.reduce((s, a) => s + a.price, 0)) * modQty
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Scan + Points Modal */}
      <AnimatePresence>
        {showQRModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-border overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-border/30 bg-gradient-to-r from-amber-50 to-amber-100/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center">
                    <QrCode className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-lg text-foreground">Scan QR Pelanggan</h3>
                    <p className="text-xs text-muted-foreground">Order #{lastOrderId.slice(0, 8).toUpperCase()} berhasil dibuat</p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {!pointsAwarded ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-3">Scan QR pelanggan untuk menambahkan poin dan menghubungkan pesanan ke akun.</p>
                    
                    {/* Camera QR Scanner */}
                    <QRCameraScanner
                      onScan={(result) => {
                        setQrInput(result);
                        // Auto-lookup customer
                        setQrLoading(true);
                        fetch(`/api/cashier/orders/lookup-customer?code=${encodeURIComponent(result)}`)
                          .then(r => r.json())
                          .then(d => {
                            if (d.user) { setQrCustomer(d.user); setQrError(''); }
                            else { setQrError('Pelanggan tidak ditemukan'); setQrCustomer(null); }
                          })
                          .catch(() => setQrError('Gagal mencari pelanggan'))
                          .finally(() => setQrLoading(false));
                      }}
                      placeholder="Masukkan kode referral pelanggan..."
                    />
                    {qrLoading && <div className="flex justify-center py-2"><Loader2 className="w-5 h-5 animate-spin text-amber-600" /></div>}
                    {qrError && <p className="text-xs text-red-500 font-medium">{qrError}</p>}

                    {/* Customer found */}
                    {qrCustomer && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl bg-green-50 border border-green-200 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-green-800">{qrCustomer.name}</p>
                            <p className="text-xs text-green-600">Poin saat ini: {qrCustomer.points}</p>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            setQrLoading(true);
                            try {
                              const res = await fetch('/api/cashier/orders/award-points', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ orderId: lastOrderId, userId: qrCustomer.id }),
                              });
                              if (res.ok) { setPointsAwarded(true); }
                              else { setQrError('Gagal menambahkan poin'); }
                            } catch { setQrError('Gagal menambahkan poin'); }
                            finally { setQrLoading(false); }
                          }}
                          disabled={qrLoading}
                          className="w-full py-2.5 rounded-xl bg-green-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50">
                          <Gift className="w-4 h-4" /> Tambahkan Poin & Hubungkan Order
                        </button>
                      </motion.div>
                    )}

                    <div className="flex gap-2 pt-2">
                      {!qrCustomer && (
                        <button onClick={() => {
                          setQrLoading(true);
                          fetch(`/api/cashier/orders/lookup-customer?code=${encodeURIComponent(qrInput.trim())}`)
                            .then(r => r.json())
                            .then(d => {
                              if (d.user) { setQrCustomer(d.user); setQrError(''); }
                              else { setQrError('Pelanggan tidak ditemukan'); }
                            })
                            .catch(() => setQrError('Gagal'))
                            .finally(() => setQrLoading(false));
                        }}
                          disabled={!qrInput.trim() || qrLoading}
                          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-sm disabled:opacity-50">
                          Cari Pelanggan
                        </button>
                      )}
                      <button onClick={() => { setShowQRModal(false); setShowSuccess(true); setTimeout(() => setShowSuccess(false), 3000); }}
                        className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted/50 flex items-center justify-center gap-1">
                        <SkipForward className="w-3.5 h-3.5" /> Lewati
                      </button>
                    </div>
                  </>
                ) : (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-green-600" />
                    </div>
                    <h4 className="font-bold text-lg text-foreground mb-1">Poin Berhasil Ditambahkan!</h4>
                    <p className="text-sm text-muted-foreground">Order dihubungkan ke akun {qrCustomer?.name}</p>
                    <button onClick={() => { setShowQRModal(false); setShowSuccess(true); setTimeout(() => setShowSuccess(false), 3000); }}
                      className="mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-sm">
                      Selesai
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pre-order QR Scan Modal (Unique ID confirmation) */}
      <AnimatePresence>
        {showPreScanQR && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setShowPreScanQR(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-border overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-border/30 bg-gradient-to-r from-amber-50 to-amber-100/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-amber-600" />
                  <div>
                    <h3 className="font-heading font-bold text-base text-foreground">Scan ID Unik / QR Pelanggan</h3>
                    <p className="text-[10px] text-muted-foreground">Konfirmasi akun & auto-tambah reward saat transaksi</p>
                  </div>
                </div>
                <button onClick={() => setShowPreScanQR(false)} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Arahkan kamera ke QR Code aplikasi pelanggan atau masukkan ID Unik / Kode Referral secara manual.
                </p>
                <QRCameraScanner
                  onScan={handlePreScanResult}
                  placeholder="Ketik ID Unik / Kode Referral / No HP..."
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table Manager Modal */}
      <AnimatePresence>
        {showTableManagerModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setShowTableManagerModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-border overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-border/30 flex items-center justify-between bg-gradient-to-r from-amber-50 to-amber-100/30">
                <div className="flex items-center gap-2">
                  <Coffee className="w-5 h-5 text-amber-600" />
                  <h3 className="font-heading font-bold text-base text-foreground">Kelola Status Meja & Kursi (Manual)</h3>
                </div>
                <button onClick={() => setShowTableManagerModal(false)} className="p-1.5 hover:bg-muted rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4">
                <p className="text-xs text-muted-foreground">
                  Kasir/Admin dapat mengisi atau mengosongkan kapasitas kursi pada masing-masing meja secara manual. Perubahan akan langsung disinkronkan ke database.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeTables.map((t) => {
                    const remaining = t.capacity - (t.occupiedSeats || 0);
                    return (
                      <div key={t.id} className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-bold text-sm text-foreground">Meja {t.number}</h4>
                            <span className="text-[10px] text-muted-foreground">
                              Kapasitas: {t.capacity} Kursi ({remaining} Tersisa)
                            </span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                            t.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' :
                            t.status === 'OCCUPIED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {t.status === 'AVAILABLE' ? 'Tersedia' : t.status === 'OCCUPIED' ? 'Terisi' : t.status}
                          </span>
                        </div>

                        {/* Chairs dot indicator */}
                        <div className="flex gap-1.5 flex-wrap py-1">
                          {Array.from({ length: t.capacity }).map((_, idx) => (
                            <span
                              key={idx}
                              className={`w-3.5 h-3.5 rounded-full border border-slate-200 ${
                                idx < (t.occupiedSeats || 0) ? 'bg-rose-500' : 'bg-emerald-400'
                              }`}
                            />
                          ))}
                        </div>

                        <div className="flex justify-between items-center gap-2 pt-2 border-t border-border/30">
                          <span className="text-xs font-bold text-foreground">Kursi Terisi: {t.occupiedSeats || 0}</span>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateTableSeats(t.id, (t.occupiedSeats || 0) - 1)}
                              disabled={(t.occupiedSeats || 0) <= 0}
                              className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center font-black disabled:opacity-40"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateTableSeats(t.id, (t.occupiedSeats || 0) + 1)}
                              disabled={(t.occupiedSeats || 0) >= t.capacity}
                              className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center font-black disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {activeTables.length === 0 && (
                    <div className="col-span-2 text-center py-6 text-xs text-muted-foreground">
                      Tidak ada data meja aktif. Silakan tambahkan meja di halaman Desainer Meja.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-50 px-6 py-4 rounded-2xl bg-green-600 text-white shadow-2xl flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold">Pesanan berhasil dibuat!</p>
              <p className="text-xs text-green-100">#{lastOrderId.slice(0, 8).toUpperCase()}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visual 2D Table Picker Modal */}
      <PosTablePickerModal
        isOpen={showPosTablePicker}
        onClose={() => setShowPosTablePicker(false)}
        onSelectTable={(num) => setSelectedTable(num)}
        currentSelectedTable={selectedTable}
      />

      {/* 1. Modal Buka Shift Kasir */}
      <AnimatePresence>
        {showOpenShiftModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-150 overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 bg-emerald-50/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                    <Unlock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Buka Shift Kasir Baru</h3>
                    <p className="text-[10px] text-slate-500">Mulai operasional transaksi kasir</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowOpenShiftModal(false)}
                  className="p-1 hover:bg-slate-200/50 rounded-xl text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Modal Kas Awal di Laci (Rp) *
                  </label>
                  <input
                    type="number"
                    value={openShiftCash}
                    onChange={(e) => setOpenShiftCash(e.target.value)}
                    className="w-full px-4 py-3 text-base font-black text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                    placeholder="245000"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Hitung uang tunai fisik yang ada di laci kasir saat membuka toko.
                  </p>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-end gap-2">
                <button
                  onClick={() => setShowOpenShiftModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 rounded-2xl hover:bg-slate-200/50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleOpenShift}
                  disabled={shiftSaving}
                  className="px-5 py-2 text-xs font-extrabold rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {shiftSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Buka Shift Sekarang
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Modal Kas Keluar (Petty Cash) */}
      <AnimatePresence>
        {showPettyCashModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-150 overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 bg-amber-50/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center">
                    <ArrowDownRight className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Catat Kas Keluar Laci (Petty Cash)</h3>
                    <p className="text-[10px] text-slate-500">Pengeluaran kas operasional mendadak dari laci kasir</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPettyCashModal(false)}
                  className="p-1 hover:bg-slate-200/50 rounded-xl text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Nama Keperluan / Barang *
                  </label>
                  <input
                    type="text"
                    value={pettyCashForm.name}
                    onChange={(e) => setPettyCashForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:bg-white transition-all"
                    placeholder="e.g. Beli Es Batu 2 Bal, Gas LPG, Galon Air"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Nominal Kas Diambil (Rp) *
                  </label>
                  <input
                    type="number"
                    value={pettyCashForm.amount}
                    onChange={(e) => setPettyCashForm((p) => ({ ...p, amount: e.target.value }))}
                    className="w-full px-4 py-2.5 text-xs sm:text-sm font-black text-rose-600 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:bg-white transition-all"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Catatan Tambahan (Opsional)
                  </label>
                  <textarea
                    value={pettyCashForm.notes}
                    onChange={(e) => setPettyCashForm((p) => ({ ...p, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:bg-white transition-all resize-none"
                    placeholder="Keterangan toko / suplier / staff yang mengambil..."
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-end gap-2">
                <button
                  onClick={() => setShowPettyCashModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 rounded-2xl hover:bg-slate-200/50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handlePettyCashSubmit}
                  disabled={shiftSaving}
                  className="px-5 py-2 text-xs font-extrabold rounded-2xl bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {shiftSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan Kas Keluar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Modal Tutup Shift & Rekonsiliasi Kas Laci */}
      <AnimatePresence>
        {showCloseShiftModal && activeShift && recon && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-150 overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-sm">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">Tutup Shift & Rekonsiliasi Kas</h3>
                    <p className="text-[10px] text-slate-300">Penghitungan fisik uang laci vs catatan sistem</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCloseShiftModal(false)}
                  className="p-1 hover:bg-white/10 rounded-xl text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Rincian Kas Sistem */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
                  <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Rincian Perhitungan Sistem
                  </p>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-700">
                      <span>Modal Awal Kas Laci (+)</span>
                      <span className="font-bold">{formatRupiah(recon.openingCash)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700">
                      <span>Penerimaan Kas Tunai (+)</span>
                      <span className="font-bold">+{formatRupiah(recon.cashIn)}</span>
                    </div>
                    <div className="flex justify-between text-rose-700">
                      <span>Kas Keluar Laci (Petty Cash) (-)</span>
                      <span className="font-bold">-{formatRupiah(recon.cashOut)}</span>
                    </div>
                    <div className="flex justify-between text-sky-700 pt-1 border-t border-slate-200">
                      <span>Total Transaksi QRIS (Rekening)</span>
                      <span className="font-bold">{formatRupiah(recon.qrisIn)}</span>
                    </div>
                    <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-1.5 border-t border-slate-300">
                      <span>Kas Seharusnya di Laci (=)</span>
                      <span className="font-black text-orange-600">{formatRupiah(recon.expectedCash)}</span>
                    </div>
                  </div>
                </div>

                {/* Input Kas Fisik Nyata */}
                <div>
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Uang Fisik Nyata di Laci (Rp) *
                  </label>
                  <input
                    type="number"
                    value={actualCashInput}
                    onChange={(e) => setActualCashInput(e.target.value)}
                    className="w-full px-4 py-3 text-lg font-black text-slate-900 bg-slate-50 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all"
                    placeholder="0"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Hitung lembaran & koin fisik uang di laci kasir saat ini.
                  </p>
                </div>

                {/* Status Selisih Kas */}
                {actualCashInput !== '' && (
                  <div
                    className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-bold ${
                      parseInt(actualCashInput) === recon.expectedCash
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : parseInt(actualCashInput) > recon.expectedCash
                        ? 'bg-blue-50 border-blue-200 text-blue-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    <span>Status Selisih Kas:</span>
                    <span className="font-extrabold">
                      {parseInt(actualCashInput) === recon.expectedCash
                        ? '✓ Pas (Sesuai Sistem)'
                        : parseInt(actualCashInput) > recon.expectedCash
                        ? `⚠️ Lebih +${formatRupiah(parseInt(actualCashInput) - recon.expectedCash)}`
                        : `⚠️ Kurang -${formatRupiah(recon.expectedCash - parseInt(actualCashInput))}`}
                    </span>
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Catatan Penutupan Shift
                  </label>
                  <textarea
                    value={shiftCloseNotes}
                    onChange={(e) => setShiftCloseNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all resize-none"
                    placeholder="Alasan jika ada selisih, serah terima shift kasir berikutnya..."
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-end gap-2">
                <button
                  onClick={() => setShowCloseShiftModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 rounded-2xl hover:bg-slate-200/50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleCloseShift}
                  disabled={shiftSaving || actualCashInput === ''}
                  className="px-5 py-2.5 text-xs font-extrabold rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white transition-all shadow-md shadow-orange-500/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {shiftSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Konfirmasi Tutup Shift
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

