'use client';

import {
  Share2, Users, Ticket, CheckCircle2, Clock,
  ShoppingBag, Gift, Search
} from 'lucide-react';
import { useState } from 'react';

interface ReferralData {
  referee: { id: string; name: string | null; email: string | null; phone: string | null };
  referrer: { id: string; name: string | null; email: string | null; referralCode: string } | null;
  hasPurchased: boolean;
  purchaseCount: number;
  bonusPaid: boolean;
  joinedAt: string;
}

interface Props {
  referrals: ReferralData[];
  stats: {
    totalReferrals: number;
    totalVouchersIssued: number;
    totalVouchersUsed: number;
  };
}

export default function ReferralTrackingClient({ referrals, stats }: Props) {
  const [search, setSearch] = useState('');

  const filtered = referrals.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.referee.name?.toLowerCase().includes(q) ||
      r.referee.email?.toLowerCase().includes(q) ||
      r.referrer?.name?.toLowerCase().includes(q) ||
      r.referrer?.email?.toLowerCase().includes(q) ||
      r.referrer?.referralCode?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground flex items-center gap-2">
          <Share2 className="w-6 h-6 text-violet-600" />
          Referral Tracking
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Pantau siapa yang mengajak siapa, dan status pembelian pertama.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Referral', value: stats.totalReferrals, icon: Users, color: 'text-blue-600 bg-blue-50' },
          { label: 'Voucher Referral Diterbitkan', value: stats.totalVouchersIssued, icon: Ticket, color: 'text-violet-600 bg-violet-50' },
          { label: 'Voucher Referral Dipakai', value: stats.totalVouchersUsed, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-border/40 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-[11px] text-muted-foreground font-medium">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
        <input
          type="text"
          placeholder="Cari nama, email, atau kode referral..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border/40 shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 bg-muted/20">
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Referrer (Mengajak)</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Referee (Diajak)</th>
                <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Sudah Beli?</th>
                <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Bonus Cair?</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tanggal Join</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground/50">
                    <Gift className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>Belum ada data referral</p>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.referee.id} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                    {/* Referrer */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-foreground text-[13px]">{r.referrer?.name || '-'}</p>
                        <p className="text-[11px] text-muted-foreground">{r.referrer?.email || '-'}</p>
                        <p className="text-[10px] text-violet-500 font-mono mt-0.5">{r.referrer?.referralCode}</p>
                      </div>
                    </td>
                    {/* Referee */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-foreground text-[13px]">{r.referee.name || '-'}</p>
                        <p className="text-[11px] text-muted-foreground">{r.referee.email || r.referee.phone || '-'}</p>
                      </div>
                    </td>
                    {/* Purchase Status */}
                    <td className="px-4 py-3 text-center">
                      {r.hasPurchased ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                          <ShoppingBag className="w-3 h-3" /> {r.purchaseCount}x Beli
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">
                          <Clock className="w-3 h-3" /> Belum
                        </span>
                      )}
                    </td>
                    {/* Bonus Status */}
                    <td className="px-4 py-3 text-center">
                      {r.bonusPaid ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" /> Sudah
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                          <Clock className="w-3 h-3" /> Belum
                        </span>
                      )}
                    </td>
                    {/* Date */}
                    <td className="px-4 py-3 text-[12px] text-muted-foreground">
                      {new Date(r.joinedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
