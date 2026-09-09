'use client';

import { useState, useEffect } from 'react';
import { ClipboardList, RefreshCw, MessageSquare } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { Pagination } from '@/components/ui/Pagination';

import { SupportTicket } from './_components/types';
import { TicketFilters } from './_components/TicketFilters';
import { TicketCard } from './_components/TicketCard';
import { TicketDetailModal } from './_components/TicketDetailModal';

export default function AdminTicketsPage() {
  const { showToast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination & Filters
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 12;

  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected ticket for modal details
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [ticketStatus, setTicketStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchTickets = async (isRefresh = false, page = currentPage) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const url = new URL('/api/admin/tickets', window.location.origin);
      url.searchParams.set('page', page.toString());
      url.searchParams.set('limit', pageSize.toString());
      if (statusFilter) url.searchParams.set('status', statusFilter);
      if (typeFilter) url.searchParams.set('type', typeFilter);
      if (searchQuery) url.searchParams.set('search', searchQuery);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
        setTotalPages(data.totalPages || 1);
        setTotalItems(data.total || 0);
        setCurrentPage(data.page || page);
      } else {
        showToast('Gagal memuat tiket laporan', 'error');
      }
    } catch {
      showToast('Kesalahan jaringan', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets(false, 1);
  }, [statusFilter, typeFilter, searchQuery]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchTickets(false, newPage);
  };

  const handleOpenDetails = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setAdminNotes(ticket.adminNotes || '');
    setTicketStatus(ticket.status);
  };

  const handleUpdateTicket = async () => {
    if (!selectedTicket) return;
    setUpdating(true);
    try {
      const res = await fetch('/api/admin/tickets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTicket.id,
          status: ticketStatus,
          adminNotes: adminNotes,
        }),
      });

      if (res.ok) {
        showToast('Tiket berhasil diperbarui', 'success');
        setSelectedTicket(null);
        fetchTickets(false, currentPage);
      } else {
        showToast('Gagal memperbarui tiket', 'error');
      }
    } catch {
      showToast('Kesalahan jaringan', 'error');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-6xl text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black font-heading text-slate-900 flex items-center gap-2.5">
            <ClipboardList className="w-6 h-6 text-orange-600" />
            <span>Laporan & Tiket Masuk</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola pengaduan kendala transaksi, saran, dan pertanyaan dari pelanggan Arum Seduh
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchTickets(true, currentPage)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-2xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all active:scale-95 disabled:opacity-50 shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Memuat ulang...' : 'Segarkan'}</span>
        </button>
      </div>

      {/* Filters Bar */}
      <TicketFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      {/* Tickets List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200/80 rounded-3xl text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-orange-500 mb-2" />
          <p className="text-xs font-bold">Memuat laporan tiket...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl py-16 text-center p-6 shadow-xs">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 mb-1">Tidak Ada Tiket Laporan</h3>
          <p className="text-xs text-slate-400">
            Tidak ditemukan laporan atau kendala yang sesuai dengan filter pencarian.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {tickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onOpenDetails={handleOpenDetails}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="pt-2">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      )}

      {/* Ticket Details & Action Modal */}
      <TicketDetailModal
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
        ticketStatus={ticketStatus}
        setTicketStatus={setTicketStatus}
        adminNotes={adminNotes}
        setAdminNotes={setAdminNotes}
        updating={updating}
        onUpdate={handleUpdateTicket}
      />
    </div>
  );
}
