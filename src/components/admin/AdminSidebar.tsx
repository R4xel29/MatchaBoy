'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Package, 
  FolderOpen,
  Users,
  Shield,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
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
  { label: 'Penjualan', href: '/admin/reports', icon: BarChart3 },
  { label: 'Laba Rugi', href: '/admin/reports/profit', icon: BarChart4 },
  { label: 'Pengeluaran (Expenses)', href: '/admin/expenses', icon: Receipt },
];

const PRODUCT_ITEMS = [
  { label: 'Produk', href: '/admin/products', icon: Package },
  { label: 'Kategori', href: '/admin/categories', icon: FolderOpen },
  { label: 'Inventory', href: '/admin/inventory', icon: Archive },
  { label: 'Promo Banners', href: '/admin/hero-banners', icon: ImageIcon },
  { label: 'Promo Popup', href: '/admin/promo-popups', icon: Megaphone },
  { label: 'Flash Sales', href: '/admin/flash-sales', icon: Flame },
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
];

function NavItem({ 
  item, 
  pathname, 
  onNavigate, 
  isSubItem = false,
  pendingCount = 0,
  isCollapsed = false
}: { 
  item: any; 
  pathname: string; 
  onNavigate?: () => void; 
  isSubItem?: boolean;
  pendingCount?: number;
  isCollapsed?: boolean;
}) {
  const isActive = pathname === item.href || 
    (item.href !== '/admin' && item.href !== '/admin/cashier' && pathname.startsWith(item.href));

  if (isCollapsed && !isSubItem) {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        title={item.label}
        className={`group relative flex items-center justify-center p-2.5 rounded-xl transition-all duration-200
          ${isActive 
            ? 'text-orange-600 bg-orange-50 font-semibold shadow-sm' 
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
      >
        <div className="relative flex items-center justify-center">
          <item.icon className={`w-[20px] h-[20px] transition-transform duration-200 ${isActive ? 'text-orange-600 scale-105' : 'text-slate-500 group-hover:scale-110'}`} />
          {item.hasBadge && pendingCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 z-20 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center border-2 border-white">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </div>
        {/* Tooltip flyout on hover */}
        <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 shadow-xl">
          {item.label}
        </div>
      </Link>
    );
  }
  
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
        ${isSubItem ? (isCollapsed ? 'px-3 py-2 text-xs' : 'ml-6') : ''}`}
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
  isCollapsed = false
}: {
  title: string;
  icon: any;
  items: any[];
  pathname: string;
  onNavigate?: () => void;
  pendingCount: number;
  isCollapsed?: boolean;
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

  if (isCollapsed) {
    return (
      <div className="relative group flex justify-center">
        <button
          className={`p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center relative
            ${hasActiveItem ? 'bg-orange-50 text-orange-600 font-semibold shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
        >
          <Icon className={`w-[20px] h-[20px] ${hasActiveItem ? 'text-orange-600' : 'text-slate-500 group-hover:scale-110'}`} />
          {hasActiveItem && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-orange-500" />
          )}
        </button>

        {/* Hover Flyout Dropdown Menu */}
        <div className="absolute left-full top-0 ml-3 hidden group-hover:block w-52 bg-white rounded-2xl p-2 shadow-xl border border-slate-100 z-50 transition-all duration-200">
          <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
            {title}
          </div>
          <div className="space-y-0.5">
            {items.map((item) => (
              <NavItem
                key={item.href}
                item={item}
                pathname={pathname}
                onNavigate={onNavigate}
                isSubItem={true}
                pendingCount={pendingCount}
                isCollapsed={false}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

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
                isCollapsed={false}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarContent({ 
  pathname, 
  onNavigate, 
  pendingCount,
  isCollapsed = false,
  onToggleCollapse
}: { 
  pathname: string; 
  onNavigate?: () => void; 
  pendingCount: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
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
      {/* Brand & Toggle Header */}
      <div className={`pt-6 pb-5 flex items-center ${isCollapsed ? 'flex-col gap-3 px-2 justify-center' : 'px-5 justify-between'}`}>
        <Link href="/admin" className="flex items-center gap-3" onClick={onNavigate}>
          <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center p-1.5 shadow-sm flex-shrink-0">
            <Image 
              src="/icons/arus.png" 
              alt="Arus Logo" 
              width={24} 
              height={24} 
              className="object-contain"
            />
          </div>
          {!isCollapsed && (
            <div>
              <span className="font-heading font-extrabold text-[18px] tracking-tight text-orange-500 inline-block">
                Arus
              </span>
              <span className="font-heading font-extrabold text-[18px] tracking-tight text-slate-800 inline-block">
                Hub
              </span>
            </div>
          )}
        </Link>

        {/* Desktop Toggle Button in Header */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Perluas Sidebar' : 'Kecilkan Sidebar'}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-slate-600" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-slate-500" />
            )}
          </button>
        )}
      </div>

      {/* Divider */}
      <div className={`${isCollapsed ? 'mx-2' : 'mx-5'} h-px bg-slate-100`} />

      {/* Navigation */}
      <nav className={`flex-1 py-5 space-y-2.5 overflow-y-auto scrollbar-hide ${isCollapsed ? 'px-2' : 'px-3'}`}>
        {/* Standalone Dashboard Item */}
        <NavItem
          item={MAIN_ITEMS[0]}
          pathname={pathname}
          onNavigate={onNavigate}
          isSubItem={false}
          pendingCount={pendingCount}
          isCollapsed={isCollapsed}
        />

        {/* Laporan & Transaksi Group */}
        <CollapsibleSection
          title="Laporan & Transaksi"
          icon={TrendingUp}
          items={MAIN_ITEMS.slice(1)}
          pathname={pathname}
          onNavigate={onNavigate}
          pendingCount={pendingCount}
          isCollapsed={isCollapsed}
        />

        {/* Kasir (POS) Group */}
        <CollapsibleSection
          title="Kasir (POS)"
          icon={MonitorSmartphone}
          items={CASHIER_ITEMS}
          pathname={pathname}
          onNavigate={onNavigate}
          pendingCount={pendingCount}
          isCollapsed={isCollapsed}
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
              isCollapsed={isCollapsed}
            />

            {/* Loyalty & Referral Section */}
            <CollapsibleSection
              title="Loyalty & Referral"
              icon={Gift}
              items={LOYALTY_ITEMS}
              pathname={pathname}
              onNavigate={onNavigate}
              pendingCount={pendingCount}
              isCollapsed={isCollapsed}
            />

            {/* Delivery Section */}
            <CollapsibleSection
              title="Delivery"
              icon={Truck}
              items={DELIVERY_ITEMS}
              pathname={pathname}
              onNavigate={onNavigate}
              pendingCount={pendingCount}
              isCollapsed={isCollapsed}
            />

            {/* Fitur Pelanggan Section */}
            <CollapsibleSection
              title="Fitur Pelanggan"
              icon={Users}
              items={CUSTOMER_FEATURE_ITEMS}
              pathname={pathname}
              onNavigate={onNavigate}
              pendingCount={pendingCount}
              isCollapsed={isCollapsed}
            />

            {/* Engagement Section */}
            <CollapsibleSection
              title="Engagement"
              icon={Trophy}
              items={ENGAGEMENT_ITEMS}
              pathname={pathname}
              onNavigate={onNavigate}
              pendingCount={pendingCount}
              isCollapsed={isCollapsed}
            />

            {/* Kolaborasi Section */}
            <CollapsibleSection
              title="Kolaborasi"
              icon={UsersRound}
              items={COLLABORATION_ITEMS}
              pathname={pathname}
              onNavigate={onNavigate}
              pendingCount={pendingCount}
              isCollapsed={isCollapsed}
            />

            {/* Keamanan & Akun Section */}
            <CollapsibleSection
              title="Keamanan & Akun"
              icon={Shield}
              items={USER_ITEMS}
              pathname={pathname}
              onNavigate={onNavigate}
              pendingCount={pendingCount}
              isCollapsed={isCollapsed}
            />

            {/* Pengaturan Section */}
            <CollapsibleSection
              title="Pengaturan"
              icon={Settings}
              items={SETTING_ITEMS}
              pathname={pathname}
              onNavigate={onNavigate}
              pendingCount={pendingCount}
              isCollapsed={isCollapsed}
            />
          </>
        )}
      </nav>

      {/* User Card + Logout */}
      <div className={`border-t border-slate-100 bg-slate-50/30 ${isCollapsed ? 'p-2 flex flex-col items-center gap-2' : 'p-4'}`}>
        {!isCollapsed ? (
          <>
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
          </>
        ) : (
          <>
            <div 
              title={`${userName} (${userRole === 'CASHIER' ? 'Kasir' : 'Administrator'})`}
              className="w-8 h-8 rounded-lg bg-orange-500 text-white text-xs font-bold flex items-center justify-center shadow-sm"
            >
              {userName.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100" />

      {/* Bottom Toggle / Close Sidebar Button */}
      <div className={isCollapsed ? 'p-2 flex justify-center' : 'p-4'}>
        <button
          onClick={onToggleCollapse || onNavigate || (() => {})}
          title={isCollapsed ? 'Perluas sidebar' : 'Kecilkan / tutup sidebar'}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-full border border-slate-200 text-[13px] font-medium text-slate-600 bg-white hover:bg-slate-50 transition-colors ${isCollapsed ? 'w-10 h-10 p-0' : 'w-full'}`}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-slate-600" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 text-slate-500" />
              <span>Kecilkan sidebar</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function AdminSidebar({
  isCollapsed = false,
  onToggleCollapse
}: {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const prevPendingCountRef = useRef(0);
  const globalAlarmAudioRef = useRef<HTMLAudioElement | null>(null);

  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await fetch('/api/cashier/orders/pending-count');
      const data = await res.json();
      const newCount = data.count || 0;

      // If new order arrived while NOT on the orders page, play alarm chime
      if (newCount > prevPendingCountRef.current && prevPendingCountRef.current !== 0 && pathname !== '/admin/cashier/orders') {
        try {
          if (!globalAlarmAudioRef.current) {
            globalAlarmAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          }
          globalAlarmAudioRef.current.play().catch(() => {});
        } catch {}
      }

      prevPendingCountRef.current = newCount;
      setPendingCount(newCount);
    } catch {}
  }, [pathname]);

  useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 6000); // Check every 6 seconds
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
              <SidebarContent 
                pathname={pathname} 
                onNavigate={() => setMobileOpen(false)} 
                pendingCount={pendingCount}
                isCollapsed={false}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside 
        className={`hidden lg:flex fixed inset-y-0 left-0 bg-white border-r border-slate-100 flex-col z-50 shadow-sm transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-[76px]' : 'w-[260px]'
        }`}
      >
        <SidebarContent 
          pathname={pathname} 
          pendingCount={pendingCount} 
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
        />
      </aside>
    </>
  );
}
