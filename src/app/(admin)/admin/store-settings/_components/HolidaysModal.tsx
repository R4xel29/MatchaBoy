'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CalendarDateOption } from './types';

interface HolidaysModalProps {
  selectedCalDateStr: string | null;
  onClose: () => void;
  calDateOption: CalendarDateOption;
  setCalDateOption: (v: CalendarDateOption) => void;
  calCustomOpen: string;
  setCalCustomOpen: (v: string) => void;
  calCustomClose: string;
  setCalCustomClose: (v: string) => void;
  openTime: string;
  closeTime: string;
  applyCalendarDaySettings: () => void;
}

export function HolidaysModal({
  selectedCalDateStr,
  onClose,
  calDateOption,
  setCalDateOption,
  calCustomOpen,
  setCalCustomOpen,
  calCustomClose,
  setCalCustomClose,
  openTime,
  closeTime,
  applyCalendarDaySettings,
}: HolidaysModalProps) {
  return (
    <AnimatePresence>
      {selectedCalDateStr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl border border-slate-100 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 font-heading">
                <CalendarIcon className="w-4 h-4 text-orange-600" />
                Atur Tanggal:{' '}
                {new Date(`${selectedCalDateStr}T00:00:00`).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Pilih status operasional kedai pada tanggal ini</p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setCalDateOption('NORMAL')}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer',
                  calDateOption === 'NORMAL'
                    ? 'border-orange-500 bg-orange-50/60 text-orange-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                )}
              >
                <span>Buka Normal ({openTime} - {closeTime})</span>
                {calDateOption === 'NORMAL' && <span className="w-2 h-2 rounded-full bg-orange-500" />}
              </button>

              <button
                type="button"
                onClick={() => setCalDateOption('CLOSED')}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer',
                  calDateOption === 'CLOSED'
                    ? 'border-rose-500 bg-rose-50/60 text-rose-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                )}
              >
                <span>Tutup Kedai (Libur Khusus)</span>
                {calDateOption === 'CLOSED' && <span className="w-2 h-2 rounded-full bg-rose-500" />}
              </button>

              <button
                type="button"
                onClick={() => setCalDateOption('CUSTOM')}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer',
                  calDateOption === 'CUSTOM'
                    ? 'border-emerald-500 bg-emerald-50/60 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                )}
              >
                <span>Jam Buka Khusus</span>
                {calDateOption === 'CUSTOM' && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
              </button>
            </div>

            {calDateOption === 'CUSTOM' && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Jam Buka Khusus Tanggal Ini:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1">JAM BUKA</label>
                    <input
                      type="time"
                      value={calCustomOpen}
                      onChange={(e) => setCalCustomOpen(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1">JAM TUTUP</label>
                    <input
                      type="time"
                      value={calCustomClose}
                      onChange={(e) => setCalCustomClose(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={applyCalendarDaySettings}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-xs cursor-pointer"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
