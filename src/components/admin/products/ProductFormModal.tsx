'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Upload,
  Crop,
  ImageIcon,
  Save,
  Loader2,
  CupSoda,
  Utensils,
  Plus,
  Trash2,
  Flame,
  Layers,
  Sparkles,
  Check,
  Tag,
  Clock,
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { ProductImageCropperModal } from './ProductImageCropperModal';
import { BundleBuilderSection } from './BundleBuilderSection';
import type {
  ProductItem,
  CategoryItem,
  IngredientItem,
  ModifiersData,
  AddOnItem,
  BundleGroup,
} from './types';

interface ProductFormModalProps {
  product: ProductItem | null;
  productType: 'minuman' | 'makanan' | 'combo';
  categories: CategoryItem[];
  allProducts: ProductItem[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ALL_ICE_LEVELS = ['Normal Ice', 'Less Ice', 'No Ice'];
const ALL_SUGAR_LEVELS = ['Less', 'Biasa', 'Lumayan', 'Manis Sekali'];

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

export function ProductFormModal({
  product,
  productType: initialProductType,
  categories,
  allProducts,
  isOpen,
  onClose,
  onSuccess,
}: ProductFormModalProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Tab inside form modal
  const [formTab, setFormTab] = useState<'info' | 'modifiers' | 'promo' | 'bundle'>('info');

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [badge, setBadge] = useState<string>('');
  const [image, setImage] = useState<string | null>(null);

  // Cropper State
  const [cropSourceSrc, setCropSourceSrc] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Type: minuman / makanan
  const [currentType, setCurrentType] = useState<'minuman' | 'makanan' | 'combo'>(
    initialProductType
  );

  // Modifier state
  const [modIce, setModIce] = useState<string[]>([]);
  const [modSugar, setModSugar] = useState<string[]>([]);
  const [modAddOns, setModAddOns] = useState<AddOnItem[]>([]);
  const [newAddOnName, setNewAddOnName] = useState('');
  const [newAddOnPrice, setNewAddOnPrice] = useState('');

  // Matcha & Customizer states
  const [showMatcha, setShowMatcha] = useState(false);
  const [defaultMatcha, setDefaultMatcha] = useState(5);
  const [showSweetness, setShowSweetness] = useState(true);
  const [defaultSugar, setDefaultSugar] = useState('Biasa');
  const [defaultIce, setDefaultIce] = useState('Normal Ice');
  const [showEspressoShot, setShowEspressoShot] = useState(false);

  // Sizes state
  const [modSizes, setModSizes] = useState<{ name: string; price: number }[]>([]);
  const [newSizeName, setNewSizeName] = useState('');
  const [newSizePrice, setNewSizePrice] = useState('');

  // Bundle / Combo state
  const [isBundle, setIsBundle] = useState(false);
  const [bundleGroups, setBundleGroups] = useState<BundleGroup[]>([]);
  const [freeShipping, setFreeShipping] = useState(false);
  const [discountType, setDiscountType] = useState<'fixed' | 'nominal' | 'percent'>('fixed');
  const [discountValue, setDiscountValue] = useState('');

  // Promo Flash sale state
  const [promoActive, setPromoActive] = useState(false);
  const [promoPrice, setPromoPrice] = useState('');
  const [promoStartDate, setPromoStartDate] = useState('');
  const [promoEndDate, setPromoEndDate] = useState('');

  // Submit loading
  const [saving, setSaving] = useState(false);

  // Populate data when modal opens
  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description || '');
      setPrice(product.price.toString());
      setCategoryId(product.categoryId);
      setBadge(product.badge || '');
      setImage(product.image || null);

      let mods: ModifiersData = {};
      if (product.modifiers) {
        try {
          mods = JSON.parse(product.modifiers);
        } catch {}
      }

      const detectedType =
        mods.productType ||
        (mods.isBundle
          ? 'combo'
          : mods.showMatcha ||
            mods.showSweetness ||
            mods.showEspressoShot ||
            (mods.iceLevel && mods.iceLevel.length > 0)
          ? 'minuman'
          : 'makanan');

      setCurrentType(detectedType);
      setModIce(mods.iceLevel || []);
      setModSugar(mods.sugarLevel || []);
      setModAddOns(mods.addOns || []);
      setModSizes(mods.sizes || []);
      setIsBundle(mods.isBundle || false);
      setBundleGroups(mods.bundleGroups || []);
      setFreeShipping(mods.freeShipping || false);
      setDiscountType(mods.discountType || 'fixed');
      setDiscountValue(mods.discountValue ? mods.discountValue.toString() : '');

      setShowMatcha(mods.showMatcha === true);
      setDefaultMatcha(mods.defaultMatcha ?? 5);
      setShowSweetness(mods.showSweetness !== false);
      setDefaultSugar(mods.defaultSugar || 'Biasa');
      setDefaultIce(mods.defaultIce || 'Normal Ice');
      setShowEspressoShot(mods.showEspressoShot === true);

      setPromoActive(mods.promo?.isActive || false);
      setPromoPrice(mods.promo?.promoPrice ? mods.promo.promoPrice.toString() : '');
      setPromoStartDate(formatDateTimeLocal(mods.promo?.startDate));
      setPromoEndDate(formatDateTimeLocal(mods.promo?.endDate));
    } else {
      setName('');
      setDescription('');
      setPrice('');
      setCategoryId(categories[0]?.id || '');
      setBadge('');
      setImage(null);
      setCurrentType(initialProductType);

      if (initialProductType === 'minuman') {
        setShowSweetness(true);
        setShowMatcha(false);
        setShowEspressoShot(false);
        setModIce(['Normal Ice', 'Less Ice', 'No Ice']);
        setModSugar(['Less', 'Biasa', 'Lumayan', 'Manis Sekali']);
        setIsBundle(false);
      } else if (initialProductType === 'combo') {
        setShowSweetness(false);
        setShowMatcha(false);
        setShowEspressoShot(false);
        setModIce([]);
        setModSugar([]);
        setIsBundle(true);
      } else {
        setShowSweetness(false);
        setShowMatcha(false);
        setShowEspressoShot(false);
        setModIce([]);
        setModSugar([]);
        setIsBundle(false);
      }

      setModAddOns([]);
      setModSizes([]);
      setBundleGroups([]);
      setFreeShipping(false);
      setDiscountType('fixed');
      setDiscountValue('');
      setPromoActive(false);
      setPromoPrice('');
      setPromoStartDate('');
      setPromoEndDate('');
    }

    setFormTab('info');
  }, [product, initialProductType, categories, isOpen]);

  // Image Upload -> Cropper Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCropSourceSrc(reader.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  // Upload cropped WebP to server
  const handleConfirmCrop = async (webpBlob: Blob, previewUrl: string) => {
    setImage(previewUrl);
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('file', new File([webpBlob], 'product.webp', { type: 'image/webp' }));

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }

      const { url } = await res.json();
      setImage(url);
      showToast('Foto produk berhasil dikompres dan diunggah!', 'success');
    } catch (err: any) {
      showToast('Gagal mengupload gambar: ' + err.message, 'error');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Modifier Helpers
  const toggleIce = (level: string) =>
    setModIce((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );

  const toggleSugar = (level: string) =>
    setModSugar((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );

  const addAddOn = () => {
    if (!newAddOnName.trim() || !newAddOnPrice) return;
    const id = newAddOnName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setModAddOns((prev) => [
      ...prev,
      { id, name: newAddOnName.trim(), price: Number(newAddOnPrice) },
    ]);
    setNewAddOnName('');
    setNewAddOnPrice('');
  };

  const removeAddOn = (id: string) =>
    setModAddOns((prev) => prev.filter((a) => a.id !== id));

  const addSizeOption = () => {
    if (!newSizeName.trim()) return;
    setModSizes((prev) => [
      ...prev,
      { name: newSizeName.trim(), price: Number(newSizePrice) || 0 },
    ]);
    setNewSizeName('');
    setNewSizePrice('');
  };

  const removeSizeOption = (idx: number) =>
    setModSizes((prev) => prev.filter((_, i) => i !== idx));

  // Save product
  const handleSave = async () => {
    if (!name.trim() || !price || !categoryId) {
      return showToast('Nama, harga, dan kategori wajib diisi', 'error');
    }

    setSaving(true);
    try {
      const modifiersData: ModifiersData = {
        productType: currentType === 'combo' ? 'minuman' : currentType,
        iceLevel: modIce,
        sugarLevel: modSugar,
        addOns: modAddOns,
        sizes: modSizes,
        isBundle: isBundle || currentType === 'combo',
        bundleGroups,
        freeShipping,
        discountType,
        discountValue: discountValue ? Number(discountValue) : undefined,
        showMatcha,
        defaultMatcha: showMatcha ? defaultMatcha : undefined,
        showSweetness,
        defaultSugar: showSweetness ? defaultSugar : undefined,
        defaultIce: modIce.length > 0 ? defaultIce : undefined,
        showEspressoShot,
        promo: promoActive
          ? {
              isActive: true,
              promoPrice: Number(promoPrice) || 0,
              startDate: promoStartDate
                ? new Date(promoStartDate).toISOString()
                : new Date().toISOString(),
              endDate: promoEndDate
                ? new Date(promoEndDate).toISOString()
                : new Date(Date.now() + 86400000).toISOString(),
            }
          : undefined,
      };

      const payload = {
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        categoryId,
        badge: badge || null,
        image,
        modifiers: modifiersData,
      };

      const url = product ? `/api/admin/products/${product.id}` : '/api/admin/products';
      const method = product ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();

      showToast(
        product ? 'Produk berhasil diperbarui' : 'Produk baru berhasil ditambahkan',
        'success'
      );
      onSuccess();
      onClose();
    } catch {
      showToast('Gagal menyimpan produk', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden z-10 flex flex-col max-h-[92vh] text-left"
          >
            {/* Header */}
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-inner">
                  {currentType === 'makanan' ? (
                    <Utensils className="w-5 h-5" />
                  ) : currentType === 'combo' ? (
                    <Layers className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <CupSoda className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-base text-stone-900">
                    {product ? `Edit Produk: ${product.name}` : 'Tambah Produk Baru'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Tipe:{' '}
                    <strong className="text-orange-600 uppercase">
                      {currentType === 'makanan'
                        ? 'Makanan / Snack'
                        : currentType === 'combo'
                        ? 'Paket Bundling'
                        : 'Minuman (Beverage)'}
                    </strong>
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-stone-200 bg-stone-100/60 px-5 gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setFormTab('info')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
                  formTab === 'info'
                    ? 'border-orange-500 text-orange-600 bg-white shadow-sm rounded-t-xl'
                    : 'border-transparent text-stone-600 hover:text-stone-900'
                }`}
              >
                1. Info Dasar & Foto
              </button>

              {currentType !== 'combo' && (
                <button
                  type="button"
                  onClick={() => setFormTab('modifiers')}
                  className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
                    formTab === 'modifiers'
                      ? 'border-orange-500 text-orange-600 bg-white shadow-sm rounded-t-xl'
                      : 'border-transparent text-stone-600 hover:text-stone-900'
                  }`}
                >
                  2. Varian & Kustomisasi
                </button>
              )}

              {currentType === 'combo' && (
                <button
                  type="button"
                  onClick={() => setFormTab('bundle')}
                  className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
                    formTab === 'bundle'
                      ? 'border-emerald-600 text-emerald-700 bg-white shadow-sm rounded-t-xl'
                      : 'border-transparent text-stone-600 hover:text-stone-900'
                  }`}
                >
                  2. Paket Bundling
                </button>
              )}

              <button
                type="button"
                onClick={() => setFormTab('promo')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
                  formTab === 'promo'
                    ? 'border-rose-500 text-rose-600 bg-white shadow-sm rounded-t-xl'
                    : 'border-transparent text-stone-600 hover:text-stone-900'
                }`}
              >
                3. Flash Sale Promo
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* TAB 1: INFO DASAR & FOTO */}
              {formTab === 'info' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Name */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Nama Produk <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Signature Matcha Latte"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Kategori <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold bg-white focus:ring-2 focus:ring-orange-500"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Deskripsi Produk
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      placeholder="Ceritakan cita rasa, bahan baku utama, atau keunikan menu ini..."
                      className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-orange-500 leading-relaxed"
                    />
                  </div>

                  {/* Price & Badge */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Harga Jual Dasar (Rp) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                          Rp
                        </span>
                        <input
                          type="number"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="28000"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      {Number(price) > 0 && (
                        <p className="text-[11px] text-stone-500 mt-1 font-medium">
                          {formatRupiah(Number(price))}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Badge Status / Highlight
                      </label>
                      <select
                        value={badge}
                        onChange={(e) => setBadge(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold bg-white focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">-- Normal (Tanpa Badge) --</option>
                        <option value="best-seller">⭐ Best Seller</option>
                        <option value="new">✨ Menu Baru</option>
                        <option value="sold-out">❌ Habis (Sold Out)</option>
                      </select>
                    </div>
                  </div>

                  {/* Image Upload & Cropper Box */}
                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                          <ImageIcon className="w-4 h-4 text-orange-500" />
                          Foto Menu Produk (Rasio 1:1 Persegi • 600 × 600 px)
                        </h4>
                        <p className="text-[11px] text-stone-500">
                          Disarankan rasio <strong>1:1 Persegi (600 × 600 px s/d 1000 × 1000 px)</strong>. Sistem otomatis menyediakan alat pemotong (*cropper*) & konversi WebP tajam untuk SPMB & Kasir.
                        </p>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {image ? 'Ganti Foto' : 'Unggah Foto'}
                      </button>
                    </div>

                    {image ? (
                      <div className="flex items-center gap-4 pt-2">
                        <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-white border border-stone-200 shadow-sm shrink-0">
                          <img src={image} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                        <div className="text-xs text-stone-600 space-y-1">
                          <p className="font-bold text-emerald-700 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Foto terpasang & teroptimasi WebP
                          </p>
                          <p className="text-[11px] text-stone-400">
                            Foto siap ditampilkan secara simetris di SPMB & Kasir POS.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="py-6 rounded-xl border-2 border-dashed border-stone-200 hover:border-orange-400 bg-white flex flex-col items-center justify-center cursor-pointer transition-all"
                      >
                        <Upload className="w-6 h-6 text-stone-300 mb-1" />
                        <p className="text-xs font-bold text-stone-600">
                          Klik untuk memilih file gambar
                        </p>
                        <p className="text-[10px] text-stone-400 mt-0.5">
                          Mendukung JPG, PNG, WEBP (Akan dibuka di Cropper 1:1)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: VARIAN & KUSTOMISASI (MINUMAN / MAKANAN) */}
              {formTab === 'modifiers' && (
                <div className="space-y-6">
                  {/* Minuman specifics */}
                  {currentType === 'minuman' && (
                    <>
                      {/* Ice Levels */}
                      <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100 space-y-3">
                        <h4 className="text-xs font-bold text-sky-950 uppercase tracking-wider">
                          Pilihan Tingkat Es (Ice Level)
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {ALL_ICE_LEVELS.map((level) => {
                            const isChecked = modIce.includes(level);
                            return (
                              <button
                                key={level}
                                type="button"
                                onClick={() => toggleIce(level)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                  isChecked
                                    ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                                    : 'bg-white text-stone-600 border-stone-200 hover:border-sky-300'
                                }`}
                              >
                                {level}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Sugar Sweetness Levels */}
                      <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                            Pilihan Tingkat Manis (Sweetness Level)
                          </h4>
                          <label className="text-xs font-bold text-stone-600 flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={showSweetness}
                              onChange={(e) => setShowSweetness(e.target.checked)}
                              className="rounded text-orange-500"
                            />
                            Tampilkan Opsi Gula
                          </label>
                        </div>

                        {showSweetness && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {ALL_SUGAR_LEVELS.map((sugar) => {
                              const isChecked = modSugar.includes(sugar);
                              return (
                                <button
                                  key={sugar}
                                  type="button"
                                  onClick={() => toggleSugar(sugar)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                    isChecked
                                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                                      : 'bg-white text-stone-600 border-stone-200 hover:border-amber-300'
                                  }`}
                                >
                                  {sugar}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Matcha & Espresso Specialized Customizers */}
                      <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-4">
                        <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                          Kustomisasi Khusus Matcha & Kopi
                        </h4>

                        <div className="space-y-3">
                          {/* Matcha Slider Toggle */}
                          <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-stone-100">
                            <div>
                              <p className="text-xs font-bold text-stone-800">
                                Slider Intensitas Matcha (Level 1 - 10)
                              </p>
                              <p className="text-[10px] text-stone-500">
                                Membuka visual slider takaran bubuk matcha di layar pelanggan.
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              checked={showMatcha}
                              onChange={(e) => setShowMatcha(e.target.checked)}
                              className="rounded text-orange-500 w-4 h-4"
                            />
                          </div>

                          {/* Espresso Shot Toggle */}
                          <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-stone-100">
                            <div>
                              <p className="text-xs font-bold text-stone-800">
                                Opsi Tambahan Espresso Shot (Single / Double / Triple)
                              </p>
                              <p className="text-[10px] text-stone-500">
                                Pelanggan bisa menambah extra espresso shot ke minuman ini.
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              checked={showEspressoShot}
                              onChange={(e) => setShowEspressoShot(e.target.checked)}
                              className="rounded text-orange-500 w-4 h-4"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Size Variants (Regular, Large, Cup 16oz, etc.) */}
                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                    <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                      Varian Ukuran (Size Options)
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      Opsional: Tambahkan pilihan ukuran beserta selisih harganya.
                    </p>

                    <div className="space-y-2">
                      {modSizes.map((sz, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-stone-100"
                        >
                          <span className="text-xs font-bold text-stone-800">{sz.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono font-bold text-orange-600">
                              +{formatRupiah(sz.price)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeSizeOption(idx)}
                              className="text-stone-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add Size Input */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={newSizeName}
                          onChange={(e) => setNewSizeName(e.target.value)}
                          placeholder="Nama Ukuran (e.g. Large / 1 Liter)"
                          className="flex-1 px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-white"
                        />
                        <input
                          type="number"
                          value={newSizePrice}
                          onChange={(e) => setNewSizePrice(e.target.value)}
                          placeholder="+Harga (e.g. 5000)"
                          className="w-28 px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-white"
                        />
                        <button
                          type="button"
                          onClick={addSizeOption}
                          className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-bold text-xs shrink-0"
                        >
                          Tambah
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Add-ons / Toppings Specific to Product */}
                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                    <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                      Topping & Add-On Khusus Menu Ini
                    </h4>
                    <div className="space-y-2">
                      {modAddOns.map((addon) => (
                        <div
                          key={addon.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-stone-100"
                        >
                          <span className="text-xs font-bold text-stone-800">{addon.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono font-bold text-orange-600">
                              +{formatRupiah(addon.price)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeAddOn(addon.id)}
                              className="text-stone-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add Addon Input */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={newAddOnName}
                          onChange={(e) => setNewAddOnName(e.target.value)}
                          placeholder="Nama Add-on (e.g. Extra Cheese)"
                          className="flex-1 px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-white"
                        />
                        <input
                          type="number"
                          value={newAddOnPrice}
                          onChange={(e) => setNewAddOnPrice(e.target.value)}
                          placeholder="Harga (e.g. 4000)"
                          className="w-28 px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-white"
                        />
                        <button
                          type="button"
                          onClick={addAddOn}
                          className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-bold text-xs shrink-0"
                        >
                          Tambah
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB BUNDLE */}
              {formTab === 'bundle' && (
                <BundleBuilderSection
                  bundleGroups={bundleGroups}
                  setBundleGroups={setBundleGroups}
                  discountType={discountType}
                  setDiscountType={setDiscountType}
                  discountValue={discountValue}
                  setDiscountValue={setDiscountValue}
                  freeShipping={freeShipping}
                  setFreeShipping={setFreeShipping}
                  allProducts={allProducts}
                  categories={categories}
                  basePrice={price}
                  setBasePrice={setPrice}
                />
              )}

              {/* TAB 3: FLASH SALE PROMO */}
              {formTab === 'promo' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Flame className="w-5 h-5 text-rose-600" />
                        <div>
                          <h4 className="text-xs font-bold text-rose-950">
                            Aktifkan Flash Sale / Countdown Promo
                          </h4>
                          <p className="text-[11px] text-rose-700">
                            Menampilkan badge diskon dan timer hitung mundur di SPMB & web store.
                          </p>
                        </div>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={promoActive}
                          onChange={(e) => setPromoActive(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                      </label>
                    </div>

                    {promoActive && (
                      <div className="space-y-4 pt-3 border-t border-rose-200/60">
                        <div>
                          <label className="block text-xs font-bold text-rose-950 mb-1">
                            Harga Diskon Promo (Rp) <span className="text-rose-600">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                              Rp
                            </span>
                            <input
                              type="number"
                              value={promoPrice}
                              onChange={(e) => setPromoPrice(e.target.value)}
                              placeholder="19000"
                              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-rose-300 text-xs font-bold bg-white focus:ring-2 focus:ring-rose-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-stone-400" /> Tanggal Mulai
                            </label>
                            <input
                              type="datetime-local"
                              value={promoStartDate}
                              onChange={(e) => setPromoStartDate(e.target.value)}
                              className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-xs bg-white focus:ring-2 focus:ring-rose-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-stone-400" /> Tanggal Berakhir
                            </label>
                            <input
                              type="datetime-local"
                              value={promoEndDate}
                              onChange={(e) => setPromoEndDate(e.target.value)}
                              className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-xs bg-white focus:ring-2 focus:ring-rose-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-stone-100 bg-stone-50 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-100"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {product ? 'Simpan Perubahan' : 'Buat Produk Sekarang'}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Cropper Modal Triggered after file selection */}
      <ProductImageCropperModal
        imageSrc={cropSourceSrc}
        isOpen={showCropper}
        onClose={() => setShowCropper(false)}
        onConfirmCrop={handleConfirmCrop}
      />
    </>
  );
}
