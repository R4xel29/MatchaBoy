'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UtensilsCrossed, Check, Armchair, Loader2 } from 'lucide-react';
import type { LiveDiningTable } from '@/components/admin/tables/LiveTableMinimap';
import { getDefaultChairs, type CustomChair } from '@/app/(admin)/admin/tables/AdminTablesClient';

interface PosTablePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTable: (tableNumber: string) => void;
  currentSelectedTable?: string;
}

export function PosTablePickerModal({
  isOpen,
  onClose,
  onSelectTable,
  currentSelectedTable,
}: PosTablePickerModalProps) {
  const [tables, setTables] = useState<LiveDiningTable[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/tables/live');
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables || []);
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
          className="relative w-full max-w-3xl bg-white rounded-3xl p-6 shadow-2xl border border-stone-200 z-10 text-left space-y-4 max-h-[90vh] flex flex-col"
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
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
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

          {/* 2D Canvas */}
          <div
            className="relative w-full aspect-[16/9] min-h-[360px] rounded-2xl bg-[#FAF7F2] border-2 border-stone-300 overflow-hidden select-none flex-1"
            style={{
              backgroundImage: 'radial-gradient(#F97316 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          >
            <div className="absolute top-2 left-3 text-stone-400 text-[8px] font-mono tracking-widest uppercase pointer-events-none">
              [Denah 2D Fisik Kafe • Klik Meja untuk Memilih]
            </div>

            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center text-stone-400">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
              </div>
            ) : tables.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-stone-400 text-xs">
                Belum ada data meja
              </div>
            ) : (
              tables.map((table) => {
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
                    className="absolute select-none cursor-pointer flex items-center justify-center z-10 group"
                  >
                    {/* Table Core Element */}
                    <div
                      className={`relative flex flex-col items-center justify-center border-2 transition-all ${
                        isRound
                          ? 'w-16 h-16 sm:w-20 sm:h-20 rounded-full'
                          : 'w-20 h-14 sm:w-24 sm:h-16 rounded-2xl'
                      } ${
                        isSelected
                          ? 'bg-orange-500 text-white ring-4 ring-orange-500/30 scale-110 z-30 shadow-xl'
                          : isAvailable
                          ? 'bg-white text-stone-900 border-emerald-500 shadow-md hover:scale-105 hover:bg-emerald-50'
                          : 'bg-amber-100 text-amber-900 border-amber-400 shadow-sm opacity-80'
                      }`}
                    >
                      <span className="text-[7px] font-bold uppercase tracking-wider px-1 py-0.2 rounded bg-black/10">
                        {isRound ? 'Bulat' : 'Kotak'}
                      </span>

                      <span className="font-serif font-black text-xs sm:text-sm">
                        Meja {table.number}
                      </span>
                      <span className="text-[8px] font-bold opacity-80 mt-0.5">
                        {table.capacity} Kursi
                      </span>

                      {isSelected && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>

                    {/* Physical Chairs */}
                    {chairs.map((chair) => (
                      <div
                        key={chair.id}
                        style={{
                          transform: `translate(${chair.x * 0.75}px, ${chair.y * 0.75}px)`,
                        }}
                        className="absolute w-5 h-5 rounded-full bg-white border border-orange-400 text-orange-700 shadow-sm flex flex-col items-center justify-center pointer-events-none z-10"
                      >
                        <Armchair className="w-2.5 h-2.5 text-orange-600" />
                        <span className="font-serif font-black text-[6px] leading-none text-stone-900">
                          {chair.label}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })
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
