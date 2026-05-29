'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Truck, Clock, MapPin, Navigation, Phone, MessageCircle, ChevronDown, ChevronUp, ChevronRight, RefreshCw, ShieldCheck, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import type L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatRupiah } from '@/lib/utils';
import { getDeliveryPin } from '@/lib/delivery-utils';
import { useRouter } from 'next/navigation';

interface Stop {
  name: string;
  qty: number;
  price: number;
  mods?: string;
}

interface LeafletTrackingProps {
  orderId: string;
  orderStatus: string;
  paymentMethod: string;
  customerName: string;
  customerPhone: string;
  address: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: Stop[];
  onConfirmDelivery: () => Promise<void>;
  isConfirming: boolean;
  confirmError: string | null;
}

export function LeafletTracking({
  orderId,
  orderStatus,
  paymentMethod,
  customerName,
  customerPhone,
  address,
  subtotal,
  deliveryFee,
  total,
  items,
  onConfirmDelivery,
  isConfirming,
  confirmError
}: LeafletTrackingProps) {
  const router = useRouter();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const storeMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);

  const [driverInfo, setDriverInfo] = useState<{
    lat: number; lng: number; driverName: string; driverPhone?: string | null; vehicleType: string; plateNumber: string; driverImage: string | null;
    destinationLat?: number | null; destinationLng?: number | null; destinationAddress?: string | null;
  } | null>(null);

  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const prevDriverPos = useRef<{ lat: number; lng: number } | null>(null);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  // Store default coordinates (Probolinggo)
  const storeLat = -7.78125167;
  const storeLng = 113.212266;

  // Generate delivery PIN for COD
  const deliveryPin = getDeliveryPin(orderId);

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
              driverPhone: data.driverPhone,
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

  // Init map and static markers
  useEffect(() => {
    if (!mapContainer.current) return;
    if ((mapContainer.current as any)._leaflet_id) return;

    import('leaflet').then((leaflet) => {
      const L = leaflet.default;

      // Start map centered on the store coordinates
      const map = L.map(mapContainer.current!, {
        center: [storeLat, storeLng],
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

      // Store marker
      const storeIcon = L.divIcon({
        html: `<div class="w-8 h-8 bg-emerald-600 rounded-full border-3 border-white shadow-lg flex items-center justify-center text-white">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
               </div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      storeMarkerRef.current = L.marker([storeLat, storeLng], { icon: storeIcon })
        .bindPopup('<b>Matchaboy Store</b>')
        .addTo(map);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update driver marker and destination marker when driverInfo is loaded
  useEffect(() => {
    if (!mapRef.current || !driverInfo) return;

    import('leaflet').then((leaflet) => {
      const L = leaflet.default;

      // Destination Marker
      if (driverInfo.destinationLat && driverInfo.destinationLng) {
        if (!destMarkerRef.current) {
          const destIcon = L.divIcon({
            html: `<div class="w-8 h-8 bg-red-500 rounded-full border-3 border-white shadow-lg flex items-center justify-center">
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                   </div>`,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          });

          destMarkerRef.current = L.marker([driverInfo.destinationLat, driverInfo.destinationLng], { icon: destIcon })
            .bindPopup(`<b>Alamat Anda</b>`)
            .addTo(mapRef.current!);
        } else {
          destMarkerRef.current.setLatLng([driverInfo.destinationLat, driverInfo.destinationLng]);
        }
      }

      // Driver Marker
      if (!driverMarkerRef.current) {
        const driverIcon = L.divIcon({
          html: `<div class="relative">
                   <div class="absolute -inset-2 bg-emerald-400/20 rounded-full animate-ping"></div>
                   <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-emerald-500 relative z-10">
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5"><rect width="16" height="11" x="4" y="7" rx="2"/><path d="M12 3v4"/><circle cx="8" cy="21" r="1"/><circle cx="16" cy="21" r="1"/></svg>
                   </div>
                 </div>`,
          className: '',
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        driverMarkerRef.current = L.marker([driverInfo.lat, driverInfo.lng], { icon: driverIcon })
          .bindPopup(`<b>Kurir: ${driverInfo.driverName}</b>`)
          .addTo(mapRef.current!);
      } else {
        driverMarkerRef.current.setLatLng([driverInfo.lat, driverInfo.lng]);
      }
    });
  }, [driverInfo]);

  // Fetch route geometry from OSRM when driver moves significantly (>100m)
  useEffect(() => {
    if (!driverInfo?.destinationLat || !driverInfo?.destinationLng || !mapRef.current) return;

    const prev = prevDriverPos.current;
    if (prev) {
      const dlat = driverInfo.lat - prev.lat;
      const dlng = driverInfo.lng - prev.lng;
      const distSq = dlat * dlat + dlng * dlng;
      if (distSq < 0.000001) return; // ignore minor movement
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
                color: '#10B981',
                weight: 5,
                opacity: 0.8,
                dashArray: '8, 6',
              }).addTo(mapRef.current!);
            }

            // Fit bounds to show route
            const bounds = L.latLngBounds(
              [driverInfo.lat, driverInfo.lng],
              [driverInfo.destinationLat!, driverInfo.destinationLng!]
            );
            mapRef.current!.fitBounds(bounds, { padding: [50, 50] });
          });
        }
      } catch (err) {
        console.error('Failed to fetch route', err);
      }
    };
    fetchRoute();
  }, [driverInfo]);

  // Swipe logic for non-COD orders
  const swipeContainerRef = useRef<HTMLDivElement>(null);
  const [swipeDragWidth, setSwipeDragWidth] = useState(0);
  const swipeX = useMotionValue(0);
  const swipeTextOpacity = useTransform(swipeX, [0, 150], [1, 0]);
  const swipeBgWidth = useTransform(swipeX, (value) => `${value + 48}px`);

  useEffect(() => {
    const updateWidth = () => {
      if (swipeContainerRef.current) {
        setSwipeDragWidth(swipeContainerRef.current.offsetWidth - 56);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [driverInfo]);

  const handleDragEnd = async () => {
    if (swipeX.get() >= swipeDragWidth * 0.9) {
      swipeX.set(swipeDragWidth);
      await onConfirmDelivery();
    } else {
      swipeX.set(0);
    }
  };

  const formattedWhatsAppNumber = (phone: string) => {
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('08')) {
      cleaned = '62' + cleaned.substring(1);
    } else if (cleaned.startsWith('8')) {
      cleaned = '62' + cleaned;
    }
    return cleaned;
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ASSIGNED': return 'Kurir ditugaskan';
      case 'PICKED_UP': return 'Pesanan diambil';
      case 'ON_DELIVERY': return 'Sedang dikirim';
      default: return 'Sedang diproses';
    }
  };

  return (
    <div className="fixed inset-0 z-30 bg-gray-50 flex flex-col justify-end">
      {/* Map Element (Fullscreen Background) */}
      <div ref={mapContainer} className="absolute inset-0 z-0 w-full h-full" />

      {/* Floating Header */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        <button
          onClick={() => router.push('/profile?section=orders')}
          className="w-11 h-11 bg-white hover:bg-gray-50 text-gray-800 rounded-full shadow-xl flex items-center justify-center border border-gray-100 transition-all pointer-events-auto active:scale-95"
          title="Kembali"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-xl border border-white text-xs font-black text-emerald-600 flex items-center gap-2 pointer-events-auto select-none">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          {getStatusText(orderStatus).toUpperCase()}
        </div>
      </div>

      {/* Floating Bottom Card (Gojek/Grab style sheet) */}
      <div className="z-10 bg-white rounded-t-[36px] shadow-[0_-10px_35px_rgba(0,0,0,0.12)] border-t border-gray-150 p-6 pb-10 max-h-[85vh] overflow-y-auto max-w-md mx-auto w-full flex flex-col space-y-4 animate-in slide-in-from-bottom duration-300">
        
        {/* Drag Handle Decorator */}
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto shrink-0 mb-1" />

        {/* ETA & Status Section */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 shrink-0">
          <div>
            <h3 className="font-heading font-black text-gray-900 text-lg">
              {routeInfo ? `Tiba dalam ~${Math.ceil(routeInfo.duration)} mnt` : 'Sedang dikirim'}
            </h3>
            <p className="text-xs text-gray-500 font-semibold mt-0.5 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-emerald-600" />
              {routeInfo ? `${routeInfo.distance.toFixed(1)} km lagi` : 'Menghitung rute terbaik...'}
            </p>
          </div>
          <div className="px-3.5 py-1.5 bg-emerald-50 rounded-2xl border border-emerald-100 text-[10px] font-black text-emerald-800 uppercase tracking-wide">
            {paymentMethod}
          </div>
        </div>

        {/* Driver Profile & Contacts */}
        {driverInfo ? (
          <div className="flex items-center justify-between gap-3 bg-gray-50/70 border border-gray-100 rounded-3xl p-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-white border-2 border-emerald-200 shrink-0 shadow-sm">
                {driverInfo.driverImage ? (
                  <img src={driverInfo.driverImage} alt={driverInfo.driverName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                    <Truck className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-extrabold text-gray-900 text-sm">{driverInfo.driverName}</h4>
                <p className="text-[11px] text-gray-600 mt-0.5 flex items-center gap-1 font-semibold">
                  <span>{driverInfo.vehicleType}</span>
                  <span>•</span>
                  <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200 text-[10px] text-gray-700">{driverInfo.plateNumber}</span>
                </p>
              </div>
            </div>
            
            {/* Contact Actions */}
            <div className="flex gap-2">
              {driverInfo.driverPhone && (
                <>
                  <a
                    href={`tel:${driverInfo.driverPhone}`}
                    className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 hover:bg-blue-100 active:scale-90 transition-all"
                    title="Telepon"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                  <a
                    href={`https://wa.me/${formattedWhatsAppNumber(driverInfo.driverPhone)}?text=${encodeURIComponent(`Halo kurir Matchaboy, posisi di mana ya?`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 active:scale-90 transition-all"
                    title="WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-gray-50/70 border border-gray-100 rounded-3xl shrink-0 animate-pulse">
            <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        )}

        {/* Security PIN for COD Payment Method */}
        {paymentMethod === 'COD' && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-3xl text-center space-y-2.5 shrink-0">
            <div className="flex items-center gap-2 justify-center text-amber-800 font-extrabold text-xs">
              <ShieldCheck className="w-4.5 h-4.5 text-amber-600 animate-pulse" />
              <span>KODE VERIFIKASI PENGANTARAN COD</span>
            </div>
            <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
              Sebutkan kode PIN ini kepada kurir saat pesanan Anda tiba untuk menyelesaikan pembayaran tunai & pengantaran.
            </p>
            <div className="inline-flex gap-2 items-center justify-center px-6 py-2.5 bg-white border border-amber-300 rounded-2xl shadow-inner select-all font-mono font-black text-xl text-amber-900 tracking-wider">
              {deliveryPin}
            </div>
            <p className="text-[10px] text-amber-600/80 font-bold animate-pulse">
              Menunggu kurir melakukan verifikasi PIN...
            </p>
          </div>
        )}

        {/* Swipe to Confirm Button for Non-COD Orders */}
        {paymentMethod !== 'COD' && (
          <div className="shrink-0 pt-1">
            <p className="text-[11px] text-center text-gray-500 mb-2.5 font-bold">Pesanan sudah sampai di tangan Anda? Geser untuk konfirmasi</p>
            <div 
              ref={swipeContainerRef}
              className="w-full relative overflow-hidden bg-emerald-50 border border-emerald-200 rounded-full p-1 h-14 shadow-inner flex items-center select-none"
            >
              <motion.div 
                className="absolute left-1 top-1 bottom-1 bg-emerald-500 rounded-full"
                style={{ width: swipeBgWidth }}
              />
              
              <motion.div 
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ opacity: swipeTextOpacity }}
              >
                <span className="font-extrabold text-emerald-700 text-sm">Geser untuk Konfirmasi</span>
              </motion.div>

              <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: swipeDragWidth }}
                dragElastic={0.05}
                dragMomentum={false}
                onDragEnd={handleDragEnd}
                style={{ x: swipeX }}
                className="w-12 h-12 rounded-full bg-white border border-emerald-300 flex items-center justify-center text-emerald-600 shadow-md cursor-grab active:cursor-grabbing z-10 shrink-0"
              >
                {isConfirming ? (
                  <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
                ) : (
                  <ChevronRight className="w-6 h-6 text-emerald-500" />
                )}
              </motion.div>
            </div>
            {confirmError && <p className="text-xs text-red-500 text-center mt-2 font-bold">{confirmError}</p>}
          </div>
        )}

        {/* Collapsible Order Details Summary */}
        <div className="border-t border-gray-100 pt-3">
          <button
            onClick={() => setDetailsExpanded(!detailsExpanded)}
            className="w-full flex items-center justify-between text-gray-700 font-extrabold text-xs py-2 hover:bg-gray-50 rounded-xl px-2 transition-all"
          >
            <span>Rincian Pesanan ({items.length} Item)</span>
            {detailsExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>

          <AnimatePresence>
            {detailsExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-3 pt-2 px-2"
              >
                <div className="divide-y divide-gray-100 max-h-36 overflow-y-auto pr-1">
                  {items.map((item, index) => (
                    <div key={index} className="py-2.5 flex justify-between text-xs">
                      <div>
                        <p className="font-extrabold text-gray-900">{item.qty}x {item.name}</p>
                        {item.mods && <p className="text-[10px] text-gray-500 mt-0.5 font-medium">{item.mods}</p>}
                      </div>
                      <span className="font-bold text-gray-800 shrink-0">{formatRupiah(item.price * item.qty)}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-gray-50 rounded-2xl p-3.5 space-y-2 border border-gray-100">
                  <div className="flex justify-between text-xs font-semibold text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatRupiah(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-gray-600">
                    <span>Ongkir</span>
                    <span>{formatRupiah(deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-black text-gray-950 pt-2 border-t border-gray-200">
                    <span>Total Pembayaran</span>
                    <span className="text-[#B48A5E]">{formatRupiah(total)}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3.5 bg-gray-50 rounded-2xl text-xs text-gray-600 border border-gray-100">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[9px] font-black uppercase text-gray-400">Alamat Pengiriman</p>
                    <p className="mt-0.5 font-medium leading-relaxed">{address.split('(')[0].trim()}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
