'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock } from 'lucide-react';

interface PickupTimePickerProps {
  openTime: string;   // e.g. "08:00"
  closeTime: string;  // e.g. "21:00"
  slotInterval: number; // in minutes, e.g. 5
  selectedDate: string | null;
  selectedTime: string | null;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
}

function generateDates(days: number): { value: string; label: string; dayLabel: string }[] {
  const dates: { value: string; label: string; dayLabel: string }[] = [];
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push({
      value: d.toISOString().split('T')[0],
      label: `${d.getDate()} ${monthNames[d.getMonth()]}`,
      dayLabel: i === 0 ? 'Hari ini' : i === 1 ? 'Besok' : dayNames[d.getDay()],
    });
  }
  return dates;
}

function generateTimeSlots(
  openTime: string,
  closeTime: string,
  interval: number,
  selectedDate: string | null
): string[] {
  const [openH, openM] = openTime.split(':').map(Number);
  const [closeH, closeM] = closeTime.split(':').map(Number);

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  const now = new Date();
  const isToday = selectedDate === now.toISOString().split('T')[0];
  const currentMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : 0;
  // Add 15 min buffer for preparation
  const minSlot = isToday ? currentMinutes + 15 : openMinutes;

  const slots: string[] = [];
  for (let m = openMinutes; m < closeMinutes; m += interval) {
    if (m >= minSlot) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
    }
  }
  return slots;
}

export function PickupTimePicker({
  openTime,
  closeTime,
  slotInterval,
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
}: PickupTimePickerProps) {
  const dates = useMemo(() => generateDates(7), []);
  const timeSlots = useMemo(
    () => generateTimeSlots(openTime, closeTime, slotInterval, selectedDate),
    [openTime, closeTime, slotInterval, selectedDate]
  );

  return (
    <div className="space-y-4">
      {/* Date Picker */}
      <div>
        <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          <Calendar className="w-3.5 h-3.5" />
          Pilih Tanggal
        </label>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {dates.map((date) => (
            <button
              key={date.value}
              type="button"
              onClick={() => onDateChange(date.value)}
              className={`flex-shrink-0 px-4 py-3 rounded-2xl border-2 text-center transition-all active:scale-95 min-w-[80px]
                ${selectedDate === date.value
                  ? 'border-[#B48A5E] bg-[#B48A5E] text-white shadow-lg shadow-[#B48A5E]/20'
                  : 'border-gray-200 bg-white hover:border-[#B48A5E]/30 text-gray-700'
                }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{date.dayLabel}</p>
              <p className="text-sm font-bold mt-0.5">{date.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Time Picker */}
      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
        >
          <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            <Clock className="w-3.5 h-3.5" />
            Pilih Jam Pengambilan
          </label>
          {timeSlots.length === 0 ? (
            <div className="py-6 text-center rounded-2xl bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-700 font-medium">
                Tidak ada slot tersedia untuk tanggal ini.
              </p>
              <p className="text-xs text-amber-600 mt-1">Coba pilih tanggal lain.</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-[200px] overflow-y-auto pr-1">
              {timeSlots.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => onTimeChange(time)}
                  className={`py-2.5 rounded-xl text-[13px] font-bold transition-all active:scale-95
                    ${selectedTime === time
                      ? 'bg-[#B48A5E] text-white shadow-md shadow-[#B48A5E]/20'
                      : 'bg-gray-50 text-gray-700 hover:bg-[#B48A5E]/10 border border-gray-100'
                    }`}
                >
                  {time}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
