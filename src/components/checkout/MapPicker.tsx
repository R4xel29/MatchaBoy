'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Search, AlertTriangle, Check, Loader2, X, LocateFixed } from 'lucide-react';
import type L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { calculateDistance, calculateDeliveryFee, isWithinDeliveryRange } from '@/lib/delivery-utils';
import { formatRupiah } from '@/lib/utils';

interface MapPickerProps {
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
  onLocationSelect,
  initialLat,
  initialLng,
  deliveryFeePerKm = 2000,
  maxDeliveryDistance = 10,
}: MapPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const storeMarkerRef = useRef<L.Marker | null>(null);

  const [storeLat, setStoreLat] = useState(-7.756928);
  const [storeLng, setStoreLng] = useState(113.211502);
  const [pinLat, setPinLat] = useState(initialLat ?? -7.756928);
  const [pinLng, setPinLng] = useState(initialLng ?? 113.211502);
  const [mapLoaded, setMapLoaded] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeoResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [addressDetail, setAddressDetail] = useState<string>('');
  const [isReversing, setIsReversing] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  // Initialize Leaflet map
  useEffect(() => {
    let mapInstance: L.Map | null = null;
    let pollInterval: NodeJS.Timeout | null = null;
    let isInitialized = false;

    const initMap = (L: any) => {
      const container = mapContainer.current;
      if (!container) return false;
      if (mapRef.current) return true; // already initialized

      const map = L.map(container, {
        center: [pinLat, pinLng],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
      });

      mapInstance = map;
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      // Zoom control bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Store marker
      const storeIcon = L.divIcon({
        html: `<div class="w-5 h-5 bg-[#D4A574] rounded-full border-2 border-white shadow-md"></div>`,
        className: '',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      storeMarkerRef.current = L.marker([storeLat, storeLng], { icon: storeIcon })
        .bindPopup('<b>Arus Store</b>')
        .addTo(map);

      // Draggable user marker
      const userIcon = L.divIcon({
        html: `<div class="relative flex items-center justify-center">
                 <div class="absolute w-12 h-12 bg-red-400/20 rounded-full animate-ping"></div>
                 <div class="w-8 h-8 bg-red-500 rounded-full border-3 border-white shadow-xl flex items-center justify-center z-10">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                 </div>
               </div>`,
        className: '',
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });

      const userMarker = L.marker([pinLat, pinLng], {
        icon: userIcon,
        draggable: true,
      }).addTo(map);

      markerRef.current = userMarker;

      userMarker.on('dragend', () => {
        const pos = userMarker.getLatLng();
        if (pos) {
          setPinLat(pos.lat);
          setPinLng(pos.lng);
          reverseGeocode(pos.lat, pos.lng);
        }
      });

      // Click on map to move pin
      map.on('click', (e: L.LeafletMouseEvent) => {
        setPinLat(e.latlng.lat);
        setPinLng(e.latlng.lng);
        markerRef.current?.setLatLng(e.latlng);
        reverseGeocode(e.latlng.lat, e.latlng.lng);
      });

      setMapLoaded(true);
      return true;
    };

    import('leaflet').then((leaflet) => {
      const L = leaflet.default;

      // Try immediately
      if (initMap(L)) {
        isInitialized = true;
        return;
      }

      // If container not ready, poll for it
      pollInterval = setInterval(() => {
        if (initMap(L)) {
          isInitialized = true;
          if (pollInterval) clearInterval(pollInterval);
        }
      }, 100);
    });

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (mapInstance) {
        mapInstance.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update store marker when store location changes
  useEffect(() => {
    if (storeMarkerRef.current) {
      storeMarkerRef.current.setLatLng([storeLat, storeLng]);
    }
  }, [storeLat, storeLng]);

  // Reverse geocode: coordinates → address name
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsReversing(true);
    try {
      const res = await fetch(`/api/geocode?mode=reverse&lat=${lat}&lng=${lng}`);
      const data = await res.json();
      if (data.display_name) {
        const addr = data.address;
        const label = addr?.road
          ? `${addr.road}${addr.suburb ? `, ${addr.suburb}` : ''}`
          : data.display_name.split(',').slice(0, 3).join(',');
        const detail = data.display_name;
        setSelectedAddress(label);
        setAddressDetail(detail);
        setSearchQuery(label);
      }
    } catch {
      setSelectedAddress(`Lokasi (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      setAddressDetail(`Kordinat: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } finally {
      setIsReversing(false);
    }
  }, []);

  // Fetch store location from settings
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
            
            // Move marker and map to match store settings
            if (mapRef.current) {
              mapRef.current.setView([d.storeLat, d.storeLng], 14);
            }
            if (markerRef.current) {
              markerRef.current.setLatLng([d.storeLat, d.storeLng]);
            }
            reverseGeocode(d.storeLat, d.storeLng);
          }
        }
      })
      .catch(() => {});
  }, [initialLat, initialLng, reverseGeocode]);

  // Forward geocode search (Nominatim via proxy)
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setSelectedAddress(null);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (value.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(value)}`);
        const data: GeoResult[] = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
        setShowResults(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500); // Debounce 500ms to respect Nominatim rate limit
  };

  const handleSelectResult = (result: GeoResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const addr = result.address;
    const label = addr?.road
      ? `${addr.road}${addr.suburb ? `, ${addr.suburb}` : ''}`
      : result.display_name.split(',').slice(0, 3).join(',');

    setPinLat(lat);
    setPinLng(lng);
    setSelectedAddress(label);
    setAddressDetail(result.display_name);
    setSearchQuery(label);
    setShowResults(false);

    // Move marker and fly to
    markerRef.current?.setLatLng([lat, lng]);
    mapRef.current?.flyTo([lat, lng], 16, { duration: 1.5 });
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
        markerRef.current?.setLatLng([lat, lng]);
        mapRef.current?.flyTo([lat, lng], 16, { duration: 1.5 });
        reverseGeocode(lat, lng);
        setIsDetecting(false);
      },
      () => {
        setIsDetecting(false);
        // Fallback: simulate near store
        const rndOff = () => (Math.random() - 0.5) * 0.04;
        const lat = storeLat + rndOff();
        const lng = storeLng + rndOff();
        setPinLat(lat);
        setPinLng(lng);
        markerRef.current?.setLatLng([lat, lng]);
        mapRef.current?.flyTo([lat, lng], 16, { duration: 1 });
        reverseGeocode(lat, lng);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const distance = calculateDistance(storeLat, storeLng, pinLat, pinLng);
  const deliveryFee = calculateDeliveryFee(distance, deliveryFeePerKm);
  const withinRange = isWithinDeliveryRange(distance, maxDeliveryDistance);

  const [streetDetail, setStreetDetail] = useState('');
  const [detailError, setDetailError] = useState('');

  const handleConfirm = () => {
    if (!selectedAddress) return;
    if (!streetDetail.trim()) {
      setDetailError('Detail alamat tambahan (No. Rumah / Perumahan) wajib diisi');
      return;
    }
    setDetailError('');
    onLocationSelect({
      label: selectedAddress,
      detail: addressDetail,
      streetDetail: streetDetail.trim(),
      lat: pinLat,
      lng: pinLng,
      distance,
      deliveryFee: withinRange ? deliveryFee : 0,
    });
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => searchResults.length > 0 && setShowResults(true)}
          placeholder="Cari alamat pengiriman..."
          className="w-full pl-10 pr-10 py-3 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
        />
        {(isSearching || isReversing) && (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
        {searchQuery && !isSearching && (
          <button
            type="button"
            onClick={() => { setSearchQuery(''); setSearchResults([]); setShowResults(false); setSelectedAddress(null); }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        )}

        {/* Search Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-card rounded-xl border border-border shadow-lg z-50 max-h-60 overflow-y-auto">
            {searchResults.map((r, i) => (
              <button
                type="button"
                key={`${r.lat}-${r.lon}-${i}`}
                onClick={() => handleSelectResult(r)}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-brand-50 transition-colors text-left border-b border-border/30 last:border-0"
              >
                <MapPin className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {r.address?.road || r.display_name.split(',')[0]}
                  </p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{r.display_name}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* GPS Detection */}
      <button
        type="button"
        onClick={handleDetectLocation}
        disabled={isDetecting}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-brand-400 bg-brand-50/50 text-brand-700 text-sm font-medium hover:bg-brand-50 transition-colors disabled:opacity-50"
      >
        {isDetecting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <LocateFixed className="w-4 h-4" />
        )}
        {isDetecting ? 'Mendeteksi lokasi...' : 'Gunakan lokasi saat ini'}
      </button>

      {/* Leaflet Map */}
      <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden bg-muted border border-border">
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-brand-50 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          </div>
        )}
        <div ref={mapContainer} className="w-full h-full" />
        {/* Hint overlay */}
        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-[10px] font-medium text-gray-600 shadow-sm border border-white z-[1000]">
          Tap/geser pin untuk atur lokasi
        </div>
      </div>

      {/* Selected Location Info */}
      {selectedAddress && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-brand-50 border border-brand-200">
            <MapPin className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{selectedAddress}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{addressDetail}</p>
            </div>
            <button
              type="button"
              onClick={() => { setSelectedAddress(null); setSearchQuery(''); }}
              className="text-xs text-brand-600 font-medium hover:underline shrink-0"
            >
              Ubah
            </button>
          </div>

          {/* New specific detailed address text field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">Detail Alamat Rumah / Perumahan / No. Rumah *</label>
            <input
              type="text"
              value={streetDetail}
              onChange={(e) => {
                setStreetDetail(e.target.value);
                if (e.target.value.trim()) setDetailError('');
              }}
              placeholder="Contoh: Perumahan Kebon Asri Blok C-12, RT 02 RW 03, Pagar Hitam"
              className="w-full px-4.5 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-[#B48A5E] transition-all"
            />
            {detailError && <p className="text-xs text-red-500 font-semibold">{detailError}</p>}
          </div>

          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-card border border-border/50">
            <div>
              <p className="text-xs text-muted-foreground">Jarak</p>
              <p className="text-sm font-bold text-foreground">{distance.toFixed(1)} km</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Ongkos Kirim</p>
              <p className="text-sm font-bold text-brand-700">{withinRange ? formatRupiah(deliveryFee) : '-'}</p>
            </div>
          </div>

          {!withinRange && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">Maaf, lokasi di luar jangkauan pengiriman kami (max {maxDeliveryDistance} km).</p>
            </motion.div>
          )}

          {withinRange && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleConfirm}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#B48A5E] to-[#946F48] text-white font-semibold text-sm shadow-lg flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Konfirmasi Alamat
            </motion.button>
          )}
        </motion.div>
      )}
    </div>
  );
}
