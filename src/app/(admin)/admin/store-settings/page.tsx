'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Save, Loader2, Store, MapPin, LocateFixed, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
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
  const [operationalDays, setOperationalDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [disabledDates, setDisabledDates] = useState<string[]>([]);
  const [customHours, setCustomHours] = useState<{
    weekdays?: { [key: string]: { openTime: string; closeTime: string } };
    dates?: { [key: string]: { openTime: string; closeTime: string } };
  }>({});
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('Halo Matchaboy, saya ingin bertanya...');

  // State for Calendar Navigation
  const [currentCalendarDate, setCurrentCalendarDate] = useState(() => new Date());

  // Calendar Day Override settings Modal States
  const [selectedCalDateStr, setSelectedCalDateStr] = useState<string | null>(null);
  const [calDateOption, setCalDateOption] = useState<'NORMAL' | 'CLOSED' | 'CUSTOM'>('NORMAL');
  const [calCustomOpen, setCalCustomOpen] = useState('08:00');
  const [calCustomClose, setCalCustomClose] = useState('21:00');

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Generate Calendar Days Grid
  const calendarDays = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay();
    
    // Total days in month
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days: { date: Date; isCurrentMonth: boolean; dateString: string }[] = [];
    
    // Previous month padding
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthTotalDays - i);
      days.push({
        date: d,
        isCurrentMonth: false,
        dateString: d.toLocaleDateString('en-CA'),
      });
    }
    
    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        isCurrentMonth: true,
        dateString: d.toLocaleDateString('en-CA'),
      });
    }
    
    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        isCurrentMonth: false,
        dateString: d.toLocaleDateString('en-CA'),
      });
    }
    
    return days;
  }, [currentCalendarDate]);

  const toggleDisabledDate = (dateStr: string) => {
    setDisabledDates((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr]
    );
  };

  const toggleOperationalDay = (dayIndex: number) => {
    setOperationalDays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex].sort()
    );
  };

  const handleCalendarDayClick = (dateStr: string) => {
    setSelectedCalDateStr(dateStr);
    const isClosed = disabledDates.includes(dateStr);
    const custom = customHours.dates?.[dateStr];
    
    if (isClosed) {
      setCalDateOption('CLOSED');
    } else if (custom) {
      setCalDateOption('CUSTOM');
      setCalCustomOpen(custom.openTime);
      setCalCustomClose(custom.closeTime);
    } else {
      setCalDateOption('NORMAL');
      setCalCustomOpen('08:00');
      setCalCustomClose('21:00');
    }
  };

  const applyCalendarDaySettings = () => {
    if (!selectedCalDateStr) return;
    
    if (calDateOption === 'NORMAL') {
      setDisabledDates(prev => prev.filter(d => d !== selectedCalDateStr));
      setCustomHours(prev => {
        const dates = { ...(prev.dates || {}) };
        delete dates[selectedCalDateStr];
        return { ...prev, dates };
      });
    } else if (calDateOption === 'CLOSED') {
      setDisabledDates(prev => prev.includes(selectedCalDateStr) ? prev : [...prev, selectedCalDateStr]);
      setCustomHours(prev => {
        const dates = { ...(prev.dates || {}) };
        delete dates[selectedCalDateStr];
        return { ...prev, dates };
      });
    } else if (calDateOption === 'CUSTOM') {
      setDisabledDates(prev => prev.filter(d => d !== selectedCalDateStr));
      setCustomHours(prev => {
        const dates = { ...(prev.dates || {}) };
        dates[selectedCalDateStr] = { openTime: calCustomOpen, closeTime: calCustomClose };
        return { ...prev, dates };
      });
    }
    
    setSelectedCalDateStr(null);
  };

  const prevMonth = () => {
    setCurrentCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

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
        if (d.operationalDays) {
          try {
            setOperationalDays(JSON.parse(d.operationalDays));
          } catch {
            setOperationalDays([0, 1, 2, 3, 4, 5, 6]);
          }
        }
        if (d.disabledDates) {
          try {
            setDisabledDates(JSON.parse(d.disabledDates));
          } catch {
            setDisabledDates([]);
          }
        }
        if (d.customHours) {
          try {
            setCustomHours(JSON.parse(d.customHours));
          } catch {
            setCustomHours({});
          }
        }
        if (d.whatsappNumber !== undefined) setWhatsappNumber(d.whatsappNumber);
        if (d.whatsappMessage !== undefined) setWhatsappMessage(d.whatsappMessage);
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
        body: JSON.stringify({
          openTime,
          closeTime,
          pickupSlotInterval,
          cancellationTimeLimit,
          deliveryFeePerKm,
          maxDeliveryDistance,
          storeName,
          storeAddress,
          storeLat,
          storeLng,
          operationalDays: JSON.stringify(operationalDays),
          disabledDates: JSON.stringify(disabledDates),
          customHours: JSON.stringify(customHours),
          whatsappNumber,
          whatsappMessage,
        }),
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

        {/* Hari Operasional & Kalender Libur */}
        <div className="border-t border-border pt-6 space-y-6">
          <div>
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-brand-600" /> Hari Operasional Mingguan
            </h3>
            <p className="text-xs text-muted-foreground mb-3">Tentukan hari-hari dalam seminggu di mana toko Anda menerima pesanan.</p>
            <div className="flex flex-wrap gap-2">
              {['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((dayName, idx) => {
                const isActive = operationalDays.includes(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleOperationalDay(idx)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer
                      ${isActive
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-600/10 border border-brand-600'
                        : 'bg-background text-muted-foreground border border-border hover:border-muted-foreground'
                      }`}
                  >
                    {dayName}
                  </button>
                );
              })}
            </div>

            {/* Weekday Custom Hours Overrides */}
            <div className="mt-4 space-y-3 bg-muted/20 p-4.5 rounded-2xl border border-border">
              <h4 className="text-xs font-bold text-foreground">Jam Khusus Hari Tertentu (Opsional)</h4>
              <p className="text-[11px] text-muted-foreground">Tentukan jam operasional khusus untuk hari operasional tertentu (kosongkan untuk menggunakan jam default toko).</p>
              <div className="space-y-3">
                {['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((dayName, idx) => {
                  const isOperational = operationalDays.includes(idx);
                  if (!isOperational) return null;
                  
                  const hasOverride = !!customHours.weekdays?.[String(idx)];
                  const overrideOpen = customHours.weekdays?.[String(idx)]?.openTime || '08:00';
                  const overrideClose = customHours.weekdays?.[String(idx)]?.closeTime || '21:00';
                  
                  return (
                    <div key={idx} className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0 flex-wrap sm:flex-nowrap">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`override-wd-${idx}`}
                          checked={hasOverride}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setCustomHours(prev => {
                              const weekdays = { ...(prev.weekdays || {}) };
                              if (checked) {
                                weekdays[String(idx)] = { openTime: '08:00', closeTime: '21:00' };
                              } else {
                                delete weekdays[String(idx)];
                              }
                              return { ...prev, weekdays };
                            });
                          }}
                          className="rounded border-border text-brand-600 focus:ring-brand-500"
                        />
                        <label htmlFor={`override-wd-${idx}`} className="text-xs font-bold text-foreground cursor-pointer">
                          Jam khusus hari {dayName}
                        </label>
                      </div>
                      
                      {hasOverride && (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={overrideOpen}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomHours(prev => {
                                const weekdays = { ...(prev.weekdays || {}) };
                                weekdays[String(idx)] = { ...weekdays[String(idx)], openTime: val };
                                return { ...prev, weekdays };
                              });
                            }}
                            className="px-2 py-1 bg-background border border-border rounded-lg text-xs"
                          />
                          <span className="text-xs text-muted-foreground">s/d</span>
                          <input
                            type="time"
                            value={overrideClose}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomHours(prev => {
                                const weekdays = { ...(prev.weekdays || {}) };
                                weekdays[String(idx)] = { ...weekdays[String(idx)], closeTime: val };
                                return { ...prev, weekdays };
                              });
                            }}
                            className="px-2 py-1 bg-background border border-border rounded-lg text-xs"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-brand-600" /> Kalender Libur & Penutupan Toko
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Klik tanggal pada kalender untuk menetapkannya sebagai hari libur nasional atau mengatur jam buka khusus pada tanggal tersebut.</p>
            
            <div className="bg-background border border-border rounded-2xl p-4 max-w-sm mx-auto shadow-sm">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-serif font-black text-sm text-foreground">
                  {currentCalendarDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Day Names Grid */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
                  <span key={d} className="text-[10px] font-extrabold text-muted-foreground uppercase">
                    {d}
                  </span>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map(({ date, isCurrentMonth, dateString }, idx) => {
                  const dayOfWeek = date.getDay();
                  const isOffDay = !operationalDays.includes(dayOfWeek);
                  const isCustomClosed = disabledDates.includes(dateString);
                  const customDateHours = customHours.dates?.[dateString];
                  const isToday = date.toLocaleDateString('en-CA') === new Date().toLocaleDateString('en-CA');
                  
                  let buttonStyle = 'bg-transparent text-foreground hover:bg-muted';
                  let statusText = '';

                  if (isCustomClosed) {
                    buttonStyle = 'bg-red-500 text-white hover:bg-red-600 shadow-sm font-bold';
                    statusText = 'Tutup';
                  } else if (customDateHours) {
                    buttonStyle = 'bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold';
                    statusText = `${customDateHours.openTime}`;
                  } else if (isOffDay) {
                    buttonStyle = 'bg-amber-100 text-amber-700 opacity-80 cursor-not-allowed';
                    statusText = 'Libur';
                  } else if (!isCurrentMonth) {
                    buttonStyle = 'text-muted-foreground/35 hover:bg-muted';
                  }

                  if (isToday && !isCustomClosed && !isOffDay) {
                    buttonStyle += ' border-2 border-brand-500 font-bold';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isOffDay}
                      onClick={() => handleCalendarDayClick(dateString)}
                      className={`h-10 relative flex flex-col items-center justify-center rounded-xl text-xs transition-all cursor-pointer ${buttonStyle}`}
                    >
                      <span>{date.getDate()}</span>
                      {statusText && (
                        <span className="absolute bottom-0.5 text-[7px] font-black uppercase scale-90 leading-none">
                          {statusText}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            {disabledDates.length > 0 && (
              <div className="mt-4 space-y-2">
                <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Daftar Tanggal Tutup Custom:</span>
                <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto pr-1">
                  {disabledDates.map((dateStr) => (
                    <span
                      key={dateStr}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-100 text-[11px] font-bold"
                    >
                      {new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      <button
                        type="button"
                        onClick={() => toggleDisabledDate(dateStr)}
                        className="text-red-400 hover:text-red-700 font-bold ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(customHours.dates || {}).length > 0 && (
              <div className="mt-4 space-y-2">
                <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">Daftar Tanggal Jam Khusus:</span>
                <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                  {Object.entries(customHours.dates || {}).map(([dateStr, hours]) => (
                    <span
                      key={dateStr}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-bold"
                    >
                      {new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} ({hours.openTime} - {hours.closeTime})
                      <button
                        type="button"
                        onClick={() => {
                          setCustomHours(prev => {
                            const dates = { ...(prev.dates || {}) };
                            delete dates[dateStr];
                            return { ...prev, dates };
                          });
                        }}
                        className="text-emerald-400 hover:text-emerald-700 font-bold ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
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
          <h3 className="font-bold text-foreground mb-4">Layanan WhatsApp CS</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Nomor WhatsApp CS</label>
              <input type="text" value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)}
                placeholder="Contoh: 628123456789"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:border-brand-500" />
              <p className="text-xs text-muted-foreground mt-2">Nomor WhatsApp customer service toko (gunakan format kode negara tanpa +, contoh: 628123456789).</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Pesan Default</label>
              <textarea value={whatsappMessage} onChange={e => setWhatsappMessage(e.target.value)}
                rows={3}
                placeholder="Pesan default saat pembeli mengklik WhatsApp..."
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:border-brand-500 resize-none" />
              <p className="text-xs text-muted-foreground mt-2">Pesan otomatis yang akan terisi di chat WhatsApp pelanggan saat mereka menghubungi Anda.</p>
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

      {/* Calendar Date Option Modal */}
      <AnimatePresence>
        {selectedCalDateStr && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-sm rounded-2xl border border-border p-6 shadow-2xl space-y-4"
            >
              <div>
                <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-brand-600" />
                  Atur Tanggal: {new Date(selectedCalDateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1">Pilih status operasional toko untuk tanggal ini.</p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setCalDateOption('NORMAL')}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                    calDateOption === 'NORMAL'
                      ? 'border-brand-500 bg-brand-50/50 text-brand-700 font-bold'
                      : 'border-border bg-background text-foreground hover:bg-muted'
                  }`}
                >
                  <span>Buka Normal (Sesuai Jam default)</span>
                  {calDateOption === 'NORMAL' && <span className="w-2 h-2 rounded-full bg-brand-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => setCalDateOption('CLOSED')}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                    calDateOption === 'CLOSED'
                      ? 'border-red-500 bg-red-50/50 text-red-700 font-bold'
                      : 'border-border bg-background text-foreground hover:bg-muted'
                  }`}
                >
                  <span>Tutup Toko (Libur)</span>
                  {calDateOption === 'CLOSED' && <span className="w-2 h-2 rounded-full bg-red-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => setCalDateOption('CUSTOM')}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                    calDateOption === 'CUSTOM'
                      ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 font-bold'
                      : 'border-border bg-background text-foreground hover:bg-muted'
                  }`}
                >
                  <span>Jam Buka Khusus</span>
                  {calDateOption === 'CUSTOM' && <span className="w-2 h-2 rounded-full bg-emerald-600" />}
                </button>
              </div>

              {calDateOption === 'CUSTOM' && (
                <div className="p-3 bg-muted/20 border border-border rounded-xl space-y-2.5">
                  <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Atur Jam Buka Khusus:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-muted-foreground mb-1">JAM BUKA</label>
                      <input
                        type="time"
                        value={calCustomOpen}
                        onChange={(e) => setCalCustomOpen(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-border bg-background rounded-lg text-xs focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-muted-foreground mb-1">JAM TUTUP</label>
                      <input
                        type="time"
                        value={calCustomClose}
                        onChange={(e) => setCalCustomClose(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-border bg-background rounded-lg text-xs focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCalDateStr(null)}
                  className="flex-1 px-4 py-2.5 border border-border bg-background text-muted-foreground rounded-xl text-xs font-semibold hover:text-foreground transition-all active:scale-95"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={applyCalendarDaySettings}
                  className="flex-1 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-semibold hover:bg-brand-700 transition-all shadow-md shadow-brand-600/10 active:scale-95"
                >
                  Terapkan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Saving Loader Overlay Screen */}
      <AnimatePresence>
        {saving && (
          <LoadingScreen 
            fullScreen={true}
            customMessages={[
              "Menyimpan pengaturan toko...",
              "Memperbarui jam operasional...",
              "Menyelaraskan tarif pengiriman...",
              "Mohon tunggu sebentar..."
            ]}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
