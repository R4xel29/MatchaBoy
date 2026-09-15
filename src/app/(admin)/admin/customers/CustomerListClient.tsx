'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { 
  Users, 
  Sparkles, 
  Trophy, 
  Wallet, 
  Search, 
  X, 
  Filter, 
  ArrowUpDown, 
  Copy, 
  Check, 
  ExternalLink, 
  MessageSquare, 
  Phone, 
  Mail, 
  ChevronRight, 
  ShieldCheck, 
  ShoppingBag,
  RotateCcw
} from 'lucide-react';
import RoleSelect from '../users/role-select';
import ImpersonateButton from '../users/impersonate-button';
import { UrlPagination } from '@/components/ui/UrlPagination';
import CreateCustomerModal from './CreateCustomerModal';

interface CustomerItem {
  id: string;
  slug: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  points: number;
  walletBalance: number;
  arusLevel: string;
  referralCode: string;
  createdAt: string | Date;
  _count: { orders: number };
}

interface CustomerListClientProps {
  customers: CustomerItem[];
  stats: {
    totalCustomers: number;
    newCustomers: number;
    totalPoints: number;
    totalWallet: number;
  };
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
  };
  filters: {
    search: string;
    arusLevel: string;
    orderStatus: string;
    sortBy: string;
  };
}

export default function CustomerListClient({
  customers,
  stats,
  pagination,
  filters,
}: CustomerListClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(filters.search);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const updateFilters = (newFilters: Partial<typeof filters>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1'); // Reset to page 1 on filter change

    if (newFilters.search !== undefined) {
      if (newFilters.search) params.set('search', newFilters.search);
      else params.delete('search');
    }

    if (newFilters.arusLevel !== undefined) {
      if (newFilters.arusLevel && newFilters.arusLevel !== 'ALL') params.set('arusLevel', newFilters.arusLevel);
      else params.delete('arusLevel');
    }

    if (newFilters.orderStatus !== undefined) {
      if (newFilters.orderStatus && newFilters.orderStatus !== 'ALL') params.set('orderStatus', newFilters.orderStatus);
      else params.delete('orderStatus');
    }

    if (newFilters.sortBy !== undefined) {
      if (newFilters.sortBy && newFilters.sortBy !== 'newest') params.set('sortBy', newFilters.sortBy);
      else params.delete('sortBy');
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: search.trim() });
  };

  const resetAllFilters = () => {
    setSearch('');
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasActiveFilters = !!(filters.search || filters.arusLevel || filters.orderStatus || (filters.sortBy && filters.sortBy !== 'newest'));

  return (
    <div className="space-y-6">
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">Pengelolaan Akun Pelanggan</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Kelola data member, poin loyalitas, saldo dompet, dan identitas unik pelanggan Arum Seduh
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CreateCustomerModal />
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Pelanggan */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-orange-100 shadow-[0_4px_20px_rgba(234,88,12,0.04)] relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-bl-full pointer-events-none transition-transform group-hover:scale-110"></div>
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Pelanggan</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-foreground">{stats.totalCustomers.toLocaleString('id-ID')}</p>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1">Akun customer terdaftar</p>
        </div>

        {/* Pelanggan Baru 30 Hari */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-amber-100 shadow-[0_4px_20px_rgba(217,119,6,0.04)] relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full pointer-events-none transition-transform group-hover:scale-110"></div>
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">Member Baru</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-600">+{stats.newCustomers.toLocaleString('id-ID')}</p>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1">30 hari terakhir</p>
        </div>

        {/* Total Poin Beredar */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-orange-100 shadow-[0_4px_20px_rgba(234,88,12,0.04)] relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-bl-full pointer-events-none transition-transform group-hover:scale-110"></div>
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">Poin Beredar</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-foreground">{stats.totalPoints.toLocaleString('id-ID')}</p>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1">Poin loyalitas aktif</p>
        </div>

        {/* Total Saldo Dompet */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-amber-100 shadow-[0_4px_20px_rgba(217,119,6,0.04)] relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full pointer-events-none transition-transform group-hover:scale-110"></div>
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">Saldo Dompet</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-foreground">Rp {stats.totalWallet.toLocaleString('id-ID')}</p>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1">Total deposit pelanggan</p>
        </div>
      </div>

      {/* Toolbar: Search, Filters & Sorting */}
      <div className="bg-white p-4 rounded-2xl sm:rounded-3xl border border-border/40 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, email, nomor HP, slug (@handle), atau ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-20 py-2.5 text-xs sm:text-sm bg-muted/20 border border-border/60 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-foreground"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  updateFilters({ search: '' });
                }}
                className="absolute right-12 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 text-xs font-bold transition-colors"
            >
              Cari
            </button>
          </form>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Arus Level Filter */}
            <div className="flex items-center gap-1.5 bg-muted/20 border border-border/60 rounded-xl px-3 py-1.5 text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
              <select
                value={filters.arusLevel || 'ALL'}
                onChange={(e) => updateFilters({ arusLevel: e.target.value })}
                className="bg-transparent border-none text-foreground font-medium focus:outline-none cursor-pointer pr-2"
              >
                <option value="ALL">Semua Level</option>
                <option value="Tunas Arus">Tunas Arus</option>
                <option value="Kuncup Arus">Kuncup Arus</option>
                <option value="Mekar Arus">Mekar Arus</option>
                <option value="Pohon Arus">Pohon Arus</option>
              </select>
            </div>

            {/* Order Activity Filter */}
            <div className="flex items-center gap-1.5 bg-muted/20 border border-border/60 rounded-xl px-3 py-1.5 text-xs">
              <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
              <select
                value={filters.orderStatus || 'ALL'}
                onChange={(e) => updateFilters({ orderStatus: e.target.value })}
                className="bg-transparent border-none text-foreground font-medium focus:outline-none cursor-pointer pr-2"
              >
                <option value="ALL">Semua Aktivitas</option>
                <option value="has_orders">Pernah Order</option>
                <option value="no_orders">Belum Order</option>
              </select>
            </div>

            {/* Sorting Dropdown */}
            <div className="flex items-center gap-1.5 bg-muted/20 border border-border/60 rounded-xl px-3 py-1.5 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={filters.sortBy || 'newest'}
                onChange={(e) => updateFilters({ sortBy: e.target.value })}
                className="bg-transparent border-none text-foreground font-medium focus:outline-none cursor-pointer pr-2"
              >
                <option value="newest">Terbaru Bergabung</option>
                <option value="orders">Pesanan Terbanyak</option>
                <option value="points">Poin Tertinggi</option>
                <option value="wallet">Saldo Tertinggi</option>
                <option value="name">Nama (A-Z)</option>
              </select>
            </div>

            {/* Reset Button */}
            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold transition-colors cursor-pointer"
                title="Reset semua filter"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block bg-white border border-border/40 rounded-3xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/10">
                <th className="px-5 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Pelanggan & Identitas
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Kontak
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Level & Loyalitas
                </th>
                <th className="px-5 py-4 text-center text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Pesanan
                </th>
                <th className="px-5 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Akses Role
                </th>
                <th className="px-5 py-4 text-right text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Aksi
                </th>
                <th className="px-5 py-4 text-right text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Bergabung
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-muted-foreground/60">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-30 text-orange-600" />
                    <p className="font-bold text-foreground text-sm">Tidak ada pelanggan yang ditemukan</p>
                    <p className="text-xs text-muted-foreground mt-1">Coba gunakan kata kunci pencarian atau filter lain.</p>
                    {hasActiveFilters && (
                      <button
                        onClick={resetAllFilters}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 font-bold text-xs hover:bg-orange-100 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset Filter
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                customers.map((customer) => {
                  const targetSlugOrId = customer.slug || customer.id;
                  const detailHref = `/admin/customers/${targetSlugOrId}`;

                  return (
                    <tr key={customer.id} className="group hover:bg-orange-50/20 transition-colors">
                      {/* Pelanggan & Identitas */}
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <Link href={detailHref} className="shrink-0">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-sm shadow-sm overflow-hidden hover:scale-105 transition-transform">
                              {(customer.name || 'U')[0].toUpperCase()}
                            </div>
                          </Link>
                          <div className="min-w-0 space-y-1">
                            <Link href={detailHref} className="block group-hover:text-orange-600 transition-colors">
                              <span className="font-bold text-foreground text-sm leading-tight block truncate">
                                {customer.name || 'Pelanggan Tanpa Nama'}
                              </span>
                            </Link>
                            
                            <div className="flex flex-wrap items-center gap-1.5">
                              {/* Slug Badge */}
                              {customer.slug ? (
                                <button
                                  onClick={(e) => copyToClipboard(customer.slug!, `slug-${customer.id}`, e)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 border border-orange-200 text-orange-700 text-[10px] font-mono font-bold hover:bg-orange-100 transition-colors cursor-pointer"
                                  title="Klik untuk salin slug URL"
                                >
                                  <span>@{customer.slug}</span>
                                  {copiedKey === `slug-${customer.id}` ? (
                                    <Check className="w-2.5 h-2.5 text-green-600" />
                                  ) : (
                                    <Copy className="w-2.5 h-2.5 opacity-60" />
                                  )}
                                </button>
                              ) : (
                                <span className="text-[10px] text-muted-foreground/60 italic">Tanpa slug</span>
                              )}

                              {/* Customer ID Snippet */}
                              <button
                                onClick={(e) => copyToClipboard(customer.id, `id-${customer.id}`, e)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/40 border border-border/40 text-muted-foreground text-[10px] font-mono hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                                title={`ID Lengkap: ${customer.id} (Klik untuk salin)`}
                              >
                                <span>ID: {customer.id.slice(0, 7)}...</span>
                                {copiedKey === `id-${customer.id}` ? (
                                  <Check className="w-2.5 h-2.5 text-green-600" />
                                ) : (
                                  <Copy className="w-2.5 h-2.5 opacity-60" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Kontak */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          {customer.phone ? (
                            <a
                              href={`https://wa.me/${customer.phone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-orange-600 transition-colors"
                              title="Chat WhatsApp langsung"
                            >
                              <Phone className="w-3.5 h-3.5 text-green-600" />
                              <span>{customer.phone}</span>
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">-</span>
                          )}
                          <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                            {customer.email || 'Tidak ada email'}
                          </p>
                        </div>
                      </td>

                      {/* Level & Loyalitas */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                            <ShieldCheck className="w-3 h-3 text-amber-600" />
                            {customer.arusLevel || 'Tunas Arus'}
                          </span>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="inline-flex items-center gap-1 font-bold text-amber-700">
                              <Trophy className="w-3 h-3 text-amber-500" />
                              {customer.points} Poin
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="font-semibold text-foreground">
                              Rp {customer.walletBalance.toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Pesanan */}
                      <td className="px-5 py-4 text-center">
                        <Link href={detailHref} className="inline-flex flex-col items-center group/order">
                          <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-xs font-black group-hover/order:bg-orange-100 transition-colors">
                            {customer._count.orders}
                          </span>
                          <span className="text-[10px] text-muted-foreground mt-0.5">Transaksi</span>
                        </Link>
                      </td>

                      {/* Akses Role */}
                      <td className="px-5 py-4">
                        <RoleSelect userId={customer.id} currentRole={customer.role} />
                      </td>

                      {/* Aksi */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={detailHref}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xl border border-orange-200 transition-colors"
                          >
                            <span>Detail & Kelola</span>
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                          <ImpersonateButton userId={customer.id} userName={customer.name || 'User'} />
                        </div>
                      </td>

                      {/* Bergabung */}
                      <td className="px-5 py-4 text-right text-xs text-muted-foreground whitespace-nowrap">
                        <p className="font-medium">
                          {new Date(customer.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-border/40 bg-muted/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Menampilkan <span className="font-bold text-foreground">{customers.length}</span> dari{' '}
            <span className="font-bold text-foreground">{pagination.totalItems}</span> pelanggan
          </p>
          <UrlPagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
          />
        </div>
      </div>

      {/* Mobile Cards View */}
      <div className="sm:hidden space-y-3">
        {customers.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground/60 bg-white rounded-3xl border border-border/40 p-6">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30 text-orange-600" />
            <p className="font-bold text-foreground text-sm">Tidak ada pelanggan</p>
            <p className="text-xs text-muted-foreground mt-1">Coba sesuaikan kata kunci pencarian.</p>
          </div>
        ) : (
          customers.map((customer) => {
            const targetSlugOrId = customer.slug || customer.id;
            const detailHref = `/admin/customers/${targetSlugOrId}`;

            return (
              <div
                key={customer.id}
                className="bg-white rounded-3xl border border-border/40 p-4 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Link href={detailHref}>
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0">
                        {(customer.name || 'U')[0].toUpperCase()}
                      </div>
                    </Link>
                    <div className="min-w-0">
                      <Link href={detailHref} className="block">
                        <p className="font-bold text-foreground text-sm truncate">{customer.name || 'Pelanggan'}</p>
                      </Link>
                      <div className="flex flex-wrap items-center gap-1 mt-0.5">
                        {customer.slug && (
                          <span className="text-[10px] font-mono font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                            @{customer.slug}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-muted-foreground">
                          ID: {customer.id.slice(0, 6)}...
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="px-2 py-1 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 text-xs font-black">
                    {customer._count.orders} order
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-muted/20 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Poin & Saldo</span>
                    <span className="font-bold text-foreground">{customer.points} Poin • Rp {customer.walletBalance.toLocaleString('id-ID')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Level Loyalitas</span>
                    <span className="font-bold text-amber-700">{customer.arusLevel || 'Tunas Arus'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-border/30">
                  <div className="flex items-center gap-2">
                    {customer.phone && (
                      <a
                        href={`https://wa.me/${customer.phone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-lg"
                      >
                        <Phone className="w-3 h-3" />
                        WhatsApp
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={detailHref}
                      className="px-3 py-1 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 transition-colors"
                    >
                      Detail & Kelola →
                    </Link>
                    <ImpersonateButton userId={customer.id} userName={customer.name || 'User'} />
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div className="pt-2">
          <UrlPagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
          />
        </div>
      </div>
    </div>
  );
}
