'use client';

import { useEffect, useRef, useState } from 'react';
import { Navigation, MapPin, Clock, Truck } from 'lucide-react';
import type L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface DriverNavigationMapProps {
  driverLat: number;
  driverLng: number;
  destinationLat: number;
  destinationLng: number;
  destinationAddress: string;
  storeLat?: number;
  storeLng?: number;
}

export function DriverNavigationMap({
  driverLat, driverLng,
  destinationLat, destinationLng,
  destinationAddress,
  storeLat, storeLng
}: DriverNavigationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);

  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;
    
    // Check if leaflet is already initialized on this container
    if ((mapContainer.current as any)._leaflet_id) return;

    let isMounted = true;
    let mapInstance: L.Map | null = null;

    import('leaflet').then((leaflet) => {
      if (!isMounted || !mapContainer.current) return;
      
      // Double check again after import
      if ((mapContainer.current as any)._leaflet_id) return;

      const L = leaflet.default;

      const map = L.map(mapContainer.current!, {
        center: [driverLat, driverLng],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
      });

      mapInstance = map;
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);

      // Add zoom control at bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Attribution at bottom-left
      L.control.attribution({ position: 'bottomleft', prefix: false })
        .addAttribution('© <a href="https://www.openstreetmap.org/copyright">OSM</a>')
        .addTo(map);

      // Store marker (if provided)
      if (storeLat && storeLng) {
        const storeIcon = L.divIcon({
          html: `<div class="w-8 h-8 bg-[#D4A574] rounded-full border-3 border-white shadow-lg flex items-center justify-center">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                 </div>`,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });

        L.marker([storeLat, storeLng], { icon: storeIcon })
          .bindPopup('<b>Arus Store</b>')
          .addTo(map);
      }

      // Destination marker
      const destIcon = L.divIcon({
        html: `<div class="relative">
                 <div class="w-10 h-10 bg-red-500 rounded-full border-3 border-white shadow-lg flex items-center justify-center animate-bounce">
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                 </div>
               </div>`,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });

      L.marker([destinationLat, destinationLng], { icon: destIcon })
        .bindPopup(`<b>Tujuan</b><br/>${destinationAddress}`)
        .addTo(map);

      // Driver marker
      const driverIcon = L.divIcon({
        html: `<div class="relative">
                 <div class="absolute -inset-3 bg-emerald-400/30 rounded-full animate-ping"></div>
                 <div class="w-10 h-10 bg-white rounded-full border-3 border-emerald-500 shadow-xl flex items-center justify-center relative z-10">
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5"><rect width="16" height="11" x="4" y="7" rx="2"/><path d="M12 3v4"/><circle cx="8" cy="21" r="1"/><circle cx="16" cy="21" r="1"/></svg>
                 </div>
               </div>`,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      driverMarkerRef.current = L.marker([driverLat, driverLng], { icon: driverIcon })
        .addTo(map);

    });

    return () => {
      isMounted = false;
      if (mapInstance) {
        mapInstance.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update driver position and route
  useEffect(() => {
    if (!mapRef.current) return;

    // Update driver marker position
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng([driverLat, driverLng]);
    }

    // Fetch route from OSRM
    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${driverLng},${driverLat};${destinationLng},${destinationLat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];

          // Update route info
          setRouteInfo({
            distance: route.distance / 1000, // km
            duration: route.duration / 60, // minutes
          });

          // Draw route line
          const coords = route.geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]] as L.LatLngTuple
          );

          import('leaflet').then((leaflet) => {
            const L = leaflet.default;
            if (routeLayerRef.current) {
              routeLayerRef.current.setLatLngs(coords);
            } else {
              routeLayerRef.current = L.polyline(coords, {
                color: '#059669',
                weight: 5,
                opacity: 0.8,
                dashArray: '10, 5',
              }).addTo(mapRef.current!);
            }

            // Fit bounds to show full route
            const bounds = L.latLngBounds(
              [driverLat, driverLng],
              [destinationLat, destinationLng]
            );
            mapRef.current!.fitBounds(bounds, { padding: [50, 50] });
          });
        }
      } catch (err) {
        console.error('Failed to fetch route:', err);
      }
    };

    fetchRoute();
  }, [driverLat, driverLng, destinationLat, destinationLng]);

  const openGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${driverLat},${driverLng}&destination=${destinationLat},${destinationLng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-3">
      {/* Route Info Bar */}
      {routeInfo && (
        <div className="flex items-center justify-between bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
              <Navigation className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-emerald-600 font-medium">Jarak Tersisa</p>
              <p className="text-lg font-bold text-emerald-800">{routeInfo.distance.toFixed(1)} km</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-emerald-600">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Estimasi</span>
            </div>
            <p className="text-lg font-bold text-emerald-800">{Math.ceil(routeInfo.duration)} mnt</p>
          </div>
        </div>
      )}

      {/* Destination Address */}
      <div className="flex items-start gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
        <MapPin className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Alamat Tujuan</p>
          <p className="text-sm font-medium text-foreground mt-0.5">{destinationAddress}</p>
        </div>
      </div>

      {/* Map */}
      <div className="relative w-full h-64 sm:h-72 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
        <div ref={mapContainer} className="absolute inset-0" />
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm text-xs font-bold text-emerald-700 flex items-center gap-1.5 border border-white z-[1000]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Navigasi Aktif
        </div>
      </div>

      {/* Open in Google Maps */}
      <button
        type="button"
        onClick={openGoogleMaps}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-sm hover:bg-blue-700 transition-colors active:scale-[0.98]"
      >
        <Navigation className="w-4 h-4" />
        Buka di Google Maps
      </button>
    </div>
  );
}
