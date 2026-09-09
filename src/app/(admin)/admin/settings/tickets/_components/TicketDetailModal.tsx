'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, MessageSquare } from 'lucide-react';
import { SupportTicket } from './types';

interface TicketDetailModalProps {
  ticket: SupportTicket | null;
  onClose: () => void;
  ticketStatus: string;
  setTicketStatus: (v: string) => void;
  adminNotes: string;
  setAdminNotes: (v: string) => void;
  updating: boolean;
  onUpdate: () => void;
}

function formatWhatsAppNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('08')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

export function TicketDetailModal({
  ticket,
  onClose,
  ticketStatus,
  setTicketStatus,
  adminNotes,
  setAdminNotes,
  updating,
  onUpdate,
}: TicketDetailModalProps) {
  const waLink = ticket?.phone
    ? `https://wa.me/${formatWhatsAppNumber(ticket.phone)}?text=${encodeURIComponent(
        `Halo Kak ${ticket.name}, kami dari tim layanan Arum Seduh menindaklanjuti laporan tiket #${ticket.id}: "${ticket.title}".`
      )}`
    : '';
  return (
    <AnimatePresence>
      {ticket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            layoutId={`ticket-card-${ticket.id}`}
            className="bg-white w-full max-w-xl rounded-3xl border border-slate-200/80 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto text-left"
          >
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200">
                    {ticket.type}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    ID: {ticket.id}
                  </span>
                </div>
                <h2 className="font-extrabold text-base text-slate-900 leading-snug font-heading">
                  {ticket.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sender Details */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl grid grid-cols-2 gap-3.5 text-xs">
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Pengirim
                </span>
                <span className="font-extrabold text-slate-800">{ticket.name}</span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Status Akun
                </span>
                <span className="font-extrabold text-slate-800">
                  {ticket.user ? `Member (${ticket.userId?.substring(0, 8)}...)` : 'Guest'}
                </span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Email
                </span>
                <span className="font-medium text-slate-700 truncate block">
                  {ticket.email || '-'}
                </span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Telepon / WhatsApp
                </span>
                <span className="font-medium font-mono text-slate-700">
                  {ticket.phone || '-'}
                </span>
              </div>
            </div>

            {/* Message Description */}
            <div className="space-y-1.5">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Isi Laporan / Keluhan
              </span>
              <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap text-slate-800 max-h-[160px] overflow-y-auto">
                {ticket.description}
              </div>
            </div>

            {/* Update Status and Notes Form */}
            <div className="space-y-4 border-t border-slate-100 pt-4">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Tindakan Penanganan Admin
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                    Status Tiket
                  </label>
                  <select
                    value={ticketStatus}
                    onChange={(e) => setTicketStatus(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-orange-500 cursor-pointer text-slate-800"
                  >
                    <option value="OPEN">Open (Belum Diproses)</option>
                    <option value="IN_PROGRESS">In Progress (Sedang Ditangani)</option>
                    <option value="RESOLVED">Resolved (Selesai)</option>
                    <option value="CLOSED">Closed (Ditutup)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                    Tindak Lanjut Pelanggan
                  </label>
                  {ticket.phone ? (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 px-3.5 py-2 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-all text-center cursor-pointer shadow-2xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Hubungi via WhatsApp</span>
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 italic block pt-2">
                      Nomor Telepon Tidak Tersedia
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Catatan Admin (Solusi / Riwayat Internal)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  placeholder="Tuliskan catatan internal atau rangkuman solusi yang telah diberikan..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-orange-500 resize-none text-slate-900 leading-relaxed font-medium"
                />
                <p className="text-[10px] text-slate-400">
                  Catatan ini dapat membantu pelacakan kendala dan terlihat di riwayat bantuan.
                </p>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={updating}
                className="flex-1 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={onUpdate}
                disabled={updating}
                className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-glow-orange active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {updating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
