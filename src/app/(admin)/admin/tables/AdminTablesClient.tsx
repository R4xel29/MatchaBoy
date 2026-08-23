'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useToast } from '@/components/ui/Toast';
import { 
  Plus, Trash2, Move, Eye, Download, Check, RefreshCw, Layers, Edit2, Maximize2, 
  Users, Armchair, Sparkles, X, Circle, Square, RotateCw, Settings, UtensilsCrossed,
  ArrowRight, ShieldCheck, CheckCircle2, ChevronRight, Sliders, Compass, LayoutGrid,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TableQrCardModal from './TableQrCardModal';

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

export interface CustomChair {
  id: string;
  label: string;
  x: number; // relative pixel offset from table center
  y: number; // relative pixel offset from table center
}

// Compute default chair coordinates without clipping the table
export const getDefaultChairs = (capacity: number, shape: string): CustomChair[] => {
  const cap = Math.max(1, capacity);
  if (shape === 'ROUND') {
    const radius = 66; // outside 88px circle
    return Array.from({ length: cap }).map((_, idx) => {
      const angle = (idx / cap) * 2 * Math.PI - Math.PI / 2;
      return {
        id: `chair-${idx + 1}`,
        label: (idx + 1).toString(),
        x: Math.round(Math.cos(angle) * radius),
        y: Math.round(Math.sin(angle) * radius)
      };
    });
  } else {
    // RECTANGLE TABLE (table is ~120px wide, ~80px tall)
    // Chairs placed cleanly outside: Top (y=-56), Bottom (y=56), Left (x=-78), Right (x=78)
    if (cap === 2) {
      return [
        { id: 'chair-1', label: '1', x: 0, y: -56 },
        { id: 'chair-2', label: '2', x: 0, y: 56 }
      ];
    } else if (cap === 4) {
      return [
        { id: 'chair-1', label: '1', x: 0, y: -56 },
        { id: 'chair-2', label: '2', x: 78, y: 0 },
        { id: 'chair-3', label: '3', x: 0, y: 56 },
        { id: 'chair-4', label: '4', x: -78, y: 0 }
      ];
    } else if (cap === 6) {
      return [
        { id: 'chair-1', label: '1', x: -32, y: -56 },
        { id: 'chair-2', label: '2', x: 32, y: -56 },
        { id: 'chair-3', label: '3', x: 78, y: 0 },
        { id: 'chair-4', label: '4', x: 32, y: 56 },
        { id: 'chair-5', label: '5', x: -32, y: 56 },
        { id: 'chair-6', label: '6', x: -78, y: 0 }
      ];
    } else if (cap === 8) {
      return [
        { id: 'chair-1', label: '1', x: -40, y: -56 },
        { id: 'chair-2', label: '2', x: 0, y: -56 },
        { id: 'chair-3', label: '3', x: 40, y: -56 },
        { id: 'chair-4', label: '4', x: 78, y: 0 },
        { id: 'chair-5', label: '5', x: 40, y: 56 },
        { id: 'chair-6', label: '6', x: 0, y: 56 },
        { id: 'chair-7', label: '7', x: -40, y: 56 },
        { id: 'chair-8', label: '8', x: -78, y: 0 }
      ];
    } else {
      // General layout
      const topCount = Math.max(1, Math.ceil(cap * 0.35));
      const sideCount = Math.max(1, Math.floor((cap - topCount * 2) / 2));
      const list: CustomChair[] = [];
      let cIdx = 1;

      // Top row
      for (let i = 0; i < topCount && cIdx <= cap; i++) {
        const xOffset = topCount === 1 ? 0 : -45 + (90 / (topCount - 1)) * i;
        list.push({ id: `chair-${cIdx}`, label: cIdx.toString(), x: Math.round(xOffset), y: -56 });
        cIdx++;
      }
      // Right col
      for (let i = 0; i < sideCount && cIdx <= cap; i++) {
        const yOffset = sideCount === 1 ? 0 : -20 + (40 / (sideCount - 1)) * i;
        list.push({ id: `chair-${cIdx}`, label: cIdx.toString(), x: 78, y: Math.round(yOffset) });
        cIdx++;
      }
      // Bottom row
      for (let i = 0; i < topCount && cIdx <= cap; i++) {
        const xOffset = topCount === 1 ? 0 : 45 - (90 / (topCount - 1)) * i;
        list.push({ id: `chair-${cIdx}`, label: cIdx.toString(), x: Math.round(xOffset), y: 56 });
        cIdx++;
      }
      // Left col
      while (cIdx <= cap) {
        list.push({ id: `chair-${cIdx}`, label: cIdx.toString(), x: -78, y: 0 });
        cIdx++;
      }
      return list.slice(0, cap);
    }
  }
};

export default function AdminTablesClient({ initialTables }: { initialTables: DiningTable[] }) {
  const { showToast } = useToast();
  const [tables, setTables] = useState<DiningTable[]>(initialTables);
  
  // Studio & Selection States
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [cardModalTableId, setCardModalTableId] = useState<string | null>(null);
  const [activeCanvasMode, setActiveCanvasMode] = useState<'VIEW' | 'MOVE_TABLE'>('VIEW');

  // Form / Studio editing values
  const [editNumber, setEditNumber] = useState('');
  const [editCapacity, setEditCapacity] = useState(4);
  const [editShape, setEditShape] = useState<'RECTANGLE' | 'ROUND'>('RECTANGLE');
  const [editStatus, setEditStatus] = useState('AVAILABLE');
  const [customChairs, setCustomChairs] = useState<CustomChair[]>([]);
  const [selectedChairIdx, setSelectedChairIdx] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Floor Plan Canvas Dragging Ref
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragInfo = useRef<{ tableId: string; startX: number; startY: number } | null>(null);

  // Chair 2D Dragging in Studio
  const studioCanvasRef = useRef<HTMLDivElement>(null);
  const chairDragInfo = useRef<{ chairIdx: number; startMouseX: number; startMouseY: number; startChairX: number; startChairY: number } | null>(null);

  const selectedTable = useMemo(() => {
    return tables.find(t => t.id === selectedTableId) || null;
  }, [tables, selectedTableId]);

  // Load custom chair configurations
  const getTableChairs = useCallback((table: DiningTable): CustomChair[] => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`arum_chairs_table_${table.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === table.capacity) {
            return parsed;
          }
        } catch {}
      }
    }
    return getDefaultChairs(table.capacity || 4, table.shape || 'RECTANGLE');
  }, []);

  // Open Studio for selected table
  const openStudio = (table: DiningTable) => {
    setSelectedTableId(table.id);
    setEditNumber(table.number);
    setEditCapacity(table.capacity || 4);
    setEditShape((table.shape as 'RECTANGLE' | 'ROUND') || 'RECTANGLE');
    setEditStatus(table.status || 'AVAILABLE');
    setCustomChairs(getTableChairs(table));
    setSelectedChairIdx(null);
    setIsStudioOpen(true);
  };

  // Sync chairs when capacity or shape changes in Studio
  const handleCapacityChange = (newCap: number) => {
    const clamped = Math.max(1, Math.min(16, newCap));
    setEditCapacity(clamped);
    setCustomChairs(getDefaultChairs(clamped, editShape));
  };

  const handleShapeChange = (newShape: 'RECTANGLE' | 'ROUND') => {
    setEditShape(newShape);
    setCustomChairs(getDefaultChairs(editCapacity, newShape));
  };

  // Preset placements: Kotak 4 Sisi, Atas-Bawah, Kiri-Kanan, Melingkar Orbital
  const applyPresetPlacement = (presetType: 'FOUR_SIDES' | 'OPPOSITE' | 'LEFT_RIGHT' | 'ORBITAL') => {
    if (presetType === 'FOUR_SIDES') {
      setCustomChairs(getDefaultChairs(editCapacity, 'RECTANGLE'));
    } else if (presetType === 'OPPOSITE') {
      const half = Math.ceil(editCapacity / 2);
      const list: CustomChair[] = [];
      for (let i = 0; i < editCapacity; i++) {
        const isTop = i < half;
        const colIdx = isTop ? i : i - half;
        const totalInRow = isTop ? half : (editCapacity - half);
        const xOffset = totalInRow === 1 ? 0 : -45 + (90 / Math.max(1, totalInRow - 1)) * colIdx;
        list.push({
          id: `chair-${i + 1}`,
          label: (i + 1).toString(),
          x: Math.round(xOffset),
          y: isTop ? -56 : 56
        });
      }
      setCustomChairs(list);
    } else if (presetType === 'LEFT_RIGHT') {
      const half = Math.ceil(editCapacity / 2);
      const list: CustomChair[] = [];
      for (let i = 0; i < editCapacity; i++) {
        const isLeft = i < half;
        const rowIdx = isLeft ? i : i - half;
        const totalInCol = isLeft ? half : (editCapacity - half);
        const yOffset = totalInCol === 1 ? 0 : -25 + (50 / Math.max(1, totalInCol - 1)) * rowIdx;
        list.push({
          id: `chair-${i + 1}`,
          label: (i + 1).toString(),
          x: isLeft ? -78 : 78,
          y: Math.round(yOffset)
        });
      }
      setCustomChairs(list);
    } else {
      // Orbital 360°
      setCustomChairs(getDefaultChairs(editCapacity, 'ROUND'));
    }
    showToast('Tata letak kursi diterapkan', 'info');
  };

  // Free 2D Chair drag in Studio Canvas
  const handleStartChairDrag = (e: React.MouseEvent | React.TouchEvent, idx: number) => {
    e.stopPropagation();
    setSelectedChairIdx(idx);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    chairDragInfo.current = {
      chairIdx: idx,
      startMouseX: clientX,
      startMouseY: clientY,
      startChairX: customChairs[idx].x,
      startChairY: customChairs[idx].y
    };

    window.addEventListener('mousemove', handleChairDragging);
    window.addEventListener('mouseup', handleEndChairDrag);
    window.addEventListener('touchmove', handleChairDragging);
    window.addEventListener('touchend', handleEndChairDrag);
  };

  const handleChairDragging = (e: MouseEvent | TouchEvent) => {
    if (!chairDragInfo.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const deltaX = clientX - chairDragInfo.current.startMouseX;
    const deltaY = clientY - chairDragInfo.current.startMouseY;

    const newX = Math.round(chairDragInfo.current.startChairX + deltaX);
    const newY = Math.round(chairDragInfo.current.startChairY + deltaY);

    // Clamp within canvas boundary
    const clampedX = Math.max(-125, Math.min(125, newX));
    const clampedY = Math.max(-125, Math.min(125, newY));

    const idx = chairDragInfo.current.chairIdx;
    setCustomChairs(prev => prev.map((c, i) => i === idx ? { ...c, x: clampedX, y: clampedY } : c));
  };

  const handleEndChairDrag = () => {
    chairDragInfo.current = null;
    window.removeEventListener('mousemove', handleChairDragging);
    window.removeEventListener('mouseup', handleEndChairDrag);
    window.removeEventListener('touchmove', handleChairDragging);
    window.removeEventListener('touchend', handleEndChairDrag);
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
    if (!editNumber.trim()) {
      showToast('Nomor meja wajib diisi', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: editNumber.trim(),
          capacity: editCapacity,
          shape: editShape,
          x: 50,
          y: 50
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menambahkan meja');

      showToast(`Meja ${editNumber} berhasil ditambahkan`, 'success');
      setTables(prev => [...prev, data]);
      setIsAddModalOpen(false);
      openStudio(data);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Save changes from Studio
  const handleSaveStudio = async () => {
    if (!selectedTableId || !editNumber.trim()) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/tables/${selectedTableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: editNumber.trim(),
          capacity: editCapacity,
          shape: editShape,
          status: editStatus
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui meja');

      // Save custom chair positions to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(`arum_chairs_table_${selectedTableId}`, JSON.stringify(customChairs));
      }

      showToast(`Pengaturan Meja ${editNumber} dan posisi kursi tersimpan!`, 'success');
      setTables(prev => prev.map(t => t.id === selectedTableId ? data : t));
      setIsStudioOpen(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Quick Status Update
  const handleQuickStatusChange = async (status: string) => {
    if (!selectedTableId) return;
    setEditStatus(status);
    try {
      const res = await fetch(`/api/admin/tables/${selectedTableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (res.ok) {
        setTables(prev => prev.map(t => t.id === selectedTableId ? data : t));
        showToast(`Status Meja ${data.number} diubah ke ${status}`, 'info');
      }
    } catch {}
  };

  // Delete table
  const handleDeleteTable = async () => {
    if (!selectedTableId) return;
    if (!confirm(`Hapus Meja ${selectedTable?.number}? QR code meja ini tidak akan bisa digunakan lagi.`)) return;

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
      setIsStudioOpen(false);
      setSelectedTableId(null);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Floor Plan Drag & Drop Position Handler
  const handleStartDrag = (e: React.MouseEvent | React.TouchEvent, tableId: string) => {
    if (activeCanvasMode !== 'MOVE_TABLE') {
      const targetTable = tables.find(t => t.id === tableId);
      if (targetTable) openStudio(targetTable);
      return;
    }

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragInfo.current = { tableId, startX: clientX, startY: clientY };

    window.addEventListener('mousemove', handleDragging);
    window.addEventListener('mouseup', handleEndDrag);
    window.addEventListener('touchmove', handleDragging);
    window.addEventListener('touchend', handleEndDrag);
  };

  const handleDragging = (e: MouseEvent | TouchEvent) => {
    if (!dragInfo.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const xPercent = Math.max(10, Math.min(90, ((clientX - rect.left) / rect.width) * 100));
    const yPercent = Math.max(10, Math.min(90, ((clientY - rect.top) / rect.height) * 100));

    setTables(prev => prev.map(t => {
      if (t.id === dragInfo.current?.tableId) {
        return { ...t, x: Math.round(xPercent), y: Math.round(yPercent) };
      }
      return t;
    }));
  };

  const handleEndDrag = async () => {
    if (dragInfo.current) {
      const draggedTable = tables.find(t => t.id === dragInfo.current?.tableId);
      if (draggedTable) {
        try {
          await fetch(`/api/admin/tables/${draggedTable.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x: draggedTable.x, y: draggedTable.y })
          });
        } catch {}
      }
    }

    dragInfo.current = null;
    window.removeEventListener('mousemove', handleDragging);
    window.removeEventListener('mouseup', handleEndDrag);
    window.removeEventListener('touchmove', handleDragging);
    window.removeEventListener('touchend', handleEndDrag);
  };

  // Download QR Code image
  const handleDownloadQR = () => {
    if (!selectedTable) return;
    const canvas = document.getElementById(`qr-canvas-${selectedTable.id}`) as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `QR-Meja-${selectedTable.number}-ArumSeduh.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      showToast('Gambar QR Code berhasil diunduh', 'success');
    }
  };

  const getStoreUrl = (tableNum: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/spmb?table=${encodeURIComponent(tableNum)}`;
    }
    return `https://arumseduh.com/spmb?table=${encodeURIComponent(tableNum)}`;
  };

  // Status visual colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-800', dot: 'bg-emerald-500', label: 'Tersedia' };
      case 'OCCUPIED':
        return { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-800', dot: 'bg-blue-500', label: 'Terisi' };
      case 'BILLING':
        return { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-800', dot: 'bg-amber-500', label: 'Ditagih' };
      case 'CLEANING':
        return { bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-800', dot: 'bg-rose-500', label: 'Dibersihkan' };
      default:
        return { bg: 'bg-stone-50', border: 'border-stone-300', text: 'text-stone-700', dot: 'bg-stone-400', label: status };
    }
  };

  // Metrics
  const totalTables = tables.length;
  const occupiedCount = tables.filter(t => t.status === 'OCCUPIED').length;
  const totalCapacity = tables.reduce((acc, t) => acc + (t.capacity || 0), 0);
  const occupancyPercent = totalTables > 0 ? Math.round((occupiedCount / totalTables) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C1917] p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
      
      {/* Top Header & Action Controls */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-[11px] font-bold tracking-wide">
              <UtensilsCrossed className="w-3.5 h-3.5 text-orange-600" />
              <span>Manajemen Meja & Tata Letak Kursi Arum Seduh</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
              Denah Ruangan & Studio Kursi
            </h1>
            <p className="text-xs text-stone-500">
              Kursi fisik terletak rapi di sekeliling meja tanpa tertutup. Klik meja mana pun untuk menggeser posisi kursi secara bebas!
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Mode Controls */}
            <div className="flex bg-stone-100 p-1 rounded-2xl border border-stone-200">
              <button
                type="button"
                onClick={() => setActiveCanvasMode('VIEW')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeCanvasMode === 'VIEW'
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-orange-600" />
                <span>Klik Edit Meja & Kursi</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCanvasMode('MOVE_TABLE')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeCanvasMode === 'MOVE_TABLE'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Move className="w-3.5 h-3.5" />
                <span>Geser Posisi Meja</span>
              </button>
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={fetchTables}
              className="p-2.5 rounded-2xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition-all cursor-pointer"
              title="Segarkan Denah"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Cetak Kartu / Stiker Meja Button */}
            <button
              type="button"
              onClick={() => {
                setCardModalTableId(null);
                setIsCardModalOpen(true);
              }}
              className="px-3.5 py-2.5 rounded-2xl bg-white hover:bg-orange-50 text-orange-700 border border-orange-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Buka Generator Cetak Kartu Meja Template Resmi"
            >
              <Printer className="w-4 h-4 text-orange-600" />
              <span>Cetak Stiker Meja (Template)</span>
            </button>

            {/* Tambah Meja Button */}
            <button
              type="button"
              onClick={() => {
                setEditNumber((tables.length + 1).toString());
                setEditCapacity(4);
                setEditShape('RECTANGLE');
                setCustomChairs(getDefaultChairs(4, 'RECTANGLE'));
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-orange-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Meja</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2 border-t border-stone-100">
          <div className="bg-stone-50/70 p-4 rounded-2xl border border-stone-200">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Total Meja</p>
            <p className="font-serif text-2xl font-bold text-stone-900 mt-1">{totalTables} Meja</p>
          </div>
          <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Meja Terisi</p>
            <p className="font-serif text-2xl font-bold text-blue-900 mt-1">{occupiedCount} Meja</p>
          </div>
          <div className="bg-orange-50/60 p-4 rounded-2xl border border-orange-200">
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-700">Total Kursi</p>
            <p className="font-serif text-2xl font-bold text-orange-900 mt-1">{totalCapacity} Kursi</p>
          </div>
          <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Okupansi Ruangan</p>
            <p className="font-serif text-2xl font-bold text-emerald-900 mt-1">{occupancyPercent}%</p>
          </div>
        </div>
      </div>

      {/* Blueprint Floor Plan Canvas with Visible Surrounding Chairs (Unclipped & Beautifully Placed) */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-orange-700">
              Denah Ruangan Kafe (Posisi Meja & Kursi Fisik Terlihat Bersih)
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-stone-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Tersedia</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Terisi</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Ditagih</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Dibersihkan</span>
          </div>
        </div>

        {/* The Blueprint Canvas */}
        <div
          ref={canvasRef}
          className="relative w-full aspect-[16/9] min-h-[520px] rounded-3xl bg-[#FAF7F2] border-2 border-stone-300 shadow-inner overflow-hidden select-none cursor-default"
          style={{
            backgroundImage: 'radial-gradient(#F97316 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        >
          <div className="absolute top-4 left-6 text-stone-400 text-[10px] font-mono tracking-widest uppercase pointer-events-none">
            [Denah Skala 1:25 • Klik meja untuk membuka Studio Pengaturan Kursi Bebas]
          </div>

          {tables.map((table) => {
            const isSelected = selectedTableId === table.id;
            const statusStyle = getStatusColor(table.status);
            const isRound = table.shape === 'ROUND';
            const tableChairs = getTableChairs(table);

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
                className="absolute select-none cursor-pointer flex items-center justify-center z-10"
              >
                {/* Table Core Element */}
                <div
                  className={`relative flex flex-col items-center justify-center border-2 transition-all shadow-md ${
                    isRound 
                      ? 'w-24 h-24 rounded-full' 
                      : 'w-32 h-20 rounded-2xl'
                  } ${
                    isSelected 
                      ? 'ring-4 ring-orange-500/40 shadow-xl scale-105 z-30 bg-gradient-to-br from-orange-500 to-amber-500 text-white border-white' 
                      : `${statusStyle.bg} ${statusStyle.border} ${statusStyle.text} hover:border-orange-400 hover:scale-105 z-20`
                  }`}
                >
                  <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-black/5 text-stone-600'
                  }`}>
                    {isRound ? 'Bulat' : 'Kotak'}
                  </span>

                  <span className="font-serif font-bold text-sm leading-tight mt-0.5">
                    Meja {table.number}
                  </span>

                  <span className={`text-[10px] font-semibold mt-0.5 flex items-center gap-1 ${
                    isSelected ? 'text-white/90' : 'text-stone-500'
                  }`}>
                    <Armchair className="w-3 h-3" /> {table.capacity} Kursi
                  </span>

                  {/* Move Handle when in move mode */}
                  {activeCanvasMode === 'MOVE_TABLE' && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-md animate-bounce z-40">
                      <Move className="w-3 h-3" />
                    </div>
                  )}
                </div>

                {/* PHYSICAL CHAIRS POSITIONED CLEANLY AROUND THE PERIMETER */}
                {tableChairs.map((chair) => {
                  return (
                    <div
                      key={chair.id}
                      style={{
                        transform: `translate(${chair.x}px, ${chair.y}px)`,
                      }}
                      title={`Meja ${table.number} - Kursi ${chair.label}`}
                      className="absolute w-6 h-6 rounded-lg bg-white border-2 border-orange-300 text-orange-700 shadow-sm flex items-center justify-center text-[9px] font-black pointer-events-none z-10"
                    >
                      <Armchair className="w-3.5 h-3.5 text-orange-600" />
                    </div>
                  );
                })}
              </div>
            );
          })}

          {tables.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-stone-400 text-xs font-mono">
              [Denah kosong. Klik "Tambah Meja" di atas untuk menambahkan meja pertama]
            </div>
          )}
        </div>
      </div>

      {/* DEDICATED TABLE & CHAIR STUDIO MODAL (FREE 2D DRAG & RECTANGULAR/ORBITAL MODES) */}
      <AnimatePresence>
        {isStudioOpen && selectedTable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
              onClick={() => setIsStudioOpen(false)}
            />

            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl w-full max-w-4xl p-6 sm:p-8 shadow-2xl relative z-10 border border-stone-200 max-h-[92vh] flex flex-col text-left space-y-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif font-bold text-2xl text-stone-900">
                      Studio Meja {selectedTable.number}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-xs font-bold">
                      {editShape === 'ROUND' ? 'Meja Bulat (Orbital)' : 'Meja Kotak (Persegi)'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500">
                    Tarik dan tempatkan kursi secara bebas 2D di sekeliling meja, atau gunakan preset tata letak kotak & orbital
                  </p>
                </div>

                <button
                  onClick={() => setIsStudioOpen(false)}
                  className="w-9 h-9 rounded-full border border-stone-200 flex items-center justify-center hover:bg-stone-50 cursor-pointer"
                >
                  <X className="w-4 h-4 text-stone-500" />
                </button>
              </div>

              {/* Studio Body: Left Settings & Right Interactive 2D Visual Drag Canvas */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start overflow-y-auto pr-1">
                
                {/* Left Column: Shape, Capacity, Presets */}
                <div className="md:col-span-5 space-y-4">
                  {/* Shape Switcher */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Bentuk Meja
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleShapeChange('RECTANGLE')}
                        className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          editShape === 'RECTANGLE'
                            ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm ring-2 ring-orange-500/20'
                            : 'bg-stone-50 border-stone-200 text-stone-600 hover:border-stone-400'
                        }`}
                      >
                        <Square className="w-4 h-4 text-orange-600" />
                        <span>Meja Kotak</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShapeChange('ROUND')}
                        className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          editShape === 'ROUND'
                            ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm ring-2 ring-orange-500/20'
                            : 'bg-stone-50 border-stone-200 text-stone-600 hover:border-stone-400'
                        }`}
                      >
                        <Circle className="w-4 h-4 text-orange-600" />
                        <span>Meja Bulat</span>
                      </button>
                    </div>
                  </div>

                  {/* Table Number & Capacity */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                        Nomor Meja
                      </label>
                      <input
                        type="text"
                        value={editNumber}
                        onChange={(e) => setEditNumber(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                        Kapasitas Kursi
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCapacityChange(editCapacity - 1)}
                          className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 font-bold text-sm flex items-center justify-center hover:bg-stone-200 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="flex-1 text-center font-serif font-bold text-sm text-stone-900">
                          {editCapacity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCapacityChange(editCapacity + 1)}
                          className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 font-bold text-sm flex items-center justify-center hover:bg-stone-200 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Preset Penataan Kursi Otomatis (Kotak vs Orbital) */}
                  <div className="space-y-1.5 p-3.5 rounded-2xl bg-orange-50/70 border border-orange-200">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-orange-950 flex items-center gap-1">
                      <LayoutGrid className="w-3.5 h-3.5 text-orange-600" />
                      <span>Preset Penataan Kursi (1-Klik)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => applyPresetPlacement('FOUR_SIDES')}
                        className="p-2 rounded-xl bg-white border border-orange-200 text-stone-700 text-[11px] font-bold hover:bg-orange-100/60 cursor-pointer text-center shadow-2xs"
                      >
                        4 Sisi Kotak
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPresetPlacement('OPPOSITE')}
                        className="p-2 rounded-xl bg-white border border-orange-200 text-stone-700 text-[11px] font-bold hover:bg-orange-100/60 cursor-pointer text-center shadow-2xs"
                      >
                        Atas & Bawah
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPresetPlacement('LEFT_RIGHT')}
                        className="p-2 rounded-xl bg-white border border-orange-200 text-stone-700 text-[11px] font-bold hover:bg-orange-100/60 cursor-pointer text-center shadow-2xs"
                      >
                        Kiri & Kanan
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPresetPlacement('ORBITAL')}
                        className="p-2 rounded-xl bg-white border border-orange-200 text-stone-700 text-[11px] font-bold hover:bg-orange-100/60 cursor-pointer text-center shadow-2xs"
                      >
                        Orbital (Melingkar)
                      </button>
                    </div>
                  </div>

                  {/* Status Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Status Meja Saat Ini
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {['AVAILABLE', 'OCCUPIED', 'BILLING', 'CLEANING'].map((st) => {
                        const isStSelected = editStatus === st;
                        const stColor = getStatusColor(st);
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleQuickStatusChange(st)}
                            className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              isStSelected
                                ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                                : 'bg-stone-50 text-stone-700 border-stone-200 hover:border-stone-400'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${isStSelected ? 'bg-white' : stColor.dot}`} />
                            <span>{stColor.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* QR Code Action */}
                  <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-stone-200 text-center space-y-2">
                    <div className="hidden">
                      <QRCodeCanvas
                        id={`qr-canvas-${selectedTable.id}`}
                        value={getStoreUrl(selectedTable.number)}
                        size={180}
                        level="H"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCardModalTableId(selectedTable.id);
                        setIsCardModalOpen(true);
                      }}
                      className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-orange-500/20"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Cetak Kartu Meja {selectedTable.number} (Template)
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadQR}
                      className="w-full py-1.5 rounded-lg text-stone-500 hover:text-stone-800 text-[11px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" /> Unduh Gambar QR Polos
                    </button>
                  </div>
                </div>

                {/* Right Column: High-Res Interactive 2D Free-Form Chair Studio */}
                <div className="md:col-span-7 bg-[#FAF7F2] rounded-3xl border-2 border-stone-200 p-6 flex flex-col items-center justify-center space-y-4">
                  <div className="text-center">
                    <p className="text-[11px] font-bold text-orange-800 uppercase tracking-wider">
                      Kanvas Interaktif Studio Kursi Bebas (2D Free-Form)
                    </p>
                    <p className="text-[10px] text-stone-500">
                      Tarik kursi ke posisi mana pun di kanvas. Kursi tidak akan tertutup meja.
                    </p>
                  </div>

                  {/* Interactive Drag Canvas */}
                  <div
                    ref={studioCanvasRef}
                    className="relative w-80 h-80 bg-white rounded-3xl border-2 border-stone-300 shadow-inner flex items-center justify-center select-none"
                  >
                    {/* Visual Placement Guide: Box Guide if Rectangle, Circle Guide if Round */}
                    {editShape === 'ROUND' ? (
                      <div className="absolute w-56 h-56 rounded-full border-2 border-dashed border-orange-300 pointer-events-none" />
                    ) : (
                      <div className="absolute w-60 h-48 rounded-2xl border-2 border-dashed border-orange-300 pointer-events-none" />
                    )}

                    {/* Central Table Graphic */}
                    {editShape === 'ROUND' ? (
                      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 border-2 border-amber-300 shadow-md flex flex-col items-center justify-center p-2 z-10 pointer-events-none">
                        <span className="font-serif font-black text-xs text-stone-900">MEJA {editNumber}</span>
                        <span className="text-[8px] font-bold text-orange-700 bg-white/80 px-2 py-0.5 rounded-full border border-orange-200 mt-0.5">
                          {editCapacity} Kursi
                        </span>
                      </div>
                    ) : (
                      <div className="w-36 h-24 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 border-2 border-amber-300 shadow-md flex flex-col items-center justify-center p-2 z-10 pointer-events-none">
                        <span className="font-serif font-black text-xs text-stone-900">MEJA {editNumber}</span>
                        <span className="text-[8px] font-bold text-orange-700 bg-white/80 px-2 py-0.5 rounded-full border border-orange-200 mt-0.5">
                          {editCapacity} Kursi
                        </span>
                      </div>
                    )}

                    {/* INTERACTIVE 2D DRAGGABLE CHAIRS */}
                    {customChairs.map((chair, idx) => {
                      const isSelected = selectedChairIdx === idx;

                      return (
                        <div
                          key={chair.id}
                          onMouseDown={(e) => handleStartChairDrag(e, idx)}
                          onTouchStart={(e) => handleStartChairDrag(e, idx)}
                          style={{
                            transform: `translate(${chair.x}px, ${chair.y}px)`,
                            touchAction: 'none'
                          }}
                          title={`Klik & Tarik Kursi ${chair.label}`}
                          className={`absolute w-10 h-10 rounded-2xl border-2 cursor-grab active:cursor-grabbing flex flex-col items-center justify-center transition-transform z-30 shadow-md ${
                            isSelected
                              ? 'bg-orange-500 text-white border-white ring-4 ring-orange-500/30 scale-110'
                              : 'bg-white text-stone-800 border-orange-300 hover:scale-105'
                          }`}
                        >
                          <Armchair className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-orange-600'}`} />
                          <span className="font-serif font-black text-[9px] leading-none mt-0.5">{chair.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[11px] font-medium text-stone-600 text-center bg-stone-100 px-3.5 py-1.5 rounded-xl border border-stone-200">
                    Posisi kursi yang Anda geser akan langsung tampil persis sama di denah kasir & SPMB pelanggan.
                  </p>
                </div>
              </div>

              {/* Studio Actions */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleDeleteTable}
                  className="px-4 py-2.5 rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Hapus Meja
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsStudioOpen(false)}
                    className="px-5 py-2.5 rounded-2xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveStudio}
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan Meja & Kursi'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TAMBAH MEJA BARU MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
              onClick={() => setIsAddModalOpen(false)}
            />

            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative z-10 border border-stone-200 text-left space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <h3 className="font-serif font-bold text-xl text-stone-900">Tambah Meja Baru</h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-8 h-8 rounded-full border border-stone-200 flex items-center justify-center hover:bg-stone-50 cursor-pointer"
                >
                  <X className="w-4 h-4 text-stone-500" />
                </button>
              </div>

              <form onSubmit={handleAddTable} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Nomor / Label Meja
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 1, 2, VIP-1, Outdoor-3"
                    value={editNumber}
                    onChange={(e) => setEditNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Shape Selection */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Bentuk Meja
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleShapeChange('RECTANGLE')}
                      className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        editShape === 'RECTANGLE'
                          ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm ring-2 ring-orange-500/20'
                          : 'bg-stone-50 border-stone-200 text-stone-600 hover:border-stone-400'
                      }`}
                    >
                      <Square className="w-4 h-4 text-orange-600" />
                      <span>Meja Kotak</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShapeChange('ROUND')}
                      className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        editShape === 'ROUND'
                          ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm ring-2 ring-orange-500/20'
                          : 'bg-stone-50 border-stone-200 text-stone-600 hover:border-stone-400'
                      }`}
                    >
                      <Circle className="w-4 h-4 text-orange-600" />
                      <span>Meja Bulat</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Kapasitas Kursi
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={editCapacity}
                    onChange={(e) => handleCapacityChange(parseInt(e.target.value) || 2)}
                    className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex gap-2 pt-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? 'Menyimpan...' : 'Tambah Meja'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TABLE QR CARD GENERATOR MODAL */}
      <TableQrCardModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        tables={tables}
        initialTableId={cardModalTableId}
      />
    </div>
  );
}
