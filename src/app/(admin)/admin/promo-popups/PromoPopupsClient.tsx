'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Image as ImageIcon, Trash2, Edit2, Loader2, Save, X, Eye, EyeOff, Monitor, Smartphone, Link as LinkIcon, Megaphone } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast';

interface PromoPopup {
  id?: string;
  title: string;
  image: string;
  linkUrl?: string | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export default function PromoPopupsClient({ initialPopups }: { initialPopups: PromoPopup[] }) {
  const { showToast } = useToast();
  const [popups, setPopups] = useState(initialPopups);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPopup, setEditingPopup] = useState<PromoPopup | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [popupToDelete, setPopupToDelete] = useState<{id: string, title: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Preview Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewPopup, setPreviewPopup] = useState<PromoPopup | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('mobile');

  // Crop Modal State
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [sourceImageSrc, setSourceImageSrc] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(1);

  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    image: '',
    linkUrl: '',
    isActive: true
  });

  const router = useRouter();

  const handleOpenPreview = (popup: PromoPopup) => {
    setPreviewPopup(popup);
    setPreviewMode('mobile');
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
      
      // Target dimensions for 4:5 vertical popup image (exactly 1080 x 1350)
      const targetW = 1080;
      const targetH = 1350;
      
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Could not get canvas context');
      
      ctx.fillStyle = '#FFFFFF';
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
        
        const file = new File([blob], 'cropped_popup.jpg', { type: 'image/jpeg' });
        const form = new FormData();
        form.append('file', file);
        
        const res = await fetch('/api/admin/upload/popup', {
          method: 'POST',
          body: form
        });
        
        const data = await res.json();
        
        if (!res.ok) throw new Error(data?.detail || data?.error || 'Upload failed');
        
        setFormData(prev => ({ ...prev, image: data.url }));
        setIsCropModalOpen(false);
        setSourceImageSrc(null);
        showToast('Gambar berhasil dipangkas dan diunggah', 'success');
        setUploadingImage(false);
      }, 'image/jpeg', 0.9);
      
    } catch (error: any) {
      console.error(error);
      showToast(`Gagal memproses: ${error?.message || 'Unknown error'}`, 'error');
      setUploadingImage(false);
    }
  };

  const handleOpenModal = (popup?: PromoPopup) => {
    if (popup) {
      setEditingPopup(popup);
      setFormData({
        title: popup.title,
        image: popup.image,
        linkUrl: popup.linkUrl || '',
        isActive: popup.isActive
      });
    } else {
      setEditingPopup(null);
      setFormData({
        title: '',
        image: '',
        linkUrl: '',
        isActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.image) {
      showToast("Harap isi Judul dan URL Gambar", "error");
      return;
    }

    setLoading(true);
    try {
      const url = editingPopup ? `/api/admin/popups/${editingPopup.id}` : '/api/admin/popups';
      const method = editingPopup ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          linkUrl: formData.linkUrl.trim() || null
        }),
      });

      if (!res.ok) throw new Error('API failed');

      const saved = await res.json();
      
      if (editingPopup) {
        setPopups(popups.map(p => p.id === saved.id ? saved : p));
        showToast('Promo Popup berhasil diperbarui', 'success');
      } else {
        setPopups([saved, ...popups]);
        showToast('Promo Popup berhasil dibuat', 'success');
      }

      setIsModalOpen(false);
      router.refresh();
    } catch (err) {
      console.error(err);
      showToast('Gagal menyimpan popup.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!popupToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/popups/${popupToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      
      setPopups(popups.filter(p => p.id !== popupToDelete.id));
      setIsDeleteModalOpen(false);
      setPopupToDelete(null);
      showToast('Promo Popup berhasil dihapus', 'success');
      router.refresh();
    } catch (err) {
      console.error(err);
      showToast('Gagal menghapus popup.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteClick = (id: string, title: string) => {
    setPopupToDelete({ id, title });
    setIsDeleteModalOpen(true);
  };

  const toggleStatus = async (popup: PromoPopup) => {
    try {
      const res = await fetch(`/api/admin/popups/${popup.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !popup.isActive })
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setPopups(popups.map(p => p.id === popup.id ? saved : p));
      showToast(`Popup "${popup.title}" sekarang ${!popup.isActive ? 'aktif' : 'nonaktif'}`, 'success');
    } catch {
      showToast("Gagal merubah status", "error");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('image/')) {
      showToast('File harus berupa gambar', 'error');
      return;
    }

    setUploadingImage(true);
    try {
      const form = new FormData();
      form.append('file', file);
      
      const res = await fetch('/api/admin/upload/popup', {
        method: 'POST',
        body: form
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data?.detail || data?.error || 'Upload failed');
      }
      
      setFormData(prev => ({ ...prev, image: data.url }));
      showToast('Gambar berhasil diunggah', 'success');
    } catch (error: any) {
      console.error(error);
      showToast(`Gagal mengunggah: ${error?.message || 'Unknown error'}`, 'error');
    } finally {
      setUploadingImage(false);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">Promo Popup</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kelola modal promosi yang muncul saat pertama kali pengguna membuka web/aplikasi</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Popup</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {popups.length === 0 ? (
           <div className="col-span-full py-20 text-center bg-white border border-border/50 rounded-2xl">
              <Megaphone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3 animate-bounce" />
              <p className="text-foreground font-medium">Belum ada Promo Popup</p>
              <p className="text-sm text-muted-foreground mt-1">Buat popup untuk menampilkan penawaran spesial di halaman depan.</p>
           </div>
        ) : popups.map((popup) => (
          <div key={popup.id} className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden flex flex-col group">
            <div className="relative aspect-[4/5] bg-muted flex items-center justify-center overflow-hidden">
                <Image 
                   src={popup.image} 
                   alt={popup.title} 
                   fill 
                   className="object-cover transition-transform group-hover:scale-102"
                   unoptimized
                   onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x500/18442D/FFF?text=Error'; }} 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white pointer-events-none">
                     <h3 className="font-bold text-base leading-tight drop-shadow-md truncate">{popup.title}</h3>
                     {popup.linkUrl && (
                       <p className="text-xs text-white/80 mt-1 flex items-center gap-1 opacity-90 truncate">
                         <LinkIcon className="w-3 h-3 shrink-0" />
                         {popup.linkUrl}
                       </p>
                     )}
                </div>
                <div className="absolute top-3 right-3 flex gap-2">
                    <button 
                       onClick={() => toggleStatus(popup)}
                       title={popup.isActive ? "Nonaktifkan" : "Aktifkan"}
                       className={`p-2 rounded-xl backdrop-blur-md shadow-sm transition-colors text-white ${popup.isActive ? 'bg-brand-500/80 hover:bg-brand-500' : 'bg-gray-500/80 hover:bg-gray-500'}`}
                    >
                       {popup.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                </div>
            </div>
            
            <div className="p-3.5 border-t border-border/30 bg-gray-50/50 flex items-center justify-between mt-auto">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${popup.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                    {popup.isActive ? 'AKTIF' : 'TIDAK AKTIF'}
                </span>
                <div className="flex gap-1">
                   <button 
                      onClick={() => handleOpenPreview(popup)} 
                      title="Pratinjau Popup"
                      className="p-2 text-muted-foreground hover:text-brand-600 hover:bg-brand-55 bg-white rounded-lg transition-colors border shadow-sm"
                   >
                      <Eye className="w-4 h-4" />
                   </button>
                   <button onClick={() => handleOpenModal(popup)} className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 bg-white rounded-lg transition-colors border shadow-sm">
                      <Edit2 className="w-4 h-4" />
                   </button>
                   <button onClick={() => handleDeleteClick(popup.id!, popup.title)} className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 bg-white rounded-lg transition-colors border shadow-sm">
                      <Trash2 className="w-4 h-4" />
                   </button>
                </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !loading && setIsModalOpen(false)} />
            
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
               className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden z-10 p-5 sm:p-6"
             >
               <div className="flex justify-between items-center mb-5">
                  <h2 className="text-xl font-heading font-bold text-foreground overflow-hidden">{editingPopup ? 'Edit Promo Popup' : 'Tambah Promo Popup'}</h2>
                  <button disabled={loading} onClick={() => setIsModalOpen(false)} className="p-2 text-muted-foreground hover:bg-muted rounded-xl transition-colors"><X className="w-5 h-5"/></button>
               </div>

               <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Judul Promo (Admin Label)</label>
                    <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Diskon 50% Pengguna Baru" className="w-full text-sm px-3 py-2.5 bg-muted/40 border border-border/80 rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all" />
                  </div>

                  <div>
                    <div className="flex justify-between items-baseline mb-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Gambar Popup</label>
                      <span className="text-[10px] text-brand-600 font-medium">Rasio Rekomendasi: 4:5 (Vertikal)</span>
                    </div>
                    <div className="flex gap-2 items-center">
                       <input value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} placeholder="https://... atau klik Upload" className="flex-1 text-sm px-3 py-2.5 bg-muted/40 border border-border/80 rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all" />
                       <label className="relative cursor-pointer shrink-0 px-4 py-2.5 bg-brand-100 text-brand-700 font-medium text-sm rounded-xl hover:bg-brand-200 transition-colors flex items-center justify-center min-w-[100px]">
                           {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Upload'}
                           <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-0 h-0 opacity-0 cursor-pointer" disabled={uploadingImage} />
                       </label>
                    </div>
                    {formData.image && (
                      <div className="mt-2.5 relative group/preview flex justify-center">
                        <div className="relative aspect-[4/5] w-[120px] rounded-xl overflow-hidden bg-muted border border-border/60">
                          <Image 
                            src={formData.image} 
                            alt="Miniatur Pratinjau" 
                            fill 
                            className="object-cover"
                            unoptimized
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/200x250/18442D/FFF?text=Error'; }}
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
                          className="absolute bottom-2 px-2 py-1 bg-black/60 hover:bg-[#18442D] text-white font-bold text-[9px] rounded-lg transition-colors flex items-center gap-1 backdrop-blur-sm shadow-sm"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                          Pangkas Ulang
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Link Tujuan (Klik Redirect - Opsional)</label>
                    <input value={formData.linkUrl} onChange={e => setFormData({...formData, linkUrl: e.target.value})} placeholder="Contoh: /vouchers atau /profile" className="w-full text-sm px-3 py-2.5 bg-muted/40 border border-border/80 rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all" />
                    <p className="text-[10px] text-muted-foreground mt-1">Kosongkan jika gambar tidak ingin bisa diklik. Masukkan route lokal (e.g. <code>/vouchers</code>) atau URL eksternal.</p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Status</label>
                    <select value={formData.isActive ? 'yes' : 'no'} onChange={e => setFormData({...formData, isActive: e.target.value === 'yes'})} className="w-full text-sm px-3 py-2.5 bg-muted/40 border border-border/80 rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all appearance-none cursor-pointer">
                       <option value="yes">Aktif, Tampilkan ke Pengguna</option>
                       <option value="no">Disembunyikan</option>
                    </select>
                  </div>
               </div>

               <div className="flex justify-between items-center pt-4 border-t border-border/40 mt-5 bg-white sticky bottom-0">
                  <button 
                    type="button"
                    onClick={() => handleOpenPreview({ ...formData, id: 'temp' })}
                    disabled={!formData.image}
                    className="flex items-center gap-1.5 px-3 py-2 text-brand-700 hover:bg-brand-50 border border-brand-200/60 font-semibold text-xs rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Pratinjau
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
        title="Hapus Promo Popup"
        message={`Apakah Anda yakin ingin menghapus popup "${popupToDelete?.title}" ini? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      {/* Preview Modal (Mobile & Desktop Simulation) */}
      <AnimatePresence>
        {isPreviewOpen && previewPopup && (
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
               className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 p-5 sm:p-6"
             >
               <div className="flex justify-between items-center mb-4 border-b pb-3 border-border/40">
                  <div>
                    <h2 className="text-lg font-bold font-heading text-foreground">Pratinjau Promo Popup</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Mensimulasikan tampilan popup di layar aplikasi/web</p>
                  </div>
                  <button onClick={() => setIsPreviewOpen(false)} className="p-2 text-muted-foreground hover:bg-muted rounded-xl transition-colors">
                    <X className="w-5 h-5"/>
                  </button>
               </div>

               {/* Toggles for Desktop / Mobile */}
               <div className="flex gap-2 mb-4 justify-center">
                  <button 
                    onClick={() => setPreviewMode('mobile')} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                      previewMode === 'mobile' 
                        ? 'bg-brand-600 border-brand-600 text-white shadow-sm' 
                        : 'bg-white border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    Tampilan HP / APK
                  </button>
                  <button 
                    onClick={() => setPreviewMode('desktop')} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                      previewMode === 'desktop' 
                        ? 'bg-brand-600 border-brand-600 text-white shadow-sm' 
                        : 'bg-white border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <Monitor className="w-4 h-4" />
                    Tampilan Desktop
                  </button>
               </div>

               {/* Simulated App Screen Area */}
               <div className="w-full flex justify-center items-center bg-gray-100 rounded-2xl p-4 md:p-6 border border-border/30 overflow-hidden min-h-[420px]">
                  {previewMode === 'mobile' ? (
                    // Mobile wrapper simulation (a simulated smartphone screen)
                    <div className="w-[280px] h-[480px] bg-slate-900 rounded-[2.5rem] p-3 shadow-2xl relative border-4 border-slate-700 flex flex-col justify-between overflow-hidden">
                      {/* Speaker notch */}
                      <div className="w-20 h-4 bg-slate-700 rounded-full mx-auto mb-1.5 shrink-0 z-20 relative" />
                      
                      {/* Screen content */}
                      <div className="flex-1 bg-[#FFFBF5] rounded-[1.8rem] relative overflow-hidden p-3 flex flex-col">
                        {/* Mock header */}
                        <div className="flex justify-between items-center mb-3 opacity-30 select-none">
                          <div className="h-3 w-16 bg-slate-800 rounded" />
                          <div className="h-4 w-4 bg-slate-800 rounded-full" />
                        </div>
                        <div className="h-3 w-28 bg-slate-800/10 rounded mb-1 select-none" />
                        <div className="h-6 w-36 bg-slate-800/20 rounded mb-4 select-none" />
                        <div className="h-20 bg-slate-800/5 rounded mb-3 select-none" />
                        
                        {/* Modal Overlay Simulation */}
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-4">
                          <div className="relative w-full max-w-[210px] rounded-2xl overflow-hidden shadow-lg border border-white/10">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={previewPopup.image} 
                              alt="Promo" 
                              className="max-h-[220px] w-full h-auto object-contain rounded-2xl mx-auto block bg-transparent"
                              onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x500/18442D/FFF?text=Error'; }} 
                            />
                          </div>
                          
                          {/* Close X button below image */}
                          <button type="button" className="mt-3.5 w-9 h-9 rounded-full bg-white text-slate-800 flex items-center justify-center shadow-lg border border-slate-200/50 hover:scale-105 active:scale-95 transition-all">
                            <X className="w-4 h-4 stroke-[3px]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Desktop browser simulation
                    <div className="w-full max-w-lg bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200/60 flex flex-col">
                      <div className="bg-slate-100 px-4 py-2 border-b flex items-center gap-1.5 select-none shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                        <div className="h-4 w-40 bg-white rounded border border-slate-200 text-[8px] flex items-center px-2 text-slate-400 ml-2">https://matchaboy.com</div>
                      </div>
                      
                      <div className="h-[300px] bg-[#FFFBF5] relative p-6 flex flex-col justify-center items-center overflow-hidden">
                        {/* Mock site body */}
                        <div className="w-full opacity-10 select-none">
                          <div className="h-6 w-32 bg-slate-800 rounded mb-4" />
                          <div className="grid grid-cols-3 gap-3">
                            <div className="h-20 bg-slate-800 rounded" />
                            <div className="h-20 bg-slate-800 rounded" />
                            <div className="h-20 bg-slate-800 rounded" />
                          </div>
                        </div>

                        {/* Modal Overlay Simulation */}
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-4">
                          <div className="relative h-[80%] max-h-[200px] w-full rounded-2xl overflow-hidden shadow-xl border border-white/10">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={previewPopup.image} 
                              alt="Promo" 
                              className="max-h-[200px] w-full h-auto object-contain rounded-2xl mx-auto block bg-transparent"
                              onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x500/18442D/FFF?text=Error'; }} 
                            />
                          </div>
                          
                          {/* Close X button below image */}
                          <button type="button" className="mt-3.5 w-9 h-9 rounded-full bg-white text-slate-800 flex items-center justify-center shadow-lg border border-slate-200/50 hover:scale-105 active:scale-95 transition-all">
                            <X className="w-4 h-4 stroke-[3px]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
               </div>

               <div className="flex justify-end pt-4 border-t border-border/40 mt-5">
                  <button 
                    onClick={() => setIsPreviewOpen(false)} 
                    className="px-5 py-2 bg-slate-100 hover:bg-slate-200 font-semibold text-sm text-foreground rounded-xl transition-all"
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
               className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden z-10 p-5 sm:p-6"
             >
               <div className="flex justify-between items-center mb-4 border-b pb-3 border-border/40">
                  <div>
                    <h2 className="text-lg font-bold font-heading text-foreground">Sesuaikan Gambar Popup</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Geser dan atur perbesaran agar pas dengan rasio 4:5.</p>
                  </div>
                  <button disabled={uploadingImage} onClick={() => setIsCropModalOpen(false)} className="p-2 text-muted-foreground hover:bg-muted rounded-xl transition-colors">
                    <X className="w-5 h-5"/>
                  </button>
               </div>

               {/* Viewport Area */}
               <div 
                 ref={viewportRef}
                 className="relative overflow-hidden bg-neutral-900 border-2 border-brand-500/30 rounded-2xl mx-auto w-full select-none flex items-center justify-center cursor-grab active:cursor-grabbing"
                 style={{
                   aspectRatio: '4 / 5',
                   maxWidth: '100%',
                   maxHeight: '340px'
                 }}
                 onMouseDown={handleMouseDown}
                 onMouseMove={handleMouseMove}
                 onMouseUp={handleMouseUp}
                 onMouseLeave={handleMouseUp}
                 onTouchStart={handleTouchStart}
                 onTouchMove={handleTouchMove}
                 onTouchEnd={handleMouseUp}
               >
                 {/* Visual grid overlay */}
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
