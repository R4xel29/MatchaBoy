'use client';

import React from 'react';
import {
  Clock,
  ShieldCheck,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CalendarDayItem, CustomHoursConfig } from './types';

interface OperatingHoursTabProps {
  openTime: string;
  setOpenTime: (v: string) => void;
  closeTime: string;
  setCloseTime: (v: string) => void;
  operationalDays: number[];
  toggleOperationalDay: (dayIndex: number) => void;
  customHours: CustomHoursConfig;
  setCustomHours: React.Dispatch<React.SetStateAction<CustomHoursConfig>>;
  disabledDates: string[];
  toggleDisabledDate: (dateStr: string) => void;
  currentCalendarDate: Date;
  prevMonth: () => void;
  nextMonth: () => void;
  calendarDays: CalendarDayItem[];
  handleCalendarDayClick: (dateString: string) => void;
}

export function OperatingHoursTab({
  openTime,
  setOpenTime,
  closeTime,
  setCloseTime,
  operationalDays,
  toggleOperationalDay,
  customHours,
  setCustomHours,
  disabledDates,
  toggleDisabledDate,
  currentCalendarDate,
  prevMonth,
  nextMonth,
  calendarDays,
  handleCalendarDayClick,
}: OperatingHoursTabProps) {
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Banner Penyatuan Jam Operasional */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/80 rounded-3xl p-4.5 flex items-start gap-3.5 shadow-2xs">
        <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/20">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="text-xs space-y-1">
          <h4 className="font-extrabold text-orange-950 text-sm">
            Jam Operasional Terpadu (Toko & SPMB Menjadi 1)
          </h4>
          <p className="text-orange-900/80 leading-relaxed">
            Jam buka dan jam tutup di bawah ini menjadi <strong>satu-satunya acuan operasional resmi</strong>. Seluruh pesanan dari storefront reguler, makan di tempat (Dine-in), penjemputan (Pickup), dan pengantaran SPMB beroperasi dalam rentang waktu yang sama secara konsisten.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card: Jam Buka & Tutup Utama */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
              <Clock className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm font-heading">
                Jam Operasional Harian
              </h3>
              <p className="text-[11px] text-slate-400">Jam buka dan tutup standar kedai</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Jam Buka (WIB)
              </label>
              <input
                type="time"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                className="w-full px-3 py-2 text-base font-extrabold text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Mulai terima order
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Jam Tutup (WIB)
              </label>
              <input
                type="time"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className="w-full px-3 py-2 text-base font-extrabold text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Batas akhir checkout
              </span>
            </div>
          </div>

          {/* Hari Operasional Mingguan */}
          <div className="pt-2">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Hari Buka Mingguan (Pilih Hari Aktif)
            </label>
            <div className="flex flex-wrap gap-2">
              {['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((dayName, idx) => {
                const isActive = operationalDays.includes(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleOperationalDay(idx)}
                    className={cn(
                      'px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95',
                      isActive
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    )}
                  >
                    {dayName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Jam Khusus Hari Tertentu */}
          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <h4 className="text-xs font-extrabold text-slate-900">
              Jam Khusus Hari Tertentu (Opsional)
            </h4>
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((dayName, idx) => {
                if (!operationalDays.includes(idx)) return null;
                const hasOverride = !!customHours.weekdays?.[String(idx)];
                const overrideOpen = customHours.weekdays?.[String(idx)]?.openTime || openTime;
                const overrideClose = customHours.weekdays?.[String(idx)]?.closeTime || closeTime;

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 p-2 rounded-xl bg-slate-50 text-xs"
                  >
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={hasOverride}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setCustomHours((prev) => {
                            const weekdays = { ...(prev.weekdays || {}) };
                            if (checked) {
                              weekdays[String(idx)] = { openTime, closeTime };
                            } else {
                              delete weekdays[String(idx)];
                            }
                            return { ...prev, weekdays };
                          });
                        }}
                        className="rounded text-orange-500 focus:ring-orange-400"
                      />
                      <span>{dayName}</span>
                    </label>

                    {hasOverride && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="time"
                          value={overrideOpen}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomHours((prev) => {
                              const weekdays = { ...(prev.weekdays || {}) };
                              weekdays[String(idx)] = { ...weekdays[String(idx)], openTime: val };
                              return { ...prev, weekdays };
                            });
                          }}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                        />
                        <span className="text-slate-400">-</span>
                        <input
                          type="time"
                          value={overrideClose}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomHours((prev) => {
                              const weekdays = { ...(prev.weekdays || {}) };
                              weekdays[String(idx)] = { ...weekdays[String(idx)], closeTime: val };
                              return { ...prev, weekdays };
                            });
                          }}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Card: Kalender Libur & Jam Khusus */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
              <CalendarIcon className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm font-heading">
                Kalender Libur & Jam Khusus
              </h3>
              <p className="text-[11px] text-slate-400">Klik tanggal untuk mengatur hari libur atau jam khusus</p>
            </div>
          </div>

          {/* Calendar Container */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 max-w-sm mx-auto shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-xs text-slate-800">
                {currentCalendarDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
              {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
                <span key={d} className="text-[9px] font-extrabold text-slate-400 uppercase">
                  {d}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(({ date, isCurrentMonth, dateString }, idx) => {
                const dayOfWeek = date.getDay();
                const isOffDay = !operationalDays.includes(dayOfWeek);
                const isCustomClosed = disabledDates.includes(dateString);
                const customDateHours = customHours.dates?.[dateString];
                const isToday = date.toLocaleDateString('en-CA') === new Date().toLocaleDateString('en-CA');

                let buttonStyle = 'bg-white text-slate-700 hover:bg-orange-50';
                let statusText = '';

                if (isCustomClosed) {
                  buttonStyle = 'bg-rose-500 text-white font-bold shadow-xs';
                  statusText = 'Tutup';
                } else if (customDateHours) {
                  buttonStyle = 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300';
                  statusText = customDateHours.openTime;
                } else if (isOffDay) {
                  buttonStyle = 'bg-amber-100/70 text-amber-700 opacity-60 cursor-not-allowed';
                  statusText = 'Libur';
                } else if (!isCurrentMonth) {
                  buttonStyle = 'text-slate-300 hover:bg-slate-100';
                }

                if (isToday && !isCustomClosed && !isOffDay) {
                  buttonStyle += ' border-2 border-orange-500 font-extrabold';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isOffDay}
                    onClick={() => handleCalendarDayClick(dateString)}
                    className={`h-9 relative flex flex-col items-center justify-center rounded-xl text-xs transition-all cursor-pointer ${buttonStyle}`}
                  >
                    <span>{date.getDate()}</span>
                    {statusText && (
                      <span className="absolute bottom-0.5 text-[6px] font-black uppercase scale-90 leading-none">
                        {statusText}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tag Chips for Custom Disabled Dates */}
          {disabledDates.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Daftar Hari Libur Khusus:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-[70px] overflow-y-auto">
                {disabledDates.map((dStr) => (
                  <span
                    key={dStr}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-bold"
                  >
                    {new Date(dStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    <button
                      type="button"
                      onClick={() => toggleDisabledDate(dStr)}
                      className="hover:text-rose-900 ml-0.5 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
