'use client';

import React, { useState } from 'react';
import { 
  ClipboardCheck, 
  Coins, 
  Package, 
  ListChecks, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  User, 
  ArrowUpRight, 
  ArrowDownRight, 
  RotateCcw, 
  Search, 
  Printer, 
  FileText, 
  Sparkles, 
  Loader2, 
  Check, 
  SlidersHorizontal,
  Coffee,
  X,
  Eye,
  Settings
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import SopChecklistForm from './components/SopChecklistForm';
import SopAdminReview from './components/SopAdminReview';
import SopMasterManagement from './components/SopMasterManagement';
import SopEmployeeHistory from './components/SopEmployeeHistory';
import PhotoLightboxModal from './components/PhotoLightboxModal';

interface InspectionsClientProps {
  userRole: string;
  userName: string;
  currentUserId?: string;
  initialShifts: any[];
  initialIngredients: any[];
  initialMovements: any[];
  initialLogs: any[];
  initialTodayChecklists: any[];
  initialTemplates: any[];
  initialJobdesks?: any[];
  initialTodaySubmissions: any[];
  initialRecentSubmissions: any[];
}

export default function InspectionsClient({
  userRole,
  userName,
  currentUserId,
  initialShifts,
  initialIngredients,
  initialMovements,
  initialLogs,
  initialTodayChecklists,
  initialTemplates,
  initialJobdesks,
  initialTodaySubmissions,
  initialRecentSubmissions,
}: InspectionsClientProps) {
  const { showToast } = useToast();
  const isAdmin = userRole === 'ADMIN';

  // Tabs for Admin: 'templates' | 'sop-review' | 'fill-sop' | 'shifts' | 'stock' | 'logs'
  // For Karyawan: always locked to SOP checklist form!
  const [activeTab, setActiveTab] = useState<'templates' | 'sop-review' | 'fill-sop' | 'shifts' | 'stock' | 'logs'>(
    isAdmin ? 'templates' : 'fill-sop'
  );
  const [previewAsStaff, setPreviewAsStaff] = useState(false);

  // --- SOP & TEMPLATES STATE ---
  const [templates, setTemplates] = useState(initialTemplates || []);
  const [jobdesks, setJobdesks] = useState(initialJobdesks || []);
  const [submissions, setSubmissions] = useState(initialRecentSubmissions || []);
  const [todaySubmissions, setTodaySubmissions] = useState(initialTodaySubmissions || []);
  const [employeeSubTab, setEmployeeSubTab] = useState<'form' | 'history'>('form');
  const [revisingSubmission, setRevisingSubmission] = useState<any | null>(null);

  // --- PHOTO LIGHTBOX STATE ---
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string | undefined>(undefined);

  const handlePreviewPhoto = (url: string, title?: string) => {
    setLightboxUrl(url);
    setLightboxTitle(title);
    setLightboxOpen(true);
  };

  // --- STATE SHIFTS (Admin Only) ---
  const [shifts, setShifts] = useState(initialShifts || []);
  const [selectedCashierFilter, setSelectedCashierFilter] = useState<string>('ALL');
  const [selectedShiftModal, setSelectedShiftModal] = useState<any | null>(null);

  // --- STATE STOCK OPNAME (Admin Only) ---
  const [ingredients, setIngredients] = useState(initialIngredients || []);
  const [movements, setMovements] = useState(initialMovements || []);
  const [stockSearch, setStockSearch] = useState('');
  const [opnameTarget, setOpnameTarget] = useState<any | null>(null);
  const [physicalInput, setPhysicalInput] = useState<string>('');
  const [reasonCategory, setReasonCategory] = useState<string>('ADJUST');
  const [opnameNotes, setOpnameNotes] = useState<string>('');
  const [opnameLoading, setOpnameLoading] = useState(false);
  const [opnameToast, setOpnameToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // --- STATE LOGS (Admin Only) ---
  const [logFilter, setLogFilter] = useState<string>('ALL');

  // Filter shifts
  const uniqueCashiers = Array.from(
    new Set(shifts.map((s: any) => s.cashier?.name || 'Kasir').filter(Boolean))
  );

  const filteredShifts = shifts.filter((s: any) => {
    if (selectedCashierFilter === 'ALL') return true;
    return (s.cashier?.name || 'Kasir') === selectedCashierFilter;
  });

  // Filter ingredients
  const filteredIngredients = ingredients.filter((ing: any) =>
    ing.name.toLowerCase().includes(stockSearch.toLowerCase())
  );

  // Handle Stock Opname Modal
  const openOpnameModal = (ing: any) => {
    setOpnameTarget(ing);
    setPhysicalInput(ing.stock.toString());
    setReasonCategory('ADJUST');
    setOpnameNotes('');
    setOpnameToast(null);
  };

  const submitStockOpname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opnameTarget) return;

    const parsed = parseFloat(physicalInput);
    if (isNaN(parsed) || parsed < 0) {
      setOpnameToast({ msg: 'Masukkan jumlah fisik yang valid (angka non-negatif)', type: 'error' });
      return;
    }

    setOpnameLoading(true);
    setOpnameToast(null);

    try {
      const res = await fetch('/api/admin/inspections/stock-opname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredientId: opnameTarget.id,
          physicalStock: parsed,
          reasonCategory,
          notes: opnameNotes,
        }),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Gagal menyimpan stock opname');

      setIngredients((prev: any[]) =>
        prev.map((i) => (i.id === opnameTarget.id ? { ...i, stock: parsed } : i))
      );

      if (d.data?.movement) {
        setMovements((prev: any[]) => [
          {
            ...d.data.movement,
            ingredient: { name: opnameTarget.name, unit: opnameTarget.unit },
          },
          ...prev.slice(0, 29),
        ]);
      }

      setOpnameToast({ msg: `Stock opname ${opnameTarget.name} berhasil diperbarui!`, type: 'success' });
      setTimeout(() => {
        setOpnameTarget(null);
        setOpnameToast(null);
      }, 1200);
    } catch (err: any) {
      setOpnameToast({ msg: err.message || 'Terjadi kesalahan sistem', type: 'error' });
    } finally {
      setOpnameLoading(false);
    }
  };

  // Callback on submission success from SopChecklistForm (supports new and revised)
  const handleSubmissionSuccess = (newOrUpdatedSub: any) => {
    setSubmissions((prev) => {
      const exists = prev.some((s) => s.id === newOrUpdatedSub.id);
      if (exists) {
        return prev.map((s) => (s.id === newOrUpdatedSub.id ? newOrUpdatedSub : s));
      }
      return [newOrUpdatedSub, ...prev];
    });
    setTodaySubmissions((prev) => {
      const exists = prev.some((s) => s.id === newOrUpdatedSub.id);
      if (exists) {
        return prev.map((s) => (s.id === newOrUpdatedSub.id ? newOrUpdatedSub : s));
      }
      return [newOrUpdatedSub, ...prev];
    });
    setRevisingSubmission(null);
  };

  const handleStartRevision = (sub: any) => {
    setRevisingSubmission(sub);
    setEmployeeSubTab('form');
  };

  const handleCancelRevision = () => {
    setRevisingSubmission(null);
  };

  // Callback on verification success from SopAdminReview
  const handleVerificationSuccess = (updatedSub: any) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === updatedSub.id ? updatedSub : s))
    );
    setTodaySubmissions((prev) =>
      prev.map((s) => (s.id === updatedSub.id ? updatedSub : s))
    );
  };

  // Filter Logs
  const filteredLogs = (initialLogs || []).filter((log: any) => {
    if (logFilter === 'ALL') return true;
    if (logFilter === 'ORDER') return log.entity === 'ORDER';
    if (logFilter === 'STOCK') return log.action === 'STOCK_OPNAME' || log.entity === 'INGREDIENT';
    if (logFilter === 'CHECKLIST') return log.entity.startsWith('CHECKLIST') || log.entity.startsWith('SOP');
    if (logFilter === 'USER') return log.entity === 'USER';
    return true;
  });

  // Count pending review submissions
  const pendingReviewCount = submissions.filter((s) => s.status === 'PENDING_REVIEW').length;

  return (
    <div className="space-y-6">
      {/* Lightbox Modal */}
      <PhotoLightboxModal
        isOpen={lightboxOpen}
        imageUrl={lightboxUrl}
        title={lightboxTitle}
        onClose={() => setLightboxOpen(false)}
      />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold mb-3">
              <ClipboardCheck className="w-3.5 h-3.5" />
              {isAdmin
                ? previewAsStaff
                  ? 'Pratinjau Mode Staf (Karyawan)'
                  : 'Pusat Kendali Master Admin Arum Seduh'
                : 'Mode Staf Operasional Arum Seduh'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isAdmin
                ? previewAsStaff
                  ? 'Pelaporan Checklist SOP (Tampilan Karyawan)'
                  : 'Master Admin: Audit & Pengecekan Toko'
                : 'Pelaporan Checklist SOP Outlet'}
            </h1>
            <p className="text-orange-100 text-xs sm:text-sm mt-1 max-w-2xl">
              {isAdmin
                ? previewAsStaff
                  ? 'Berikut adalah antarmuka yang dilihat oleh staf kasir & barista saat mengisi laporan checklist SOP.'
                  : 'Kelola master butir SOP dengan aksi massal (Bulk Action), verifikasi laporan masuk staf, pantau rekonsiliasi kas shift, dan stock opname bar.'
                : 'Formulir checklist pembukaan toko, kebersihan berkala, dan penutupan shift kasir & barista Arum Seduh.'}
            </p>
          </div>

          {/* Switcher Mode untuk Admin Utama */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setPreviewAsStaff(!previewAsStaff)}
              className="self-start sm:self-auto px-4 py-2 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-xs transition-all border border-white/30 shadow-sm flex items-center gap-2 shrink-0"
            >
              <Eye className="w-4 h-4" />
              <span>{previewAsStaff ? 'Kembali ke Master Admin' : 'Lihat Tampilan Karyawan'}</span>
            </button>
          )}
        </div>
        <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 opacity-10 pointer-events-none">
          <Coffee className="w-72 h-72 text-white" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAMPILAN UNTUK KARYAWAN (ATAU SAAT ADMIN MEMILIH PRATINJAU STAF)         */}
      {/* ========================================================================= */}
      {(!isAdmin || previewAsStaff) ? (
        <div className="space-y-6">
          {previewAsStaff && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-900 font-medium">
              <span>Anda sedang melihat tampilan khusus <strong>Karyawan (Staf Operasional)</strong>. Karyawan dapat mengisi checklist sesuai peran jobdesk dan melihat catatan evaluasi.</span>
              <button
                type="button"
                onClick={() => setPreviewAsStaff(false)}
                className="font-bold text-orange-600 hover:underline shrink-0 ml-2"
              >
                Kembali ke Master Admin &rarr;
              </button>
            </div>
          )}

          {/* Sub-tab navigasi staf */}
          {(() => {
            const staffSubs = submissions.filter((s) => !currentUserId || s.userId === currentUserId);
            const needsImprovementCount = staffSubs.filter((s) => s.status === 'NEEDS_IMPROVEMENT').length;

            return (
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setEmployeeSubTab('form')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                    employeeSubTab === 'form'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ListChecks className="w-4 h-4" />
                  <span>Formulir Checklist SOP</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEmployeeSubTab('history')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                    employeeSubTab === 'history'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Riwayat & Feedback Saya</span>
                  {needsImprovementCount > 0 && (
                    <span className="ml-1 px-2 py-0.5 rounded-md text-[10px] bg-rose-500 text-white font-extrabold animate-pulse">
                      {needsImprovementCount} Perlu Perbaikan
                    </span>
                  )}
                </button>
              </div>
            );
          })()}

          {employeeSubTab === 'form' ? (
            <SopChecklistForm
              templates={templates}
              jobdesks={jobdesks}
              userRole={userRole}
              userName={userName}
              todaySubmissions={todaySubmissions}
              revisingSubmission={revisingSubmission}
              onCancelRevision={handleCancelRevision}
              onSubmissionSuccess={handleSubmissionSuccess}
              onPreviewPhoto={handlePreviewPhoto}
            />
          ) : (
            <SopEmployeeHistory
              submissions={submissions}
              jobdesks={jobdesks}
              currentUserId={currentUserId}
              onStartRevision={handleStartRevision}
              onPreviewPhoto={handlePreviewPhoto}
            />
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* TAMPILAN KHUSUS ADMIN UTAMA (SELURUH FITUR + MASTER SOP + VERIFIKASI)     */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Tabs Navigation Admin */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                activeTab === 'templates'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Kelola Master SOP</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] bg-white/20 text-white font-bold">
                {templates.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('sop-review')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                activeTab === 'sop-review'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Verifikasi SOP Staf</span>
              {pendingReviewCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] bg-amber-300 text-slate-900 font-extrabold animate-pulse">
                  {pendingReviewCount} Baru
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('fill-sop')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                activeTab === 'fill-sop'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ListChecks className="w-4 h-4" />
              <span>Formulir Pengisian SOP</span>
            </button>

            <button
              onClick={() => setActiveTab('shifts')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                activeTab === 'shifts'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Coins className="w-4 h-4" />
              <span>Audit Kas Shift</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] bg-white/20 text-white font-bold">
                {shifts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('stock')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                activeTab === 'stock'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Stock Opname Bar</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] bg-white/20 text-white font-bold">
                {ingredients.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                activeTab === 'logs'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Log Audit Staf</span>
            </button>
          </div>

          {/* TAB: VERIFIKASI SOP STAF */}
          {activeTab === 'sop-review' && (
            <SopAdminReview
              submissions={submissions}
              jobdesks={jobdesks}
              onVerificationSuccess={handleVerificationSuccess}
              onPreviewPhoto={handlePreviewPhoto}
            />
          )}

          {/* TAB: KELOLA MASTER SOP */}
          {activeTab === 'templates' && (
            <SopMasterManagement
              templates={templates}
              jobdesks={jobdesks}
              onTemplatesChange={(updated) => setTemplates(updated)}
              onJobdesksChange={(updated) => setJobdesks(updated)}
            />
          )}

          {/* TAB: FORMULIR PENGISIAN SOP */}
          {activeTab === 'fill-sop' && (
            <SopChecklistForm
              templates={templates}
              jobdesks={jobdesks}
              userRole={userRole}
              userName={userName}
              todaySubmissions={todaySubmissions}
              onSubmissionSuccess={handleSubmissionSuccess}
              onPreviewPhoto={handlePreviewPhoto}
            />
          )}

          {/* TAB: AUDIT KAS SHIFT */}
          {activeTab === 'shifts' && (
            <div className="space-y-4">
              {/* Filter Kasir Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Filter Kasir:</span>
                  <select
                    value={selectedCashierFilter}
                    onChange={(e) => setSelectedCashierFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-700"
                  >
                    <option value="ALL">Semua Staf Kasir ({uniqueCashiers.length})</option>
                    {uniqueCashiers.map((c) => (
                      <option key={String(c)} value={String(c)}>
                        {String(c)}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  Menampilkan {filteredShifts.length} riwayat shift kasir
                </p>
              </div>

              {/* Tabel Shift */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                        <th className="px-5 py-3">Kasir & Waktu</th>
                        <th className="px-5 py-3">Modal Awal</th>
                        <th className="px-5 py-3">Penerimaan</th>
                        <th className="px-5 py-3">Kas Laci Keluar</th>
                        <th className="px-5 py-3">Ekspektasi Fisik</th>
                        <th className="px-5 py-3">Hitungan Fisik</th>
                        <th className="px-5 py-3">Selisih</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredShifts.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-5 py-8 text-center text-slate-400">
                            Tidak ada riwayat shift yang sesuai filter.
                          </td>
                        </tr>
                      ) : (
                        filteredShifts.map((shift: any) => {
                          const isClosed = Boolean(shift.closedAt);
                          const variance = shift.variance;

                          return (
                            <tr key={shift.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-5 py-3.5">
                                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{shift.cashier?.name || 'Kasir'}</span>
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  {new Date(shift.openedAt).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                              </td>

                              <td className="px-5 py-3.5 font-semibold text-slate-700">
                                Rp {shift.openingCash.toLocaleString('id-ID')}
                              </td>

                              <td className="px-5 py-3.5">
                                <div className="font-semibold text-emerald-600">
                                  +Rp {(shift.cashIn || 0).toLocaleString('id-ID')}{' '}
                                  <span className="text-[10px] text-slate-400 font-normal">(Tunai)</span>
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  QRIS: Rp {(shift.qrisIn || 0).toLocaleString('id-ID')}
                                </div>
                              </td>

                              <td className="px-5 py-3.5 text-slate-600 font-semibold">
                                {shift.cashOut > 0 ? (
                                  <span className="text-rose-600">
                                    -Rp {shift.cashOut.toLocaleString('id-ID')}
                                  </span>
                                ) : (
                                  'Rp 0'
                                )}
                              </td>

                              <td className="px-5 py-3.5 font-bold text-slate-800">
                                Rp {(shift.expectedCash || shift.openingCash).toLocaleString('id-ID')}
                              </td>

                              <td className="px-5 py-3.5 font-bold text-slate-900">
                                {shift.actualCash !== null ? (
                                  `Rp ${shift.actualCash.toLocaleString('id-ID')}`
                                ) : (
                                  <span className="text-slate-400 font-normal italic">Belum Tutup</span>
                                )}
                              </td>

                              <td className="px-5 py-3.5 font-bold">
                                {variance === null ? (
                                  <span className="text-slate-300">-</span>
                                ) : variance === 0 ? (
                                  <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 text-[11px]">
                                    Pas (Rp 0)
                                  </span>
                                ) : variance > 0 ? (
                                  <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 text-[11px]">
                                    +Rp {variance.toLocaleString('id-ID')}
                                  </span>
                                ) : (
                                  <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 text-[11px]">
                                    -Rp {Math.abs(variance).toLocaleString('id-ID')}
                                  </span>
                                )}
                              </td>

                              <td className="px-5 py-3.5">
                                {isClosed ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                    Ditutup
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 animate-pulse">
                                    Shift Aktif
                                  </span>
                                )}
                              </td>

                              <td className="px-5 py-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => setSelectedShiftModal(shift)}
                                  className="px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 font-bold transition-colors text-[11px]"
                                >
                                  Rincian
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: STOCK OPNAME */}
          {activeTab === 'stock' && (
            <div className="space-y-4">
              {/* Search Bar Bahan */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    placeholder="Cari nama bahan baku bar (Matcha, Kopi, Susu, Cup)..."
                    className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-800"
                  />
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  {filteredIngredients.length} bahan baku terdaftar
                </p>
              </div>

              {/* Table Bahan Baku */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                        <th className="px-5 py-3">Nama Bahan Baku</th>
                        <th className="px-5 py-3">Satuan Unit</th>
                        <th className="px-5 py-3">Stok di Sistem</th>
                        <th className="px-5 py-3">Status Stok</th>
                        <th className="px-5 py-3 text-right">Aksi Penyesuaian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredIngredients.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                            Tidak ada bahan baku yang sesuai pencarian.
                          </td>
                        </tr>
                      ) : (
                        filteredIngredients.map((ing: any) => {
                          const isLow = ing.stock <= (ing.minStock || 0);

                          return (
                            <tr key={ing.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-5 py-3.5 font-bold text-slate-800">
                                {ing.name}
                              </td>

                              <td className="px-5 py-3.5 text-slate-500">
                                {ing.unit}
                              </td>

                              <td className="px-5 py-3.5 font-bold text-slate-900">
                                {ing.stock} {ing.unit}
                              </td>

                              <td className="px-5 py-3.5">
                                {isLow ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                                    Hampir Habis
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                    Aman
                                  </span>
                                )}
                              </td>

                              <td className="px-5 py-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => openOpnameModal(ing)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-colors text-[11px] shadow-sm"
                                >
                                  <SlidersHorizontal className="w-3 h-3" />
                                  <span>Hitung Fisik (Opname)</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Riwayat Mutasi Stock Opname */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-orange-500" />
                  Riwayat Penyesuaian & Stock Opname Terakhir
                </h3>

                {movements.length === 0 ? (
                  <p className="text-xs text-slate-400">Belum ada riwayat mutasi stok opname.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {movements.slice(0, 10).map((m: any) => (
                      <div key={m.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-slate-800">
                            {m.ingredient?.name || 'Bahan'}{' '}
                            <span
                              className={`font-bold ml-1 ${
                                m.quantity < 0 ? 'text-rose-600' : 'text-emerald-600'
                              }`}
                            >
                              {m.quantity > 0 ? `+${m.quantity}` : m.quantity} {m.ingredient?.unit}
                            </span>
                          </p>
                          <p className="text-[11px] text-slate-400">{m.reason || 'Mutasi stok'}</p>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(m.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: LOG AUDIT STAF */}
          {activeTab === 'logs' && (
            <div className="space-y-5">
              {/* Filter Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Kategori:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'ALL', label: 'Semua' },
                      { id: 'CHECKLIST', label: 'Checklist & SOP' },
                      { id: 'STOCK', label: 'Stock Opname' },
                      { id: 'ORDER', label: 'Pesanan' },
                      { id: 'USER', label: 'Akun & Staf' },
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        onClick={() => setLogFilter(btn.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          logFilter === btn.id
                            ? 'bg-orange-500 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  {filteredLogs.length} aktivitas staf tercatat
                </p>
              </div>

              {/* Logs Table */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                        <th className="px-5 py-3">Waktu</th>
                        <th className="px-5 py-3">Staf / Eksekutor</th>
                        <th className="px-5 py-3">Tindakan</th>
                        <th className="px-5 py-3">Entitas</th>
                        <th className="px-5 py-3">Rincian Perubahan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLogs.map((log: any) => {
                        let formattedDetails = log.details || '-';
                        try {
                          const parsed = JSON.parse(log.details || '{}');
                          if (parsed.shiftType) {
                            formattedDetails = `Checklist ${parsed.shiftType}: ${parsed.completedItems}/${parsed.totalItems} selesai. ${parsed.notes ? `Catatan: "${parsed.notes}"` : ''}`;
                          } else if (parsed.title) {
                            formattedDetails = `SOP: ${parsed.title} (${parsed.category})`;
                          }
                        } catch {}

                        return (
                          <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap text-[11px]">
                              {new Date(log.createdAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="px-5 py-3.5 font-semibold text-slate-800">
                              {log.user?.name || 'Sistem'}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                                {log.action}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 font-medium text-slate-600">
                              {log.entity}
                            </td>
                            <td className="px-5 py-3.5 text-slate-600 max-w-md break-words">
                              {formattedDetails}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: STOCK OPNAME FISIK                                                */}
      {/* ========================================================================= */}
      {opnameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-orange-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5" />
                <h3 className="font-bold text-sm">Stock Opname: {opnameTarget.name}</h3>
              </div>
              <button
                onClick={() => setOpnameTarget(null)}
                className="p-1 rounded-lg hover:bg-white/20 text-white/80"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitStockOpname} className="p-6 space-y-4">
              {opnameToast && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    opnameToast.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {opnameToast.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                  )}
                  <span>{opnameToast.msg}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between text-xs">
                <span className="text-slate-500">Stok di Sistem:</span>
                <span className="font-bold text-slate-800">
                  {opnameTarget.stock} {opnameTarget.unit}
                </span>
              </div>

              {/* Input Hitungan Fisik */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Jumlah Fisik Aktual ({opnameTarget.unit}):
                </label>
                <input
                  type="number"
                  step="any"
                  value={physicalInput}
                  onChange={(e) => setPhysicalInput(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-800 font-bold"
                />
              </div>

              {/* Kalkulasi Selisih */}
              {physicalInput !== '' && !isNaN(parseFloat(physicalInput)) && (
                <div className="p-3 bg-orange-50/60 rounded-xl border border-orange-100 flex justify-between text-xs font-semibold">
                  <span className="text-slate-600">Selisih Hitungan:</span>
                  {(() => {
                    const diff = Math.round((parseFloat(physicalInput) - opnameTarget.stock) * 100) / 100;
                    if (diff === 0) return <span className="text-emerald-600">Sesuai / Pas (0)</span>;
                    if (diff > 0) return <span className="text-blue-600">Lebih (+{diff} {opnameTarget.unit})</span>;
                    return <span className="text-rose-600">Kurang ({diff} {opnameTarget.unit})</span>;
                  })()}
                </div>
              )}

              {/* Alasan Selisih */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Kategori Alasan Penyesuaian:</label>
                <select
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-700"
                >
                  <option value="ADJUST">Penyesuaian Hitungan Fisik Rutin</option>
                  <option value="WASTE">Tumpah / Kalibrasi Mesin (Waste)</option>
                  <option value="EXPIRED">Bahan Rusak / Kedaluwarsa</option>
                  <option value="STAFF_MEAL">Konsumsi Internal Staf</option>
                </select>
              </div>

              {/* Keterangan */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Keterangan / Catatan Staf:</label>
                <input
                  type="text"
                  value={opnameNotes}
                  onChange={(e) => setOpnameNotes(e.target.value)}
                  placeholder="Misal: Tumpah saat kalibrasi dial-in pagi"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-800"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpnameTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={opnameLoading}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl shadow-sm disabled:opacity-50"
                >
                  {opnameLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Simpan Stock Opname</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETAIL SHIFT & SALIN REKAP                                         */}
      {/* ========================================================================= */}
      {selectedShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-orange-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Rincian Rekap Kas Shift</h3>
                <p className="text-xs text-orange-100">
                  {selectedShiftModal.cashier?.name || 'Kasir'} - Shift #{selectedShiftModal.id.slice(-5)}
                </p>
              </div>
              <button
                onClick={() => setSelectedShiftModal(null)}
                className="p-1 rounded-lg hover:bg-white/20 text-white/80"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Receipt-style summary */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 font-mono space-y-1.5 text-slate-700">
                <div className="text-center font-bold pb-2 border-b border-dashed border-slate-300">
                  ARUM SEDUH - LAPORAN KAS SHIFT
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>KASIR:</span>
                  <span className="font-bold">{selectedShiftModal.cashier?.name?.toUpperCase() || 'KASIR'}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>BUKA:</span>
                  <span>{new Date(selectedShiftModal.openedAt).toLocaleString('id-ID')}</span>
                </div>
                {selectedShiftModal.closedAt && (
                  <div className="flex justify-between text-[11px]">
                    <span>TUTUP:</span>
                    <span>{new Date(selectedShiftModal.closedAt).toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-dashed border-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span>MODAL AWAL:</span>
                    <span>Rp {selectedShiftModal.openingCash.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PENERIMAAN TUNAI (+):</span>
                    <span>Rp {(selectedShiftModal.cashIn || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PENERIMAAN QRIS:</span>
                    <span>Rp {(selectedShiftModal.qrisIn || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PENGELUARAN KAS LACI (-):</span>
                    <span>Rp {(selectedShiftModal.cashOut || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 border-t border-slate-300">
                    <span>EKSPEKTASI KAS FISIK:</span>
                    <span>Rp {(selectedShiftModal.expectedCash || selectedShiftModal.openingCash).toLocaleString('id-ID')}</span>
                  </div>
                  {selectedShiftModal.actualCash !== null && (
                    <>
                      <div className="flex justify-between font-bold text-orange-600">
                        <span>HITUNGAN FISIK KASIR:</span>
                        <span>Rp {selectedShiftModal.actualCash.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between font-bold pt-1 border-t border-dashed border-slate-300">
                        <span>SELISIH KAS:</span>
                        <span
                          className={
                            selectedShiftModal.variance === 0
                              ? 'text-emerald-600'
                              : selectedShiftModal.variance > 0
                              ? 'text-blue-600'
                              : 'text-rose-600'
                          }
                        >
                          {selectedShiftModal.variance === 0
                            ? 'PAS (Rp 0)'
                            : selectedShiftModal.variance > 0
                            ? `+Rp ${selectedShiftModal.variance.toLocaleString('id-ID')} (LEBIH)`
                            : `-Rp ${Math.abs(selectedShiftModal.variance).toLocaleString('id-ID')} (KURANG)`}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {selectedShiftModal.notes && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-slate-700">
                  <span className="font-bold text-amber-800">Catatan Staf:</span>
                  <p className="mt-0.5">{selectedShiftModal.notes}</p>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = `*REKAP KAS SHIFT ARUM SEDUH*\nKasir: ${selectedShiftModal.cashier?.name || 'Kasir'}\nBuka: ${new Date(selectedShiftModal.openedAt).toLocaleString('id-ID')}\nTutup: ${selectedShiftModal.closedAt ? new Date(selectedShiftModal.closedAt).toLocaleString('id-ID') : 'Aktif'}\nModal Awal: Rp ${selectedShiftModal.openingCash.toLocaleString('id-ID')}\nTunai: Rp ${(selectedShiftModal.cashIn || 0).toLocaleString('id-ID')}\nQRIS: Rp ${(selectedShiftModal.qrisIn || 0).toLocaleString('id-ID')}\nKas Kecil: -Rp ${(selectedShiftModal.cashOut || 0).toLocaleString('id-ID')}\nFisik: Rp ${(selectedShiftModal.actualCash || 0).toLocaleString('id-ID')}\nSelisih: Rp ${(selectedShiftModal.variance || 0).toLocaleString('id-ID')}`;
                    navigator.clipboard.writeText(text);
                    showToast('Teks rekap shift berhasil disalin ke clipboard!', 'success');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Salin Teks WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedShiftModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
