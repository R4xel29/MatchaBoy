'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Save, Loader2, Store } from 'lucide-react';

export default function StoreSettingsPage() {
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('21:00');
  const [pickupSlotInterval, setPickupSlotInterval] = useState(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/store-settings')
      .then(r => r.json())
      .then(d => {
        if (d.openTime) setOpenTime(d.openTime);
        if (d.closeTime) setCloseTime(d.closeTime);
        if (d.pickupSlotInterval) setPickupSlotInterval(d.pickupSlotInterval);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/store-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openTime, closeTime, pickupSlotInterval }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {}
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-matcha-600" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Store className="w-6 h-6 text-matcha-600" /> Store Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Atur jam operasional dan konfigurasi pickup</p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
        <div>
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-matcha-600" /> Jam Operasional
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Jam Buka</label>
              <input type="time" value={openTime} onChange={e => setOpenTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:border-matcha-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Jam Tutup</label>
              <input type="time" value={closeTime} onChange={e => setCloseTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:border-matcha-500" />
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-6">
          <h3 className="font-bold text-foreground mb-4">Pickup Settings</h3>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Interval Slot Pickup (menit)
            </label>
            <select value={pickupSlotInterval} onChange={e => setPickupSlotInterval(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:border-matcha-500">
              {[5, 10, 15, 30].map(n => (
                <option key={n} value={n}>Setiap {n} menit</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-2">
              Slot waktu yang tersedia untuk pelanggan memilih jam pengambilan pesanan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-matcha text-white font-semibold text-sm disabled:opacity-50 hover:opacity-90 transition-all">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
          {saved && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-green-600 font-medium">
              ✓ Tersimpan!
            </motion.span>
          )}
        </div>
      </div>
    </div>
  );
}
