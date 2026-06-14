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
  HelpCircle,
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
  Settings,
  Truck,
  Archive,
  BarChart4,
  UserX,
  Ticket,
  Megaphone,
  Flame,
  Wallet,
  Crown,
  RefreshCcw,
  Cake,
  BellRing,
  Swords,
  Trophy,
  Dices,
  Star,
  ChefHat,
  UsersRound,
  Music,
  TrendingUp,
  Layers
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';

const MAIN_ITEMS = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Analisis & KPI', href: '/admin/analytics', icon: TrendingUp },
  { label: 'Semua Pesanan', href: '/admin/orders', icon: ClipboardList },
  { label: 'Laba Rugi', href: '/admin/reports/profit', icon: BarChart4 },
  { label: 'Penjualan', href: '/admin/reports', icon: BarChart3 },
];

const PRODUCT_ITEMS = [
  { label: 'Produk', href: '/admin/products', icon: Package },
  { label: 'Kategori', href: '/admin/categories', icon: FolderOpen },
  { label: 'Inventory', href: '/admin/inventory', icon: Archive },
  { label: 'Promo Banners', href: '/admin/hero-banners', icon: ImageIcon },
  { label: 'Promo Popup', href: '/admin/promo-popups', icon: Megaphone },
  { label: 'Flash Sales', href: '/admin/flash-sales', icon: Flame },
];

const FINANCE_ITEMS = [
  { label: 'Pengeluaran (Expenses)', href: '/admin/expenses', icon: Receipt },
];

const USER_ITEMS = [
  { label: 'Pelanggan', href: '/admin/customers', icon: Users },
  { label: 'Admin & Staf', href: '/admin/users', icon: Shield },
  { label: 'Blacklist Akun', href: '/admin/blacklist', icon: UserX },
  { label: 'Log Aktivitas', href: '/admin/logs', icon: ClipboardList },
];

const SETTING_ITEMS = [
  { label: 'Pengaturan Toko', href: '/admin/store-settings', icon: Store },
  { label: 'Layout Meja (Dine-in)', href: '/admin/tables', icon: Layers },
  { label: 'Metode Pembayaran', href: '/admin/payment-settings', icon: CreditCard },
  { label: 'Notifikasi', href: '/admin/notifications', icon: Bell },
  { label: 'Pusat Bantuan FAQ', href: '/admin/help-center', icon: HelpCircle },
  { label: 'Laporan & Tiket', href: '/admin/tickets', icon: ClipboardList },
];

const LOYALTY_ITEMS = [
  { label: 'Kelola Voucher', href: '/admin/vouchers', icon: Ticket },
  { label: 'Loyalty Settings', href: '/admin/loyalty', icon: Gift },
  { label: 'Kelola Referral', href: '/admin/referrals', icon: Share2 },
];

const DELIVERY_ITEMS = [
  { label: 'Kelola Kurir', href: '/admin/drivers', icon: Truck },
];

const CUSTOMER_FEATURE_ITEMS = [
  { label: 'Wallet', href: '/admin/wallet', icon: Wallet },
  { label: 'Subscription Club', href: '/admin/subscriptions', icon: Crown },
  { label: 'Gift Card', href: '/admin/gift-cards', icon: Gift },
  { label: 'Auto-Reorder', href: '/admin/auto-reorder', icon: RefreshCcw },
  { label: 'Birthday Program', href: '/admin/birthday', icon: Cake },
  { label: 'Notify Me', href: '/admin/notify-me', icon: BellRing },
];

const ENGAGEMENT_ITEMS = [
  { label: 'Quest & Misi', href: '/admin/quests', icon: Swords },
  { label: 'Leaderboard', href: '/admin/leaderboard', icon: Trophy },
  { label: 'Lucky Draw', href: '/admin/gacha', icon: Dices },
  { label: 'Moderasi Review', href: '/admin/reviews', icon: Star },
  { label: 'Custom Recipes', href: '/admin/custom-recipes', icon: ChefHat },
  { label: 'Matcha Vibes BGM', href: '/admin/bgm', icon: Music },
];

const COLLABORATION_ITEMS = [
  { label: 'Group Orders', href: '/admin/group-orders', icon: UsersRound },
];

const CASHIER_ITEMS = [
  { label: 'Kasir (POS)', href: '/admin/cashier', icon: MonitorSmartphone },
  { label: 'Pesanan Hari Ini', href: '/admin/cashier/orders', icon: Receipt, hasBadge: true },
  { label: 'Tambah Poin', href: '/admin/cashier/add-points', icon: Gift },
  { label: 'Shift', href: '/admin/cashier/shift', icon: Clock },
];

function NavItem({ 
  item, 
  pathname, 
  onNavigate, 
  isSubItem = false,
  pendingCount = 0
}: { 
  item: any; 
  pathname: string; 
  onNavigate?: () => void; 
  isSubItem?: boolean;
  pendingCount?: number;
}) {
  const isActive = pathname === item.href || 
    (item.href !== '/admin' && item.href !== '/admin/cashier' && pathname.startsWith(item.href));
  
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`group flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 relative
        ${isActive 
          ? isSubItem
            ? 'text-white bg-gradient-to-r from-orange-500 to-amber-500 shadow-md shadow-orange-500/10 font-semibold'
            : 'text-orange-600 bg-orange-50/80 font-semibold'
          : isSubItem
            ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/80'
            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50/80'
        }
        ${isSubItem ? 'ml-6' : ''}`}
    >
      <div className="relative">
        <item.icon className={`w-[18px] h-[18px] transition-transform duration-200
          ${isActive 
            ? isSubItem 
              ? 'text-white' 
              : 'text-orange-600' 
            : 'text-slate-500 group-hover:scale-105 group-hover:text-slate-700'}`} 
        />
        {item.hasBadge && pendingCount > 0 && (
          <span className={`absolute -top-1.5 -right-1.5 z-20 w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center border-2 shadow-sm
            ${isActive && isSubItem 
              ? 'bg-white text-orange-600 border-orange-500' 
              : 'bg-red-500 text-white border-white'}`}
          >
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </div>
      <span className="flex-1 truncate">{item.label}</span>
      {isActive && !isSubItem && (
        <ChevronRight className="w-3.5 h-3.5 text-orange-600" />
      )}
    </Link>
  );
}

function CollapsibleSection({
  title,
  icon: Icon,
  items,
  pathname,
  onNavigate,
  pendingCount,
}: {
  title: string;
  icon: any;
  items: any[];
  pathname: string;
  onNavigate?: () => void;
  pendingCount: number;
}) {
  const hasActiveItem = items.some(item => {
    return pathname === item.href || (item.href !== '/admin' && item.href !== '/admin/cashier' && pathname.startsWith(item.href));
  });

  const [isOpen, setIsOpen] = useState(hasActiveItem);

  useEffect(() => {
    if (hasActiveItem) {
      setIsOpen(true);
    }
  }, [hasActiveItem]);

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 text-left hover:bg-slate-50 group
          ${hasActiveItem ? 'text-slate-900 font-semibold' : 'text-slate-700'}`}
      >
        <div className="flex items-center gap-3">
          <Icon className="w-[18px] h-[18px] text-slate-500 group-hover:text-slate-700" />
          <span>{title}</span>
        </div>
        <ChevronRight 
          className={`w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
        />
      </button>
      
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden space-y-0.5"
          >
            {items.map((item) => (
              <NavItem
                key={item.href}
                item={item}
                pathname={pathname}
                onNavigate={onNavigate}
                isSubItem={true}
                pendingCount={pendingCount}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarContent({ pathname, onNavigate, pendingCount }: { pathname: string; onNavigate?: () => void; pendingCount: number }) {
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = session?.user?.role || 'ADMIN';
  const userName = session?.user?.name || 'Admin';
  const isAdmin = userRole === 'ADMIN';

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Brand */}
      <div className="px-5 pt-7 pb-6">
        <Link href="/admin" className="flex items-center gap-3" onClick={onNavigate}>
          <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center p-1.5 shadow-sm">
            <Image 
              src="/icons/arus.png" 
              alt="Arus Logo" 
              width={24} 
              height={24} 
              className="object-contain"
            />
          </div>
          <div>
            <span className="font-heading font-extrabold text-[18px] tracking-tight text-orange-500 inline-block">
              Arus
            </span>
            <span className="font-heading font-extrabold text-[18px] tracking-tight text-slate-800 inline-block">
              Hub
            </span>
          </div>
        </Link>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-slate-100" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-2.5 overflow-y-auto custom-scrollbar">
        {/* Standalone Dashboard Item */}
        <NavItem
          item={MAIN_ITEMS[0]}
          pathname={pathname}
          onNavigate={onNavigate}
          isSubItem={false}
          pendingCount={pendingCount}
        />

        {/* Laporan & Transaksi Group */}
        <CollapsibleSection
          title="Laporan & Transaksi"
          icon={TrendingUp}
          items={MAIN_ITEMS.slice(1)}
          pathname={pathname}
          onNavigate={onNavigate}
          pendingCount={pendingCount}
        />

        {/* Kasir (POS) Group */}
        <CollapsibleSection
          title="Kasir (POS)"
          icon={MonitorSmartphone}
          items={CASHIER_ITEMS}
          pathname={pathname}
          onNavigate={onNavigate}
          pendingCount={pendingCount}
        />

        {/* Admin-only sections */}
        {isAdmin && (
          <>
            {/* Manajemen Produk Section */}
            <CollapsibleSection
              title="Manajemen Produk"
              icon={Package}
              items={PRODUCT_ITEMS}
              pathname={pathname}
              onNavigate={onNavigate}
              pendingCount={pendingCount}
            />

            {/* Keuangan Section */}
            <CollapsibleSection
              title="Keuangan"
              icon={Receipt}
              items={FINANCE_ITEMS}
              pathname={pathname}
              onNavigate={onNavigate}
              pendingCount={pendingCount}
            />

            {/* Loyalty & Referral Section */}
            <CollapsibleSection
              title="Loyalty & Referral"
              icon={Gift}
              items={LOYALTY_ITEMS}
              pathname={pathname}
              onNavigate={onNavigate}
              pendingCount={pendingCount}
            />

            {/* Delivery Section */}
            <CollapsibleSection
              title="Delivery"
              icon={Truck}
              items={DELIVERY_ITEMS}
              pathname={pathname}
              onNavigate={onNavigate}
              pendingCount={pendingCount}
            />

            {/* Fitur Pelanggan Section */}
            <CollapsibleSection
              title="Fitur Pelanggan"
              icon={Users}
              items={CUSTOMER_FEATURE_ITEMS}
              pathname={pathname}
              onNavigate={onNavigate}
              pendingCount={pendingCount}
            />

            {/* Engagement Section */}
            <CollapsibleSection
              title="Engagement"
              icon={Trophy}
              items={ENGAGEMENT_ITEMS}
              pathname={pathname}
              onNavigate={onNavigate}
              pendingCount={pendingCount}
            />

            {/* Kolaborasi Section */}
            <CollapsibleSection
              title="Kolaborasi"
              icon={UsersRound}
              items={COLLABORATION_ITEMS}
              pathname={pathname}
              onNavigate={onNavigate}
              pendingCount={pendingCount}
            />

            {/* Keamanan & Akun Section */}
            <CollapsibleSection
              title="Keamanan & Akun"
              icon={Shield}
              items={USER_ITEMS}
              pathname={pathname}
              onNavigate={onNavigate}
              pendingCount={pendingCount}
            />

            {/* Pengaturan Section */}
            <CollapsibleSection
              title="Pengaturan"
              icon={Settings}
              items={SETTING_ITEMS}
              pathname={pathname}
              onNavigate={onNavigate}
              pendingCount={pendingCount}
            />
          </>
        )}
      </nav>

      {/* User Card + Logout */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/30">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500 text-white text-xs font-bold flex items-center justify-center shadow-sm">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">{userName}</p>
            <p className="text-[10px] text-slate-500 truncate">{userRole === 'CASHIER' ? 'Kasir' : 'Administrator'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[12px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100/70 border border-rose-100 transition-all duration-200"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100" />

      {/* Close Sidebar Button */}
      <div className="p-4">
        <button
          onClick={onNavigate || (() => {})}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-2 rounded-full border border-slate-200 text-[13px] font-medium text-slate-600 bg-white hover:bg-slate-50 transition-colors"
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-8a2 2 0 00-2 2" />
          </svg>
          Close sidebar
        </button>
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
          <div className="w-8 h-8 rounded-xl bg-brand-700/5 flex items-center justify-center shadow-sm overflow-hidden p-1 border border-brand-700/10">
            <Image 
              src="/icons/arus.png" 
              alt="Arus Logo" 
              width={20} 
              height={20} 
              className="object-contain"
            />
          </div>
          <span className="font-heading font-bold text-sm tracking-tight text-foreground/90">Arus</span>
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
              className="lg:hidden fixed inset-y-0 left-0 z-[61] w-[280px] bg-white flex flex-col shadow-2xl border-r border-slate-100"
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
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[260px] bg-white border-r border-slate-100 flex-col z-50 shadow-sm">
        <SidebarContent pathname={pathname} pendingCount={pendingCount} />
      </aside>
    </>
  );
}
