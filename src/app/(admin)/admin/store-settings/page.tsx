'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Save,
  Loader2,
  Store,
  MapPin,
  LocateFixed,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Volume2,
  Play,
  Square,
  UploadCloud,
  RotateCcw,
  Check,
  Sparkles,
  Flame,
  Zap,
  Truck,
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Bell,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useToast } from '@/components/ui/Toast';
import { formatRupiah, cn } from '@/lib/utils';
import type L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getAlarmSoundUrl, playBoostedAudio } from '@/lib/alarm-utils';

export default function StoreSettingsPage() {
  const { showToast } = useToast();

  // Active Tab: 'profile' | 'hours' | 'delivery' | 'alarm'
  const [activeTab, setActiveTab] = useState<'profile' | 'hours' | 'delivery' | 'alarm'>('profile');

  // Unified Store & SPMB Hours
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('21:00');

  // Operational Days & Calendar Overrides
  const [operationalDays, setOperationalDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [disabledDates, setDisabledDates] = useState<string[]>([]);
  const [customHours, setCustomHours] = useState<{
    weekdays?: { [key: string]: { openTime: string; closeTime: string } };
    dates?: { [key: string]: { openTime: string; closeTime: string } };
  }>({});

  // Store Profile & Location
  const [storeName, setStoreName] = useState('Arum Seduh HQ');
  const [storeAddress, setStoreAddress] = useState('Jl. Mastrip No 357, Probolinggo');
  const [storeLat, setStoreLat] = useState(-7.78125167);
  const [storeLng, setStoreLng] = useState(113.212266);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('Halo Arum Seduh, saya ingin bertanya...');

  // Delivery & Pickup Rules
  const [deliveryFeePerKm, setDeliveryFeePerKm] = useState(2000);
  const [maxDeliveryDistance, setMaxDeliveryDistance] = useState(10);
  const [pickupSlotInterval, setPickupSlotInterval] = useState(5);
  const [cancellationTimeLimit, setCancellationTimeLimit] = useState(15);

  // Audio Alarm & Notification
  const [pickupAlarmLeadTime, setPickupAlarmLeadTime] = useState(30);
  const [alarmSoundUrl, setAlarmSoundUrl] = useState('');
  const [alarmVolumeBoost, setAlarmVolumeBoost] = useState(350);
  const [adminWaNumbers, setAdminWaNumbers] = useState('');

  // Audio preview & upload state
  const [isUploadingAlarm, setIsUploadingAlarm] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [uploadAlarmError, setUploadAlarmError] = useState<string | null>(null);
  const [uploadAlarmSuccess, setUploadAlarmSuccess] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Calendar Day Override Modal State
  const [currentCalendarDate, setCurrentCalendarDate] = useState(() => new Date());
  const [selectedCalDateStr, setSelectedCalDateStr] = useState<string | null>(null);
  const [calDateOption, setCalDateOption] = useState<'NORMAL' | 'CLOSED' | 'CUSTOM'>('NORMAL');
  const [calCustomOpen, setCalCustomOpen] = useState('08:00');
  const [calCustomClose, setCalCustomClose] = useState('21:00');

  // Leaflet Map Refs
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Page lifecycle
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Keyboard shortcut: ⌘S or Ctrl+S to save settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
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
    operationalDays,
    disabledDates,
    customHours,
    whatsappNumber,
    whatsappMessage,
    pickupAlarmLeadTime,
    alarmSoundUrl,
    alarmVolumeBoost,
    adminWaNumbers,
  ]);

  // Generate Calendar Days Grid
  const calendarDays = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay();
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

  // Calendar Actions
  const toggleOperationalDay = (dayIndex: number) => {
    setOperationalDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex].sort()
    );
  };

  const toggleDisabledDate = (dateStr: string) => {
    setDisabledDates((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr]
    );
  };

  const handleCalendarDayClick = (dateString: string) => {
    setSelectedCalDateStr(dateString);
    const isClosed = disabledDates.includes(dateString);
    const custom = customHours.dates?.[dateString];

    if (isClosed) {
      setCalDateOption('CLOSED');
      setCalCustomOpen('08:00');
      setCalCustomClose('21:00');
    } else if (custom) {
      setCalDateOption('CUSTOM');
      setCalCustomOpen(custom.openTime);
      setCalCustomClose(custom.closeTime);
    } else {
      setCalDateOption('NORMAL');
      setCalCustomOpen(openTime);
      setCalCustomClose(closeTime);
    }
  };

  const applyCalendarDaySettings = () => {
    if (!selectedCalDateStr) return;

    if (calDateOption === 'NORMAL') {
      setDisabledDates((prev) => prev.filter((d) => d !== selectedCalDateStr));
      setCustomHours((prev) => {
        const dates = { ...(prev.dates || {}) };
        delete dates[selectedCalDateStr];
        return { ...prev, dates };
      });
    } else if (calDateOption === 'CLOSED') {
      setDisabledDates((prev) =>
        prev.includes(selectedCalDateStr) ? prev : [...prev, selectedCalDateStr]
      );
      setCustomHours((prev) => {
        const dates = { ...(prev.dates || {}) };
        delete dates[selectedCalDateStr];
        return { ...prev, dates };
      });
    } else if (calDateOption === 'CUSTOM') {
      setDisabledDates((prev) => prev.filter((d) => d !== selectedCalDateStr));
      setCustomHours((prev) => {
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

  // Fetch Store Settings
  useEffect(() => {
    fetch('/api/admin/store-settings')
      .then((r) => r.json())
      .then((d) => {
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
        if (d.pickupAlarmLeadTime !== undefined) setPickupAlarmLeadTime(d.pickupAlarmLeadTime);
        if (d.alarmSoundUrl !== undefined) setAlarmSoundUrl(d.alarmSoundUrl || '');
        if (d.alarmVolumeBoost !== undefined) setAlarmVolumeBoost(d.alarmVolumeBoost);
        if (d.adminWaNumbers !== undefined) setAdminWaNumbers(d.adminWaNumbers);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Initialize Map on Profile Tab
  useEffect(() => {
    if (loading || activeTab !== 'profile' || !mapContainer.current || mapRef.current) return;

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
                 <div class="w-8 h-8 bg-orange-500 rounded-full border-3 border-white shadow-xl flex items-center justify-center relative z-10">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                 </div>
               </div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      markerRef.current = L.marker([storeLat, storeLng], {
        icon,
        draggable: true,
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
  }, [loading, activeTab]);

  // Handle direct input change to map
  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      markerRef.current.setLatLng([storeLat, storeLng]);
      mapRef.current.panTo([storeLat, storeLng]);
    }
  }, [storeLat, storeLng]);

  const handleDetectLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setStoreLat(pos.coords.latitude);
          setStoreLng(pos.coords.longitude);
          showToast('Koordinat GPS berhasil dideteksi', 'success');
        },
        () => {
          showToast('Tidak dapat mendeteksi lokasi GPS', 'error');
        }
      );
    }
  };

  // Audio Preview Handler
  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  const handleTogglePreview = () => {
    if (isPlayingPreview) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
      }
      setIsPlayingPreview(false);
      return;
    }

    const effectiveUrl = getAlarmSoundUrl(alarmSoundUrl);

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }

    const audio = new Audio(effectiveUrl);
    audio.crossOrigin = 'anonymous';
    previewAudioRef.current = audio;
    setIsPlayingPreview(true);

    playBoostedAudio(audio, alarmVolumeBoost).catch(() => {
      setIsPlayingPreview(false);
    });

    audio.onended = () => {
      setIsPlayingPreview(false);
    };
  };

  const handleBoostChange = (newBoost: number) => {
    setAlarmVolumeBoost(newBoost);
    if (previewAudioRef.current && isPlayingPreview) {
      playBoostedAudio(previewAudioRef.current, newBoost).catch(() => {});
    }
  };

  const handleAlarmUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadAlarmError(null);
    setUploadAlarmSuccess(null);

    if (file.size > 5 * 1024 * 1024) {
      setUploadAlarmError('Ukuran file maksimal 5MB!');
      return;
    }

    setIsUploadingAlarm(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/store-settings/upload-alarm', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengupload file audio');
      }

      setAlarmSoundUrl(data.url);
      setUploadAlarmSuccess('Audio alarm kustom berhasil diunggah! Klik Simpan Pengaturan untuk menerapkan.');

      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      const audio = new Audio(data.url);
      audio.crossOrigin = 'anonymous';
      previewAudioRef.current = audio;
      setIsPlayingPreview(true);
      playBoostedAudio(audio, alarmVolumeBoost).catch(() => setIsPlayingPreview(false));
      audio.onended = () => setIsPlayingPreview(false);
    } catch (err: any) {
      setUploadAlarmError(err.message || 'Gagal mengupload audio alarm');
    } finally {
      setIsUploadingAlarm(false);
      e.target.value = '';
    }
  };

  const handleResetAlarmToDefault = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }
    setIsPlayingPreview(false);
    setAlarmSoundUrl('');
    setUploadAlarmSuccess('Kembali ke nada alarm bawaan Arum Seduh. Klik Simpan Pengaturan untuk menerapkan.');
    setUploadAlarmError(null);
  };

  // Unified Save Handler
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
          pickupAlarmLeadTime,
          alarmSoundUrl,
          alarmVolumeBoost,
          // Harmonisasi: Jam buka & tutup toko menjadi 1 acuan tunggal untuk Toko & SPMB
          spmbStartTime: openTime,
          spmbEndTime: closeTime,
          spmbCloseTime: closeTime,
          adminWaNumbers,
        }),
      });

      if (res.ok) {
        setSaved(true);
        showToast('Pengaturan kedai Arum Seduh berhasil disimpan!', 'success');
        setTimeout(() => setSaved(false), 3000);
      } else {
        throw new Error();
      }
    } catch {
      showToast('Gagal menyimpan pengaturan toko', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-2" />
        <p className="text-xs font-semibold">Memuat data pengaturan Arum Seduh...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left max-w-5xl mx-auto pb-12">
      {/* ── TOP HEADER & WORKSPACE ACTION BAR ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 font-heading">
              Pengaturan Toko
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Jam Terpadu: {openTime} - {closeTime} WIB</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Konfigurasi profil kedai, jam operasional terpadu (Toko & SPMB), pengiriman, dan alarm notifikasi Arum Seduh
          </p>
        </div>

        {/* Quick Save Action */}
        <div className="flex items-center gap-2.5">
          {saved && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <Check className="w-3.5 h-3.5" />
              <span>Tersimpan!</span>
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-glow-orange flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer active:scale-95"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
          </button>
        </div>
      </div>

      {/* ── SEGMENTED MODERN TAB NAVIGATION ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={cn(
            'py-3 px-4 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer',
            activeTab === 'profile'
              ? 'border-orange-500 text-orange-600 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          <Store className="w-4 h-4" />
          <span>Profil & Lokasi GPS</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('hours')}
          className={cn(
            'py-3 px-4 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer',
            activeTab === 'hours'
              ? 'border-orange-500 text-orange-600 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          <Clock className="w-4 h-4" />
          <span>Jam Operasional Terpadu</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('delivery')}
          className={cn(
            'py-3 px-4 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer',
            activeTab === 'delivery'
              ? 'border-orange-500 text-orange-600 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          <Truck className="w-4 h-4" />
          <span>Pengiriman & Penjemputan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('alarm')}
          className={cn(
            'py-3 px-4 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer',
            activeTab === 'alarm'
              ? 'border-orange-500 text-orange-600 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          <Volume2 className="w-4 h-4" />
          <span>Audio Alarm & Suara</span>
        </button>
      </div>

      {/* ── TAB 1: PROFIL & LOKASI GPS ── */}
      {activeTab === 'profile' && (
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
                <div ref={mapContainer} className="absolute inset-0" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 italic">
                Tips: Geser pin oranye atau klik di peta untuk menentukan koordinat fisik kedai Arum Seduh.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: JAM OPERASIONAL TERPADU (TOKO & SPMB JADI 1) ── */}
      {activeTab === 'hours' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Banner Penyatuan Jam Operasional */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/80 rounded-3xl p-4.5 flex items-start gap-3.5 shadow-2xs">
            <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-xs space-y-1">
              <h4 className="font-extrabold text-orange-950 text-sm">
                Jam Operasional Terpadu (Toko & SPMB Menjadi 1)
              </h4>
              <p className="text-orange-900/80 leading-relaxed">
                Jam buka dan jam tutup di bawah ini menjadi <strong>satu-satunya acuan operasional resmi</strong>. Seluruh pesanan dari storefront reguler, makan di tempat (Dine-in), penjemputan (Pickup), dan pengantaran SPMB beroperasi dalam rentang waktu yang sama secara konsisten.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Card: Jam Buka & Tutup Utama */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                  <Clock className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm font-heading">
                    Jam Operasional Harian
                  </h3>
                  <p className="text-[11px] text-slate-400">Jam buka dan tutup standar kedai</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Jam Buka (WIB)
                  </label>
                  <input
                    type="time"
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                    className="w-full px-3 py-2 text-base font-extrabold text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Mulai terima order
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Jam Tutup (WIB)
                  </label>
                  <input
                    type="time"
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                    className="w-full px-3 py-2 text-base font-extrabold text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Batas akhir checkout
                  </span>
                </div>
              </div>

              {/* Hari Operasional Mingguan */}
              <div className="pt-2">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  Hari Buka Mingguan (Pilih Hari Aktif)
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((dayName, idx) => {
                    const isActive = operationalDays.includes(idx);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleOperationalDay(idx)}
                        className={cn(
                          'px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95',
                          isActive
                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        )}
                      >
                        {dayName}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Jam Khusus Hari Tertentu */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <h4 className="text-xs font-extrabold text-slate-900">
                  Jam Khusus Hari Tertentu (Opsional)
                </h4>
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((dayName, idx) => {
                    if (!operationalDays.includes(idx)) return null;
                    const hasOverride = !!customHours.weekdays?.[String(idx)];
                    const overrideOpen = customHours.weekdays?.[String(idx)]?.openTime || openTime;
                    const overrideClose = customHours.weekdays?.[String(idx)]?.closeTime || closeTime;

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 p-2 rounded-xl bg-slate-50 text-xs"
                      >
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                          <input
                            type="checkbox"
                            checked={hasOverride}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setCustomHours((prev) => {
                                const weekdays = { ...(prev.weekdays || {}) };
                                if (checked) {
                                  weekdays[String(idx)] = { openTime, closeTime };
                                } else {
                                  delete weekdays[String(idx)];
                                }
                                return { ...prev, weekdays };
                              });
                            }}
                            className="rounded text-orange-500 focus:ring-orange-400"
                          />
                          <span>{dayName}</span>
                        </label>

                        {hasOverride && (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="time"
                              value={overrideOpen}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomHours((prev) => {
                                  const weekdays = { ...(prev.weekdays || {}) };
                                  weekdays[String(idx)] = { ...weekdays[String(idx)], openTime: val };
                                  return { ...prev, weekdays };
                                });
                              }}
                              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                            />
                            <span className="text-slate-400">-</span>
                            <input
                              type="time"
                              value={overrideClose}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomHours((prev) => {
                                  const weekdays = { ...(prev.weekdays || {}) };
                                  weekdays[String(idx)] = { ...weekdays[String(idx)], closeTime: val };
                                  return { ...prev, weekdays };
                                });
                              }}
                              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Card: Kalender Libur & Jam Khusus */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                  <CalendarIcon className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm font-heading">
                    Kalender Libur & Jam Khusus
                  </h3>
                  <p className="text-[11px] text-slate-400">Klik tanggal untuk mengatur hari libur atau jam khusus</p>
                </div>
              </div>

              {/* Calendar Container */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 max-w-sm mx-auto shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-xs text-slate-800">
                    {currentCalendarDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                  {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
                    <span key={d} className="text-[9px] font-extrabold text-slate-400 uppercase">
                      {d}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map(({ date, isCurrentMonth, dateString }, idx) => {
                    const dayOfWeek = date.getDay();
                    const isOffDay = !operationalDays.includes(dayOfWeek);
                    const isCustomClosed = disabledDates.includes(dateString);
                    const customDateHours = customHours.dates?.[dateString];
                    const isToday = date.toLocaleDateString('en-CA') === new Date().toLocaleDateString('en-CA');

                    let buttonStyle = 'bg-white text-slate-700 hover:bg-orange-50';
                    let statusText = '';

                    if (isCustomClosed) {
                      buttonStyle = 'bg-rose-500 text-white font-bold shadow-xs';
                      statusText = 'Tutup';
                    } else if (customDateHours) {
                      buttonStyle = 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300';
                      statusText = customDateHours.openTime;
                    } else if (isOffDay) {
                      buttonStyle = 'bg-amber-100/70 text-amber-700 opacity-60 cursor-not-allowed';
                      statusText = 'Libur';
                    } else if (!isCurrentMonth) {
                      buttonStyle = 'text-slate-300 hover:bg-slate-100';
                    }

                    if (isToday && !isCustomClosed && !isOffDay) {
                      buttonStyle += ' border-2 border-orange-500 font-extrabold';
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={isOffDay}
                        onClick={() => handleCalendarDayClick(dateString)}
                        className={`h-9 relative flex flex-col items-center justify-center rounded-xl text-xs transition-all cursor-pointer ${buttonStyle}`}
                      >
                        <span>{date.getDate()}</span>
                        {statusText && (
                          <span className="absolute bottom-0.5 text-[6px] font-black uppercase scale-90 leading-none">
                            {statusText}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tag Chips for Custom Disabled Dates */}
              {disabledDates.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Daftar Hari Libur Khusus:
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-[70px] overflow-y-auto">
                    {disabledDates.map((dStr) => (
                      <span
                        key={dStr}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-bold"
                      >
                        {new Date(dStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        <button
                          type="button"
                          onClick={() => toggleDisabledDate(dStr)}
                          className="hover:text-rose-900 ml-0.5 cursor-pointer"
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
        </div>
      )}

      {/* ── TAB 3: PENGIRIMAN & PENJEMPUTAN (DELIVERY & PICKUP) ── */}
      {activeTab === 'delivery' && (
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
      )}

      {/* ── TAB 4: AUDIO ALARM & NOTIFIKASI ── */}
      {activeTab === 'alarm' && (
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
      )}

      {/* ── STICKY BOTTOM SAVE BAR ── */}
      <div className="sticky bottom-4 z-40 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-lg flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-slate-600 font-medium">
            Perubahan belum disimpan otomatis. Tekan tombol Simpan atau shortcut <kbd className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">Ctrl+S</kbd>
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {saved && (
            <span className="text-xs font-bold text-emerald-600">
              ✓ Berhasil Disimpan!
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-glow-orange flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer active:scale-95"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
          </button>
        </div>
      </div>

      {/* ── CALENDAR DATE OVERRIDE MODAL ── */}
      <AnimatePresence>
        {selectedCalDateStr && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-3xl border border-slate-100 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 font-heading">
                  <CalendarIcon className="w-4 h-4 text-orange-600" />
                  Atur Tanggal: {new Date(selectedCalDateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">Pilih status operasional kedai pada tanggal ini</p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setCalDateOption('NORMAL')}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer',
                    calDateOption === 'NORMAL'
                      ? 'border-orange-500 bg-orange-50/60 text-orange-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <span>Buka Normal ({openTime} - {closeTime})</span>
                  {calDateOption === 'NORMAL' && <span className="w-2 h-2 rounded-full bg-orange-500" />}
                </button>

                <button
                  type="button"
                  onClick={() => setCalDateOption('CLOSED')}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer',
                    calDateOption === 'CLOSED'
                      ? 'border-rose-500 bg-rose-50/60 text-rose-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <span>Tutup Kedai (Libur Khusus)</span>
                  {calDateOption === 'CLOSED' && <span className="w-2 h-2 rounded-full bg-rose-500" />}
                </button>

                <button
                  type="button"
                  onClick={() => setCalDateOption('CUSTOM')}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer',
                    calDateOption === 'CUSTOM'
                      ? 'border-emerald-500 bg-emerald-50/60 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <span>Jam Buka Khusus</span>
                  {calDateOption === 'CUSTOM' && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                </button>
              </div>

              {calDateOption === 'CUSTOM' && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Jam Buka Khusus Tanggal Ini:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block mb-1">JAM BUKA</label>
                      <input
                        type="time"
                        value={calCustomOpen}
                        onChange={(e) => setCalCustomOpen(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block mb-1">JAM TUTUP</label>
                      <input
                        type="time"
                        value={calCustomClose}
                        onChange={(e) => setCalCustomClose(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCalDateStr(null)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={applyCalendarDaySettings}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-xs cursor-pointer"
                >
                  Terapkan
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Saving Loader Overlay Screen */}
      <AnimatePresence>
        {saving && (
          <LoadingScreen
            fullScreen={true}
            customMessages={[
              'Menyimpan pengaturan toko...',
              'Menyelaraskan jam operasional toko & SPMB...',
              'Memperbarui konfigurasi kedai Arum Seduh...',
              'Mohon tunggu sebentar...',
            ]}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
