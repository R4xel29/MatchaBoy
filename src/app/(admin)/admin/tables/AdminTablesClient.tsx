'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useToast } from '@/components/ui/Toast';
import { 
  Plus, Trash2, Move, Eye, Download, Check, RefreshCw, Layers, Edit2, Maximize2, Users, Armchair, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DiningTable {
  id: string;
  number: string;
  capacity: number;
  occupiedSeats: number;
  status: string; // AVAILABLE, OCCUPIED, BILLING, CLEANING
  shape: string;  // RECTANGLE, ROUND
  x: number;
  y: number;
  qrUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function AdminTablesClient({ initialTables }: { initialTables: DiningTable[] }) {
  const { showToast } = useToast();
  const [tables, setTables] = useState<DiningTable[]>(initialTables);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  
  // CRUD form states
  const [isEditForm, setIsEditForm] = useState(false);
  const [formNumber, setFormNumber] = useState('');
  const [formCapacity, setFormCapacity] = useState(2);
  const [formShape, setFormShape] = useState('RECTANGLE');
  const [formStatus, setFormStatus] = useState('AVAILABLE');
  
  // Interactive mode: Design Mode (Drag) vs Monitor Mode (Live Status)
  const [isEditMode, setIsEditMode] = useState(false);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragInfo = useRef<{ tableId: string; startX: number; startY: number } | null>(null);

  const selectedTable = tables.find(t => t.id === selectedTableId);

  // Initialize form when table selection changes
  useEffect(() => {
    if (selectedTable) {
      setFormNumber(selectedTable.number);
      setFormCapacity(selectedTable.capacity);
      setFormShape(selectedTable.shape);
      setFormStatus(selectedTable.status);
    } else {
      resetForm();
    }
  }, [selectedTableId]);

  const resetForm = () => {
    setFormNumber('');
    setFormCapacity(2);
    setFormShape('RECTANGLE');
    setFormStatus('AVAILABLE');
    setIsEditForm(false);
  };

  const fetchTables = async () => {
    try {
      const res = await fetch('/api/admin/tables');
      if (res.ok) {
        const data = await res.json();
        setTables(data);
      }
    } catch (err) {
      console.error('Error fetching tables:', err);
    }
  };

  // Add a new table
  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNumber.trim()) {
      showToast('Nomor meja wajib diisi', 'error');
      return;
    }

    try {
      const res = await fetch('/api/admin/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: formNumber,
          capacity: formCapacity,
          shape: formShape,
          x: 45,
          y: 45
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menambahkan meja');

      showToast(`Meja ${formNumber} berhasil ditambahkan`, 'success');
      setTables(prev => [...prev, data]);
      setSelectedTableId(data.id);
      resetForm();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Update table info
  const handleUpdateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTableId || !formNumber.trim()) return;

    try {
      const res = await fetch(`/api/admin/tables/${selectedTableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: formNumber,
          capacity: formCapacity,
          shape: formShape,
          status: formStatus
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui meja');

      showToast('Meja berhasil diperbarui', 'success');
      setTables(prev => prev.map(t => t.id === selectedTableId ? data : t));
      setIsEditForm(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Delete table
  const handleDeleteTable = async () => {
    if (!selectedTableId) return;
    if (!confirm('Apakah Anda yakin ingin menghapus meja ini?')) return;

    try {
      const res = await fetch(`/api/admin/tables/${selectedTableId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menghapus meja');
      }

      showToast('Meja berhasil dihapus', 'success');
      setTables(prev => prev.filter(t => t.id !== selectedTableId));
      setSelectedTableId(null);
      resetForm();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Update status quick toggle
  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedTableId) return;
    try {
      const res = await fetch(`/api/admin/tables/${selectedTableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error('Gagal mengubah status');
      setTables(prev => prev.map(t => t.id === selectedTableId ? { ...t, status: newStatus } : t));
      showToast(`Status diubah ke ${newStatus}`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Save table position
  const saveTablePosition = async (tableId: string, x: number, y: number) => {
    try {
      await fetch(`/api/admin/tables/${tableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x: Math.round(x), y: Math.round(y) })
      });
    } catch (err) {
      console.error('Failed to save table coordinates:', err);
    }
  };

  // Drag handlers
  const handleStartDrag = (e: React.MouseEvent | React.TouchEvent, tableId: string) => {
    if (!isEditMode) {
      setSelectedTableId(tableId);
      return;
    }
    e.stopPropagation();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragInfo.current = {
      tableId,
      startX: clientX,
      startY: clientY
    };

    setSelectedTableId(tableId);

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);
  };

  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    if (!dragInfo.current || !canvasRef.current) return;

    const { tableId } = dragInfo.current;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const canvasRect = canvasRef.current.getBoundingClientRect();

    let xPercent = ((clientX - canvasRect.left) / canvasRect.width) * 100;
    let yPercent = ((clientY - canvasRect.top) / canvasRect.height) * 100;

    xPercent = Math.min(Math.max(5, xPercent), 90);
    yPercent = Math.min(Math.max(5, yPercent), 90);

    setTables(prev => prev.map(t => t.id === tableId ? { ...t, x: xPercent, y: yPercent } : t));
  };

  const handleDragEnd = () => {
    if (dragInfo.current) {
      const current = tables.find(t => t.id === dragInfo.current?.tableId);
      if (current) {
        saveTablePosition(current.id, current.x, current.y);
      }
    }
    dragInfo.current = null;
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchmove', handleDragMove);
    document.removeEventListener('touchend', handleDragEnd);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OCCUPIED':
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500',
          text: 'text-blue-700',
          label: 'Terisi',
          dot: 'bg-blue-500'
        };
      case 'BILLING':
        return {
          bg: 'bg-amber-500/10',
          border: 'border-amber-500',
          text: 'text-amber-700',
          label: 'Billing',
          dot: 'bg-amber-500'
        };
      case 'CLEANING':
        return {
          bg: 'bg-stone-500/10',
          border: 'border-stone-400',
          text: 'text-stone-700',
          label: 'Pembersihan',
          dot: 'bg-stone-400'
        };
      default:
        return {
          bg: 'bg-orange-500/10',
          border: 'border-emerald-600',
          text: 'text-orange-700',
          label: 'Tersedia',
          dot: 'bg-orange-500'
        };
    }
  };

  const getStoreUrl = (tableNum: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/spmb?table=${tableNum}`;
    }
    return `https://arum-seduh.com/spmb?table=${tableNum}`;
  };

  const handleDownloadQR = () => {
    if (!selectedTable) return;
    try {
      const canvas = document.getElementById(`qr-canvas-${selectedTable.id}`) as HTMLCanvasElement;
      if (!canvas) return;
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `QR_Meja_${selectedTable.number}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`QR Code Meja ${selectedTable.number} berhasil diunduh`, 'success');
    } catch (e) {
      showToast('Gagal mengunduh QR Code', 'error');
    }
  };

  // Stats
  const totalTables = tables.length;
  const occupiedCount = tables.filter(t => t.status === 'OCCUPIED').length;
  const totalCapacity = tables.reduce((sum, t) => sum + (t.capacity || 0), 0);
  const occupancyPercent = totalTables > 0 ? Math.round((occupiedCount / totalTables) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1C1917] p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Header & Stats Banner */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F97316]/10 text-[#F97316] text-[11px] font-bold tracking-wide">
            <Layers className="w-3.5 h-3.5" />
            <span>Dine-In Management</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 mt-1">
            Denah Tata Letak Meja & Kursi
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Atur tata letak meja visual, unduh QR code meja, dan pantau status meja realtime
          </p>
        </div>

        {/* Mode Toggle: Design Mode vs Live Monitor */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm ${
              isEditMode
                ? 'bg-amber-600 text-white ring-2 ring-amber-400/50'
                : 'bg-[#F97316] text-white hover:bg-[#EA580C]'
            }`}
          >
            <Move className="w-4 h-4" />
            <span>{isEditMode ? 'Mode Geser Meja (ON)' : 'Ubah Posisi Meja'}</span>
          </button>
        </div>
      </div>

      {/* Live Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Total Meja</p>
          <p className="font-serif text-2xl font-bold text-stone-900 mt-1">{totalTables}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Meja Terisi</p>
          <p className="font-serif text-2xl font-bold text-blue-700 mt-1">{occupiedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Total Kapasitas</p>
          <p className="font-serif text-2xl font-bold text-orange-700 mt-1">{totalCapacity} Kursi</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Okupansi Meja</p>
          <p className="font-serif text-2xl font-bold text-[#F97316] mt-1">{occupancyPercent}%</p>
        </div>
      </div>

      {/* Main Grid: Left Editor Panel & Right Floor Plan Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Table Details & Actions */}
        <div className="lg:col-span-4 space-y-4">
          {selectedTable ? (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-5 text-left"
            >
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <div>
                  <h3 className="font-serif font-bold text-xl text-stone-900">
                    Meja {selectedTable.number}
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Kapasitas {selectedTable.capacity} Kursi • {selectedTable.shape === 'ROUND' ? 'Meja Bulat' : 'Meja Persegi'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTableId(null)}
                  className="text-stone-400 hover:text-stone-600 text-xs font-bold"
                >
                  Tutup
                </button>
              </div>

              {/* Status Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Status Meja
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['AVAILABLE', 'OCCUPIED', 'BILLING', 'CLEANING'].map((st) => {
                    const isSelected = selectedTable.status === st;
                    const stColor = getStatusColor(st);
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleUpdateStatus(st)}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#F97316] text-white border-[#F97316] shadow-sm'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:border-stone-400'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : stColor.dot}`} />
                        <span>{stColor.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* QR Code & Direct Link */}
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-stone-200 flex flex-col items-center text-center space-y-3">
                <div className="bg-white p-2 rounded-2xl border border-stone-200 shadow-sm">
                  <QRCodeCanvas
                    id={`qr-canvas-${selectedTable.id}`}
                    value={getStoreUrl(selectedTable.number)}
                    size={140}
                    level="H"
                  />
                </div>
                <div className="space-y-0.5 w-full">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">URL QR Code Meja</p>
                  <p className="text-xs font-mono font-bold text-[#F97316] truncate max-w-full">
                    {getStoreUrl(selectedTable.number)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadQR}
                  className="w-full py-2.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> Unduh QR Meja
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsEditForm(true)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-50 cursor-pointer"
                >
                  Edit Meja
                </button>
                <button
                  type="button"
                  onClick={handleDeleteTable}
                  className="px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm text-center space-y-3">
              <Armchair className="w-10 h-10 text-stone-300 mx-auto" />
              <h3 className="font-serif font-bold text-base text-stone-800">Pilih Meja di Denah</h3>
              <p className="text-xs text-stone-400">
                Klik salah satu meja di denah untuk melihat status, mengunduh QR, atau mengubah informasi meja.
              </p>
            </div>
          )}

          {/* Form Tambah / Edit Meja */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4 text-left">
            <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#F97316]" />
              <span>{isEditForm ? 'Edit Detail Meja' : 'Tambah Meja Baru'}</span>
            </h3>

            <form onSubmit={isEditForm ? handleUpdateTable : handleAddTable} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                  Nomor / Label Meja
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 1, 2A, Outdoor-1"
                  required
                  value={formNumber}
                  onChange={(e) => setFormNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200 bg-[#FAF7F2]/40 focus:outline-none focus:border-[#F97316]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Kapasitas Kursi
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(parseInt(e.target.value) || 2)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200 bg-[#FAF7F2]/40 focus:outline-none focus:border-[#F97316]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Bentuk Meja
                  </label>
                  <select
                    value={formShape}
                    onChange={(e) => setFormShape(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200 bg-[#FAF7F2]/40 focus:outline-none focus:border-[#F97316]"
                  >
                    <option value="RECTANGLE">Persegi</option>
                    <option value="ROUND">Bulat</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  {isEditForm ? 'Simpan Perubahan' : 'Tambah Meja'}
                </button>
                {isEditForm && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-3 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-50 cursor-pointer"
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Right Side: Visual Floor Plan Canvas */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#F97316]">
                Arum Seduh Cafe Blueprint Canvas
              </span>
            </div>

            <button
              onClick={fetchTables}
              className="text-xs font-bold text-stone-500 hover:text-stone-900 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Segarkan Denah
            </button>
          </div>

          {/* Architectural Canvas */}
          <div
            ref={canvasRef}
            className="relative w-full aspect-[4/3] rounded-3xl bg-[#FAF7F2] border-2 border-stone-300 shadow-xl overflow-hidden min-h-[460px] select-none"
            style={{
              backgroundImage: 'radial-gradient(#F97316 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          >
            {/* Blueprint Grid Overlay */}
            <div className="absolute top-4 left-6 text-stone-400 text-[10px] font-mono tracking-widest uppercase pointer-events-none select-none">
              [Scale 1:25 • Arum Seduh Indoor Cafe]
            </div>

            {tables.map((table) => {
              const isSelected = selectedTableId === table.id;
              const statusStyle = getStatusColor(table.status);
              const isRound = table.shape === 'ROUND';

              return (
                <div
                  key={table.id}
                  onMouseDown={(e) => handleStartDrag(e, table.id)}
                  onTouchStart={(e) => handleStartDrag(e, table.id)}
                  style={{
                    left: `${table.x}%`,
                    top: `${table.y}%`,
                    transform: 'translate(-50%, -50%)',
                    touchAction: 'none'
                  }}
                  className={`absolute transition-transform select-none cursor-pointer ${
                    isRound 
                      ? 'w-20 h-20 rounded-full' 
                      : 'w-28 h-20 rounded-2xl'
                  } flex flex-col items-center justify-center border-2 shadow-md ${
                    isSelected 
                      ? 'ring-4 ring-[#F97316] shadow-xl scale-110 z-30 bg-[#F97316] text-white border-[#F97316]' 
                      : `${statusStyle.bg} ${statusStyle.border} ${statusStyle.text} bg-white hover:scale-105 z-10`
                  }`}
                >
                  <span className="font-serif font-bold text-xs sm:text-sm">
                    Meja {table.number}
                  </span>
                  <span className={`text-[9px] font-semibold mt-0.5 ${isSelected ? 'text-emerald-200' : 'opacity-70'}`}>
                    {table.capacity} Kursi
                  </span>

                  {/* Move Icon indicator when in Edit Mode */}
                  {isEditMode && (
                    <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow">
                      <Move className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>
              );
            })}

            {tables.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-center text-stone-400 font-mono text-xs p-6 pointer-events-none">
                [Denah Kosong. Tambah meja melalui panel di sebelah kiri.]
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
