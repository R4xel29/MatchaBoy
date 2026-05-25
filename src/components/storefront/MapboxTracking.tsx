'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Truck, Clock, MapPin, Navigation } from 'lucide-react';
import type L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LeafletTrackingProps {
  orderId: string;
}

export function LeafletTracking({ orderId }: LeafletTrackingProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);

  const [driverInfo, setDriverInfo] = useState<{
    lat: number; lng: number; driverName: string; vehicleType: string; plateNumber: string; driverImage: string | null;
    destinationLat?: number | null; destinationLng?: number | null; destinationAddress?: string | null;
  } | null>(null);

  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const prevDriverPos = useRef<{ lat: number; lng: number } | null>(null);

  // Fetch driver location periodically
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/driver-location`);
        if (res.ok) {
          const data = await res.json();
          if (data.lat && data.lng) {
            setDriverInfo({
              lat: data.lat, lng: data.lng,
              driverName: data.driverName,
              vehicleType: data.vehicleType,
              plateNumber: data.plateNumber,
              driverImage: data.driverImage,
              destinationLat: data.destinationLat,
              destinationLng: data.destinationLng,
              destinationAddress: data.destinationAddress,
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch driver location', err);
      }
    };

    fetchLocation();
    const interval = setInterval(fetchLocation, 10000);
    return () => clearInterval(interval);
  }, [orderId]);

  // Init map + update marker (lightweight, runs on every poll)
  useEffect(() => {
    if (!mapContainer.current || !driverInfo) return;

    if (!mapRef.current) {
      import('leaflet').then((leaflet) => {
        const L = leaflet.default;

        const map = L.map(mapContainer.current!, {
          center: [driverInfo.lat, driverInfo.lng],
          zoom: 15,
          zoomControl: false,
          attributionControl: false,
        });

        mapRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 19,
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Destination marker
        if (driverInfo.destinationLat && driverInfo.destinationLng) {
          const destIcon = L.divIcon({
            html: `<div class="w-8 h-8 bg-red-500 rounded-full border-3 border-white shadow-lg flex items-center justify-center">
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                   </div>`,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          });

          L.marker([driverInfo.destinationLat, driverInfo.destinationLng], { icon: destIcon })
            .bindPopup(`<b>Tujuan Anda</b><br/>${driverInfo.destinationAddress || ''}`)
            .addTo(map);
        }

        // Driver marker with pulse
        const driverIcon = L.divIcon({
          html: `<div class="relative">
                   <div class="absolute -inset-2 bg-[#B48A5E]/20 rounded-full animate-ping"></div>
                   <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-emerald-500 relative z-10">
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><rect width="16" height="11" x="4" y="7" rx="2"/><path d="M12 3v4"/><circle cx="8" cy="21" r="1"/><circle cx="16" cy="21" r="1"/></svg>
                   </div>
                 </div>`,
          className: '',
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        driverMarkerRef.current = L.marker([driverInfo.lat, driverInfo.lng], { icon: driverIcon })
          .addTo(map);

      });
    } else {
      // Update existing driver marker (lightweight - no route fetch)
      driverMarkerRef.current?.setLatLng([driverInfo.lat, driverInfo.lng]);
      mapRef.current.flyTo([driverInfo.lat, driverInfo.lng], undefined, { duration: 0.5 });
    }
  }, [driverInfo]);

  // Fetch route from OSRM only when driver moves significantly (>100m)
  useEffect(() => {
    if (!driverInfo?.destinationLat || !driverInfo?.destinationLng || !mapRef.current) return;

    // Calculate distance from previous position
    const prev = prevDriverPos.current;
    if (prev) {
      const dlat = driverInfo.lat - prev.lat;
      const dlng = driverInfo.lng - prev.lng;
      const distSq = dlat * dlat + dlng * dlng;
      // ~100m threshold (approx 0.001 degrees squared)
      if (distSq < 0.000001) return;
    }
    prevDriverPos.current = { lat: driverInfo.lat, lng: driverInfo.lng };

    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${driverInfo.lng},${driverInfo.lat};${driverInfo.destinationLng},${driverInfo.destinationLat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          setRouteInfo({
            distance: route.distance / 1000,
            duration: route.duration / 60,
          });

          const coords: L.LatLngTuple[] = route.geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]] as L.LatLngTuple
          );

          import('leaflet').then((leaflet) => {
            const L = leaflet.default;
            if (routeLayerRef.current) {
              routeLayerRef.current.setLatLngs(coords);
            } else {
              routeLayerRef.current = L.polyline(coords, {
                color: '#22C55E',
                weight: 4,
                opacity: 0.7,
                dashArray: '8, 6',
              }).addTo(mapRef.current!);
            }

            // Fit bounds
            const bounds = L.latLngBounds(
              [driverInfo.lat, driverInfo.lng],
              [driverInfo.destinationLat!, driverInfo.destinationLng!]
            );
            mapRef.current!.fitBounds(bounds, { padding: [40, 40] });
          });
        }
      } catch (err) {
        console.error('Failed to fetch route', err);
      }
    };
    fetchRoute();
  }, [driverInfo]);

  // Cleanup
  useEffect(() => {
    return () => {
      // Don't call mapRef.current.remove() synchronously on unmount 
      // if it hasn't finished initializing, but since we used then() we can just clear it.
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  if (!driverInfo) {
    return (
      <div className="w-full h-48 bg-gray-100 rounded-2xl flex items-center justify-center border border-gray-200">
        <div className="flex items-center gap-2 text-gray-500">
          <Truck className="w-5 h-5 animate-pulse" />
          <span className="text-sm font-medium">Mencari lokasi kurir...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Driver Info Card */}
      <div className="flex items-center gap-3 p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-white shrink-0 border border-emerald-200">
          {driverInfo.driverImage ? (
            <img src={driverInfo.driverImage} alt={driverInfo.driverName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
              <Truck className="w-6 h-6" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-900 text-sm truncate">{driverInfo.driverName || 'Kurir Arus'}</h4>
          <p className="text-xs text-gray-600 flex items-center gap-1.5 mt-0.5">
            <span className="font-medium">{driverInfo.vehicleType || 'Motor'}</span>
            <span>•</span>
            <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200 text-[10px]">{driverInfo.plateNumber || '-'}</span>
          </p>
        </div>
      </div>

      {/* ETA Banner */}
      {routeInfo && (
        <div className="flex items-center justify-between bg-emerald-50 rounded-xl p-3 border border-emerald-100">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-700">{routeInfo.distance.toFixed(1)} km</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-700">~{Math.ceil(routeInfo.duration)} menit</span>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="w-full h-64 sm:h-72 relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
        <div ref={mapContainer} className="absolute inset-0" />
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm text-xs font-bold text-emerald-600 flex items-center gap-1.5 border border-white z-[1000]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Live Tracking
        </div>
      </div>
    </div>
  );
}
