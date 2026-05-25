'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Image as ImageIcon, Trash2, Edit2, Loader2, Save, X, Eye, EyeOff, Monitor, Smartphone } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast';

interface HeroBanner {
  id?: string;
  image: string;
  alt: string;
  headline: string;
  subheadline: string;
  isActive: boolean;
  isCover: boolean;
  order: number;
}

export default function HeroBannersClient({ initialBanners }: { initialBanners: HeroBanner[] }) {
  const { showToast } = useToast();
  const [banners, setBanners] = useState(initialBanners);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<HeroBanner | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [bannerToDelete, setBannerToDelete] = useState<{id: string, name: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Preview Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewBanner, setPreviewBanner] = useState<HeroBanner | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Crop Modal State
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [sourceImageSrc, setSourceImageSrc] = useState<string | null>(null);
  const [cropAspectRatio, setCropAspectRatio] = useState<3.6 | 2.1>(3.6);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(1);

  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [formData, setFormData] = useState({
    image: '',
    alt: 'Promo Image',
    headline: '',
    subheadline: '',
    isActive: true,
    isCover: true,
    order: 0
  });

  const router = useRouter();

  const handleOpenPreview = (banner: HeroBanner) => {
    setPreviewBanner(banner);
    setPreviewMode('desktop');
    setIsPreviewOpen(true);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setPosition({ x: touch.clientX - dragStart.x, y: touch.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCropAndUpload = async () => {
    if (!viewportRef.current || !imageRef.current) return;
    
    setUploadingImage(true);
    try {
      const rectV = viewportRef.current.getBoundingClientRect();
      const rectI = imageRef.current.getBoundingClientRect();
      
      const naturalWidth = imageRef.current.naturalWidth;
      const naturalHeight = imageRef.current.naturalHeight;
      
      const scaleX = naturalWidth / rectI.width;
      const scaleY = naturalHeight / rectI.height;
      
      const cropX = (rectV.left - rectI.left) * scaleX;
      const cropY = (rectV.top - rectI.top) * scaleY;
      const cropW = rectV.width * scaleX;
      const cropH = rectV.height * scaleY;
      
      const targetW = cropAspectRatio === 3.6 ? 1440 : 1050;
      const targetH = cropAspectRatio === 3.6 ? 400 : 500;
      
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Could not get canvas context');
      
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, targetW, targetH);
      
      ctx.drawImage(
        imageRef.current,
        cropX,
        cropY,
        cropW,
        cropH,
        0,
        0,
        targetW,
        targetH
      );
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast('Gagal memproses potongan gambar', 'error');
          setUploadingImage(false);
          return;
        }
        
        const file = new File([blob], 'cropped_banner.jpg', { type: 'image/jpeg' });
        const form = new FormData();
        form.append('file', file);
        
        const res = await fetch('/api/admin/upload/banner', {
          method: 'POST',
          body: form
        });
        
        if (!res.ok) throw new Error('Upload failed');
        
        const data = await res.json();
        setFormData(prev => ({ ...prev, image: data.url }));
        setIsCropModalOpen(false);
        setSourceImageSrc(null);
        showToast('Gambar berhasil dipangkas dan diunggah', 'success');
        setUploadingImage(false);
      }, 'image/jpeg', 0.9);
      
    } catch {
      showToast('Gagal memproses gambar', 'error');
      setUploadingImage(false);
    }
  };

  const handleOpenModal = (banner?: HeroBanner) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData({
        image: banner.image,
        alt: banner.alt,
        headline: banner.headline,
        subheadline: banner.subheadline,
        isActive: banner.isActive,
        isCover: banner.isCover !== undefined ? banner.isCover : true,
        order: banner.order
      });
    } else {
      setEditingBanner(null);
      setFormData({
        image: '',
        alt: 'Promo Banner',
        headline: '',
        subheadline: '',
        isActive: true,
        isCover: true,
        order: banners.length
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.image || !formData.headline || !formData.subheadline) {
      showToast("Harap isi URL Gambar, Judul, dan Sub-judul", "error");
      return;
    }

    setLoading(true);
    try {
      const url = editingBanner ? `/api/admin/banners/${editingBanner.id}` : '/api/admin/banners';
      const method = editingBanner ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('API failed');

      const saved = await res.json();
      
      if (editingBanner) {
        setBanners(banners.map(b => b.id === saved.id ? saved : b).sort((a,b) => a.order - b.order));
      } else {
        setBanners([...banners, saved].sort((a,b) => a.order - b.order));
      }

      setIsModalOpen(false);
      router.refresh();
    } catch (err) {
      console.error(err);
      showToast('Gagal menyimpan banner.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!bannerToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/banners/${bannerToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      
      setBanners(banners.filter(b => b.id !== bannerToDelete.id));
      setIsDeleteModalOpen(false);
      setBannerToDelete(null);
      router.refresh();
    } catch (err) {
      console.error(err);
      showToast('Gagal menghapus banner.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setBannerToDelete({ id, name });
    setIsDeleteModalOpen(true);
  };

  const toggleStatus = async (banner: HeroBanner) => {
    try {
      const res = await fetch(`/api/admin/banners/${banner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !banner.isActive })
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setBanners(banners.map(b => b.id === banner.id ? saved : b));
    } catch {
      showToast("Gagal merubah status", "error");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('image/')) {
      showToast('File harus berupa gambar', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSourceImageSrc(reader.result as string);
      setPosition({ x: 0, y: 0 });
      setZoom(1);
      setIsCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">Promo Banners</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kelola gambar slide promosi di halaman Home</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Tambah Banner</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {banners.length === 0 ? (
           <div className="col-span-full py-20 text-center bg-white border border-border/50 rounded-2xl">
              <ImageIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-foreground font-medium">Belum ada Banner Promo</p>
              <p className="text-sm text-muted-foreground mt-1">Tambahkan banner untuk menampilkannya di halaman Home.</p>
           </div>
        ) : banners.map((banner) => (
          <div key={banner.id} className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden group">
            <div className="relative aspect-[3/2] bg-muted flex items-center justify-center overflow-hidden">
                <Image 
                   src={banner.image} 
                   alt={banner.alt} 
                   fill 
                   className={`${banner.isCover === false ? 'object-contain' : 'object-cover'} transition-transform group-hover:scale-105`} 
                   onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/18442D/FFF?text=Error'; }} 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                     <h3 className="font-heading font-bold text-lg leading-tight whitespace-pre-line drop-shadow-md">{banner.headline}</h3>
                     <p className="text-xs text-white/90 mt-1 line-clamp-1 opacity-80">{banner.subheadline}</p>
                </div>
                <div className="absolute top-3 right-3 flex gap-2">
                    <button 
                       onClick={() => toggleStatus(banner)}
                       title={banner.isActive ? "Tampilkan" : "Sembunyikan"}
                       className={`p-2 rounded-xl backdrop-blur-md shadow-sm transition-colors text-white ${banner.isActive ? 'bg-brand-500/80 hover:bg-brand-500' : 'bg-gray-500/80 hover:bg-gray-500'}`}
                    >
                       {banner.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                </div>
                <div className="absolute top-3 left-3">
                   <span className="px-2 py-1 rounded-md bg-black/50 backdrop-blur-md text-white/90 text-xs font-bold font-mono">
                      Urutan: {banner.order}
                   </span>
                </div>
            </div>
            
            <div className="p-3 border-t border-border/30 bg-gray-50 flex items-center justify-between">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${banner.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                    {banner.isActive ? 'AKTIF' : 'TIDAK AKTIF'}
                </span>
                <div className="flex gap-1">
                   <button 
                      onClick={() => handleOpenPreview(banner)} 
                      title="Pratinjau Banner"
                      className="p-2 text-muted-foreground hover:text-brand-600 hover:bg-brand-50 bg-white rounded-lg transition-colors border shadow-sm"
                   >
                      <Eye className="w-4 h-4" />
                   </button>
                   <button onClick={() => handleOpenModal(banner)} className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 bg-white rounded-lg transition-colors border shadow-sm">
                      <Edit2 className="w-4 h-4" />
                   </button>
                   <button onClick={() => handleDeleteClick(banner.id, banner.headline)} className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 bg-white rounded-lg transition-colors border shadow-sm">
                      <Trash2 className="w-4 h-4" />
                   </button>
                </div>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !loading && setIsModalOpen(false)} />
            
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
               className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden z-10 p-5 sm:p-6 pb-2"
             >
               <div className="flex justify-between items-center mb-5">
                  <h2 className="text-xl font-heading font-bold text-foreground overflow-hidden">{editingBanner ? 'Edit Banner' : 'Tambah Banner Promo'}</h2>
                  <button disabled={loading} onClick={() => setIsModalOpen(false)} className="p-2 text-muted-foreground hover:bg-muted rounded-xl transition-colors"><X className="w-5 h-5"/></button>
               </div>

               <div className="space-y-4 max-h-[60vh] overflow-y-auto px-2 pb-6 -mx-2 hide-scrollbar">
                  <div>
                    <div className="flex justify-between items-baseline mb-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Gambar Banner</label>
                      <span className="text-[10px] text-brand-600 font-medium">Rasio Rekomendasi: 3.6:1 (Desktop) / 2.1:1 (Mobile)</span>
                    </div>
                    <div className="flex gap-2 items-center">
                       <input value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} placeholder="https://... atau klik Upload" className="flex-1 text-sm px-3 py-2.5 bg-muted/40 border border-border/80 rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all" />
                       <label className="relative cursor-pointer shrink-0 px-4 py-2.5 bg-brand-100 text-brand-700 font-medium text-sm rounded-xl hover:bg-brand-200 transition-colors flex items-center justify-center min-w-[100px]">
                           {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Upload'}
                           <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-0 h-0 opacity-0 cursor-pointer" disabled={uploadingImage} />
                       </label>
                    </div>
                    {formData.image && (
                      <div className="mt-2.5 relative group/preview">
                        <div className="relative aspect-[3/1] rounded-xl overflow-hidden bg-muted border border-border/60">
                          <Image 
                            src={formData.image} 
                            alt="Miniatur Pratinjau" 
                            fill 
                            className={formData.isCover ? "object-cover" : "object-contain"}
                            unoptimized
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x200/18442D/FFF?text=Gambar+tidak+dapat+dimuat'; }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSourceImageSrc(formData.image);
                            setPosition({ x: 0, y: 0 });
                            setZoom(1);
                            setIsCropModalOpen(true);
                          }}
                          className="absolute bottom-2 right-2 px-2.5 py-1.5 bg-black/60 hover:bg-[#18442D] text-white font-bold text-[10px] rounded-lg transition-colors flex items-center gap-1 backdrop-blur-sm shadow-sm"
                        >
                          <Edit2 className="w-3 h-3" />
                          Pangkas Ulang
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Judul Besar (Headline)</label>
                    <textarea value={formData.headline} onChange={e => setFormData({...formData, headline: e.target.value})} placeholder="More Than Just&#10;A Drink" rows={2} className="w-full text-sm px-3 py-2.5 bg-muted/40 border border-border/80 rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all resize-none" />
                    <p className="text-[10px] text-muted-foreground mt-1">Tekan Enter untuk membuat baris baru. Hindari judul terlalu panjang.</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Sub-judul (Kecil)</label>
                    <input value={formData.subheadline} onChange={e => setFormData({...formData, subheadline: e.target.value})} placeholder="Premium ceremonial-grade matcha..." className="w-full text-sm px-3 py-2.5 bg-muted/40 border border-border/80 rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Urutan Tampil (Order)</label>
                        <input type="number" value={formData.order} onChange={e => setFormData({...formData, order: Number(e.target.value)})} className="w-full text-sm px-3 py-2.5 bg-muted/40 border border-border/80 rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all" />
                     </div>
                     <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Fit Gambar</label>
                        <select value={formData.isCover ? 'cover' : 'contain'} onChange={e => setFormData({...formData, isCover: e.target.value === 'cover'})} className="w-full text-sm px-3 py-2.5 bg-muted/40 border border-border/80 rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all appearance-none cursor-pointer">
                           <option value="cover">Penuhi Layar (Bisa Terpotong)</option>
                           <option value="contain">Utuh (Tanpa Potong / Ada Padding)</option>
                        </select>
                     </div>
                     <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Status</label>
                        <select value={formData.isActive ? 'yes' : 'no'} onChange={e => setFormData({...formData, isActive: e.target.value === 'yes'})} className="w-full text-sm px-3 py-2.5 bg-muted/40 border border-border/80 rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all appearance-none cursor-pointer">
                           <option value="yes">Aktif, Tampilkan</option>
                           <option value="no">Disembunyikan</option>
                        </select>
                     </div>
                  </div>
               </div>

               <div className="flex justify-between items-center pt-4 border-t border-border/40 mt-2 bg-white sticky bottom-0">
                 <button 
                   type="button"
                   onClick={() => handleOpenPreview({ ...formData, id: 'temp' })}
                   disabled={!formData.image}
                   className="flex items-center gap-1.5 px-3 py-2 text-brand-700 hover:bg-brand-50 border border-brand-200/60 font-semibold text-xs rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   <Eye className="w-3.5 h-3.5" />
                   Pratinjau Live
                 </button>
                 <div className="flex gap-2">
                   <button disabled={loading} onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-medium text-sm text-foreground hover:bg-muted rounded-xl transition-colors">Batal</button>
                   <button disabled={loading} onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-brand-600 text-white font-medium text-sm rounded-xl hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Simpan
                   </button>
                 </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Hapus Banner"
        message={`Apakah Anda yakin ingin menghapus banner ini?`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      {/* Preview Modal */}
      <AnimatePresence>
        {isPreviewOpen && previewBanner && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setIsPreviewOpen(false)} 
            />
            
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 10 }} 
               animate={{ opacity: 1, scale: 1, y: 0 }} 
               exit={{ opacity: 0, scale: 0.95, y: 10 }}
               className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 p-5 sm:p-6"
             >
               <div className="flex justify-between items-center mb-5 border-b pb-3 border-border/40">
                  <div>
                    <h2 className="text-lg font-bold font-heading text-foreground">Pratinjau Banner Promosi</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Mensimulasikan tampilan banner di storefront (halaman depan)</p>
                  </div>
                  <button onClick={() => setIsPreviewOpen(false)} className="p-2 text-muted-foreground hover:bg-muted rounded-xl transition-colors">
                    <X className="w-5 h-5"/>
                  </button>
               </div>

               {/* Toggles for Desktop / Mobile */}
               <div className="flex gap-2 mb-6 justify-center">
                  <button 
                    onClick={() => setPreviewMode('desktop')} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                      previewMode === 'desktop' 
                        ? 'bg-brand-600 border-brand-600 text-white shadow-sm' 
                        : 'bg-white border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <Monitor className="w-4 h-4" />
                    Tampilan Desktop (3.6:1)
                  </button>
                  <button 
                    onClick={() => setPreviewMode('mobile')} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                      previewMode === 'mobile' 
                        ? 'bg-brand-600 border-brand-600 text-white shadow-sm' 
                        : 'bg-white border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    Tampilan Mobile (2.1:1)
                  </button>
               </div>

               {/* Simulated Banner Container */}
               <div className="w-full flex justify-center items-center bg-gray-100/80 rounded-2xl p-4 md:p-8 border border-border/30">
                  <div 
                    className={`relative w-full overflow-hidden rounded-[2rem] bg-white shadow-lg border border-[#EADFC9]/30 transition-all duration-300 ${
                      previewMode === 'desktop' 
                        ? 'aspect-[3.6/1] max-w-3xl' 
                        : 'aspect-[2.1/1] max-w-sm'
                    }`}
                  >
                    <Image
                      src={previewBanner.image}
                      alt={previewBanner.alt || 'Promo Image'}
                      fill
                      className={`${previewBanner.isCover === false ? 'object-contain' : 'object-cover'} transition-all`}
                      unoptimized
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&q=80&w=1200';
                      }}
                    />
                    
                    {/* Simulated Storefront Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/5 flex flex-col justify-end p-4 md:p-6 text-left">
                      <span className="px-2 py-0.5 rounded-full bg-[#D4A574] text-white text-[7px] md:text-[8px] font-black uppercase tracking-widest w-fit shadow-md mb-1.5">
                        Promo Spesial
                      </span>
                      <h2 className={`font-serif font-black text-white leading-tight tracking-tight drop-shadow-md whitespace-pre-line ${
                        previewMode === 'desktop' ? 'text-lg md:text-xl' : 'text-sm'
                      }`}>
                        {previewBanner.headline || previewBanner.alt || 'Judul Banner Promosi'}
                      </h2>
                      <p className={`text-neutral-200 mt-1 leading-snug font-semibold max-w-xl opacity-90 ${
                        previewMode === 'desktop' ? 'text-[10px] md:text-[12px]' : 'text-[9px]'
                      }`}>
                        {previewBanner.subheadline || 'Sub-judul banner promosi yang menjelaskan promo lebih detail.'}
                      </p>
                    </div>

                    {/* Dot indicators mock */}
                    <div className="absolute bottom-4 right-4 flex items-center gap-1">
                      <span className="h-1 bg-[#D4A574] w-4 rounded-full" />
                      <span className="h-1 bg-white/40 w-1 rounded-full" />
                      <span className="h-1 bg-white/40 w-1 rounded-full" />
                    </div>
                  </div>
               </div>

               {/* Advice text */}
               <div className="mt-5 bg-brand-50/50 border border-brand-100 rounded-2xl p-4 text-xs text-brand-900 leading-relaxed">
                  <p className="font-bold flex items-center gap-1.5 mb-1 text-brand-900">
                    💡 Tips Optimalisasi Gambar Banner:
                  </p>
                  {previewMode === 'desktop' ? (
                    <p>
                      Pada <strong>Tampilan Desktop</strong>, banner menggunakan rasio lebar <strong>3.6:1</strong>. Gunakan resolusi <strong>1440 x 400 piksel</strong>. 
                      Pastikan objek utama berada di tengah agar tidak terpotong saat diakses dari layar yang lebih lebar atau lebih sempit.
                    </p>
                  ) : (
                    <p>
                      Pada <strong>Tampilan Mobile</strong>, banner menggunakan rasio lebar <strong>2.1:1</strong>. Gunakan resolusi <strong>840 x 400 piksel</strong>.
                      Teks headline & subheadline akan ditumpuk di atas gambar secara responsif.
                    </p>
                  )}
               </div>

               <div className="flex justify-end pt-4 border-t border-border/40 mt-5">
                  <button 
                    onClick={() => setIsPreviewOpen(false)} 
                    className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 font-semibold text-sm text-foreground rounded-xl transition-all"
                  >
                    Tutup Pratinjau
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Crop Modal */}
      <AnimatePresence>
        {isCropModalOpen && sourceImageSrc && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
              onClick={() => !uploadingImage && setIsCropModalOpen(false)} 
            />
            
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 10 }} 
               animate={{ opacity: 1, scale: 1, y: 0 }} 
               exit={{ opacity: 0, scale: 0.95, y: 10 }}
               className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden z-10 p-5 sm:p-6"
             >
               <div className="flex justify-between items-center mb-4 border-b pb-3 border-border/40">
                  <div>
                    <h2 className="text-lg font-bold font-heading text-foreground">Sesuaikan Gambar Banner</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Geser dan atur perbesaran gambar sesuai bingkai banner.</p>
                  </div>
                  <button disabled={uploadingImage} onClick={() => setIsCropModalOpen(false)} className="p-2 text-muted-foreground hover:bg-muted rounded-xl transition-colors">
                    <X className="w-5 h-5"/>
                  </button>
               </div>

               {/* Target Format Selector */}
               <div className="mb-4">
                 <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Format Rasio Bingkai</label>
                 <div className="flex gap-2">
                   <button
                     type="button"
                     onClick={() => { setCropAspectRatio(3.6); setPosition({ x: 0, y: 0 }); setZoom(1); }}
                     className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                       cropAspectRatio === 3.6 
                         ? 'bg-brand-50 border-brand-500 text-brand-700' 
                         : 'bg-white border-border text-muted-foreground hover:bg-muted/40'
                     }`}
                   >
                     Desktop (3.6:1)
                   </button>
                   <button
                     type="button"
                     onClick={() => { setCropAspectRatio(2.1); setPosition({ x: 0, y: 0 }); setZoom(1); }}
                     className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                       cropAspectRatio === 2.1 
                         ? 'bg-brand-50 border-brand-500 text-brand-700' 
                         : 'bg-white border-border text-muted-foreground hover:bg-muted/40'
                     }`}
                   >
                     Mobile (2.1:1)
                   </button>
                 </div>
               </div>

               {/* Viewport Area */}
               <div 
                 ref={viewportRef}
                 className="relative overflow-hidden bg-neutral-900 border-2 border-brand-500/30 rounded-2xl mx-auto w-full select-none flex items-center justify-center cursor-grab active:cursor-grabbing"
                 style={{
                   aspectRatio: cropAspectRatio === 3.6 ? '3.6 / 1' : '2.1 / 1',
                   maxWidth: '100%',
                 }}
                 onMouseDown={handleMouseDown}
                 onMouseMove={handleMouseMove}
                 onMouseUp={handleMouseUp}
                 onMouseLeave={handleMouseUp}
                 onTouchStart={handleTouchStart}
                 onTouchMove={handleTouchMove}
                 onTouchEnd={handleMouseUp}
               >
                 {/* Visual grid overlay (rule of thirds) */}
                 <div className="absolute inset-0 border border-white/20 pointer-events-none z-10 grid grid-cols-3 grid-rows-3">
                   <div className="border-r border-b border-white/10" />
                   <div className="border-r border-b border-white/10" />
                   <div className="border-b border-white/10" />
                   <div className="border-r border-b border-white/10" />
                   <div className="border-r border-b border-white/10" />
                   <div className="border-b border-white/10" />
                   <div className="border-r border-white/10" />
                   <div className="border-r border-white/10" />
                   <div />
                 </div>
                 
                 {/* eslint-disable-next-line @next/next/no-img-element */}
                 <img
                   ref={imageRef}
                   src={sourceImageSrc}
                   crossOrigin="anonymous"
                   alt="Source Editor"
                   className="absolute pointer-events-none select-none max-w-none max-h-none"
                   style={{
                     left: '50%',
                     top: '50%',
                     transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${zoom})`,
                     width: '100%',
                     height: 'auto',
                     minWidth: '100%',
                     minHeight: '100%',
                     objectFit: 'cover',
                   }}
                 />
               </div>

               {/* Zoom Control Slider */}
               <div className="mt-5 space-y-2">
                 <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground">
                   <span>ZOOM</span>
                   <span>{zoom.toFixed(1)}x</span>
                 </div>
                 <input 
                   type="range" 
                   min="1" 
                   max="3" 
                   step="0.01" 
                   value={zoom} 
                   onChange={(e) => setZoom(parseFloat(e.target.value))}
                   className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-600 focus:outline-none"
                 />
               </div>

               <p className="text-[10px] text-center text-muted-foreground mt-3 font-medium">
                 💡 Seret gambar di atas untuk menggeser. Gunakan slider untuk memperbesar.
               </p>

               {/* Buttons Footer */}
               <div className="flex justify-end gap-3 pt-4 border-t border-border/40 mt-5">
                 <button 
                   type="button"
                   disabled={uploadingImage} 
                   onClick={() => setIsCropModalOpen(false)} 
                   className="px-4 py-2 font-medium text-sm text-foreground hover:bg-muted rounded-xl transition-colors disabled:opacity-50"
                 >
                   Batal
                 </button>
                 <button 
                   type="button"
                   disabled={uploadingImage} 
                   onClick={handleCropAndUpload} 
                   className="flex items-center gap-2 px-6 py-2 bg-brand-600 text-white font-medium text-sm rounded-xl hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-75 disabled:cursor-not-allowed"
                 >
                   {uploadingImage ? (
                     <>
                       <Loader2 className="w-4 h-4 animate-spin" />
                       Memproses...
                     </>
                   ) : (
                     'Pangkas & Unggah'
                   )}
                 </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
