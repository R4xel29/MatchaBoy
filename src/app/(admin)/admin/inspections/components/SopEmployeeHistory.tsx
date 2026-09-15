'use client';

import React, { useState } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MessageSquare,
  RotateCcw,
  Camera,
  ChevronRight,
  Eye,
  Check,
  X,
  Sparkles,
  Info,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

interface SopEmployeeHistoryProps {
  submissions: any[];
  jobdesks: any[];
  currentUserId?: string;
  onStartRevision: (submission: any) => void;
  onPreviewPhoto: (url: string, title?: string) => void;
}

export default function SopEmployeeHistory({
  submissions,
  jobdesks,
  currentUserId,
  onStartRevision,
  onPreviewPhoto,
}: SopEmployeeHistoryProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'NEEDS_IMPROVEMENT' | 'VERIFIED' | 'PENDING_REVIEW'>('ALL');
  const formatFullDateTime = (dateVal?: any, timeVal?: string | null) => {
    if (!dateVal) return '-';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '-';
      const dayName = d.toLocaleDateString('id-ID', { weekday: 'long' });
      const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      const timeStr = timeVal ? `${timeVal} WIB` : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
      return `${dayName}, ${dateStr} • ${timeStr}`;
    } catch {
      return String(dateVal);
    }
  };


  // Filter submissions: if currentUserId is present, show staff's own submissions;
  // if not or preview mode, show all submissions in the list
  const userSubmissions = submissions.filter((s) => {
    if (currentUserId && s.userId && s.userId !== currentUserId) return false;
    return true;
  });

  const filteredSubmissions = userSubmissions.filter((s) => {
    if (selectedFilter === 'ALL') return true;
    return s.status === selectedFilter;
  });

  const getJobdeskName = (code?: string | null) => {
    if (!code || code === 'GENERAL') return 'Semua Jobdesk (Umum)';
    const found = jobdesks.find((j) => j.code === code);
    return found ? found.name : code;
  };

  const getShiftBadge = (type: string) => {
    switch (type) {
      case 'OPENING':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Buka Toko (Opening)
          </span>
        );
      case 'CLOSING':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            Tutup Toko (Closing)
          </span>
        );
      case 'ROUTINE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            Kebersihan & Rutin
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            {type}
          </span>
        );
    }
  };

  const getStatusBadge = (status: string, isRevised?: boolean) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Disahkan Admin
          </span>
        );
      case 'NEEDS_IMPROVEMENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-200 shadow-xs animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            Perlu Perbaikan
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200 shadow-xs">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            {isRevised ? 'Perbaikan Dikirim' : 'Menunggu Review'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Info Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-orange-500" />
            Riwayat Laporan & Catatan Evaluasi Staf
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Pantau status verifikasi, catatan koreksi dari Admin Utama, dan lakukan revisi tugas jika diperlukan.
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto bg-slate-100 p-1 rounded-2xl">
          {[
            { id: 'ALL', label: 'Semua' },
            { id: 'NEEDS_IMPROVEMENT', label: 'Perlu Perbaikan' },
            { id: 'VERIFIED', label: 'Disahkan' },
            { id: 'PENDING_REVIEW', label: 'Menunggu' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedFilter === f.id
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Submissions List */}
      {filteredSubmissions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-sm">
          <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-700">Belum Ada Riwayat Laporan</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {selectedFilter === 'ALL'
              ? 'Anda belum pernah mengirim laporan checklist SOP shift.'
              : 'Tidak ada laporan yang sesuai dengan filter yang dipilih.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredSubmissions.map((sub) => {
            const items = sub.items || [];
            const completedCount = items.filter((i: any) => i.isChecked).length;
            const totalCount = items.length;
            let galleryArr: string[] = [];
            try {
              if (sub.galleryImages) galleryArr = JSON.parse(sub.galleryImages);
            } catch {}
            const photosCount = items.filter((i: any) => !!i.photoUrl).length + galleryArr.length;

            const isNeedsImprovement = sub.status === 'NEEDS_IMPROVEMENT';

            return (
              <div
                key={sub.id}
                className={`bg-white rounded-2xl border transition-all shadow-sm p-5 space-y-4 ${
                  isNeedsImprovement
                    ? 'border-rose-300 bg-rose-50/20 ring-1 ring-rose-200'
                    : 'border-slate-200/80 hover:border-orange-300'
                }`}
              >
                {/* Header Sub-Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    {getShiftBadge(sub.shiftType)}
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200 flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {getJobdeskName(sub.jobdeskCode)}
                    </span>
                    {sub.isRevised && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        Revisi
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 shadow-xs">
                      <Calendar className="w-3 h-3 text-orange-500" />
                      <span>{formatFullDateTime(sub.shiftDate || sub.createdAt, sub.shiftTime)}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(sub.status, sub.isRevised)}
                  </div>
                </div>

                {/* Feedback Alert if Admin reviewed */}
                {sub.reviewNotes ? (
                  <div
                    className={`p-4 rounded-2xl border ${
                      isNeedsImprovement
                        ? 'bg-rose-50 border-rose-200 text-rose-950'
                        : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <MessageSquare
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          isNeedsImprovement ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      />
                      <div className="space-y-1 text-xs">
                        <div className="font-bold flex items-center gap-1.5">
                          <span>Catatan Evaluasi Admin</span>
                          {sub.reviewedBy?.name && (
                            <span className="font-semibold text-slate-500">
                              (oleh {sub.reviewedBy.name})
                            </span>
                          )}
                          :
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap font-medium">
                          {sub.reviewNotes}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  sub.status === 'PENDING_REVIEW' && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Laporan sedang dalam antrean pemeriksaan oleh Admin Utama.</span>
                    </div>
                  )
                )}

                {/* Submission Metrics & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    <span className="font-semibold">
                      Tugas Selesai:{' '}
                      <strong className="text-slate-800">
                        {completedCount}/{totalCount}
                      </strong>{' '}
                      ({totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%)
                    </span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <Camera className="w-3.5 h-3.5 text-orange-500" />
                      {photosCount} foto bukti
                    </span>
                    {sub.notes && (
                      <span className="text-slate-500 italic line-clamp-1 max-w-xs">
                        &ldquo;{sub.notes}&rdquo;
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedSubmission(sub)}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Lihat Rincian
                    </button>

                    {isNeedsImprovement && (
                      <button
                        type="button"
                        onClick={() => onStartRevision(sub)}
                        className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Revisi Laporan
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {getShiftBadge(selectedSubmission.shiftType)}
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-100 text-orange-800">
                    {getJobdeskName(selectedSubmission.jobdeskCode)}
                  </span>
                  {selectedSubmission.isRevised && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800">
                      Revisi
                    </span>
                  )}
                </div>
                <h3 className="text-base font-extrabold text-slate-800">
                  Rincian Laporan Checklist
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
              {/* Status & Feedback box in modal */}
              {selectedSubmission.reviewNotes && (
                <div
                  className={`p-4 rounded-2xl border ${
                    selectedSubmission.status === 'NEEDS_IMPROVEMENT'
                      ? 'bg-rose-50 border-rose-200 text-rose-950'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <MessageSquare className="w-4 h-4 mt-0.5 shrink-0 text-orange-600" />
                    <div className="space-y-1 text-xs">
                      <div className="font-bold flex items-center gap-1.5">
                        <span>Catatan Evaluasi Admin</span>
                        {selectedSubmission.reviewedBy?.name && (
                          <span className="font-semibold text-slate-500">
                            (oleh {selectedSubmission.reviewedBy.name})
                          </span>
                        )}
                        :
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap font-medium">
                        {selectedSubmission.reviewNotes}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* General Staff Note */}
              {selectedSubmission.notes && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 block mb-1">
                    Catatan Staf Pengirim:
                  </span>
                  <p className="text-xs text-slate-700 italic">
                    &ldquo;{selectedSubmission.notes}&rdquo;
                  </p>
                </div>
              )}

              {/* Checklist Items list */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Daftar Tugas Checklist ({selectedSubmission.items?.length || 0} butir)
                </h4>
                <div className="space-y-2.5">
                  {selectedSubmission.items?.map((item: any, idx: number) => (
                    <div
                      key={item.id || idx}
                      className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                        item.isChecked
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : 'bg-slate-50/60 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                            item.isChecked
                              ? 'bg-emerald-500 text-white'
                              : 'border border-slate-300 bg-white'
                          }`}
                        >
                          {item.isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div>
                          <p className={`font-semibold ${item.isChecked ? 'text-slate-800' : 'text-slate-500'}`}>
                            {item.label}
                          </p>
                          {item.notes && (
                            <p className="text-[11px] text-slate-500 mt-0.5 italic">
                              Catatan: {item.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {item.photoUrl && (
                        <div
                          onClick={() => onPreviewPhoto(item.photoUrl, item.label)}
                          className="relative shrink-0 w-10 h-10 rounded-lg overflow-hidden border border-slate-200 cursor-pointer group"
                        >
                          <img
                            src={item.photoUrl}
                            alt="Bukti"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Shift Gallery Photos */}
              {(() => {
                let gal: string[] = [];
                try {
                  if (selectedSubmission.galleryImages) gal = JSON.parse(selectedSubmission.galleryImages);
                } catch {}
                if (gal.length === 0) return null;

                return (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-orange-500" />
                      Dokumentasi Foto Shift ({gal.length} Foto)
                    </h4>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {gal.map((imgUrl, i) => (
                        <div
                          key={i}
                          onClick={() => onPreviewPhoto(imgUrl, `Dokumentasi Shift #${i + 1}`)}
                          className="aspect-square rounded-xl overflow-hidden border border-slate-200 cursor-pointer hover:ring-2 hover:ring-orange-500 transition-all"
                        >
                          <img src={imgUrl} alt="Shift" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Tutup
              </button>

              {selectedSubmission.status === 'NEEDS_IMPROVEMENT' && (
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedSubmission;
                    setSelectedSubmission(null);
                    onStartRevision(target);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Mulai Revisi Laporan
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
