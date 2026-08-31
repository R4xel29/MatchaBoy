'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatRupiah } from '@/lib/utils';
import type { Product } from '@/types';
import { Trash2, Sparkles, X, Clock, CalendarDays, Plus, MapPin, CreditCard } from 'lucide-react';

export interface AutoReorderOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  showToast?: (msg: string, type: 'success' | 'error') => void;
  refreshWallet?: () => void;
  refreshLoyalty?: () => void;
}

export function AutoReorderOverlay({
  isOpen,
  onClose,
  products,
  showToast = () => {},
  refreshWallet,
  refreshLoyalty,
}: AutoReorderOverlayProps) {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState('Normal');
  const [iceLevel, setIceLevel] = useState('Normal');
  const [sugarLevel, setSugarLevel] = useState('Normal');
  const [frequency, setFrequency] = useState('DAILY');
  const [dayOfWeek, setDayOfWeek] = useState(1); // 1 = Senin
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [timeSlot, setTimeSlot] = useState('09:00');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('WALLET');
  const [submitting, setSubmitting] = useState(false);

  const fetchSchedules = () => {
    setLoadingList(true);
    fetch('/api/auto-reorder')
      .then((res) => res.json())
      .then((d) => {
        if (Array.isArray(d)) setSchedules(d);
      })
      .catch((err) => console.error('Error fetching schedules:', err))
      .finally(() => setLoadingList(false));
  };

  useEffect(() => {
    if (isOpen) {
      fetchSchedules();
      setShowAddForm(false);
      setSelectedProductId(
        products.filter((p) => p.badge !== 'sold-out' && p.modifiers?.isBundle !== true)[0]?.id || ''
      );
    }
  }, [isOpen, products]);

  if (!isOpen) return null;

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan jadwal pemesanan otomatis ini?')) return;
    try {
      const res = await fetch(`/api/auto-reorder?id=${id}`, { method: 'DELETE' });
      const d = await res.json();
      if (res.ok && d.success) {
        showToast('Jadwal pemesanan otomatis berhasil dibatalkan!', 'success');
        fetchSchedules();
      } else {
        showToast(d.error || 'Gagal membatalkan jadwal', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Koneksi bermasalah', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !timeSlot || !deliveryAddress) {
      showToast('Mohon lengkapi produk, waktu, dan alamat pengiriman', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auto-reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          quantity,
          size,
          iceLevel,
          sugarLevel,
          frequency,
          dayOfWeek: frequency === 'WEEKLY' ? dayOfWeek : undefined,
          dayOfMonth: frequency === 'MONTHLY' ? dayOfMonth : undefined,
          timeSlot,
          deliveryAddress,
          paymentMethod,
        }),
      });
      const d = await res.json();
      if (res.ok && d.id) {
        showToast('Jadwal pemesanan otomatis berhasil dibuat!', 'success');
        setShowAddForm(false);
        fetchSchedules();
        if (refreshWallet) refreshWallet();
        if (refreshLoyalty) refreshLoyalty();
      } else {
        showToast(d.error || 'Gagal membuat jadwal', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Koneksi bermasalah', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getProductOptions = () => {
    return products.filter((p) => p.badge !== 'sold-out' && p.modifiers?.isBundle !== true);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col border border-amber-100 max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-700 text-white flex justify-between items-center relative">
            <div className="space-y-0.5">
              <span className="text-[9px] text-amber-200 font-black uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> Arum Seduh Concierge <Sparkles className="w-2.5 h-2.5" />
              </span>
              <h3 className="font-serif font-black text-xl text-white tracking-tight mt-1 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-amber-200" />
                Pemesanan Otomatis
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white text-sm font-bold active:scale-95 transition-all cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-hide text-left">
            {/* Info panel */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex gap-3 text-gray-800">
              <span className="text-lg">⏱️</span>
              <div className="space-y-0.5">
                <p className="text-xs font-black text-orange-700">Pesan Otomatis Mengalir</p>
                <p className="text-[10px] text-gray-600 font-semibold leading-tight">
                  Jadwalkan minuman Arum Seduh favorit Anda agar dikirim secara terjadwal (Harian, Mingguan, atau Bulanan) langsung ke alamat Anda secara otomatis!
                </p>
              </div>
            </div>

            {showAddForm ? (
              /* ADD NEW REORDER FORM */
              <form onSubmit={handleSubmit} className="space-y-4">
                <h4 className="text-xs font-black text-orange-700 uppercase tracking-widest">
                  Buat Jadwal Baru
                </h4>

                {/* Select Product */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">
                    Pilih Menu Arum Seduh
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-4.5 py-3 rounded-2xl border border-gray-200 outline-none focus:border-orange-500 text-xs font-bold bg-gray-50"
                  >
                    {getProductOptions().map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatRupiah(p.price)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* Size */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">
                      Ukuran
                    </label>
                    <select
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[10px] font-bold bg-gray-50"
                    >
                      <option value="Normal">Normal</option>
                      <option value="Large">Large</option>
                    </select>
                  </div>
                  {/* Ice */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">
                      Es Batu
                    </label>
                    <select
                      value={iceLevel}
                      onChange={(e) => setIceLevel(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[10px] font-bold bg-gray-50"
                    >
                      <option value="Normal">Normal</option>
                      <option value="Less">Less Ice</option>
                      <option value="No Ice">No Ice</option>
                    </select>
                  </div>
                  {/* Sugar */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">
                      Kemanisan
                    </label>
                    <select
                      value={sugarLevel}
                      onChange={(e) => setSugarLevel(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[10px] font-bold bg-gray-50"
                    >
                      <option value="Normal">Normal</option>
                      <option value="Less">Less Sugar</option>
                      <option value="No Sugar">No Sugar</option>
                    </select>
                  </div>
                </div>

                {/* Scheduling Parameters */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">
                      Frekuensi
                    </label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[10px] font-bold bg-gray-50"
                    >
                      <option value="DAILY">Harian (Setiap Hari)</option>
                      <option value="WEEKLY">Mingguan (Hari tertentu)</option>
                      <option value="MONTHLY">Bulanan (Tanggal tertentu)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">
                      Jam Pengiriman
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 09:00"
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[10px] font-bold bg-gray-50 text-center"
                    />
                  </div>
                </div>

                {frequency === 'WEEKLY' && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">
                      Pilih Hari dalam Seminggu
                    </label>
                    <select
                      value={dayOfWeek}
                      onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold bg-gray-50"
                    >
                      <option value="1">Senin</option>
                      <option value="2">Selasa</option>
                      <option value="3">Rabu</option>
                      <option value="4">Kamis</option>
                      <option value="5">Jumat</option>
                      <option value="6">Sabtu</option>
                      <option value="0">Minggu</option>
                    </select>
                  </div>
                )}

                {frequency === 'MONTHLY' && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">
                      Pilih Tanggal Pengiriman (1-31)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(parseInt(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold bg-gray-50"
                    />
                  </div>
                )}

                {/* Delivery Address */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">
                    Alamat Pengiriman Lengkap
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Masukkan alamat lengkap rumah/kantor..."
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-orange-500 text-xs font-semibold bg-gray-50 resize-none"
                  />
                </div>

                {/* Payment Method */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">
                    Metode Pembayaran
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {['WALLET', 'COD'].map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setPaymentMethod(m)}
                        className={`p-3 border rounded-xl font-black text-[10px] tracking-wide transition-all outline-none cursor-pointer ${
                          paymentMethod === m
                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 border-orange-500 text-white'
                            : 'bg-white border-gray-200 text-gray-600'
                        }`}
                      >
                        {m === 'WALLET' ? 'Arus Pay ⚡' : 'Bayar Ditempat (COD) 💵'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex gap-3.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 py-3.5 border border-gray-200 hover:bg-gray-50 text-gray-600 font-black text-xs rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white font-black text-xs rounded-xl cursor-pointer"
                  >
                    {submitting ? 'Menyimpan...' : 'Aktifkan Jadwal 🚀'}
                  </button>
                </div>
              </form>
            ) : (
              /* LIST ACTIVE AUTO REORDERS */
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">
                    Jadwal Anda
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="px-3.5 py-1.5 bg-gradient-to-tr from-amber-400 to-orange-500 text-white text-[10px] font-black rounded-full hover:shadow-md cursor-pointer border border-amber-300"
                  >
                    + Buat Baru
                  </button>
                </div>

                {loadingList ? (
                  <div className="space-y-2.5">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-28 bg-amber-50 animate-pulse rounded-2xl w-full" />
                    ))}
                  </div>
                ) : schedules.length === 0 ? (
                  <div className="text-center py-10 space-y-2 border border-dashed border-amber-200 rounded-3xl">
                    <span className="text-3xl">📭</span>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      Belum ada pemesanan otomatis
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(true)}
                      className="px-4.5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-black rounded-xl hover:shadow-md cursor-pointer mt-2"
                    >
                      Atur Sekarang
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {schedules.map((s: any) => (
                      <div
                        key={s.id}
                        className="border border-amber-100 rounded-3xl p-4 bg-white shadow-sm flex flex-col justify-between space-y-3 hover:shadow-md transition-all"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[8px] font-black uppercase tracking-wider leading-none">
                              {s.frequency} ✦ {s.timeSlot}
                            </span>
                            <h4 className="font-serif font-black text-sm text-gray-900 mt-1 leading-snug">
                              {s.productName}
                            </h4>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                              {s.size} ✦ Ice: {s.iceLevel} ✦ Sugar: {s.sugarLevel}
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="font-black text-xs text-amber-600 block">
                              {formatRupiah(s.price * s.quantity)}
                            </span>
                            <span className="text-[9px] text-gray-400 font-bold">Qty: {s.quantity}</span>
                          </div>
                        </div>

                        <div className="text-[9.5px] text-gray-500 font-semibold border-t border-b border-gray-100 py-2 space-y-1">
                          <p className="line-clamp-1">📍 Alamat: {s.deliveryAddress}</p>
                          <p className="flex items-center gap-1">
                            Metode:{' '}
                            <span className="font-bold text-gray-800">
                              {s.paymentMethod === 'WALLET'
                                ? 'Arus Pay ⚡'
                                : 'Cash On Delivery (COD) 💵'}
                            </span>
                          </p>
                          {s.nextTriggeredAt && (
                            <p className="text-orange-600 font-bold">
                              Pengiriman Berikutnya:{' '}
                              {new Date(s.nextTriggeredAt).toLocaleString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          )}
                        </div>

                        <div className="flex justify-end gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleDelete(s.id)}
                            className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-[9px] font-black uppercase transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Batalkan Jadwal</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default AutoReorderOverlay;
