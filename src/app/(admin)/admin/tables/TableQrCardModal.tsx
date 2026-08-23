'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import jsPDF from 'jspdf';
import { 
  X, Download, Printer, Sliders, RotateCcw, Image as ImageIcon,
  ChevronLeft, ChevronRight, Sparkles, Check, Upload, Move, Eye, Layers, Copy,
  FileText, FileCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/Toast';

export interface DiningTableData {
  id: string;
  number: string;
  capacity: number;
  status: string;
  shape: string;
}

export interface CardLayoutSettings {
  // Relative percentages (0 - 100) based on template width & height
  qrX: number;       // Top-Left X %
  qrY: number;       // Top-Left Y %
  qrSize: number;    // Width/Height as % of card width
  
  numX: number;      // Center X %
  numY: number;      // Center Y %
  numFontSize: number; // Font size in pixels at base 1204px width
  numColor: string;  // Hex color for table number
  
  customTemplateUrl?: string; // Optional custom uploaded template
}

const DEFAULT_SETTINGS: CardLayoutSettings = {
  qrX: 11.2,          // ~135px in 1204px width (perfect horizontal fit in white box)
  qrY: 26.2,          // ~455px in 1736px height (perfect vertical fit in white box)
  qrSize: 43.5,       // ~524px in 1204px width (leaves comfortable white padding inside black rounded frame)
  
  numX: 79.6,         // Centered under "MEJA NO." (~958px in 1204px width)
  numY: 45.2,         // Centered in number slot (~785px in 1736px height)
  numFontSize: 260,    // Large, bold number
  numColor: '#FFFFFF',
};

const STORAGE_KEY = 'arum_table_card_layout_settings_v4';
const DEFAULT_TEMPLATE_SRC = '/brand/table-qr-template-blank.png';

interface TableQrCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: DiningTableData[];
  initialTableId?: string | null;
}

export default function TableQrCardModal({
  isOpen,
  onClose,
  tables,
  initialTableId
}: TableQrCardModalProps) {
  const { showToast } = useToast();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [settings, setSettings] = useState<CardLayoutSettings>(DEFAULT_SETTINGS);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0 });
  const [templateSrc, setTemplateSrc] = useState(DEFAULT_TEMPLATE_SRC);
  const [isDragging, setIsDragging] = useState<'QR' | 'NUM' | null>(null);
  const [printLayout, setPrintLayout] = useState<'A4_DUAL' | 'A6_SINGLE'>('A4_DUAL');

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenQrRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize selected table
  useEffect(() => {
    if (initialTableId && tables.length > 0) {
      const idx = tables.findIndex(t => t.id === initialTableId);
      if (idx !== -1) setSelectedIdx(idx);
    }
  }, [initialTableId, tables]);

  // Load saved settings from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
          if (parsed.customTemplateUrl) {
            setTemplateSrc(parsed.customTemplateUrl);
          }
        } catch {}
      }
    }
  }, []);

  const currentTable = tables[selectedIdx] || tables[0] || { id: 'temp', number: '1', capacity: 4 };

  const getTableUrl = useCallback((num: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/spmb?table=${encodeURIComponent(num)}`;
    }
    return `https://arumseduh.com/spmb?table=${encodeURIComponent(num)}`;
  }, []);

  // Save settings helper
  const updateSettings = (newSettings: Partial<CardLayoutSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleResetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    setTemplateSrc(DEFAULT_TEMPLATE_SRC);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    showToast('Posisi direset ke setelan standar bawaan', 'info');
  };

  // Upload custom template image
  const handleCustomTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setTemplateSrc(result);
        updateSettings({ customTemplateUrl: result });
        showToast('Template gambar berhasil diperbarui', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  // Draw Card onto Canvas (High-Res 1204 x 1736)
  const drawCardToCanvas = useCallback(async (
    canvas: HTMLCanvasElement, 
    tableNum: string, 
    layout: CardLayoutSettings, 
    bgSrc: string
  ): Promise<void> => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const targetWidth = 1204;
    const targetHeight = 1736;
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // 1. Draw Template Background
    await new Promise<void>((resolve, reject) => {
      const bgImg = new Image();
      bgImg.crossOrigin = 'anonymous';
      bgImg.onload = () => {
        ctx.drawImage(bgImg, 0, 0, targetWidth, targetHeight);
        resolve();
      };
      bgImg.onerror = () => {
        // Fallback orange gradient if image fails
        const grad = ctx.createLinearGradient(0, 0, targetWidth, targetHeight);
        grad.addColorStop(0, '#f97316');
        grad.addColorStop(1, '#ea580c');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        resolve();
      };
      bgImg.src = bgSrc;
    });

    // 2. Draw High-Resolution QR Code
    // We get QR from the rendered QRCodeCanvas
    const qrCanvas = document.getElementById(`qr-gen-source-${tableNum}`) as HTMLCanvasElement;
    if (qrCanvas) {
      const qrPixelX = (layout.qrX / 100) * targetWidth;
      const qrPixelY = (layout.qrY / 100) * targetHeight;
      const qrPixelSize = (layout.qrSize / 100) * targetWidth;

      // Draw rounded white backing for crispness if desired, or draw QR directly
      ctx.drawImage(qrCanvas, qrPixelX, qrPixelY, qrPixelSize, qrPixelSize);
    }

    // 3. Draw Dynamic Table Number
    const numPixelX = (layout.numX / 100) * targetWidth;
    const numPixelY = (layout.numY / 100) * targetHeight;

    // Adjust font size dynamically if table number is long (e.g. "VIP-1", "Outdoor 2")
    let dynamicFontSize = layout.numFontSize;
    if (tableNum.length > 2) {
      dynamicFontSize = Math.round(layout.numFontSize * Math.max(0.5, 2.5 / tableNum.length));
    }

    ctx.save();
    ctx.fillStyle = layout.numColor;
    ctx.font = `900 ${dynamicFontSize}px "Arial Black", "Arial-BoldMT", Impact, "Segoe UI Black", "Montserrat", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Add subtle shadow for extra contrast
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;

    ctx.fillText(tableNum, numPixelX, numPixelY);
    ctx.restore();
  }, []);

  // Update live preview canvas whenever table, settings, or template changes
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (previewCanvasRef.current && currentTable) {
        drawCardToCanvas(previewCanvasRef.current, currentTable.number, settings, templateSrc);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, currentTable, settings, templateSrc, drawCardToCanvas]);

  // Download Single Card PNG (HD 300 DPI)
  const handleDownloadSingle = async () => {
    if (!currentTable) return;
    const canvas = document.createElement('canvas');
    await drawCardToCanvas(canvas, currentTable.number, settings, templateSrc);

    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `Stiker-Meja-${currentTable.number}-Arus-Arum-Seduh.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Kartu Meja ${currentTable.number} berhasil diunduh (HD PNG)`, 'success');
  };

  // Download Batch Cards (All Tables sequentially)
  const handleDownloadBatch = async () => {
    if (tables.length === 0) return;

    setIsBatchGenerating(true);
    setBatchProgress({ current: 0, total: tables.length });

    try {
      const canvas = document.createElement('canvas');

      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        setBatchProgress({ current: i + 1, total: tables.length });

        await drawCardToCanvas(canvas, table.number, settings, templateSrc);

        const dataUrl = canvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `Stiker-Meja-${table.number}-Arus-Arum-Seduh.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Small delay between downloads to prevent browser throttling
        await new Promise(r => setTimeout(r, 250));
      }

      showToast(`Berhasil mengunduh ${tables.length} kartu meja!`, 'success');
    } catch (err: any) {
      showToast('Gagal mengunduh kartu meja', 'error');
    } finally {
      setIsBatchGenerating(false);
    }
  };

  // Download Combined Multi-page PDF (All Tables in 1 single PDF file)
  const handleDownloadPdfAll = async () => {
    if (tables.length === 0) return;

    setIsPdfGenerating(true);
    setPdfProgress({ current: 0, total: tables.length });

    try {
      // Dimensions matching the card ratio: 105mm x 151.4mm (standard standing banner size)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [105, 151.4],
        compress: true,
      });

      const canvas = document.createElement('canvas');

      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        setPdfProgress({ current: i + 1, total: tables.length });

        await drawCardToCanvas(canvas, table.number, settings, templateSrc);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

        if (i > 0) {
          doc.addPage([105, 151.4], 'portrait');
        }

        doc.addImage(dataUrl, 'JPEG', 0, 0, 105, 151.4, undefined, 'FAST');
      }

      doc.save(`Semua-Kartu-Meja-Arus-Arum-Seduh.pdf`);
      showToast(`Berhasil membuat 1 file PDF untuk ${tables.length} meja!`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Gagal membuat file PDF', 'error');
    } finally {
      setIsPdfGenerating(false);
    }
  };

  // Download Single Table PDF
  const handleDownloadPdfSingle = async () => {
    if (!currentTable) return;
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [105, 151.4],
        compress: true,
      });

      const canvas = document.createElement('canvas');
      await drawCardToCanvas(canvas, currentTable.number, settings, templateSrc);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

      doc.addImage(dataUrl, 'JPEG', 0, 0, 105, 151.4, undefined, 'FAST');
      doc.save(`Kartu-Meja-${currentTable.number}-Arus-Arum-Seduh.pdf`);
      showToast(`PDF Meja ${currentTable.number} berhasil diunduh`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Gagal mengunduh PDF meja', 'error');
    }
  };

  // Interactive Dragging in Calibration Mode
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCalibrating) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    // Check if click is near QR code or Number
    const distToQR = Math.hypot(clickX - (settings.qrX + settings.qrSize / 2), clickY - (settings.qrY + settings.qrSize / 2));
    const distToNum = Math.hypot(clickX - settings.numX, clickY - settings.numY);

    if (distToNum < 15) {
      setIsDragging('NUM');
    } else if (distToQR < 25) {
      setIsDragging('QR');
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !isCalibrating) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
    const mouseY = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100));

    if (isDragging === 'QR') {
      updateSettings({
        qrX: Math.round(mouseX - settings.qrSize / 2),
        qrY: Math.round(mouseY - settings.qrSize / 2)
      });
    } else if (isDragging === 'NUM') {
      updateSettings({
        numX: Math.round(mouseX),
        numY: Math.round(mouseY)
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(null);
  };

  // Direct Print via Window.print
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl relative z-10 border border-stone-200 flex flex-col max-h-[92vh] overflow-hidden text-left"
        >
          {/* Hidden QR Generator Canvas for all tables */}
          <div className="hidden">
            {tables.map(t => (
              <QRCodeCanvas
                key={t.id}
                id={`qr-gen-source-${t.number}`}
                value={getTableUrl(t.number)}
                size={800}
                level="H"
                marginSize={0}
              />
            ))}
          </div>

          {/* Top Bar */}
          <div className="p-5 sm:px-8 border-b border-stone-100 flex items-center justify-between bg-stone-50/50 flex-wrap gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-orange-500 text-white shadow-sm shadow-orange-500/30">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h2 className="font-serif font-bold text-xl sm:text-2xl text-stone-900">
                  Generator Stiker & Kartu Meja QR
                </h2>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-bold">
                  Template Resmi Arus
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Otomatis menghasilkan kartu nomor meja beresolusi tinggi dengan kode QR aktif & nomor meja siap cetak.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCalibrating(!isCalibrating)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                  isCalibrating 
                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm' 
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{isCalibrating ? 'Tutup Kalibrasi' : 'Atur / Geser Posisi'}</span>
              </button>

              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full border border-stone-200 flex items-center justify-center hover:bg-stone-100 text-stone-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Body: Left Canvas & Right Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-5 sm:p-8 overflow-y-auto flex-1 items-start">
            
            {/* Left: Interactive Canvas Card Preview */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center space-y-4">
              
              {/* Table Switcher Bar */}
              <div className="w-full max-w-xs flex items-center justify-between bg-stone-100 p-1.5 rounded-2xl border border-stone-200">
                <button
                  type="button"
                  disabled={selectedIdx <= 0}
                  onClick={() => setSelectedIdx(prev => Math.max(0, prev - 1))}
                  className="w-8 h-8 rounded-xl bg-white border border-stone-200 flex items-center justify-center hover:bg-stone-50 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 text-stone-700" />
                </button>

                <div className="text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                    PILIH MEJA ({selectedIdx + 1} dari {tables.length})
                  </span>
                  <select
                    value={selectedIdx}
                    onChange={(e) => setSelectedIdx(parseInt(e.target.value))}
                    className="bg-transparent font-serif font-bold text-sm text-stone-900 focus:outline-none cursor-pointer"
                  >
                    {tables.map((t, idx) => (
                      <option key={t.id} value={idx}>
                        Meja {t.number} ({t.capacity} Kursi)
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  disabled={selectedIdx >= tables.length - 1}
                  onClick={() => setSelectedIdx(prev => Math.min(tables.length - 1, prev + 1))}
                  className="w-8 h-8 rounded-xl bg-white border border-stone-200 flex items-center justify-center hover:bg-stone-50 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4 text-stone-700" />
                </button>
              </div>

              {/* Visual Card Container */}
              <div 
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                className={`relative w-full max-w-sm aspect-[1204/1736] rounded-3xl shadow-xl border-4 border-white bg-stone-200 overflow-hidden select-none ${
                  isCalibrating ? 'cursor-crosshair ring-4 ring-orange-500/30' : ''
                }`}
              >
                <canvas
                  ref={previewCanvasRef}
                  className="w-full h-full object-contain pointer-events-none"
                />

                {/* Calibration Visual Overlay Indicators */}
                {isCalibrating && (
                  <div className="absolute inset-0 pointer-events-none">
                    {/* QR Bounding Box */}
                    <div
                      style={{
                        left: `${settings.qrX}%`,
                        top: `${settings.qrY}%`,
                        width: `${settings.qrSize}%`,
                        height: `${(settings.qrSize * 1204) / 1736}%`,
                      }}
                      className="absolute border-2 border-dashed border-blue-500 bg-blue-500/10 rounded-xl flex items-center justify-center pointer-events-auto cursor-grab active:cursor-grabbing"
                    >
                      <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                        Area QR Code
                      </span>
                    </div>

                    {/* Number Bounding Indicator */}
                    <div
                      style={{
                        left: `${settings.numX}%`,
                        top: `${settings.numY}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className="absolute w-28 h-20 border-2 border-dashed border-amber-500 bg-amber-500/10 rounded-xl flex items-center justify-center pointer-events-auto cursor-grab active:cursor-grabbing"
                    >
                      <span className="bg-amber-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                        Area No Meja
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-stone-500 text-center max-w-xs">
                {isCalibrating 
                  ? '💡 Tarik kotak QR Code atau Area Nomor Meja untuk menggeser posisinya secara bebas' 
                  : `Preview langsung Meja ${currentTable.number} • Siap cetak ke akrilik standing banner atau stiker meja`}
              </p>
            </div>

            {/* Right: Actions, Batch Download, Print Options & Calibration Sliders */}
            <div className="lg:col-span-6 space-y-5">
              
              {/* Main Action Buttons */}
              <div className="bg-[#FAF7F2] p-5 rounded-3xl border border-stone-200 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Opsi Unduh & Cetak
                  </p>
                  <span className="text-[10px] font-bold text-orange-700 bg-orange-100/70 px-2 py-0.5 rounded-md">
                    {tables.length} Meja Terdaftar
                  </span>
                </div>

                {/* Section: Semua Meja (1 File PDF & Batch) */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                    Unduh Semua Meja Sekaligus
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* PDF All-In-One (1 File PDF Gabungan) */}
                    <button
                      type="button"
                      disabled={isPdfGenerating || isBatchGenerating}
                      onClick={handleDownloadPdfAll}
                      className="p-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-red-600/20 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <FileText className="w-4 h-4 text-white shrink-0" />
                      <span className="truncate">
                        {isPdfGenerating
                          ? `Membuat PDF (${pdfProgress.current}/${pdfProgress.total})...`
                          : `Unduh Semua (1 File PDF)`}
                      </span>
                    </button>

                    {/* Batch PNG Terpisah */}
                    <button
                      type="button"
                      disabled={isBatchGenerating || isPdfGenerating}
                      onClick={handleDownloadBatch}
                      className="p-3.5 rounded-2xl bg-stone-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Layers className="w-4 h-4 text-orange-400 shrink-0" />
                      <span className="truncate">
                        {isBatchGenerating 
                          ? `Mengunduh (${batchProgress.current}/${batchProgress.total})...` 
                          : `Unduh Semua (Batch PNG)`}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Section: Meja Terpilih Saat Ini */}
                <div className="space-y-2 pt-2 border-t border-stone-200/70">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                    Unduh Meja {currentTable.number} Saja
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Single HD PNG */}
                    <button
                      type="button"
                      onClick={handleDownloadSingle}
                      className="p-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh PNG HD (Meja {currentTable.number})</span>
                    </button>

                    {/* Single PDF */}
                    <button
                      type="button"
                      onClick={handleDownloadPdfSingle}
                      className="p-3 rounded-2xl bg-white hover:bg-red-50 text-red-700 border border-red-200 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-red-600" />
                      <span>Unduh PDF (Meja {currentTable.number})</span>
                    </button>
                  </div>
                </div>

                {/* Print Sheet Action */}
                <div className="pt-2 border-t border-stone-200/70">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="w-full p-3.5 rounded-2xl bg-white hover:bg-stone-50 border-2 border-stone-200 hover:border-stone-300 text-stone-800 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                  >
                    <Printer className="w-4 h-4 text-stone-700" />
                    <span>Cetak Langsung (Browser Print Preview)</span>
                  </button>
                </div>
              </div>

              {/* SPMB Link Info */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-stone-600">Link Tujuan Scan QR:</span>
                  <span className="text-orange-700 font-mono text-[10px] bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                    Otomatis Terkunci ke Meja {currentTable.number}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-stone-200 font-mono text-[11px] text-stone-600 break-all select-all">
                  {getTableUrl(currentTable.number)}
                </div>
              </div>

              {/* Calibration & Fine Tuning Controls (When open) */}
              {isCalibrating && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white p-5 rounded-3xl border-2 border-orange-200 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-800 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" /> Kalibrasi Presisi Posisi
                    </span>
                    <button
                      type="button"
                      onClick={handleResetSettings}
                      className="text-[11px] font-bold text-stone-500 hover:text-orange-600 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset Default
                    </button>
                  </div>

                  {/* QR Controls */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Ukuran & Posisi QR Code
                    </p>
                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-[10px] font-semibold text-stone-500 block">Ukuran QR ({settings.qrSize}%)</label>
                        <input
                          type="range"
                          min={20}
                          max={60}
                          step={0.5}
                          value={settings.qrSize}
                          onChange={(e) => updateSettings({ qrSize: parseFloat(e.target.value) })}
                          className="w-full accent-orange-500 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-stone-500 block">Posisi X ({settings.qrX}%)</label>
                        <input
                          type="range"
                          min={2}
                          max={40}
                          step={0.5}
                          value={settings.qrX}
                          onChange={(e) => updateSettings({ qrX: parseFloat(e.target.value) })}
                          className="w-full accent-orange-500 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-stone-500 block">Posisi Y ({settings.qrY}%)</label>
                        <input
                          type="range"
                          min={10}
                          max={50}
                          step={0.5}
                          value={settings.qrY}
                          onChange={(e) => updateSettings({ qrY: parseFloat(e.target.value) })}
                          className="w-full accent-orange-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Number Controls */}
                  <div className="space-y-2 pt-2 border-t border-stone-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Ukuran & Posisi Nomor Meja
                    </p>
                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-[10px] font-semibold text-stone-500 block">Ukuran Font ({settings.numFontSize}px)</label>
                        <input
                          type="range"
                          min={100}
                          max={400}
                          value={settings.numFontSize}
                          onChange={(e) => updateSettings({ numFontSize: parseInt(e.target.value) })}
                          className="w-full accent-orange-500 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-stone-500 block">Posisi X ({settings.numX}%)</label>
                        <input
                          type="range"
                          min={50}
                          max={95}
                          step={0.5}
                          value={settings.numX}
                          onChange={(e) => updateSettings({ numX: parseFloat(e.target.value) })}
                          className="w-full accent-orange-500 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-stone-500 block">Posisi Y ({settings.numY}%)</label>
                        <input
                          type="range"
                          min={20}
                          max={70}
                          step={0.5}
                          value={settings.numY}
                          onChange={(e) => updateSettings({ numY: parseFloat(e.target.value) })}
                          className="w-full accent-orange-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Custom Background Template Upload */}
                  <div className="pt-2 border-t border-stone-100">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCustomTemplateUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2.5 rounded-xl border border-dashed border-stone-300 hover:border-orange-500 text-stone-600 hover:text-orange-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-stone-50/50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Ganti / Upload Template Gambar Sendiri</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* SPECIAL PRINT-ONLY STYLES & LAYOUT (Triggered by Ctrl+P or Print Button) */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-sheet-container, #print-sheet-container * {
            visibility: visible;
          }
          #print-sheet-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            padding: 0;
            margin: 0;
          }
          .print-card-item {
            page-break-inside: avoid;
            page-break-after: always;
            box-shadow: none !important;
            border: 1px solid #e5e5e5 !important;
          }
        }
      `}</style>

      {/* Hidden container formatted specifically for browser printing */}
      <div id="print-sheet-container" className="hidden print:block">
        <div className="p-8 space-y-12">
          {tables.map((table) => {
            return (
              <div 
                key={table.id}
                className="print-card-item relative w-[480px] h-[692px] mx-auto rounded-2xl overflow-hidden bg-white border border-stone-300"
              >
                {/* Render full card */}
                <PrintCardSingle
                  table={table}
                  settings={settings}
                  templateSrc={templateSrc}
                  getTableUrl={getTableUrl}
                />
              </div>
            );
          })}
        </div>
      </div>
    </AnimatePresence>
  );
}

// Single Card Element for Print rendering
function PrintCardSingle({
  table,
  settings,
  templateSrc,
  getTableUrl
}: {
  table: DiningTableData;
  settings: CardLayoutSettings;
  templateSrc: string;
  getTableUrl: (num: string) => string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const targetWidth = 1204;
    const targetHeight = 1736;
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';
    bgImg.onload = () => {
      ctx.drawImage(bgImg, 0, 0, targetWidth, targetHeight);

      // Draw QR Code
      const qrCanvas = document.getElementById(`qr-gen-source-${table.number}`) as HTMLCanvasElement;
      if (qrCanvas) {
        const qrPixelX = (settings.qrX / 100) * targetWidth;
        const qrPixelY = (settings.qrY / 100) * targetHeight;
        const qrPixelSize = (settings.qrSize / 100) * targetWidth;
        ctx.drawImage(qrCanvas, qrPixelX, qrPixelY, qrPixelSize, qrPixelSize);
      }

      // Draw Number
      const numPixelX = (settings.numX / 100) * targetWidth;
      const numPixelY = (settings.numY / 100) * targetHeight;

      let dynamicFontSize = settings.numFontSize;
      if (table.number.length > 2) {
        dynamicFontSize = Math.round(settings.numFontSize * Math.max(0.5, 2.5 / table.number.length));
      }

      ctx.save();
      ctx.fillStyle = settings.numColor;
      ctx.font = `900 ${dynamicFontSize}px "Arial Black", "Arial-BoldMT", Impact, "Segoe UI Black", "Montserrat", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(table.number, numPixelX, numPixelY);
      ctx.restore();
    };
    bgImg.src = templateSrc;
  }, [table, settings, templateSrc]);

  return (
    <div className="w-full h-full relative">
      <canvas ref={canvasRef} className="w-full h-full object-contain" />
    </div>
  );
}
