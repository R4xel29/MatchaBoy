'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Power, MapPin, Package, Navigation, Phone, Check, Loader2, 
  AlertTriangle, Truck, MessageCircle, History, User, Camera, 
  Clock, Save, ArrowLeft, ShieldCheck, Mail, Bike, Hash, LogOut,
  BellRing, VolumeX, Volume2
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { useSession, signOut, signIn } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { ImageCropModal } from '@/components/ui/ImageCropModal';

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
  createdAt: string;
  paymentMethod: string;
  user?: {
    image: string | null;
  } | null;
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

// --- Notification Sound System using Web Audio API ---
function useOrderNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPlayingRef = useRef(false);
  const [isSoundPlaying, setIsSoundPlaying] = useState(false);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playAlarm = useCallback(() => {
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const duration = 1.4;

      // === LAYER 1: Siren sweep (high-low-high) ===
      const siren = ctx.createOscillator();
      const sirenGain = ctx.createGain();
      siren.type = 'sawtooth'; // harsh, buzzy tone
      siren.frequency.setValueAtTime(800, now);
      siren.frequency.linearRampToValueAtTime(1600, now + 0.2);
      siren.frequency.linearRampToValueAtTime(800, now + 0.4);
      siren.frequency.linearRampToValueAtTime(1600, now + 0.6);
      siren.frequency.linearRampToValueAtTime(800, now + 0.8);
      siren.frequency.linearRampToValueAtTime(1600, now + 1.0);
      siren.frequency.linearRampToValueAtTime(800, now + 1.2);
      sirenGain.gain.setValueAtTime(0.7, now);
      sirenGain.gain.setValueAtTime(0.7, now + duration - 0.1);
      sirenGain.gain.linearRampToValueAtTime(0, now + duration);
      siren.connect(sirenGain);
      sirenGain.connect(ctx.destination);
      siren.start(now);
      siren.stop(now + duration);

      // === LAYER 2: Rapid beeping (square wave pulses) ===
      for (let i = 0; i < 7; i++) {
        const beep = ctx.createOscillator();
        const beepGain = ctx.createGain();
        beep.type = 'square'; // maximum harshness
        beep.frequency.setValueAtTime(1200, now + i * 0.2);
        
        const t = now + i * 0.2;
        beepGain.gain.setValueAtTime(0, t);
        beepGain.gain.linearRampToValueAtTime(0.6, t + 0.01);
        beepGain.gain.setValueAtTime(0.6, t + 0.08);
        beepGain.gain.linearRampToValueAtTime(0, t + 0.1);

        beep.connect(beepGain);
        beepGain.connect(ctx.destination);
        beep.start(t);
        beep.stop(t + 0.15);
      }

      // === LAYER 3: Low rumble for urgency ===
      const bass = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bass.type = 'square';
      bass.frequency.setValueAtTime(150, now);
      bassGain.gain.setValueAtTime(0.5, now);
      bassGain.gain.setValueAtTime(0.5, now + duration - 0.15);
      bassGain.gain.linearRampToValueAtTime(0, now + duration);
      bass.connect(bassGain);
      bassGain.connect(ctx.destination);
      bass.start(now);
      bass.stop(now + duration);

    } catch (err) {
      console.error('Alarm sound error:', err);
    }
  }, [getAudioContext]);

  const startLoop = useCallback(() => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    setIsSoundPlaying(true);

    // Play immediately, then loop aggressively
    playAlarm();
    intervalRef.current = setInterval(() => {
      playAlarm();
    }, 2000); // repeat every 2 seconds — relentless
  }, [playAlarm]);

  const stopLoop = useCallback(() => {
    isPlayingRef.current = false;
    setIsSoundPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  return { startLoop, stopLoop, isSoundPlaying };
}

export default function DriverDashboardPage() {
  const { showToast } = useToast();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'deliveries' | 'history' | 'profile'>('deliveries');
  
  // Dashboard & Order States
  const [isOnline, setIsOnline] = useState(false);
  const [driverStatus, setDriverStatus] = useState<string>('APPROVED');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // PIN Verification Modal States
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinOrderId, setPinOrderId] = useState<string | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);
  
  // Sound notification system
  const { startLoop, stopLoop, isSoundPlaying } = useOrderNotificationSound();
  const [soundDismissed, setSoundDismissed] = useState(false);
  const prevAssignedIdsRef = useRef<Set<string>>(new Set());
  
  // GPS Coords default to Probolinggo
  const [driverLat, setDriverLat] = useState(-7.78125167);
  const [driverLng, setDriverLng] = useState(113.212266);

  // Profile Edit States
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [vehicleType, setVehicleType] = useState('Motor');
  const [plateNumber, setPlateNumber] = useState('');
  const [driverImageUrl, setDriverImageUrl] = useState('');
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');
  
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Image crop states
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState('');

  // Fetch initial profile & orders
  const fetchData = async () => {
    try {
      const [profileRes, ordersRes] = await Promise.all([
        fetch('/api/user/profile'),
        fetch('/api/driver/orders')
      ]);
      
      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data);
        setIsGoogleConnected(data.isGoogleConnected || false);
        if (data.driverProfile) {
          setIsOnline(data.driverProfile.isOnline);
          setDriverStatus(data.driverProfile.status || 'APPROVED');
          
          if (data.driverProfile.lastLat && data.driverProfile.lastLng) {
            setDriverLat(data.driverProfile.lastLat);
            setDriverLng(data.driverProfile.lastLng);
          }
          
          // Populate profile form states
          setName(data.name || '');
          setPhone(data.phone || '');
          setEmail(data.email || '');
          setVehicleType(data.driverProfile.vehicleType || 'Motor');
          setPlateNumber(data.driverProfile.plateNumber || '');
          setDriverImageUrl(data.driverProfile.driverImageUrl || '');
          setShiftStart(data.driverProfile.shiftStart || '');
          setShiftEnd(data.driverProfile.shiftEnd || '');
        } else {
          setName(data.name || '');
          setPhone(data.phone || '');
          setEmail(data.email || '');
        }
      }
      
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal memuat data kurir', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  // --- Sound notification effect: detect new ASSIGNED orders ---
  const assignedOrders = useMemo(() => orders.filter(o => o.status === 'ASSIGNED'), [orders]);

  useEffect(() => {
    const currentAssignedIds = new Set(assignedOrders.map(o => o.id));
    const prevIds = prevAssignedIdsRef.current;

    // Check if there are genuinely NEW assigned orders (not just the same ones)
    const hasNewOrders = assignedOrders.some(o => !prevIds.has(o.id));

    if (hasNewOrders && currentAssignedIds.size > 0) {
      // Reset dismissed state for new orders
      setSoundDismissed(false);
    }

    prevAssignedIdsRef.current = currentAssignedIds;
  }, [assignedOrders]);

  useEffect(() => {
    if (assignedOrders.length > 0 && !soundDismissed) {
      startLoop();
    } else {
      stopLoop();
    }
  }, [assignedOrders.length, soundDismissed, startLoop, stopLoop]);

  const dismissSound = useCallback(() => {
    setSoundDismissed(true);
    stopLoop();
  }, [stopLoop]);

  // Stable boolean check for GPS effect dependency
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
      showToast(`Akun Anda sedang ${driverStatus === 'PENDING' ? 'menunggu persetujuan admin' : 'dinonaktifkan'}.`, 'error');
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
      showToast('Gagal mengubah status. Periksa koneksi internet Anda.', 'error');
    }
  };

  const handleStartAdvanceStatus = (order: Order) => {
    // If it's a COD order and status is ON_DELIVERY (meaning next status is DELIVERED/complete)
    // we require PIN verification!
    const isCod = order.paymentMethod === 'COD';
    if (order.status === 'ON_DELIVERY' && isCod) {
      setPinOrderId(order.id);
      setEnteredPin('');
      setPinError('');
      setShowPinModal(true);
      return;
    }

    // Otherwise, proceed normally
    advanceOrderStatus(order.id, order.status);
  };

  const advanceOrderStatus = async (orderId: string, currentStatus: string, pinCode?: string) => {
    const nextStatusMap: Record<string, string> = {
      'ASSIGNED': 'PICKED_UP',
      'PICKED_UP': 'ON_DELIVERY',
      'ON_DELIVERY': 'DELIVERED'
    };
    
    const nextStatus = nextStatusMap[currentStatus];
    if (!nextStatus) return;

    if (pinCode) {
      setVerifyingPin(true);
    } else {
      setUpdatingStatus(orderId);
    }
    
    try {
      const res = await fetch(`/api/driver/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, pin: pinCode })
      });
      
      const data = await res.json();
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
        showToast('Status pesanan berhasil diperbarui', 'success');
        if (pinCode) {
          setShowPinModal(false);
          setPinOrderId(null);
        }
      } else {
        if (pinCode) {
          setPinError(data.error || 'Gagal memproses verifikasi PIN.');
        } else {
          showToast(data.error || 'Gagal update status pesanan', 'error');
        }
      }
    } catch (err) {
      console.error(err);
      if (pinCode) {
        setPinError('Terjadi kesalahan koneksi. Coba lagi.');
      } else {
        showToast('Gagal update status pesanan', 'error');
      }
    } finally {
      setUpdatingStatus(null);
      setVerifyingPin(false);
    }
  };

  const getStatusButtonConfig = (status: string) => {
    switch(status) {
      case 'ASSIGNED': return { label: 'Ambil Pesanan', icon: Package, color: 'bg-blue-600' };
      case 'PICKED_UP': return { label: 'Mulai Antar', icon: Navigation, color: 'bg-amber-500' };
      case 'ON_DELIVERY': return { label: 'Selesai Diantar', icon: Check, color: 'bg-[#B48A5E]' };
      default: return null;
    }
  };

  // Photo select handler
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create temporary URL for cropping
    const reader = new FileReader();
    reader.onload = () => {
      setTempImageUrl(reader.result as string);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  // Handle crop complete
  const handleCropComplete = async (croppedImageBlob: Blob) => {
    const formData = new FormData();
    formData.append('file', croppedImageBlob, 'driver-profile.jpg');

    setUploadingPhoto(true);
    setShowCropModal(false);
    
    try {
      const res = await fetch('/api/driver/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setDriverImageUrl(data.url);
        showToast('Foto profil berhasil diunggah!', 'success');
      } else {
        showToast(data.error || 'Gagal mengunggah foto', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal mengunggah foto profil', 'error');
    } finally {
      setUploadingPhoto(false);
      setTempImageUrl('');
    }
  };

  // Save profile changes
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          vehicleType,
          plateNumber,
          driverImageUrl,
          shiftStart,
          shiftEnd
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Profil berhasil diperbarui!', 'success');
        setProfile(data);
        setIsGoogleConnected(data.isGoogleConnected || false);
      } else {
        showToast(data.error || 'Gagal memperbarui profil', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal memperbarui profil', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleGoogleConnect = () => {
    signIn('google', { callbackUrl: '/driver' });
  };

  const handleGoogleDisconnect = async () => {
    if (!window.confirm("Apakah Anda yakin ingin memutuskan hubungan akun Google?")) {
      return;
    }
    setDisconnecting(true);
    try {
      const res = await fetch('/api/user/profile/google', {
        method: 'DELETE',
      });
      if (res.ok) {
        setIsGoogleConnected(false);
        showToast('Akun Google berhasil diputuskan', 'success');
      } else {
        showToast('Gagal memutuskan akun Google', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal memutuskan akun Google', 'error');
    } finally {
      setDisconnecting(false);
    }
  };

  const activeDeliveriesSorted = useMemo(() => {
    const uncompleted = orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
    
    const statusWeight: Record<string, number> = {
      'ON_DELIVERY': 3,
      'PICKED_UP': 2,
      'ASSIGNED': 1
    };

    return [...uncompleted].sort((a, b) => {
      const weightA = statusWeight[a.status] || 0;
      const weightB = statusWeight[b.status] || 0;
      
      if (weightB !== weightA) {
        return weightB - weightA;
      }
      
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [orders]);

  const mapStops = useMemo(() => {
    return activeDeliveriesSorted.map((order, index) => {
      let destLat = -7.78125167;
      let destLng = 113.212266;
      if (order.address) {
        const coordMatch = order.address.match(/\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)/);
        if (coordMatch) {
          destLat = parseFloat(coordMatch[1]);
          destLng = parseFloat(coordMatch[2]);
        }
      }
      return {
        id: order.id,
        customerName: order.customerName,
        address: order.address || '',
        lat: destLat,
        lng: destLng,
        status: order.status,
        sequence: index + 1
      };
    });
  }, [activeDeliveriesSorted]);

  const completedDeliveries = useMemo(() => orders.filter(o => o.status === 'DELIVERED' || o.status === 'COMPLETED'), [orders]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#B48A5E] mb-4" />
        <p className="text-sm font-medium text-muted-foreground">Memuat dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-28">
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

      {/* RENDER ACTIVE TAB */}
      <AnimatePresence mode="wait">
        {activeTab === 'deliveries' && (
          <motion.div
            key="tab-deliveries"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
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

            {/* New Order Sound Alert Banner */}
            <AnimatePresence>
              {assignedOrders.length > 0 && !soundDismissed && (
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl p-4 shadow-lg shadow-amber-500/25 relative overflow-hidden"
                >
                  {/* Animated pulse bg */}
                  <div className="absolute inset-0 bg-white/10 animate-pulse rounded-3xl" />
                  
                  <div className="relative flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 backdrop-blur-sm">
                      <BellRing className="w-6 h-6 text-white animate-bounce" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white text-sm">Pesanan Baru Masuk!</h4>
                      <p className="text-[11px] text-white/80 font-medium">
                        {assignedOrders.length} pesanan menunggu diambil
                      </p>
                    </div>
                    <button
                      onClick={dismissSound}
                      className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors shrink-0 backdrop-blur-sm"
                      title="Matikan suara"
                    >
                      <VolumeX className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Unified Map at the top of deliveries tab */}
            {isOnline && activeDeliveriesSorted.length > 0 && (
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-border/40 space-y-3">
                <h3 className="font-bold text-gray-950 text-sm flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-[#B48A5E]" />
                  Peta Navigasi Terpadu
                </h3>
                <DriverNavigationMap
                  driverLat={driverLat}
                  driverLng={driverLng}
                  stops={mapStops}
                />
              </div>
            )}

            {/* Active Orders List */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-950 flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#B48A5E]" />
                Daftar Antaran ({activeDeliveriesSorted.length})
              </h3>

              {!isOnline && activeDeliveriesSorted.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
                  <Power className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-500">Aktifkan shift untuk menerima pesanan</p>
                </div>
              ) : activeDeliveriesSorted.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
                  <Check className="w-8 h-8 text-emerald-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-500">Tidak ada antaran aktif</p>
                </div>
              ) : (
                activeDeliveriesSorted.map((order, index) => {
                  const btnConfig = getStatusButtonConfig(order.status);
                  const Icon = btnConfig?.icon || Check;

                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`bg-white rounded-3xl border ${order.status === 'ON_DELIVERY' ? 'border-[#B48A5E] shadow-md' : 'border-border/40 shadow-sm'} overflow-hidden`}
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
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200 overflow-hidden shadow-sm">
                              {order.user?.image ? (
                                <img src={order.user.image} alt={order.customerName} className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-extrabold text-[#B48A5E] uppercase tracking-wider">
                                  Order #{order.id.slice(-4).toUpperCase()}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-red-100 border border-red-200 text-[9px] font-extrabold text-red-750 uppercase">
                                  Stop {index + 1}
                                </span>
                                {order.paymentMethod === 'COD' ? (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-55 border border-rose-200 text-[9px] font-extrabold text-rose-700 uppercase">
                                    COD
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[9px] font-extrabold text-emerald-700 uppercase">
                                    {order.paymentMethod}
                                  </span>
                                )}
                              </div>
                              <h4 className="font-bold text-gray-900 text-sm">{order.customerName}</h4>
                              <p className="text-xs text-gray-500">{order.items.length} item • {formatRupiah(order.total)}</p>
                            </div>
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
                              title="Kirim WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3 mb-4">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                          <p className="text-xs font-medium text-gray-700 leading-relaxed">
                            {order.address?.split('(')[0]?.trim() || order.address || 'Alamat tidak tersedia'}
                          </p>
                        </div>

                        {btnConfig && (
                          <button
                            onClick={() => handleStartAdvanceStatus(order)}
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
          </motion.div>
        )}

        {/* Tab Riwayat */}
        {activeTab === 'history' && (
          <motion.div
            key="tab-history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <h3 className="font-bold text-gray-950 flex items-center gap-2">
              <History className="w-4 h-4 text-[#B48A5E]" />
              Riwayat Pengantaran ({completedDeliveries.length})
            </h3>

            {completedDeliveries.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
                <History className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500">Belum ada riwayat pengantaran</p>
              </div>
            ) : (
              completedDeliveries.map((order) => {
                const dateObj = new Date(order.createdAt);
                const formattedDate = dateObj.toLocaleDateString('id-ID', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div key={order.id} className="bg-white rounded-3xl border border-border/40 p-5 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200 overflow-hidden shadow-sm">
                          {order.user?.image ? (
                            <img src={order.user.image} alt={order.customerName} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">
                              Order #{order.id.slice(-4).toUpperCase()}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-[9px] font-extrabold text-emerald-700 uppercase">
                              Selesai
                            </span>
                          </div>
                          <h4 className="font-bold text-gray-950 text-sm mt-0.5">{order.customerName}</h4>
                          <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium mt-0.5">
                            <Clock className="w-3 h-3" /> {formattedDate}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-[#B48A5E] bg-[#B48A5E]/5 px-2.5 py-1 rounded-lg">
                          {formatRupiah(order.total)}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Rincian Item</p>
                      <div className="space-y-1">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex justify-between text-xs font-medium text-gray-700">
                            <span>{item.product.name}</span>
                            <span className="text-gray-400">x{item.qty}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 bg-gray-50 rounded-xl p-3 text-xs text-gray-600">
                      <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <span>{order.address?.split('(')[0]?.trim() || order.address || 'Alamat tidak tersedia'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </motion.div>
        )}

        {/* Tab Edit Profil */}
        {activeTab === 'profile' && (
          <motion.div
            key="tab-profile"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <form onSubmit={handleProfileSave} className="space-y-6">
              {/* Profile Card / Photo Upload */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-border/40 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] translate-x-4 -translate-y-4">
                  <User className="w-32 h-32 text-[#B48A5E]" />
                </div>
                
                <div className="relative inline-block mx-auto mb-4">
                  <div className="w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden bg-gray-100 flex items-center justify-center">
                    {driverImageUrl ? (
                      <img src={driverImageUrl} alt="Foto Profil" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-gray-400" />
                    )}
                  </div>
                  
                  {/* Floating Camera Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-[#B48A5E] hover:bg-[#96714C] text-white rounded-full flex items-center justify-center shadow-lg border border-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </div>

                <h4 className="font-bold text-gray-900">{name || 'Nama Kurir'}</h4>
                <p className="text-xs text-muted-foreground">{email}</p>
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100 text-[10px] font-bold text-emerald-700">
                  <ShieldCheck className="w-3.5 h-3.5" /> Mitra Aktif
                </div>
              </div>

              {/* Editable Fields Form */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-border/40 space-y-4">
                <h4 className="font-bold text-gray-900 border-b border-gray-100 pb-3 text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-[#B48A5E]" /> Detail Profil Kurir
                </h4>
                
                {/* Nama Lengkap */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 block pl-1">Nama Lengkap *</label>
                  <input
                    type="text" required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Nama Lengkap Anda"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/30 text-sm focus:ring-2 focus:ring-[#B48A5E]/20 focus:border-[#B48A5E] outline-none text-gray-800 font-medium"
                  />
                </div>

                {/* Nomor WhatsApp */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 block pl-1">Nomor WhatsApp *</label>
                  <input
                    type="tel" required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Contoh: 0812XXXXXXXX"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/30 text-sm focus:ring-2 focus:ring-[#B48A5E]/20 focus:border-[#B48A5E] outline-none text-gray-800 font-medium"
                  />
                </div>

                {/* Email (Read Only to prevent auth breakage) */}
                <div className="space-y-1.5 opacity-70">
                  <label className="text-xs font-semibold text-gray-600 block pl-1 flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Email (Akun Link Google)
                  </label>
                  <input
                    type="email" disabled
                    value={email}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 cursor-not-allowed text-sm text-gray-500 font-medium"
                  />
                </div>

                {/* Vehicle & Plate details */}
                <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 block pl-1 flex items-center gap-1">
                      <Bike className="w-3 h-3 text-[#B48A5E]" /> Jenis Kendaraan
                    </label>
                    <input
                      type="text"
                      value={vehicleType}
                      onChange={e => setVehicleType(e.target.value)}
                      placeholder="Honda Vario"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/30 text-sm focus:ring-2 focus:ring-[#B48A5E]/20 focus:border-[#B48A5E] outline-none text-gray-800 font-medium"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 block pl-1 flex items-center gap-1">
                      <Hash className="w-3 h-3 text-[#B48A5E]" /> Plat Nomor
                    </label>
                    <input
                      type="text"
                      value={plateNumber}
                      onChange={e => setPlateNumber(e.target.value)}
                      placeholder="B 1234 XYZ"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/30 text-sm focus:ring-2 focus:ring-[#B48A5E]/20 focus:border-[#B48A5E] outline-none text-gray-800 font-medium font-mono"
                    />
                  </div>
                </div>

                {/* Shift Hours */}
                <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 block pl-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#B48A5E]" /> Mulai Shift
                    </label>
                    <input
                      type="time"
                      value={shiftStart}
                      onChange={e => setShiftStart(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/30 text-sm focus:ring-2 focus:ring-[#B48A5E]/20 focus:border-[#B48A5E] outline-none text-gray-800 font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600 block pl-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#B48A5E]" /> Selesai Shift
                    </label>
                    <input
                      type="time"
                      value={shiftEnd}
                      onChange={e => setShiftEnd(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/30 text-sm focus:ring-2 focus:ring-[#B48A5E]/20 focus:border-[#B48A5E] outline-none text-gray-800 font-medium"
                    />
                  </div>
                </div>

                {/* Google Connection Section */}
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <label className="text-xs font-semibold text-gray-600 block pl-1">Akun Terhubung</label>
                  
                  <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-gray-800">Google</h5>
                        <p className="text-[10px] text-gray-500 font-medium">
                          {isGoogleConnected ? 'Terhubung' : 'Belum Terhubung'}
                        </p>
                      </div>
                    </div>

                    {isGoogleConnected ? (
                      <button
                        type="button"
                        onClick={handleGoogleDisconnect}
                        disabled={disconnecting}
                        className="px-3.5 py-1.5 border border-red-200 text-red-500 rounded-xl text-[11px] font-bold hover:bg-red-50 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {disconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Putuskan'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGoogleConnect}
                        className="px-3.5 py-1.5 bg-[#B48A5E] hover:bg-[#96714C] text-white rounded-xl text-[11px] font-bold shadow-sm hover:shadow active:scale-95 transition-all"
                      >
                        Hubungkan
                      </button>
                    )}
                  </div>
                </div>

                {/* Save Button */}
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full py-4 bg-[#B48A5E] hover:bg-[#96714C] text-white rounded-2xl font-bold text-sm shadow-md shadow-[#B48A5E]/15 flex items-center justify-center gap-2 mt-6 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {savingProfile ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
                  ) : (
                    <><Save className="w-4 h-4" /> Simpan Perubahan</>
                  )}
                </button>

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: '/login/driver' })}
                  className="w-full py-4 border border-red-200 text-red-600 rounded-2xl font-bold text-sm hover:bg-red-50 flex items-center justify-center gap-2 mt-4 active:scale-[0.98] transition-all"
                >
                  <LogOut className="w-4 h-4" /> Keluar dari Aplikasi
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border/40 py-2.5 z-40 shadow-lg max-w-md mx-auto px-6 flex justify-around items-center rounded-t-3xl">
        <button
          onClick={() => setActiveTab('deliveries')}
          className={`flex flex-col items-center gap-1 transition-all pb-1 ${activeTab === 'deliveries' ? 'text-[#B48A5E] font-bold scale-105' : 'text-gray-400'}`}
        >
          <Truck className="w-5 h-5 animate-pulse" />
          <span className="text-[10px]">Antaran</span>
        </button>
        
        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 transition-all pb-1 ${activeTab === 'history' ? 'text-[#B48A5E] font-bold scale-105' : 'text-gray-400'}`}
        >
          <History className="w-5 h-5" />
          <span className="text-[10px]">Riwayat</span>
        </button>
        
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 transition-all pb-1 ${activeTab === 'profile' ? 'text-[#B48A5E] font-bold scale-105' : 'text-gray-400'}`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px]">Profil</span>
        </button>
      </div>

      {/* PIN Verification Modal for COD Orders */}
      <AnimatePresence>
        {showPinModal && pinOrderId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden p-6 border border-gray-100"
            >
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-amber-50 border border-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-500">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-gray-950">Verifikasi PIN COD</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Silakan masukkan 4-digit PIN yang tertera pada layar pelacakan konsumen untuk menyelesaikan pesanan ini.
                  </p>
                </div>

                {pinError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-650 font-semibold">
                    {pinError}
                  </div>
                )}

                <div className="py-2">
                  <input
                    type="text"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={4}
                    value={enteredPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setEnteredPin(val);
                    }}
                    placeholder="0 0 0 0"
                    className="w-48 mx-auto tracking-[1.5em] text-center font-mono font-black text-2xl px-3 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-[#B48A5E]/15 focus:border-[#B48A5E] outline-none text-gray-800"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPinModal(false);
                      setPinOrderId(null);
                    }}
                    disabled={verifyingPin}
                    className="flex-1 py-3 px-4 border border-gray-200 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => advanceOrderStatus(pinOrderId, 'ON_DELIVERY', enteredPin)}
                    disabled={verifyingPin || enteredPin.length !== 4}
                    className="flex-1 py-3 px-4 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {verifyingPin ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Verifikasi
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Crop Modal */}
      <ImageCropModal
        isOpen={showCropModal}
        imageUrl={tempImageUrl}
        onClose={() => {
          setShowCropModal(false);
          setTempImageUrl('');
        }}
        onCropComplete={handleCropComplete}
        aspectRatio={1}
      />
    </div>
  );
}
