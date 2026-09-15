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
  ChevronLeft,
  Filter,
  Calendar,
  Layers,
  LayoutGrid,
  List,
  Sparkles
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
  // View Mode: 'calendar' (Bentukan Kalender) | 'list' (Daftar Kartu)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Helper formatting Hari & Tanggal dalam Bahasa Indonesia
  const formatDayAndDate = (dateVal?: any) => {
    if (!dateVal) return '-';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return String(dateVal);
    }
  };

  const formatFullDateWithTime = (dateVal?: any, timeVal?: string | null) => {
    if (!dateVal) return '-';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '-';
      const dayName = d.toLocaleDateString('id-ID', { weekday: 'long' });
      const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const timeStr = timeVal ? `${timeVal} WIB` : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
      return `${dayName}, ${dateStr} • ${timeStr}`;
    } catch {
      return String(dateVal);
    }
  };

  const getDayNameOnly = (dateVal?: any) => {
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('id-ID', { weekday: 'long' });
    } catch {
      return '';
    }
  };

  const getDateKey = (dateVal?: any) => {
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  };

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
    if (selectedCalendarDate) {
      const subDateKey = getDateKey(sub.shiftDate || sub.createdAt);
      if (subDateKey !== selectedCalendarDate) return false;
    }
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

  // Perhitungan hari kalender bulanan
  const calendarYear = currentMonthDate.getFullYear();
  const calendarMonth = currentMonthDate.getMonth();
  const monthNameIndo = currentMonthDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  const firstDayObj = new Date(calendarYear, calendarMonth, 1);
  const lastDayObj = new Date(calendarYear, calendarMonth + 1, 0);
  const daysInMonth = lastDayObj.getDate();
  // ISO day: 0=Monday, 6=Sunday
  const startDayOffset = (firstDayObj.getDay() + 6) % 7;

  // Previous month filler days
  const prevMonthLastDay = new Date(calendarYear, calendarMonth, 0).getDate();
  const prevDays = [];
  for (let i = startDayOffset - 1; i >= 0; i--) {
    prevDays.push(prevMonthLastDay - i);
  }

  // Month navigation
  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(calendarYear, calendarMonth - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(calendarYear, calendarMonth + 1, 1));
  };
  const handleTodayMonth = () => {
    const today = new Date();
    setCurrentMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedCalendarDate(getDateKey(today));
  };

  const todayKey = getDateKey(new Date());

  // Grouping submissions per date key (YYYY-MM-DD)
  const submissionsByDate: Record<string, any[]> = {};
  submissions.forEach((sub) => {
    const key = getDateKey(sub.shiftDate || sub.createdAt);
    if (!submissionsByDate[key]) submissionsByDate[key] = [];
    submissionsByDate[key].push(sub);
  });

  return (
    <div className="space-y-5">
      {/* Top Header & View Switcher */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-500 text-white shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800 tracking-tight">
                Pemeriksaan & Kalender Shift SOP
              </h3>
              <p className="text-xs text-slate-500">
                Pantau laporan pelaksanaan tugas staf berdasarkan hari, tanggal, dan waktu kerja.
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher: Kalender vs List */}
        <div className="inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'calendar'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Bentukan Kalender</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('list');
              setSelectedCalendarDate(null);
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'list'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Daftar Kartu</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] bg-black/10 text-current font-extrabold">
              {filteredSubmissions.length}
            </span>
          </button>
        </div>
      </div>

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

      {/* ========================================================================= */}
      {/* BENTUKAN KALENDER INTERAKTIF                                            */}
      {/* ========================================================================= */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-5">
          {/* Calendar Month Navigation Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h4 className="font-extrabold text-base sm:text-lg text-slate-800 capitalize min-w-[170px] text-center">
                {monthNameIndo}
              </h4>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleTodayMonth}
                className="ml-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 transition-colors"
              >
                Bulan Ini
              </button>
            </div>

            {/* Selected Date Tag & Reset Button */}
            {selectedCalendarDate ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Filter Aktif:</span>
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-orange-500 text-white shadow-xs">
                  {formatDayAndDate(selectedCalendarDate)}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCalendarDate(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors text-xs"
                  title="Tampilkan semua hari di bulan ini"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Klik salah satu tanggal pada kalender untuk melihat rincian shift.
              </p>
            )}
          </div>

          {/* 7 Columns Days of Week Header (Indonesian) */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-extrabold text-slate-600 pb-1">
            <span className="text-slate-500">Senin</span>
            <span className="text-slate-500">Selasa</span>
            <span className="text-slate-500">Rabu</span>
            <span className="text-slate-500">Kamis</span>
            <span className="text-slate-500">Jumat</span>
            <span className="text-amber-700">Sabtu</span>
            <span className="text-rose-600">Minggu</span>
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Prev month padding days */}
            {prevDays.map((d, i) => (
              <div
                key={`prev-${i}`}
                className="min-h-[75px] sm:min-h-[95px] p-1.5 sm:p-2 rounded-2xl bg-slate-50/50 border border-dashed border-slate-100 text-slate-300 select-none"
              >
                <span className="text-[11px] font-semibold">{d}</span>
              </div>
            ))}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }, (_, idx) => {
              const dayNum = idx + 1;
              const dateKey = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const daySubs = submissionsByDate[dateKey] || [];
              const isToday = dateKey === todayKey;
              const isSelected = selectedCalendarDate === dateKey;

              return (
                <div
                  key={dateKey}
                  onClick={() => setSelectedCalendarDate(isSelected ? null : dateKey)}
                  className={`min-h-[75px] sm:min-h-[95px] p-1.5 sm:p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/40 shadow-sm'
                      : isToday
                      ? 'border-orange-300 bg-orange-50/20 hover:border-orange-400'
                      : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  {/* Top Day Number & Today indicator */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isToday
                          ? 'w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-xs'
                          : isSelected
                          ? 'text-orange-600 font-extrabold'
                          : 'text-slate-700'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {daySubs.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700">
                        {daySubs.length} shift
                      </span>
                    )}
                  </div>

                  {/* Shift Pills in Day Cell */}
                  <div className="space-y-1 mt-1 overflow-hidden">
                    {daySubs.slice(0, 2).map((sub) => (
                      <div
                        key={sub.id}
                        className={`px-1.5 py-0.5 rounded-lg text-[9px] font-bold truncate flex items-center gap-1 ${
                          sub.shiftType === 'OPENING'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : sub.shiftType === 'CLOSING'
                            ? 'bg-purple-100 text-purple-900 border border-purple-200'
                            : 'bg-blue-100 text-blue-900 border border-blue-200'
                        }`}
                      >
                        <span className="truncate">
                          {sub.user?.name ? sub.user.name.split(' ')[0] : 'Staf'} ({getJobdeskName(sub.jobdeskCode)})
                        </span>
                        {sub.status === 'VERIFIED' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        )}
                        {sub.status === 'NEEDS_IMPROVEMENT' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        )}
                      </div>
                    ))}
                    {daySubs.length > 2 && (
                      <p className="text-[9px] text-slate-400 font-semibold text-center">
                        +{daySubs.length - 2} lagi
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Day Submissions Header (in Calendar Mode) */}
      {viewMode === 'calendar' && selectedCalendarDate && (
        <div className="flex items-center justify-between bg-orange-50 border border-orange-200 px-4 py-3 rounded-2xl">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orange-600" />
            <span className="text-xs font-bold text-orange-950">
              Rincian Shift: {formatDayAndDate(selectedCalendarDate)}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-500 text-white">
              {filteredSubmissions.length} Laporan
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedCalendarDate(null)}
            className="text-xs font-bold text-orange-700 hover:text-orange-900 underline"
          >
            Lihat Semua Laporan
          </button>
        </div>
      )}

      {/* Submissions List / Cards */}
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
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                        <Calendar className="w-3 h-3 text-orange-500" />
                        <span>{formatDayAndDate(sub.shiftDate || sub.createdAt)}</span>
                        <span className="text-slate-300">•</span>
                        <Clock className="w-3 h-3 text-amber-500" />
                        <span>{sub.shiftTime ? `${sub.shiftTime} WIB` : new Date(sub.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'}</span>
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
                <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-orange-100 font-medium">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    {selectedSubmission.user?.name || 'Staf Operasional'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 bg-white/15 px-2 py-0.5 rounded-md text-white font-bold">
                    <Calendar className="w-3.5 h-3.5 text-amber-200" />
                    {formatFullDateWithTime(selectedSubmission.shiftDate || selectedSubmission.createdAt, selectedSubmission.shiftTime)}
                  </span>
                </div>
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
