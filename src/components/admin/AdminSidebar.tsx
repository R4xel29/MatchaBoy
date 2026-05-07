'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  FolderOpen,
  Users,
  Shield,
  LogOut,
  Leaf,
  Menu,
  X,
  ChevronRight,
  ClipboardList,
  Image as ImageIcon,
  MonitorSmartphone,
  Clock,
  Receipt,
  Gift,
  Share2,
  Bell,
  Store,
  BarChart3,
  CreditCard,
  Settings
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import Image from 'next/image';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Laporan Penjualan', href: '/admin/reports', icon: BarChart3 },
  { label: 'Products', href: '/admin/products', icon: Package },
  { label: 'Promo Banners', href: '/admin/hero-banners', icon: ImageIcon },
  { label: 'Categories', href: '/admin/categories', icon: FolderOpen },
  { label: 'Notifikasi', href: '/admin/notifications', icon: Bell },
  { label: 'Pengguna', href: '/admin/customers', icon: Users },
  { label: 'Admin & Staf', href: '/admin/users', icon: Shield },
  { label: 'Payment Settings', href: '/admin/payment-settings', icon: CreditCard },
  { label: 'Store Settings', href: '/admin/store-settings', icon: Store },
  { label: 'Activity Logs', href: '/admin/logs', icon: ClipboardList },
];

const LOYALTY_ITEMS = [
  { label: 'Loyalty Settings', href: '/admin/loyalty', icon: Gift },
  { label: 'Referral Settings', href: '/admin/referral-settings', icon: Settings },
  { label: 'Referral Tracking', href: '/admin/referrals', icon: Share2 },
];

const CASHIER_ITEMS = [
  { label: 'Kasir (POS)', href: '/admin/cashier', icon: MonitorSmartphone },
  { label: 'Pesanan Hari Ini', href: '/admin/cashier/orders', icon: Receipt, hasBadge: true },
  { label: 'Tambah Poin', href: '/admin/cashier/add-points', icon: Gift },
  { label: 'Shift', href: '/admin/cashier/shift', icon: Clock },
];

function SidebarContent({ pathname, onNavigate, pendingCount }: { pathname: string; onNavigate?: () => void; pendingCount: number }) {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 pt-7 pb-6">
        <Link href="/admin" className="flex items-center gap-3" onClick={onNavigate}>
          <div className="w-10 h-10 rounded-2xl bg-matcha-700/5 flex items-center justify-center shadow-lg shadow-matcha-700/10 overflow-hidden p-1.5 border border-matcha-700/10 backdrop-blur-sm">
            <Image 
              src="/icons/matcha.webp" 
              alt="Matchaboy Logo" 
              width={28} 
              height={28} 
              className="object-contain"
            />
          </div>
          <div>
            <span className="font-heading font-bold text-[17px] tracking-tight text-foreground block leading-tight">
              Matchaboy
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-matcha-600">
              Admin Panel
            </span>
          </div>
        </Link>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-gradient-to-r from-border via-border/50 to-transparent" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
          Menu
        </p>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/admin' && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 relative
                ${isActive 
                  ? 'text-white' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
            >
              {isActive && (
                <motion.div
                  layoutId="admin-nav-pill"
                  className="absolute inset-0 gradient-matcha rounded-xl shadow-md shadow-matcha-700/15"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <item.icon className={`w-[18px] h-[18px] relative z-10 transition-transform duration-200
                ${isActive ? 'text-white' : 'text-muted-foreground group-hover:text-matcha-600 group-hover:scale-110'}`} 
              />
              <span className="relative z-10 flex-1">{item.label}</span>
              {isActive && (
                <ChevronRight className="w-3.5 h-3.5 relative z-10 text-white/60" />
              )}
            </Link>
          );
        })}

        {/* Cashier Section */}
        <div className="mx-3 my-3 h-px bg-gradient-to-r from-border via-border/50 to-transparent" />
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-amber-600/70">
          Kasir
        </p>
        {CASHIER_ITEMS.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/admin/cashier' && pathname.startsWith(item.href));
          const showBadge = (item as any).hasBadge && pendingCount > 0;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 relative
                ${isActive 
                  ? 'text-white' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
            >
              {isActive && (
                <motion.div
                  layoutId="admin-nav-pill"
                  className="absolute inset-0 bg-gradient-to-r from-amber-600 to-amber-500 rounded-xl shadow-md shadow-amber-700/15"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <div className="relative">
                <item.icon className={`w-[18px] h-[18px] relative z-10 transition-transform duration-200
                  ${isActive ? 'text-white' : 'text-muted-foreground group-hover:text-amber-600 group-hover:scale-110'}`} 
                />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 z-20 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </div>
              <span className="relative z-10 flex-1">{item.label}</span>
              {isActive && (
                <ChevronRight className="w-3.5 h-3.5 relative z-10 text-white/60" />
              )}
            </Link>
          );
        })}

        {/* Loyalty Section */}
        <div className="mx-3 my-3 h-px bg-gradient-to-r from-border via-border/50 to-transparent" />
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-600/70">
          Loyalty & Referral
        </p>
        {LOYALTY_ITEMS.map((item) => {
          const isActive = pathname === item.href || 
            pathname.startsWith(item.href + '/');
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 relative
                ${isActive 
                  ? 'text-white' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
            >
              {isActive && (
                <motion.div
                  layoutId="admin-nav-pill"
                  className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-xl shadow-md shadow-emerald-700/15"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <item.icon className={`w-[18px] h-[18px] relative z-10 transition-transform duration-200
                ${isActive ? 'text-white' : 'text-muted-foreground group-hover:text-emerald-600 group-hover:scale-110'}`} 
              />
              <span className="relative z-10 flex-1">{item.label}</span>
              {isActive && (
                <ChevronRight className="w-3.5 h-3.5 relative z-10 text-white/60" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Card + Logout */}
      <div className="p-3 mt-auto">
        <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg gradient-matcha flex items-center justify-center text-white text-xs font-bold shadow-sm">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">Admin</p>
              <p className="text-[10px] text-muted-foreground truncate">Administrator</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[12px] font-semibold text-rose-600 bg-rose-50/80 hover:bg-rose-100 border border-rose-200/50 transition-all duration-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await fetch('/api/cashier/orders/pending-count');
      const data = await res.json();
      setPendingCount(data.count || 0);
    } catch {}
  }, []);

  useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [fetchPendingCount]);

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 glass border-b border-border/30 flex items-center px-4 gap-3">
        <button 
          onClick={() => setMobileOpen(true)} 
          className="p-2 hover:bg-muted/60 rounded-xl transition-colors active:scale-95 relative"
        >
          <Menu className="w-5 h-5" />
          {pendingCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 border border-white animate-pulse" />
          )}
        </button>
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-8 h-8 rounded-xl bg-matcha-700/5 flex items-center justify-center shadow-sm overflow-hidden p-1 border border-matcha-700/10">
            <Image 
              src="/icons/matcha.webp" 
              alt="Matchaboy Logo" 
              width={20} 
              height={20} 
              className="object-contain"
            />
          </div>
          <span className="font-heading font-bold text-sm tracking-tight text-foreground/90">Matchaboy</span>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="lg:hidden fixed inset-y-0 left-0 z-[61] w-[280px] bg-card flex flex-col shadow-2xl border-r border-border/30"
            >
              <button 
                onClick={() => setMobileOpen(false)} 
                className="absolute top-5 right-4 p-1.5 hover:bg-muted rounded-lg z-10"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
              <SidebarContent pathname={pathname} onNavigate={() => setMobileOpen(false)} pendingCount={pendingCount} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[260px] bg-card/80 backdrop-blur-xl border-r border-border/30 flex-col z-50">
        <SidebarContent pathname={pathname} pendingCount={pendingCount} />
      </aside>
    </>
  );
}
