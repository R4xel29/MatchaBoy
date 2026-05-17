'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Clock, Save, Loader2, Store, MapPin, LocateFixed } from 'lucide-react';
import type L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function StoreSettingsPage() {
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('21:00');
  const [pickupSlotInterval, setPickupSlotInterval] = useState(5);
  const [cancellationTimeLimit, setCancellationTimeLimit] = useState(15);
  const [deliveryFeePerKm, setDeliveryFeePerKm] = useState(2000);
  const [maxDeliveryDistance, setMaxDeliveryDistance] = useState(10);
  const [storeName, setStoreName] = useState('Arus HQ');
  const [storeAddress, setStoreAddress] = useState('Jl. Matcha No. 1, Jakarta Selatan');
  const [storeLat, setStoreLat] = useState(-7.756928);
  const [storeLng, setStoreLng] = useState(113.211502);

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

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
        if (d.cancellationTimeLimit !== undefined) setCancellationTimeLimit(d.cancellationTimeLimit);
        if (d.deliveryFeePerKm !== undefined) setDeliveryFeePerKm(d.deliveryFeePerKm);
        if (d.maxDeliveryDistance !== undefined) setMaxDeliveryDistance(d.maxDeliveryDistance);
        if (d.storeName) setStoreName(d.storeName);
        if (d.storeAddress) setStoreAddress(d.storeAddress);
        if (d.storeLat !== undefined) setStoreLat(d.storeLat);
        if (d.storeLng !== undefined) setStoreLng(d.storeLng);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Initialize Map
  useEffect(() => {
    if (loading || !mapContainer.current || mapRef.current) return;

    let mapInstance: L.Map | null = null;

    import('leaflet').then((leaflet) => {
      const L = leaflet.default;

      const map = L.map(mapContainer.current!, {
        center: [storeLat, storeLng],
        zoom: 15,
      });

      mapInstance = map;
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);

      const icon = L.divIcon({
        html: `<div class="relative">
                 <div class="w-8 h-8 bg-brand-600 rounded-full border-3 border-white shadow-xl flex items-center justify-center relative z-10">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                 </div>
               </div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      markerRef.current = L.marker([storeLat, storeLng], {
        icon, draggable: true
      }).addTo(map);

      markerRef.current.on('dragend', () => {
        const pos = markerRef.current?.getLatLng();
        if (pos) {
          setStoreLat(pos.lat);
          setStoreLng(pos.lng);
        }
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        setStoreLat(e.latlng.lat);
        setStoreLng(e.latlng.lng);
        markerRef.current?.setLatLng(e.latlng);
      });

    });

    return () => {
      if (mapInstance) {
        mapInstance.remove();
        mapRef.current = null;
      }
    };
  }, [loading]);

  // Handle direct input change to map
  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      markerRef.current.setLatLng([storeLat, storeLng]);
      mapRef.current.panTo([storeLat, storeLng]);
    }
  }, [storeLat, storeLng]);

  const handleDetectLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setStoreLat(pos.coords.latitude);
        setStoreLng(pos.coords.longitude);
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/store-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openTime, closeTime, pickupSlotInterval, cancellationTimeLimit, deliveryFeePerKm, maxDeliveryDistance, storeName, storeAddress, storeLat, storeLng }),
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
        <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Store className="w-6 h-6 text-brand-600" /> Store Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Atur jam operasional dan konfigurasi pickup</p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
        <div>
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-600" /> Jam Operasional
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Jam Buka</label>
              <input type="time" value={openTime} onChange={e => setOpenTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Jam Tutup</label>
              <input type="time" value={closeTime} onChange={e => setCloseTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:border-brand-500" />
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-6">
          <h3 className="font-bold text-foreground mb-4">Pengaturan Pesanan</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Interval Slot Pickup (menit)
              </label>
              <select value={pickupSlotInterval} onChange={e => setPickupSlotInterval(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:border-brand-500">
                {[5, 10, 15, 30].map(n => (
                  <option key={n} value={n}>Setiap {n} menit</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-2">
                Slot waktu yang tersedia untuk pelanggan memilih jam pengambilan pesanan.
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Batas Waktu Pembatalan COD (menit)
              </label>
              <input type="number" min="0" max="60" value={cancellationTimeLimit} onChange={e => setCancellationTimeLimit(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:border-brand-500" />
              <p className="text-xs text-muted-foreground mt-2">
                Batas waktu bagi pelanggan untuk dapat membatalkan pesanan Cash on Delivery (COD). Set 0 untuk menonaktifkan pembatalan.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-6">
          <h3 className="font-bold text-foreground mb-4">Pengaturan Pengiriman (Delivery)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Ongkos Kirim per KM (Rp)</label>
              <input type="number" min="0" value={deliveryFeePerKm} onChange={e => setDeliveryFeePerKm(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:border-brand-500" />
              <p className="text-xs text-muted-foreground mt-2">Biaya yang dikenakan setiap 1 KM jarak antar.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Batas Jarak Maksimal (KM)</label>
              <input type="number" min="1" value={maxDeliveryDistance} onChange={e => setMaxDeliveryDistance(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:border-brand-500" />
              <p className="text-xs text-muted-foreground mt-2">Pelanggan di luar radius ini tidak bisa memesan via Delivery.</p>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-6">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-brand-600" /> Lokasi Toko Utama
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Nama Toko</label>
                <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Alamat Lengkap</label>
                <input type="text" value={storeAddress} onChange={e => setStoreAddress(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-brand-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Latitude</label>
                <input type="number" step="any" value={storeLat} onChange={e => setStoreLat(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Longitude</label>
                <input type="number" step="any" value={storeLng} onChange={e => setStoreLng(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:border-brand-500" />
              </div>
            </div>

            <div className="pt-2">
               <div className="flex items-center justify-between mb-2">
                 <p className="text-xs font-medium text-muted-foreground">Pilih lokasi dari peta atau tekan tombol deteksi lokasi.</p>
                 <button onClick={handleDetectLocation} type="button" className="text-xs font-bold text-brand-600 flex items-center gap-1 hover:underline">
                   <LocateFixed className="w-3 h-3" /> Deteksi GPS
                 </button>
               </div>
               <div className="w-full h-[300px] rounded-xl overflow-hidden border border-border relative">
                 <div ref={mapContainer} className="absolute inset-0" />
               </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-border mt-6">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-brand text-white font-semibold text-sm disabled:opacity-50 hover:opacity-90 transition-all">
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
