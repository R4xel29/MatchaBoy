'use client';

import React from 'react';
import {
  QrCode,
  Wallet,
  ToggleLeft,
  ToggleRight,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { PaymentConfig, PromoPackage } from './types';

interface MidtransSettingsTabProps {
  settings: PaymentConfig | null;
  update: (key: keyof PaymentConfig, value: any) => void;
  getPromoPackages: () => PromoPackage[];
  addPromoPackage: () => void;
  removePromoPackage: (amount: number) => void;
  newPromoAmount: string;
  setNewPromoAmount: (v: string) => void;
  newPromoBonus: string;
  setNewPromoBonus: (v: string) => void;
}

export function MidtransSettingsTab({
  settings,
  update,
  getPromoPackages,
  addPromoPackage,
  removePromoPackage,
  newPromoAmount,
  setNewPromoAmount,
  newPromoBonus,
  setNewPromoBonus,
}: MidtransSettingsTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* QRIS Settings */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
              <QrCode className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 font-heading">
                Pembayaran QRIS
              </h3>
              <p className="text-[11px] text-slate-400">Pindai kode QR untuk checkout instan</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => update('qrisEnabled', !settings?.qrisEnabled)}
            className="cursor-pointer transition-transform active:scale-95"
          >
            {settings?.qrisEnabled ? (
              <ToggleRight className="w-8 h-8 text-orange-500" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-slate-300" />
            )}
          </button>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Label Tampilan QRIS
            </label>
            <input
              type="text"
              value={settings?.qrisLabel || ''}
              onChange={(e) => update('qrisLabel', e.target.value)}
              placeholder="Contoh: QRIS (GoPay, OVO, Dana, BCA Mobile)"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-orange-500 transition-all"
            />
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 text-xs leading-relaxed text-emerald-900 font-medium">
            <div className="flex items-center gap-2 font-extrabold text-emerald-950 mb-1">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Metode QRIS Dinamis Otomatis</span>
            </div>
            <p className="text-[11px] text-emerald-800">
              Sistem secara otomatis membuat QRIS dinamis via payment gateway untuk setiap pesanan baru. Pelanggan tidak perlu memasukkan nominal transfer secara manual atau mengunggah foto bukti bayar.
            </p>
          </div>
        </div>
      </div>

      {/* Arus Pay & Unified Top Up Settings */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
              <Wallet className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 font-heading">
                Arus Pay (Dompet Digital)
              </h3>
              <p className="text-[11px] text-slate-400">
                Kelola pengisian saldo dan skema bonus loyalitas pelanggan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => update('walletTopUpEnabled', !settings?.walletTopUpEnabled)}
            className="cursor-pointer transition-transform active:scale-95"
          >
            {settings?.walletTopUpEnabled ? (
              <ToggleRight className="w-8 h-8 text-orange-500" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-slate-300" />
            )}
          </button>
        </div>

        {settings?.walletTopUpEnabled && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* General Top-Up Configuration */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Minimal Pengisian Saldo (Rp)
              </label>
              <input
                type="number"
                value={settings?.walletMinTopUp ?? 10000}
                onChange={(e) => update('walletMinTopUp', Number(e.target.value))}
                placeholder="Contoh: 10000"
                className="w-full sm:w-1/2 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 font-bold"
              />
            </div>

            {/* Bonus Scheme Selector */}
            <div className="border-t border-slate-100 pt-3.5 space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Skema Bonus Top-Up
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'NONE', title: 'Tanpa Bonus', desc: 'Saldo bertambah persis nominal top-up' },
                  { id: 'REGULAR', title: 'Hanya Bonus Reguler', desc: 'Bonus persentase berlaku untuk semua transaksi' },
                  { id: 'FIRST_TIME', title: 'Hanya Promo Pertama', desc: 'Bonus paket khusus untuk pengisian pertama saja' },
                  { id: 'BOTH', title: 'Gunakan Keduanya', desc: 'Paket untuk top-up pertama, persentase untuk selanjutnya' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => update('walletBonusMode', mode.id)}
                    className={`p-3 text-left border rounded-2xl transition-all cursor-pointer flex flex-col gap-0.5 ${
                      (settings?.walletBonusMode ?? 'BOTH') === mode.id
                        ? 'border-orange-500 bg-orange-50/40 text-orange-800 shadow-2xs ring-1 ring-orange-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-500'
                    }`}
                  >
                    <span className="text-xs font-extrabold text-slate-900">{mode.title}</span>
                    <span className="text-[10px] leading-tight text-slate-500">{mode.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Standard regular bonus panel */}
            {((settings?.walletBonusMode ?? 'BOTH') === 'REGULAR' ||
              (settings?.walletBonusMode ?? 'BOTH') === 'BOTH') && (
              <div className="border-t border-slate-100 pt-3.5 space-y-3 animate-in fade-in duration-200">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Pengaturan Bonus Persentase Reguler
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Persentase Bonus (%)
                    </label>
                    <input
                      type="number"
                      value={settings?.walletBonusPercent ?? 10}
                      onChange={(e) => update('walletBonusPercent', Number(e.target.value))}
                      placeholder="Contoh: 10 untuk 10%"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Minimal Pengisian Untuk Bonus (Rp)
                    </label>
                    <input
                      type="number"
                      value={settings?.walletBonusMinAmount ?? 100000}
                      onChange={(e) => update('walletBonusMinAmount', Number(e.target.value))}
                      placeholder="Contoh: 100000"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* First-Time Promo packages panel */}
            {((settings?.walletBonusMode ?? 'BOTH') === 'FIRST_TIME' ||
              (settings?.walletBonusMode ?? 'BOTH') === 'BOTH') && (
              <div className="border-t border-slate-100 pt-3.5 space-y-3.5 animate-in fade-in duration-200">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Pengaturan Promo Pengisian Pertama Kali
                </h4>

                {/* Packages List */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Daftar Paket Promo Pertama Kali
                  </span>
                  {getPromoPackages().length === 0 ? (
                    <div className="py-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400 font-medium">
                      Belum ada paket promo. Tambahkan paket di bawah.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {getPromoPackages().map((pkg, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl shadow-2xs"
                        >
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-slate-400 font-bold block">Top Up Nominal</span>
                            <span className="text-xs font-extrabold text-slate-900">
                              Rp{pkg.amount.toLocaleString('id-ID')}
                            </span>
                          </div>
                          <div className="text-right flex items-center gap-3">
                            <div className="space-y-0.5 pr-2.5 border-r border-slate-200 text-right">
                              <span className="text-[10px] text-orange-600 font-bold block">Ekstra Bonus</span>
                              <span className="text-xs font-extrabold text-orange-600">
                                +{pkg.bonus.toLocaleString('id-ID')}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removePromoPackage(pkg.amount)}
                              className="p-1.5 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl text-rose-500 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add New Package Form */}
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <h5 className="text-[11px] font-bold text-slate-800">Tambah Paket Promo Baru</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Nominal Top-Up (Rp)
                      </label>
                      <input
                        type="number"
                        value={newPromoAmount}
                        onChange={(e) => setNewPromoAmount(e.target.value)}
                        placeholder="Contoh: 50000"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Nominal Bonus Saldo (Rp)
                      </label>
                      <input
                        type="number"
                        value={newPromoBonus}
                        onChange={(e) => setNewPromoBonus(e.target.value)}
                        placeholder="Contoh: 5000"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 font-bold"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addPromoPackage}
                    disabled={!newPromoAmount || !newPromoBonus}
                    className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white text-[11px] font-bold uppercase tracking-wider rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Paket Promo</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
