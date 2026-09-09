'use client';

import React from 'react';
import { ToggleLeft, ToggleRight, CreditCard, ShieldCheck } from 'lucide-react';
import { PaymentConfig } from './types';

interface DokuSettingsTabProps {
  settings: PaymentConfig | null;
  update: (key: keyof PaymentConfig, value: any) => void;
}

export function DokuSettingsTab({ settings, update }: DokuSettingsTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-1 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0 w-11 h-11 shadow-2xs overflow-hidden">
              <img
                src="https://www.doku.com/wp-content/themes/doku/assets/images/logo.png"
                alt="DOKU"
                className="object-contain max-h-full max-w-full"
              />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 font-heading">
                DOKU Payment Gateway
              </h3>
              <p className="text-[11px] text-slate-400">
                Penyedia pembayaran otomatis untuk QRIS Dinamis, E-Wallet, & Virtual Account
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => update('dokuEnabled', !settings?.dokuEnabled)}
            className="cursor-pointer transition-transform active:scale-95"
          >
            {settings?.dokuEnabled ? (
              <ToggleRight className="w-8 h-8 text-orange-500" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-slate-300" />
            )}
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Client ID / Mall ID / API Key
              </label>
              <input
                type="text"
                value={settings?.dokuClientId || ''}
                onChange={(e) => update('dokuClientId', e.target.value)}
                placeholder="Contoh: doku_key_sandbox_..."
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:border-orange-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Shared Key (Secret Key)
              </label>
              <input
                type="password"
                value={settings?.dokuSharedKey || ''}
                onChange={(e) => update('dokuSharedKey', e.target.value)}
                placeholder="SK-..."
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:border-orange-500 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <input
              type="checkbox"
              id="dokuSandbox"
              checked={settings?.dokuSandbox ?? true}
              onChange={(e) => update('dokuSandbox', e.target.checked)}
              className="w-4 h-4 text-orange-500 border-slate-300 rounded focus:ring-orange-400 cursor-pointer accent-orange-500"
            />
            <label htmlFor="dokuSandbox" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
              Gunakan Mode Sandbox (Uji Coba / Development Simulator)
            </label>
          </div>

          {/* Info Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <span className="font-extrabold block">Integrasi Webhook Otomatis Arum Seduh</span>
              <p className="text-amber-800 leading-relaxed text-[11px]">
                Setelah pembayaran berhasil diverifikasi oleh gateway DOKU, status pesanan otomatis berpindah ke antrean dapur (PENDING) dan kasir menerima alarm notifikasi instan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
