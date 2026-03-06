'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  FolderOpen,
  Users,
  LogOut,
  Leaf,
  Menu,
  X
} from 'lucide-react';
import { signOut } from 'next-auth/react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { label: 'Products', href: '/admin/products', icon: Package },
  { label: 'Categories', href: '/admin/categories', icon: FolderOpen },
  { label: 'Customers', href: '/admin/customers', icon: Users },
];

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-border/50">
        <Link href="/admin" className="flex items-center gap-2 touch-target" onClick={onNavigate}>
          <div className="w-8 h-8 rounded-lg gradient-matcha flex items-center justify-center text-white">
            <Leaf className="w-4 h-4" />
          </div>
          <span className="font-heading font-bold text-lg tracking-tight">
            Mattchaboy<span className="text-matcha-600">.</span> Admin
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors touch-target relative
                ${isActive ? 'text-matcha-700' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
            >
              {isActive && (
                <motion.div
                  layoutId="admin-active-nav"
                  className="absolute inset-0 bg-matcha-50 rounded-xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <item.icon className={`w-4 h-4 relative z-10 ${isActive ? 'text-matcha-600' : ''}`} />
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-border/50">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors touch-target"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-card border-b border-border/50 flex items-center px-4 gap-3">
        <button onClick={() => setMobileOpen(true)} className="p-2 hover:bg-muted rounded-lg transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg gradient-matcha flex items-center justify-center text-white">
            <Leaf className="w-3.5 h-3.5" />
          </div>
          <span className="font-heading font-bold text-sm">Mattchaboy Admin</span>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className="lg:hidden fixed inset-y-0 left-0 z-[61] w-72 bg-card flex flex-col shadow-2xl"
            >
              <div className="absolute top-3 right-3">
                <button onClick={() => setMobileOpen(false)} className="p-1.5 hover:bg-muted rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <SidebarContent pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-card border-r border-border/50 flex-col z-50">
        <SidebarContent pathname={pathname} />
      </aside>
    </>
  );
}
