'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Clock,
  Save,
  Loader2,
  Store,
  Volume2,
  Truck,
  Check,
} from 'lucide-react';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import type L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getAlarmSoundUrl, playBoostedAudio } from '@/lib/alarm-utils';

import { StoreSettingsTab, CustomHoursConfig, CalendarDateOption } from './_components/types';
import { ProfileGpsTab } from './_components/ProfileGpsTab';
import { OperatingHoursTab } from './_components/OperatingHoursTab';
import { DeliveryPickupTab } from './_components/DeliveryPickupTab';
import { AlarmAudioTab } from './_components/AlarmAudioTab';
import { HolidaysModal } from './_components/HolidaysModal';
import { StickySaveBar } from './_components/StickySaveBar';

export default function StoreSettingsPage() {
  const { showToast } = useToast();

  // Active Tab: 'profile' | 'hours' | 'delivery' | 'alarm'
  const [activeTab, setActiveTab] = useState<StoreSettingsTab>('profile');

  // Unified Store & SPMB Hours
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('21:00');

  // Operational Days & Calendar Overrides
  const [operationalDays, setOperationalDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [disabledDates, setDisabledDates] = useState<string[]>([]);
  const [customHours, setCustomHours] = useState<CustomHoursConfig>({});

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

  // Audio Alarm & Notification (presets: '500%', '700%', '1000%', max="1000")
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
  const [calDateOption, setCalDateOption] = useState<CalendarDateOption>('NORMAL');
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

  // Booster Overdrive Level Change Handler (supports 500%, 700%, 1000%, max="1000")
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
        <ProfileGpsTab
          storeName={storeName}
          setStoreName={setStoreName}
          storeAddress={storeAddress}
          setStoreAddress={setStoreAddress}
          whatsappNumber={whatsappNumber}
          setWhatsappNumber={setWhatsappNumber}
          whatsappMessage={whatsappMessage}
          setWhatsappMessage={setWhatsappMessage}
          storeLat={storeLat}
          setStoreLat={setStoreLat}
          storeLng={storeLng}
          setStoreLng={setStoreLng}
          handleDetectLocation={handleDetectLocation}
          mapContainerRef={mapContainer}
        />
      )}

      {/* ── TAB 2: JAM OPERASIONAL TERPADU (TOKO & SPMB JADI 1) ── */}
      {activeTab === 'hours' && (
        <OperatingHoursTab
          openTime={openTime}
          setOpenTime={setOpenTime}
          closeTime={closeTime}
          setCloseTime={setCloseTime}
          operationalDays={operationalDays}
          toggleOperationalDay={toggleOperationalDay}
          customHours={customHours}
          setCustomHours={setCustomHours}
          disabledDates={disabledDates}
          toggleDisabledDate={toggleDisabledDate}
          currentCalendarDate={currentCalendarDate}
          prevMonth={prevMonth}
          nextMonth={nextMonth}
          calendarDays={calendarDays}
          handleCalendarDayClick={handleCalendarDayClick}
        />
      )}

      {/* ── TAB 3: PENGIRIMAN & PENJEMPUTAN (DELIVERY & PICKUP) ── */}
      {activeTab === 'delivery' && (
        <DeliveryPickupTab
          deliveryFeePerKm={deliveryFeePerKm}
          setDeliveryFeePerKm={setDeliveryFeePerKm}
          maxDeliveryDistance={maxDeliveryDistance}
          setMaxDeliveryDistance={setMaxDeliveryDistance}
          pickupSlotInterval={pickupSlotInterval}
          setPickupSlotInterval={setPickupSlotInterval}
          cancellationTimeLimit={cancellationTimeLimit}
          setCancellationTimeLimit={setCancellationTimeLimit}
        />
      )}

      {/* ── TAB 4: AUDIO ALARM & NOTIFIKASI ── */}
      {activeTab === 'alarm' && (
        <AlarmAudioTab
          alarmSoundUrl={alarmSoundUrl}
          alarmVolumeBoost={alarmVolumeBoost}
          handleBoostChange={handleBoostChange}
          isPlayingPreview={isPlayingPreview}
          handleTogglePreview={handleTogglePreview}
          isUploadingAlarm={isUploadingAlarm}
          handleAlarmUpload={handleAlarmUpload}
          handleResetAlarmToDefault={handleResetAlarmToDefault}
          uploadAlarmSuccess={uploadAlarmSuccess}
          uploadAlarmError={uploadAlarmError}
          pickupAlarmLeadTime={pickupAlarmLeadTime}
          setPickupAlarmLeadTime={setPickupAlarmLeadTime}
          adminWaNumbers={adminWaNumbers}
          setAdminWaNumbers={setAdminWaNumbers}
        />
      )}

      {/* ── STICKY BOTTOM SAVE BAR ── */}
      <StickySaveBar
        saved={saved}
        saving={saving}
        handleSave={handleSave}
      />

      {/* ── CALENDAR DATE OVERRIDE MODAL ── */}
      <HolidaysModal
        selectedCalDateStr={selectedCalDateStr}
        onClose={() => setSelectedCalDateStr(null)}
        calDateOption={calDateOption}
        setCalDateOption={setCalDateOption}
        calCustomOpen={calCustomOpen}
        setCalCustomOpen={setCalCustomOpen}
        calCustomClose={calCustomClose}
        setCalCustomClose={setCalCustomClose}
        openTime={openTime}
        closeTime={closeTime}
        applyCalendarDaySettings={applyCalendarDaySettings}
      />

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
