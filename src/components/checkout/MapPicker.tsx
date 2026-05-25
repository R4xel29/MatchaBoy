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

  // Grab/Gojek-style detailed address states & UX collapse state
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
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
      
      {/* ── 2. Leaflet Map Viewport ────────────────────────────────── */}
      <div className="absolute inset-0 bg-gray-50 z-10">
        {!mapLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-[1000] gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#B48A5E]" />
            <p className="text-xs font-semibold text-gray-500">Menyiapkan peta...</p>
          </div>
        )}
        <div ref={mapContainer} className="w-full h-full" />

        {/* ── Fixed Center Pin (Gojek / Grab style) ────────────────────────────────── */}
        {mapLoaded && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[999]">
            <div className="relative pointer-events-none flex flex-col items-center select-none">
              {/* Visual representation of the pin floating/bouncing */}
              <div className={`transition-transform duration-300 ease-out transform ${
                isMapMoving ? '-translate-y-7 scale-110' : '-translate-y-5 scale-100'
              }`}>
                <div className="relative">
                  {/* Outer glow blur */}
                  <div className="absolute -inset-2 bg-red-500/20 rounded-full blur-sm"></div>
                  {/* Main Pin Icon container */}
                  <div className="relative w-11 h-11 bg-gradient-to-tr from-red-600 to-red-400 rounded-full border-3 border-white shadow-2xl flex items-center justify-center">
                    <MapPin className="w-5.5 h-5.5 text-white" />
                  </div>
                </div>
              </div>
              {/* Pin shadow on the map */}
              <div className={`w-3.5 h-1.5 bg-black/35 rounded-full blur-[2px] transition-all duration-300 ease-out mt-0.5 ${
                isMapMoving ? 'scale-[0.3] opacity-30 blur-[3px]' : 'scale-100 opacity-80'
              }`}></div>
            </div>
          </div>
        )}

        {/* Floating Quick GPS Locate Button */}
        <button
          type="button"
          onClick={handleDetectLocation}
          disabled={isDetecting}
          className={`absolute right-4 z-[1001] w-12 h-12 bg-white rounded-full shadow-2xl border border-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-50 active:scale-95 transition-all duration-300 disabled:opacity-50 ${
            isFormCollapsed ? 'bottom-[155px]' : 'bottom-[27.5rem]'
          }`}
        >
          {isDetecting ? (
            <Loader2 className="w-5 h-5 animate-spin text-[#B48A5E]" />
          ) : (
            <LocateFixed className="w-5 h-5 text-gray-700" />
          )}
        </button>
      </div>

      {/* ── 1. Floating Header & Search Bar ────────────────────────────────── */}
      <div className="absolute top-4 left-4 right-4 z-[1001] flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {/* Back button */}
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 bg-white rounded-full shadow-lg border border-gray-100 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all text-gray-700 shrink-0"
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
                  className="w-full flex items-start gap-3.5 px-4 py-3 hover:bg-brand-50/50 transition-colors text-left border-b border-border/10 last:border-0"
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

      {/* ── 3. Grab/Gojek-Style Detailed Address Bottom Sheet ────────────────────────────────── */}
      <div className={`absolute bottom-0 left-0 right-0 z-[1001] bg-white rounded-t-[2.5rem] shadow-[0_-15px_40px_rgba(0,0,0,0.15)] border-t border-gray-50 p-6 flex flex-col gap-4 transition-all duration-300 select-none ${
        isFormCollapsed ? 'max-h-[135px] overflow-hidden' : 'max-h-[75vh] overflow-y-auto'
      }`}>
        {/* Drag handle / collapse toggle header */}
        <div 
          onClick={() => setIsFormCollapsed(!isFormCollapsed)}
          className="w-full flex flex-col items-center cursor-pointer shrink-0 -mt-2 group pb-1"
        >
          <div className="w-12 h-1.5 bg-gray-150 rounded-full group-hover:bg-gray-200 transition-colors mb-1.5" />
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#946F48] hover:underline flex items-center gap-1 select-none">
            {isFormCollapsed ? '🔼 Tampilkan Form Detail Alamat' : '🔽 Sembunyikan Form (Lihat Peta)'}
          </span>
        </div>

        {/* Location Info Banner */}
        <div className="flex items-start gap-3.5 pb-3 border-b border-gray-100 shrink-0">
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

        {/* Form Content - Only visible if not collapsed */}
        {!isFormCollapsed && (
          <div className="space-y-4 flex-grow">
            {/* Detailed Address Inputs Form */}
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 gap-3.5">
                {/* House / Unit Number Field */}
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 pl-1">
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
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#F9F8F6] text-xs focus:outline-none focus:bg-white focus:border-[#B48A5E] transition-all font-semibold"
                  />
                  {detailError && (
                    <p className="text-[10px] text-red-500 font-bold pl-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" /> {detailError}
                    </p>
                  )}
                </div>

                {/* Complex / Building Name Field */}
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 pl-1">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                    <span>Nama Komplek / Perumahan / Gedung (Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={complexName}
                    onChange={(e) => setComplexName(e.target.value)}
                    placeholder="Contoh: Perumahan Kebon Asri, Gedung Graha Pena"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#F9F8F6] text-xs focus:outline-none focus:bg-white focus:border-[#B48A5E] transition-all font-semibold"
                  />
                </div>

                {/* Courier Note / Landmark Field */}
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 pl-1">
                    <ClipboardList className="w-3.5 h-3.5 text-gray-400" />
                    <span>Patokan Khusus / Catatan Kurir (Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={patokan}
                    onChange={(e) => setPatokan(e.target.value)}
                    placeholder="Contoh: Depan pagar hitam, sebelah warung Madura"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#F9F8F6] text-xs focus:outline-none focus:bg-white focus:border-[#B48A5E] transition-all font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Distance & Delivery Fee Info */}
            {selectedAddress && (
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-100 shrink-0">
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
            )}

            {/* Out of Range warning */}
            {!withinRange && selectedAddress && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-150 shrink-0">
                <AlertTriangle className="w-4.5 h-4.5 text-red-500 mt-0.5 shrink-0" />
                <p className="text-[10.5px] font-bold text-red-700 leading-tight">
                  Maaf, lokasi terpilih berada di luar jangkauan pengiriman kami (maksimal {maxDeliveryDistance} km).
                </p>
              </div>
            )}

            {/* Confirm Button */}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedAddress || !withinRange || isReversing}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#B48A5E] to-[#946F48] text-white font-bold text-sm shadow-xl shadow-brand-500/10 hover:shadow-brand-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none shrink-0"
            >
              <Check className="w-4 h-4" /> Konfirmasi Alamat Pengiriman
            </button>
          </div>
        )}

        {/* Collapsed view button */}
        {isFormCollapsed && (
          <button
            type="button"
            onClick={() => setIsFormCollapsed(false)}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#B48A5E] to-[#946F48] text-white font-bold text-xs shadow-md transition-all active:scale-[0.98] shrink-0"
          >
            Lengkapi Detail Alamat & Konfirmasi
          </button>
        )}
      </div>
    </div>
  );
}
