'use client';

import React from 'react';
import { Search, ChevronDown } from 'lucide-react';

interface TicketFiltersProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
}

export function TicketFilters({
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
}: TicketFiltersProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 bg-white border border-slate-200/80 p-4.5 rounded-3xl shadow-xs">
      {/* Search Input */}
      <div className="relative group sm:col-span-1 lg:col-span-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari nama, email, judul, isi laporan..."
          className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all text-slate-900"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      </div>

      {/* Tipe Laporan */}
      <div className="relative">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-full pl-3.5 pr-8 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none appearance-none cursor-pointer focus:border-orange-500 transition-all text-slate-800"
        >
          <option value="">Semua Kategori</option>
          <option value="BUG">Bug / Masalah Aplikasi</option>
          <option value="ISSUE">Kendala Transaksi</option>
          <option value="QUESTION">Pertanyaan / Saran</option>
          <option value="PARTNERSHIP">Partnership / Kerjasama</option>
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>

      {/* Status */}
      <div className="relative">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full pl-3.5 pr-8 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none appearance-none cursor-pointer focus:border-orange-500 transition-all text-slate-800"
        >
          <option value="">Semua Status</option>
          <option value="OPEN">Open (Belum Diproses)</option>
          <option value="IN_PROGRESS">In Progress (Sedang Ditangani)</option>
          <option value="RESOLVED">Resolved (Selesai)</option>
          <option value="CLOSED">Closed (Ditutup)</option>
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}
