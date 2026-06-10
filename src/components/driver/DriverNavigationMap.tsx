'use client';

import { useEffect, useRef, useState } from 'react';
import { Navigation, MapPin, Clock, Truck, Store } from 'lucide-react';
import type L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapStop {
  id: string;
  customerName: string;
  address: string;
  lat: number;
  lng: number;
  status: string;
  sequence: number;
}

interface DriverNavigationMapProps {
  driverLat: number;
  driverLng: number;
  // For single-stop (backward compatibility)
  destinationLat?: number;
  destinationLng?: number;
  destinationAddress?: string;
  // For multi-stop
  stops?: MapStop[];
  storeLat?: number;
  storeLng?: number;
}

export function DriverNavigationMap({
  driverLat, driverLng,
  destinationLat, destinationLng,
  destinationAddress,
  stops = [],
  storeLat = -7.78125167,
  storeLng = 113.212266
}: DriverNavigationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const stopMarkersRef = useRef<L.Marker[]>([]);
  const storeMarkerRef = useRef<L.Marker | null>(null);

  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  
  // Cache for movement threshold checking
  const lastFetchedState = useRef<{
    driverLat: number;
    driverLng: number;
    stopsKey: string;
    timestamp: number;
  } | null>(null);

  // Parse stops to work with both single and multi-stop modes
  const activeStops = stops.length > 0 ? stops : (
    destinationLat && destinationLng ? [{
      id: 'single-dest',
      customerName: 'Tujuan',
      address: destinationAddress || '',
      lat: destinationLat,
      lng: destinationLng,
      status: 'ON_DELIVERY',
      sequence: 1
    }] : []
  );

  // Initialize map and static markers
  useEffect(() => {
    if (!mapContainer.current) return;
    if ((mapContainer.current as any)._leaflet_id) return;

    let isMounted = true;
    let mapInstance: L.Map | null = null;

    import('leaflet').then((leaflet) => {
      if (!isMounted || !mapContainer.current) return;
      if ((mapContainer.current as any)._leaflet_id) return;

      const L = leaflet.default;

      // Center map around driver
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

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      L.control.attribution({ position: 'bottomleft', prefix: false })
        .addAttribution('© <a href="https://www.openstreetmap.org/copyright">OSM</a>')
        .addTo(map);

      // Store marker
      const storeIcon = L.divIcon({
        html: `<div class="w-8 h-8 bg-emerald-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
               </div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      storeMarkerRef.current = L.marker([storeLat, storeLng], { icon: storeIcon })
        .bindPopup('<b>Matchaboy Store</b>')
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
        .bindPopup('<b>Lokasi Anda (Kurir)</b>')
        .addTo(map);

      // Trigger route calculation on load
      triggerRouteCalculation();
    });

    return () => {
      isMounted = false;
      if (mapInstance) {
        mapInstance.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update dynamic markers and routes when driver location or stops change
  useEffect(() => {
    triggerRouteCalculation();
  }, [driverLat, driverLng, activeStops]);

  const triggerRouteCalculation = async () => {
    if (!mapRef.current) return;

    const L = (await import('leaflet')).default;

    // 1. Update driver marker position
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng([driverLat, driverLng]);
    }

    // 2. Clear old stop markers
    stopMarkersRef.current.forEach(m => m.remove());
    stopMarkersRef.current = [];

    // 3. Render all active stops
    activeStops.forEach(stop => {
      const isAssigned = stop.status === 'ASSIGNED';
      const stopIcon = L.divIcon({
        html: `<div class="relative flex items-center justify-center">
                 <div class="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-black text-xs ${
                   isAssigned ? 'bg-indigo-650 animate-pulse' : 'bg-red-500 animate-bounce'
                 }">
                   ${stop.sequence}
                 </div>
               </div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([stop.lat, stop.lng], { icon: stopIcon })
        .bindPopup(`<b>Stop ${stop.sequence}: ${stop.customerName}</b><br/>${stop.address.split('(')[0].trim()}`)
        .addTo(mapRef.current!);

      stopMarkersRef.current.push(marker);
    });

    if (activeStops.length === 0) {
      setRouteInfo(null);
      if (routeLayerRef.current) {
        routeLayerRef.current.remove();
        routeLayerRef.current = null;
      }
      return;
    }

    // 4. Movement Threshold Optimization
    const now = Date.now();
    const stopsKey = activeStops.map(s => `${s.id}-${s.status}-${s.lat}-${s.lng}`).join('|');
    
    let shouldFetchRoute = true;
    if (lastFetchedState.current) {
      const prev = lastFetchedState.current;
      const dlat = driverLat - prev.driverLat;
      const dlng = driverLng - prev.driverLng;
      const distSq = dlat * dlat + dlng * dlng;
      
      const stopsChanged = prev.stopsKey !== stopsKey;
      const movedSignificantly = distSq > 0.000001; // ~100m
      const cacheExpired = now - prev.timestamp > 30000; // 30s expiry fallback

      if (!stopsChanged && !movedSignificantly && !cacheExpired) {
        shouldFetchRoute = false;
      }
    }

    if (!shouldFetchRoute) {
      // Just fly to driver or keep bounds as is
      return;
    }

    // 5. Fetch chained route from OSRM
    try {
      const coordsChain: [number, number][] = [[driverLng, driverLat]];

      // If there are ASSIGNED orders, we must visit the Store first
      const hasAssigned = activeStops.some(s => s.status === 'ASSIGNED');
      if (hasAssigned) {
        coordsChain.push([storeLng, storeLat]);
      }

      // Add stops in priority order
      activeStops.forEach(s => {
        coordsChain.push([s.lng, s.lat]);
      });

      const routePointsString = coordsChain.map(c => `${c[0]},${c[1]}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${routePointsString}?overview=full&geometries=geojson`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];

        setRouteInfo({
          distance: route.distance / 1000,
          duration: route.duration / 60,
        });

        const routeCoords: L.LatLngTuple[] = route.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]] as L.LatLngTuple
        );

        if (routeLayerRef.current) {
          routeLayerRef.current.setLatLngs(routeCoords);
        } else {
          routeLayerRef.current = L.polyline(routeCoords, {
            color: '#059669',
            weight: 5,
            opacity: 0.85,
            dashArray: '10, 5',
          }).addTo(mapRef.current!);
        }

        // Fit map bounds to show route
        const bounds = L.latLngBounds([[driverLat, driverLng]]);
        if (hasAssigned) {
          bounds.extend([storeLat, storeLng]);
        }
        activeStops.forEach(s => {
          bounds.extend([s.lat, s.lng]);
        });
        mapRef.current.fitBounds(bounds, { padding: [40, 40] });

        // Update cache state
        lastFetchedState.current = {
          driverLat,
          driverLng,
          stopsKey,
          timestamp: now
        };
      }
    } catch (err) {
      console.error('Failed to calculate OSRM route:', err);
    }
  };

  const openGoogleMapsDirections = () => {
    // Open Google Maps directions passing store and stops
    const hasAssigned = activeStops.some(s => s.status === 'ASSIGNED');
    let destString = '';
    
    // Build waypoints string
    const waypoints: string[] = [];
    if (hasAssigned) {
      waypoints.push(`${storeLat},${storeLng}`);
    }
    
    // All stops except the last one are waypoints
    for (let i = 0; i < activeStops.length - 1; i++) {
      waypoints.push(`${activeStops[i].lat},${activeStops[i].lng}`);
    }
    
    const lastStop = activeStops[activeStops.length - 1];
    const destination = lastStop ? `${lastStop.lat},${lastStop.lng}` : `${storeLat},${storeLng}`;
    
    const waypointsParam = waypoints.length > 0 ? `&waypoints=${waypoints.join('|')}` : '';
    const url = `https://www.google.com/maps/dir/?api=1&origin=${driverLat},${driverLng}&destination=${destination}${waypointsParam}&travelmode=driving`;
    
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-3">
      {/* Route Info Bar */}
      {routeInfo && (
        <div className="flex items-center justify-between bg-emerald-50 rounded-2xl p-4 border border-emerald-100 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-md">
              <Navigation className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-emerald-600 font-bold">Total Rute</p>
              <p className="text-base font-extrabold text-emerald-800">{routeInfo.distance.toFixed(1)} km ({activeStops.length} Stop)</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 justify-end text-emerald-600 font-bold">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              <span className="text-xs">Estimasi</span>
            </div>
            <p className="text-base font-extrabold text-emerald-800">~{Math.ceil(routeInfo.duration)} mnt</p>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="relative z-10 w-full h-[320px] rounded-3xl overflow-hidden border border-gray-200 shadow-sm">
        <div ref={mapContainer} className="absolute inset-0" />
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm text-xs font-bold text-emerald-700 flex items-center gap-1.5 border border-white z-[1000]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Rute Terpadu Aktif
        </div>
      </div>

      {/* Action Button */}
      {activeStops.length > 0 && (
        <button
          type="button"
          onClick={openGoogleMapsDirections}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-blue-600 text-white font-extrabold text-sm shadow-md hover:bg-blue-700 transition-all active:scale-[0.98]"
        >
          <Navigation className="w-4 h-4" />
          Buka Rute Terpadu di Google Maps
        </button>
      )}
    </div>
  );
}
