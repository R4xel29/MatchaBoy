'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Send, Users, Loader2, Check } from 'lucide-react';
import { NotificationTarget } from './types';

interface NotificationSenderCardProps {
  title: string;
  setTitle: (v: string) => void;
  message: string;
  setMessage: (v: string) => void;
  target: NotificationTarget;
  setTarget: (v: NotificationTarget) => void;
  sending: boolean;
  sent: boolean;
  handleSend: () => void;
}

export function NotificationSenderCard({
  title,
  setTitle,
  message,
  setMessage,
  target,
  setTarget,
  sending,
  sent,
  handleSend,
}: NotificationSenderCardProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Target Penerima
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTarget('all')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                target === 'all'
                  ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-2xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Semua Pelanggan</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Judul Notifikasi
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul notifikasi..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-xs font-medium text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Isi Pesan Notifikasi
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Isi pesan notifikasi promo atau pengumuman..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-xs font-medium text-slate-900 resize-none focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !title || !message}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-glow-orange disabled:opacity-50 transition-all cursor-pointer active:scale-95"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>{sending ? 'Mengirim...' : 'Kirim Notifikasi'}</span>
          </button>

          {sent && (
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xs text-emerald-600 font-bold flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Notifikasi berhasil dikirim!</span>
            </motion.p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
