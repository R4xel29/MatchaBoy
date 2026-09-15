'use client';

import React, { useState } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Camera,
  Image as ImageIcon,
  Check,
  X,
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  ZoomIn,
  Loader2,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface SopAdminReviewProps {
  submissions: any[];
  jobdesks?: any[];
  onVerificationSuccess: (updatedSubmission: any) => void;
  onPreviewPhoto: (url: string, title?: string) => void;
}

export default function SopAdminReview({
  submissions,
  jobdesks = [],
  onVerificationSuccess,
  onPreviewPhoto,
}: SopAdminReviewProps) {
  const { showToast } = useToast();
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);

  // Verification Form in Modal
  const [reviewStatus, setReviewStatus] = useState<'VERIFIED' | 'NEEDS_IMPROVEMENT'>('VERIFIED');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Open modal and prefill review status/notes
  const handleOpenDetail = (sub: any) => {
    setSelectedSubmission(sub);
    setReviewStatus(sub.status === 'NEEDS_IMPROVEMENT' ? 'NEEDS_IMPROVEMENT' : 'VERIFIED');
    setReviewNotes(sub.reviewNotes || '');
  };

  const handleSaveVerification = async () => {
    if (!selectedSubmission) return;
    setIsVerifying(true);

    try {
      const res = await fetch('/api/admin/inspections/checklist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: selectedSubmission.id,
          status: reviewStatus,
          reviewNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memverifikasi');

      showToast(data.message || 'Verifikasi berhasil disimpan!', 'success');
      onVerificationSuccess(data.submission);
      setSelectedSubmission(data.submission);
    } catch (err: any) {
      showToast(err.message || 'Gagal memverifikasi', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  // Filter submissions
  const filteredSubmissions = submissions.filter((sub) => {
    if (selectedShiftFilter !== 'ALL' && sub.shiftType !== selectedShiftFilter) return false;
    if (selectedStatusFilter !== 'ALL' && sub.status !== selectedStatusFilter) return false;
    return true;
  });

  const getJobdeskName = (code?: string | null) => {
    if (!code || code === 'GENERAL') return 'Umum';
    const found = jobdesks.find((j) => j.code === code);
    return found ? found.name : code;
  };

  const getShiftBadge = (type: string) => {
    switch (type) {
      case 'OPENING':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">Buka Toko</span>;
      case 'CLOSING':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800">Tutup Toko</span>;
      case 'ROUTINE':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">Rutin Harian</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">{type}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Disahkan
          </span>
        );
      case 'NEEDS_IMPROVEMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" /> Perlu Perbaikan
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" /> Menunggu Review
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Filter Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Shift:
          </span>
          {['ALL', 'OPENING', 'ROUTINE', 'CLOSING'].map((shift) => (
            <button
              key={shift}
              onClick={() => setSelectedShiftFilter(shift)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors ${
                selectedShiftFilter === shift
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {shift === 'ALL' && 'Semua Shift'}
              {shift === 'OPENING' && 'Buka'}
              {shift === 'ROUTINE' && 'Rutin'}
              {shift === 'CLOSING' && 'Tutup'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Status:</span>
          {[
            { id: 'ALL', label: 'Semua' },
            { id: 'PENDING_REVIEW', label: 'Menunggu Review' },
            { id: 'VERIFIED', label: 'Disahkan' },
            { id: 'NEEDS_IMPROVEMENT', label: 'Perlu Perbaikan' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setSelectedStatusFilter(st.id)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors ${
                selectedStatusFilter === st.id
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Submissions List */}
      {filteredSubmissions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-sm">
          <ClipboardCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-700">Belum Ada Laporan SOP</h4>
          <p className="text-xs text-slate-400 mt-1">
            Belum ada pengisian formulir checklist SOP dari staf untuk filter yang dipilih.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSubmissions.map((sub) => {
            const items = sub.items || [];
            const completedCount = items.filter((i: any) => i.isChecked).length;
            const totalCount = items.length;
            let galleryArr: string[] = [];
            try {
              if (sub.galleryImages) galleryArr = JSON.parse(sub.galleryImages);
            } catch {}
            const photosCount = items.filter((i: any) => !!i.photoUrl).length + galleryArr.length;

            return (
              <div
                key={sub.id}
                onClick={() => handleOpenDetail(sub)}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer space-y-3.5 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getShiftBadge(sub.shiftType)}
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                        {getJobdeskName(sub.jobdeskCode)}
                      </span>
                      {sub.isRevised && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          Revisi
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">
                        {new Date(sub.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-sm font-extrabold text-slate-800">
                      Oleh: {sub.user?.name || 'Staf Operasional'}
                    </p>
                  </div>
                  {getStatusBadge(sub.status)}
                </div>

                <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-600 font-medium">Kelengkapan Tugas:</span>
                  <span className="font-bold text-slate-800">
                    {completedCount} dari {totalCount} butir ({totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%)
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span className="inline-flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-orange-500" />
                    {photosCount} foto bukti terlampir
                  </span>

                  <span className="inline-flex items-center gap-1 text-orange-600 font-bold group-hover:translate-x-1 transition-transform">
                    Buka Rincian <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DETAIL INSPEKSI & VERIFIKASI ADMIN                                 */}
      {/* ========================================================================= */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] shadow-2xl border border-orange-100 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between shrink-0">
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <ShieldCheck className="w-5 h-5" />
                  <h3 className="font-extrabold text-sm sm:text-base">
                    Verifikasi Laporan SOP: {selectedSubmission.shiftType === 'OPENING' ? 'Buka Toko' : selectedSubmission.shiftType === 'CLOSING' ? 'Tutup Toko' : 'Rutin'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30">
                    {getJobdeskName(selectedSubmission.jobdeskCode)}
                  </span>
                  {selectedSubmission.isRevised && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-900/60 text-purple-200 border border-purple-300/40">
                      Revisi Dikirim
                    </span>
                  )}
                </div>
                <p className="text-xs text-orange-100">
                  Diajukan oleh {selectedSubmission.user?.name || 'Staf'} pada {new Date(selectedSubmission.createdAt).toLocaleString('id-ID')}
                </p>
              </div>

              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {/* Reviewer Note Banner if already verified */}
              {selectedSubmission.reviewedBy && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">Status Peninjauan Owner:</span>
                    {getStatusBadge(selectedSubmission.status)}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Diverifikasi oleh <span className="font-bold text-slate-700">{selectedSubmission.reviewedBy.name}</span> pada {selectedSubmission.reviewedAt ? new Date(selectedSubmission.reviewedAt).toLocaleString('id-ID') : '-'}
                  </p>
                  {selectedSubmission.reviewNotes && (
                    <div className="mt-2 p-2.5 bg-white rounded-xl border border-slate-200 text-slate-700 italic">
                      "{selectedSubmission.reviewNotes}"
                    </div>
                  )}
                </div>
              )}

              {/* Rincian Butir Checklist */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                  <ClipboardCheck className="w-4 h-4 text-orange-500" />
                  Rincian Butir Checklist & Foto Bukti
                </h4>

                <div className="space-y-2.5">
                  {(selectedSubmission.items || []).map((item: any, idx: number) => (
                    <div
                      key={item.id || idx}
                      className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 ${
                        item.isChecked
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : 'bg-rose-50/40 border-rose-200'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 flex-1">
                        <div
                          className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            item.isChecked ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                          }`}
                        >
                          {item.isChecked ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        <div>
                          <p className={`font-bold ${item.isChecked ? 'text-slate-800' : 'text-rose-700 line-through'}`}>
                            {item.label}
                          </p>
                          {item.notes && (
                            <p className="text-[11px] text-slate-500 mt-1 italic">
                              Catatan Staf: "{item.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Photo Thumbnail */}
                      {item.photoUrl && (
                        <div
                          onClick={() => onPreviewPhoto(item.photoUrl, item.label)}
                          className="relative group shrink-0 cursor-pointer"
                        >
                          <img
                            src={item.photoUrl}
                            alt="Bukti"
                            className="w-12 h-12 rounded-xl object-cover border border-slate-300 shadow-sm"
                          />
                          <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <ZoomIn className="w-4 h-4" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Dokumentasi Galeri Shift */}
              {(() => {
                let gal: string[] = [];
                try {
                  if (selectedSubmission.galleryImages) gal = JSON.parse(selectedSubmission.galleryImages);
                } catch {}
                if (gal.length === 0) return null;

                return (
                  <div className="space-y-2.5 pt-2 border-t border-slate-100">
                    <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-orange-500" />
                      Galeri Foto Dokumentasi Outlet ({gal.length} foto)
                    </h4>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {gal.map((img, i) => (
                        <div
                          key={i}
                          onClick={() => onPreviewPhoto(img, `Galeri Dokumentasi #${i + 1}`)}
                          className="relative group rounded-2xl overflow-hidden aspect-square border border-slate-200 cursor-pointer shadow-sm"
                        >
                          <img src={img} alt="Galeri" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <ZoomIn className="w-5 h-5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Catatan Keseluruhan Staf */}
              {selectedSubmission.notes && (
                <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-1">
                  <span className="font-bold text-amber-900 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" /> Catatan Staf Operasional:
                  </span>
                  <p className="text-slate-700">{selectedSubmission.notes}</p>
                </div>
              )}

              {/* Formulir Verifikasi Admin Utama */}
              <div className="p-5 bg-gradient-to-br from-orange-50/60 to-amber-50/60 rounded-3xl border border-orange-200 space-y-4">
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-orange-600" />
                  Evaluasi & Pengesahan Admin Utama
                </h4>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-xs font-bold text-slate-700">Keputusan Verifikasi:</label>
                  <div className="inline-flex p-1 rounded-xl bg-white border border-slate-200 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setReviewStatus('VERIFIED')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        reviewStatus === 'VERIFIED'
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Disahkan (Sah)
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewStatus('NEEDS_IMPROVEMENT')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        reviewStatus === 'NEEDS_IMPROVEMENT'
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Perlu Perbaikan
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Catatan Evaluasi / Arahan Supervisor untuk Staf:
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Contoh: Bar sudah bersih rapi, besok pastikan foto suhu chiller lebih jelas ya..."
                    rows={2}
                    className="w-full p-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-800 placeholder:text-slate-400"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedSubmission(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-white rounded-xl transition-colors"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveVerification}
                    disabled={isVerifying}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl shadow-sm transition-all disabled:opacity-50"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Simpan Hasil Verifikasi</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
