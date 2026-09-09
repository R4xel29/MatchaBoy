'use client';

import React from 'react';
import { Store, MapPin, LocateFixed } from 'lucide-react';

interface ProfileGpsTabProps {
  storeName: string;
  setStoreName: (v: string) => void;
  storeAddress: string;
  setStoreAddress: (v: string) => void;
  whatsappNumber: string;
  setWhatsappNumber: (v: string) => void;
  whatsappMessage: string;
  setWhatsappMessage: (v: string) => void;
  storeLat: number;
  setStoreLat: (v: number) => void;
  storeLng: number;
  setStoreLng: (v: number) => void;
  handleDetectLocation: () => void;
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function ProfileGpsTab({
  storeName,
  setStoreName,
  storeAddress,
  setStoreAddress,
  whatsappNumber,
  setWhatsappNumber,
  whatsappMessage,
  setWhatsappMessage,
  storeLat,
  setStoreLat,
  storeLng,
  setStoreLng,
  handleDetectLocation,
  mapContainerRef,
}: ProfileGpsTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-in fade-in duration-200">
      {/* Card: Identitas Kedai */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
            <Store className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm font-heading">
              Identitas & Layanan Pelanggan
            </h3>
            <p className="text-[11px] text-slate-400">Informasi nama kedai dan kontak WhatsApp</p>
          </div>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Nama Kedai <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Contoh: Arum Seduh HQ"
              className="w-full px-4 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all font-medium text-slate-900"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Alamat Lengkap Kedai <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              placeholder="Contoh: Jl. Mastrip No 357, Probolinggo"
              className="w-full px-4 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all font-medium text-slate-900 resize-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Nomor WhatsApp Customer Service
            </label>
            <input
              type="text"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="Contoh: 628123456789 (format 62 tanpa +)"
              className="w-full px-4 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all font-medium text-slate-900"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Digunakan untuk tombol bantuan WhatsApp pembeli di storefront dan SPMB.
            </p>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Pesan Sapaan Default WhatsApp
            </label>
            <textarea
              rows={2}
              value={whatsappMessage}
              onChange={(e) => setWhatsappMessage(e.target.value)}
              placeholder="Contoh: Halo Arum Seduh, saya ingin bertanya..."
              className="w-full px-4 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all font-medium text-slate-900 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Card: Koordinat & Peta Interaktif GPS */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
              <MapPin className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm font-heading">
                Titik Koordinat Kedai (Peta GPS)
              </h3>
              <p className="text-[11px] text-slate-400">Patokan jarak ongkos kirim delivery</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDetectLocation}
            className="px-3 py-1.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
          >
            <LocateFixed className="w-3.5 h-3.5" />
            <span>Deteksi GPS</span>
          </button>
        </div>

        {/* Latitude & Longitude Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Latitude
            </label>
            <input
              type="number"
              step="any"
              value={storeLat}
              onChange={(e) => setStoreLat(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Longitude
            </label>
            <input
              type="number"
              step="any"
              value={storeLng}
              onChange={(e) => setStoreLng(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {/* Leaflet Map Box */}
        <div className="pt-1">
          <div className="w-full h-[280px] rounded-2xl overflow-hidden border border-slate-200 relative shadow-inner">
            <div ref={mapContainerRef as React.RefObject<HTMLDivElement>} className="absolute inset-0" />
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 italic">
            Tips: Geser pin oranye atau klik di peta untuk menentukan koordinat fisik kedai Arum Seduh.
          </p>
        </div>
      </div>
    </div>
  );
}
