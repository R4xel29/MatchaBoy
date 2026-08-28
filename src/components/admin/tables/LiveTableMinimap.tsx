'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  UtensilsCrossed,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ArrowRight,
  Flame,
  CreditCard,
  User,
  Coffee,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FloorElementVisual,
  type FloorElementData 
} from '@/app/(admin)/admin/tables/AdminTablesClient';

export interface LiveTableOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  status: string;
  total: number;
  paymentMethod: string;
  createdAt: string;
  notes?: string | null;
  items: {
    id: string;
    qty: number;
    price: number;
    productName: string;
    modifiers?: string | null;
  }[];
}

export interface LiveDiningTable {
  id: string;
  number: string;
  capacity: number;
  occupiedSeats: number;
  status: string;
  shape: string;
  x: number;
  y: number;
  rotation?: number;
  liveStatus: string; // AVAILABLE, OCCUPIED, READY, BILLING, CLEANING
  primaryOrder: LiveTableOrder | null;
  activeOrders: LiveTableOrder[];
  chairsJson?: string | null;
}

interface LiveTableMinimapProps {
  onSelectTable?: (tableNumber: string | null) => void;
  selectedTableNumber?: string | null;
  onRefreshOrders?: () => void;
  isFloating?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

const BASE_CANVAS_WIDTH = 1000;
const BASE_CANVAS_HEIGHT = 562.5; // 16:9

export function LiveTableMinimap({
  onSelectTable,
  selectedTableNumber,
  onRefreshOrders,
  isFloating = true,
  isOpen = true,
  onClose,
}: LiveTableMinimapProps) {
  const { showToast } = useToast();
  const [tables, setTables] = useState<LiveDiningTable[]>([]);
  const [floorElements, setFloorElements] = useState<FloorElementData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedModalTable, setSelectedModalTable] = useState<LiveDiningTable | null>(null);
  const [clearingTableId, setClearingTableId] = useState<string | null>(null);

  // Proportional Responsive Scaling
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState<number>(440);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateDimensions = () => {
      if (containerRef.current) {
        setCanvasWidth(containerRef.current.clientWidth || 440);
      }
    };
    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isMinimized, isOpen]);

  const scale = useMemo(() => {
    return Math.max(0.2, Math.min(1.2, canvasWidth / BASE_CANVAS_WIDTH));
  }, [canvasWidth]);

  const fetchLiveTables = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/tables/live');
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables || []);
        setFloorElements(data.floorElements || []);
      }
    } catch (err) {
      console.error('Error fetching live tables:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveTables();
    const interval = setInterval(fetchLiveTables, 5000); // 5s auto-poll
    return () => clearInterval(interval);
  }, [fetchLiveTables]);

  const handleClearTable = async (table: LiveDiningTable) => {
    setClearingTableId(table.id);
    try {
      const res = await fetch(`/api/admin/tables/${table.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CLEAR_TABLE',
          completeOrders: true,
        }),
      });

      if (!res.ok) throw new Error();

      showToast(`Meja ${table.number} berhasil dikosongkan!`, 'success');
      setSelectedModalTable(null);
      fetchLiveTables();
      if (onRefreshOrders) onRefreshOrders();
    } catch {
      showToast('Gagal mengosongkan meja', 'error');
    } finally {
      setClearingTableId(null);
    }
  };

  const getTableStatusConfig = (table: LiveDiningTable) => {
    const status = table.liveStatus || table.status;
    switch (status) {
      case 'READY':
        return {
          bg: 'bg-blue-500 text-white',
          border: 'border-blue-600 ring-4 ring-blue-500/30 shadow-lg shadow-blue-500/20',
          badge: 'Siap Saji',
          badgeBg: 'bg-blue-100 text-blue-800',
        };
      case 'OCCUPIED':
        return {
          bg: 'bg-gradient-to-br from-amber-500 to-orange-500 text-white',
          border: 'border-orange-600 ring-4 ring-orange-500/30 shadow-lg shadow-orange-500/20',
          badge: 'Sedang Seduh',
          badgeBg: 'bg-amber-100 text-amber-800',
        };
      case 'BILLING':
        return {
          bg: 'bg-purple-500 text-white',
          border: 'border-purple-600 ring-4 ring-purple-500/30 shadow-lg shadow-purple-500/20',
          badge: 'Menunggu Bayar',
          badgeBg: 'bg-purple-100 text-purple-800',
        };
      case 'CLEANING':
        return {
          bg: 'bg-rose-500 text-white',
          border: 'border-rose-600 ring-4 ring-rose-500/30 shadow-lg shadow-rose-500/20',
          badge: 'Dibersihkan',
          badgeBg: 'bg-rose-100 text-rose-800',
        };
      case 'AVAILABLE':
      default:
        return {
          bg: 'bg-white text-stone-800',
          border: 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md',
          badge: 'Tersedia',
          badgeBg: 'bg-emerald-100 text-emerald-800',
        };
    }
  };

  const occupiedCount = tables.filter((t) => t.primaryOrder !== null).length;

  if (!isOpen) return null;

  const content = (
    <div className="space-y-2.5">
      {/* Top bar inside minimap */}
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="font-heading font-extrabold text-xs sm:text-sm text-stone-900 flex items-center gap-1.5">
            <UtensilsCrossed className="w-4 h-4 text-orange-500" />
            Denah Meja Kafe Live
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold">
            {occupiedCount} Terisi
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {selectedTableNumber && (
            <button
              type="button"
              onClick={() => onSelectTable && onSelectTable(null)}
              className="text-[10px] text-orange-600 hover:text-orange-700 underline font-bold px-1.5 py-0.5"
            >
              Reset Filter
            </button>
          )}

          {isFloating && (
            <>
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                title={isMinimized ? 'Perbesar Denah' : 'Kecilkan Denah'}
              >
                {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                  title="Tutup Denah"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-stone-600">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Kosong
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Sedang Seduh
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Siap Diantar
            </span>
          </div>

          {/* 2D Canvas Container with Proportional Vector Scaling */}
          <div
            ref={containerRef}
            className="relative w-full rounded-2xl bg-[#FAF7F2] border-2 border-stone-300 overflow-hidden select-none shadow-inner"
            style={{
              height: `${BASE_CANVAS_HEIGHT * scale}px`,
            }}
          >
            {/* Scaled Inner Canvas - 1000 x 562.5 matches Admin Canvas 1:1 */}
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

              {/* Tables with exact positions and status */}
              {tables.map((table) => {
                const config = getTableStatusConfig(table);
                const isSelected = selectedTableNumber === table.number;
                const hasOrder = table.primaryOrder !== null;
                const isRound = table.shape === 'ROUND';

                return (
                  <div
                    key={table.id}
                    onClick={() => {
                      if (hasOrder) {
                        setSelectedModalTable(table);
                      }
                      if (onSelectTable) {
                        onSelectTable(isSelected ? null : table.number);
                      }
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
                        isRound ? 'w-24 h-24 rounded-full' : 'w-32 h-20 rounded-2xl'
                      } ${config.bg} ${config.border} ${
                        isSelected
                          ? 'ring-4 ring-orange-500/50 scale-105 z-30 shadow-2xl'
                          : 'shadow-md z-20 hover:scale-105'
                      }`}
                    >
                      <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/10">
                        {isRound ? 'Bulat' : 'Kotak'}
                      </span>

                      <span className="font-serif font-black text-sm leading-tight mt-0.5">
                        Meja {table.number}
                      </span>

                      <span className="text-[9px] font-bold uppercase tracking-wider opacity-90 mt-0.5">
                        {config.badge}
                      </span>

                      {hasOrder && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 border-2 border-white animate-bounce z-30 shadow" />
                      )}
                    </div>
                  </div>
                );
              })}

              {tables.length === 0 && !loading && (
                <div className="absolute inset-0 flex items-center justify-center text-stone-400 text-sm font-mono">
                  [Belum ada denah meja yang dikonfigurasi]
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Selected Table Active Order Modal */}
      <AnimatePresence>
        {selectedModalTable && selectedModalTable.primaryOrder && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedModalTable(null)}
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-stone-200 z-10 space-y-4 text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-serif font-bold text-base">
                    {selectedModalTable.number}
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-base text-stone-900">
                      Pesanan Meja {selectedModalTable.number}
                    </h3>
                    <p className="text-xs text-stone-500">
                      Status:{' '}
                      <strong className="text-orange-600 uppercase">
                        {selectedModalTable.primaryOrder.status}
                      </strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedModalTable(null)}
                  className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Order Info Body */}
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-stone-50 rounded-2xl space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-medium">Pemesan:</span>
                    <span className="font-bold text-stone-900">
                      {selectedModalTable.primaryOrder.customerName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-medium">Metode Pembayaran:</span>
                    <span className="font-bold text-stone-900">
                      {selectedModalTable.primaryOrder.paymentMethod}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-medium">Total Tagihan:</span>
                    <span className="font-extrabold text-orange-600 text-sm">
                      {formatRupiah(selectedModalTable.primaryOrder.total)}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Menu yang Dipesan:
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {selectedModalTable.primaryOrder.items.map((it) => (
                      <div
                        key={it.id}
                        className="p-2 rounded-xl bg-stone-50 flex justify-between items-center"
                      >
                        <div>
                          <p className="font-bold text-stone-800">
                            {it.qty}x {it.productName}
                          </p>
                          {it.modifiers && (
                            <p className="text-[10px] text-stone-400 truncate max-w-[200px]">
                              {it.modifiers}
                            </p>
                          )}
                        </div>
                        <span className="font-bold text-stone-700">
                          {formatRupiah(it.price * it.qty)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleClearTable(selectedModalTable)}
                  disabled={clearingTableId !== null}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Selesai / Kosongkan Meja {selectedModalTable.number}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  if (isFloating) {
    return (
      <div className="fixed bottom-6 right-6 z-50 max-w-sm sm:max-w-md w-full bg-white/95 backdrop-blur-md rounded-3xl border-2 border-orange-300/80 shadow-2xl p-4 animate-in slide-in-from-bottom-5 duration-300">
        {content}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden text-left p-4 sm:p-5">
      {content}
    </div>
  );
}
