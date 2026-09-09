'use client';

import React from 'react';
import {
  Volume2,
  Play,
  Square,
  UploadCloud,
  RotateCcw,
  Sparkles,
  Loader2,
  Check,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlarmAudioTabProps {
  alarmSoundUrl: string;
  alarmVolumeBoost: number;
  handleBoostChange: (newBoost: number) => void;
  isPlayingPreview: boolean;
  handleTogglePreview: () => void;
  isUploadingAlarm: boolean;
  handleAlarmUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleResetAlarmToDefault: () => void;
  uploadAlarmSuccess: string | null;
  uploadAlarmError: string | null;
  pickupAlarmLeadTime: number;
  setPickupAlarmLeadTime: (v: number) => void;
  adminWaNumbers: string;
  setAdminWaNumbers: (v: string) => void;
}

export function AlarmAudioTab({
  alarmSoundUrl,
  alarmVolumeBoost,
  handleBoostChange,
  isPlayingPreview,
  handleTogglePreview,
  isUploadingAlarm,
  handleAlarmUpload,
  handleResetAlarmToDefault,
  uploadAlarmSuccess,
  uploadAlarmError,
  pickupAlarmLeadTime,
  setPickupAlarmLeadTime,
  adminWaNumbers,
  setAdminWaNumbers,
}: AlarmAudioTabProps) {
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
              <Volume2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm font-heading">
                Suara Alarm Pesanan Masuk (Kasir & Admin)
              </h3>
              <p className="text-[11px] text-slate-400">
                Pengaturan audio notifikasi pesanan baru masuk secara real-time
              </p>
            </div>
          </div>

          <div>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold',
                alarmSoundUrl
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-slate-100 text-slate-600'
              )}
            >
              {alarmSoundUrl ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Suara Kustom Aktif
                </>
              ) : (
                'Suara Bawaan Arum Seduh'
              )}
            </span>
          </div>
        </div>

        {/* Play Preview & Upload Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleTogglePreview}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-orange-200 bg-white hover:bg-orange-50 text-orange-700 transition-colors shadow-2xs cursor-pointer"
          >
            {isPlayingPreview ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current text-orange-600" />
                <span>Hentikan Suara</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current text-orange-600" />
                <span>Dengarkan Suara ({alarmSoundUrl ? 'Kustom' : 'Bawaan'})</span>
              </>
            )}
          </button>

          <label
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xs cursor-pointer transition-all',
              isUploadingAlarm && 'opacity-70 pointer-events-none'
            )}
          >
            {isUploadingAlarm ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Mengunggah...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Unggah File Suara (.mp3 / .wav)</span>
              </>
            )}
            <input
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.m4a"
              className="hidden"
              onChange={handleAlarmUpload}
              disabled={isUploadingAlarm}
            />
          </label>

          {alarmSoundUrl && (
            <button
              type="button"
              onClick={handleResetAlarmToDefault}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset ke Bawaan</span>
            </button>
          )}
        </div>

        {uploadAlarmSuccess && (
          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3.5 py-2.5 rounded-xl border border-emerald-200">
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{uploadAlarmSuccess}</span>
          </div>
        )}

        {uploadAlarmError && (
          <p className="text-xs text-rose-600 bg-rose-50 px-3.5 py-2.5 rounded-xl border border-rose-200">
            {uploadAlarmError}
          </p>
        )}

        {/* Volume Booster Overdrive Selector */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-extrabold text-slate-900">
                Intensitas Suara & Efek Booster (Speaker Pecah)
              </span>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-mono">
              {alarmVolumeBoost}%
            </span>
          </div>

          {/* Preset Buttons (100%, 200%, 350%, 500%, 700%, 1000%) */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { label: 'Normal', boost: 100, text: '100%' },
              { label: 'Keras', boost: 200, text: '200%' },
              { label: 'Pecah', boost: 350, text: '350%' },
              { label: 'Super', boost: 500, text: '500%' },
              { label: 'Ekstrem', boost: 700, text: '700%' },
              { label: 'Sirene 10x', boost: 1000, text: '1000%' },
            ].map(({ label, boost, text }) => {
              const isSelected = alarmVolumeBoost === boost;
              return (
                <button
                  key={boost}
                  type="button"
                  onClick={() => handleBoostChange(boost)}
                  className={cn(
                    'py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center',
                    isSelected
                      ? 'border-orange-500 bg-orange-500 text-white shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  )}
                >
                  <span>{text}</span>
                  <span className="block text-[9px] font-normal opacity-80">{label}</span>
                </button>
              );
            })}
          </div>

          {/* Slider Penyetel */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
              <span>Slider Penyetel Intensitas Booster</span>
              <span className="font-mono font-bold text-orange-600">{alarmVolumeBoost}%</span>
            </div>
            <input
              type="range"
              min="100"
              max="1000"
              step="25"
              value={alarmVolumeBoost}
              onChange={(e) => handleBoostChange(Number(e.target.value))}
              className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Card: Lead Time & Nomor WA Notifikasi Admin */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
            <Bell className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm font-heading">
              Notifikasi Admin & Pengingat Pesanan
            </h3>
            <p className="text-[11px] text-slate-400">Konfigurasi penerima pesan WhatsApp dan jeda alarm pickup</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Batas Waktu Alarm Pickup (menit sebelum jadwal)
            </label>
            <input
              type="number"
              min="1"
              max="180"
              value={pickupAlarmLeadTime}
              onChange={(e) => setPickupAlarmLeadTime(Number(e.target.value))}
              className="w-full px-4 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all font-bold text-slate-900"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Alarm suara kasir akan berdering pada jeda menit ini sebelum waktu penjemputan tiba.
            </p>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Nomor WhatsApp / JID Grup Notifikasi Admin
            </label>
            <input
              type="text"
              value={adminWaNumbers}
              onChange={(e) => setAdminWaNumbers(e.target.value)}
              placeholder="Contoh: 08123456789, 120363024823940294@g.us"
              className="w-full px-4 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all font-medium text-slate-900"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Ketik <strong>.groupid</strong> di grup WhatsApp untuk mendapatkan JID grup.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
