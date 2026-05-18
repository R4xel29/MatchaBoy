'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Fingerprint
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import 'leaflet/dist/leaflet.css';
import { formatRupiah } from '@/lib/utils';
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get('section') as SectionType;
  const [activeSection, setActiveSection] = useState<SectionType>(sectionParam || 'menu');
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
      {/* Header */}
      {/* Header with Background Pattern */}
      <header className="relative pt-safe bg-[#F5F5F5] overflow-hidden min-h-[160px]">
        {/* Decorative Patterns (Heart shapes or similar) */}
        <div className="absolute top-0 right-0 p-4 opacity-10">
           <Heart className="w-24 h-24 rotate-12" />
        </div>
        <div className="absolute -top-10 -left-10 opacity-5">
           <div className="w-40 h-40 rounded-full border-[20px] border-black" />
        </div>

        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={handleBack}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm hover:bg-gray-50 transition-all active:scale-95 touch-target"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            
            {activeSection === 'menu' && (
              <button 
                onClick={() => user.isGuest ? setIsLoginSheetOpen(true) : setIsEditingProfile(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-full shadow-sm text-xs font-semibold text-gray-700 hover:bg-white transition-all active:scale-95"
              >
                <span>{user.isGuest ? 'Masuk' : 'Edit Profil'}</span>
                {user.isGuest ? <ChevronRight className="w-3.5 h-3.5" /> : <Settings className="w-3.5 h-3.5" />}
              </button>
            )}
            
            {activeSection !== 'menu' && (
              <motion.h1 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="font-serif text-xl font-medium tracking-wide text-gray-800"
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
              <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-4 border border-gray-100 flex items-stretch">
                {/* User Info Section */}
                <div className="flex flex-col flex-1 gap-2 pr-4">
                  <div className="relative w-16 h-16 mb-1">
                    <div className="absolute inset-0 rounded-full border-2 border-gray-100 p-0.5">
                      <div className="w-full h-full rounded-full bg-brand-50 flex items-center justify-center overflow-hidden">
                        <User className="w-8 h-8 text-brand-600" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] text-gray-400 font-medium">Hai,</p>
                    <h2 className="text-base font-bold text-gray-900 leading-tight truncate">{user.name}</h2>
                  </div>
                </div>

                {/* Vertical Divider */}
                <div className="w-px bg-gray-100 my-2" />

                {/* Level Section */}
                <div className="flex flex-col items-center justify-center px-4 w-28 text-center">
                  <p className="text-[10px] text-brand-500 font-bold uppercase tracking-wider mb-2">Level</p>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                       <Heart className="w-4 h-4 text-gray-300" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-700">Silver</p>
                      <p className="text-[9px] text-gray-400 font-medium">0%</p>
                    </div>
                  </div>
                </div>

                {/* Vertical Divider */}
                <div className="w-px bg-gray-100 my-2" />

                {/* Points Section */}
                <div className="flex flex-col items-center justify-center pl-4 w-32 text-center">
                  <p className="text-[10px] text-brand-500 font-bold uppercase tracking-wider mb-2">Arus Points</p>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
                       <Coins className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="flex items-baseline gap-1">
                      <p className="text-lg font-black text-gray-900 leading-none">{user.isGuest ? '-' : user.points}</p>
                      <p className="text-[10px] text-gray-400 font-bold">pts</p>
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
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-2">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      router.push(`/profile?section=${item.id}`);
                    }}
                    className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 rounded-2xl transition-all active:scale-[0.98] group"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-[#FDFBF7] flex items-center justify-center border border-gray-100 group-hover:bg-white group-hover:shadow-sm transition-all">
                      <item.icon className="w-5 h-5 text-[#B48A5E]" />
                    </div>
                    <span className="flex-1 text-[15px] font-medium text-gray-800 text-left">
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#B48A5E]/10 text-[#B48A5E] text-xs font-bold">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition-colors" />
                  </button>
                ))}
              </div>

              {/* Keamanan Biometrik (Main Profile) */}
              {!user.isGuest && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-[#FDFBF7] rounded-xl shadow-sm flex items-center justify-center border border-gray-100">
                      <Fingerprint className="w-5 h-5 text-[#B48A5E]" />
                    </div>
                    <div>
                      <h4 className="text-[15px] font-bold text-gray-800">Login Sidik Jari</h4>
                      <p className="text-xs text-gray-500">Aktifkan untuk keamanan tambahan</p>
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
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-red-50 bg-white text-[15px] font-bold text-red-500 hover:bg-red-50 hover:border-red-100 transition-all active:scale-[0.98]">
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
    </div>
  );
}

// Sub-components

function EditProfileOverlay({ user, onClose, onUpdate }: { user: UserShape, onClose: () => void, onUpdate: (user: Partial<UserShape>) => void }) {
  const router = useRouter();
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
        alert(data.error || "Gagal mengirim kode penghapusan akun.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan jaringan.");
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
              className="w-full px-4 py-3.5 bg-[#F9F9F9] border border-transparent rounded-2xl focus:bg-white focus:border-brand-300 transition-all outline-none text-[15px] font-medium text-gray-900"
              placeholder="Masukkan nama lengkap"
            />
          </div>

          {/* Google Connection Section */}
          <div className="space-y-3">
            <label className="text-[11px] uppercase tracking-wider font-bold text-gray-400">Akun Terhubung</label>
            <div className="flex items-center justify-between p-4 bg-[#F9F9F9] rounded-2xl border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 6.23l3.66 2.84c.87-2.6 3.3-4.53 12 4.53z" fill="#EA4335"/>
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Google</h4>
                  <p className="text-[11px] text-gray-500">{user.isGoogleConnected ? 'Terhubung' : 'Belum terhubung'}</p>
                </div>
              </div>
              {user.isGoogleConnected ? (
                <button 
                  onClick={() => setShowGoogleConfirm(true)}
                  className="px-4 py-2 bg-white border border-red-100 text-red-500 rounded-xl text-[12px] font-bold hover:bg-red-50 transition-colors"
                >
                  Putuskan
                </button>
              ) : (
                <button 
                  onClick={() => signIn('google', { callbackUrl: '/profile' })}
                  className="px-4 py-2 bg-brand-600 text-white rounded-xl text-[12px] font-bold shadow-md shadow-brand-100 hover:bg-brand-700 transition-all active:scale-95"
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
                className="w-full px-4 py-3.5 bg-[#F9F9F9] border border-transparent rounded-2xl focus:bg-white focus:border-brand-300 transition-all outline-none text-[15px] font-medium text-gray-900"
                placeholder="alamat email"
              />
              <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-brand-400" />
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
                  className="w-full pl-14 pr-4 py-3.5 bg-[#F9F9F9] border border-transparent rounded-2xl text-[15px] font-medium text-gray-500 cursor-not-allowed"
                />
              </div>
              <button className="px-5 py-3 border border-brand-600 text-brand-600 rounded-2xl text-sm font-bold hover:bg-brand-50 transition-colors">
                Ganti
              </button>
            </div>
          </div>

          {/* PIN Link */}
          <button className="flex items-center gap-2 text-brand-600 font-bold text-[13px] hover:opacity-80 transition-opacity px-1">
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
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-200' 
                      : 'bg-[#F9F9F9] text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Birthday Banner */}
          <div className="bg-[#FFF9EE] rounded-2xl p-4 border border-brand-100/30 flex items-start gap-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-brand-200/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="p-2.5 bg-white rounded-xl shadow-sm relative z-10">
               <Cake className="w-5 h-5 text-brand-500" />
            </div>
            <div className="flex-1 relative z-10">
              <h4 className="text-sm font-bold text-gray-900 leading-tight">Dirayain loh ultahnya</h4>
              <p className="text-[11px] text-brand-700/80 mt-1 font-medium leading-relaxed">Masukin tanggal ultah buat dirayain ultahnya.</p>
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
              className="w-full px-4 py-3.5 bg-[#F9F9F9] border border-transparent rounded-2xl focus:bg-white focus:border-brand-300 transition-all outline-none text-[15px] font-medium text-gray-900"
            />
            <p className="text-[10px] text-gray-400 font-medium px-1">Buat dirayain ulang tahunnya</p>
          </div>

          {/* Action Hapus Akun */}
          <div className="pt-6 border-t border-red-100 mt-4">
            <button 
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-4 border-2 border-red-100 hover:border-red-200 hover:bg-red-50 text-red-500 rounded-2xl text-[14px] font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
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
              className="w-full py-4.5 bg-brand-600 text-white rounded-2xl text-[17px] font-bold shadow-xl shadow-brand-200/50 hover:bg-brand-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
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
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-600 animate-pulse">
                  <Smartphone className="w-8 h-8" />
                </div>

                <h3 className="font-serif text-lg font-bold text-gray-900 mb-2">Konfirmasi WhatsApp</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  Kami telah mengirimkan kode konfirmasi ke nomor WhatsApp Anda (*{user.phone}*).
                  Silakan balas pesan tersebut dengan mengetik:
                </p>

                <div className="bg-[#FFF9EE] rounded-2xl p-4 border border-brand-100/50 mb-6 flex flex-col items-center justify-center gap-1.5 select-all cursor-pointer group hover:bg-brand-50/30 transition-all">
                  <p className="text-[10px] text-brand-600 font-bold uppercase tracking-wider">Salin & Kirim ke WA</p>
                  <p className="text-xl font-mono font-black text-brand-800 tracking-wider">HAPUS-{deleteCode}</p>
                </div>

                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-400 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500" />
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
  return (
    <motion.section
      key="orders"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="space-y-3"
    >
      {orders.length === 0 ? (
        <div className="text-center py-12 px-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Coffee className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="font-serif text-lg text-gray-800 mb-1">Belum Ada Pesanan</h3>
          <p className="text-sm text-gray-500 mb-6">Nikmati berbagai pilihan matcha terbaik kami.</p>
          <button 
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-[#B48A5E] text-white rounded-full text-sm font-medium hover:bg-[#946F48] transition-colors"
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
            className="w-full text-left p-4 rounded-3xl bg-white border border-gray-100 shadow-sm hover:border-[#B48A5E]/30 hover:shadow-md transition-all active:scale-[0.98] group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                  <Package className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <p className="font-mono text-xs font-bold text-gray-900 leading-none">{order.id.slice(0,8).toUpperCase()}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{order.date}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider
                ${order.status === 'completed' || order.status === 'selesai' ? 'bg-green-50 border-green-200 text-green-700' : 
                  order.status === 'cancelled' || order.status === 'dibatalkan' ? 'bg-red-50 border-red-200 text-red-700' : 
                  'bg-amber-50 border-amber-200 text-amber-700'}`}>
                {order.status}
              </span>
            </div>
            <div className="pl-10">
              <p className="text-sm text-gray-600 line-clamp-1 mb-2 font-medium">{order.items}</p>
              <div className="flex items-center gap-x-2">
                <span className="text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">Total</span>
                <p className="text-[15px] font-bold text-[#B48A5E]">{formatRupiah(order.total)}</p>
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

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const ignoreMoveEndRef = useRef(true);

  const storeLat = -7.756928;
  const storeLng = 113.211502;

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
          setMapLat(d.storeLat);
          setMapLng(d.storeLng);
        }
      })
      .catch(() => {});
  }, []);

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
      if (mapRef.current) return true; // already initialized

      // Fix marker icons
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

      // Force layout after animation
      setTimeout(() => {
        map.invalidateSize();
        setTimeout(() => {
          ignoreMoveEndRef.current = false;
        }, 200);
      }, 300);

      triggerReverseGeocode(mapLat, mapLng);
      setMapLoaded(true);

      const handleUserMapChange = () => {
        const center = map.getCenter();
        setMapLat(center.lat);
        setMapLng(center.lng);
        triggerReverseGeocode(center.lat, center.lng);
      };

      map.on('dragend', handleUserMapChange);
      map.on('zoomend', handleUserMapChange);

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
    setMapLat(lat);
    setMapLng(lng);
    setMapAddress(result.display_name);

    const title = result.display_name.split(',')[0];
    setMapAddressTitle(title);

    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);

    // Center map view on the selected coordinates immediately
    if (mapRef.current) {
      ignoreMoveEndRef.current = true;
      mapRef.current.setView([lat, lng], 16);
      setTimeout(() => {
        ignoreMoveEndRef.current = false;
      }, 300);
    }

    // Go to Map Pin alignment step
    setMapCameFrom('LIST');
    setStep('MAP');
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
      },
      () => {},
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
      alert('Nama Alamat wajib diisi');
      return;
    }
    if (!recipient.trim()) {
      alert('Penerima wajib diisi');
      return;
    }
    if (!phone.trim()) {
      alert('Nomor Telepon wajib diisi');
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
        alert(data.error || 'Gagal menyimpan alamat');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi');
    } finally {
      setSaving(false);
    }
  };

  // Delete address
  const handleDeleteAddress = async () => {
    if (!editingId) return;
    if (!confirm('Apakah Anda yakin ingin menghapus alamat ini?')) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/user/locations/${editingId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setAddresses(prev => prev.filter(a => a.id !== editingId));
        setStep('LIST');
        setEditingId(null);
      } else {
        alert('Gagal menghapus alamat');
      }
    } catch {
      alert('Terjadi kesalahan koneksi');
    } finally {
      setSaving(false);
    }
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
                  className="w-full pl-12 pr-10 py-3.5 bg-[#F4F4F4] rounded-full text-[15px] outline-none font-medium focus:bg-[#EFEFEF] transition-all border border-transparent shadow-inner"
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
                  className="text-[15px] font-semibold text-[#0066FF] hover:text-[#0055DD] transition-colors shrink-0"
                >
                  Batal
                </button>
              )}
            </div>

            {/* Detect current location button (Premium outline box style matching Screen 1) */}
            <div className="flex gap-2">
              <button
                onClick={handleDetectGPS}
                className="flex-1 flex items-center justify-between p-4.5 rounded-2xl border-2 border-[#D4B28C] bg-white transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600/30" />
                  </div>
                  <span className="text-[15px] font-bold text-gray-800">Gunakan lokasi saat ini</span>
                </div>
                <Map className="w-5 h-5 text-gray-800" />
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
                        <div className="w-10 h-10 rounded-full bg-[#F4F4F4] flex items-center justify-center shrink-0">
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
                    <h3 className="font-serif text-lg text-gray-800 mb-1">Tidak Ditemukan</h3>
                    <p className="text-sm text-gray-500">Coba kata kunci pencarian yang lain.</p>
                  </div>
                )}
              </div>
            ) : (
              /* Saved addresses list */
              <div className="space-y-3 mt-4">
                {addresses.map((addr) => (
                  <button
                    key={addr.id}
                    onClick={() => handleEditAddress(addr)}
                    className={`w-full flex items-start gap-3.5 p-4 rounded-3xl bg-white border text-left shadow-sm hover:border-[#B48A5E]/30 hover:shadow-md transition-all group ${
                      addr.isDefault ? 'border-[#B48A5E]/40 ring-1 ring-[#B48A5E]/10' : 'border-gray-100'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-gray-400 fill-gray-100" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-[15px] font-bold text-gray-900 leading-tight">
                          {addr.name || addr.address.split(',')[0]}
                        </h4>
                        {addr.isDefault && (
                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#B48A5E] bg-[#B48A5E]/10 px-2 py-0.5 rounded-full shrink-0">
                            Utama
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-gray-500 mt-1 leading-relaxed line-clamp-2">
                        {addr.address}
                      </p>
                      {addr.notes && (
                        <p className="text-[11px] text-brand-600 font-medium mt-1">
                          Catatan: "{addr.notes}"
                        </p>
                      )}
                      {(addr.recipient || addr.phone) && (
                        <p className="text-[11px] text-gray-400 mt-1 font-medium">
                          {addr.recipient || '-'} · {addr.phone || '-'}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition-colors self-center shrink-0" />
                  </button>
                ))}

                {addresses.length === 0 && (
                  <div className="text-center py-16 px-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
                    <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="font-serif text-lg text-gray-800 mb-1">Belum Ada Alamat</h3>
                    <p className="text-sm text-gray-500 mb-6">Tambahkan alamat pengiriman favoritmu.</p>
                  </div>
                )}

                <button
                  onClick={handleCreateNew}
                  className="w-full py-4 rounded-2xl border border-dashed border-[#B48A5E]/40 text-[#B48A5E] font-bold text-[14px] hover:bg-[#B48A5E]/5 transition-all flex items-center justify-center gap-2 mt-4"
                >
                  <Plus className="w-4 h-4" /> Tambah Alamat Baru
                </button>
              </div>
            )}
          </motion.section>
        )}

        {/* ==================== SCREEN 2: MAP VIEW SELECT PIN ==================== */}
        {step === 'MAP' && (
          <motion.div
            key="map-step"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col pt-safe pb-safe"
          >
            {/* Header */}
            <div className="px-4 py-4 flex items-center gap-4 bg-white sticky top-0 z-10 border-b border-gray-50">
              <button
                onClick={() => setStep(mapCameFrom === 'DETAIL' ? 'DETAIL' : 'LIST')}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all active:scale-90"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="font-serif text-base font-bold text-gray-900 flex-1">Pilih Lokasi</h2>
            </div>

            {/* Interactive Leaflet Map picker */}
            <div className="flex-1 relative bg-gray-100 overflow-hidden" style={{ minHeight: '300px' }}>
              <div
                id="leaflet-picker-map"
                ref={mapContainerRef}
                className="absolute inset-0 z-0"
                style={{ width: '100%', height: '100%' }}
              ></div>
              {!mapLoaded && (
                <div className="absolute inset-0 bg-gray-50 flex flex-col items-center justify-center gap-3 z-[1001]">
                  <Loader2 className="w-8 h-8 animate-spin text-[#B48A5E]" />
                  <span className="text-[13px] text-gray-500 font-medium">Memuat Peta...</span>
                </div>
              )}

              {/* Fixed bounce center pin indicator */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[38px] pointer-events-none z-[1000] flex flex-col items-center">
                <div className="relative flex items-center justify-center">
                  <div className="w-11 h-11 bg-emerald-500 rounded-full border-3 border-white shadow-2xl flex items-center justify-center z-10">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <div className="absolute top-[34px] w-2.5 h-1 bg-black/30 rounded-full scale-x-150 blur-[1px]" />
                </div>
              </div>

              {/* Geser untuk pindah lokasi overlay tag (Screen 2) */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
                <div className="bg-[#5C3EBA] text-white px-5 py-1.5 rounded-full text-[12px] font-bold shadow-md flex items-center gap-1.5 whitespace-nowrap">
                  <span>Geser untuk pindah lokasi</span>
                </div>
              </div>

              {/* GPS locate button */}
              <button
                onClick={handleGPSInMap}
                className="absolute bottom-32 right-4 z-[1000] w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all text-gray-700 border border-gray-100"
              >
                <LocateFixed className="w-5 h-5" />
              </button>

              {/* Reverse Geocode display banner & Select location button */}
              <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4.5 rounded-t-3xl shadow-[0_-8px_30px_rgb(0,0,0,0.08)] z-[1000] space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-emerald-600 fill-emerald-600/10" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {reverseGeocoding ? (
                      <div className="space-y-1.5 py-1">
                        <div className="h-3.5 bg-gray-100 rounded animate-pulse w-3/4" />
                        <div className="h-3 bg-gray-100 rounded animate-pulse w-5/6" />
                      </div>
                    ) : (
                      <p className="text-[13px] font-semibold text-gray-700 leading-snug">
                        {mapAddress || 'Mencari lokasi pin...'}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleConfirmMapLocation}
                  disabled={reverseGeocoding || !mapAddress}
                  className="w-full py-4 bg-[#C2272D] hover:bg-[#A11E23] text-white font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-[15px]"
                >
                  Pilih Lokasi Ini
                </button>
              </div>
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
            <div className="px-4 py-4 flex items-center gap-4 bg-white sticky top-0 z-10 border-b border-gray-50 shadow-sm">
              <button
                onClick={() => {
                  setMapCameFrom('DETAIL');
                  setStep('MAP');
                }}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all active:scale-90"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="font-serif text-base font-bold text-gray-900 flex-1">Detail Alamat</h2>
              {/* Map Layout Icon on top right (Screen 3) */}
              <button
                onClick={() => {
                  setMapCameFrom('DETAIL');
                  setStep('MAP');
                }}
                className="w-10 h-10 flex items-center justify-center rounded-full text-gray-800 hover:bg-gray-50 active:scale-95 transition-all"
              >
                <Map className="w-5 h-5" />
              </button>
            </div>

            {/* Content Form Form */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-24 scrollbar-hide">
              
              {/* Selected coordinates details display */}
              <div className="space-y-1.5">
                <h3 className="font-bold text-gray-800 text-[15px] leading-tight">
                  {mapAddressTitle || 'Lokasi Dipilih'}
                </h3>
                <p className="text-[13px] text-gray-500 leading-relaxed font-medium">
                  {mapAddress}
                </p>
              </div>

              {/* Special Notes (Catatan Spesial - optional textarea) */}
              <div className="space-y-1">
                <label className="text-[12px] font-bold text-gray-500">Catatan Spesial</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="rumah pink"
                  rows={2}
                  className="w-full px-4 py-3 bg-[#F4F4F4] border border-transparent rounded-2xl focus:bg-white focus:border-brand-300 transition-all outline-none text-[15px] font-medium text-gray-900 resize-none shadow-inner"
                />
              </div>

              {/* Address Label (Nama Alamat - e.g. sekolah) */}
              <div className="space-y-1">
                <label className="text-[12px] font-bold text-gray-500">
                  Nama Alamat <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="sekolah"
                  className="w-full px-4 py-3.5 bg-[#F4F4F4] border border-transparent rounded-2xl focus:bg-white focus:border-brand-300 transition-all outline-none text-[15px] font-medium text-gray-900 shadow-inner"
                />
              </div>

              {/* Recipient Name (Penerima - e.g. Axelino Manibuy) */}
              <div className="space-y-1">
                <label className="text-[12px] font-bold text-gray-500">
                  Penerima <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Axelino Manibuy"
                  className="w-full px-4 py-3.5 bg-[#F4F4F4] border border-transparent rounded-2xl focus:bg-white focus:border-brand-300 transition-all outline-none text-[15px] font-medium text-gray-900 shadow-inner"
                />
              </div>

              {/* Phone number (No. Telepon - e.g. 081344446442) */}
              <div className="space-y-1">
                <label className="text-[12px] font-bold text-gray-500">
                  No. Telepon <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="081344446442"
                  className="w-full px-4 py-3.5 bg-[#F4F4F4] border border-transparent rounded-2xl focus:bg-white focus:border-brand-300 transition-all outline-none text-[15px] font-medium text-gray-900 shadow-inner"
                />
              </div>

              {/* Main Address Star toggle (Alamat Utama) */}
              <div className="flex items-center justify-between p-4 bg-[#FFF9EE] rounded-2xl border border-brand-100/40 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-brand-100">
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Alamat Utama</h4>
                    <p className="text-[11px] text-brand-700/80 mt-0.5 font-medium">Jadikan alamat utama untuk delivery</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isDefault}
                  disabled={addresses.length === 0} // First address is always default
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-brand-600 focus:ring-brand-500 accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Delete Address (Only visible if editing existing) */}
              {editingId && (
                <button
                  type="button"
                  onClick={handleDeleteAddress}
                  className="w-full flex items-center justify-center gap-2 py-4 text-[#C2272D] font-bold text-sm bg-red-50/50 rounded-2xl hover:bg-red-50 active:scale-95 transition-all border border-red-100/50 mt-4"
                >
                  <Trash2 className="w-4 h-4 text-[#C2272D]" />
                  Hapus Alamat
                </button>
              )}
            </div>

            {/* Bottom continuous floating confirmation button */}
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-50 p-5 z-20">
              <button
                onClick={handleSaveAddress}
                disabled={saving || !name.trim() || !recipient.trim() || !phone.trim()}
                className="w-full py-4 bg-[#B48A5E] hover:bg-[#946F48] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-2xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center text-[16px] gap-2"
              >
                {saving && <Loader2 className="w-5 h-5 animate-spin" />}
                Lanjutkan
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
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
      <div className="bg-gradient-to-br from-[#B48A5E] to-[#946F48] rounded-3xl p-5 text-white relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-black/10 rounded-full blur-xl" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">Total Poin Kamu</p>
              <p className="text-4xl font-serif font-bold mt-1">{user.points}</p>
            </div>
            <button
              onClick={() => setShowQR(!showQR)}
              className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/20 transition-all active:scale-95"
            >
              <QrCode className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mb-3">
            <div className="flex justify-between text-[10px] text-white/60 mb-1.5 font-medium">
              <span>{user.points} / {maxPoints} poin</span>
              <span>🎁 {milestones?.milestone3?.reward || 'Minuman Gratis'}</span>
            </div>
            <div className="h-2.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
              <motion.div
                className="h-full bg-gradient-to-r from-green-400 to-emerald-300 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Milestone markers */}
          {milestones && (
            <div className="flex gap-2 mt-3">
              {milestones.milestone1.enabled && (
                <div className={`flex-1 text-center py-1.5 rounded-xl text-[9px] font-bold ${
                  user.points >= milestones.milestone1.target ? 'bg-green-400/20 text-green-300' : 'bg-white/5 text-white/40'
                }`}>
                  <Target className="w-3 h-3 mx-auto mb-0.5" />
                  {milestones.milestone1.target}p · {milestones.milestone1.reward}
                </div>
              )}
              {milestones.milestone2.enabled && (
                <div className={`flex-1 text-center py-1.5 rounded-xl text-[9px] font-bold ${
                  user.points >= milestones.milestone2.target ? 'bg-blue-400/20 text-blue-300' : 'bg-white/5 text-white/40'
                }`}>
                  <Award className="w-3 h-3 mx-auto mb-0.5" />
                  {milestones.milestone2.target}p · {milestones.milestone2.reward}
                </div>
              )}
              {milestones.milestone3.enabled && (
                <div className={`flex-1 text-center py-1.5 rounded-xl text-[9px] font-bold ${
                  user.points >= milestones.milestone3.target ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/5 text-white/40'
                }`}>
                  <Trophy className="w-3 h-3 mx-auto mb-0.5" />
                  {milestones.milestone3.target}p · {milestones.milestone3.reward}
                </div>
              )}
            </div>
          )}
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
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 text-center">
              <p className="text-xs text-gray-500 mb-3 font-medium">Tunjukkan QR ini ke kasir untuk mendapat poin</p>
              {/* QR Code using Google Charts API */}
              <div className="inline-block p-3 bg-white rounded-2xl border-2 border-dashed border-[#B48A5E]/20">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(user.referralCode)}&bgcolor=ffffff&color=18442D`}
                  alt="QR Code"
                  width={180}
                  height={180}
                  className="rounded-lg"
                />
              </div>
              <p className="text-xs text-gray-400 mt-3 font-mono">{user.referralCode}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Referral Code */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center">
            <Share2 className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h4 className="text-[14px] font-bold text-gray-800">Ajak Teman, Dapat Reward!</h4>
            <p className="text-[11px] text-gray-500">Bagikan link di bawah ini</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-100 text-[12px] font-mono text-gray-600 truncate">
            {origin ? `${origin}/register?ref=${user.referralCode}` : user.referralCode}
          </div>
          <button
            onClick={copyReferralCode}
            className={`px-4 py-2.5 rounded-xl text-[12px] font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
              copied ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-[#B48A5E] text-white hover:bg-[#946F48]'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Disalin!' : 'Salin'}
          </button>
        </div>
      </div>

      {/* Cara Mendapatkan Poin */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h4 className="font-serif text-sm font-bold text-gray-800 flex items-center gap-2">
          🌱 Cara Mengumpulkan Poin & Voucher
        </h4>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-sm shrink-0">
              1
            </div>
            <div>
              <h5 className="text-[13px] font-bold text-gray-800">Setiap Pembelian Transaksi</h5>
              <p className="text-[11px] text-gray-500 mt-0.5">Dapatkan poin dari setiap cup minuman segar yang dipesan (online atau kasir).</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 font-bold text-sm shrink-0">
              2
            </div>
            <div>
              <h5 className="text-[13px] font-bold text-gray-850 flex items-center gap-1.5">
                Bawa Tumbler / Wadah Sendiri
                <span className="px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[8px] font-extrabold uppercase">Eco Bonus</span>
              </h5>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Kurangi penggunaan gelas plastik sekali pakai. Bawa tumbler sendiri untuk dapat **ekstra poin** & **voucher eco-reward langsung** sesuai pengaturan toko!
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function VouchersSection({ vouchers }: { vouchers: VoucherShape[] }) {
  const getVoucherIcon = (type: string) => {
    switch (type) {
      case 'FREE_TOPPING': return '🧋';
      case 'UPGRADE_SIZE': return '📐';
      case 'FREE_DRINK': return '🍵';
      case 'DISCOUNT_10':
      case 'DISCOUNT_20': return '💸';
      default: return '🎁';
    }
  };

  const activeVouchers = vouchers.filter(v => !v.isUsed);

  return (
    <motion.section
      key="vouchers"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="space-y-6"
    >
      {/* Welcome Showcase Banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-100/50 rounded-3xl p-5 border border-amber-100 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-3xl">
          🎉
        </div>
        <div className="flex-1">
          <h4 className="text-[15px] font-extrabold text-amber-900 leading-tight">Spesial Pengguna Baru</h4>
          <p className="text-[12px] text-amber-700/80 mt-1 leading-relaxed">
            Daftar sekarang dan nikmati voucher diskon belanja langsung yang otomatis ditambahkan ke akun Anda!
          </p>
        </div>
      </div>

      {/* Welcome Vouchers Showcase */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h3 className="font-serif text-base font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-3">
          ✨ Promo Voucher Pengguna Baru
        </h3>
        
        <div className="grid grid-cols-1 gap-3">
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-amber-200 bg-amber-50/20 p-4 flex items-center gap-3">
            <div className="text-3xl">💸</div>
            <div className="flex-1">
              <h5 className="text-[13px] font-bold text-gray-800">Diskon Potongan Rp 10.000</h5>
              <p className="text-[11px] text-gray-500 mt-0.5">Potongan langsung tanpa minimum transaksi untuk pembelian pertama.</p>
            </div>
            <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100/50 px-2 py-0.5 rounded-full uppercase">
              Welcome Pack
            </span>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-4 flex items-center gap-3 opacity-75">
            <div className="text-3xl">📐</div>
            <div className="flex-1">
              <h5 className="text-[13px] font-bold text-gray-800">Free Upgrade Size</h5>
              <p className="text-[11px] text-gray-500 mt-0.5">Nikmati upgrade ukuran cup gratis untuk minuman pilihan.</p>
            </div>
            <span className="text-[10px] font-extrabold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full uppercase">
              Milestone 2
            </span>
          </div>
        </div>
      </div>

      {/* Active Vouchers List */}
      <div>
        <h3 className="font-serif text-lg font-medium text-gray-800 mb-3 flex items-center gap-2">
          <Ticket className="w-5 h-5 text-[#B48A5E]" />
          Voucher Saya
        </h3>

        {activeVouchers.length === 0 ? (
          <div className="text-center py-10 px-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <Gift className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h4 className="font-serif text-base text-gray-800 mb-1">Belum Ada Voucher Aktif</h4>
            <p className="text-[12px] text-gray-500 max-w-xs mx-auto leading-relaxed">
              Kumpulkan poin pesanan Anda atau bawa tumbler sendiri untuk mendapatkan reward voucher eksklusif!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeVouchers.map((v, i) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex items-stretch"
              >
                {/* Left Side Tab Decorator */}
                <div className="w-12 bg-gradient-to-b from-[#B48A5E]/10 to-[#946F48]/10 flex flex-col items-center justify-center text-xl border-r border-dashed border-gray-100 relative">
                  {/* Decorative Scissors Notch */}
                  <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-[#FDFBF7] rounded-full border border-gray-100" />
                  <div className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-[#FDFBF7] rounded-full border border-gray-100" />
                  {getVoucherIcon(v.type)}
                </div>
                
                <div className="flex-1 p-4">
                  <h4 className="text-[14px] font-bold text-gray-800 leading-snug">{v.description}</h4>
                  <p className="text-[10px] text-gray-400 font-mono mt-1">Kode: {v.code.slice(0, 8).toUpperCase()}</p>
                  {v.expiresAt && (
                    <p className="text-[10px] text-amber-600 font-medium mt-1">
                      Berlaku sampai {new Date(v.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-center justify-center px-4 border-l border-gray-50 bg-gray-50/50">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                    Aktif
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
}
