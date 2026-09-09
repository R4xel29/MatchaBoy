'use client';

import React from 'react';
import { Truck, Clock } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';

interface DeliveryPickupTabProps {
  deliveryFeePerKm: number;
  setDeliveryFeePerKm: (v: number) => void;
  maxDeliveryDistance: number;
  setMaxDeliveryDistance: (v: number) => void;
  pickupSlotInterval: number;
  setPickupSlotInterval: (v: number) => void;
  cancellationTimeLimit: number;
  setCancellationTimeLimit: (v: number) => void;
}

export function DeliveryPickupTab({
  deliveryFeePerKm,
  setDeliveryFeePerKm,
  maxDeliveryDistance,
  setMaxDeliveryDistance,
  pickupSlotInterval,
  setPickupSlotInterval,
  cancellationTimeLimit,
  setCancellationTimeLimit,
}: DeliveryPickupTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-in fade-in duration-200">
      {/* Card: Pengaturan Delivery */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
            <Truck className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm font-heading">
              Pengiriman & Ongkos Kirim (Delivery)
            </h3>
            <p className="text-[11px] text-slate-400">Tarif dan batasan radius kurir kedai</p>
          </div>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Ongkos Kirim per KM (Rp)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="500"
                value={deliveryFeePerKm}
                onChange={(e) => setDeliveryFeePerKm(Number(e.target.value))}
                className="w-full px-4 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all font-bold text-slate-900"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Saat ini: <strong>{formatRupiah(deliveryFeePerKm)}</strong> per kilometer jarak antar.
            </p>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Batas Jarak Maksimal Pengantaran (KM)
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={maxDeliveryDistance}
              onChange={(e) => setMaxDeliveryDistance(Number(e.target.value))}
              className="w-full px-4 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all font-bold text-slate-900"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Pelanggan dengan jarak di atas {maxDeliveryDistance} KM akan otomatis dialihkan ke opsi Pickup.
            </p>
          </div>
        </div>
      </div>

      {/* Card: Pengaturan Pickup & Batas Pembatalan */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
            <Clock className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm font-heading">
              Jadwal Penjemputan (Pickup) & Batas Batal
            </h3>
            <p className="text-[11px] text-slate-400">Aturan waktu slot penjemputan dan pembatalan</p>
          </div>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Interval Slot Waktu Pickup
            </label>
            <select
              value={pickupSlotInterval}
              onChange={(e) => setPickupSlotInterval(Number(e.target.value))}
              className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              {[5, 10, 15, 30].map((n) => (
                <option key={n} value={n}>
                  Setiap {n} menit (contoh: 10:00, 10:{n < 10 ? `0${n}` : n}...)
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              Jarak jeda pemilihan slot jam ambil pesanan oleh pembeli.
            </p>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Batas Waktu Pembatalan Pesanan COD (menit)
            </label>
            <input
              type="number"
              min="0"
              max="60"
              value={cancellationTimeLimit}
              onChange={(e) => setCancellationTimeLimit(Number(e.target.value))}
              className="w-full px-4 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all font-bold text-slate-900"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Rentang waktu bagi pembeli untuk membatalkan pesanan bayar di tempat (COD). Masukkan 0 jika tidak mengizinkan pembatalan mandiri.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
