'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Navigation, Search, AlertTriangle, Check, 
  Loader2, X, LocateFixed, ArrowLeft, Building2, ClipboardList 
} from 'lucide-react';
import type L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { calculateDistance, calculateDeliveryFee, isWithinDeliveryRange } from '@/lib/delivery-utils';
import { formatRupiah } from '@/lib/utils';

interface MapPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (data: {
    label: string;
    detail: string;
    streetDetail: string;
    lat: number;
    lng: number;
    distance: number;
    deliveryFee: number;
  }) => void;
  initialLat?: number;
  initialLng?: number;
  deliveryFeePerKm?: number;
  maxDeliveryDistance?: number;
}

interface GeoResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    village?: string;
    county?: string;
  };
}

export function MapPicker({
  isOpen,
  onClose,
  onLocationSelect,
  initialLat,
  initialLng,
  deliveryFeePerKm = 2000,
  maxDeliveryDistance = 10,
}: MapPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const storeMarkerRef = useRef<L.Marker | null>(null);
  const ignoreMapMoveRef = useRef(false);

  const [storeLat, setStoreLat] = useState(-7.756928);
  const [storeLng, setStoreLng] = useState(113.211502);
  const [pinLat, setPinLat] = useState(initialLat ?? -7.756928);
  const [pinLng, setPinLng] = useState(initialLng ?? 113.211502);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isMapMoving, setIsMapMoving] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeoResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Geocoding details
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [addressDetail, setAddressDetail] = useState<string>('');
  const [isReversing, setIsReversing] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  // Two-step wizard: 'MAP' (full screen map pin selection) -> 'DETAILS' (big detailed address form)
  const [pickerStep, setPickerStep] = useState<'MAP' | 'DETAILS'>('MAP');

  // Grab/Gojek-style detailed address states
  const [streetNo, setStreetNo] = useState('');
  const [complexName, setComplexName] = useState('');
  const [patokan, setPatokan] = useState('');
  const [detailError, setDetailError] = useState('');

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reverse geocode: coordinates → address name
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsReversing(true);
    try {
      const res = await fetch(`/api/geocode?mode=reverse&lat=${lat}&lng=${lng}`);
      if (!res.ok) {
        throw new Error('Geocoding service returned error status');
      }
      const data = await res.json();
      if (data && data.display_name) {
        const addr = data.address;
        const label = addr?.road
          ? `${addr.road}${addr.suburb ? `, ${addr.suburb}` : ''}`
          : data.display_name.split(',').slice(0, 3).join(',');
        const detail = data.display_name;
        setSelectedAddress(label);
        setAddressDetail(detail);
      } else {
        throw new Error('No display name in geocoding results');
      }
    } catch (err) {
      console.warn('[Reverse Geocode Fallback]', err);
      // Only fallback to raw coordinates if we do not already have an address populated
      setSelectedAddress((prev) => prev || `Lokasi (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      setAddressDetail((prev) => prev || `Koordinat: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } finally {
      setIsReversing(false);
    }
  }, []);

  // Fetch store location settings & init state
  useEffect(() => {
    fetch('/api/admin/store-settings')
      .then(r => r.json())
      .then(d => {
        if (d.storeLat && d.storeLng) {
          setStoreLat(d.storeLat);
          setStoreLng(d.storeLng);
          if (!initialLat && !initialLng) {
            setPinLat(d.storeLat);
            setPinLng(d.storeLng);
            reverseGeocode(d.storeLat, d.storeLng);
          }
        }
      })
      .catch(() => {});
  }, [initialLat, initialLng, reverseGeocode]);

  // Initial geocode when map opens with initial coordinates
  useEffect(() => {
    if (isOpen) {
      reverseGeocode(pinLat, pinLng);
    }
  }, [isOpen, reverseGeocode]);

  // Initialize Leaflet map
  useEffect(() => {
    if (!isOpen) return;

    let pollInterval: NodeJS.Timeout | null = null;

    const initMap = (L: any) => {
      const container = mapContainer.current;
      if (!container) return false;
      
      // Clean up any existing leaflet ID to prevent "Map container already initialized"
      if ((container as any)._leaflet_id) {
        return true;
      }

      if (mapRef.current) return true; // already initialized

      const map = L.map(container, {
        center: [pinLat, pinLng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      // Store icon
      const storeIcon = L.divIcon({
        html: `<div class="relative flex items-center justify-center">
                 <div class="absolute w-10 h-10 bg-[#D4A574]/20 rounded-full animate-pulse"></div>
                 <div class="w-7 h-7 bg-[#B48A5E] rounded-full border-2 border-white shadow-lg flex items-center justify-center z-10 text-white font-bold text-[10px]">
                   🏪
                 </div>
               </div>`,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      storeMarkerRef.current = L.marker([storeLat, storeLng], { icon: storeIcon })
        .bindPopup('<b>Matchaboy Store</b>')
        .addTo(map);

      // Event listeners for dragging map (Fixed Center Pin)
      map.on('movestart', () => {
        if (ignoreMapMoveRef.current) return;
        setIsMapMoving(true);
        setSelectedAddress(null);
        setAddressDetail('');
      });

      map.on('moveend', () => {
        if (ignoreMapMoveRef.current) {
          ignoreMapMoveRef.current = false;
          setIsMapMoving(false);
          return;
        }
        setIsMapMoving(false);
        const center = map.getCenter();
        setPinLat(center.lat);
        setPinLng(center.lng);
        reverseGeocode(center.lat, center.lng);
      });

      setMapLoaded(true);
      return true;
    };

    import('leaflet').then((leaflet) => {
      const L = leaflet.default;

      // Try immediately
      if (initMap(L)) return;

      // Poll if container not fully rendered yet
      pollInterval = setInterval(() => {
        if (initMap(L)) {
          if (pollInterval) clearInterval(pollInterval);
        }
      }, 100);
    });

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setMapLoaded(false);
    };
  }, [isOpen]);

  // Update store marker when store location changes
  useEffect(() => {
    if (storeMarkerRef.current) {
      storeMarkerRef.current.setLatLng([storeLat, storeLng]);
    }
  }, [storeLat, storeLng]);

  // Forward geocode search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (value.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(value)}&lat=${storeLat}&lng=${storeLng}`);
        const data: GeoResult[] = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
        setShowResults(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  const handleSelectResult = (result: GeoResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    ignoreMapMoveRef.current = true;
    
    setPinLat(lat);
    setPinLng(lng);
    setShowResults(false);

    // Populate selectedAddress and addressDetail instantly from search result to prevent disabled state/delay
    const addr = result.address;
    const label = addr?.road
      ? `${addr.road}${addr.suburb ? `, ${addr.suburb}` : ''}`
      : result.display_name.split(',').slice(0, 3).join(',');
    const detail = result.display_name;
    
    setSelectedAddress(label);
    setAddressDetail(detail);
    setSearchQuery(label);

    // Move map (triggers moveend & reverseGeocode automatically, which will be ignored by ignoreMapMoveRef)
    mapRef.current?.flyTo([lat, lng], 17, { duration: 1.5 });
  };

  const handleDetectLocation = () => {
    if (!('geolocation' in navigator)) return;
    setIsDetecting(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPinLat(lat);
        setPinLng(lng);
        mapRef.current?.flyTo([lat, lng], 17, { duration: 1.5 });
        setIsDetecting(false);
      },
      () => {
        setIsDetecting(false);
        // Fallback: simulate location near store
        const rndOff = () => (Math.random() - 0.5) * 0.015;
        const lat = storeLat + rndOff();
        const lng = storeLng + rndOff();
        setPinLat(lat);
        setPinLng(lng);
        mapRef.current?.flyTo([lat, lng], 17, { duration: 1.2 });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const distance = calculateDistance(storeLat, storeLng, pinLat, pinLng);
  const deliveryFee = calculateDeliveryFee(distance, deliveryFeePerKm);
  const withinRange = isWithinDeliveryRange(distance, maxDeliveryDistance);

  const handleConfirm = () => {
    if (!selectedAddress) return;
    if (!streetNo.trim()) {
      setDetailError('Nomor rumah, unit, atau lantai wajib diisi');
      return;
    }
    setDetailError('');

    // Combine detailed address values to form standard streetDetail string
    const detailsArray = [];
    detailsArray.push(`No/Unit: ${streetNo.trim()}`);
    if (complexName.trim()) detailsArray.push(`Komplek: ${complexName.trim()}`);
    if (patokan.trim()) detailsArray.push(`Patokan: ${patokan.trim()}`);
    
    const combinedStreetDetail = detailsArray.join(', ');

    onLocationSelect({
      label: selectedAddress,
      detail: addressDetail,
      streetDetail: combinedStreetDetail,
      lat: pinLat,
      lng: pinLng,
      distance,
      deliveryFee: withinRange ? deliveryFee : 0,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col md:max-w-md md:mx-auto md:shadow-2xl md:border-x md:border-gray-100">
      
      {/* ── 2. Leaflet Map Viewport (Visible for Map Selection) ────────────────────────────────── */}
      <div className="absolute inset-0 bg-gray-50 z-10">
        {!mapLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-[1000] gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#B48A5E]" />
            <p className="text-xs font-semibold text-gray-500">Menyiapkan peta...</p>
          </div>
        )}
        <div ref={mapContainer} className="w-full h-full" />

        {/* ── Fixed Center Pin (Traditional Sharp Map Pin style) ────────────────────────────────── */}
        {mapLoaded && pickerStep === 'MAP' && (
          <div className="absolute top-1/2 left-1/2 pointer-events-none z-[999]" style={{ width: '48px', height: '60px', marginLeft: '-24px', marginTop: '-60px' }}>
            <div className="relative w-full h-full flex flex-col items-center">
              {/* Visual representation of the pin floating/bouncing */}
              <div className={`transition-transform duration-300 ease-out transform ${
                isMapMoving ? '-translate-y-4 scale-105' : 'translate-y-0 scale-100'
              }`} style={{ transformOrigin: 'bottom center' }}>
                <svg width="48" height="60" viewBox="0 0 48 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_10px_12px_rgba(0,0,0,0.35)]">
                  <path d="M24 0C10.7452 0 0 10.7452 0 24C0 39 24 60 24 60C24 60 48 39 48 24C48 10.7452 37.2548 0 24 0ZM24 33C19.0294 33 15 28.9706 15 24C15 19.0294 19.0294 15 24 15C28.9706 15 33 19.0294 33 24C33 28.9706 28.9706 33 24 33Z" fill="url(#pin-gradient)" />
                  <circle cx="24" cy="24" r="9" fill="#FFFFFF" />
                  <circle cx="24" cy="24" r="5" fill="#1E3F20" />
                  <defs>
                    <linearGradient id="pin-gradient" x1="24" y1="0" x2="24" y2="60" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#B48A5E" />
                      <stop offset="1" stopColor="#946F48" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              {/* Shadow at the exact bottom center (which is the pin tip location when resting) */}
              <div 
                className="absolute bottom-0 left-1/2 w-5 h-1.5 bg-black/30 rounded-full blur-[1.5px] transition-all duration-300 ease-out" 
                style={{ 
                  bottom: '-3px', 
                  transform: `translateX(-50%) ${isMapMoving ? 'scale(0.3)' : 'scale(1)'}`,
                  opacity: isMapMoving ? 0.25 : 0.8
                }}
              />
            </div>
          </div>
        )}

        {/* Floating Quick GPS Locate Button */}
        {pickerStep === 'MAP' && (
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={isDetecting}
            className="absolute right-4 z-[1001] w-12 h-12 bg-white rounded-full shadow-2xl border border-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-50 active:scale-95 transition-all duration-300 disabled:opacity-50 bottom-[180px]"
          >
            {isDetecting ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#B48A5E]" />
            ) : (
              <LocateFixed className="w-5 h-5 text-gray-700" />
            )}
          </button>
        )}
      </div>

      {/* ── 1. Floating Header & Search Bar ────────────────────────────────── */}
      {pickerStep === 'MAP' && (
        <div className="absolute top-4 left-4 right-4 z-[1001] flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {/* Back button */}
            <button
              type="button"
              onClick={onClose}
              className="w-11 h-11 bg-white rounded-full shadow-lg border border-gray-100 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all text-gray-700 shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Search box wrapper */}
            <div className="flex-1 relative flex items-center bg-white rounded-full shadow-lg border border-gray-100 px-4 py-2.5 gap-2.5">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                placeholder="Cari lokasi atau jalan..."
                className="w-full text-sm font-medium focus:outline-none placeholder:text-gray-400 bg-transparent text-gray-800"
              />
              {(isSearching || isReversing) && (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400 shrink-0" />
              )}
              {searchQuery && !isSearching && !isReversing && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowResults(false);
                  }}
                  className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100 shrink-0"
                >
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {showResults && searchResults.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-h-60 overflow-y-auto divide-y divide-gray-50 mt-1"
              >
                {searchResults.map((r, i) => (
                  <button
                    type="button"
                    key={`${r.lat}-${r.lon}-${i}`}
                    onClick={() => handleSelectResult(r)}
                    className="w-full flex items-start gap-3.5 px-4 py-3 hover:bg-[#B48A5E]/5 transition-colors text-left border-b border-border/10 last:border-0 cursor-pointer"
                  >
                    <MapPin className="w-4.5 h-4.5 text-[#B48A5E] mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {r.address?.road || r.display_name.split(',')[0]}
                      </p>
                      <p className="text-[11px] text-gray-400 line-clamp-2 mt-0.5">{r.display_name}</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── 3. Bottom Address Display & Confirm Button (Gojek / Grab style Map step bottom sheet) ── */}
      {pickerStep === 'MAP' && (
        <div className="absolute bottom-0 left-0 right-0 z-[1001] bg-white rounded-t-[2.5rem] shadow-[0_-15px_40px_rgba(0,0,0,0.15)] border-t border-gray-55 p-6 flex flex-col gap-4 select-none">
          {/* Location Info Banner */}
          <div className="flex items-start gap-3.5 pb-2.5 border-b border-gray-100 shrink-0">
            <div className="w-9 h-9 rounded-full bg-[#B48A5E]/10 flex items-center justify-center text-[#B48A5E] shrink-0 mt-0.5">
              <MapPin className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-[#B48A5E] uppercase tracking-wider">Lokasi Terpilih</span>
              <h3 className="text-sm font-bold text-gray-900 truncate">
                {selectedAddress || (isReversing ? 'Mengambil alamat...' : 'Pilih Lokasi')}
              </h3>
              <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                {addressDetail || (isReversing ? 'Mengambil detail alamat dari peta...' : 'Geser peta untuk memilih lokasi')}
              </p>
            </div>
          </div>

          {/* Out of Range warning */}
          {!withinRange && selectedAddress && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-150 shrink-0">
              <AlertTriangle className="w-4.5 h-4.5 text-red-500 mt-0.5 shrink-0" />
              <p className="text-[10.5px] font-bold text-red-700 leading-tight">
                Maaf, lokasi terpilih berada di luar jangkauan pengiriman kami (maksimal {maxDeliveryDistance} km).
              </p>
            </div>
          )}

          {/* Confirm Button to switch to Step 2 (DETAILS FORM) */}
          <button
            type="button"
            onClick={() => setPickerStep('DETAILS')}
            disabled={!selectedAddress || !withinRange || isReversing}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#B48A5E] to-[#946F48] text-white font-bold text-sm shadow-xl shadow-[#B48A5E]/15 hover:shadow-[#B48A5E]/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            Pilih Lokasi Ini
          </button>
        </div>
      )}

      {/* ── 4. Full-screen Detailed Address Form Wizard Overlay ── */}
      <AnimatePresence>
        {pickerStep === 'DETAILS' && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute inset-0 z-[1002] bg-[#FDFBF7] flex flex-col pt-safe pb-safe"
          >
            {/* Header */}
            <div className="px-6 py-4 flex items-center gap-4 bg-white sticky top-0 z-10 border-b border-gray-100/50 shadow-sm">
              <button
                type="button"
                onClick={() => setPickerStep('MAP')}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all active:scale-90 cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="font-serif text-base font-bold text-gray-900 flex-1">Detail Alamat Pengiriman</h2>
            </div>

            {/* Scrollable Form Content */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6 pb-28 scrollbar-hide">
              {/* Selected Location Card */}
              <div className="bg-white rounded-3xl p-5 border border-[#D4A574]/20 flex items-start gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-2xl bg-[#1E3F20]/5 border border-[#1E3F20]/15 flex items-center justify-center shrink-0 text-[#1E3F20]">
                  <MapPin className="w-5 h-5 fill-[#1E3F20]/10" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-[#B48A5E] uppercase tracking-wider">Lokasi Dipilih</span>
                  <h4 className="text-sm font-black text-gray-900 truncate leading-snug">{selectedAddress}</h4>
                  <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{addressDetail}</p>
                </div>
              </div>

              {/* Form Input fields */}
              <div className="space-y-4">
                {/* No. Rumah / Unit */}
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 pl-1">
                    <span>No. Rumah / Unit / Lantai / Blok</span>
                    <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={streetNo}
                    onChange={(e) => {
                      setStreetNo(e.target.value);
                      if (e.target.value.trim()) setDetailError('');
                    }}
                    placeholder="Contoh: No. 12B, Lantai 3, Blok C4"
                    className="w-full px-4 py-3.5 rounded-2xl border border-[#D4A574]/20 bg-[#FFFBF5] text-xs focus:outline-none focus:bg-white focus:border-[#B48A5E] transition-all font-semibold shadow-inner"
                  />
                  {detailError && (
                    <p className="text-[10px] text-red-500 font-bold pl-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" /> {detailError}
                    </p>
                  )}
                </div>

                {/* Complex Name */}
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 pl-1">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                    <span>Nama Komplek / Perumahan / Gedung (Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={complexName}
                    onChange={(e) => setComplexName(e.target.value)}
                    placeholder="Contoh: Perumahan Kebon Asri, Gedung Graha Pena"
                    className="w-full px-4 py-3.5 rounded-2xl border border-[#D4A574]/20 bg-[#FFFBF5] text-xs focus:outline-none focus:bg-white focus:border-[#B48A5E] transition-all font-semibold shadow-inner"
                  />
                </div>

                {/* Courier Note / Landmark */}
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 pl-1">
                    <ClipboardList className="w-3.5 h-3.5 text-gray-400" />
                    <span>Patokan Khusus / Catatan Kurir (Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={patokan}
                    onChange={(e) => setPatokan(e.target.value)}
                    placeholder="Contoh: Depan pagar hitam, sebelah warung Madura"
                    className="w-full px-4 py-3.5 rounded-2xl border border-[#D4A574]/20 bg-[#FFFBF5] text-xs focus:outline-none focus:bg-white focus:border-[#B48A5E] transition-all font-semibold shadow-inner"
                  />
                </div>
              </div>

              {/* Distance & Delivery Fee Info */}
              <div className="flex items-center justify-between p-4 bg-[#FFFBF5] rounded-2xl border border-[#D4A574]/20 shadow-sm">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Jarak Antar</p>
                  <p className="text-xs font-extrabold text-gray-800">{distance.toFixed(1)} km</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Biaya Pengiriman</p>
                  <p className="text-xs font-extrabold text-[#B48A5E]">
                    {withinRange ? formatRupiah(deliveryFee) : '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom floating confirmation button */}
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-50 p-6 z-20">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!selectedAddress || !withinRange || isReversing}
                className="w-full py-4.5 rounded-2xl bg-gradient-to-r from-[#B48A5E] to-[#946F48] text-white font-bold text-sm shadow-xl shadow-[#B48A5E]/15 hover:shadow-[#B48A5E]/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                <Check className="w-4 h-4" /> Konfirmasi Alamat Pengiriman
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
