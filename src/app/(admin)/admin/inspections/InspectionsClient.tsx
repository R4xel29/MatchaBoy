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
  X
} from 'lucide-react';

interface InspectionsClientProps {
  userRole: string;
  userName: string;
  initialShifts: any[];
  initialIngredients: any[];
  initialMovements: any[];
  initialLogs: any[];
  initialTodayChecklists: any[];
}

const OPENING_ITEMS = [
  { id: 'op-1', label: 'Kebersihan area meja bar, lantai outlet, dan meja kursi pelanggan' },
  { id: 'op-2', label: 'Nyalakan mesin espresso, grinder, dan water boiler (pastikan tekanan & suhu stabil)' },
  { id: 'op-3', label: 'Periksa stok es batu kristal dan pastikan suhu chiller/kulkas susu di bawah 4°C' },
  { id: 'op-4', label: 'Hitung dan pastikan uang modal awal kembalian di laci kasir sudah sesuai' },
  { id: 'op-5', label: 'Nyalakan tablet kasir POS, koneksikan printer struk Bluetooth, dan buka shift kasir' },
  { id: 'op-6', label: 'Cek kesiapan cup (12oz/16oz), tutup, sedotan, tisu, dan kantong take-away' },
];

const CLOSING_ITEMS = [
  { id: 'cl-1', label: 'Backflush dan cuci portafilter mesin espresso menggunakan chemical cleaner' },
  { id: 'cl-2', label: 'Bersihkan kerak susu pada steam wand dan lap kering menggunakan kain microfiber' },
  { id: 'cl-3', label: 'Kosongkan hopper grinder dan simpan sisa biji kopi ke dalam wadah kedap udara' },
  { id: 'cl-4', label: 'Buang ampas kopi knockbox dan bersihkan semua tempat sampah ke pembuangan luar' },
  { id: 'cl-5', label: 'Simpan seluruh susu terbuka, saus, dan sirup ke dalam kulkas yang tertutup rapat' },
  { id: 'cl-6', label: 'Tutup shift di kasir POS, hitung uang fisik di laci kasir, dan amankan uang setoran' },
  { id: 'cl-7', label: 'Matikan mesin espresso, pendingin ruangan (AC), sound system BGM, dan lampu non-keamanan' },
  { id: 'cl-8', label: 'Kunci seluruh pintu kaca dan pasang gembok pengaman / rolling door outlet' },
];

export default function InspectionsClient({
  userRole,
  userName,
  initialShifts,
  initialIngredients,
  initialMovements,
  initialLogs,
  initialTodayChecklists,
}: InspectionsClientProps) {
  const [activeTab, setActiveTab] = useState<'shifts' | 'stock' | 'checklist' | 'logs'>('shifts');

  // --- STATE SHIFTS ---
  const [shifts, setShifts] = useState(initialShifts);
  const [selectedCashierFilter, setSelectedCashierFilter] = useState<string>('ALL');
  const [selectedShiftModal, setSelectedShiftModal] = useState<any | null>(null);

  // --- STATE STOCK OPNAME ---
  const [ingredients, setIngredients] = useState(initialIngredients);
  const [movements, setMovements] = useState(initialMovements);
  const [stockSearch, setStockSearch] = useState('');
  const [opnameTarget, setOpnameTarget] = useState<any | null>(null);
  const [physicalInput, setPhysicalInput] = useState<string>('');
  const [reasonCategory, setReasonCategory] = useState<string>('ADJUST');
  const [opnameNotes, setOpnameNotes] = useState<string>('');
  const [opnameLoading, setOpnameLoading] = useState(false);
  const [opnameToast, setOpnameToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // --- STATE CHECKLIST SOP ---
  const [checklistType, setChecklistType] = useState<'OPENING' | 'CLOSING'>('OPENING');
  const [todayChecklists, setTodayChecklists] = useState(initialTodayChecklists);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [checklistNotes, setChecklistNotes] = useState('');
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [checklistToast, setChecklistToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // --- STATE LOGS ---
  const [logFilter, setLogFilter] = useState<string>('ALL');

  // Filter shifts
  const uniqueCashiers = Array.from(
    new Set(shifts.map((s) => s.cashier?.name || 'Kasir').filter(Boolean))
  );

  const filteredShifts = shifts.filter((s) => {
    if (selectedCashierFilter === 'ALL') return true;
    return (s.cashier?.name || 'Kasir') === selectedCashierFilter;
  });

  // Filter ingredients
  const filteredIngredients = ingredients.filter((ing) =>
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

      // Update local state
      setIngredients((prev) =>
        prev.map((i) => (i.id === opnameTarget.id ? { ...i, stock: parsed } : i))
      );

      if (d.data?.movement) {
        setMovements((prev) => [
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

  // Handle Checklist Toggle
  const toggleChecklistItem = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const currentChecklistTemplate = checklistType === 'OPENING' ? OPENING_ITEMS : CLOSING_ITEMS;
  const currentCheckedCount = currentChecklistTemplate.filter((i) => checkedItems[i.id]).length;
  const progressPercent = Math.round((currentCheckedCount / currentChecklistTemplate.length) * 100);

  const todayOpeningSubmitted = todayChecklists.find((l) => l.entity === 'CHECKLIST_OPENING');
  const todayClosingSubmitted = todayChecklists.find((l) => l.entity === 'CHECKLIST_CLOSING');

  const submitChecklist = async () => {
    setChecklistLoading(true);
    setChecklistToast(null);

    const itemsPayload = currentChecklistTemplate.map((i) => ({
      id: i.id,
      label: i.label,
      checked: Boolean(checkedItems[i.id]),
    }));

    try {
      const res = await fetch('/api/admin/inspections/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: checklistType,
          items: itemsPayload,
          notes: checklistNotes,
        }),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Gagal menyimpan checklist');

      setTodayChecklists((prev) => [d.log, ...prev]);
      setChecklistToast({ msg: d.message || 'Laporan SOP berhasil dikirim!', type: 'success' });
      setCheckedItems({});
      setChecklistNotes('');
    } catch (err: any) {
      setChecklistToast({ msg: err.message || 'Gagal mengirim checklist', type: 'error' });
    } finally {
      setChecklistLoading(false);
    }
  };

  // Filter Logs
  const filteredLogs = initialLogs.filter((log) => {
    if (logFilter === 'ALL') return true;
    if (logFilter === 'ORDER') return log.entity === 'ORDER';
    if (logFilter === 'STOCK') return log.action === 'STOCK_OPNAME' || log.entity === 'INGREDIENT';
    if (logFilter === 'CHECKLIST') return log.entity.startsWith('CHECKLIST');
    if (logFilter === 'USER') return log.entity === 'USER';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold mb-3">
            <ClipboardCheck className="w-3.5 h-3.5" />
            Pusat Pengawasan Operasional Arum Seduh
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Audit & Pengecekan Toko</h1>
          <p className="text-orange-100 text-sm mt-1 max-w-2xl">
            Pantau rekonsiliasi kas shift karyawan, stock opname bahan baku bar, checklist SOP buka & tutup outlet, dan log aktivitas staf secara real-time.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 opacity-10 pointer-events-none">
          <Coffee className="w-72 h-72 text-white" />
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
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
          onClick={() => setActiveTab('checklist')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
            activeTab === 'checklist'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ListChecks className="w-4 h-4" />
          <span>Checklist SOP Outlet</span>
          {(todayOpeningSubmitted && todayClosingSubmitted) ? (
            <span className="ml-1 w-2 h-2 rounded-full bg-emerald-300"></span>
          ) : (
            <span className="ml-1 w-2 h-2 rounded-full bg-amber-300"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
            activeTab === 'logs'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Log Audit Staf</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: AUDIT KAS SHIFT                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'shifts' && (
        <div className="space-y-5">
          {/* Controls & Filter */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-500">Filter Kasir:</span>
              <select
                value={selectedCashierFilter}
                onChange={(e) => setSelectedCashierFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              >
                <option value="ALL">Semua Staf ({shifts.length})</option>
                {uniqueCashiers.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-400">
              Menampilkan {filteredShifts.length} riwayat shift kasir terbaru
            </p>
          </div>

          {/* Shifts Grid */}
          {filteredShifts.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-400">
              <Coins className="w-12 h-12 mx-auto mb-2 opacity-30 text-orange-500" />
              <p className="text-sm font-medium">Belum ada riwayat shift kasir yang tercatat</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredShifts.map((shift) => {
                const isActive = !shift.closedAt;
                const cashierName = shift.cashier?.name || 'Kasir';
                const variance = shift.variance;

                return (
                  <div
                    key={shift.id}
                    className={`bg-white rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md flex flex-col justify-between ${
                      isActive ? 'border-emerald-300 ring-1 ring-emerald-100' : 'border-slate-200/80'
                    }`}
                  >
                    <div>
                      {/* Top status */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs">
                            {cashierName[0]?.toUpperCase() || 'K'}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 leading-tight">{cashierName}</p>
                            <p className="text-[10px] text-slate-400">Shift #{shift.id.slice(-5)}</p>
                          </div>
                        </div>
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Sedang Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                            Selesai
                          </span>
                        )}
                      </div>

                      {/* Time Details */}
                      <div className="space-y-1 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3">
                        <div className="flex justify-between">
                          <span>Buka Shift:</span>
                          <span className="font-semibold text-slate-700">
                            {new Date(shift.openedAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {shift.closedAt && (
                          <div className="flex justify-between">
                            <span>Tutup Shift:</span>
                            <span className="font-semibold text-slate-700">
                              {new Date(shift.closedAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Financial Metrics */}
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>Modal Awal Kasir:</span>
                          <span className="font-semibold text-slate-800">
                            Rp {shift.openingCash.toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Penerimaan Tunai:</span>
                          <span className="font-semibold text-emerald-600">
                            +Rp {(shift.cashIn || 0).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Penerimaan QRIS:</span>
                          <span className="font-semibold text-blue-600">
                            Rp {(shift.qrisIn || 0).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Pengeluaran Kas Laci:</span>
                          <span className="font-semibold text-rose-600">
                            -Rp {(shift.cashOut || 0).toLocaleString('id-ID')}
                          </span>
                        </div>

                        {shift.closedAt && (
                          <div className="pt-2 border-t border-slate-100 mt-2 space-y-1">
                            <div className="flex justify-between font-bold text-slate-800">
                              <span>Uang Fisik Dihitung:</span>
                              <span className="text-orange-600">
                                Rp {(shift.actualCash || 0).toLocaleString('id-ID')}
                              </span>
                            </div>

                            {/* Status Selisih Kas */}
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[11px] font-medium text-slate-500">Hasil Selisih:</span>
                              {variance === null ? (
                                <span className="text-xs text-slate-400">-</span>
                              ) : variance === 0 ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Pas (Rp 0)
                                </span>
                              ) : variance > 0 ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                  <ArrowUpRight className="w-3.5 h-3.5" /> Lebih +Rp {variance.toLocaleString('id-ID')}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                                  <ArrowDownRight className="w-3.5 h-3.5" /> Kurang -Rp {Math.abs(variance).toLocaleString('id-ID')}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {shift.notes && (
                        <p className="mt-3 text-[11px] text-slate-500 italic bg-amber-50/60 p-2 rounded-lg border border-amber-100">
                          &quot;{shift.notes}&quot;
                        </p>
                      )}
                    </div>

                    {/* Bottom Action */}
                    <div className="pt-4 mt-4 border-t border-slate-100">
                      <button
                        onClick={() => setSelectedShiftModal(shift)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors border border-slate-200/80"
                      >
                        <FileText className="w-3.5 h-3.5 text-orange-500" />
                        <span>Rincian & Cetak Rekap</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STOCK OPNAME BAR                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'stock' && (
        <div className="space-y-5">
          {/* Top Info & Search */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                placeholder="Cari bahan baku / kemasan..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-700"
              />
            </div>
            <p className="text-xs text-slate-500">
              Pencocokan stok fisik harian meja bar & gudang Arum Seduh
            </p>
          </div>

          {/* Ingredients Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-5 py-3">Nama Bahan Baku</th>
                    <th className="px-5 py-3">Kategori</th>
                    <th className="px-5 py-3 text-right">Stok Sistem Saat Ini</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-right">Aksi Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredIngredients.map((ing) => {
                    const isLow = ing.stock <= 5;
                    const isOut = ing.stock <= 0;

                    return (
                      <tr key={ing.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-slate-800">
                          {ing.name}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">
                          {ing.isPackaging ? 'Kemasan / Packaging' : 'Bahan Baku Racikan'}
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-slate-800">
                          {ing.stock} <span className="text-slate-400 font-normal">{ing.unit}</span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {isOut ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                              Habis
                            </span>
                          ) : isLow ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                              Menipis
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                              Tersedia
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => openOpnameModal(ing)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 font-semibold text-xs border border-orange-200 transition-colors"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>Audit Fisik</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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

      {/* ========================================================================= */}
      {/* TAB 3: CHECKLIST SOP OUTLET                                              */}
      {/* ========================================================================= */}
      {activeTab === 'checklist' && (
        <div className="space-y-6">
          {/* Status Cards Hari Ini */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className={`p-5 rounded-2xl border shadow-sm ${
                todayOpeningSubmitted
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : 'bg-amber-50/50 border-amber-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700">Checklist Buka Toko (Opening)</span>
                {todayOpeningSubmitted ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Sudah Terkirim
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-3 h-3" /> Belum Diisi Hari Ini
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600">
                {todayOpeningSubmitted
                  ? `Dikerjakan oleh ${todayOpeningSubmitted.user?.name || 'Staf'} pada ${new Date(
                      todayOpeningSubmitted.createdAt
                    ).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Wajib diisi oleh staf yang membuka outlet di pagi hari sebelum order dibuka.'}
              </p>
            </div>

            <div
              className={`p-5 rounded-2xl border shadow-sm ${
                todayClosingSubmitted
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700">Checklist Tutup Toko (Closing)</span>
                {todayClosingSubmitted ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Sudah Terkirim
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
                    Menunggu Jam Tutup
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600">
                {todayClosingSubmitted
                  ? `Dikerjakan oleh ${todayClosingSubmitted.user?.name || 'Staf'} pada ${new Date(
                      todayClosingSubmitted.createdAt
                    ).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Wajib diisi oleh staf penutup sebelum mengunci gerbang outlet.'}
              </p>
            </div>
          </div>

          {/* Form Checklist Interaktif */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-5">
            {/* Mode Switcher */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">
                  Formulir SOP Pengecekan Harian
                </h3>
                <p className="text-xs text-slate-500">Pilih jenis shift yang sedang Anda jalankan</p>
              </div>

              <div className="inline-flex p-1 rounded-xl bg-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setChecklistType('OPENING');
                    setCheckedItems({});
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    checklistType === 'OPENING'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Buka Toko
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChecklistType('CLOSING');
                    setCheckedItems({});
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    checklistType === 'CLOSING'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Tutup Toko
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <span>Kelengkapan Pengecekan:</span>
                <span className={progressPercent === 100 ? 'text-emerald-600 font-bold' : 'text-orange-600 font-bold'}>
                  {currentCheckedCount} dari {currentChecklistTemplate.length} item ({progressPercent}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    progressPercent === 100
                      ? 'bg-emerald-500'
                      : 'bg-gradient-to-r from-orange-500 to-amber-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Toast Notice */}
            {checklistToast && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                  checklistToast.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    : 'bg-rose-50 border border-rose-200 text-rose-700'
                }`}
              >
                {checklistToast.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{checklistToast.msg}</span>
              </div>
            )}

            {/* Checklist Items */}
            <div className="space-y-2.5 pt-2">
              {currentChecklistTemplate.map((item) => {
                const isChecked = Boolean(checkedItems[item.id]);

                return (
                  <div
                    key={item.id}
                    onClick={() => toggleChecklistItem(item.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                      isChecked
                        ? 'bg-orange-50/50 border-orange-300 ring-1 ring-orange-200'
                        : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors shrink-0 mt-0.5 ${
                        isChecked ? 'bg-orange-500 text-white' : 'border border-slate-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <span
                      className={`text-xs font-medium leading-relaxed ${
                        isChecked ? 'text-slate-900 font-semibold' : 'text-slate-600'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Catatan Tambahan */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-semibold text-slate-700">
                Catatan / Kendala Operasional (Opsional):
              </label>
              <textarea
                value={checklistNotes}
                onChange={(e) => setChecklistNotes(e.target.value)}
                placeholder="Contoh: Es batu kristal tersisa 1 karung, grinder sudah dikalibrasi rasio 1:2, stop kontak aman..."
                rows={2}
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-800 placeholder:text-slate-400"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={submitChecklist}
                disabled={checklistLoading}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-sm hover:shadow transition-all disabled:opacity-50"
              >
                {checklistLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mengirim Laporan...</span>
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="w-4 h-4" />
                    <span>Kirim Laporan Pengecekan SOP</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: LOG AUDIT STAF                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'logs' && (
        <div className="space-y-5">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Kategori:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'ALL', label: 'Semua' },
                  { id: 'CHECKLIST', label: 'Checklist SOP' },
                  { id: 'STOCK', label: 'Stock Opname' },
                  { id: 'ORDER', label: 'Pesanan / Void' },
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
                  {filteredLogs.map((log) => {
                    let formattedDetails = log.details || '-';
                    try {
                      const parsed = JSON.parse(log.details || '{}');
                      if (parsed.shiftType) {
                        formattedDetails = `Checklist ${parsed.shiftType}: ${parsed.completedItems}/${parsed.totalItems} selesai. ${parsed.notes ? `Catatan: "${parsed.notes}"` : ''}`;
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
                    alert('Teks rekap shift berhasil disalin ke clipboard!');
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
