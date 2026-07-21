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
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import QRCameraScanner from '@/components/cashier/QRCameraScanner';
import { useToast } from '@/components/ui/Toast';

type POSProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string | null;
  categoryId: string;
  categoryName: string;
  modifiers: {
    iceLevel?: string[];
    sugarLevel?: string[];
    addOns?: { id: string; name: string; price: number }[];
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
  addOns: { id: string; name: string; price: number }[];
  totalPrice: number;
};

type OrderType = 'DELIVERY' | 'PICKUP' | 'DINE_IN';

interface Props {
  products: POSProduct[];
  categories: { id: string; name: string; slug: string }[];
}

export default function CashierPOSClient({ products, categories }: Props) {
  const { showToast } = useToast();
  const router = useRouter();

  // State
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
  const [posPeopleCount, setPosPeopleCount] = useState(1);

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

  // Reset tumbler option if order type becomes DELIVERY or if member is removed
  useEffect(() => {
    if (orderType === 'DELIVERY' || !phoneLookupResult) {
      setHasTumbler(false);
    }
  }, [orderType, phoneLookupResult]);

  // Pre-order QR scan state
  const [showPreScanQR, setShowPreScanQR] = useState(false);

  // Modifier modal state
  const [modifierProduct, setModifierProduct] = useState<POSProduct | null>(null);
  const [modIce, setModIce] = useState('Normal Ice');
  const [modSugar, setModSugar] = useState('Normal Sugar');
  const [modAddOns, setModAddOns] = useState<{ id: string; name: string; price: number }[]>([]);
  const [modQty, setModQty] = useState(1);

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

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const tumblerDiscount = useMemo(() => {
    if (!hasTumbler || !loyaltySettings) return 0;
    return Math.round((subtotal * loyaltySettings.tumblerDiscountPct) / 100);
  }, [hasTumbler, loyaltySettings, subtotal]);

  const totalPayable = subtotal - tumblerDiscount;

  // Add to cart
  const handleProductClick = (product: POSProduct) => {
    if (product.modifiers && (product.modifiers.iceLevel || product.modifiers.sugarLevel || product.modifiers.addOns)) {
      setModifierProduct(product);
      setModIce(product.modifiers.iceLevel?.[0] || 'Normal Ice');
      setModSugar(product.modifiers.sugarLevel?.[0] || 'Normal Sugar');
      setModAddOns([]);
      setModQty(1);
    } else {
      addToCart(product, 'Normal Ice', 'Normal Sugar', [], 1);
    }
  };

  const addToCart = (
    product: POSProduct,
    iceLevel: string,
    sugarLevel: string,
    addOns: { id: string; name: string; price: number }[],
    qty: number
  ) => {
    const addOnIds = addOns.map((a) => a.id).sort().join(',');
    const cartId = `${product.id}__${iceLevel}__${sugarLevel}__${addOnIds}`;
    const addOnTotal = addOns.reduce((sum, a) => sum + a.price, 0);
    const itemPrice = product.price + addOnTotal;

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
          addOns,
          totalPrice: itemPrice * qty,
        },
      ];
    });
  };

  const updateCartQty = (id: string, newQty: number) => {
    if (newQty <= 0) {
      setCart((prev) => prev.filter((i) => i.id !== id));
    } else {
      setCart((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                quantity: newQty,
                totalPrice: (i.basePrice + i.addOns.reduce((s, a) => s + a.price, 0)) * newQty,
              }
            : i
        )
      );
    }
  };

  const handleModifierConfirm = () => {
    if (!modifierProduct) return;
    addToCart(modifierProduct, modIce, modSugar, modAddOns, modQty);
    setModifierProduct(null);
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
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          addOnIds: item.addOns.map((a) => a.id),
          modsString: `${item.iceLevel}, ${item.sugarLevel}${item.addOns.length > 0 ? ', +' + item.addOns.map((a) => a.name).join(', +') : ''}`,
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

      const wasPointsAwarded = data.pointsAwarded;
      const earnedPoints = data.pointsEarned || 0;
      const memberName = phoneLookupResult?.name || customerName;

      // Reset form
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setPhoneLookupResult(null);
      setAddress('');
      setNotes('');
      setHasTumbler(false);
      setSelectedTable('');
      setPosPeopleCount(1);

      if (wasPointsAwarded) {
        showToast(`Pesanan berhasil! +${earnedPoints} Poin reward otomatis ditambahkan ke akun ${memberName}`, 'success');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 4000);
      } else {
        // Show QR scan modal if points were not automatically awarded
        setShowQRModal(true);
        setQrInput('');
        setQrCustomer(null);
        setQrError('');
        setPointsAwarded(false);
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAddOn = (addOn: { id: string; name: string; price: number }) => {
    setModAddOns((prev) =>
      prev.find((a) => a.id === addOn.id)
        ? prev.filter((a) => a.id !== addOn.id)
        : [...prev, addOn]
    );
  };

  return (
    <div className="space-y-6">
      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* LEFT: Product Grid */}
        <div className="xl:col-span-3 space-y-4">
          {/* Search + Category Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Cari produk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                categoryFilter === 'all'
                  ? 'bg-amber-600 text-white shadow-sm'
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
                    ? 'bg-amber-600 text-white shadow-sm'
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
                className="group bg-white rounded-2xl border border-border/40 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-amber-300 transition-all duration-200 overflow-hidden text-left"
              >
                {product.image && (
                  <div className="aspect-square bg-muted/30 overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-3">
                  <p className="text-[13px] font-semibold text-foreground line-clamp-1">{product.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{product.categoryName}</p>
                  <p className="text-sm font-bold text-amber-700 mt-1">{formatRupiah(product.price)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: Cart & Order Panel */}
        <div className="xl:col-span-2 space-y-4">
          {/* Order Type Tabs */}
          <div className="bg-white rounded-2xl border border-border/40 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-1.5">
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { type: 'PICKUP' as OrderType, label: 'Pickup', icon: ShoppingBag },
                { type: 'DELIVERY' as OrderType, label: 'Delivery', icon: Truck },
                { type: 'DINE_IN' as OrderType, label: 'Dine In', icon: Coffee },
              ]).map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    orderType === type
                      ? 'bg-amber-600 text-white shadow-sm'
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
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-bold hover:bg-amber-100 transition-colors"
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
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <input
                  type="text"
                  placeholder="Nama pelanggan *"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all font-medium"
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
                  className="w-full pl-9 pr-8 py-2 text-xs bg-muted/20 border border-border/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500/20 text-muted-foreground"
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
                className="w-full px-3 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all resize-none"
              />
            )}

            {orderType === 'DINE_IN' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1 pl-1">Nomor Meja *</label>
                  <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all"
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
                    className="w-full px-3 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all"
                  />
                </div>
              </div>
            )}

            <input
              type="text"
              placeholder="Catatan (opsional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all"
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
                      <p className="text-xs font-bold text-amber-700 mt-0.5">{formatRupiah(item.totalPrice)}</p>
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
                <div className="flex gap-2">
                  {['CASH', 'QRIS', 'TRANSFER'].map((method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                        paymentMethod === method
                          ? 'bg-amber-600 text-white'
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>

                {hasTumbler && tumblerDiscount > 0 && (
                  <div className="flex justify-between items-center text-xs text-emerald-600 font-semibold px-1">
                    <span className="flex items-center gap-1"><Leaf className="w-3.5 h-3.5" /> Diskon Tumbler ({loyaltySettings?.tumblerDiscountPct}%)</span>
                    <span>-{formatRupiah(tumblerDiscount)}</span>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-foreground">Total</span>
                  <span className="text-lg font-bold text-amber-700">{formatRupiah(totalPayable)}</span>
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting || !customerName || cart.length === 0}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Buat Pesanan
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
                    <p className="text-sm text-amber-700 font-semibold">{formatRupiah(modifierProduct.price)}</p>
                  </div>
                  <button onClick={() => setModifierProduct(null)} className="p-1.5 hover:bg-muted rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Ice Level */}
                {modifierProduct.modifiers?.iceLevel && (
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Ice Level</p>
                    <div className="flex flex-wrap gap-2">
                      {modifierProduct.modifiers.iceLevel.map((level) => (
                        <button
                          key={level}
                          onClick={() => setModIce(level)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            modIce === level
                              ? 'bg-amber-600 text-white'
                              : 'bg-muted/50 text-foreground hover:bg-muted'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sugar Level */}
                {modifierProduct.modifiers?.sugarLevel && (
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Sugar Level</p>
                    <div className="flex flex-wrap gap-2">
                      {modifierProduct.modifiers.sugarLevel.map((level) => (
                        <button
                          key={level}
                          onClick={() => setModSugar(level)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            modSugar === level
                              ? 'bg-amber-600 text-white'
                              : 'bg-muted/50 text-foreground hover:bg-muted'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
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
                                : 'border-border/40 hover:border-amber-300'
                            }`}
                          >
                            <span className="text-sm font-medium">{addOn.name}</span>
                            <span className="text-xs font-semibold text-amber-700">+{formatRupiah(addOn.price)}</span>
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
                    (modifierProduct.price + modAddOns.reduce((s, a) => s + a.price, 0)) * modQty
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
                  <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center">
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
                          className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white font-semibold text-sm disabled:opacity-50">
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
                      className="mt-4 px-6 py-2.5 rounded-xl bg-amber-600 text-white font-semibold text-sm">
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
    </div>
  );
}
