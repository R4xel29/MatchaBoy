'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useToast } from '@/components/ui/Toast';
import { 
  Plus, Trash2, Move, Eye, Download, Check, RefreshCw, Layers, Edit2, Maximize2, 
  Sparkles, X, Circle, Square, RotateCw, Settings, UtensilsCrossed,
  ArrowRight, ShieldCheck, CheckCircle2, ChevronRight, Sliders, Compass, LayoutGrid,
  Printer, Palette, DoorOpen, Tv, Archive, Coffee, Flower2, Columns, Accessibility,
  Scaling, GripHorizontal, Box
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TableQrCardModal from './TableQrCardModal';

// Compatibility types for external references
export type ChairColor = 'WHITE' | 'BLACK' | 'YELLOW' | 'GRAY' | 'WOOD';
export interface ChairColorOption {
  id: ChairColor;
  label: string;
  name: string;
  previewBg: string;
  previewBorder: string;
}
export const CHAIR_COLOR_OPTIONS: ChairColorOption[] = [
  { id: 'WHITE', label: 'Putih', name: 'Putih (Clean)', previewBg: 'bg-white', previewBorder: 'border-stone-300' },
  { id: 'BLACK', label: 'Hitam', name: 'Hitam (Charcoal)', previewBg: 'bg-stone-900', previewBorder: 'border-black' },
  { id: 'YELLOW', label: 'Kuning', name: 'Kuning (Warm Amber)', previewBg: 'bg-amber-400', previewBorder: 'border-amber-500' },
  { id: 'GRAY', label: 'Abu-Abu', name: 'Abu-Abu (Slate)', previewBg: 'bg-stone-400', previewBorder: 'border-stone-500' },
  { id: 'WOOD', label: 'Kayu', name: 'Kayu (Oak Wood)', previewBg: 'bg-[#8B5A2B]', previewBorder: 'border-[#6F3E1B]' },
];
export function getChairVisualClass(color?: ChairColor, isSelected?: boolean) {
  return '';
}
export function getChairIconClass(color?: ChairColor, isSelected?: boolean) {
  return '';
}
export interface CustomChair {
  id: string;
  label: string;
  x: number;
  y: number;
  color?: ChairColor;
}
export const getDefaultChairs = (capacity: number = 4, shape: string = 'RECTANGLE', defaultColor: ChairColor = 'WHITE'): CustomChair[] => [];

// Floor Elements (Doors, TV, Shelves, Bar, Plant, Window, Restroom, etc.)
export type FloorElementType = 'DOOR' | 'TV' | 'SHELF' | 'BAR' | 'PLANT' | 'WINDOW' | 'RESTROOM' | 'CUSTOM';

export interface FloorElementData {
  id: string;
  name: string;
  type: string; // 'DOOR' | 'TV' | 'SHELF' | 'BAR' | 'PLANT' | 'WINDOW' | 'RESTROOM' | 'CUSTOM'
  x: number; // percentage 0 - 100%
  y: number; // percentage 0 - 100%
  width: number; // in pixels (e.g. 30 - 300)
  height: number; // in pixels (e.g. 15 - 200)
  rotation: number; // 0, 90, 180, 270 (degrees)
  color?: string | null;
}

export interface FloorElementTypePreset {
  type: FloorElementType;
  label: string;
  defaultName: string;
  defaultWidth: number;
  defaultHeight: number;
  description: string;
}

export const FLOOR_ELEMENT_PRESETS: FloorElementTypePreset[] = [
  { type: 'DOOR', label: 'Pintu', defaultName: 'Pintu Masuk', defaultWidth: 80, defaultHeight: 20, description: 'Pintu masuk, pintu keluar, atau akses area' },
  { type: 'TV', label: 'TV / Layar', defaultName: 'TV 55 Inch', defaultWidth: 90, defaultHeight: 16, description: 'Smart TV, layar menu, atau monitor live' },
  { type: 'SHELF', label: 'Rak Display', defaultName: 'Rak Merchandise', defaultWidth: 100, defaultHeight: 35, description: 'Rak pajangan, etalase beans, rak peralatan' },
  { type: 'BAR', label: 'Kasir / Bar', defaultName: 'Bar & Kasir', defaultWidth: 150, defaultHeight: 50, description: 'Meja kasir, bar seduh espresso, pick-up bar' },
  { type: 'PLANT', label: 'Tanaman', defaultName: 'Pot Tanaman', defaultWidth: 36, defaultHeight: 36, description: 'Dekorasi tanaman hias indoor / sudut kafe' },
  { type: 'WINDOW', label: 'Jendela', defaultName: 'Jendela Kaca', defaultWidth: 100, defaultHeight: 14, description: 'Jendela kaca pemandangan luar / fasad' },
  { type: 'RESTROOM', label: 'Toilet', defaultName: 'Toilet / WC', defaultWidth: 55, defaultHeight: 50, description: 'Akses toilet & wastafel pelanggan' },
];

export interface DiningTable {
  id: string;
  number: string;
  capacity?: number;
  occupiedSeats?: number;
  status: string; // AVAILABLE, OCCUPIED, BILLING, CLEANING
  shape: string;  // RECTANGLE, ROUND
  x: number;
  y: number;
  rotation?: number; // 0, 90, 180, 270 (degrees)
  qrUrl?: string | null;
  chairsJson?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export function FloorElementVisual({ element, isSelected = false }: { element: FloorElementData; isSelected?: boolean }) {
  const isDoor = element.type === 'DOOR';
  const isTv = element.type === 'TV';
  const isShelf = element.type === 'SHELF';
  const isBar = element.type === 'BAR';
  const isPlant = element.type === 'PLANT';
  const isWindow = element.type === 'WINDOW';
  const isRestroom = element.type === 'RESTROOM';

  return (
    <div
      style={{
        width: `${element.width}px`,
        height: `${element.height}px`,
        transform: `rotate(${element.rotation || 0}deg)`,
      }}
      className={`relative flex items-center justify-center select-none transition-all shadow-sm ${
        isSelected ? 'ring-3 ring-orange-500 ring-offset-2 shadow-xl z-30 scale-102' : 'hover:scale-102'
      } ${
        isDoor
          ? 'bg-amber-100/90 border-2 border-dashed border-amber-600 text-amber-900 rounded-lg'
          : isTv
          ? 'bg-slate-900 border-2 border-sky-400 text-sky-200 rounded-md shadow-md'
          : isShelf
          ? 'bg-[#EAD7C5] border-2 border-[#8C5E35] text-[#5C3414] rounded-lg'
          : isBar
          ? 'bg-stone-800 border-2 border-amber-500 text-amber-100 rounded-xl shadow-md'
          : isPlant
          ? 'bg-emerald-100 border-2 border-emerald-600 text-emerald-900 rounded-full shadow-xs'
          : isWindow
          ? 'bg-cyan-100/70 border-2 border-cyan-400 text-cyan-900 rounded-md'
          : isRestroom
          ? 'bg-purple-100 border-2 border-purple-400 text-purple-900 rounded-xl'
          : 'bg-stone-100 border-2 border-stone-400 text-stone-900 rounded-lg'
      }`}
    >
      <div className="flex items-center gap-1 px-1.5 overflow-hidden text-ellipsis whitespace-nowrap pointer-events-none">
        {isDoor && <DoorOpen className="w-3.5 h-3.5 shrink-0 text-amber-700" />}
        {isTv && <Tv className="w-3.5 h-3.5 shrink-0 text-sky-400 animate-pulse" />}
        {isShelf && <Archive className="w-3.5 h-3.5 shrink-0 text-[#8C5E35]" />}
        {isBar && <Coffee className="w-3.5 h-3.5 shrink-0 text-amber-400" />}
        {isPlant && <Flower2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />}
        {isWindow && <Columns className="w-3.5 h-3.5 shrink-0 text-cyan-600" />}
        {isRestroom && <Accessibility className="w-3.5 h-3.5 shrink-0 text-purple-600" />}
        
        <span className="text-[9px] font-extrabold uppercase tracking-wider truncate">
          {element.name}
        </span>
      </div>

      {isDoor && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-600 border border-white" />
      )}
      {isShelf && (
        <div className="absolute inset-x-1 bottom-0.5 h-0.5 bg-[#8C5E35]/40" />
      )}
    </div>
  );
}

export default function AdminTablesClient({ 
  initialTables, 
  initialElements 
}: { 
  initialTables: DiningTable[];
  initialElements?: FloorElementData[];
}) {
  const { showToast } = useToast();
  const [tables, setTables] = useState<DiningTable[]>(initialTables);
  const [floorElements, setFloorElements] = useState<FloorElementData[]>(initialElements || []);
  
  // Studio & Selection States
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [cardModalTableId, setCardModalTableId] = useState<string | null>(null);
  const [activeCanvasMode, setActiveCanvasMode] = useState<'VIEW' | 'MOVE_TABLE' | 'MOVE_ELEMENT'>('VIEW');
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [liveOrdersMap, setLiveOrdersMap] = useState<Record<string, any>>({});

  // Floor Element Modal State
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isElementModalOpen, setIsElementModalOpen] = useState(false);
  const [elementModalMode, setElementModalMode] = useState<'ADD' | 'EDIT'>('ADD');
  const [editElementName, setEditElementName] = useState('Pintu Masuk');
  const [editElementType, setEditElementType] = useState<FloorElementType>('DOOR');
  const [editElementWidth, setEditElementWidth] = useState(80);
  const [editElementHeight, setEditElementHeight] = useState(20);
  const [editElementRotation, setEditElementRotation] = useState(0);
  const [editElementColor, setEditElementColor] = useState('');
  const [isSavingElement, setIsSavingElement] = useState(false);

  // Form / Studio editing values
  const [editNumber, setEditNumber] = useState('');
  const [editShape, setEditShape] = useState<'RECTANGLE' | 'ROUND'>('RECTANGLE');
  const [editStatus, setEditStatus] = useState('AVAILABLE');
  const [editRotation, setEditRotation] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  // Floor Plan Canvas Dragging Ref
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragInfo = useRef<{ tableId: string; startX: number; startY: number } | null>(null);

  const selectedTable = useMemo(() => {
    return tables.find(t => t.id === selectedTableId) || null;
  }, [tables, selectedTableId]);

  // Open Studio for selected table
  const openStudio = (table: DiningTable) => {
    setSelectedTableId(table.id);
    setEditNumber(table.number);
    setEditShape((table.shape as 'RECTANGLE' | 'ROUND') || 'RECTANGLE');
    setEditStatus(table.status || 'AVAILABLE');
    setEditRotation(table.rotation || 0);
    setIsStudioOpen(true);
  };

  // Rotate Table
  const handleRotateTable = (degreesDelta: number = 90) => {
    const nextRotation = (editRotation + degreesDelta + 360) % 360;
    setEditRotation(nextRotation);
    showToast(`Rotasi meja diubah ke ${nextRotation}°`, 'info');
  };

  // Floor Elements CRUD & Interaction
  const handleOpenAddElement = (presetType?: FloorElementType) => {
    const preset = FLOOR_ELEMENT_PRESETS.find(p => p.type === presetType) || FLOOR_ELEMENT_PRESETS[0];
    setElementModalMode('ADD');
    setSelectedElementId(null);
    setEditElementName(preset.defaultName);
    setEditElementType(preset.type);
    setEditElementWidth(preset.defaultWidth);
    setEditElementHeight(preset.defaultHeight);
    setEditElementRotation(0);
    setEditElementColor('');
    setIsElementModalOpen(true);
  };

  const handleOpenEditElement = (el: FloorElementData) => {
    setElementModalMode('EDIT');
    setSelectedElementId(el.id);
    setEditElementName(el.name);
    setEditElementType((el.type as FloorElementType) || 'DOOR');
    setEditElementWidth(el.width || 80);
    setEditElementHeight(el.height || 40);
    setEditElementRotation(el.rotation || 0);
    setEditElementColor(el.color || '');
    setIsElementModalOpen(true);
  };

  const handleSaveElement = async () => {
    if (!editElementName.trim()) {
      showToast('Nama elemen tidak boleh kosong', 'error');
      return;
    }
    setIsSavingElement(true);
    try {
      if (elementModalMode === 'ADD') {
        const res = await fetch('/api/admin/floor-elements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editElementName.trim(),
            type: editElementType,
            x: 50,
            y: 50,
            width: editElementWidth,
            height: editElementHeight,
            rotation: editElementRotation,
            color: editElementColor || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal menambahkan elemen');
        setFloorElements(prev => [...prev, data]);
        showToast(`Elemen "${data.name}" berhasil ditambahkan!`, 'success');
      } else if (selectedElementId) {
        const res = await fetch(`/api/admin/floor-elements/${selectedElementId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editElementName.trim(),
            type: editElementType,
            width: editElementWidth,
            height: editElementHeight,
            rotation: editElementRotation,
            color: editElementColor || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal memperbarui elemen');
        setFloorElements(prev => prev.map(el => el.id === selectedElementId ? data : el));
        showToast(`Elemen "${data.name}" diperbarui!`, 'success');
      }
      setIsElementModalOpen(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSavingElement(false);
    }
  };

  const handleDeleteElement = async (id: string) => {
    if (!confirm('Hapus elemen ini dari denah kafe?')) return;
    try {
      const res = await fetch(`/api/admin/floor-elements/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus elemen');
      setFloorElements(prev => prev.filter(el => el.id !== id));
      setIsElementModalOpen(false);
      showToast('Elemen denah berhasil dihapus', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Floor Element Dragging on canvas
  const elementDragInfo = useRef<{ elementId: string; startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);

  const handleStartElementDrag = (e: React.MouseEvent | React.TouchEvent, elementId: string) => {
    e.stopPropagation();
    const el = floorElements.find(item => item.id === elementId);
    if (!el) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    elementDragInfo.current = {
      elementId,
      startX: clientX,
      startY: clientY,
      origX: el.x,
      origY: el.y,
      moved: false,
    };

    window.addEventListener('mousemove', handleElementDragging);
    window.addEventListener('mouseup', handleEndElementDrag);
    window.addEventListener('touchmove', handleElementDragging);
    window.addEventListener('touchend', handleEndElementDrag);
  };

  const handleElementDragging = (e: MouseEvent | TouchEvent) => {
    if (!elementDragInfo.current || !canvasRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const deltaPixelX = clientX - elementDragInfo.current.startX;
    const deltaPixelY = clientY - elementDragInfo.current.startY;

    if (Math.abs(deltaPixelX) > 3 || Math.abs(deltaPixelY) > 3) {
      elementDragInfo.current.moved = true;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const deltaPercentX = (deltaPixelX / rect.width) * 100;
    const deltaPercentY = (deltaPixelY / rect.height) * 100;

    let newX = Math.round(elementDragInfo.current.origX + deltaPercentX);
    let newY = Math.round(elementDragInfo.current.origY + deltaPercentY);

    newX = Math.max(2, Math.min(98, newX));
    newY = Math.max(2, Math.min(98, newY));

    const elId = elementDragInfo.current.elementId;
    setFloorElements(prev => prev.map(item => item.id === elId ? { ...item, x: newX, y: newY } : item));
  };

  const handleEndElementDrag = async () => {
    if (!elementDragInfo.current) return;
    const { elementId, moved } = elementDragInfo.current;
    elementDragInfo.current = null;
    window.removeEventListener('mousemove', handleElementDragging);
    window.removeEventListener('mouseup', handleEndElementDrag);
    window.removeEventListener('touchmove', handleElementDragging);
    window.removeEventListener('touchend', handleEndElementDrag);

    if (moved) {
      const el = floorElements.find(item => item.id === elementId);
      if (el) {
        try {
          await fetch(`/api/admin/floor-elements/${elementId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x: el.x, y: el.y }),
          });
          showToast(`Posisi "${el.name}" disimpan`, 'info');
        } catch {}
      }
    } else {
      const el = floorElements.find(item => item.id === elementId);
      if (el) handleOpenEditElement(el);
    }
  };

  const fetchLiveTables = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/tables/live');
      if (res.ok) {
        const data = await res.json();
        if (data.tables) {
          const ordersMap: Record<string, any> = {};
          data.tables.forEach((t: any) => {
            if (t.primaryOrder) {
              ordersMap[t.id] = t.primaryOrder;
            }
          });
          setLiveOrdersMap(ordersMap);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchLiveTables();
    const interval = setInterval(fetchLiveTables, 6000);
    return () => clearInterval(interval);
  }, [fetchLiveTables]);

  const fetchTables = async () => {
    try {
      const res = await fetch('/api/admin/tables');
      if (res.ok) {
        const data = await res.json();
        setTables(data);
        fetchLiveTables();
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
          shape: editShape,
          x: 50,
          y: 50,
          rotation: editRotation || 0,
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menambahkan meja');

      showToast(`Meja ${editNumber} berhasil ditambahkan!`, 'success');
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
          shape: editShape,
          status: editStatus,
          rotation: editRotation,
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui meja');

      showToast(`Pengaturan Meja ${editNumber} tersimpan!`, 'success');
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

    let xPercent = Math.max(10, Math.min(90, ((clientX - rect.left) / rect.width) * 100));
    let yPercent = Math.max(10, Math.min(90, ((clientY - rect.top) / rect.height) * 100));

    if (snapToGrid) {
      xPercent = Math.round(xPercent / 2.5) * 2.5;
      yPercent = Math.round(yPercent / 2.5) * 2.5;
    }

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
  const availableCount = totalTables - occupiedCount;
  const occupancyPercent = totalTables > 0 ? Math.round((occupiedCount / totalTables) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C1917] p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
      
      {/* Top Header & Action Controls */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-[11px] font-bold tracking-wide">
              <UtensilsCrossed className="w-3.5 h-3.5 text-orange-600" />
              <span>Manajemen Denah Meja Kafe Arum Seduh</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
              Denah Ruangan & Studio Meja
            </h1>
            <p className="text-xs text-stone-500">
              Atur posisi denah meja, bentuk meja (kotak/bulat), rotasi orientasi, dan elemen ruangan (pintu, bar kasir, TV, rak) secara visual.
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
                <span>Klik Edit Meja</span>
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
              <span>Cetak Stiker Meja</span>
            </button>

            {/* Tambah Elemen Ruangan (Pintu, TV, Rak, Kasir/Bar) */}
            <button
              type="button"
              onClick={() => handleOpenAddElement()}
              className="px-3.5 py-2.5 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Tambah Pintu, TV, Rak, Kasir/Bar, Tanaman, dll."
            >
              <Box className="w-4 h-4 text-orange-600" />
              <span>+ Elemen Denah</span>
            </button>

            {/* Tambah Meja Button */}
            <button
              type="button"
              onClick={() => {
                setEditNumber((tables.length + 1).toString());
                setEditShape('RECTANGLE');
                setEditRotation(0);
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
          <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Meja Tersedia</p>
            <p className="font-serif text-2xl font-bold text-emerald-900 mt-1">{availableCount} Meja</p>
          </div>
          <div className="bg-orange-50/60 p-4 rounded-2xl border border-orange-200">
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-700">Okupansi Ruangan</p>
            <p className="font-serif text-2xl font-bold text-orange-900 mt-1">{occupancyPercent}%</p>
          </div>
        </div>
      </div>

      {/* Blueprint Floor Plan Canvas */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-orange-700">
              Denah Ruangan Kafe (Live Occupancy & Magnet Grid)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Mode Selector */}
            <div className="flex p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveCanvasMode('VIEW')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activeCanvasMode === 'VIEW' ? 'bg-white text-orange-600 shadow-sm' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Lihat & Edit
              </button>
              <button
                type="button"
                onClick={() => setActiveCanvasMode('MOVE_TABLE')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  activeCanvasMode === 'MOVE_TABLE' ? 'bg-orange-500 text-white shadow-sm' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Move className="w-3 h-3" /> Geser Meja
              </button>
              <button
                type="button"
                onClick={() => setActiveCanvasMode('MOVE_ELEMENT')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  activeCanvasMode === 'MOVE_ELEMENT' ? 'bg-orange-500 text-white shadow-sm' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <GripHorizontal className="w-3 h-3" /> Geser Elemen
              </button>
            </div>

            {/* Snap to Grid Toggle */}
            <button
              type="button"
              onClick={() => setSnapToGrid(!snapToGrid)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                snapToGrid
                  ? 'bg-orange-50 text-orange-700 border-orange-300 shadow-sm'
                  : 'bg-stone-50 text-stone-400 border-stone-200'
              }`}
              title="Aktifkan Magnet Grid 20px saat menggeser meja"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Magnet Grid: {snapToGrid ? 'ON' : 'OFF'}</span>
            </button>

            {/* Status Indicators */}
            <div className="hidden lg:flex items-center gap-3 text-xs font-semibold text-stone-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Tersedia</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Terisi</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Ditagih</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Dibersihkan</span>
            </div>
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
          <div className="absolute top-4 left-6 text-stone-400 text-[10px] font-mono tracking-widest uppercase pointer-events-none z-0">
            [Denah Skala 1:25 • Meja & Elemen Ruangan Kafe Arum Seduh]
          </div>

          {/* FLOOR ELEMENTS (Doors, TV, Shelves, Bar, Plant, Window, Restroom) */}
          {floorElements.map((el) => {
            const isSelected = selectedElementId === el.id;
            return (
              <div
                key={el.id}
                onMouseDown={(e) => handleStartElementDrag(e, el.id)}
                onTouchStart={(e) => handleStartElementDrag(e, el.id)}
                style={{
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  transform: 'translate(-50%, -50%)',
                  touchAction: 'none'
                }}
                className={`absolute select-none cursor-pointer flex items-center justify-center z-15 group ${
                  activeCanvasMode === 'MOVE_ELEMENT' ? 'cursor-grab active:cursor-grabbing' : ''
                }`}
              >
                <FloorElementVisual element={el} isSelected={isSelected} />
                
                {/* Drag Handle in Move Element Mode */}
                {activeCanvasMode === 'MOVE_ELEMENT' && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-md animate-bounce z-40">
                    <Move className="w-2.5 h-2.5" />
                  </div>
                )}
              </div>
            );
          })}

          {/* DINING TABLES */}
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
                className={`absolute select-none cursor-pointer flex items-center justify-center z-20 ${
                  activeCanvasMode === 'MOVE_TABLE' ? 'cursor-grab active:cursor-grabbing' : ''
                }`}
              >
                {/* Table Core Element */}
                <div
                  style={{
                    transform: `rotate(${table.rotation || 0}deg)`
                  }}
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

                  <span className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
                    isSelected ? 'text-white/90' : statusStyle.text
                  }`}>
                    {statusStyle.label}
                  </span>

                  {/* Move Handle when in move mode */}
                  {activeCanvasMode === 'MOVE_TABLE' && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-md animate-bounce z-40">
                      <Move className="w-3 h-3" />
                    </div>
                  )}
                </div>
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

      {/* DEDICATED TABLE STUDIO MODAL */}
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
              className="bg-white rounded-3xl w-full max-w-3xl p-6 sm:p-8 shadow-2xl relative z-10 border border-stone-200 max-h-[92vh] flex flex-col text-left space-y-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif font-bold text-2xl text-stone-900">
                      Studio Meja {selectedTable.number}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-xs font-bold">
                      {editShape === 'ROUND' ? 'Meja Bulat' : 'Meja Kotak'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500">
                    Atur bentuk meja, nomor meja, rotasi orientasi, status ketersediaan, dan kode QR meja.
                  </p>
                </div>

                <button
                  onClick={() => setIsStudioOpen(false)}
                  className="w-9 h-9 rounded-full border border-stone-200 flex items-center justify-center hover:bg-stone-50 cursor-pointer"
                >
                  <X className="w-4 h-4 text-stone-500" />
                </button>
              </div>

              {/* Studio Body */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start overflow-y-auto pr-1">
                
                {/* Left Column: Shape, Number, Status, Rotation */}
                <div className="md:col-span-6 space-y-4">
                  {/* Shape Switcher */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Bentuk Meja
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditShape('RECTANGLE')}
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
                        onClick={() => setEditShape('ROUND')}
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

                  {/* Table Number */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                      Nomor / Label Meja
                    </label>
                    <input
                      type="text"
                      value={editNumber}
                      onChange={(e) => setEditNumber(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  {/* Table Rotation Controls */}
                  <div className="space-y-2 p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                        <RotateCw className="w-3.5 h-3.5 text-orange-600" />
                        <span>Rotasi Orientasi Meja</span>
                      </label>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                        {editRotation}°
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRotateTable(90)}
                        className="flex-1 py-2 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Putar 90° Searah Jam</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRotateTable(-90)}
                        className="p-2 rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 font-bold text-xs flex items-center justify-center shadow-2xs transition-all cursor-pointer"
                        title="Putar 90° Berlawanan Arah Jam"
                      >
                        <RotateCw className="w-3.5 h-3.5 -scale-x-100" />
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-1 pt-0.5">
                      {[0, 90, 180, 270].map((deg) => (
                        <button
                          key={deg}
                          type="button"
                          onClick={() => setEditRotation(deg)}
                          className={`py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                            editRotation === deg
                              ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                              : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                          }`}
                        >
                          {deg}°
                        </button>
                      ))}
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
                </div>

                {/* Right Column: Visual Preview & QR Actions */}
                <div className="md:col-span-6 bg-[#FAF7F2] rounded-3xl border-2 border-stone-200 p-6 flex flex-col items-center justify-center space-y-4">
                  <div className="text-center">
                    <p className="text-[11px] font-bold text-orange-800 uppercase tracking-wider">
                      Pratinjau Orientasi Meja
                    </p>
                    <p className="text-[10px] text-stone-500">
                      Tampilan visual meja di denah kafe Arum Seduh
                    </p>
                  </div>

                  {/* Visual Preview Box */}
                  <div className="relative w-64 h-52 bg-white rounded-3xl border-2 border-stone-300 shadow-inner flex items-center justify-center select-none">
                    {editShape === 'ROUND' ? (
                      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 border-2 border-amber-400 shadow-md flex flex-col items-center justify-center p-2">
                        <span className="text-[8px] font-bold text-orange-800 uppercase tracking-wider">Bulat</span>
                        <span className="font-serif font-black text-sm text-stone-900 mt-0.5">MEJA {editNumber}</span>
                        <span className="text-[8px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full mt-1">
                          {getStatusColor(editStatus).label}
                        </span>
                      </div>
                    ) : (
                      <div 
                        style={{ transform: `rotate(${editRotation}deg)` }}
                        className="w-36 h-24 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 border-2 border-amber-400 shadow-md flex flex-col items-center justify-center p-2 transition-transform duration-300"
                      >
                        <span className="text-[8px] font-bold text-orange-800 uppercase tracking-wider">Kotak</span>
                        <span className="font-serif font-black text-sm text-stone-900 mt-0.5">MEJA {editNumber}</span>
                        <span className="text-[8px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full mt-1">
                          {getStatusColor(editStatus).label}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* QR Code Action */}
                  <div className="w-full p-3.5 rounded-2xl bg-white border border-stone-200 text-center space-y-2">
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
                      <Sparkles className="w-3.5 h-3.5" /> Cetak Stiker Meja {selectedTable.number} (Template Resmi)
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
                    {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan Meja'}
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
                      onClick={() => setEditShape('RECTANGLE')}
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
                      onClick={() => setEditShape('ROUND')}
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

      {/* FLOOR ELEMENT MODAL */}
      <AnimatePresence>
        {isElementModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full border border-stone-200 shadow-2xl space-y-5 text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                    <Box className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-stone-900">
                      {elementModalMode === 'ADD' ? 'Tambah Elemen Ruangan' : 'Edit Elemen Denah'}
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      Atur nama, tipe, ukuran (Px), dan sudut orientasi objek denah.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsElementModalOpen(false)}
                  className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tipe Elemen Picker */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Tipe Elemen Denah
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {FLOOR_ELEMENT_PRESETS.map((preset) => {
                    const isTypeSelected = editElementType === preset.type;
                    return (
                      <button
                        key={preset.type}
                        type="button"
                        onClick={() => {
                          setEditElementType(preset.type);
                          if (elementModalMode === 'ADD') {
                            setEditElementName(preset.defaultName);
                            setEditElementWidth(preset.defaultWidth);
                            setEditElementHeight(preset.defaultHeight);
                          }
                        }}
                        className={`p-2 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                          isTypeSelected
                            ? 'bg-orange-50 border-orange-500 text-orange-800 ring-2 ring-orange-500/20 font-bold shadow-xs'
                            : 'bg-stone-50 border-stone-200 text-stone-600 hover:border-stone-400 text-xs'
                        }`}
                      >
                        {preset.type === 'DOOR' && <DoorOpen className="w-4 h-4 text-amber-700" />}
                        {preset.type === 'TV' && <Tv className="w-4 h-4 text-sky-500" />}
                        {preset.type === 'SHELF' && <Archive className="w-4 h-4 text-[#8C5E35]" />}
                        {preset.type === 'BAR' && <Coffee className="w-4 h-4 text-amber-600" />}
                        {preset.type === 'PLANT' && <Flower2 className="w-4 h-4 text-emerald-600" />}
                        {preset.type === 'WINDOW' && <Columns className="w-4 h-4 text-cyan-600" />}
                        {preset.type === 'RESTROOM' && <Accessibility className="w-4 h-4 text-purple-600" />}
                        <span className="text-[10px] font-bold truncate w-full">{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nama Elemen */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                  Nama / Keterangan Elemen
                </label>
                <input
                  type="text"
                  value={editElementName}
                  onChange={(e) => setEditElementName(e.target.value)}
                  placeholder="Contoh: Pintu Utama, TV 55 Inch, Rak Biji Kopi..."
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Slider Ukuran */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#FAF7F2] border border-stone-200">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-stone-700">
                    <span>Lebar (Width)</span>
                    <span className="text-orange-600 font-mono">{editElementWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min={25}
                    max={280}
                    step={5}
                    value={editElementWidth}
                    onChange={(e) => setEditElementWidth(parseInt(e.target.value) || 60)}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-stone-400">
                    <span>25px</span>
                    <span>280px</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-stone-700">
                    <span>Tinggi (Height)</span>
                    <span className="text-orange-600 font-mono">{editElementHeight}px</span>
                  </div>
                  <input
                    type="range"
                    min={12}
                    max={160}
                    step={2}
                    value={editElementHeight}
                    onChange={(e) => setEditElementHeight(parseInt(e.target.value) || 20)}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-stone-400">
                    <span>12px</span>
                    <span>160px</span>
                  </div>
                </div>
              </div>

              {/* Rotasi Arah Elemen */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Rotasi Orientasi Elemen
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                    {editElementRotation}°
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[0, 90, 180, 270].map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => setEditElementRotation(deg)}
                      className={`py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        editElementRotation === deg
                          ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:border-stone-400'
                      }`}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-4 rounded-2xl bg-stone-100/70 border border-stone-200 flex flex-col items-center justify-center min-h-[90px] overflow-hidden">
                <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-2 pointer-events-none">
                  Pratinjau Tampilan Denah (Live Preview)
                </span>
                <FloorElementVisual
                  element={{
                    id: 'preview',
                    name: editElementName || 'Elemen',
                    type: editElementType,
                    x: 50,
                    y: 50,
                    width: editElementWidth,
                    height: editElementHeight,
                    rotation: editElementRotation,
                  }}
                  isSelected={false}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-stone-100">
                {elementModalMode === 'EDIT' && selectedElementId && (
                  <button
                    type="button"
                    onClick={() => handleDeleteElement(selectedElementId)}
                    className="p-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all"
                    title="Hapus Elemen dari Denah"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsElementModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSavingElement}
                  onClick={handleSaveElement}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingElement ? 'Menyimpan...' : elementModalMode === 'ADD' ? 'Tambahkan ke Denah' : 'Simpan Perubahan'}
                </button>
              </div>
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
