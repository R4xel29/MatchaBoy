'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Armchair,
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
import { getDefaultChairs, type CustomChair } from '@/app/(admin)/admin/tables/AdminTablesClient';

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
  const [loading, setLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedModalTable, setSelectedModalTable] = useState<LiveDiningTable | null>(null);
  const [clearingTableId, setClearingTableId] = useState<string | null>(null);

  const fetchLiveTables = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/tables/live');
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables || []);
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

  const getTableStatusConfig = (table: LiveDiningTable) => {
    const status = table.liveStatus || table.status;
    switch (status) {
      case 'READY':
        return {
          bg: 'bg-blue-500 text-white',
          border: 'border-blue-600 ring-4 ring-blue-500/30 shadow-lg shadow-blue-500/20',
          badge: 'Siap Saji',
          badgeBg: 'bg-blue-100 text-blue-800',
          indicator: 'bg-blue-400',
        };
      case 'OCCUPIED':
        return {
          bg: 'bg-gradient-to-br from-amber-500 to-orange-500 text-white',
          border: 'border-orange-600 ring-4 ring-orange-500/30 shadow-lg shadow-orange-500/20',
          badge: 'Sedang Seduh',
          badgeBg: 'bg-amber-100 text-amber-800',
          indicator: 'bg-amber-400',
        };
      case 'BILLING':
        return {
          bg: 'bg-purple-500 text-white',
          border: 'border-purple-600 ring-4 ring-purple-500/30 shadow-lg shadow-purple-500/20',
          badge: 'Menunggu Bayar',
          badgeBg: 'bg-purple-100 text-purple-800',
          indicator: 'bg-purple-400',
        };
      case 'CLEANING':
        return {
          bg: 'bg-rose-500 text-white',
          border: 'border-rose-600 ring-4 ring-rose-500/30 shadow-lg shadow-rose-500/20',
          badge: 'Dibersihkan',
          badgeBg: 'bg-rose-100 text-rose-800',
          indicator: 'bg-rose-400',
        };
      case 'AVAILABLE':
      default:
        return {
          bg: 'bg-white text-stone-800',
          border: 'border-emerald-500/80 hover:border-emerald-600 hover:shadow-md ring-2 ring-emerald-500/20',
          badge: 'Tersedia',
          badgeBg: 'bg-emerald-100 text-emerald-800',
          indicator: 'bg-emerald-500',
        };
    }
  };

  const occupiedCount = tables.filter((t) => t.primaryOrder !== null).length;

  if (!isOpen) return null;

  const content = (
    <div className="space-y-3">
      {/* Top bar inside minimap */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-stone-100">
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
          <div className="flex flex-wrap items-center gap-2.5 text-[10px] font-bold text-stone-600">
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

          {/* 2D Canvas Blueprint Container matching AdminTablesClient & SpmbClient */}
          <div
            className="relative w-full rounded-2xl bg-[#FAF7F2] border-2 border-stone-300 overflow-hidden select-none aspect-[16/10] min-h-[300px] sm:min-h-[360px]"
            style={{
              backgroundImage: 'radial-gradient(#F97316 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          >
            <div className="absolute top-2 left-3 text-stone-400 text-[8px] font-mono tracking-widest uppercase pointer-events-none">
              [Denah 2D Fisik • Klik Meja untuk Detail & Filter]
            </div>

            {/* Tables with surrounding physical chairs */}
            {tables.map((table) => {
              const config = getTableStatusConfig(table);
              const isSelected = selectedTableNumber === table.number;
              const hasOrder = table.primaryOrder !== null;
              const isRound = table.shape === 'ROUND';
              const chairs = getTableChairs(table);

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
                  className="absolute select-none cursor-pointer flex items-center justify-center z-10 group"
                >
                  {/* Table Core Element */}
                  <div
                    className={`relative flex flex-col items-center justify-center border-2 transition-all ${
                      isRound ? 'w-16 h-16 sm:w-20 sm:h-20 rounded-full' : 'w-20 h-14 sm:w-24 sm:h-16 rounded-2xl'
                    } ${config.bg} ${config.border} ${
                      isSelected ? 'ring-4 ring-orange-500 scale-110 z-30 shadow-xl' : 'shadow-md z-20 hover:scale-105'
                    }`}
                  >
                    <span className="text-[7px] font-bold uppercase tracking-wider px-1 py-0.2 rounded bg-black/10">
                      {isRound ? 'Bulat' : 'Kotak'}
                    </span>

                    <span className="font-serif font-black text-xs sm:text-sm leading-tight mt-0.5">
                      Meja {table.number}
                    </span>

                    <span className="text-[8px] font-bold opacity-85 mt-0.5 flex items-center gap-0.5">
                      <Armchair className="w-2.5 h-2.5" /> {table.capacity} Kursi
                    </span>

                    {hasOrder && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white animate-bounce z-30" />
                    )}
                  </div>

                  {/* Physical Chairs Surrounding The Table (Matching Studio & SPMB) */}
                  {chairs.map((chair) => (
                    <div
                      key={chair.id}
                      style={{
                        transform: `translate(${chair.x * 0.75}px, ${chair.y * 0.75}px)`,
                      }}
                      title={`Meja ${table.number} - Kursi ${chair.label}`}
                      className="absolute w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white border border-orange-400 text-orange-700 shadow-sm flex flex-col items-center justify-center pointer-events-none z-10"
                    >
                      <Armchair className="w-2.5 h-2.5 text-orange-600" />
                      <span className="font-serif font-black text-[6px] sm:text-[7px] leading-none text-stone-900">
                        {chair.label}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}

            {tables.length === 0 && !loading && (
              <div className="absolute inset-0 flex items-center justify-center text-stone-400 text-xs">
                Belum ada denah meja yang dikonfigurasi
              </div>
            )}
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
