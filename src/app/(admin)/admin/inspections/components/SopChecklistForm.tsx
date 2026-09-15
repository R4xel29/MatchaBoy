'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  Camera,
  Image as ImageIcon,
  Trash2,
  Loader2,
  Check,
  ZoomIn,
  Plus,
  Info,
  Sparkles,
  Layers,
  RotateCcw,
  Calendar,
  Clock,
  MessageSquare,
  X,
  ArrowRight
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export interface SopTemplateItem {
  id: string;
  category: string;
  jobdeskCode?: string;
  title: string;
  description: string | null;
  isPhotoRequired: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface SopJobdesk {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface SopChecklistFormProps {
  templates: SopTemplateItem[];
  jobdesks?: SopJobdesk[];
  userRole: string;
  userName: string;
  userJobdeskCode?: string;
  todaySubmissions: any[];
  revisingSubmission?: any | null;
  onCancelRevision?: () => void;
  onSubmissionSuccess: (submission: any) => void;
  onPreviewPhoto: (url: string, title?: string) => void;
}

export default function SopChecklistForm({
  templates,
  jobdesks = [],
  userRole,
  userName,
  userJobdeskCode,
  todaySubmissions,
  revisingSubmission,
  onCancelRevision,
  onSubmissionSuccess,
  onPreviewPhoto,
}: SopChecklistFormProps) {
  const { showToast } = useToast();
  const [shiftType, setShiftType] = useState<'OPENING' | 'CLOSING' | 'ROUTINE'>('OPENING');
  const [selectedJobdeskCode, setSelectedJobdeskCode] = useState<string>(userJobdeskCode || 'ALL');
  const isJobdeskLocked = !!userJobdeskCode;

  // Tanggal dan Waktu Pelaksanaan Shift (Wajib)
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const getCurrentTimeStr = () => {
    const d = new Date();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const [shiftDate, setShiftDate] = useState<string>(getTodayStr());
  const [shiftTime, setShiftTime] = useState<string>(getCurrentTimeStr());

  const getFormattedFullDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      }
      const d = new Date(dateString);
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };
  
  // State checklist items: key is template.id
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [itemPhotos, setItemPhotos] = useState<Record<string, string>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [uploadingItemMap, setUploadingItemMap] = useState<Record<string, boolean>>({});

  // Gallery images
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);

  // General shift notes
  const [shiftNotes, setShiftNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formAlert, setFormAlert] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // File input refs
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  // Handle pre-filling when in revision mode
  useEffect(() => {
    if (revisingSubmission) {
      setShiftType(revisingSubmission.shiftType || 'OPENING');
      setSelectedJobdeskCode(revisingSubmission.jobdeskCode || 'ALL');
      setShiftNotes(revisingSubmission.notes || '');
      if (revisingSubmission.shiftDate) {
        try {
          const d = new Date(revisingSubmission.shiftDate);
          setShiftDate(d.toISOString().split('T')[0]);
        } catch {}
      }
      if (revisingSubmission.shiftTime) {
        setShiftTime(revisingSubmission.shiftTime);
      }

      // Parse gallery
      try {
        if (revisingSubmission.galleryImages) {
          setGalleryImages(JSON.parse(revisingSubmission.galleryImages));
        } else {
          setGalleryImages([]);
        }
      } catch {
        setGalleryImages([]);
      }

      // Prefill items
      const newChecked: Record<string, boolean> = {};
      const newPhotos: Record<string, string> = {};
      const newNotes: Record<string, string> = {};

      if (Array.isArray(revisingSubmission.items)) {
        revisingSubmission.items.forEach((item: any) => {
          const targetKey = item.templateItemId || item.id;
          if (targetKey) {
            newChecked[targetKey] = Boolean(item.isChecked);
            if (item.photoUrl) newPhotos[targetKey] = item.photoUrl;
            if (item.notes) newNotes[targetKey] = item.notes;
          }
        });
      }

      setCheckedItems(newChecked);
      setItemPhotos(newPhotos);
      setItemNotes(newNotes);
      setFormAlert({
        msg: `Mode revisi aktif untuk shift ${revisingSubmission.shiftType}. Perbaiki butir sesuai evaluasi Admin dan kirimkan kembali.`,
        type: 'success',
      });
    }
  }, [revisingSubmission]);

  // Filter templates for current shift & selected jobdesk
  const currentTemplates = templates
    .filter((t) => {
      if (t.category !== shiftType || !t.isActive) return false;
      if (selectedJobdeskCode === 'ALL') return true;
      const tJobdesk = t.jobdeskCode || 'GENERAL';
      // Show if it matches selected jobdesk OR is GENERAL task
      return tJobdesk === selectedJobdeskCode || tJobdesk === 'GENERAL';
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Check today's submission status for this shift
  const todayOpening = todaySubmissions.find((s) => s.shiftType === 'OPENING');
  const todayClosing = todaySubmissions.find((s) => s.shiftType === 'CLOSING');
  const todayRoutine = todaySubmissions.find((s) => s.shiftType === 'ROUTINE');

  // Check if any today submission needs improvement
  const needsImprovementSubmission = todaySubmissions.find((s) => s.status === 'NEEDS_IMPROVEMENT');

  // Toggle item
  const toggleItem = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
    setFormAlert(null);
  };

  // Upload photo for a specific item
  const handleItemPhotoUpload = async (templateId: string, file: File) => {
    if (!file) return;

    if (!file.type.includes('image')) {
      showToast('Hanya berkas gambar yang diperbolehkan', 'error');
      return;
    }

    setUploadingItemMap((prev) => ({ ...prev, [templateId]: true }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'sop-item');

      const res = await fetch('/api/admin/inspections/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengunggah foto');

      setItemPhotos((prev) => ({ ...prev, [templateId]: data.url }));
      // Automatically check the item if it wasn't checked yet
      setCheckedItems((prev) => ({ ...prev, [templateId]: true }));
      showToast('Foto bukti berhasil diunggah', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal upload gambar', 'error');
    } finally {
      setUploadingItemMap((prev) => ({ ...prev, [templateId]: false }));
    }
  };

  // Upload photo for shift gallery
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (galleryImages.length + files.length > 8) {
      showToast('Maksimal 8 foto dokumentasi shift', 'error');
      return;
    }

    setGalleryUploading(true);
    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.includes('image')) continue;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'sop-gallery');

        const res = await fetch('/api/admin/inspections/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (res.ok && data.url) {
          uploadedUrls.push(data.url);
        }
      }

      if (uploadedUrls.length > 0) {
        setGalleryImages((prev) => [...prev, ...uploadedUrls]);
        showToast(`${uploadedUrls.length} foto dokumentasi berhasil ditambahkan`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal upload foto galeri', 'error');
    } finally {
      setGalleryUploading(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const removeGalleryPhoto = (index: number) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Metrics
  const checkedCount = currentTemplates.filter((t) => checkedItems[t.id]).length;
  const totalCount = currentTemplates.length;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  // Submit checklist (either POST new or PUT revision)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalCount === 0) {
      setFormAlert({ msg: 'Tidak ada butir SOP aktif pada shift dan jobdesk ini', type: 'error' });
      return;
    }

    // Validation: Check if any checked item with isPhotoRequired lacks a photo
    const missingPhotoItems = currentTemplates.filter(
      (t) => t.isPhotoRequired && checkedItems[t.id] && !itemPhotos[t.id]
    );

    if (missingPhotoItems.length > 0) {
      setFormAlert({
        msg: `Tugas "${missingPhotoItems[0].title}" mewajibkan lampiran foto bukti sebelum dikirim.`,
        type: 'error',
      });
      showToast(`Harap lampirkan foto bukti pada tugas: ${missingPhotoItems[0].title}`, 'error');
      return;
    }

    setIsSubmitting(true);
    setFormAlert(null);

    const itemsPayload = currentTemplates.map((t) => ({
      id: t.id,
      templateItemId: t.id,
      label: t.title,
      checked: Boolean(checkedItems[t.id]),
      photoUrl: itemPhotos[t.id] || null,
      notes: itemNotes[t.id] || null,
    }));

    try {
      const isRevising = Boolean(revisingSubmission);
      const url = '/api/admin/inspections/checklist';
      const method = isRevising ? 'PUT' : 'POST';
      const bodyPayload = isRevising
        ? {
            submissionId: revisingSubmission.id,
            shiftDate,
            shiftTime,
            items: itemsPayload,
            notes: shiftNotes,
            galleryImages,
          }
        : {
            type: shiftType,
            jobdeskCode: selectedJobdeskCode,
            shiftDate,
            shiftTime,
            items: itemsPayload,
            notes: shiftNotes,
            galleryImages,
          };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan checklist');

      setFormAlert({ msg: data.message || 'Laporan SOP berhasil dikirim!', type: 'success' });
      showToast(data.message || 'Laporan SOP berhasil dikirim!', 'success');
      
      // Reset form
      setCheckedItems({});
      setItemPhotos({});
      setItemNotes({});
      setGalleryImages([]);
      setShiftNotes('');

      onSubmissionSuccess(data.submission);
    } catch (err: any) {
      setFormAlert({ msg: err.message || 'Gagal mengirim checklist', type: 'error' });
      showToast(err.message || 'Gagal mengirim checklist', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* BANNER NOTIFIKASI REVISI AKTIF */}
      {revisingSubmission && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold mb-1">
                <RotateCcw className="w-3.5 h-3.5" />
                Mode Revisi Laporan Aktif
              </div>
              <h3 className="text-lg font-black">
                Perbaikan Checklist {revisingSubmission.shiftType === 'OPENING' ? 'Buka Toko' : revisingSubmission.shiftType === 'CLOSING' ? 'Tutup Toko' : 'Rutin Harian'}
              </h3>
              {revisingSubmission.reviewNotes && (
                <div className="mt-2 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20 text-xs">
                  <span className="font-bold block text-amber-100 mb-0.5">
                    Catatan Evaluasi Admin ({revisingSubmission.reviewedBy?.name || 'Admin'}):
                  </span>
                  <p className="whitespace-pre-wrap">{revisingSubmission.reviewNotes}</p>
                </div>
              )}
            </div>

            {onCancelRevision && (
              <button
                type="button"
                onClick={onCancelRevision}
                className="self-start sm:self-auto px-4 py-2 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-xs transition-all border border-white/30 shrink-0 flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                Batalkan Revisi
              </button>
            )}
          </div>
        </div>
      )}

      {/* BANNER PEMBERITAHUAN PERLU PERBAIKAN JIKA BELUM MODE REVISI */}
      {!revisingSubmission && needsImprovementSubmission && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-sm font-extrabold text-rose-950">
                Laporan {needsImprovementSubmission.shiftType} Memerlukan Perbaikan
              </h4>
              <p className="text-xs text-rose-800">
                Admin mencatat: &ldquo;{needsImprovementSubmission.reviewNotes || 'Harap periksa kelengkapan butir tugas dan foto bukti'}&rdquo;
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              // Trigger fill with needsImprovementSubmission
              setShiftType(needsImprovementSubmission.shiftType);
              if (revisingSubmission === undefined) {
                // If parent doesn't handle directly, local fallback
                window.scrollTo({ top: 400, behavior: 'smooth' });
              }
            }}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs shrink-0 flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Lihat di Tab Riwayat &rarr;
          </button>
        </div>
      )}

      {/* Status Cards Hari Ini */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card Opening */}
        <div
          onClick={() => {
            if (!revisingSubmission) {
              setShiftType('OPENING');
              setCheckedItems({});
              setItemPhotos({});
            }
          }}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-sm ${
            shiftType === 'OPENING' ? 'ring-2 ring-orange-500 shadow-md' : 'hover:bg-slate-50/70'
          } ${todayOpening ? 'bg-emerald-50/40 border-emerald-200' : 'bg-amber-50/40 border-amber-200'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800">Buka Toko (Opening)</span>
            {todayOpening ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Terkirim
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                <AlertCircle className="w-3 h-3" /> Belum Diisi
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-600 line-clamp-2">
            {todayOpening
              ? `Oleh ${todayOpening.user?.name || 'Staf'} • ${new Date(todayOpening.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
              : 'Wajib diisi oleh staf pembuka sebelum transaksi outlet dibuka.'}
          </p>
        </div>

        {/* Card Routine */}
        <div
          onClick={() => {
            if (!revisingSubmission) {
              setShiftType('ROUTINE');
              setCheckedItems({});
              setItemPhotos({});
            }
          }}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-sm ${
            shiftType === 'ROUTINE' ? 'ring-2 ring-orange-500 shadow-md' : 'hover:bg-slate-50/70'
          } ${todayRoutine ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800">Kebersihan & Rutin</span>
            {todayRoutine ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Terkirim
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
                Mid-Shift Rutin
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-600 line-clamp-2">
            {todayRoutine
              ? `Oleh ${todayRoutine.user?.name || 'Staf'} • ${new Date(todayRoutine.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
              : 'Pengecekan kebersihan berkala selama jam operasional siang/sore.'}
          </p>
        </div>

        {/* Card Closing */}
        <div
          onClick={() => {
            if (!revisingSubmission) {
              setShiftType('CLOSING');
              setCheckedItems({});
              setItemPhotos({});
            }
          }}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-sm ${
            shiftType === 'CLOSING' ? 'ring-2 ring-orange-500 shadow-md' : 'hover:bg-slate-50/70'
          } ${todayClosing ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800">Tutup Toko (Closing)</span>
            {todayClosing ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Terkirim
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
                Menunggu Tutup
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-600 line-clamp-2">
            {todayClosing
              ? `Oleh ${todayClosing.user?.name || 'Staf'} • ${new Date(todayClosing.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
              : 'Wajib diisi oleh staf penutup sebelum mengunci outlet.'}
          </p>
        </div>
      </div>

      {/* Main Checklist Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-sm space-y-6">
        {/* Header Shift Selector & Jobdesk Selector */}
        <div className="space-y-4 border-b border-slate-100 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full mb-1.5">
                <ClipboardCheck className="w-3.5 h-3.5" />
                Laporan Pelaksanaan SOP Staf
              </div>
              <h3 className="text-lg font-extrabold text-slate-800">
                {shiftType === 'OPENING' && 'Checklist Buka Toko (Opening Shift)'}
                {shiftType === 'CLOSING' && 'Checklist Tutup Toko (Closing Shift)'}
                {shiftType === 'ROUTINE' && 'Checklist Kebersihan & Rutin Harian'}
              </h3>
              <p className="text-xs text-slate-500">
                Centang tugas yang telah Anda selesaikan dan lampirkan foto bukti pada butir yang ditentukan.
              </p>
            </div>

            <div className="inline-flex p-1 rounded-2xl bg-slate-100 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  if (!revisingSubmission) {
                    setShiftType('OPENING');
                    setCheckedItems({});
                    setItemPhotos({});
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  shiftType === 'OPENING'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Buka Toko
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!revisingSubmission) {
                    setShiftType('ROUTINE');
                    setCheckedItems({});
                    setItemPhotos({});
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  shiftType === 'ROUTINE'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Rutin
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!revisingSubmission) {
                    setShiftType('CLOSING');
                    setCheckedItems({});
                    setItemPhotos({});
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  shiftType === 'CLOSING'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tutup Toko
              </button>
            </div>
          </div>

          {/* PERAN / JOBDESK SELECTOR */}
          <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-orange-950 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-orange-600" />
                Pilih Peran / Jobdesk Anda pada Shift Ini:
              </span>
              <span className="text-[11px] text-orange-700 font-medium hidden sm:inline">
                Tugas difilter sesuai peran + tugas umum outlet
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => !isJobdeskLocked && setSelectedJobdeskCode('ALL')}
                disabled={isJobdeskLocked}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isJobdeskLocked ? 'opacity-50 cursor-not-allowed ' : ''}${
                  selectedJobdeskCode === 'ALL'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-white border border-orange-200 text-orange-800 hover:bg-orange-100/60'
                }`}
              >
                Semua Tugas Shift
              </button>

              {jobdesks
                .filter((j) => j.isActive)
                .map((j) => (
                  <button
                    key={j.code}
                    type="button"
                    onClick={() => !isJobdeskLocked && setSelectedJobdeskCode(j.code)}
                    disabled={isJobdeskLocked}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isJobdeskLocked ? 'opacity-50 cursor-not-allowed ' : ''}${
                      selectedJobdeskCode === j.code
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'bg-white border border-orange-200 text-orange-800 hover:bg-orange-100/60'
                    }`}
                  >
                    {j.name}
                  </button>
                ))}
            </div>
            {isJobdeskLocked && (
              <p className="text-[11px] text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 mt-1.5 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0" />
                Jobdesk Anda telah ditetapkan oleh admin. Filter terkunci otomatis.
              </p>
            )}
          </div>

          {/* JADWAL & WAKTU SHIFT (WAJIB) */}
          <div className="bg-gradient-to-r from-orange-50/70 to-amber-50/70 border border-orange-200/80 rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-orange-500 text-white shadow-xs">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    Tanggal & Waktu Pelaksanaan Shift
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white shadow-xs">
                      Wajib *
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Tentukan hari, tanggal, dan jam shift saat tugas SOP ini dilaksanakan.
                  </p>
                </div>
              </div>

              {/* Realtime day badge */}
              {shiftDate && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-orange-200 text-xs font-bold text-orange-800 shadow-xs self-start sm:self-auto">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  <span>{getFormattedFullDate(shiftDate)}</span>
                  {shiftTime && (
                    <span className="text-orange-600 font-semibold">• {shiftTime} WIB</span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-orange-600" />
                  Tanggal Shift:
                </label>
                <input
                  type="date"
                  value={shiftDate}
                  onChange={(e) => setShiftDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-xs font-semibold bg-white border border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800 shadow-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-orange-600" />
                  Jam Pelaksanaan (WIB):
                </label>
                <input
                  type="time"
                  value={shiftTime}
                  onChange={(e) => setShiftTime(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-xs font-semibold bg-white border border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800 shadow-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-slate-600">
            <span>Kemajuan Pengerjaan:</span>
            <span className={progressPercent === 100 ? 'text-emerald-600 font-bold' : 'text-orange-600 font-bold'}>
              {checkedCount} dari {totalCount} butir ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                progressPercent === 100
                  ? 'bg-emerald-500'
                  : 'bg-gradient-to-r from-orange-500 to-amber-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Alert Notice */}
        {formAlert && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 ${
              formAlert.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {formAlert.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{formAlert.msg}</span>
          </div>
        )}

        {/* Checklist Items List */}
        <div className="space-y-3">
          {currentTemplates.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Info className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">
                Belum ada butir SOP yang didaftarkan untuk shift & peran jobdesk ini.
              </p>
            </div>
          ) : (
            currentTemplates.map((item, idx) => {
              const isChecked = Boolean(checkedItems[item.id]);
              const photoUrl = itemPhotos[item.id];
              const isUploading = Boolean(uploadingItemMap[item.id]);
              const itemJobdeskName = jobdesks.find((j) => j.code === item.jobdeskCode)?.name || (item.jobdeskCode === 'GENERAL' ? 'Umum' : item.jobdeskCode);

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all space-y-3 ${
                    isChecked
                      ? 'bg-orange-50/40 border-orange-200 ring-1 ring-orange-100'
                      : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      onClick={() => toggleItem(item.id)}
                      className="flex items-start gap-3 cursor-pointer select-none flex-1"
                    >
                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors shrink-0 mt-0.5 ${
                          isChecked ? 'bg-orange-500 text-white shadow-sm' : 'border border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400">#{idx + 1}</span>
                          <span
                            className={`text-xs font-bold leading-relaxed ${
                              isChecked ? 'text-slate-900' : 'text-slate-700'
                            }`}
                          >
                            {item.title}
                          </span>
                          {itemJobdeskName && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              {itemJobdeskName}
                            </span>
                          )}
                          {item.isPhotoRequired && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                              <Camera className="w-2.5 h-2.5" /> Wajib Foto
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Quick Photo Upload Button / Thumbnail */}
                    <div className="shrink-0 flex items-center gap-2">
                      {photoUrl ? (
                        <div className="relative group">
                          <img
                            src={photoUrl}
                            alt="Bukti"
                            className="w-12 h-12 object-cover rounded-xl border border-orange-200 shadow-sm cursor-pointer"
                            onClick={() => onPreviewPhoto(photoUrl, item.title)}
                          />
                          <div
                            onClick={() => onPreviewPhoto(photoUrl, item.title)}
                            className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer text-white"
                            title="Klik perbesar"
                          >
                            <ZoomIn className="w-4 h-4" />
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setItemPhotos((prev) => {
                                const next = { ...prev };
                                delete next[item.id];
                                return next;
                              });
                            }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md hover:bg-rose-600 transition-colors"
                            title="Hapus foto"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            disabled={isUploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleItemPhotoUpload(item.id, file);
                            }}
                          />
                          <div
                            className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                              item.isPhotoRequired
                                ? 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            } ${isUploading ? 'opacity-50 cursor-wait' : ''}`}
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin text-orange-500" />
                                <span>Upload...</span>
                              </>
                            ) : (
                              <>
                                <Camera className="w-3.5 h-3.5" />
                                <span>{item.isPhotoRequired ? 'Foto Bukti*' : 'Foto'}</span>
                              </>
                            )}
                          </div>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Optional Note input per item if checked */}
                  {isChecked && (
                    <div className="pt-2 border-t border-slate-100">
                      <input
                        type="text"
                        value={itemNotes[item.id] || ''}
                        onChange={(e) =>
                          setItemNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        placeholder="Catatan kecil / kendala pada butir ini (opsional)..."
                        className="w-full px-3 py-1.5 text-[11px] bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-800 placeholder:text-slate-400"
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Section: Shift Documentation Gallery */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-orange-500" />
                Dokumentasi Keseluruhan Outlet (Galeri Bukti)
              </h4>
              <p className="text-[11px] text-slate-500">
                Unggah 1 - 8 foto kondisi outlet (area meja bar, kebersihan lantai, showcase display, mesin).
              </p>
            </div>

            <label className="cursor-pointer shrink-0">
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={galleryUploading}
                onChange={handleGalleryUpload}
              />
              <div
                className={`px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition-all ${
                  galleryUploading ? 'opacity-50 cursor-wait' : ''
                }`}
              >
                {galleryUploading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-orange-500" />
                    <span>Mengunggah...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Foto</span>
                  </>
                )}
              </div>
            </label>
          </div>

          {galleryImages.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 pt-1">
              {galleryImages.map((imgUrl, i) => (
                <div key={i} className="relative group rounded-xl overflow-hidden aspect-square border border-slate-200 shadow-sm">
                  <img
                    src={imgUrl}
                    alt={`Dokumentasi ${i + 1}`}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => onPreviewPhoto(imgUrl, `Dokumentasi Outlet #${i + 1}`)}
                  />
                  <div
                    onClick={() => onPreviewPhoto(imgUrl, `Dokumentasi Outlet #${i + 1}`)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer text-white"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeGalleryPhoto(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    title="Hapus foto"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 text-center">
              <p className="text-[11px] text-slate-400">Belum ada foto dokumentasi outlet yang dilampirkan.</p>
            </div>
          )}
        </div>

        {/* Section: General Shift Notes */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <label className="text-xs font-bold text-slate-700">
            Catatan / Kendala Operasional Staf (Opsional):
          </label>
          <textarea
            value={shiftNotes}
            onChange={(e) => setShiftNotes(e.target.value)}
            placeholder="Contoh: Stok sirup vanila tinggal 2 botol, grinder sudah dikalibrasi rasio 1:2, stop kontak chiller aman..."
            rows={2}
            className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-800 placeholder:text-slate-400"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
          <span className="text-[11px] text-slate-500">
            Pastikan seluruh butir bertanda <span className="font-bold text-amber-700">Wajib Foto</span> telah terunggah.
          </span>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-md shadow-orange-500/10 hover:shadow transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{revisingSubmission ? 'Mengirim Perbaikan...' : 'Mengirim Laporan...'}</span>
              </>
            ) : (
              <>
                {revisingSubmission ? <RotateCcw className="w-4 h-4" /> : <ClipboardCheck className="w-4 h-4" />}
                <span>{revisingSubmission ? 'Kirim Perbaikan Laporan SOP' : 'Kirim Laporan Pengecekan SOP'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
