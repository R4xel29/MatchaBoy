'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatRupiah } from '@/lib/utils';

// Using real data passed from Server Component
type OrderShape = {
  id: string;
  date: string;
  items: string;
  total: number;
  status: string;
};

type UserShape = {
  name: string;
  phone: string;
  points: number;
  totalOrders: number;
  memberSince: string;
};

const MENU_ITEMS = [
  { icon: Package, label: 'Pesanan Saya', href: '#orders', badge: '3' },
  { icon: Heart, label: 'Favorit', href: '#', badge: null },
  { icon: MapPin, label: 'Alamat Tersimpan', href: '#', badge: null },
  { icon: Bell, label: 'Notifikasi', href: '#', badge: '2' },
  { icon: Settings, label: 'Pengaturan', href: '#', badge: null },
];

export default function ProfileClient({
  user,
  orders
}: {
  user: UserShape;
  orders: OrderShape[];
}) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<'menu' | 'orders'>('menu');

  return (
    <div className="min-h-dvh bg-background pb-safe">
      {/* Header */}
      <header className="gradient-matcha text-white pt-safe">
        <div className="flex items-center gap-3 px-4 py-3 max-w-2xl mx-auto">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full 
              bg-white/10 hover:bg-white/20 transition-colors touch-target"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-heading font-bold text-lg">Profile</h1>
        </div>

        {/* Profile Card */}
        <div className="px-4 pb-6 pt-2 max-w-2xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
              <User className="w-8 h-8 text-white/80" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-xl">{user.name}</h2>
              <p className="text-sm text-matcha-200">{user.phone}</p>
              <p className="text-xs text-matcha-300 mt-0.5">Member sejak {user.memberSince}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label: 'Total Order', value: user.totalOrders.toString() },
              { label: 'Poin', value: user.points.toString() },
              { label: 'Level', value: user.points > 100 ? '🍵 Gold' : '🌱 Green' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="text-center py-2.5 rounded-xl bg-white/10 backdrop-blur-sm"
              >
                <p className="font-bold text-lg">{stat.value}</p>
                <p className="text-[10px] text-matcha-200">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4 -mt-3">
        {/* Menu Items */}
        <div className="rounded-2xl bg-card border border-border/50 overflow-hidden divide-y divide-border/30">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                if (item.href === '#orders') setActiveSection('orders');
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 
                hover:bg-muted/50 transition-colors touch-target"
            >
              <div className="w-9 h-9 rounded-xl bg-matcha-50 flex items-center justify-center">
                <item.icon className="w-4 h-4 text-matcha-600" />
              </div>
              <span className="flex-1 text-sm font-medium text-foreground text-left">
                {item.label}
              </span>
              {item.badge && (
                <span className="px-2 py-0.5 rounded-full bg-matcha-100 text-matcha-700 text-[10px] font-bold">
                  {item.badge}
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Order History */}
        {activeSection === 'orders' && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3 className="font-heading font-bold text-base mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-matcha-600" />
              Riwayat Pesanan
            </h3>
            <div className="space-y-2">
              {orders.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                  Belum ada pesanan. Yuk, order matcha favoritmu!
                </div>
              )}
              {orders.map((order, i) => (
                <motion.button
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => router.push(`/orders/${order.id}`)}
                  className="w-full text-left px-4 py-3.5 rounded-xl bg-card border border-border/50
                    hover:border-matcha-300 hover:shadow-sm transition-all touch-target"
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-mono text-xs font-bold text-matcha-700">{order.id.slice(0,8).toUpperCase()}</p>
                    <span className="px-2 py-0.5 rounded-full bg-green-50 border border-green-200 
                      text-[9px] font-bold text-green-700 uppercase">
                      {order.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{order.items}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[10px] text-muted-foreground">{order.date}</p>
                    <p className="text-sm font-bold text-foreground">{formatRupiah(order.total)}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.section>
        )}

        {/* Logout */}
        <button 
          onClick={async () => {
             await signOut({ redirect: false });
             router.push('/');
             router.refresh();
          }}
          className="w-full flex items-center justify-center gap-2 py-3.5 
          rounded-xl border border-red-200 bg-red-50/50
          text-sm font-medium text-red-600 hover:bg-red-50 transition-colors touch-target">
          <LogOut className="w-4 h-4" />
          Keluar
        </button>
      </div>
    </div>
  );
}
