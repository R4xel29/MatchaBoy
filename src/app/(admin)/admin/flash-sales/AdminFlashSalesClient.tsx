'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Search, Clock, Calendar, Percent, Trash2, Plus, X, Tag, ShieldAlert } from 'lucide-react';
import { formatRupiah, cn, getActivePromo } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string | null;
  categoryId: string;
  category: { name: string };
  modifiers: any;
}

interface Category {
  id: string;
  name: string;
}

interface AdminFlashSalesClientProps {
  initialProducts: Product[];
  categories: Category[];
}

export default function AdminFlashSalesClient({ initialProducts, categories }: AdminFlashSalesClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  
  // Modal states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [promoPrice, setPromoPrice] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const { showToast } = useToast();

  // Helper to determine status
  const getPromoStatus = (product: Product) => {
    const promo = getActivePromo(product);
    if (!product.modifiers?.promo) return 'INACTIVE';
    if (!product.modifiers.promo.isActive) return 'DISABLED';
    
    const now = new Date();
    const start = new Date(product.modifiers.promo.startDate);
    const end = new Date(product.modifiers.promo.endDate);
    
    if (now < start) return 'SCHEDULED';
    if (now > end) return 'EXPIRED';
    return 'ACTIVE';
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'ALL' || p.categoryId === selectedCategory;
      
      const status = getPromoStatus(p);
      const matchesTab = 
        activeTab === 'ALL' ||
        (activeTab === 'ACTIVE' && status === 'ACTIVE') ||
        (activeTab === 'INACTIVE' && (status === 'INACTIVE' || status === 'EXPIRED' || status === 'DISABLED' || status === 'SCHEDULED'));

      return matchesSearch && matchesCategory && matchesTab;
    });
  }, [products, searchTerm, selectedCategory, activeTab]);

  // Open Modal for Setting Flash Sale
  const openFlashSaleModal = (product: Product) => {
    setSelectedProduct(product);
    
    const existingPromo = product.modifiers?.promo;
    if (existingPromo) {
      setPromoPrice(String(existingPromo.promoPrice));
      
      // Format dates for datetime-local inputs: YYYY-MM-DDTHH:MM
      const toLocalISO = (dateStr: string) => {
        const d = new Date(dateStr);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };
      
      try {
        setStartDate(toLocalISO(existingPromo.startDate));
        setEndDate(toLocalISO(existingPromo.endDate));
      } catch {
        const now = new Date();
        const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
        const endDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        setStartDate(toLocalISO(nextHour.toISOString()));
        setEndDate(toLocalISO(endDay.toISOString()));
      }
    } else {
      setPromoPrice(String(Math.floor(product.price * 0.5))); // Default 50% off
      
      const now = new Date();
      const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
      const endDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const pad = (n: number) => String(n).padStart(2, '0');
      const format = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      
      setStartDate(format(nextHour));
      setEndDate(format(endDay));
    }
    
    setIsModalOpen(true);
  };

  // Set / Save Flash Sale
  const handleSaveFlashSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    
    if (Number(promoPrice) >= selectedProduct.price) {
      showToast('Harga promo harus lebih murah daripada harga reguler!', 'error');
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      showToast('Waktu berakhir harus setelah waktu mulai!', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${selectedProduct.id}/flash-sale`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          promoPrice: Number(promoPrice),
          startDate,
          endDate,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      
      // Update local state
      setProducts(prev => 
        prev.map(p => p.id === selectedProduct.id ? { ...p, modifiers: JSON.parse(data.product.modifiers) } : p)
      );

      showToast(`Flash sale untuk ${selectedProduct.name} berhasil dijadwalkan!`, 'success');
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Gagal menyimpan Flash Sale.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Disable Flash Sale
  const handleDisablePromo = async (product: Product) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}/flash-sale`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      
      // Update local state
      setProducts(prev => 
        prev.map(p => p.id === product.id ? { ...p, modifiers: JSON.parse(data.product.modifiers) } : p)
      );

      showToast(`Flash sale untuk ${product.name} telah dinonaktifkan.`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Gagal menonaktifkan Flash Sale.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari produk..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
        
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500"
        >
          <option value="ALL">Semua Kategori</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border select-none">
        <button
          onClick={() => setActiveTab('ALL')}
          className={cn(
            "px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all",
            activeTab === 'ALL' ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Semua Menu
        </button>
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={cn(
            "px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5",
            activeTab === 'ACTIVE' ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Sedang Flash Sale
        </button>
        <button
          onClick={() => setActiveTab('INACTIVE')}
          className={cn(
            "px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all",
            activeTab === 'INACTIVE' ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Tidak Ada Promo
        </button>
      </div>

      {/* Grid List Products */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((p) => {
          const promoStatus = getPromoStatus(p);
          const activePromo = getActivePromo(p);
          const displayPrice = activePromo ? activePromo.promoPrice : p.price;
          const discountPct = activePromo ? Math.round(((p.price - activePromo.promoPrice) / p.price) * 100) : 0;
          
          return (
            <div 
              key={p.id} 
              className="bg-card rounded-2xl border border-border overflow-hidden p-4 flex flex-col justify-between hover:shadow-md transition-shadow relative"
            >
              {/* Promo Badge Indicator */}
              {promoStatus === 'ACTIVE' && (
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black tracking-wide uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Active
                </span>
              )}
              {promoStatus === 'SCHEDULED' && (
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[9px] font-black tracking-wide uppercase flex items-center gap-1">
                  Scheduled
                </span>
              )}
              {promoStatus === 'EXPIRED' && (
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-black tracking-wide uppercase">
                  Expired
                </span>
              )}
              {promoStatus === 'DISABLED' && (
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-[9px] font-black tracking-wide uppercase">
                  Disabled
                </span>
              )}

              <div className="flex gap-3">
                {p.image ? (
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-border bg-brand-50">
                    <Image src={p.image} alt={p.name} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl shrink-0 border border-border bg-brand-50/50 flex items-center justify-center text-xl">
                    🍵
                  </div>
                )}
                
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded">
                    {p.category.name}
                  </span>
                  <h4 className="font-bold text-sm text-foreground leading-snug line-clamp-1 mt-1">{p.name}</h4>
                  
                  <div className="flex items-center gap-2 mt-1">
                    {activePromo ? (
                      <>
                        <span className="text-xs text-muted-foreground line-through font-semibold">
                          {formatRupiah(p.price)}
                        </span>
                        <span className="font-bold text-sm text-rose-600">
                          {formatRupiah(activePromo.promoPrice)}
                        </span>
                        <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-1 py-0.2 rounded">
                          -{discountPct}%
                        </span>
                      </>
                    ) : (
                      <span className="font-bold text-sm text-brand-700">
                        {formatRupiah(p.price)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Promo details info */}
              {p.modifiers?.promo && (
                <div className="mt-3.5 pt-2.5 border-t border-border/50 text-[10px] space-y-1 text-muted-foreground font-medium">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                    <span>Mulai: {new Date(p.modifiers.promo.startDate).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>Selesai: {new Date(p.modifiers.promo.endDate).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              )}

              {/* Buttons Action */}
              <div className="flex items-center gap-2 mt-4 pt-3.5 border-t border-border/40 select-none">
                <button
                  onClick={() => openFlashSaleModal(p)}
                  className="flex-1 py-2 px-3 text-[11px] font-bold rounded-xl border border-brand-500 text-brand-700 bg-brand-50/20 hover:bg-brand-50/50 transition-colors flex items-center justify-center gap-1 shadow-sm"
                >
                  <Tag className="w-3.5 h-3.5" />
                  {p.modifiers?.promo ? 'Edit Promo' : 'Set Flash Sale'}
                </button>
                
                {p.modifiers?.promo?.isActive && (
                  <button
                    onClick={() => handleDisablePromo(p)}
                    className="py-2 px-3 text-[11px] font-bold rounded-xl border border-red-200 text-red-600 bg-red-50/10 hover:bg-red-50 transition-colors flex items-center justify-center"
                    title="Nonaktifkan Promo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl space-y-2">
          <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto" />
          <h4 className="font-bold text-sm text-foreground">Tidak Ada Produk</h4>
          <p className="text-xs text-muted-foreground">Silakan sesuaikan filter pencarian atau buat produk baru.</p>
        </div>
      )}

      {/* Modal setting flash sale */}
      {isModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          
          {/* Box Dialog */}
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl p-6 relative border border-border animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground w-7 h-7 rounded-full flex items-center justify-center bg-muted hover:bg-border transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            
            <h3 className="font-heading font-black text-base text-foreground mb-1 flex items-center gap-2">
              <Percent className="w-5 h-5 text-brand-600" />
              Flash Sale Scheduler
            </h3>
            <p className="text-[11px] text-muted-foreground mb-4">Set diskon kilat untuk produk <strong>{selectedProduct.name}</strong>.</p>
            
            <form onSubmit={handleSaveFlashSale} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex justify-between">
                  <span>Harga Promo (IDR)</span>
                  <span className="text-brand-600 font-bold">Harga Normal: {formatRupiah(selectedProduct.price)}</span>
                </label>
                <input
                  type="number"
                  required
                  min="500"
                  value={promoPrice}
                  onChange={(e) => setPromoPrice(e.target.value)}
                  className="w-full px-4.5 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  placeholder="Masukkan harga promo"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-brand-600" />
                  Waktu Mulai
                </label>
                <input
                  type="datetime-local"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4.5 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-rose-600" />
                  Waktu Berakhir
                </label>
                <input
                  type="datetime-local"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4.5 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex gap-2.5 pt-3.5 select-none">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-border hover:bg-muted text-xs font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-xl gradient-brand text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5"
                >
                  {loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />}
                  Jadwalkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
