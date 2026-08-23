'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, Flame, Check, Loader2, Tag, Clock } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import type { ProductItem, ModifiersData } from './types';

interface ProductQuickPriceModalProps {
  product: ProductItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function formatDateTimeLocal(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const pad = (num: number) => num.toString().padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function ProductQuickPriceModal({
  product,
  isOpen,
  onClose,
  onSuccess,
}: ProductQuickPriceModalProps) {
  const { showToast } = useToast();
  const [price, setPrice] = useState<string>('');
  const [badge, setBadge] = useState<string>('');
  const [promoActive, setPromoActive] = useState(false);
  const [promoPrice, setPromoPrice] = useState<string>('');
  const [promoStartDate, setPromoStartDate] = useState<string>('');
  const [promoEndDate, setPromoEndDate] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setPrice(product.price.toString());
      setBadge(product.badge || '');

      let mods: ModifiersData = {};
      if (product.modifiers) {
        try {
          mods = JSON.parse(product.modifiers);
        } catch {}
      }

      setPromoActive(mods.promo?.isActive || false);
      setPromoPrice(mods.promo?.promoPrice ? mods.promo.promoPrice.toString() : '');
      setPromoStartDate(formatDateTimeLocal(mods.promo?.startDate));
      setPromoEndDate(formatDateTimeLocal(mods.promo?.endDate));
    }
  }, [product]);

  const handleSave = async () => {
    if (!product) return;
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      return showToast('Harga reguler harus valid', 'error');
    }

    setSaving(true);
    try {
      let mods: ModifiersData = {};
      if (product.modifiers) {
        try {
          mods = JSON.parse(product.modifiers);
        } catch {}
      }

      if (promoActive) {
        const numPromo = Number(promoPrice);
        if (isNaN(numPromo) || numPromo <= 0) {
          showToast('Harga promo harus diisi jika promo aktif', 'error');
          setSaving(false);
          return;
        }
        mods.promo = {
          isActive: true,
          promoPrice: numPromo,
          startDate: promoStartDate ? new Date(promoStartDate).toISOString() : new Date().toISOString(),
          endDate: promoEndDate ? new Date(promoEndDate).toISOString() : new Date(Date.now() + 86400000).toISOString(),
        };
      } else {
        if (mods.promo) {
          mods.promo.isActive = false;
        }
      }

      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price: numPrice,
          badge: badge || null,
          modifiers: mods,
        }),
      });

      if (!res.ok) throw new Error();

      showToast('Harga & status produk berhasil diperbarui!', 'success');
      onSuccess();
      onClose();
    } catch {
      showToast('Gagal memperbarui harga produk', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !product) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden z-10 p-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-inner">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="font-heading font-bold text-base text-stone-900 line-clamp-1">
                  {product.name}
                </h3>
                <p className="text-xs text-stone-500">Edit Harga & Status Cepat</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4 text-left">
            {/* Regular Price */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                Harga Jual Reguler (Rp)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                  Rp
                </span>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="25000"
                />
              </div>
              {Number(price) > 0 && (
                <p className="text-[11px] text-stone-500 mt-1 font-medium">
                  {formatRupiah(Number(price))}
                </p>
              )}
            </div>

            {/* Availability Badge */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-stone-400" />
                Status Stok / Badge
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: '', label: 'Tersedia (Normal)' },
                  { value: 'sold-out', label: 'Habis (Sold Out)' },
                  { value: 'best-seller', label: 'Best Seller' },
                  { value: 'new', label: 'Menu Baru' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setBadge(opt.value)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-left ${
                      badge === opt.value
                        ? 'border-orange-500 bg-orange-50 text-orange-700 font-extrabold shadow-sm'
                        : 'border-stone-200 text-stone-600 hover:border-stone-300 bg-stone-50/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Flash Sale / Promo Section */}
            <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/70 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-500" />
                  <span className="text-xs font-bold text-stone-800">
                    Flash Sale / Promo Aktif
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={promoActive}
                    onChange={(e) => setPromoActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>

              {promoActive && (
                <div className="space-y-2.5 pt-2 border-t border-amber-200/50 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Harga Khusus Promo (Rp)
                    </label>
                    <input
                      type="number"
                      value={promoPrice}
                      onChange={(e) => setPromoPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-orange-500 bg-white"
                      placeholder="18000"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Mulai
                      </label>
                      <input
                        type="datetime-local"
                        value={promoStartDate}
                        onChange={(e) => setPromoStartDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-[11px] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Berakhir
                      </label>
                      <input
                        type="datetime-local"
                        value={promoEndDate}
                        onChange={(e) => setPromoEndDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-[11px] bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
