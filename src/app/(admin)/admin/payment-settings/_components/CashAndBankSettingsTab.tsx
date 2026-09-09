'use client';

import React from 'react';
import {
  Banknote,
  Building2,
  MessageCircle,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { BankAccount, PaymentConfig } from './types';

interface CashAndBankSettingsTabProps {
  settings: PaymentConfig | null;
  update: (key: keyof PaymentConfig, value: any) => void;
  banks: BankAccount[];
  showNewBank: boolean;
  setShowNewBank: (v: boolean) => void;
  newBank: { bankName: string; accountNumber: string; accountName: string; bankLogo: string };
  setNewBank: React.Dispatch<
    React.SetStateAction<{ bankName: string; accountNumber: string; accountName: string; bankLogo: string }>
  >;
  addBank: () => void;
  deleteBank: (id: string) => void;
}

export function CashAndBankSettingsTab({
  settings,
  update,
  banks,
  showNewBank,
  setShowNewBank,
  newBank,
  setNewBank,
  addBank,
  deleteBank,
}: CashAndBankSettingsTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* COD (Bayar di Tempat) Settings */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
              <Banknote className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 font-heading">
                COD (Bayar di Tempat)
              </h3>
              <p className="text-[11px] text-slate-400">Verifikasi pesanan cash via WhatsApp</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => update('codEnabled', !settings?.codEnabled)}
            className="cursor-pointer transition-transform active:scale-95"
          >
            {settings?.codEnabled ? (
              <ToggleRight className="w-8 h-8 text-orange-500" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-slate-300" />
            )}
          </button>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Nomor WhatsApp Admin Konfirmasi COD
          </label>
          <div className="relative">
            <MessageCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="tel"
              value={settings?.codWhatsApp || ''}
              onChange={(e) => update('codWhatsApp', e.target.value)}
              placeholder="Contoh: 628123456789"
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:border-orange-500 transition-all"
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">
            Format: 628xxx (tanpa tanda + atau spasi) untuk tautan WhatsApp otomatis.
          </p>
        </div>
      </div>

      {/* Bank Transfer Settings */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
              <Building2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 font-heading">
                Transfer Rekening Bank
              </h3>
              <p className="text-[11px] text-slate-400">Kelola daftar rekening bank tujuan transfer pelanggan</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNewBank(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold hover:from-orange-600 hover:to-amber-600 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Rekening</span>
            </button>
            <button
              type="button"
              onClick={() => update('transferEnabled', !settings?.transferEnabled)}
              className="cursor-pointer transition-transform active:scale-95"
            >
              {settings?.transferEnabled ? (
                <ToggleRight className="w-8 h-8 text-orange-500" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-300" />
              )}
            </button>
          </div>
        </div>

        {/* Bank List */}
        <div className="space-y-2.5">
          {banks.length === 0 ? (
            <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-500" />
              <p className="text-xs font-semibold">Belum ada rekening bank yang ditambahkan</p>
            </div>
          ) : (
            banks.map((bank) => (
              <div
                key={bank.id}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                  {bank.bankLogo ? (
                    <img src={bank.bankLogo} alt={bank.bankName} className="w-8 h-8 object-contain" />
                  ) : (
                    <Building2 className="w-5 h-5 text-orange-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold text-slate-900">{bank.bankName}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {bank.accountNumber} <span className="font-sans font-medium text-slate-400">· a.n.</span> {bank.accountName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteBank(bank.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors cursor-pointer"
                  title="Hapus Rekening"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* New Bank Form */}
        {showNewBank && (
          <div className="p-4.5 rounded-2xl bg-orange-50/50 border border-orange-200 space-y-3 animate-in fade-in duration-200">
            <h4 className="text-xs font-extrabold text-orange-900 uppercase tracking-wider">
              Tambah Rekening Bank Baru
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Nama Bank (BCA, Mandiri, dll)"
                value={newBank.bankName}
                onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })}
                className="px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 font-medium"
              />
              <input
                type="text"
                placeholder="Nomor Rekening"
                value={newBank.accountNumber}
                onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })}
                className="px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 font-mono font-bold"
              />
              <input
                type="text"
                placeholder="Atas Nama (Pemilik Rekening)"
                value={newBank.accountName}
                onChange={(e) => setNewBank({ ...newBank, accountName: e.target.value })}
                className="px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 font-medium"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={addBank}
                disabled={!newBank.bankName || !newBank.accountNumber || !newBank.accountName}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
              >
                Simpan Rekening
              </button>
              <button
                type="button"
                onClick={() => setShowNewBank(false)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
