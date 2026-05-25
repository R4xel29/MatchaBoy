'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Power, MapPin, Package, Navigation, Phone, Check, Loader2, AlertTriangle, Truck, MessageCircle } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';

const DriverNavigationMap = dynamic(() => import('@/components/driver/DriverNavigationMap').then(m => m.DriverNavigationMap), { ssr: false });

interface OrderItem {
  id: string;
  qty: number;
  product: { name: string };
}

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  address: string | null;
  total: number;
  status: string;
  items: OrderItem[];
}

const formatWhatsAppNumber = (phone: string) => {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('08')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
};

const getDriverWhatsAppTemplate = (order: any) => {
  const orderIdShort = order.id.slice(-4).toUpperCase();
  return `Halo ${order.customerName}, saya kurir dari *Matchaboy* yang mengantarkan pesanan Anda *#${orderIdShort}*. Saya sedang dalam perjalanan menuju lokasi Anda. Mohon standby ya. Terima kasih! 🛵`;
};

export default function DriverDashboardPage() {
  const { data: session } = useSession();
  const [isOnline, setIsOnline] = useState(false);
  const [driverStatus, setDriverStatus] = useState<string>('APPROVED');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [driverLat, setDriverLat] = useState(-6.2088);
  const [driverLng, setDriverLng] = useState(106.8456);
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial state & poll for new orders
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, ordersRes] = await Promise.all([
          fetch('/api/user/profile'),
          fetch('/api/driver/orders')
        ]);
        
        if (profileRes.ok) {
          const profile = await profileRes.json();
          if (profile.driverProfile) {
            setIsOnline(profile.driverProfile.isOnline);
            setDriverStatus(profile.driverProfile.status || 'APPROVED');
          }
        }
        
        if (ordersRes.ok) {
          const data = await ordersRes.json();
          setOrders(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();

    // Auto-refresh orders every 15 seconds to detect new assignments
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/driver/orders');
        if (res.ok) {
          const data = await res.json();
          setOrders(Array.isArray(data) ? data : []);
        }
      } catch {}
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // Derive stable boolean for GPS effect dependency
  const hasActiveDelivery = useMemo(
    () => orders.some(o => o.status === 'ON_DELIVERY'),
    [orders]
  );

  // GPS Streaming Logic
  useEffect(() => {
    const sendLocation = (lat: number, lng: number) => {
      fetch('/api/driver/location', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      }).catch(console.error);
    };

    if (isOnline && hasActiveDelivery) {
      if ('geolocation' in navigator) {
        // Use watchPosition only (no duplicate setInterval)
        const watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setDriverLat(lat);
            setDriverLng(lng);
            sendLocation(lat, lng);
          },
          (err) => console.error('GPS error:', err),
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
        );

        return () => {
          navigator.geolocation.clearWatch(watchId);
        };
      }
    }
  }, [isOnline, hasActiveDelivery]);

  const toggleOnline = async () => {
    if (driverStatus !== 'APPROVED') {
      alert(`Akun Anda sedang ${driverStatus === 'PENDING' ? 'menunggu persetujuan admin' : 'dinonaktifkan'}.`);
      return;
    }
    const nextState = !isOnline;
    setIsOnline(nextState);
    try {
      const res = await fetch('/api/driver/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline: nextState })
      });
      if (!res.ok) {
        throw new Error('Gagal update status');
      }
    } catch {
      setIsOnline(!nextState); // revert on error
      alert('Gagal mengubah status. Periksa koneksi internet Anda.');
    }
  };

  const advanceOrderStatus = async (orderId: string, currentStatus: string) => {
    const nextStatusMap: Record<string, string> = {
      'ASSIGNED': 'PICKED_UP',
      'PICKED_UP': 'ON_DELIVERY',
      'ON_DELIVERY': 'DELIVERED'
    };
    
    const nextStatus = nextStatusMap[currentStatus];
    if (!nextStatus) return;

    setUpdatingStatus(orderId);
    try {
      const res = await fetch(`/api/driver/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
      }
    } catch (err) {
      console.error(err);
      alert('Gagal update status pesanan');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusButtonConfig = (status: string) => {
    switch(status) {
      case 'ASSIGNED': return { label: 'Ambil Pesanan', icon: Package, color: 'bg-blue-600' };
      case 'PICKED_UP': return { label: 'Mulai Antar', icon: Navigation, color: 'bg-amber-500' };
      case 'ON_DELIVERY': return { label: 'Selesai Diantar', icon: Check, color: 'bg-emerald-600' };
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-4" />
        <p className="text-sm font-medium text-muted-foreground">Memuat dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      {driverStatus !== 'APPROVED' && (
        <div className={`p-4 rounded-2xl flex items-start gap-3 border ${driverStatus === 'PENDING' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
          <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${driverStatus === 'PENDING' ? 'text-amber-600' : 'text-red-600'}`} />
          <div>
            <h3 className={`font-bold text-sm ${driverStatus === 'PENDING' ? 'text-amber-900' : 'text-red-900'}`}>
              {driverStatus === 'PENDING' ? 'Menunggu Persetujuan' : 'Akun Dinonaktifkan'}
            </h3>
            <p className={`text-xs mt-1 leading-relaxed ${driverStatus === 'PENDING' ? 'text-amber-700' : 'text-red-700'}`}>
              {driverStatus === 'PENDING' 
                ? 'Akun kurir Anda sedang ditinjau oleh Admin. Anda tidak dapat menerima pesanan saat ini.' 
                : 'Akun kurir Anda telah dinonaktifkan oleh Admin. Silakan hubungi pengelola toko.'}
            </p>
          </div>
        </div>
      )}

      {/* Online Toggle */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-border/40">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg text-foreground">Shift Anda</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isOnline ? 'Sistem mencari dan melacak posisi' : 'Anda sedang offline'}
            </p>
          </div>
          <button
            onClick={toggleOnline}
            className={`relative w-16 h-8 rounded-full transition-colors duration-300 ${isOnline ? 'bg-emerald-500' : 'bg-gray-200'}`}
          >
            <motion.div
              initial={false}
              animate={{ x: isOnline ? 32 : 0 }}
              className="absolute left-1 top-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md"
            >
              <Power className={`w-3 h-3 ${isOnline ? 'text-emerald-500' : 'text-gray-400'}`} />
            </motion.div>
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Truck className="w-4 h-4 text-brand-600" />
          Daftar Antaran ({orders.filter(o => o.status !== 'DELIVERED').length})
        </h3>

        {!isOnline && orders.length === 0 ? (
           <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
             <Power className="w-8 h-8 text-gray-300 mx-auto mb-3" />
             <p className="text-sm font-medium text-gray-500">Aktifkan shift untuk menerima pesanan</p>
           </div>
        ) : orders.filter(o => o.status !== 'DELIVERED').length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
            <Check className="w-8 h-8 text-emerald-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">Tidak ada antaran aktif</p>
          </div>
        ) : (
          orders.filter(o => o.status !== 'DELIVERED').map((order) => {
            const btnConfig = getStatusButtonConfig(order.status);
            const Icon = btnConfig?.icon || Check;

            // Parse destination coords from address (if available)
            let destLat = -7.756928;
            let destLng = 113.211502;
            if (order.address) {
              const coordMatch = order.address.match(/\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)/);
              if (coordMatch) {
                destLat = parseFloat(coordMatch[1]);
                destLng = parseFloat(coordMatch[2]);
              }
            }

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-3xl border ${order.status === 'ON_DELIVERY' ? 'border-amber-300 shadow-md' : 'border-border/40 shadow-sm'} overflow-hidden`}
              >
                {order.status === 'ON_DELIVERY' && (
                  <div className="bg-amber-50 px-4 py-2 flex items-center justify-center gap-2 border-b border-amber-100">
                     <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                     <p className="text-xs font-bold text-amber-700 tracking-wide uppercase">Sedang Diantar & Transmit GPS</p>
                  </div>
                )}
                
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] font-bold text-brand-600 uppercase tracking-wider mb-1">
                        Order #{order.id.slice(-4).toUpperCase()}
                      </p>
                      <h4 className="font-bold text-gray-900 text-sm">{order.customerName}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{order.items.length} item • {formatRupiah(order.total)}</p>
                    </div>
                    <div className="flex gap-2">
                      <a href={`tel:${order.customerPhone}`} className="p-2.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Hubungi Telepon">
                        <Phone className="w-4 h-4" />
                      </a>
                      <a
                        href={`https://wa.me/${formatWhatsAppNumber(order.customerPhone)}?text=${encodeURIComponent(getDriverWhatsAppTemplate(order))}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                        title="Kirim Pesan WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3 mb-4">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <p className="text-xs font-medium text-gray-700 leading-relaxed">
                      {order.address || 'Alamat tidak tersedia'}
                    </p>
                  </div>

                  {order.status === 'ON_DELIVERY' && (
                    <div className="mb-4">
                      <DriverNavigationMap
                        driverLat={driverLat}
                        driverLng={driverLng}
                        destinationLat={destLat}
                        destinationLng={destLng}
                        destinationAddress={order.address?.split('(')[0]?.trim() || order.address || ''}
                      />
                    </div>
                  )}

                  {btnConfig && (
                    <button
                      onClick={() => advanceOrderStatus(order.id, order.status)}
                      disabled={updatingStatus === order.id}
                      className={`w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-70 ${btnConfig.color}`}
                    >
                      {updatingStatus === order.id ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</>
                      ) : (
                        <><Icon className="w-4 h-4" /> {btnConfig.label}</>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
