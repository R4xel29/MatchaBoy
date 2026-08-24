'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UtensilsCrossed, Check, Armchair, Loader2 } from 'lucide-react';
import type { LiveDiningTable } from '@/components/admin/tables/LiveTableMinimap';
import { 
  getDefaultChairs, 
  getChairVisualClass, 
  getChairIconClass, 
  FloorElementVisual,
  type CustomChair, 
  type FloorElementData 
} from '@/app/(admin)/admin/tables/AdminTablesClient';

interface PosTablePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTable: (tableNumber: string) => void;
  currentSelectedTable?: string;
}

const BASE_CANVAS_WIDTH = 1000;
const BASE_CANVAS_HEIGHT = 562.5; // 16:9

export function PosTablePickerModal({
  isOpen,
  onClose,
  onSelectTable,
  currentSelectedTable,
}: PosTablePickerModalProps) {
  const [tables, setTables] = useState<LiveDiningTable[]>([]);
  const [floorElements, setFloorElements] = useState<FloorElementData[]>([]);
  const [loading, setLoading] = useState(true);

  // Proportional Responsive Scaling
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState<number>(700);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const updateDimensions = () => {
      if (containerRef.current) {
        setCanvasWidth(containerRef.current.clientWidth || 700);
      }
    };
    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isOpen]);

  const scale = useMemo(() => {
    return Math.max(0.3, Math.min(1.2, canvasWidth / BASE_CANVAS_WIDTH));
  }, [canvasWidth]);

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/tables/live');
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables || []);
        setFloorElements(data.floorElements || []);
      }
    } catch (err) {
      console.error('Error fetching tables for POS picker:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchTables();
    }
  }, [isOpen, fetchTables]);

  const getTableChairs = (table: LiveDiningTable): CustomChair[] => {
    if (table.chairsJson) {
      try {
        const parsed = JSON.parse(table.chairsJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {}
    }
    return getDefaultChairs(table.capacity || 4, table.shape || 'RECTANGLE');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
          onClick={onClose}
        />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl bg-white rounded-3xl p-6 shadow-2xl border border-stone-200 z-10 text-left space-y-4 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-inner">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-stone-900">
                  Pilih Meja Dine-In dari Denah Visual
                </h3>
                <p className="text-xs text-stone-500">
                  Klik meja hijau (tersedia) untuk memasukkan nomor meja ke pesanan pelanggan.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs font-bold text-stone-600 shrink-0">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Meja Kosong (Tersedia)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Sedang Terisi / Dipersiapkan
            </span>
          </div>

          {/* 2D Canvas Container with Proportional Vector Scaling */}
          <div
            ref={containerRef}
            className="relative w-full rounded-2xl bg-[#FAF7F2] border-2 border-stone-300 overflow-hidden select-none shadow-inner flex-1"
            style={{
              height: `${BASE_CANVAS_HEIGHT * scale}px`,
              minHeight: '280px',
            }}
          >
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center text-stone-400">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
              </div>
            ) : (
              <div
                style={{
                  width: `${BASE_CANVAS_WIDTH}px`,
                  height: `${BASE_CANVAS_HEIGHT}px`,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  backgroundImage: 'radial-gradient(#F97316 1.5px, transparent 1.5px)',
                  backgroundSize: '24px 24px',
                }}
                className="relative select-none"
              >
                <div className="absolute top-3 left-4 text-stone-400 text-[10px] font-mono tracking-widest uppercase pointer-events-none z-0">
                  [Denah 2D Skala 1:25 • Spasi Proporsional]
                </div>

                {/* Floor Elements (Doors, TV, Shelves, Bar, etc.) */}
                {floorElements.map((el) => (
                  <div
                    key={el.id}
                    style={{
                      left: `${el.x}%`,
                      top: `${el.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className="absolute select-none pointer-events-none flex items-center justify-center z-10"
                  >
                    <FloorElementVisual element={el} />
                  </div>
                ))}

                {tables.map((table) => {
                  const isSelected = currentSelectedTable === table.number;
                  const isAvailable =
                    table.liveStatus === 'AVAILABLE' || table.status === 'AVAILABLE';
                  const isRound = table.shape === 'ROUND';
                  const chairs = getTableChairs(table);

                  return (
                    <div
                      key={table.id}
                      onClick={() => {
                        onSelectTable(table.number);
                        onClose();
                      }}
                      style={{
                        left: `${table.x}%`,
                        top: `${table.y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className="absolute select-none cursor-pointer flex items-center justify-center z-20 group"
                    >
                      {/* Table Core Element matching Admin Dimensions with Rotation */}
                      <div
                        style={{
                          transform: `rotate(${table.rotation || 0}deg)`,
                        }}
                        className={`relative flex flex-col items-center justify-center border-2 transition-all ${
                          isRound
                            ? 'w-24 h-24 rounded-full'
                            : 'w-32 h-20 rounded-2xl'
                        } ${
                          isSelected
                            ? 'bg-orange-500 text-white ring-4 ring-orange-500/40 scale-105 z-30 shadow-2xl'
                            : isAvailable
                            ? 'bg-white text-stone-900 border-emerald-500 shadow-md hover:scale-105 hover:bg-emerald-50'
                            : 'bg-amber-100 text-amber-900 border-amber-400 shadow-sm opacity-80'
                        }`}
                      >
                        <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/10">
                          {isRound ? 'Bulat' : 'Kotak'}
                        </span>

                        <span className="font-serif font-black text-sm leading-tight mt-0.5">
                          Meja {table.number}
                        </span>
                        <span className="text-[10px] font-semibold opacity-90 mt-0.5 flex items-center gap-1">
                          <Armchair className="w-3 h-3" /> {table.capacity} Kursi
                        </span>

                        {isSelected && (
                          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      {/* Physical Chairs with exact spacing and custom colors */}
                      {chairs.map((chair) => {
                        const visualClass = getChairVisualClass(chair.color, false);
                        const iconClass = getChairIconClass(chair.color, false);
                        return (
                          <div
                            key={chair.id}
                            style={{
                              transform: `translate(${chair.x}px, ${chair.y}px)`,
                            }}
                            title={`Meja ${table.number} - Kursi ${chair.label} (${chair.color || 'Putih'})`}
                            className={`absolute w-8 h-8 rounded-full border-2 shadow-sm flex flex-col items-center justify-center pointer-events-none z-10 transition-all ${visualClass}`}
                          >
                            <Armchair className={`w-3.5 h-3.5 ${iconClass}`} />
                            <span className="font-serif font-black text-[8px] leading-none mt-0.5">
                              {chair.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                {tables.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-stone-400 text-sm font-mono">
                    [Belum ada data meja]
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-100 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
