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
  Clock,
  FileText,
  SlidersHorizontal,
  Wand2,
  ArrowRight,
  ArrowLeft,
  Maximize2,
  Smartphone,
  Monitor,
  Award,
  Ban,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import {
  ProductImageCropperModal,
  autoCropImageToWebp,
  type CropTargetSlot,
} from './ProductImageCropperModal';
import { BundleBuilderSection } from './BundleBuilderSection';
import type {
  ProductItem,
  CategoryItem,
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

type FormStepTab = 'info' | 'photos' | 'modifiers' | 'bundle' | 'promo';

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
  const masterFileInputRef = useRef<HTMLInputElement>(null);
  const slotFileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Active Step Tab inside form modal
  const [formTab, setFormTab] = useState<FormStepTab>('info');

  // Form Fields (Step 1: Info & Deskripsi)
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [badge, setBadge] = useState<string>('');
  const [generatingAiDesc, setGeneratingAiDesc] = useState(false);

  // Step 2: Photos & Visuals (2 Mandatory: Display + Detail, 1 Optional: Banner)
  const [image, setImage] = useState<string | null>(null); // Display image (1:1)
  const [detailImage, setDetailImage] = useState<string | null>(null); // Detail modal image (4:3)
  const [bannerImage, setBannerImage] = useState<string | null>(null); // Optional Banner image (16:10)
  const [showBannerSlot, setShowBannerSlot] = useState(false);

  // Master Image & Cropper State (1 Upload -> Multiple Crops)
  const [masterImageSrc, setMasterImageSrc] = useState<string | null>(null);
  const [cropSourceSrc, setCropSourceSrc] = useState<string | null>(null);
  const [activeCropSlot, setActiveCropSlot] = useState<CropTargetSlot>('display');
  const [directUploadSlot, setDirectUploadSlot] = useState<CropTargetSlot>('display');
  const [showCropper, setShowCropper] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<CropTargetSlot | null>(null);

  // Type: minuman / makanan / combo
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

  // Existing extra modifiers preservation (e.g., recipe doses)
  const [existingModifiersRaw, setExistingModifiersRaw] = useState<ModifiersData>({});

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
          mods =
            typeof product.modifiers === 'string'
              ? JSON.parse(product.modifiers)
              : product.modifiers;
        } catch {}
      }
      setExistingModifiersRaw(mods);

      setDetailImage(mods.detailImage || null);
      setBannerImage(mods.bannerImage || null);
      setShowBannerSlot(Boolean(mods.bannerImage));
      setMasterImageSrc(product.image || mods.detailImage || mods.bannerImage || null);

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
      setDetailImage(null);
      setBannerImage(null);
      setShowBannerSlot(false);
      setMasterImageSrc(null);
      setExistingModifiersRaw({});
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

  // Handle AI Description Generation
  const handleGenerateAiDescription = async () => {
    if (!name.trim()) {
      showToast('Wajib mengisi Nama Menu terlebih dahulu sebelum menggunakan AI', 'error');
      nameInputRef.current?.focus();
      return;
    }

    setGeneratingAiDesc(true);
    try {
      const selectedCat = categories.find((c) => c.id === categoryId);
      const res = await fetch('/api/admin/products/ai-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          categoryName: selectedCat?.name || '',
          productType: currentType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal membuat deskripsi AI');
      }

      if (data.description) {
        setDescription(data.description);
        showToast('Deskripsi menu otomatis berhasil dibuat!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menghasilkan deskripsi AI', 'error');
    } finally {
      setGeneratingAiDesc(false);
    }
  };

  // Helper to upload a WebP Blob to /api/admin/upload
  const uploadWebpBlob = async (webpBlob: Blob, prefix: string): Promise<string> => {
    const fd = new FormData();
    fd.append('file', new File([webpBlob], `${prefix}.webp`, { type: 'image/webp' }));

    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      body: fd,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Upload gagal');
    }

    const { url } = await res.json();
    return url;
  };

  // Master Image Upload (1 File -> Source for Display, Detail & Optional Banner)
  const handleMasterFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setMasterImageSrc(dataUrl);
      setCropSourceSrc(dataUrl);
      setActiveCropSlot('display');
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  // Specific Slot File Upload (if user chooses a separate file for a specific slot)
  const handleSlotFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (!masterImageSrc) {
        setMasterImageSrc(dataUrl);
      }
      setCropSourceSrc(dataUrl);
      setActiveCropSlot(directUploadSlot);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  // Open cropper for a specific slot using the existing master image source
  const openCropperForSlot = (slot: CropTargetSlot) => {
    const src =
      masterImageSrc ||
      (slot === 'display'
        ? image
        : slot === 'detail'
        ? detailImage || image
        : bannerImage || image);

    if (!src) {
      setDirectUploadSlot(slot);
      slotFileInputRef.current?.click();
      return;
    }

    setCropSourceSrc(src);
    setActiveCropSlot(slot);
    setShowCropper(true);
  };

  // Confirm Crop Callback from ProductImageCropperModal
  const handleConfirmCrop = async (
    webpBlob: Blob,
    previewUrl: string,
    slot: CropTargetSlot = activeCropSlot,
    continueToNext = false
  ) => {
    // Immediate optimistic preview
    if (slot === 'display') setImage(previewUrl);
    else if (slot === 'detail') setDetailImage(previewUrl);
    else if (slot === 'banner') setBannerImage(previewUrl);

    setUploadingSlot(slot);
    try {
      const uploadedUrl = await uploadWebpBlob(webpBlob, `product-${slot}`);

      if (slot === 'display') {
        setImage(uploadedUrl);

        // If user clicked "Simpan Display Saja" (not continuing manually to Detail)
        // and detailImage is still empty, auto-crop 4:3 from the same source so Detail is automatically populated!
        if (!continueToNext && !detailImage && (cropSourceSrc || masterImageSrc)) {
          try {
            const srcForAutoDetail = (cropSourceSrc || masterImageSrc)!;
            const autoDetail = await autoCropImageToWebp(srcForAutoDetail, 800, 600);
            setDetailImage(autoDetail.previewUrl);
            const detailUrl = await uploadWebpBlob(autoDetail.blob, 'product-detail-auto');
            setDetailImage(detailUrl);
          } catch {
            // Fallback to display image URL if auto-crop fails
            setDetailImage(uploadedUrl);
          }
        }
      } else if (slot === 'detail') {
        setDetailImage(uploadedUrl);
      } else if (slot === 'banner') {
        setBannerImage(uploadedUrl);
      }

      if (continueToNext && slot === 'display') {
        setActiveCropSlot('detail');
        showToast('Foto Display tersimpan! Silakan sesuaikan potongan Foto Detail.', 'success');
      } else {
        const slotLabel =
          slot === 'display'
            ? 'Foto Display'
            : slot === 'detail'
            ? 'Foto Detail Produk'
            : 'Foto Banner';
        showToast(`${slotLabel} berhasil dipotong & diunggah!`, 'success');
      }
    } catch (err: any) {
      showToast('Gagal mengunggah gambar: ' + err.message, 'error');
    } finally {
      setUploadingSlot(null);
      if (masterFileInputRef.current) masterFileInputRef.current.value = '';
      if (slotFileInputRef.current) slotFileInputRef.current.value = '';
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
      setFormTab('info');
      return showToast('Nama menu, harga jual, dan kategori wajib diisi', 'error');
    }

    if (!description.trim()) {
      setFormTab('info');
      return showToast(
        'Deskripsi produk wajib diisi (Anda bisa klik tombol Buat Deskripsi AI)',
        'error'
      );
    }

    // Effective Display & Detail images (if only display is filled, detail falls back to display)
    const effectiveDisplayImage = image || detailImage || null;
    const effectiveDetailImage = detailImage || image || null;

    setSaving(true);
    try {
      const modifiersData: ModifiersData = {
        ...existingModifiersRaw,
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
        detailImage: effectiveDetailImage,
        bannerImage: showBannerSlot && bannerImage ? bannerImage : null,
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
        image: effectiveDisplayImage,
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

  // Ordered steps for current product type
  const stepTabs: {
    id: FormStepTab;
    stepNum: number;
    label: string;
    shortLabel: string;
    icon: any;
    badgeText?: string;
  }[] = [
    {
      id: 'info',
      stepNum: 1,
      label: 'Info & Deskripsi',
      shortLabel: 'Info',
      icon: FileText,
    },
    {
      id: 'photos',
      stepNum: 2,
      label: 'Foto & Visual',
      shortLabel: 'Foto',
      icon: ImageIcon,
      badgeText:
        image && (detailImage || image)
          ? showBannerSlot && bannerImage
            ? '3/3'
            : '2/2'
          : '0/2',
    },
    currentType === 'combo'
      ? {
          id: 'bundle',
          stepNum: 3,
          label: 'Paket Bundling',
          shortLabel: 'Bundling',
          icon: Layers,
        }
      : {
          id: 'modifiers',
          stepNum: 3,
          label: 'Varian & Kustomisasi',
          shortLabel: 'Varian',
          icon: SlidersHorizontal,
        },
    {
      id: 'promo',
      stepNum: 4,
      label: 'Flash Sale Promo',
      shortLabel: 'Promo',
      icon: Flame,
      badgeText: promoActive ? 'Aktif' : undefined,
    },
  ];

  const currentStepIndex = stepTabs.findIndex((t) => t.id === formTab);
  const effectiveDetailPreview = detailImage || image;

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-950/65 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-stone-200/90 overflow-hidden z-10 flex flex-col max-h-[92vh] text-left"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-gradient-to-r from-orange-50/70 via-amber-50/40 to-white shrink-0">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
                  {currentType === 'makanan' ? (
                    <Utensils className="w-5 h-5" />
                  ) : currentType === 'combo' ? (
                    <Layers className="w-5 h-5" />
                  ) : (
                    <CupSoda className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-heading font-extrabold text-base sm:text-lg text-stone-900 truncate">
                      {product ? `Edit Produk: ${product.name}` : 'Tambah Menu Produk Baru'}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-orange-100 text-orange-700 border border-orange-200/70">
                      {currentType === 'makanan'
                        ? 'Makanan / Snack'
                        : currentType === 'combo'
                        ? 'Paket Bundling'
                        : 'Minuman'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Lengkapi setiap tahap di bawah ini dengan mudah dan terstruktur.
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Clean 4-Step Navigation Bar */}
            <div className="px-5 py-3 bg-stone-50/90 border-b border-stone-200/80 shrink-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {stepTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = formTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFormTab(tab.id)}
                      className={`px-3 py-2.5 rounded-2xl text-left transition-all flex items-center justify-between gap-2 cursor-pointer border ${
                        isActive
                          ? 'bg-white border-orange-400 shadow-sm ring-2 ring-orange-500/15'
                          : 'bg-stone-100/70 border-stone-200/70 hover:bg-white hover:border-stone-300 text-stone-600'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold shrink-0 transition-colors ${
                            isActive
                              ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-xs'
                              : 'bg-stone-200/80 text-stone-600'
                          }`}
                        >
                          {tab.stepNum}
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`text-[10px] font-bold uppercase tracking-wider leading-none ${
                              isActive ? 'text-orange-600' : 'text-stone-400'
                            }`}
                          >
                            Tahap {tab.stepNum}
                          </p>
                          <p
                            className={`text-xs font-extrabold truncate mt-0.5 ${
                              isActive ? 'text-stone-900' : 'text-stone-600'
                            }`}
                          >
                            {tab.label}
                          </p>
                        </div>
                      </div>

                      {tab.badgeText ? (
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold shrink-0 ${
                            isActive
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-stone-200 text-stone-600'
                          }`}
                        >
                          {tab.badgeText}
                        </span>
                      ) : (
                        <Icon
                          className={`w-3.5 h-3.5 shrink-0 hidden md:block ${
                            isActive ? 'text-orange-500' : 'text-stone-400'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-[#FAF8F5]/40">
              {/* ================================================================= */}
              {/* TAHAP 1: INFO & DESKRIPSI PRODUK (TANPA FOTO)                     */}
              {/* ================================================================= */}
              {formTab === 'info' && (
                <div className="space-y-5">
                  {/* Product Type Selector Pill Bar */}
                  <div className="p-3.5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-extrabold text-stone-800">Jenis Menu Produk</p>
                      <p className="text-[11px] text-stone-500">
                        Menentukan opsi kustomisasi (gula, es, ukuran) yang muncul untuk pelanggan.
                      </p>
                    </div>
                    <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200/80 shrink-0">
                      {(
                        [
                          { id: 'minuman' as const, label: 'Minuman', icon: CupSoda },
                          { id: 'makanan' as const, label: 'Makanan', icon: Utensils },
                          { id: 'combo' as const, label: 'Bundling', icon: Layers },
                        ]
                      ).map((t) => {
                        const Icon = t.icon;
                        const active = currentType === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setCurrentType(t.id);
                              if (t.id === 'makanan') {
                                setShowSweetness(false);
                                setShowMatcha(false);
                                setShowEspressoShot(false);
                                setModIce([]);
                                setModSugar([]);
                                setIsBundle(false);
                              } else if (t.id === 'combo') {
                                setIsBundle(true);
                              } else {
                                setIsBundle(false);
                                if (modIce.length === 0) {
                                  setModIce(['Normal Ice', 'Less Ice', 'No Ice']);
                                }
                                if (modSugar.length === 0) {
                                  setModSugar(['Less', 'Biasa', 'Lumayan', 'Manis Sekali']);
                                }
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              active
                                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                                : 'text-stone-600 hover:text-stone-900'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Name & Category Card */}
                  <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Name */}
                      <div>
                        <label className="block text-xs font-extrabold text-stone-800 mb-1.5">
                          Nama Menu Produk <span className="text-rose-500">*</span>
                        </label>
                        <input
                          ref={nameInputRef}
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Contoh: Signature Caramel Oat Latte"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-900 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
                        />
                      </div>

                      {/* Category */}
                      <div>
                        <label className="block text-xs font-extrabold text-stone-800 mb-1.5">
                          Kategori Katalog <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={categoryId}
                          onChange={(e) => setCategoryId(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-900 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Description + Side-by-Side AI Generator Button */}
                    <div className="pt-1">
                      <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                        <label className="text-xs font-extrabold text-stone-800">
                          Deskripsi Produk <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[11px] text-stone-400 font-medium">
                          {name.trim()
                            ? `Siap merangkai deskripsi untuk "${name.trim()}"`
                            : 'Isi Nama Menu terlebih dahulu untuk memakai AI otomatis'}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch gap-3">
                        <div className="flex-1">
                          <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            placeholder="Ceritakan cita rasa, aroma, bahan baku utama, atau keunikan menu ini..."
                            className="w-full h-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-800 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 leading-relaxed transition-all resize-none"
                          />
                        </div>

                        {/* AI Auto-Description Button beside Description */}
                        <button
                          type="button"
                          onClick={handleGenerateAiDescription}
                          disabled={generatingAiDesc}
                          title={
                            name.trim()
                              ? `Buat deskripsi otomatis untuk ${name}`
                              : 'Wajib mengisi nama menu dahulu'
                          }
                          className={`sm:w-44 px-4 py-3 rounded-xl border text-left flex sm:flex-col items-center sm:items-start justify-between gap-2 transition-all cursor-pointer shrink-0 ${
                            name.trim()
                              ? 'bg-gradient-to-br from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-orange-500 shadow-md shadow-orange-500/15 active:scale-[0.98]'
                              : 'bg-orange-50/70 hover:bg-orange-100/70 text-orange-800 border-orange-200/80'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                name.trim()
                                  ? 'bg-white/20 text-white'
                                  : 'bg-orange-100 text-orange-600'
                              }`}
                            >
                              {generatingAiDesc ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Wand2 className="w-4 h-4" />
                              )}
                            </div>
                            <span className="text-xs font-extrabold leading-tight">
                              {generatingAiDesc ? 'Merangkai...' : 'Deskripsi AI'}
                            </span>
                          </div>

                          <p
                            className={`text-[10px] leading-snug ${
                              name.trim() ? 'text-orange-50 font-medium' : 'text-orange-700/80'
                            }`}
                          >
                            {name.trim()
                              ? 'Klik untuk buat otomatis sesuai nama menu'
                              : 'Wajib isi nama menu dahulu'}
                          </p>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Price & Status Badge Card */}
                  <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                      {/* Base Price */}
                      <div className="md:col-span-5">
                        <label className="block text-xs font-extrabold text-stone-800 mb-1.5">
                          Harga Jual Dasar (Rp) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-orange-600">
                            Rp
                          </span>
                          <input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder="25000"
                            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-200 text-sm font-extrabold text-stone-900 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
                          />
                        </div>
                        {Number(price) > 0 && (
                          <p className="text-[11px] text-orange-600 mt-1.5 font-bold">
                            Tampil di menu: {formatRupiah(Number(price))}
                          </p>
                        )}
                      </div>

                      {/* Visual Badge Selector */}
                      <div className="md:col-span-7">
                        <label className="block text-xs font-extrabold text-stone-800 mb-1.5">
                          Label Highlight / Status Ketersediaan
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {(
                            [
                              {
                                val: '',
                                label: 'Normal',
                                desc: 'Tersedia',
                                icon: CheckCircle2,
                              },
                              {
                                val: 'best-seller',
                                label: 'Best Seller',
                                desc: 'Favorit',
                                icon: Award,
                              },
                              {
                                val: 'new',
                                label: 'Menu Baru',
                                desc: 'Rilis Baru',
                                icon: Sparkles,
                              },
                              {
                                val: 'sold-out',
                                label: 'Habis',
                                desc: 'Stok Kosong',
                                icon: Ban,
                              },
                            ]
                          ).map((b) => {
                            const Icon = b.icon;
                            const isSelected = badge === b.val;
                            return (
                              <button
                                key={b.val}
                                type="button"
                                onClick={() => setBadge(b.val)}
                                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                  isSelected
                                    ? b.val === 'sold-out'
                                      ? 'bg-rose-50 border-rose-400 text-rose-800 ring-2 ring-rose-500/15'
                                      : 'bg-orange-50 border-orange-400 text-orange-900 ring-2 ring-orange-500/15'
                                    : 'bg-stone-50/60 border-stone-200 text-stone-600 hover:bg-white hover:border-stone-300'
                                }`}
                              >
                                <Icon
                                  className={`w-4 h-4 mb-1.5 ${
                                    isSelected
                                      ? b.val === 'sold-out'
                                        ? 'text-rose-600'
                                        : 'text-orange-600'
                                      : 'text-stone-400'
                                  }`}
                                />
                                <div>
                                  <p className="text-xs font-extrabold leading-tight">{b.label}</p>
                                  <p className="text-[10px] opacity-75 mt-0.5">{b.desc}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* TAHAP 2: FOTO & VISUAL (2 WAJIB: DISPLAY & DETAIL + 1 OPSIONAL)   */}
              {/* ================================================================= */}
              {formTab === 'photos' && (
                <div className="space-y-5">
                  {/* Hidden file inputs */}
                  <input
                    ref={masterFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleMasterFileChange}
                    className="hidden"
                  />
                  <input
                    ref={slotFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSlotFileChange}
                    className="hidden"
                  />

                  {/* Master Photo Source Banner (1 Upload -> Crop Each Slot) */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-orange-50 via-amber-50/60 to-white border border-orange-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-sm shrink-0">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-extrabold text-stone-900">
                            Unggah 1 Foto Utama untuk Semua Tampilan
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white text-orange-700 border border-orange-200">
                            Praktis & Cepat
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                          Cukup unggah <strong>1 foto sumber</strong>, lalu Anda tinggal mengatur posisi potongan (*crop*) masing-masing untuk <strong>Display Katalog (1:1)</strong>, <strong>Detail Produk (4:3)</strong>, hingga <strong>Banner (Opsional)</strong>.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => masterFileInputRef.current?.click()}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/20 flex items-center gap-2 transition-all shrink-0 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{masterImageSrc || image ? 'Ganti Foto Sumber' : 'Pilih 1 Foto Sumber'}</span>
                    </button>
                  </div>

                  {/* 2 MANDATORY IMAGE CARDS SIDE-BY-SIDE */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* CARD 1: DISPLAY IMAGE (WAJIB 1/2) */}
                    <div className="p-4 rounded-2xl bg-white border border-stone-200/90 shadow-2xs flex flex-col justify-between space-y-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-orange-100 text-orange-800">
                              WAJIB 1/2
                            </span>
                            <span className="text-[11px] font-mono font-bold text-stone-400">
                              1:1 • 600×600 px
                            </span>
                          </div>
                          <h5 className="font-bold text-xs sm:text-sm text-stone-900 mt-1.5 flex items-center gap-1.5">
                            <Smartphone className="w-4 h-4 text-orange-500" />
                            <span>1. Gambar Display Katalog</span>
                          </h5>
                          <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                            Tampil pada kartu menu di halaman utama, SPMB, dan layar POS Kasir.
                          </p>
                        </div>

                        {image && (
                          <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold flex items-center gap-1 shrink-0">
                            <Check className="w-3 h-3" /> Siap
                          </span>
                        )}
                      </div>

                      {/* Preview Area */}
                      {image ? (
                        <div className="relative w-full aspect-square max-h-52 mx-auto rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 group">
                          <img
                            src={image}
                            alt="Preview Display"
                            className="w-full h-full object-cover"
                          />
                          {uploadingSlot === 'display' && (
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center text-white text-xs font-bold gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" /> Mengunggah...
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          onClick={() => openCropperForSlot('display')}
                          className="w-full aspect-square max-h-52 mx-auto rounded-2xl border-2 border-dashed border-stone-200 hover:border-orange-400 bg-stone-50/70 hover:bg-orange-50/30 flex flex-col items-center justify-center cursor-pointer transition-all p-4 text-center"
                        >
                          <ImageIcon className="w-7 h-7 text-stone-300 mb-1.5" />
                          <p className="text-xs font-bold text-stone-600">
                            Belum ada Foto Display
                          </p>
                          <p className="text-[10px] text-stone-400 mt-0.5">
                            Klik untuk unggah & potong rasio 1:1
                          </p>
                        </div>
                      )}

                      {/* Slot Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => openCropperForSlot('display')}
                          className="flex-1 py-2 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Crop className="w-3.5 h-3.5" />
                          <span>{image ? 'Atur Crop Display' : 'Crop dari Sumber'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDirectUploadSlot('display');
                            slotFileInputRef.current?.click();
                          }}
                          className="py-2 px-3 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          title="Unggah file berbeda khusus Display"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>File Baru</span>
                        </button>
                      </div>
                    </div>

                    {/* CARD 2: DETAIL PRODUCT IMAGE (WAJIB 2/2) */}
                    <div className="p-4 rounded-2xl bg-white border border-stone-200/90 shadow-2xs flex flex-col justify-between space-y-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-900">
                              WAJIB 2/2
                            </span>
                            <span className="text-[11px] font-mono font-bold text-stone-400">
                              4:3 • 800×600 px
                            </span>
                          </div>
                          <h5 className="font-bold text-xs sm:text-sm text-stone-900 mt-1.5 flex items-center gap-1.5">
                            <Monitor className="w-4 h-4 text-amber-600" />
                            <span>2. Gambar Detail Produk</span>
                          </h5>
                          <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                            Tampil saat produk dibuka pelanggan untuk memilih ukuran, kemanisan & topping.
                          </p>
                        </div>

                        {effectiveDetailPreview && (
                          <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold flex items-center gap-1 shrink-0">
                            <Check className="w-3 h-3" />{' '}
                            {detailImage ? 'Crop Khusus' : 'Auto-Crop'}
                          </span>
                        )}
                      </div>

                      {/* Preview Area */}
                      {effectiveDetailPreview ? (
                        <div className="space-y-1.5">
                          <div className="relative w-full aspect-[4/3] max-h-52 mx-auto rounded-2xl overflow-hidden bg-stone-100 border border-stone-200">
                            <img
                              src={effectiveDetailPreview}
                              alt="Preview Detail Produk"
                              className="w-full h-full object-cover"
                            />
                            {uploadingSlot === 'detail' && (
                              <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center text-white text-xs font-bold gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" /> Mengunggah...
                              </div>
                            )}
                            {!detailImage && image && (
                              <span className="absolute bottom-2 left-2 right-2 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-xs text-white text-[10px] font-semibold text-center">
                                Ter-crop otomatis dari Foto Display • Klik &ldquo;Atur Crop Detail&rdquo; untuk ubah posisi
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => openCropperForSlot('detail')}
                          className="w-full aspect-[4/3] max-h-52 mx-auto rounded-2xl border-2 border-dashed border-stone-200 hover:border-amber-400 bg-stone-50/70 hover:bg-amber-50/30 flex flex-col items-center justify-center cursor-pointer transition-all p-4 text-center"
                        >
                          <Monitor className="w-7 h-7 text-stone-300 mb-1.5" />
                          <p className="text-xs font-bold text-stone-600">
                            Belum ada Foto Detail Produk
                          </p>
                          <p className="text-[10px] text-stone-400 mt-0.5">
                            Otomatis terisi jika Anda mengunggah Foto Display, atau klik untuk atur crop 4:3
                          </p>
                        </div>
                      )}

                      {/* Slot Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => openCropperForSlot('detail')}
                          className="flex-1 py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Crop className="w-3.5 h-3.5" />
                          <span>Atur Crop Detail</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDirectUploadSlot('detail');
                            slotFileInputRef.current?.click();
                          }}
                          className="py-2 px-3 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          title="Unggah file berbeda khusus Detail"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>File Baru</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* CARD 3: OPTIONAL BANNER IMAGE (OPSIONAL 3/3) */}
                  <div className="p-4 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-stone-100 text-stone-700 border border-stone-200">
                            OPSIONAL (KE-3)
                          </span>
                          <span className="text-[11px] font-mono font-bold text-stone-400">
                            16:10 • 960×600 px
                          </span>
                        </div>
                        <h5 className="font-bold text-xs sm:text-sm text-stone-900 mt-1 flex items-center gap-1.5">
                          <Maximize2 className="w-4 h-4 text-orange-500" />
                          <span>3. Gambar Banner Promosi Produk (Opsional)</span>
                        </h5>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          Tambahkan jika produk ini ingin ditampilkan pada slide banner lanskap atau highlight Flash Sale.
                        </p>
                      </div>

                      {!showBannerSlot ? (
                        <button
                          type="button"
                          onClick={() => {
                            setShowBannerSlot(true);
                            if (masterImageSrc || image) {
                              openCropperForSlot('banner');
                            }
                          }}
                          className="px-3.5 py-2 rounded-xl border border-orange-300 bg-orange-50/70 hover:bg-orange-100 text-orange-700 font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah Gambar Banner</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setShowBannerSlot(false);
                            setBannerImage(null);
                          }}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus Banner</span>
                        </button>
                      )}
                    </div>

                    {showBannerSlot && (
                      <div className="pt-2 border-t border-stone-100 space-y-3">
                        {bannerImage ? (
                          <div className="relative w-full aspect-[16/10] max-h-52 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200">
                            <img
                              src={bannerImage}
                              alt="Preview Banner"
                              className="w-full h-full object-cover"
                            />
                            {uploadingSlot === 'banner' && (
                              <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center text-white text-xs font-bold gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" /> Mengunggah Banner...
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            onClick={() => openCropperForSlot('banner')}
                            className="w-full py-8 rounded-2xl border-2 border-dashed border-stone-200 hover:border-orange-400 bg-stone-50/70 flex flex-col items-center justify-center cursor-pointer transition-all text-center"
                          >
                            <Maximize2 className="w-6 h-6 text-stone-300 mb-1" />
                            <p className="text-xs font-bold text-stone-600">
                              Klik untuk memotong Banner dari Foto Sumber atau Unggah Baru
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openCropperForSlot('banner')}
                            className="px-3.5 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Crop className="w-3.5 h-3.5" />
                            <span>Crop Banner dari Sumber</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDirectUploadSlot('banner');
                              slotFileInputRef.current?.click();
                            }}
                            className="px-3.5 py-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Unggah File Banner Berbeda</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* TAHAP 3: VARIAN & KUSTOMISASI (MINUMAN / MAKANAN)                 */}
              {/* ================================================================= */}
              {formTab === 'modifiers' && (
                <div className="space-y-5">
                  {currentType === 'minuman' && (
                    <>
                      {/* Ice & Sugar Levels Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Ice Levels */}
                        <div className="p-4 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-3">
                          <div>
                            <h4 className="text-xs font-extrabold text-stone-900 uppercase tracking-wider">
                              Pilihan Tingkat Es (Ice Level)
                            </h4>
                            <p className="text-[11px] text-stone-500 mt-0.5">
                              Pilih opsi es yang tersedia untuk minuman ini.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {ALL_ICE_LEVELS.map((level) => {
                              const isChecked = modIce.includes(level);
                              return (
                                <button
                                  key={level}
                                  type="button"
                                  onClick={() => toggleIce(level)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    isChecked
                                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-500 shadow-xs'
                                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:border-orange-300'
                                  }`}
                                >
                                  {level}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Sugar Sweetness Levels */}
                        <div className="p-4 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-xs font-extrabold text-stone-900 uppercase tracking-wider">
                                Tingkat Kemanisan (Sugar)
                              </h4>
                              <p className="text-[11px] text-stone-500 mt-0.5">
                                Pilihan takaran gula saat pelanggan memesan.
                              </p>
                            </div>
                            <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5 cursor-pointer shrink-0">
                              <input
                                type="checkbox"
                                checked={showSweetness}
                                onChange={(e) => setShowSweetness(e.target.checked)}
                                className="rounded text-orange-500 focus:ring-orange-500"
                              />
                              <span>Aktif</span>
                            </label>
                          </div>

                          {showSweetness ? (
                            <div className="flex flex-wrap gap-2">
                              {ALL_SUGAR_LEVELS.map((sugar) => {
                                const isChecked = modSugar.includes(sugar);
                                return (
                                  <button
                                    key={sugar}
                                    type="button"
                                    onClick={() => toggleSugar(sugar)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                      isChecked
                                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500 shadow-xs'
                                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:border-amber-300'
                                    }`}
                                  >
                                    {sugar}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-[11px] text-stone-400 italic">
                              Opsi gula disembunyikan untuk minuman ini.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Matcha & Espresso Specialized Customizers */}
                      <div className="p-4 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-3">
                        <h4 className="text-xs font-extrabold text-stone-900 uppercase tracking-wider">
                          Kustomisasi Khusus Matcha & Kopi
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Matcha Slider Toggle */}
                          <label className="flex items-center justify-between p-3.5 rounded-xl bg-stone-50/70 hover:bg-orange-50/40 border border-stone-200/80 cursor-pointer transition-colors">
                            <div className="pr-3">
                              <p className="text-xs font-bold text-stone-800">
                                Slider Intensitas Matcha (Level 1 - 10)
                              </p>
                              <p className="text-[10px] text-stone-500 mt-0.5">
                                Menampilkan pengatur kepekatan bubuk matcha di layar pelanggan.
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              checked={showMatcha}
                              onChange={(e) => setShowMatcha(e.target.checked)}
                              className="rounded text-orange-500 w-4 h-4 shrink-0"
                            />
                          </label>

                          {/* Espresso Shot Toggle */}
                          <label className="flex items-center justify-between p-3.5 rounded-xl bg-stone-50/70 hover:bg-orange-50/40 border border-stone-200/80 cursor-pointer transition-colors">
                            <div className="pr-3">
                              <p className="text-xs font-bold text-stone-800">
                                Opsi Tambahan Espresso Shot
                              </p>
                              <p className="text-[10px] text-stone-500 mt-0.5">
                                Pelanggan dapat memilih Single, Double, atau Triple Shot.
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              checked={showEspressoShot}
                              onChange={(e) => setShowEspressoShot(e.target.checked)}
                              className="rounded text-orange-500 w-4 h-4 shrink-0"
                            />
                          </label>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Size Variants & Add-Ons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Size Variants */}
                    <div className="p-4 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-3">
                      <div>
                        <h4 className="text-xs font-extrabold text-stone-900 uppercase tracking-wider">
                          Varian Ukuran (Size Options)
                        </h4>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          Tambahkan opsi ukuran beserta selisih harganya.
                        </p>
                      </div>

                      <div className="space-y-2">
                        {modSizes.map((sz, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200/70"
                          >
                            <span className="text-xs font-bold text-stone-800">{sz.name}</span>
                            <div className="flex items-center gap-2.5">
                              <span className="text-xs font-mono font-bold text-orange-600">
                                +{formatRupiah(sz.price)}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeSizeOption(idx)}
                                className="text-stone-400 hover:text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}

                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={newSizeName}
                            onChange={(e) => setNewSizeName(e.target.value)}
                            placeholder="Ukuran (e.g. Large)"
                            className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-stone-50/50 focus:bg-white"
                          />
                          <input
                            type="number"
                            value={newSizePrice}
                            onChange={(e) => setNewSizePrice(e.target.value)}
                            placeholder="+Harga"
                            className="w-24 px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-stone-50/50 focus:bg-white"
                          />
                          <button
                            type="button"
                            onClick={addSizeOption}
                            className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shrink-0 cursor-pointer"
                          >
                            Tambah
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Add-ons / Toppings */}
                    <div className="p-4 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-3">
                      <div>
                        <h4 className="text-xs font-extrabold text-stone-900 uppercase tracking-wider">
                          Topping & Add-On Khusus
                        </h4>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          Topping ekstra yang bisa dipilih pada menu ini.
                        </p>
                      </div>

                      <div className="space-y-2">
                        {modAddOns.map((addon) => (
                          <div
                            key={addon.id}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200/70"
                          >
                            <span className="text-xs font-bold text-stone-800">{addon.name}</span>
                            <div className="flex items-center gap-2.5">
                              <span className="text-xs font-mono font-bold text-orange-600">
                                +{formatRupiah(addon.price)}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeAddOn(addon.id)}
                                className="text-stone-400 hover:text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}

                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={newAddOnName}
                            onChange={(e) => setNewAddOnName(e.target.value)}
                            placeholder="Add-on (e.g. Oat Milk)"
                            className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-stone-50/50 focus:bg-white"
                          />
                          <input
                            type="number"
                            value={newAddOnPrice}
                            onChange={(e) => setNewAddOnPrice(e.target.value)}
                            placeholder="+Harga"
                            className="w-24 px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-stone-50/50 focus:bg-white"
                          />
                          <button
                            type="button"
                            onClick={addAddOn}
                            className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shrink-0 cursor-pointer"
                          >
                            Tambah
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* TAHAP 3 (COMBO): PAKET BUNDLING                                   */}
              {/* ================================================================= */}
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

              {/* ================================================================= */}
              {/* TAHAP 4: FLASH SALE PROMO                                         */}
              {/* ================================================================= */}
              {formTab === 'promo' && (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/70 flex items-center justify-center shrink-0">
                          <Flame className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-extrabold text-stone-900">
                            Aktifkan Flash Sale / Countdown Promo
                          </h4>
                          <p className="text-xs text-stone-500 mt-0.5">
                            Menampilkan harga coret transparan dan hitung mundur waktu promo di SPMB & Web Store.
                          </p>
                        </div>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={promoActive}
                          onChange={(e) => setPromoActive(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                      </label>
                    </div>

                    {promoActive && (
                      <div className="space-y-4 pt-4 border-t border-stone-100">
                        <div>
                          <label className="block text-xs font-extrabold text-stone-800 mb-1.5">
                            Harga Diskon Promo (Rp) <span className="text-rose-600">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-rose-600">
                              Rp
                            </span>
                            <input
                              type="number"
                              value={promoPrice}
                              onChange={(e) => setPromoPrice(e.target.value)}
                              placeholder="19000"
                              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-rose-200 text-sm font-extrabold bg-rose-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                            />
                          </div>

                          {/* Transparent Discount Preview (Rule 8) */}
                          {Number(price) > 0 &&
                            Number(promoPrice) > 0 &&
                            Number(price) > Number(promoPrice) && (
                              <div className="mt-2.5 px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200/80 text-xs font-bold text-rose-700 flex items-center justify-between">
                                <span>Rincian Potongan Transparan:</span>
                                <span>
                                  {formatRupiah(Number(price))} -{' '}
                                  {formatRupiah(Number(price) - Number(promoPrice))} ={' '}
                                  {formatRupiah(Number(promoPrice))}
                                </span>
                              </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-stone-400" /> Tanggal Mulai Promo
                            </label>
                            <input
                              type="datetime-local"
                              value={promoStartDate}
                              onChange={(e) => setPromoStartDate(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold bg-stone-50/50 focus:bg-white focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-stone-400" /> Tanggal Berakhir Promo
                            </label>
                            <input
                              type="datetime-local"
                              value={promoEndDate}
                              onChange={(e) => setPromoEndDate(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold bg-stone-50/50 focus:bg-white focus:outline-none focus:border-orange-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions with Stepper Navigation & Direct Save */}
            <div className="px-6 py-4 border-t border-stone-200/80 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                {currentStepIndex > 0 ? (
                  <button
                    type="button"
                    onClick={() => setFormTab(stepTabs[currentStepIndex - 1].id)}
                    className="px-3.5 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-bold text-xs hover:bg-stone-100 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Sebelumnya</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={saving}
                    className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-100 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                {currentStepIndex < stepTabs.length - 1 && (
                  <button
                    type="button"
                    onClick={() => setFormTab(stepTabs[currentStepIndex + 1].id)}
                    className="px-4 py-2.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Tahap Berikutnya</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || uploadingSlot !== null}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{product ? 'Simpan Perubahan' : 'Buat Produk Sekarang'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Multi-Slot Cropper Modal */}
      <ProductImageCropperModal
        imageSrc={cropSourceSrc}
        isOpen={showCropper}
        onClose={() => setShowCropper(false)}
        targetSlot={activeCropSlot}
        onChangeSlot={(slot) => setActiveCropSlot(slot)}
        hasDisplayCropped={Boolean(image)}
        hasDetailCropped={Boolean(detailImage)}
        hasBannerCropped={Boolean(bannerImage)}
        includeBannerSlot={showBannerSlot}
        onConfirmCrop={handleConfirmCrop}
      />
    </>
  );
}
