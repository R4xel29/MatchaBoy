'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/Toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import {
  ArrowLeft,
  User,
  Package,
  MapPin,
  Settings,
  LogOut,
  ChevronRight,
  Clock,
  Heart,
  Bell,
  Coffee,
  Plus,
  Home,
  Briefcase,
  Shield,
  Smartphone,
  Loader2,
  Trash2,
  MapPinned,
  Gift,
  Share2,
  Copy,
  Check,
  QrCode,
  Ticket,
  Target,
  Award,
  Trophy,
  X,
  Coins,
  Cake,
  Mail,
  Search,
  Star,
  Map,
  LocateFixed,
  Fingerprint,
  AlertTriangle,
  Building2,
  ClipboardList
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import 'leaflet/dist/leaflet.css';
import { formatRupiah } from '@/lib/utils';
import { calculateDistance, calculateDeliveryFee, isWithinDeliveryRange } from '@/lib/delivery-utils';
import Image from 'next/image';
import { useCartStore } from '@/stores/cart-store';
import { RegisterPasskeyButton } from '@/components/auth/PasskeyButtons';
import { LoginBottomSheet } from '@/components/auth/LoginBottomSheet';

// Data shapes
type OrderShape = {
  id: string;
  date: string;
  items: string;
  total: number;
  status: string;
};

type UserShape = {
  name: string;
  email: string;
  phone: string;
  points: number;
  totalOrders: number;
  memberSince: string;
  referralCode: string;
  gender: string;
  birthDate: string;
  isGoogleConnected: boolean;
  isGuest?: boolean;
};

type VoucherShape = {
  id: string;
  code: string;
  type: string;
  description: string;
  isUsed: boolean;
  expiresAt: string | null;
};

type MilestoneInfo = {
  milestone1: { target: number; reward: string; enabled: boolean };
  milestone2: { target: number; reward: string; enabled: boolean };
  milestone3: { target: number; reward: string; enabled: boolean };
};

type SectionType = 'menu' | 'orders' | 'favorites' | 'addresses' | 'notifications' | 'settings' | 'loyalty' | 'vouchers';

export default function ProfileClient({
  user: initialUser,
  orders,
  vouchers = [],
  milestones = null,
  initialUnreadCount = 0,
}: {
  user: UserShape;
  orders: OrderShape[];
  vouchers?: VoucherShape[];
  milestones?: MilestoneInfo | null;
  initialUnreadCount?: number;
}) {
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get('section') as SectionType;
  const [activeSection, setActiveSection] = useState<SectionType>(sectionParam || 'menu');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [user, setUser] = useState(initialUser);
  const [origin, setOrigin] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isLoginSheetOpen, setIsLoginSheetOpen] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (sectionParam && ['menu', 'orders', 'favorites', 'addresses', 'notifications', 'settings', 'loyalty', 'vouchers'].includes(sectionParam)) {
      setActiveSection(sectionParam);
      
      // If it's loyalty and there's a tab, we might want to scroll
      const tab = searchParams.get('tab');
      if (sectionParam === 'loyalty' && tab === 'vouchers') {
        setActiveSection('vouchers');
      }
    }
  }, [sectionParam, searchParams]);

  // Notifications State
  const [notifs, setNotifs] = useState<any[]>([]);
  const [notifsLoading, setNotifsLoading] = useState(true);

  const fetchNotifs = async () => {
    setNotifsLoading(true);
    try {
      const res = await fetch('/api/user/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifs(data.notifications || []);
      }
    } catch (err) { console.error(err); }
    finally { setNotifsLoading(false); }
  };

  useEffect(() => { fetchNotifs(); }, []);

  // Calculate Badge Counts
  const activeOrdersCount = orders.filter(o => 
    !['completed', 'selesai', 'cancelled', 'dibatalkan', 'delivered'].includes(o.status.toLowerCase())
  ).length;

  const unreadCount = !notifsLoading ? notifs.filter(n => !n.isRead).length : initialUnreadCount;

  const menuItems = [
    { icon: Coins, label: 'Poin Saya', id: 'loyalty', badge: null },
    { icon: Ticket, label: 'Voucher Saya', id: 'vouchers', badge: vouchers.filter(v => !v.isUsed).length > 0 ? vouchers.filter(v => !v.isUsed).length.toString() : null },
    { icon: Package, label: 'Pesanan Saya', id: 'orders', badge: activeOrdersCount > 0 ? activeOrdersCount.toString() : null },
    { icon: Heart, label: 'Favorit', id: 'favorites', badge: null },
    { icon: MapPin, label: 'Alamat Tersimpan', id: 'addresses', badge: null },
    { icon: Bell, label: 'Notifikasi', id: 'notifications', badge: unreadCount > 0 ? unreadCount.toString() : null },
    { icon: Settings, label: 'Pengaturan', id: 'settings', badge: null },
  ];

  const handleBack = () => {
    if (activeSection !== 'menu') {
      setActiveSection('menu');
    } else {
      router.push('/');
    }
  };

  const getHeaderTitle = () => {
    switch (activeSection) {
      case 'orders': return 'Riwayat Pesanan';
      case 'favorites': return 'Favorit Saya';
      case 'addresses': return 'Alamat Tersimpan';
      case 'notifications': return 'Notifikasi';
      case 'settings': return 'Pengaturan';
      case 'loyalty': return 'Poin Saya';
      case 'vouchers': return 'Voucher Saya';
      default: return 'Profile';
    }
  };

  return (
    <div className="min-h-dvh bg-[#FDFBF7] pb-safe font-sans">
      {/* Header with Background Pattern */}
      <header className="relative pt-safe bg-gradient-to-b from-[#F5F1E9] via-[#FAF8F5] to-[#FDFBF7] overflow-hidden min-h-[160px]">
        {/* Decorative Patterns (Heart shapes or similar) */}
        <div className="absolute top-0 right-0 p-4 opacity-10">
           <Heart className="w-24 h-24 rotate-12 text-[#B48A5E]" />
        </div>
        <div className="absolute -top-10 -left-10 opacity-5">
           <div className="w-40 h-40 rounded-full border-[20px] border-[#1E3F20]" />
        </div>

        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={handleBack}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/90 border border-gray-150 shadow-sm hover:bg-[#FFFBF7] transition-all active:scale-95 touch-target"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            
            {activeSection === 'menu' && (
              <button 
                onClick={() => user.isGuest ? setIsLoginSheetOpen(true) : setIsEditingProfile(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/90 border border-gray-150 backdrop-blur-sm rounded-full shadow-sm text-xs font-bold text-[#B48A5E] hover:bg-[#FFFBF7] transition-all active:scale-95"
              >
                <span>{user.isGuest ? 'Masuk' : 'Edit Profil'}</span>
                {user.isGuest ? <ChevronRight className="w-3.5 h-3.5" /> : <Settings className="w-3.5 h-3.5" />}
              </button>
            )}
            
            {activeSection !== 'menu' && (
              <motion.h1 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="font-serif text-xl font-bold tracking-wide text-gray-800"
              >
                {getHeaderTitle()}
              </motion.h1>
            )}
          </div>
        </div>

        {/* Floating Profile Card */}
        <AnimatePresence mode="popLayout">
          {activeSection === 'menu' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="px-4 pb-4 max-w-4xl mx-auto relative z-20"
            >
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-5 border border-[#D4A574]/20 shadow-[0_12px_40px_rgba(180,138,94,0.08)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
                {/* Left: User Info */}
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 shrink-0">
                    <div className="absolute inset-0 rounded-full border-2 border-[#D4A574] p-0.5 shadow-sm bg-gradient-to-br from-[#FFFBF7] to-[#FFF6EB]">
                      <div className="w-full h-full rounded-full bg-[#1E3F20] flex items-center justify-center overflow-hidden shadow-inner">
                        <User className="w-8 h-8 text-[#D4A574]" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-none">Hai, Member Setia</p>
                    <h2 className="text-lg font-black text-gray-900 leading-tight truncate max-w-[200px] font-serif">{user.name}</h2>
                  </div>
                </div>

                {/* Right: Metrics Grid */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Level Badge */}
                  <div className="flex-1 sm:flex-initial min-w-[100px] bg-[#FFFBF7] border border-[#D4A574]/25 shadow-sm rounded-2xl px-4 py-2.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#1E3F20] flex items-center justify-center shrink-0 shadow-sm">
                      <Heart className="w-4 h-4 text-[#D4A574] fill-[#D4A574]/20" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider leading-none">Level</p>
                      <p className="text-xs font-black text-gray-800 leading-none">Silver (0%)</p>
                    </div>
                  </div>

                  {/* Points Badge */}
                  <div className="flex-1 sm:flex-initial min-w-[115px] bg-[#FFFBF7] border border-[#D4A574]/25 shadow-sm rounded-2xl px-4 py-2.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#B48A5E] flex items-center justify-center shrink-0 shadow-sm">
                      <Coins className="w-4 h-4 text-white" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[9px] text-[#B48A5E]/80 font-bold uppercase tracking-wider leading-none">Arus Poin</p>
                      <p className="text-xs font-black text-gray-850 leading-none">
                        {user.isGuest ? '-' : user.points} <span className="text-[8px] text-gray-400 font-bold">pts</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <AnimatePresence mode="wait">
          {/* Main Menu */}
          {activeSection === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white/80 backdrop-blur-md rounded-[32px] border border-[#D4A574]/15 shadow-sm overflow-hidden p-3 space-y-1">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      router.push(`/profile?section=${item.id}`);
                    }}
                    className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-[#B48A5E]/5 rounded-2xl transition-all active:scale-[0.99] group"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-[#FFFBF7] flex items-center justify-center border border-[#D4A574]/20 group-hover:bg-gradient-to-br group-hover:from-[#B48A5E] group-hover:to-[#946F48] group-hover:text-white transition-all text-[#B48A5E] shadow-sm shrink-0">
                      <item.icon className="w-5 h-5 transition-colors" />
                    </div>
                    <span className="flex-1 text-[15px] font-bold text-gray-800 text-left group-hover:text-[#946F48] transition-colors">
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#B48A5E]/10 text-[#B48A5E] text-xs font-black">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#B48A5E] group-hover:translate-x-1 transition-all shrink-0" />
                  </button>
                ))}
              </div>

              {/* Keamanan Biometrik (Main Profile) */}
              {!user.isGuest && (
                <div className="bg-white/80 backdrop-blur-md rounded-[32px] border border-[#D4A574]/15 shadow-sm overflow-hidden p-5">
                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="w-11 h-11 bg-[#B48A5E]/5 rounded-2xl shadow-sm flex items-center justify-center border border-[#B48A5E]/15 text-[#B48A5E]">
                      <Fingerprint className="w-5.5 h-5.5" />
                    </div>
                    <div>
                      <h4 className="text-[15px] font-black text-gray-800">Login Sidik Jari</h4>
                      <p className="text-xs text-gray-500 font-medium">Aktifkan untuk keamanan tambahan</p>
                    </div>
                  </div>
                  <RegisterPasskeyButton />
                </div>
              )}

              {/* Logout */}
              {!user.isGuest && (
                <button 
                  onClick={async () => {
                     useCartStore.getState().clearCart();
                     await signOut({ redirect: false });
                     router.push('/');
                     router.refresh();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-red-200 bg-red-50/20 text-[15px] font-black text-red-500 hover:bg-red-50 hover:border-red-300 transition-all active:scale-[0.98] shadow-sm">
                  <LogOut className="w-5 h-5" />
                  Keluar
                </button>
              )}
            </motion.div>
          )}

          {/* Render Sections */}
          {activeSection === 'loyalty' && <LoyaltySection user={user} milestones={milestones} />}
          {activeSection === 'vouchers' && <VouchersSection vouchers={vouchers} />}
          {activeSection === 'orders' && <OrdersSection orders={orders} router={router} />}
          {activeSection === 'favorites' && <FavoritesSection />}
          {activeSection === 'addresses' && <AddressesSection user={user} />}
          {activeSection === 'notifications' && (
            <NotificationsSection 
              notifs={notifs} 
              loading={notifsLoading} 
              setNotifs={setNotifs} 
              refresh={fetchNotifs}
            />
          )}
          {activeSection === 'settings' && <SettingsSection user={user} onUpdate={(u) => setUser({...user, ...u})} />}

        </AnimatePresence>
      </div>

      <LoginBottomSheet isOpen={isLoginSheetOpen} onClose={() => setIsLoginSheetOpen(false)} />

      {/* Edit Profile Overlay */}
      <AnimatePresence>
        {isEditingProfile && (
          <EditProfileOverlay 
            user={user} 
            onClose={() => setIsEditingProfile(false)} 
            onUpdate={(u) => {
              setUser({...user, ...u});
              setIsEditingProfile(false);
            }} 
          />
        )}
      </AnimatePresence>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

// Sub-components

function EditProfileOverlay({ user, onClose, onUpdate }: { user: UserShape, onClose: () => void, onUpdate: (user: Partial<UserShape>) => void }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone);
  const [gender, setGender] = useState(user.gender || 'SECRET');
  const [birthDate, setBirthDate] = useState(user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : '');
  const [saving, setSaving] = useState(false);
  const [showGoogleConfirm, setShowGoogleConfirm] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletePending, setIsDeletePending] = useState(false);
  const [deleteCode, setDeleteCode] = useState('');
  const [requestingDelete, setRequestingDelete] = useState(false);
  const [deletionPollingInterval, setDeletionPollingInterval] = useState<any>(null);

  // Sync state if user prop changes (e.g. after connecting Google)
  useEffect(() => {
    setName(user.name);
    setEmail(user.email || '');
    setPhone(user.phone);
    setGender(user.gender || 'SECRET');
    setBirthDate(user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : '');
  }, [user]);

  useEffect(() => {
    return () => {
      if (deletionPollingInterval) {
        clearInterval(deletionPollingInterval);
      }
    };
  }, [deletionPollingInterval]);

  const handleRequestDelete = async () => {
    setRequestingDelete(true);
    try {
      const res = await fetch('/api/user/delete-account/request', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDeleteCode(data.code);
        setIsDeletePending(true);
        setShowDeleteConfirm(false);
        
        // Direct to WhatsApp immediately with prefilled template message
        const botNumber = process.env.NEXT_PUBLIC_WA_BOT_NUMBER || "6289525672990";
        const waUrl = `https://wa.me/${botNumber}?text=${encodeURIComponent(`HAPUS-${data.code}`)}`;
        window.open(waUrl, '_blank');
        
        // Start polling for deletion status
        const interval = setInterval(async () => {
          try {
            const statusRes = await fetch('/api/user/delete-account/status');
            const statusData = await statusRes.json();
            if (statusRes.ok && statusData.deleted) {
              clearInterval(interval);
              setIsDeletePending(false);
              
              // Clear local state and log out
              useCartStore.getState().clearCart();
              await signOut({ redirect: false });
              router.push('/');
              router.refresh();
            }
          } catch (pollErr) {
            console.error("Error polling delete status:", pollErr);
          }
        }, 3000);
        setDeletionPollingInterval(interval);
      } else {
        showToast(data.error || "Gagal mengirim kode penghapusan akun.", 'error');
      }
    } catch (err) {
      console.error(err);
      showToast("Terjadi kesalahan jaringan.", 'error');
    } finally {
      setRequestingDelete(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, gender, birthDate })
      });
      if(res.ok) {
        onUpdate({ name, email, phone, gender, birthDate });
      }
    } catch(err) {
      console.error(err);
    } finally {
        setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-white flex flex-col pt-safe pb-safe"
    >
      {/* Full-screen Content Container */}
      <div className="flex-1 flex flex-col h-full bg-white relative">
        {/* Header */}
        <div className="px-4 py-4 flex items-center gap-4 bg-white sticky top-0 z-10">
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all active:scale-90"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-serif text-lg font-bold text-gray-900 flex-1">Edit Profil</h2>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide pb-32">
          {/* Name Field */}
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider font-bold text-gray-400">Nama</label>
            <input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3.5 bg-[#FFFBF5] border border-[#D4A574]/20 rounded-2xl focus:bg-white focus:border-[#B48A5E] focus:ring-2 focus:ring-[#B48A5E]/10 transition-all outline-none text-[15px] font-semibold text-gray-900 shadow-inner"
              placeholder="Masukkan nama lengkap"
            />
          </div>

          {/* Google Connection Section */}
          <div className="space-y-3">
            <label className="text-[11px] uppercase tracking-wider font-bold text-gray-400">Akun Terhubung</label>
            <div className="flex items-center justify-between p-4 bg-[#FFFBF5] rounded-2xl border border-[#D4A574]/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center border border-[#D4A574]/15">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 6.23l3.66 2.84c.87-2.6 3.3-4.53 12 4.53z" fill="#EA4335"/>
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Google</h4>
                  <p className="text-[11px] text-gray-500 font-medium">{user.isGoogleConnected ? 'Terhubung' : 'Belum terhubung'}</p>
                </div>
              </div>
              {user.isGoogleConnected ? (
                <button 
                  onClick={() => setShowGoogleConfirm(true)}
                  className="px-4 py-2 bg-white border border-red-100 text-red-500 rounded-xl text-[12px] font-bold hover:bg-red-55 transition-colors"
                >
                  Putuskan
                </button>
              ) : (
                <button 
                  onClick={() => signIn('google', { callbackUrl: '/profile' })}
                  className="px-4 py-2 bg-[#B48A5E] text-white rounded-xl text-[12px] font-bold shadow-md shadow-[#B48A5E]/10 hover:bg-[#946F48] transition-all active:scale-95"
                >
                  Hubungkan
                </button>
              )}
            </div>
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider font-bold text-gray-400">Email</label>
            <div className="relative group">
              <input 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 bg-[#FFFBF5] border border-[#D4A574]/20 rounded-2xl focus:bg-white focus:border-[#B48A5E] focus:ring-2 focus:ring-[#B48A5E]/10 transition-all outline-none text-[15px] font-semibold text-gray-900 shadow-inner"
                placeholder="alamat email"
              />
              <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-[#B48A5E]" />
            </div>
          </div>

          {/* Phone Field */}
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider font-bold text-gray-400">Nomor Handphone</label>
            <div className="flex gap-2">
              <div className="flex-1 relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pr-2 border-r border-gray-200/50">
                  <Smartphone className="w-4 h-4 text-gray-400" />
                </div>
                <input 
                  value={phone}
                  readOnly
                  className="w-full pl-14 pr-4 py-3.5 bg-[#FFFBF5] border border-[#D4A574]/15 rounded-2xl text-[15px] font-semibold text-gray-500 cursor-not-allowed shadow-inner"
                />
              </div>
              <button className="px-5 py-3 border border-[#B48A5E] text-[#B48A5E] rounded-2xl text-sm font-bold hover:bg-[#B48A5E]/5 transition-colors">
                Ganti
              </button>
            </div>
          </div>

          {/* PIN Link */}
          <button className="flex items-center gap-2 text-[#B48A5E] font-black text-[13px] hover:opacity-80 transition-opacity px-1">
            <Shield className="w-4 h-4" />
            Ganti PIN
          </button>

          {/* Gender Selector */}
          <div className="space-y-3">
            <label className="text-[11px] uppercase tracking-wider font-bold text-gray-400">Jenis Kelamin</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'WOMAN', label: 'Wanita' },
                { id: 'MAN', label: 'Pria' },
                { id: 'SECRET', label: 'Rahasia' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setGender(opt.id)}
                  className={`py-3.5 rounded-2xl text-sm font-bold transition-all ${
                    gender === opt.id 
                      ? 'bg-[#B48A5E] text-white shadow-lg shadow-[#B48A5E]/20' 
                      : 'bg-[#FFFBF5] text-gray-500 hover:bg-gray-100 border border-[#D4A574]/15'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Birthday Banner */}
          <div className="bg-[#FFFBF5] rounded-2xl p-4 border border-[#D4A574]/20 flex items-start gap-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-[#D4A574]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="p-2.5 bg-white rounded-xl shadow-sm relative z-10 border border-[#D4A574]/15">
               <Cake className="w-5 h-5 text-[#B48A5E]" />
            </div>
            <div className="flex-1 relative z-10">
               <h4 className="text-sm font-bold text-gray-900 leading-tight">Ulang Tahun Anda</h4>
               <p className="text-[11px] text-[#B48A5E] mt-1 font-semibold leading-relaxed">Masukkan tanggal lahir Anda untuk mendapatkan kejutan spesial di hari ulang tahun Anda!</p>
            </div>
            <button className="absolute top-3 right-3 p-1 text-gray-300 hover:text-gray-500 transition-colors z-20">
               <X className="w-4 h-4" />
            </button>
          </div>

          {/* Birth Date Field */}
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider font-bold text-gray-400">Tanggal Lahir</label>
            <input 
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-4 py-3.5 bg-[#FFFBF5] border border-[#D4A574]/20 rounded-2xl focus:bg-white focus:border-[#B48A5E] focus:ring-2 focus:ring-[#B48A5E]/10 transition-all outline-none text-[15px] font-semibold text-gray-900 shadow-inner"
            />
            <p className="text-[10px] text-gray-400 font-semibold px-1">Tahun lahir opsional</p>
          </div>

          {/* Action Hapus Akun */}
          <div className="pt-6 border-t border-red-100 mt-4">
            <button 
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-4 border border-red-100 hover:border-red-200 hover:bg-red-50/30 text-red-500 rounded-2xl text-[14px] font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5 text-red-500" />
              Hapus Akun Saya
            </button>
          </div>
        </div>

        {/* Footer - Fixed at Bottom */}
        <div className="p-6 bg-white border-t border-gray-50 fixed bottom-0 left-0 right-0 z-20">
          <div className="max-w-4xl mx-auto w-full">
            <button 
              disabled={saving}
              onClick={handleSave}
              className="w-full py-4.5 bg-[#B48A5E] text-white rounded-2xl text-[17px] font-bold shadow-xl shadow-[#B48A5E]/20 hover:bg-[#946F48] transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              {saving && <Loader2 className="w-5 h-5 animate-spin" />}
              Simpan Profil
            </button>
          </div>
        </div>
        {/* Custom Confirmation Modal for Google Disconnect */}
        <AnimatePresence>
          {showGoogleConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                transition={{ type: 'spring', duration: 0.4 }}
                className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-xl border border-gray-100"
              >
                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-500">
                  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                    <line x1="12" y1="2" x2="12" y2="12" />
                  </svg>
                </div>

                <h3 className="font-serif text-lg font-bold text-gray-900 mb-2">Putuskan Google?</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-6">
                  Apakah Anda yakin ingin memutuskan hubungan akun Google? Anda tidak akan bisa masuk menggunakan Google ini lagi kecuali menghubungkannya kembali.
                </p>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowGoogleConfirm(false)}
                    disabled={disconnecting}
                    className="flex-1 py-3 bg-gray-50 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setDisconnecting(true);
                      try {
                        const res = await fetch('/api/user/profile/google', { method: 'DELETE' });
                        if(res.ok) {
                          window.location.reload();
                        } else {
                          setShowGoogleConfirm(false);
                        }
                      } catch (err) {
                        console.error(err);
                        setShowGoogleConfirm(false);
                      } finally {
                        setDisconnecting(false);
                      }
                    }}
                    disabled={disconnecting}
                    className="flex-1 py-3 bg-red-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-200/50 hover:bg-red-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {disconnecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Ya, Putuskan'
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Confirmation Modal for Permanent Account Deletion */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                transition={{ type: 'spring', duration: 0.4 }}
                className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-xl border border-gray-100"
              >
                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-500">
                  <Trash2 className="w-8 h-8" />
                </div>

                <h3 className="font-serif text-lg font-bold text-gray-900 mb-2">Hapus Akun Permanen?</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-6">
                  Apakah Anda yakin ingin menghapus akun Anda secara permanen? Seluruh poin, voucher belanja, dan riwayat pesanan Anda akan terhapus selamanya dan tidak dapat dikembalikan.
                </p>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={requestingDelete}
                    className="flex-1 py-3 bg-gray-50 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestDelete}
                    disabled={requestingDelete}
                    className="flex-1 py-3 bg-red-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-200/50 hover:bg-red-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {requestingDelete ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Kirim Kode WA'
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Confirmation Modal for Delete Code Verification */}
        <AnimatePresence>
          {isDeletePending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                transition={{ type: 'spring', duration: 0.4 }}
                className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-xl border border-gray-100"
              >
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#B48A5E] animate-pulse">
                  <Smartphone className="w-8 h-8" />
                </div>

                <h3 className="font-serif text-lg font-bold text-gray-900 mb-2">Konfirmasi WhatsApp</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  Silakan klik tombol di bawah untuk diarahkan langsung ke WhatsApp dan mengirim pesan konfirmasi penghapusan akun:
                </p>

                <a
                  href={`https://wa.me/${process.env.NEXT_PUBLIC_WA_BOT_NUMBER || "6289525672990"}?text=${encodeURIComponent(`HAPUS-${deleteCode}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 bg-[#25D366] text-white rounded-2xl font-bold shadow-lg shadow-[#25D366]/20 hover:bg-[#20bd5a] active:scale-[0.98] transition-all flex justify-center items-center gap-2 text-[15px] mb-4"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Buka WhatsApp & Kirim
                </a>

                <div className="bg-[#FFFBF5] rounded-2xl p-3 border border-[#D4A574]/25 mb-6 flex flex-col items-center justify-center gap-1 hover:bg-[#B48A5E]/5 transition-all select-all">
                  <p className="text-[9px] text-[#B48A5E] font-bold uppercase tracking-wider">Format Pesan Manual</p>
                  <p className="text-base font-mono font-black text-[#946F48] tracking-wider">HAPUS-{deleteCode}</p>
                </div>

                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-400 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#B48A5E]" />
                    <span>Menunggu konfirmasi Anda di WhatsApp...</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeletePending(false);
                      if (deletionPollingInterval) {
                        clearInterval(deletionPollingInterval);
                      }
                    }}
                    className="w-full py-3 bg-gray-50 text-gray-500 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all active:scale-[0.98]"
                  >
                    Batal
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function OrdersSection({ orders, router }: { orders: OrderShape[], router: any }) {
  const getStatusBadgeClass = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('complete') || s.includes('selesai')) {
      return 'bg-emerald-50 border-emerald-150 text-emerald-700';
    }
    if (s.includes('cancel') || s.includes('batal')) {
      return 'bg-red-50 border-red-150 text-red-700';
    }
    if (s.includes('payment') || s.includes('bayar')) {
      return 'bg-amber-50 border-amber-150 text-amber-700 animate-pulse';
    }
    if (s.includes('prepare') || s.includes('masak') || s.includes('proses')) {
      return 'bg-blue-50 border-blue-150 text-blue-700';
    }
    if (s.includes('deliver') || s.includes('kirim')) {
      return 'bg-indigo-50 border-indigo-150 text-indigo-700';
    }
    return 'bg-orange-50 border-orange-150 text-orange-700';
  };

  const getStatusLabel = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('complete') || s.includes('selesai')) return 'Selesai';
    if (s.includes('cancel') || s.includes('batal')) return 'Dibatalkan';
    if (s.includes('payment') || s.includes('bayar')) return 'Menunggu Pembayaran';
    if (s.includes('pending')) return 'Menunggu Konfirmasi';
    if (s.includes('prepare') || s.includes('proses')) return 'Sedang Disiapkan';
    if (s.includes('deliver') || s.includes('kirim')) return 'Dalam Pengiriman';
    return status;
  };

  return (
    <motion.section
      key="orders"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="space-y-3.5"
    >
      {orders.length === 0 ? (
        <div className="text-center py-16 px-6 bg-white rounded-3xl border border-[#D4A574]/15 shadow-sm">
          <div className="w-16 h-16 bg-[#FFFBF5] border border-[#D4A574]/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <Coffee className="w-8 h-8 text-[#B48A5E]" />
          </div>
          <h3 className="font-serif text-lg text-gray-800 mb-1 font-bold">Belum Ada Pesanan</h3>
          <p className="text-sm text-gray-500 mb-6 font-medium">Nikmati berbagai pilihan matcha terbaik kami.</p>
          <button 
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-[#B48A5E] text-white rounded-full text-sm font-black hover:bg-[#946F48] transition-all shadow-md shadow-[#B48A5E]/10"
          >
            Pesan Sekarang
          </button>
        </div>
      ) : (
        orders.map((order, i) => (
          <motion.button
            key={order.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => router.push(`/orders/${order.id}`)}
            className="w-full text-left p-5 rounded-3xl bg-white border border-[#D4A574]/15 shadow-sm hover:border-[#B48A5E]/30 hover:shadow-md transition-all active:scale-[0.98] group flex flex-col justify-between"
          >
            <div className="flex items-start justify-between mb-3 w-full">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-[#FFFBF5] border border-[#D4A574]/15 flex items-center justify-center">
                  <Package className="w-4.5 h-4.5 text-[#B48A5E]" />
                </div>
                <div>
                  <p className="font-mono text-xs font-black text-gray-900 leading-none">{order.id.slice(0,8).toUpperCase()}</p>
                  <p className="text-[10px] text-gray-400 mt-1 font-medium">{order.date}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider shadow-sm ${getStatusBadgeClass(order.status)}`}>
                {getStatusLabel(order.status)}
              </span>
            </div>
            <div className="pl-12 w-full">
              <p className="text-sm text-gray-600 line-clamp-1 mb-2.5 font-bold">{order.items}</p>
              <div className="flex items-center gap-x-2">
                <span className="text-[11px] text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full font-bold">Total</span>
                <p className="text-[16px] font-black text-[#B48A5E]">{formatRupiah(order.total)}</p>
              </div>
            </div>
          </motion.button>
        ))
      )}
    </motion.section>
  );
}

function FavoritesSection() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/user/favorites')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setFavorites(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (favId: string) => {
    setFavorites(prev => prev.filter(f => f.id !== favId));
    try {
      await fetch(`/api/user/favorites/${favId}`, { method: 'DELETE' });
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#B48A5E]" />
      </div>
    );
  }

  return (
    <motion.section
      key="favorites"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        {favorites.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm relative group cursor-pointer hover:border-[#B48A5E]/20 transition-colors"
          >
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(item.id);
              }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-red-50 flex items-center justify-center z-10 hover:bg-red-100 transition-colors"
            >
              <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            </button>
            <div className="aspect-square bg-[#FDFBF7] rounded-2xl mb-4 flex items-center justify-center relative overflow-hidden">
               {item.product?.image ? (
                 <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover rounded-2xl" />
               ) : (
                 <>
                   <div className="absolute inset-0 bg-gradient-to-tr from-[#B48A5E]/10 to-transparent opacity-50"></div>
                   <Coffee className="w-12 h-12 text-[#B48A5E]/40" />
                 </>
               )}
            </div>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{item.product?.badge || 'Menu'}</span>
            <h4 className="font-serif text-sm font-medium leading-tight mt-1 mb-2 line-clamp-2">{item.product?.name || 'Unknown'}</h4>
            <p className="text-sm font-bold text-[#B48A5E]">{formatRupiah(item.product?.price || 0)}</p>
          </motion.div>
        ))}
        {favorites.length === 0 && (
          <div className="col-span-2 text-center py-12 px-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <Heart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="font-serif text-lg text-gray-800 mb-1">Belum ada Favorit</h3>
            <p className="text-sm text-gray-500">Tambahkan pesanan favoritmu disini.</p>
          </div>
        )}
      </div>
    </motion.section>
  );
}

const getPlaceCategoryBadge = (className: string, typeName: string) => {
  const cls = className?.toLowerCase();
  const typ = typeName?.toLowerCase();

  if (cls === 'amenity') {
    if (['school', 'kindergarten', 'university', 'college'].includes(typ)) {
      return { label: 'Sekolah / Pendidikan', bg: 'bg-blue-50 text-blue-600 border-blue-100' };
    }
    if (['restaurant', 'cafe', 'fast_food', 'food_court', 'bar', 'pub'].includes(typ)) {
      return { label: 'Kuliner / Cafe', bg: 'bg-orange-50 text-orange-600 border-orange-100' };
    }
    if (['hospital', 'clinic', 'pharmacy', 'doctors', 'dentist'].includes(typ)) {
      return { label: 'Kesehatan / Medis', bg: 'bg-rose-50 text-rose-600 border-rose-100' };
    }
    if (['place_of_worship'].includes(typ)) {
      return { label: 'Tempat Ibadah', bg: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
    }
    if (['bank', 'atm'].includes(typ)) {
      return { label: 'Keuangan / Bank', bg: 'bg-amber-50 text-amber-600 border-amber-100' };
    }
  }
  if (cls === 'shop') {
    return { label: 'Toko / Perbelanjaan', bg: 'bg-purple-50 text-purple-600 border-purple-100' };
  }
  if (cls === 'tourism') {
    if (['hotel', 'guest_house', 'motel', 'hostel', 'apartment'].includes(typ)) {
      return { label: 'Penginapan / Hotel', bg: 'bg-indigo-50 text-indigo-600 border-indigo-100' };
    }
    return { label: 'Wisata / Rekreasi', bg: 'bg-teal-50 text-teal-600 border-teal-100' };
  }
  if (cls === 'leisure') {
    return { label: 'Olahraga / Hiburan', bg: 'bg-cyan-50 text-cyan-600 border-cyan-100' };
  }
  if (cls === 'office') {
    return { label: 'Kantor / Bisnis', bg: 'bg-sky-50 text-sky-600 border-sky-100' };
  }
  return null;
};

// Premium Saved Addresses Section with Optimized Background Preloaded Leaflet Map
function AddressesSection({ user }: { user: UserShape }) {
  const { showToast } = useToast();
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'LIST' | 'MAP' | 'DETAIL'>('LIST');
  const [mapCameFrom, setMapCameFrom] = useState<'LIST' | 'DETAIL'>('LIST');
  const [saving, setSaving] = useState(false);

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [recipient, setRecipient] = useState('');
  const [phone, setPhone] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // Map & Geocoding states
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapAddress, setMapAddress] = useState('');
  const [mapAddressTitle, setMapAddressTitle] = useState('');
  const [mapLat, setMapLat] = useState(-7.756928);
  const [mapLng, setMapLng] = useState(113.211502);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mapRef = useRef<any>(null);
  const storeMarkerRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const ignoreMoveEndRef = useRef(true);

  const [storeLat, setStoreLat] = useState(-7.756928);
  const [storeLng, setStoreLng] = useState(113.211502);
  const [maxDeliveryDistance, setMaxDeliveryDistance] = useState(10);
  const [deliveryFeePerKm, setDeliveryFeePerKm] = useState(2000);

  useEffect(() => {
    fetch('/api/user/locations')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAddresses(data); })
      .catch(() => {})
      .finally(() => setLoading(false));

    fetch('/api/admin/store-settings')
      .then(r => r.json())
      .then(d => {
        if (d.storeLat && d.storeLng) {
          setStoreLat(d.storeLat);
          setStoreLng(d.storeLng);
          if (d.maxDeliveryDistance !== undefined) {
            setMaxDeliveryDistance(d.maxDeliveryDistance);
          }
          if (d.deliveryFeePerKm !== undefined) {
            setDeliveryFeePerKm(d.deliveryFeePerKm);
          }
          setMapLat(d.storeLat);
          setMapLng(d.storeLng);
        }
      })
      .catch(() => {});
  }, []);

  // Update store marker when store location changes
  useEffect(() => {
    if (storeMarkerRef.current) {
      storeMarkerRef.current.setLatLng([storeLat, storeLng]);
    }
  }, [storeLat, storeLng]);

  // Fetch address display name from coordinates
  const triggerReverseGeocode = async (lat: number, lng: number) => {
    setReverseGeocoding(true);
    try {
      const res = await fetch(`/api/geocode?mode=reverse&lat=${lat}&lng=${lng}`);
      const data = await res.json();
      if (data.display_name) {
        const addr = data.address;
        const title = addr?.road
          ? `${addr.road}${addr.house_number ? ` No. ${addr.house_number}` : ''}`
          : data.display_name.split(',').slice(0, 2).join(', ');
        
        setMapAddressTitle(title);
        setMapAddress(data.display_name);
      } else {
        setMapAddressTitle(`Lokasi (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        setMapAddress(`Koordinat: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    } catch {
      setMapAddressTitle(`Lokasi (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      setMapAddress(`Koordinat: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } finally {
      setReverseGeocoding(false);
    }
  };

  // Leaflet map initialization - robust polling-based pattern
  useEffect(() => {
    if (step !== 'MAP') return;
    
    let mapInstance: any = null;
    let pollInterval: NodeJS.Timeout | null = null;
    let isInitialized = false;

    const initMap = (L: any) => {
      const container = mapContainerRef.current;
      if (!container) return false;
      if (mapRef.current) return true;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      const map = L.map(container, {
        center: [mapLat, mapLng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      mapInstance = map;
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      const storeIcon = L.divIcon({
        html: '<div class="relative flex items-center justify-center"><div class="absolute w-10 h-10 bg-[#D4A574]/20 rounded-full animate-pulse"></div><div class="w-7 h-7 bg-[#B48A5E] rounded-full border-2 border-white shadow-lg flex items-center justify-center z-10 text-white font-bold text-[10px]">🏪</div></div>',
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      storeMarkerRef.current = L.marker([storeLat, storeLng], { icon: storeIcon })
        .bindPopup('<b>Matchaboy Store</b>')
        .addTo(map);

      setTimeout(() => {
        map.invalidateSize();
        setTimeout(() => {
          ignoreMoveEndRef.current = false;
        }, 200);
      }, 300);

      triggerReverseGeocode(mapLat, mapLng);
      setMapLoaded(true);

      map.on('movestart', () => {
        if (ignoreMoveEndRef.current) return;
        setIsMapMoving(true);
        setMapAddress('');
        setMapAddressTitle('');
      });

      map.on('moveend', () => {
        if (ignoreMoveEndRef.current) {
          ignoreMoveEndRef.current = false;
          setIsMapMoving(false);
          return;
        }
        setIsMapMoving(false);
        const center = map.getCenter();
        setMapLat(center.lat);
        setMapLng(center.lng);
        triggerReverseGeocode(center.lat, center.lng);
      });

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
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setMapLoaded(false);
    };
  }, [step]);

  // Handle address text search (Forward Geocode)
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (value.length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(value)}&lat=${mapLat}&lng=${mapLng}`);
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
        setShowSearchResults(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  const handleSelectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    ignoreMoveEndRef.current = true;
    
    setMapLat(lat);
    setMapLng(lng);

    const addr = result.address;
    const title = addr?.road
      ? `${addr.road}${addr.suburb ? `, ${addr.suburb}` : ''}`
      : result.display_name.split(',').slice(0, 3).join(',');
    const detail = result.display_name;

    setMapAddressTitle(title);
    setMapAddress(detail);
    
    if (step === 'MAP') {
      setSearchQuery(title);
    } else {
      setSearchQuery('');
    }
    setSearchResults([]);
    setShowSearchResults(false);

    // Center map view on the selected coordinates immediately
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], 17, { duration: 1.5 });
    }

    setTimeout(() => {
      ignoreMoveEndRef.current = false;
    }, 1600);

    if (step !== 'MAP') {
      setMapCameFrom('LIST');
      setStep('MAP');
    }
  };

  // Detect GPS location
  const handleDetectGPS = () => {
    if (!('geolocation' in navigator)) {
      console.warn('Perangkat tidak mendukung fitur lokasi. Menggunakan lokasi default.');
      setMapLat(storeLat);
      setMapLng(storeLng);
      if (mapRef.current) {
        ignoreMoveEndRef.current = true;
        mapRef.current.setView([storeLat, storeLng], 16);
        setTimeout(() => {
          ignoreMoveEndRef.current = false;
        }, 300);
      }
      setMapCameFrom('LIST');
      setStep('MAP');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMapLat(lat);
        setMapLng(lng);
        if (mapRef.current) {
          ignoreMoveEndRef.current = true;
          mapRef.current.setView([lat, lng], 16);
          setTimeout(() => {
            ignoreMoveEndRef.current = false;
          }, 300);
        }
        setMapCameFrom('LIST');
        setStep('MAP');
      },
      (error) => {
        console.error("GPS detection failed, falling back to store coords:", error);
        setMapLat(storeLat);
        setMapLng(storeLng);
        if (mapRef.current) {
          ignoreMoveEndRef.current = true;
          mapRef.current.setView([storeLat, storeLng], 16);
          setTimeout(() => {
            ignoreMoveEndRef.current = false;
          }, 300);
        }
        setMapCameFrom('LIST');
        setStep('MAP');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // GPS target locate while inside map view
  const handleGPSInMap = () => {
    if (!('geolocation' in navigator)) return;
    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMapLat(lat);
        setMapLng(lng);
        triggerReverseGeocode(lat, lng);
        if (mapRef.current) {
          mapRef.current.flyTo([lat, lng], 17, { duration: 1.2 });
        }
        setIsDetecting(false);
      },
      () => {
        setIsDetecting(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleCreateNew = () => {
    setEditingId(null);
    setName('');
    setNotes('');
    
    // Auto fill with profile name & phone to save time (Great UX!)
    setRecipient(user.name || '');
    setPhone(user.phone || '');
    setIsDefault(addresses.length === 0);

    // Default map position
    setMapLat(storeLat);
    setMapLng(storeLng);
    setMapAddress('');
    setMapAddressTitle('');

    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);

    // Advance directly to map pin positioning screen
    setMapCameFrom('LIST');
    setStep('MAP');
  };

  const handleEditAddress = (addr: any) => {
    setEditingId(addr.id);
    setName(addr.name || '');
    setNotes(addr.notes || '');
    setRecipient(addr.recipient || '');
    setPhone(addr.phone || '');
    setIsDefault(addr.isDefault || false);

    setMapLat(addr.lat || storeLat);
    setMapLng(addr.lng || storeLng);
    setMapAddress(addr.address || '');

    // Estimate address short title
    const firstPart = addr.address.split(',')[0];
    setMapAddressTitle(addr.name || firstPart);

    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);

    // Go to Map Pin selection screen first so they can see/adjust the location
    setMapCameFrom('LIST');
    setStep('MAP');
  };

  const handleConfirmMapLocation = () => {
    setStep('DETAIL');
  };

  // Save changes to db
  const handleSaveAddress = async () => {
    if (!name.trim()) {
      showToast('Nama Alamat wajib diisi', 'error');
      return;
    }
    if (!recipient.trim()) {
      showToast('Penerima wajib diisi', 'error');
      return;
    }
    if (!phone.trim()) {
      showToast('Nomor Telepon wajib diisi', 'error');
      return;
    }

    setSaving(true);
    try {
      const isNew = !editingId;
      const url = isNew ? '/api/user/locations' : `/api/user/locations/${editingId}`;
      const method = isNew ? 'POST' : 'PUT';

      const payload = {
        name: name.trim(),
        address: mapAddress,
        notes: notes.trim(),
        recipient: recipient.trim(),
        phone: phone.trim(),
        isDefault,
        lat: mapLat,
        lng: mapLng
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const savedLoc = await res.json();
        if (isNew) {
          setAddresses(prev => [savedLoc, ...prev]);
        } else {
          setAddresses(prev => prev.map(a => a.id === editingId ? savedLoc : a));
        }

        // If this savedLoc became default, set others as not default
        if (isDefault) {
          setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === savedLoc.id })));
        }

        setStep('LIST');
        setEditingId(null);
      } else {
        const data = await res.json();
        showToast(data.error || 'Gagal menyimpan alamat', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete address
  const handleDeleteAddress = async () => {
    if (!editingId) return;
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Alamat',
      message: 'Apakah Anda yakin ingin menghapus alamat ini?',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setSaving(true);
        try {
          const res = await fetch(`/api/user/locations/${editingId}`, {
            method: 'DELETE'
          });

          if (res.ok) {
            const data = await res.json();
            setAddresses(prev => {
              const filtered = prev.filter(a => a.id !== editingId);
              if (data.newDefaultId) {
                return filtered.map(a => a.id === data.newDefaultId ? { ...a, isDefault: true } : a);
              }
              return filtered;
            });
            setStep('LIST');
            setEditingId(null);
            showToast('Alamat berhasil dihapus', 'success');
          } else {
            showToast('Gagal menghapus alamat', 'error');
          }
        } catch {
          showToast('Terjadi kesalahan koneksi', 'error');
        } finally {
          setSaving(false);
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#B48A5E]" />
      </div>
    );
  }

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        
        {/* ==================== SCREEN 1: PILIH ALAMAT ==================== */}
        {step === 'LIST' && (
          <motion.section
            key="list"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-4"
          >
            {/* Search Input Area */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                <input
                  type="text"
                  placeholder="Cari alamat"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-12 pr-10 py-3.5 bg-[#FFFBF5] rounded-full border border-[#D4A574]/25 shadow-inner text-[15px] outline-none font-semibold focus:bg-white focus:border-[#B48A5E]/60 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      setShowSearchResults(false);
                    }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowSearchResults(false);
                  }}
                  className="text-[15px] font-bold text-[#B48A5E] hover:text-[#946F48] transition-colors shrink-0"
                >
                  Batal
                </button>
              )}
            </div>

            {/* Detect current location button (Premium outline box style matching Screen 1) */}
            <div className="flex gap-2">
              <button
                onClick={handleDetectGPS}
                className="flex-1 flex items-center justify-between p-4.5 rounded-2xl border border-[#D4A574] bg-[#FFFBF5]/45 hover:bg-[#FFFBF5]/90 transition-all active:scale-[0.98] group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-xl bg-emerald-50 border border-emerald-250 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-emerald-600 fill-emerald-600/10" />
                  </div>
                  <span className="text-[14px] font-black text-gray-800">Gunakan lokasi saat ini (GPS)</span>
                </div>
                <Map className="w-5 h-5 text-gray-500 group-hover:text-[#B48A5E] transition-colors" />
              </button>
            </div>

            {/* Search results or Saved addresses list */}
            {searchQuery ? (
              <div className="space-y-0.5 mt-2">
                {isSearching ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-[#B48A5E]" />
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((r, i) => {
                    const placeName = r.display_name.split(',')[0];
                    return (
                      <button
                        key={i}
                        onClick={() => handleSelectSearchResult(r)}
                        className="w-full flex items-start gap-4 py-4.5 text-left border-b border-gray-100 hover:bg-gray-50/50 transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#FFFBF5] flex items-center justify-center shrink-0 border border-[#D4A574]/10">
                          <MapPin className="w-5 h-5 text-gray-400 fill-gray-100" />
                        </div>
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[15px] font-bold text-gray-900 leading-snug">
                              {placeName}
                            </span>
                            {(() => {
                              const badge = getPlaceCategoryBadge(r.class, r.type);
                              if (!badge) return null;
                              return (
                                <span className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded-full border ${badge.bg} shrink-0`}>
                                  {badge.label}
                                </span>
                              );
                            })()}
                          </div>
                          <p className="text-[12.5px] text-gray-400 mt-1 leading-relaxed line-clamp-2">
                            {r.display_name}
                          </p>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-16 px-6 bg-white rounded-3xl border border-gray-100 shadow-sm mt-4">
                    <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="font-serif text-lg text-gray-800 mb-1 font-bold">Tidak Ditemukan</h3>
                    <p className="text-sm text-gray-500">Coba kata kunci pencarian yang lain.</p>
                  </div>
                )}
              </div>
            ) : (
              /* Saved addresses list */
              <div className="space-y-3.5 mt-4">
                {addresses.map((addr) => (
                  <button
                    key={addr.id}
                    onClick={() => handleEditAddress(addr)}
                    className={`w-full flex items-start gap-4 p-5 rounded-[24px] bg-white border text-left shadow-sm hover:border-[#B48A5E]/40 hover:shadow-md transition-all group ${
                      addr.isDefault ? 'border-[#B48A5E]/40 ring-1 ring-[#B48A5E]/10' : 'border-gray-100'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-2xl bg-[#FFFBF5] border border-[#D4A574]/15 flex items-center justify-center shrink-0 text-[#B48A5E]">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-[15px] font-black text-gray-900 leading-tight">
                          {addr.name || addr.address.split(',')[0]}
                        </h4>
                        {addr.isDefault && (
                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-white bg-gradient-to-r from-[#B48A5E] to-[#D4A574] px-2.5 py-0.5 rounded-full shrink-0 shadow-sm">
                            Utama
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed line-clamp-2 font-medium">
                        {addr.address}
                      </p>
                      {addr.notes && (
                        <p className="text-[11px] text-[#B48A5E] font-bold mt-1.5 bg-[#B48A5E]/5 px-2 py-0.5 rounded-md inline-block">
                          Catatan: "{addr.notes}"
                        </p>
                      )}
                      {(addr.recipient || addr.phone) && (
                        <p className="text-[11px] text-gray-400 mt-1.5 font-semibold">
                          {addr.recipient || '-'} · {addr.phone || '-'}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#B48A5E] group-hover:translate-x-0.5 transition-all self-center shrink-0" />
                  </button>
                ))}

                {addresses.length === 0 && (
                  <div className="text-center py-16 px-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
                    <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="font-serif text-lg text-gray-800 mb-1 font-bold">Belum Ada Alamat</h3>
                    <p className="text-sm text-gray-500 mb-6">Tambahkan alamat pengiriman favoritmu.</p>
                  </div>
                )}

                <button
                  onClick={handleCreateNew}
                  className="w-full py-4 rounded-2xl border-2 border-dashed border-[#B48A5E]/30 text-[#B48A5E] font-black text-[14px] hover:bg-[#B48A5E]/5 transition-all flex items-center justify-center gap-2 mt-4"
                >
                  <Plus className="w-4.5 h-4.5" /> Tambah Alamat Baru
                </button>
              </div>
            )}
          </motion.section>
        )}        {/* ==================== SCREEN 2: MAP VIEW SELECT PIN ==================== */}
        {step === 'MAP' && (
          <motion.div
            key="map-step"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col pt-safe pb-safe"
          >
            {/* ── Leaflet Map Viewport (Visible for Map Selection) ────────────────────────────────── */}
            <div className="absolute inset-0 bg-gray-50 z-10">
              {!mapLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-[1000] gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#B48A5E]" />
                  <p className="text-xs font-semibold text-gray-500">Menyiapkan peta...</p>
                </div>
              )}
              <div ref={mapContainerRef} className="w-full h-full" />

              {/* ── Fixed Center Pin (Traditional Sharp Map Pin style) ────────────────────────────────── */}
              {mapLoaded && (
                <div className="absolute top-1/2 left-1/2 pointer-events-none z-[999]" style={{ width: '48px', height: '60px', marginLeft: '-24px', marginTop: '-60px' }}>
                  <div className="relative w-full h-full flex flex-col items-center">
                    {/* Visual representation of the pin floating/bouncing */}
                    <div className={`transition-transform duration-300 ease-out transform ${
                      isMapMoving ? '-translate-y-4 scale-105' : 'translate-y-0 scale-100'
                    }`} style={{ transformOrigin: 'bottom center' }}>
                      <svg width="48" height="60" viewBox="0 0 48 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_10px_12px_rgba(0,0,0,0.35)]">
                        <path d="M24 0C10.7452 0 0 10.7452 0 24C0 39 24 60 24 60C24 60 48 39 48 24C48 10.7452 37.2548 0 24 0ZM24 33C19.0294 33 15 28.9706 15 24C15 19.0294 19.0294 15 24 15C28.9706 15 33 19.0294 33 24C33 28.9706 28.9706 33 24 33Z" fill="url(#pin-gradient-profile)" />
                        <circle cx="24" cy="24" r="9" fill="#FFFFFF" />
                        <circle cx="24" cy="24" r="5" fill="#1E3F20" />
                        <defs>
                          <linearGradient id="pin-gradient-profile" x1="24" y1="0" x2="24" y2="60" gradientUnits="userSpaceOnUse">
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
              <button
                type="button"
                onClick={handleGPSInMap}
                disabled={isDetecting}
                className="absolute right-4 z-[1001] w-12 h-12 bg-white rounded-full shadow-2xl border border-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-50 active:scale-95 transition-all duration-300 disabled:opacity-50 bottom-[180px]"
              >
                {isDetecting ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#B48A5E]" />
                ) : (
                  <LocateFixed className="w-5 h-5 text-gray-700" />
                )}
              </button>
            </div>

            {/* ── Floating Header & Search Bar ────────────────────────────────── */}
            <div className="absolute top-4 left-4 right-4 z-[1001] flex flex-col gap-2">
              <div className="flex items-center gap-2">
                {/* Back button */}
                <button
                  type="button"
                  onClick={() => setStep('LIST')}
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
                    onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                    placeholder="Cari lokasi atau jalan..."
                    className="w-full text-sm font-medium focus:outline-none placeholder:text-gray-400 bg-transparent text-gray-800"
                  />
                  {(isSearching || reverseGeocoding) && (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400 shrink-0" />
                  )}
                  {searchQuery && !isSearching && !reverseGeocoding && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                        setShowSearchResults(false);
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
                {showSearchResults && searchResults.length > 0 && (
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
                        onClick={() => handleSelectSearchResult(r)}
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

            {/* ── Bottom Address Display & Confirm Button ── */}
            <div className="absolute bottom-0 left-0 right-0 z-[1001] bg-white rounded-t-[2.5rem] shadow-[0_-15px_40px_rgba(0,0,0,0.15)] border-t border-gray-100 p-6 flex flex-col gap-4 select-none">
              {/* Location Info Banner */}
              <div className="flex items-start gap-3.5 pb-2.5 border-b border-gray-100 shrink-0">
                <div className="w-9 h-9 rounded-full bg-[#B48A5E]/10 flex items-center justify-center text-[#B48A5E] shrink-0 mt-0.5">
                  <MapPin className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-[#B48A5E] uppercase tracking-wider">Lokasi Terpilih</span>
                  <h3 className="text-sm font-bold text-gray-900 truncate">
                    {mapAddressTitle || (reverseGeocoding ? 'Mengambil alamat...' : 'Pilih Lokasi')}
                  </h3>
                  <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                    {mapAddress || (reverseGeocoding ? 'Mengambil detail alamat dari peta...' : 'Geser peta untuk memilih lokasi')}
                  </p>
                </div>
              </div>

              {/* Out of Range warning */}
              {(() => {
                const dist = calculateDistance(storeLat, storeLng, mapLat, mapLng);
                const isOk = isWithinDeliveryRange(dist, maxDeliveryDistance);
                if (!isOk && mapAddress) {
                  return (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-150 shrink-0">
                      <AlertTriangle className="w-4.5 h-4.5 text-red-500 mt-0.5 shrink-0" />
                      <p className="text-[10.5px] font-bold text-red-700 leading-tight">
                        Maaf, lokasi terpilih berada di luar jangkauan pengiriman kami (maksimal {maxDeliveryDistance} km).
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Confirm Button */}
              <button
                type="button"
                onClick={handleConfirmMapLocation}
                disabled={!mapAddress || !isWithinDeliveryRange(calculateDistance(storeLat, storeLng, mapLat, mapLng), maxDeliveryDistance) || reverseGeocoding}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#B48A5E] to-[#946F48] text-white font-bold text-sm shadow-xl shadow-[#B48A5E]/15 hover:shadow-[#B48A5E]/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                Pilih Lokasi Ini
              </button>
            </div>
          </motion.div>
        )}

        {/* ==================== SCREEN 3: DETAIL ALAMAT FORM ==================== */}
        {step === 'DETAIL' && (
          <motion.div
            key="detail-step"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed inset-0 z-[100] bg-[#FDFBF7] flex flex-col pt-safe pb-safe"
          >
            {/* Header */}
            <div className="px-6 py-4 flex items-center gap-4 bg-white sticky top-0 z-10 border-b border-gray-100/50 shadow-sm">
              <button
                type="button"
                onClick={() => {
                  setMapCameFrom('DETAIL');
                  setStep('MAP');
                }}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all active:scale-90 cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="font-serif text-base font-bold text-gray-900 flex-1">Detail Alamat Pengiriman</h2>
              {/* Map Layout Icon on top right (Screen 3) */}
              <button
                type="button"
                onClick={() => {
                  setMapCameFrom('DETAIL');
                  setStep('MAP');
                }}
                className="w-10 h-10 flex items-center justify-center rounded-full text-[#B48A5E] hover:bg-[#B48A5E]/5 active:scale-95 transition-all cursor-pointer"
              >
                <Map className="w-5 h-5" />
              </button>
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
                  <h4 className="text-sm font-black text-gray-900 truncate leading-snug">{mapAddressTitle || 'Lokasi Dipilih'}</h4>
                  <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{mapAddress}</p>
                </div>
              </div>

              {/* Form Input fields */}
              <div className="space-y-4">
                {/* Special Notes (Catatan Spesial - e.g. Patokan) */}
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 pl-1">
                    <ClipboardList className="w-3.5 h-3.5 text-gray-400" />
                    <span>Catatan Spesial / Patokan (Opsional)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Depan pagar hitam, rumah cat pink"
                    rows={2}
                    className="w-full px-4 py-3.5 rounded-2xl border border-[#D4A574]/20 bg-[#FFFBF5] text-xs focus:outline-none focus:bg-white focus:border-[#B48A5E] transition-all font-semibold shadow-inner resize-none"
                  />
                </div>

                {/* Address Label (Nama Alamat - e.g. Rumah / Kantor) */}
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 pl-1">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                    <span>Nama Alamat / Label</span>
                    <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Rumah, Kantor, Sekolah"
                    className="w-full px-4 py-3.5 rounded-2xl border border-[#D4A574]/20 bg-[#FFFBF5] text-xs focus:outline-none focus:bg-white focus:border-[#B48A5E] transition-all font-semibold shadow-inner"
                  />
                </div>

                {/* Recipient Name */}
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 pl-1">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span>Nama Penerima</span>
                    <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="Masukkan nama penerima"
                    className="w-full px-4 py-3.5 rounded-2xl border border-[#D4A574]/20 bg-[#FFFBF5] text-xs focus:outline-none focus:bg-white focus:border-[#B48A5E] transition-all font-semibold shadow-inner"
                  />
                </div>

                {/* Phone number */}
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 pl-1">
                    <Smartphone className="w-3.5 h-3.5 text-gray-400" />
                    <span>No. Telepon Penerima</span>
                    <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 0812xxxxxxxx"
                    className="w-full px-4 py-3.5 rounded-2xl border border-[#D4A574]/20 bg-[#FFFBF5] text-xs focus:outline-none focus:bg-white focus:border-[#B48A5E] transition-all font-semibold shadow-inner"
                  />
                </div>
              </div>

              {/* Main Address Star toggle (Alamat Utama) */}
              <div className="flex items-center justify-between p-4 bg-[#FFFBF5] rounded-2xl border border-[#D4A574]/25 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-[#D4A574]/20">
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900">Alamat Utama</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5 font-semibold">Jadikan alamat default untuk pengantaran</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isDefault}
                  disabled={isDefault && (addresses.length <= 1 || (editingId !== null && addresses.find(a => a.id === editingId)?.isDefault))}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-[#B48A5E] focus:ring-[#B48A5E] accent-[#B48A5E] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Distance & Delivery Fee Info */}
              {(() => {
                const dist = calculateDistance(storeLat, storeLng, mapLat, mapLng);
                const fee = calculateDeliveryFee(dist, deliveryFeePerKm);
                const isOk = isWithinDeliveryRange(dist, maxDeliveryDistance);
                return (
                  <div className="flex items-center justify-between p-4 bg-[#FFFBF5] rounded-2xl border border-[#D4A574]/20 shadow-sm">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Jarak Antar</p>
                      <p className="text-xs font-extrabold text-gray-800">{dist.toFixed(1)} km</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Biaya Pengiriman</p>
                      <p className="text-xs font-extrabold text-[#B48A5E]">
                        {isOk ? formatRupiah(fee) : 'Di luar jangkauan'}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Delete Address (Only visible if editing existing) */}
              {editingId && (
                <button
                  type="button"
                  onClick={handleDeleteAddress}
                  className="w-full flex items-center justify-center gap-2 py-4 text-red-500 font-bold bg-red-50/30 rounded-2xl hover:bg-red-50 active:scale-95 transition-all border border-red-100/50 mt-4 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                  Hapus Alamat
                </button>
              )}
            </div>

            {/* Bottom continuous floating confirmation button */}
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-55 p-6 z-20 shadow-[0_-8px_30px_rgba(0,0,0,0.035)]">
              <button
                type="button"
                onClick={handleSaveAddress}
                disabled={saving || !name.trim() || !recipient.trim() || !phone.trim()}
                className="w-full py-4.5 bg-gradient-to-r from-[#B48A5E] to-[#946F48] hover:opacity-95 text-white font-black rounded-2xl shadow-xl shadow-[#B48A5E]/15 hover:shadow-[#B48A5E]/25 active:scale-[0.98] transition-all flex items-center justify-center text-sm gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Konfirmasi Alamat Pengiriman</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

function NotificationsSection({ 
  notifs, 
  loading, 
  setNotifs,
  refresh 
}: { 
  notifs: any[], 
  loading: boolean, 
  setNotifs: (n: any[]) => void,
  refresh: () => void
}) {
  const router = useRouter();

  const markRead = async (id: string, linkUrl?: string) => {
    try {
      await fetch('/api/user/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifs(notifs.map(n => n.id === id ? { ...n, isRead: true } : n));
      if (linkUrl) router.push(linkUrl);
    } catch (err) { console.error(err); }
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/user/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifs(notifs.map(n => ({ ...n, isRead: true })));
    } catch (err) { console.error(err); }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'order': return <Package className="w-5 h-5 text-blue-500" />;
      case 'promo': return <Heart className="w-5 h-5 text-pink-500" />;
      case 'points': return <Gift className="w-5 h-5 text-emerald-500" />;
      default: return <Bell className="w-5 h-5 text-[#B48A5E]" />;
    }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} menit lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    return `${days} hari lalu`;
  };

  const unreadCount = notifs.filter(n => !n.isRead).length;

  return (
    <motion.section key="notifications" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="space-y-4">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <button onClick={markAllRead} className="text-[12px] font-semibold text-[#B48A5E] hover:underline">
            Tandai Semua Dibaca ({unreadCount})
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-[#B48A5E]" /></div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-12 px-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="font-serif text-lg text-gray-800 mb-1">Belum Ada Notifikasi</h3>
          <p className="text-sm text-gray-500">Pesan dan informasi penting akan muncul di sini.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-2">
          {notifs.map((notif) => (
            <div
              key={notif.id}
              onClick={() => markRead(notif.id, notif.linkUrl)}
              className={`flex gap-3 p-4 rounded-2xl ${notif.isRead ? 'bg-white hover:bg-gray-50' : 'bg-[#B48A5E]/5'} mb-1 last:mb-0 relative transition-colors cursor-pointer`}
            >
              {!notif.isRead && <span className="absolute top-5 right-4 w-2 h-2 rounded-full bg-[#B48A5E]" />}
              <div className={`mt-0.5 p-2 rounded-xl h-fit ${!notif.isRead ? 'bg-white shadow-sm' : 'bg-gray-50'}`}>
                {getIcon(notif.type)}
              </div>
              <div className="pr-4">
                <h4 className={`text-sm mb-1 ${!notif.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>{notif.title}</h4>
                <p className={`text-[13px] leading-relaxed mb-1.5 ${!notif.isRead ? 'text-gray-600' : 'text-gray-500'}`}>{notif.message}</p>
                <span className="text-[10px] text-gray-400 font-medium">{timeAgo(notif.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.section>
  );
}

function SettingsSection({ user, onUpdate }: { user: UserShape, onUpdate: (user: Partial<UserShape>) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone })
      });
      if(res.ok) {
        onUpdate({ name, phone });
        setEditing(false);
      }
    } catch(err) {
      console.error(err);
    } finally {
        setSaving(false);
    }
  };

  return (
    <motion.section
      key="settings"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
        <div className="flex justify-between items-center mb-6">
           <h3 className="font-serif text-lg font-medium text-gray-900">Informasi Akun</h3>
           {!editing ? (
             <button onClick={() => setEditing(true)} className="text-sm font-semibold text-[#B48A5E] hover:underline">Ubah Profil</button>
           ) : (
             <button onClick={() => setEditing(false)} className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">Batal</button>
           )}
        </div>

        <div className="space-y-4">
          <div>
             <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-1.5">Nama Lengkap</label>
             {editing ? (
               <input 
                 value={name} 
                 onChange={e => setName(e.target.value)} 
                 className="w-full p-4 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#B48A5E]/50 bg-gray-50/50" 
               />
             ) : (
               <div className="p-4 bg-gray-50/50 rounded-2xl border border-transparent">
                  <p className="text-[15px] font-medium text-gray-900">{user.name}</p>
               </div>
             )}
          </div>
          <div>
             <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-1.5">Nomor Handphone</label>
             {editing ? (
               <input 
                 value={phone} 
                 onChange={e => setPhone(e.target.value)} 
                 className="w-full p-4 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#B48A5E]/50 bg-gray-50/50" 
               />
             ) : (
               <div className="p-4 bg-gray-50/50 rounded-2xl border border-transparent">
                  <p className="text-[15px] font-medium text-gray-900">{user.phone || '-'}</p>
               </div>
             )}
          </div>
        </div>

        {editing && (
          <button 
            disabled={saving}
            onClick={handleSave}
            className="w-full mt-6 py-4 bg-[#B48A5E] text-white rounded-2xl text-[15px] font-semibold hover:bg-[#946F48] transition-all flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Simpan Perubahan
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h4 className="text-[15px] font-bold text-gray-800">Login Sidik Jari</h4>
            <p className="text-[11px] text-gray-500">Masuk lebih cepat & aman</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          Daftarkan perangkat ini agar Anda bisa login menggunakan sidik jari atau Face ID di masa mendatang.
        </p>
        <RegisterPasskeyButton />
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-2">
        <div className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 rounded-2xl transition-colors cursor-pointer group">
          <div className="w-12 h-12 rounded-xl bg-[#FDFBF7] flex items-center justify-center border border-gray-100 group-hover:border-[#B48A5E]/20 transition-colors">
            <Shield className="w-6 h-6 text-gray-500 group-hover:text-[#B48A5E] transition-colors" />
          </div>
          <div className="flex-1 text-left">
            <h4 className="text-[15px] font-bold text-gray-800">Keamanan</h4>
            <p className="text-xs text-gray-500 mt-0.5 leading-tight">Ubah password Anda</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#B48A5E] transition-colors" />
        </div>
      </div>
      
      <div className="text-center pt-2">
        <p className="text-xs text-gray-400 font-mono">Arus App v1.0.0</p>
      </div>
    </motion.section>
  );
}

function LoyaltySection({ user, milestones }: { user: UserShape; milestones: MilestoneInfo | null }) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const copyReferralCode = () => {
    const referralUrl = `${window.location.origin}/register?ref=${user.referralCode}`;
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const maxPoints = milestones?.milestone3?.target || 15;
  const progressPercent = Math.min((user.points / maxPoints) * 100, 100);

  return (
    <motion.section
      key="loyalty"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="space-y-4"
    >
      {/* Points Progress Card */}
      <div className="bg-gradient-to-br from-[#1E3F20] via-[#244C27] to-[#1E3F20] rounded-3xl p-6 text-white relative overflow-hidden border border-[#D4A574]/20 shadow-[0_12px_30px_rgba(30,63,32,0.15)]">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-[#D4A574]/10 rounded-full blur-xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-300 font-bold animate-pulse">Total Poin Kamu</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-4xl font-black tracking-tight text-[#D4A574] drop-shadow-sm font-serif">{user.points}</span>
                <span className="text-[12px] font-bold text-gray-300">pts</span>
              </div>
            </div>
            <button
              onClick={() => setShowQR(!showQR)}
              className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all active:scale-95 text-[#D4A574] hover:text-white"
            >
              <QrCode className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mb-2">
            <div className="flex justify-between text-[11px] text-gray-200 mb-2 font-semibold">
              <span>{user.points} / {maxPoints} poin</span>
              <span>🎁 {milestones?.milestone3?.reward || 'Minuman Gratis'}</span>
            </div>
            <div className="h-3 bg-black/35 rounded-full overflow-hidden p-[2px] border border-white/5">
              <motion.div
                className="h-full bg-gradient-to-r from-[#D4A574] via-[#F4D0A4] to-[#B48A5E] rounded-full shadow-[0_0_8px_rgba(212,165,116,0.6)]"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* QR Code (toggled) */}
      <AnimatePresence>
        {showQR && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-3xl border border-[#D4A574]/20 shadow-lg p-6 text-center">
              <p className="text-xs text-gray-500 mb-4 font-bold">Tunjukkan QR ini ke kasir untuk mendapat poin</p>
              {/* QR Code using Google Charts API */}
              <div className="inline-block p-3.5 bg-white rounded-3xl border-4 border-[#D4A574] shadow-md animate-pulse">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(user.referralCode)}&bgcolor=ffffff&color=18442D`}
                  alt="QR Code"
                  width={180}
                  height={180}
                  className="rounded-xl"
                />
              </div>
              <p className="text-xs text-gray-400 mt-4 font-mono font-bold tracking-widest">{user.referralCode}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Milestone markers grid */}
      {milestones && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: 'milestone1', info: milestones.milestone1, icon: Target, label: 'Milestone 1' },
            { key: 'milestone2', info: milestones.milestone2, icon: Award, label: 'Milestone 2' },
            { key: 'milestone3', info: milestones.milestone3, icon: Trophy, label: 'Milestone 3' }
          ].map(({ key, info, icon: Icon, label }) => {
            if (!info.enabled) return null;
            const isReached = user.points >= info.target;
            return (
              <div
                key={key}
                className={`rounded-2xl p-3 border text-center transition-all flex flex-col items-center justify-between min-h-[120px] shadow-sm ${
                  isReached
                    ? 'bg-gradient-to-b from-[#FFFBF5] to-[#FFF6EB] border-[#D4A574] ring-1 ring-[#D4A574]/20 shadow-md shadow-[#D4A574]/5 scale-[1.02]'
                    : 'bg-white/50 border-gray-100 opacity-60'
                }`}
              >
                <div className="space-y-1 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-sm mb-1 ${
                    isReached ? 'bg-[#1E3F20] text-[#D4A574]' : 'bg-gray-150 text-gray-400'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${isReached ? 'text-[#B48A5E]' : 'text-gray-400'}`}>
                    {label}
                  </span>
                  <span className="text-[13px] font-black text-gray-800 leading-tight">
                    {info.target} pts
                  </span>
                  <p className="text-[9px] text-gray-500 font-semibold line-clamp-2 leading-tight px-0.5 mt-0.5">
                    {info.reward}
                  </p>
                </div>
                <div className="mt-2 w-full">
                  {isReached ? (
                    <span className="text-[8px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      Tercapai!
                    </span>
                  ) : (
                    <span className="text-[8px] font-bold text-gray-400">
                      -{info.target - user.points} pts lagi
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Referral Code */}
      <div className="bg-white rounded-3xl border border-[#D4A574]/15 shadow-sm p-5">
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-[#B48A5E]/5 flex items-center justify-center border border-[#B48A5E]/15 text-[#B48A5E]">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-[14px] font-black text-gray-850">Ajak Teman, Dapat Reward!</h4>
            <p className="text-[11px] text-gray-500 font-medium">Bagikan link pendaftaran Anda di bawah</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3.5 py-3 bg-[#FFFBF5] rounded-2xl border border-[#D4A574]/15 text-[12px] font-mono text-gray-600 truncate shadow-inner">
            {origin ? `${origin}/register?ref=${user.referralCode}` : user.referralCode}
          </div>
          <button
            onClick={copyReferralCode}
            className={`px-5 py-3 rounded-2xl text-[12px] font-black flex items-center gap-1.5 transition-all active:scale-95 ${
              copied ? 'bg-emerald-50 text-emerald-600 border border-green-200' : 'bg-[#B48A5E] text-white hover:bg-[#946F48] shadow-md shadow-[#B48A5E]/10'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Disalin!' : 'Salin'}
          </button>
        </div>
      </div>

      {/* Cara Mendapatkan Poin */}
      <div className="bg-white rounded-3xl border border-[#D4A574]/15 shadow-sm p-5 space-y-4">
        <h4 className="font-serif text-sm font-bold text-gray-850 flex items-center gap-2">
          🌱 Cara Mengumpulkan Poin & Voucher
        </h4>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#1E3F20]/5 flex items-center justify-center text-[#1E3F20] font-black text-sm shrink-0 border border-[#1E3F20]/10">
              1
            </div>
            <div>
              <h5 className="text-[13px] font-black text-gray-800">Setiap Transaksi Pembelian</h5>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed font-medium">Dapatkan poin otomatis dari setiap cup minuman segar yang Anda pesan melalui web app atau langsung di kasir.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#2E5A44]/5 flex items-center justify-center text-[#2E5A44] font-black text-sm shrink-0 border border-[#2E5A44]/10">
              2
            </div>
            <div>
              <h5 className="text-[13px] font-black text-gray-850 flex items-center gap-1.5">
                Bawa Tumbler / Wadah Sendiri
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[8px] font-extrabold uppercase tracking-wide">Eco Bonus</span>
              </h5>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed font-medium">
                Bantu kurangi limbah plastik sekali pakai. Bawa tumbler ramah lingkungan Anda sendiri untuk mendapatkan <strong className="text-[#2E5A44]">ekstra poin</strong> dan <strong className="text-[#2E5A44]">voucher reward khusus</strong> yang langsung ditambahkan saat checkout!
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function VouchersSection({ vouchers }: { vouchers: VoucherShape[] }) {
  const router = useRouter();
  const [claimCode, setClaimCode] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [claimSuccess, setClaimSuccess] = useState('');
  
  // Tab Filter States: 'AVAILABLE' | 'USED' | 'EXPIRED'
  const [filter, setFilter] = useState<'AVAILABLE' | 'USED' | 'EXPIRED'>('AVAILABLE');

  const getVoucherIcon = (type: string) => {
    switch (type) {
      case 'FREE_TOPPING': return '🧋';
      case 'UPGRADE_SIZE': return '📐';
      case 'FREE_DRINK': return '🍵';
      case 'DISCOUNT_PCT':
      case 'DISCOUNT_RP': return '💸';
      case 'GRATIS_ONGKIR': return '🚚';
      default: return '🎁';
    }
  };

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimCode.trim()) return;

    setClaiming(true);
    setClaimError('');
    setClaimSuccess('');

    try {
      const res = await fetch('/api/user/vouchers/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: claimCode })
      });
      const data = await res.json();

      if (!res.ok) {
        setClaimError(data.error || 'Gagal mengklaim voucher');
      } else {
        setClaimSuccess(data.message || 'Voucher berhasil diklaim!');
        setClaimCode('');
        router.refresh(); // Refresh to pull updated vouchers
      }
    } catch (err) {
      setClaimError('Terjadi kesalahan jaringan');
    } finally {
      setClaiming(false);
    }
  };

  const now = new Date();
  
  const filteredVouchers = vouchers.filter(v => {
    const isExpired = v.expiresAt ? new Date(v.expiresAt) < now : false;
    if (filter === 'AVAILABLE') {
      return !v.isUsed && !isExpired;
    } else if (filter === 'USED') {
      return v.isUsed;
    } else {
      return !v.isUsed && isExpired;
    }
  });

  return (
    <motion.section
      key="vouchers"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="space-y-6"
    >
      {/* Input Klaim Voucher */}
      <div className="bg-white/80 border border-[#D4A574]/15 shadow-sm rounded-3xl p-5 space-y-4">
        <h3 className="font-serif text-sm font-bold text-gray-800 flex items-center gap-2">
          🎟️ Punya Kode Voucher?
        </h3>
        <form onSubmit={handleClaim} className="flex gap-2">
          <input
            type="text"
            value={claimCode}
            onChange={(e) => setClaimCode(e.target.value)}
            placeholder="Contoh: MATCHABOYBARU"
            className="flex-1 px-4 py-3.5 bg-[#FFFBF5] border border-[#D4A574]/20 rounded-2xl focus:bg-white focus:border-[#B48A5E]/60 outline-none text-sm font-bold uppercase placeholder:normal-case placeholder:font-medium placeholder:text-gray-400 transition-all shadow-inner"
            disabled={claiming}
          />
          <button
            type="submit"
            disabled={claiming || !claimCode.trim()}
            className="px-6 py-3.5 bg-[#B48A5E] hover:bg-[#946F48] disabled:bg-gray-100 disabled:text-gray-400 text-white font-black rounded-2xl transition-all flex items-center justify-center shrink-0 text-sm shadow-md shadow-[#B48A5E]/10"
          >
            {claiming ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Klaim'}
          </button>
        </form>

        {claimError && (
          <p className="text-xs text-red-500 font-bold px-1">{claimError}</p>
        )}
        {claimSuccess && (
          <p className="text-xs text-emerald-600 font-bold px-1">{claimSuccess}</p>
        )}
      </div>

      {/* Pill Filter Tabs */}
      <div className="flex gap-1.5 p-1.5 bg-[#FFFBF5]/85 border border-[#D4A574]/15 rounded-2xl shadow-inner">
        <button
          onClick={() => setFilter('AVAILABLE')}
          className={`flex-1 py-2.5 text-center text-xs rounded-xl transition-all ${
            filter === 'AVAILABLE'
              ? 'bg-gradient-to-br from-[#B48A5E] to-[#946F48] text-white shadow-md font-black'
              : 'text-gray-500 hover:text-gray-800 font-bold hover:bg-white/40'
          }`}
        >
          Tersedia ({vouchers.filter(v => !v.isUsed && (!v.expiresAt || new Date(v.expiresAt) >= now)).length})
        </button>
        <button
          onClick={() => setFilter('USED')}
          className={`flex-1 py-2.5 text-center text-xs rounded-xl transition-all ${
            filter === 'USED'
              ? 'bg-gradient-to-br from-[#B48A5E] to-[#946F48] text-white shadow-md font-black'
              : 'text-gray-500 hover:text-gray-800 font-bold hover:bg-white/40'
          }`}
        >
          Terpakai ({vouchers.filter(v => v.isUsed).length})
        </button>
        <button
          onClick={() => setFilter('EXPIRED')}
          className={`flex-1 py-2.5 text-center text-xs rounded-xl transition-all ${
            filter === 'EXPIRED'
              ? 'bg-gradient-to-br from-[#B48A5E] to-[#946F48] text-white shadow-md font-black'
              : 'text-gray-500 hover:text-gray-800 font-bold hover:bg-white/40'
          }`}
        >
          Kedaluwarsa ({vouchers.filter(v => !v.isUsed && v.expiresAt && new Date(v.expiresAt) < now).length})
        </button>
      </div>

      {/* Active Vouchers List */}
      <div className="space-y-3">
        {filteredVouchers.length === 0 ? (
          <div className="text-center py-12 px-6 bg-white rounded-3xl border border-[#D4A574]/15 shadow-sm">
            <Gift className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h4 className="font-serif text-base text-gray-800 mb-1 font-bold">
              {filter === 'AVAILABLE' ? 'Belum Ada Voucher Aktif' : filter === 'USED' ? 'Belum Ada Voucher Terpakai' : 'Belum Ada Voucher Kedaluwarsa'}
            </h4>
            <p className="text-[12px] text-gray-500 max-w-xs mx-auto leading-relaxed font-semibold">
              {filter === 'AVAILABLE'
                ? 'Kumpulkan poin pesanan Anda atau klaim kode promo di atas untuk mendapatkan voucher!'
                : 'Voucher yang telah sukses digunakan untuk transaksi akan tercantum di sini.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredVouchers.map((v, i) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => filter === 'AVAILABLE' && router.push(`/vouchers/${v.id}`)}
                className={`ticket-card rounded-2xl border border-[#D4A574]/20 shadow-sm overflow-hidden flex items-stretch transition-all relative min-h-[105px] ${
                  filter === 'AVAILABLE' ? 'cursor-pointer hover:border-[#B48A5E]/40 hover:shadow-md active:scale-[0.99] group' : 'opacity-70'
                }`}
              >
                {/* Punch Holes exactly at the division line between stub and body */}
                {/* Since stub is w-14, division is at 56px */}
                <div className="absolute left-[52px] -top-2.5 w-5 h-5 bg-[#FDFBF7] rounded-full border border-gray-150/80 z-10" />
                <div className="absolute left-[52px] -bottom-2.5 w-5 h-5 bg-[#FDFBF7] rounded-full border border-gray-150/80 z-10" />

                {/* Left Side Tab Decorator (Stub) */}
                <div className="w-14 bg-gradient-to-br from-[#1E3F20] to-[#2E5A44] flex flex-col items-center justify-center text-2xl border-r border-dashed border-[#D4A574]/30 relative shrink-0 text-[#D4A574]">
                  {getVoucherIcon(v.type)}
                </div>
                
                {/* Right Side Main Details */}
                <div className="flex-1 p-4 pl-5 relative overflow-hidden flex flex-col justify-between">
                  {/* Subtle Tea Leaf Watermark */}
                  <Coffee className="absolute right-2 -bottom-4 w-20 h-20 text-[#2E5A44] opacity-[0.03] pointer-events-none rotate-12" />
                  
                  <div>
                    <h4 className="text-[14px] font-black text-gray-900 leading-snug">{v.description}</h4>
                    <span className="text-[9px] font-mono font-bold text-[#B48A5E] bg-[#B48A5E]/5 px-2 py-0.5 rounded border border-[#B48A5E]/15 mt-1.5 inline-block uppercase">
                      Kode: {v.code.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  
                  {v.expiresAt && (
                    <p className={`text-[10px] font-semibold mt-2 ${filter === 'AVAILABLE' ? 'text-amber-600' : 'text-gray-400'}`}>
                      Berlaku s/d {new Date(v.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>

                {/* Rightmost Action Label/Badge */}
                <div className="flex flex-col items-center justify-center px-4 border-l border-gray-50 bg-[#FFFBF5]/35 shrink-0 select-none">
                  {filter === 'AVAILABLE' ? (
                    <span className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#B48A5E] to-[#D4A574] text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm group-hover:from-[#946F48] group-hover:to-[#B48A5E] transition-all">
                      Gunakan
                    </span>
                  ) : filter === 'USED' ? (
                    <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                      Terpakai
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                      Hangus
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
}
