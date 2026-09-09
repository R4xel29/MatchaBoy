'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Eye } from 'lucide-react';
import { SupportTicket } from './types';

interface TicketCardProps {
  ticket: SupportTicket;
  onOpenDetails: (ticket: SupportTicket) => void;
}

export function TicketCard({ ticket, onOpenDetails }: TicketCardProps) {
  return (
    <motion.div
      layoutId={`ticket-card-${ticket.id}`}
      className="bg-white border border-slate-200/80 hover:border-orange-300 rounded-3xl p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2.5 flex-wrap">
          <span
            className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
              ticket.type === 'BUG'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : ticket.type === 'ISSUE'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : ticket.type === 'QUESTION'
                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                : 'bg-purple-50 text-purple-700 border border-purple-200'
            }`}
          >
            {ticket.type}
          </span>

          <span
            className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
              ticket.status === 'OPEN'
                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                : ticket.status === 'IN_PROGRESS'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : ticket.status === 'RESOLVED'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}
          >
            {ticket.status}
          </span>
        </div>

        <div>
          <h3 className="font-extrabold text-sm text-slate-900 line-clamp-1 leading-snug font-heading">
            {ticket.title}
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Oleh: <span className="font-bold text-slate-600">{ticket.name}</span> •{' '}
            {new Date(ticket.createdAt).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>

        <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
          {ticket.description}
        </p>
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2 mt-4">
        <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">
          {ticket.user ? 'MEMBER' : 'GUEST'}
        </div>
        <button
          type="button"
          onClick={() => onOpenDetails(ticket)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Detail & Kelola</span>
        </button>
      </div>
    </motion.div>
  );
}
