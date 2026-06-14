'use client';

import { useState, useRef, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useToast } from '@/components/ui/Toast';
import { 
  Plus, Trash2, Move, Eye, Download, Check, RefreshCw, Layers, Edit2, Maximize2, Users
} from 'lucide-react';

interface DiningTable {
  id: string;
  number: string;
  capacity: number;
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
  
  // Interactive mode
  const [isEditMode, setIsEditMode] = useState(false); // Design Mode vs Monitor Mode
  
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
          x: 50,
          y: 50
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
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Manual status toggling in Monitor Mode
  const handleUpdateStatus = async (status: string) => {
    if (!selectedTableId) return;

    try {
      const res = await fetch(`/api/admin/tables/${selectedTableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah status');

      setTables(prev => prev.map(t => t.id === selectedTableId ? data : t));
      showToast(`Status meja ${data.number} diubah menjadi ${status}`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Drag operations
  const handleStartDrag = (e: React.MouseEvent | React.TouchEvent, tableId: string) => {
    if (!isEditMode) return;
    e.stopPropagation();

    // Prevent scrolling on mobile touch
    if (e.cancelable) e.preventDefault();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragInfo.current = {
      tableId,
      startX: clientX,
      startY: clientY
    };

    setSelectedTableId(tableId);

    // Register document listeners
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

    // Calculate relative percentage coordinates
    let xPercent = ((clientX - canvasRect.left) / canvasRect.width) * 100;
    let yPercent = ((clientY - canvasRect.top) / canvasRect.height) * 100;

    // Constrain position between 0% and 92% to stay in bounds
    xPercent = Math.min(Math.max(0, xPercent), 92);
    yPercent = Math.min(Math.max(0, yPercent), 92);

    // Update local coordinates instantly for smooth rendering
    setTables(prev => prev.map(t => {
      if (t.id === tableId) {
        return { ...t, x: Math.round(xPercent), y: Math.round(yPercent) };
      }
      return t;
    }));
  };

  const handleDragEnd = async () => {
    if (!dragInfo.current) return;
    const { tableId } = dragInfo.current;
    dragInfo.current = null;

    // Unregister document listeners
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchmove', handleDragMove);
    document.removeEventListener('touchend', handleDragEnd);

    // Persist new coordinates
    const finalTable = tables.find(t => t.id === tableId);
    if (!finalTable) return;

    try {
      const res = await fetch(`/api/admin/tables/${tableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          x: finalTable.x,
          y: finalTable.y
        })
      });

      if (!res.ok) throw new Error('Gagal menyimpan posisi');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // QR Code download
  const handleDownloadQR = () => {
    if (!selectedTable) return;
    const qrCanvas = document.getElementById(`qr-canvas-${selectedTable.id}`) as HTMLCanvasElement;
    if (!qrCanvas) return;

    const url = qrCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `QR_Meja_${selectedTable.number}.png`;
    link.href = url;
    link.click();
  };

  // Color map helper
  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'AVAILABLE':
        return {
          bg: 'bg-emerald-500 hover:bg-emerald-600',
          border: 'border-emerald-600',
          text: 'text-emerald-50',
          label: 'Tersedia',
          dot: 'bg-emerald-400'
        };
      case 'OCCUPIED':
        return {
          bg: 'bg-rose-500 hover:bg-rose-600',
          border: 'border-rose-600',
          text: 'text-rose-50',
          label: 'Terisi',
          dot: 'bg-rose-400'
        };
      case 'BILLING':
        return {
          bg: 'bg-amber-500 hover:bg-amber-600',
          border: 'border-amber-600',
          text: 'text-amber-50',
          label: 'Billing',
          dot: 'bg-amber-400'
        };
      case 'CLEANING':
        return {
          bg: 'bg-yellow-400 hover:bg-yellow-500',
          border: 'border-yellow-500',
          text: 'text-yellow-950',
          label: 'Pembersihan',
          dot: 'bg-yellow-600'
        };
      default:
        return {
          bg: 'bg-gray-500 hover:bg-gray-600',
          border: 'border-gray-600',
          text: 'text-gray-50',
          label: 'Unknown',
          dot: 'bg-gray-400'
        };
    }
  };

  // Get dynamic domain or origin
  const getStoreUrl = (tableNum: string) => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/?table=${encodeURIComponent(tableNum)}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* LEFT: Controls & Sidebar */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Toggle Mode */}
        <div className="bg-card rounded-[2rem] border border-border p-4 flex gap-2">
          <button
            onClick={() => { setIsEditMode(false); resetForm(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold transition-all ${
              !isEditMode 
                ? 'bg-primary text-primary-foreground shadow-md' 
                : 'hover:bg-muted text-muted-foreground'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Mode Monitor</span>
          </button>
          <button
            onClick={() => { setIsEditMode(true); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold transition-all ${
              isEditMode 
                ? 'bg-[#B48A5E] text-white shadow-md' 
                : 'hover:bg-muted text-[#B48A5E]'
            }`}
          >
            <Move className="w-4 h-4" />
            <span>Mode Desain</span>
          </button>
        </div>

        {/* Selected Table details */}
        {selectedTable ? (
          <div className="bg-card rounded-[2rem] border border-border p-6 shadow-sm space-y-5 animate-pulse-once">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-serif font-black text-xl text-foreground">Meja {selectedTable.number}</h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Kapasitas: {selectedTable.capacity} Orang</span>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 ${
                getStatusColor(selectedTable.status).text
              } ${getStatusColor(selectedTable.status).bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor(selectedTable.status).dot} animate-pulse`} />
                <span>{getStatusColor(selectedTable.status).label}</span>
              </div>
            </div>

            {/* Quick Status toggle in Monitor Mode */}
            {!isEditMode && (
              <div className="space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ubah Status Meja</span>
                <div className="grid grid-cols-2 gap-2">
                  {['AVAILABLE', 'OCCUPIED', 'BILLING', 'CLEANING'].map((status) => {
                    const isSelected = selectedTable.status === status;
                    const details = getStatusColor(status);
                    return (
                      <button
                        key={status}
                        onClick={() => handleUpdateStatus(status)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                          isSelected 
                            ? 'border-transparent text-white bg-slate-900 shadow-sm' 
                            : 'bg-background hover:bg-muted text-foreground border-border'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${details.dot}`} />
                        <span>{details.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Edit / Delete / QR Code buttons */}
            <div className="border-t border-border pt-5 space-y-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditForm(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold border border-border"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit Meja</span>
                </button>
                <button
                  onClick={handleDeleteTable}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-650 text-xs font-bold border border-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus Meja</span>
                </button>
              </div>

              {/* QR Code generator */}
              <div className="bg-muted/40 rounded-2xl p-4 flex flex-col items-center text-center gap-3">
                <div className="bg-white p-2 rounded-xl border border-border">
                  <QRCodeCanvas
                    id={`qr-canvas-${selectedTable.id}`}
                    value={getStoreUrl(selectedTable.number)}
                    size={130}
                    level="H"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">URL Scan Meja</p>
                  <p className="text-[11px] font-medium text-foreground truncate max-w-[200px]">
                    {getStoreUrl(selectedTable.number)}
                  </p>
                </div>
                <button
                  onClick={handleDownloadQR}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground text-xs font-bold shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh QR Code</span>
                </button>
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-card rounded-[2rem] border border-border p-6 shadow-sm text-center py-10 text-muted-foreground text-sm space-y-2">
            <Move className="w-10 h-10 mx-auto text-muted-foreground/50 animate-bounce" />
            <p className="font-medium">Pilih meja di denah atau buat meja baru</p>
          </div>
        )}

        {/* CRUD Table Form */}
        <div className="bg-card rounded-[2rem] border border-border p-6 shadow-sm space-y-4">
          <h3 className="font-serif font-black text-base text-foreground flex items-center gap-2">
            <Layers className="w-4.5 h-4.5 text-[#B48A5E]" />
            <span>{isEditForm ? 'Edit Detail Meja' : 'Tambah Meja Baru'}</span>
          </h3>

          <form onSubmit={isEditForm ? handleUpdateTable : handleAddTable} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 pl-1">Nomor / Label Meja</label>
              <input
                type="text"
                value={formNumber}
                onChange={e => setFormNumber(e.target.value)}
                placeholder="Contoh: 1, 2A, Outdoor-3"
                className="w-full px-4 py-3 rounded-2xl border border-input bg-background text-sm focus:outline-none focus:border-[#B48A5E]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 pl-1">Kapasitas (Orang)</label>
                <input
                  type="number"
                  value={formCapacity}
                  onChange={e => setFormCapacity(parseInt(e.target.value) || 2)}
                  min={1}
                  max={20}
                  className="w-full px-4 py-3 rounded-2xl border border-input bg-background text-sm focus:outline-none focus:border-[#B48A5E]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 pl-1">Bentuk Meja</label>
                <select
                  value={formShape}
                  onChange={e => setFormShape(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-input bg-background text-sm focus:outline-none focus:border-[#B48A5E]"
                >
                  <option value="RECTANGLE">Persegi</option>
                  <option value="ROUND">Bulat</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-[#B48A5E] to-[#946F48] text-white font-bold text-xs shadow-md"
              >
                {isEditForm ? 'Simpan Perubahan' : 'Tambah Meja'}
              </button>
              {isEditForm && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-3.5 rounded-2xl bg-muted text-foreground font-bold text-xs"
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        </div>

      </div>

      {/* RIGHT: Interative Floor Plan Grid */}
      <div className="lg:col-span-8 space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-black uppercase tracking-widest text-[#B48A5E]">Floor Plan Canvas</span>
          </div>
          <button
            onClick={fetchTables}
            className="text-xs font-black uppercase text-muted-foreground flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Floor plan container */}
        <div
          ref={canvasRef}
          style={{
            backgroundImage: `radial-gradient(rgba(56, 189, 248, 0.1) 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }}
          className="relative w-full aspect-[4/3] rounded-[2.5rem] bg-slate-950 border-[3px] border-slate-900 shadow-2xl overflow-hidden min-h-[400px] select-none"
        >
          {/* Blueprint overlay label */}
          <div className="absolute top-4 left-6 text-slate-800 text-[10px] font-mono tracking-widest uppercase pointer-events-none select-none">
            [Matchaboy HQ Blueprint Grid Scale 1:20]
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
                  touchAction: 'none'
                }}
                className={`absolute transition-transform select-none ${
                  isRound 
                    ? 'w-16 h-16 rounded-full' 
                    : 'w-24 h-16 rounded-2xl'
                } flex flex-col items-center justify-center border-2 shadow-lg cursor-grab active:cursor-grabbing ${
                  isSelected 
                    ? 'ring-4 ring-amber-400 scale-[1.03]' 
                    : 'scale-100'
                } ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}
              >
                
                {/* Table Number */}
                <span className="font-serif font-black text-sm tracking-tight">
                  T-{table.number}
                </span>

                {/* Capacity */}
                <span className="text-[9px] opacity-80 mt-0.5 leading-none">
                  👤 {table.capacity}
                </span>

                {/* Drag Indicator Overlay */}
                {isEditMode && (
                  <div className="absolute top-1 right-1 opacity-70">
                    <Move className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}

          {tables.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-center text-slate-700 font-mono text-sm leading-relaxed p-6 pointer-events-none">
              [Canvas Kosong. Tambah meja di panel kiri dan seret posisinya.]
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
