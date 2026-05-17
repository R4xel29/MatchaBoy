'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Image as ImageIcon, Trash2, Edit2, Loader2, Save, X, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export default function HeroBannersClient({ initialBanners }: { initialBanners: any[] }) {
  const [banners, setBanners] = useState(initialBanners);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [bannerToDelete, setBannerToDelete] = useState<{id: string, name: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleOpenModal = (banner?: any) => {
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
      alert("Harap isi URL Gambar, Judul, dan Sub-judul");
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
      alert('Gagal menyimpan banner.');
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
      alert('Gagal menghapus banner.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setBannerToDelete({ id, name });
    setIsDeleteModalOpen(true);
  };

  const toggleStatus = async (banner: any) => {
    try {
      const res = await fetch(`/api/admin/banners/${banner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !banner.isActive })
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setBanners(banners.map(b => b.id === banner.id ? saved : b));
    } catch (err) {
      alert("Gagal merubah status");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('image/')) {
      alert('File harus berupa gambar');
      return;
    }

    setUploadingImage(true);
    try {
      const form = new FormData();
      form.append('file', file);
      
      const res = await fetch('/api/admin/upload/banner', {
        method: 'POST',
        body: form
      });
      
      if (!res.ok) {
         throw new Error('Upload failed');
      }
      
      const data = await res.json();
      setFormData({ ...formData, image: data.url });
    } catch(err) {
      alert('Gagal mengupload gambar');
      console.error(err);
    } finally {
      setUploadingImage(false);
    }
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
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Gambar Banner</label>
                    <div className="flex gap-2 items-center">
                       <input value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} placeholder="https://... atau klik Upload" className="flex-1 text-sm px-3 py-2.5 bg-muted/40 border border-border/80 rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all" />
                       <label className="relative cursor-pointer shrink-0 px-4 py-2.5 bg-brand-100 text-brand-700 font-medium text-sm rounded-xl hover:bg-brand-200 transition-colors flex items-center justify-center min-w-[100px]">
                           {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Upload'}
                           <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-0 h-0 opacity-0 cursor-pointer" disabled={uploadingImage} />
                       </label>
                    </div>
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

               <div className="flex justify-end gap-3 pt-4 border-t border-border/40 mt-2 bg-white sticky bottom-0">
                 <button disabled={loading} onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-medium text-sm text-foreground hover:bg-muted rounded-xl transition-colors">Batal</button>
                 <button disabled={loading} onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-brand-600 text-white font-medium text-sm rounded-xl hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Simpan
                 </button>
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
    </div>
  );
}
