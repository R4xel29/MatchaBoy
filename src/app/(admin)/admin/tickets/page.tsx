'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  Eye, 
  MessageSquare,
  ChevronDown
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function AdminTicketsPage() {
  const { showToast } = useToast();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected ticket for modal details
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [ticketStatus, setTicketStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchTickets = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const url = new URL('/api/admin/tickets', window.location.origin);
      if (statusFilter) url.searchParams.set('status', statusFilter);
      if (typeFilter) url.searchParams.set('type', typeFilter);
      
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      } else {
        showToast('Gagal memuat tiket laporan', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Kesalahan jaringan', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, typeFilter]);

  const handleOpenDetails = (ticket: any) => {
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
        fetchTickets();
      } else {
        showToast('Gagal memperbarui tiket', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Kesalahan jaringan', 'error');
    } finally {
      setUpdating(false);
    }
  };

  // Client side search filter
  const filteredTickets = tickets.filter(ticket => {
    const query = searchQuery.toLowerCase();
    return (
      ticket.title.toLowerCase().includes(query) ||
      ticket.description.toLowerCase().includes(query) ||
      ticket.name.toLowerCase().includes(query) ||
      (ticket.email && ticket.email.toLowerCase().includes(query)) ||
      (ticket.phone && ticket.phone.includes(query))
    );
  });

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-black text-foreground flex items-center gap-3">
            <ClipboardList className="w-6 h-6 text-brand-600" /> Laporan & Tiket Masuk
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola pengaduan bug, kendala pesanan, pertanyaan, dan partnership dari customer.
          </p>
        </div>
        <button
          onClick={() => fetchTickets(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-xs font-bold bg-card hover:bg-muted transition-all active:scale-95 disabled:opacity-50 shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 bg-card border border-border p-4 rounded-2xl">
        {/* Search */}
        <div className="relative group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, email, isi..."
            className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-brand-500 transition-colors"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </div>

        {/* Tipe Laporan */}
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none appearance-none cursor-pointer focus:border-brand-500"
          >
            <option value="">Semua Kategori</option>
            <option value="BUG">Bug / Masalah Aplikasi</option>
            <option value="ISSUE">Kendala Transaksi</option>
            <option value="QUESTION">Pertanyaan / Saran</option>
            <option value="PARTNERSHIP">Partnership</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>

        {/* Status */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none appearance-none cursor-pointer focus:border-brand-500"
          >
            <option value="">Semua Status</option>
            <option value="OPEN">Open (Belum Diproses)</option>
            <option value="IN_PROGRESS">In Progress (Sedang Ditangani)</option>
            <option value="RESOLVED">Resolved (Selesai)</option>
            <option value="CLOSED">Closed (Ditutup)</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-2xl">
          <RefreshCw className="w-8 h-8 animate-spin text-brand-600 mb-2" />
          <p className="text-xs text-muted-foreground font-bold">Memuat laporan...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl py-16 text-center">
          <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-foreground mb-1">Tidak Ada Tiket Laporan</h3>
          <p className="text-xs text-muted-foreground">Tidak ditemukan laporan masalah yang sesuai dengan filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTickets.map((ticket) => (
            <motion.div
              key={ticket.id}
              layoutId={`ticket-card-${ticket.id}`}
              className="bg-card border border-border hover:border-brand-500/50 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider ${
                    ticket.type === 'BUG' ? 'bg-red-50 text-red-500 border border-red-100' :
                    ticket.type === 'ISSUE' ? 'bg-orange-50 text-orange-500 border border-orange-100' :
                    ticket.type === 'QUESTION' ? 'bg-blue-50 text-blue-500 border border-blue-100' :
                    'bg-purple-50 text-purple-500 border border-purple-100'
                  }`}>
                    {ticket.type}
                  </span>
                  
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider ${
                    ticket.status === 'OPEN' ? 'bg-brand-50 text-brand-600 border border-brand-100' :
                    ticket.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                    ticket.status === 'RESOLVED' ? 'bg-green-50 text-green-600 border border-green-100' :
                    'bg-gray-50 text-gray-500 border border-gray-100'
                  }`}>
                    {ticket.status}
                  </span>
                </div>

                <div>
                  <h3 className="font-serif font-black text-sm text-foreground line-clamp-1 leading-snug">
                    {ticket.title}
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Oleh: <span className="font-bold">{ticket.name}</span> • {new Date(ticket.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {ticket.description}
                </p>
              </div>

              <div className="pt-4 border-t border-border/50 flex items-center justify-between gap-2 mt-4">
                <div className="text-[9px] text-muted-foreground font-semibold">
                  {ticket.user ? 'MEMBER' : 'GUEST'}
                </div>
                <button
                  onClick={() => handleOpenDetails(ticket)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> Detail & Kelola
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Ticket Details & Action Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              layoutId={`ticket-card-${selectedTicket.id}`}
              className="bg-card w-full max-w-xl rounded-2xl border border-border p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-brand-50 text-brand-600">
                      {selectedTicket.type}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      ID: {selectedTicket.id}
                    </span>
                  </div>
                  <h2 className="font-serif font-black text-base text-foreground leading-snug">
                    {selectedTicket.title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Sender Details */}
              <div className="p-4 bg-muted/20 border border-border rounded-xl grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="block text-[9px] font-bold text-muted-foreground uppercase">Pengirim</span>
                  <span className="font-bold text-foreground">{selectedTicket.name}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-muted-foreground uppercase">Status Akun</span>
                  <span className="font-bold text-foreground">
                    {selectedTicket.user ? `Member (ID: ${selectedTicket.userId.substring(0,8)}...)` : 'Guest'}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-muted-foreground uppercase">Email</span>
                  <span className="font-bold text-foreground truncate block">{selectedTicket.email || '-'}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-muted-foreground uppercase">Telepon / WA</span>
                  <span className="font-bold text-foreground">{selectedTicket.phone || '-'}</span>
                </div>
              </div>

              {/* Message Description */}
              <div className="space-y-1.5">
                <span className="block text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Isi Laporan / Pesan</span>
                <div className="p-4 bg-background border border-border rounded-xl text-xs leading-relaxed whitespace-pre-wrap text-foreground max-h-[150px] overflow-y-auto">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Update Status and Notes Form */}
              <div className="space-y-4 border-t border-border pt-4">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Tindakan Admin</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Status Tiket</label>
                    <select
                      value={ticketStatus}
                      onChange={(e) => setTicketStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-brand-500 cursor-pointer"
                    >
                      <option value="OPEN">Open (Belum Diproses)</option>
                      <option value="IN_PROGRESS">In Progress (Sedang Ditangani)</option>
                      <option value="RESOLVED">Resolved (Selesai)</option>
                      <option value="CLOSED">Closed (Ditutup)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Hubungi Pengirim</label>
                    {selectedTicket.phone ? (
                      <a
                        href={`https://wa.me/${selectedTicket.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-full items-center justify-center gap-2 px-3 py-2 border border-[#25D366] text-[#25D366] hover:bg-[#25D366]/5 rounded-xl text-xs font-bold transition-all text-center"
                      >
                        Hubungi via WhatsApp CS
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground italic block pt-2">No. Telp Tidak Tersedia</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase">Catatan Admin (Catatan Internal / Solusi)</label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    placeholder="Tuliskan catatan internal atau solusi yang telah diberikan untuk tiket ini..."
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-brand-500 resize-none text-foreground"
                  />
                  <p className="text-[10px] text-muted-foreground">Catatan ini akan terlihat oleh pembeli di riwayat tiket mereka.</p>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  disabled={updating}
                  className="flex-1 py-2.5 border border-border bg-background hover:bg-muted text-muted-foreground rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleUpdateTicket}
                  disabled={updating}
                  className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700 transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {updating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Simpan Perubahan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
