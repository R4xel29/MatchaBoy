'use client';

import { useState, useEffect } from 'react';
import {
  Share2, Users, Plus, Trash2, Save, Loader2, CheckCircle2,
  Target, Gift, Calendar, Award, ToggleLeft, ToggleRight,
  Sparkles, Trophy
} from 'lucide-react';

interface ReferralTier {
  id?: string;
  tierNumber: number;
  targetInvites: number;
  rewardType: string;
  rewardValue: string;
  rewardDesc: string;
  isActive: boolean;
}

interface ReferralEvent {
  id?: string;
  name: string;
  description: string;
  rewardType: string;
  rewardValue: string;
  rewardDesc: string;
  refereeReward: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const REWARD_TYPES = [
  { value: 'FREE_TOPPING', label: 'Gratis Topping' },
  { value: 'UPGRADE_SIZE', label: 'Free Upgrade Size' },
  { value: 'FREE_DRINK', label: 'Minuman Gratis' },
  { value: 'DISCOUNT_10', label: 'Diskon 10%' },
  { value: 'DISCOUNT_20', label: 'Diskon 20%' },
  { value: 'CUSTOM', label: 'Custom' },
];

export default function ReferralSettingsClient() {
  const [tiers, setTiers] = useState<ReferralTier[]>([]);
  const [events, setEvents] = useState<ReferralEvent[]>([]);
  const [referralEnabled, setReferralEnabled] = useState(true);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // New tier/event forms
  const [showNewTier, setShowNewTier] = useState(false);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [newTier, setNewTier] = useState<ReferralTier>({
    tierNumber: 1, targetInvites: 3, rewardType: 'FREE_TOPPING',
    rewardValue: 'FREE_TOPPING', rewardDesc: 'Gratis 1 Topping', isActive: true,
  });
  const [newEvent, setNewEvent] = useState<ReferralEvent>({
    name: '', description: '', rewardType: 'FREE_DRINK', rewardValue: 'FREE_DRINK',
    rewardDesc: '1 Minuman Gratis', refereeReward: 'FREE_TOPPING',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    isActive: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/referral-settings');
      const data = await res.json();
      setTiers(data.tiers || []);
      setEvents(data.events || []);
      setReferralEnabled(data.loyaltySettings?.referralEnabled ?? true);
      setTotalReferrals(data.totalReferrals || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const saveTier = async (tier: ReferralTier) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/referral-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...tier, type: 'tier' }),
      });
      const saved = await res.json();
      if (tier.id) {
        setTiers(tiers.map(t => t.id === tier.id ? saved : t));
      } else {
        setTiers([...tiers, saved]);
        setShowNewTier(false);
        setNewTier({ tierNumber: tiers.length + 2, targetInvites: 5, rewardType: 'FREE_DRINK', rewardValue: 'FREE_DRINK', rewardDesc: 'Minuman Gratis', isActive: true });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { alert('Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  const saveEvent = async (event: ReferralEvent) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/referral-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...event, type: 'event' }),
      });
      const saved = await res.json();
      if (event.id) {
        setEvents(events.map(e => (e as any).id === (event as any).id ? saved : e));
      } else {
        setEvents([...events, saved]);
        setShowNewEvent(false);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { alert('Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  const deleteTier = async (id: string) => {
    if (!confirm('Hapus tier ini?')) return;
    try {
      await fetch(`/api/admin/referral-settings?id=${id}&type=tier`, { method: 'DELETE' });
      setTiers(tiers.filter(t => t.id !== id));
    } catch { alert('Gagal menghapus'); }
  };

  const deleteEvent = async (id: string) => {
    if (!confirm('Hapus event ini?')) return;
    try {
      await fetch(`/api/admin/referral-settings?id=${id}&type=event`, { method: 'DELETE' });
      setEvents(events.filter(e => (e as any).id !== id));
    } catch { alert('Gagal menghapus'); }
  };

  const toggleEnabled = async () => {
    const newVal = !referralEnabled;
    setReferralEnabled(newVal);
    try {
      await fetch('/api/admin/referral-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'settings', referralEnabled: newVal }),
      });
    } catch { setReferralEnabled(!newVal); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-violet-600" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <Share2 className="w-6 h-6 text-violet-600" />
            Pengaturan Referral
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Atur program referral, tier hadiah, dan event promo
          </p>
        </div>
        <button onClick={toggleEnabled}>
          {referralEnabled
            ? <ToggleRight className="w-8 h-8 text-emerald-500" />
            : <ToggleLeft className="w-8 h-8 text-muted-foreground/40" />
          }
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-border/40 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-50 text-violet-600"><Users className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalReferrals}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Total Referral</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border/40 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600"><Trophy className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{tiers.filter(t => t.isActive).length}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Tier Aktif</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border/40 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-pink-50 text-pink-600"><Sparkles className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-bold text-foreground">{events.filter(e => e.isActive).length}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Event Aktif</p>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Tiers */}
      <div className="bg-white rounded-2xl border border-border/40 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-violet-50 text-violet-600"><Target className="w-5 h-5" /></div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Tier Referral</h3>
              <p className="text-[10px] text-muted-foreground">Ajak X orang → Dapat hadiah Y</p>
            </div>
          </div>
          <button onClick={() => setShowNewTier(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Tambah Tier
          </button>
        </div>

        {/* Progress bar visual */}
        {tiers.length > 0 && (
          <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200/50">
            <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wider mb-3">Preview Progress Bar</p>
            <div className="flex items-center gap-1">
              {tiers.filter(t => t.isActive).sort((a, b) => a.tierNumber - b.tierNumber).map((tier, i, arr) => (
                <div key={tier.id || i} className="flex-1 relative">
                  <div className="h-2 rounded-full bg-violet-200/50 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full" style={{ width: '0%' }} />
                  </div>
                  <div className="text-center mt-1.5">
                    <div className="w-6 h-6 rounded-full bg-violet-100 border-2 border-violet-300 flex items-center justify-center mx-auto">
                      <span className="text-[8px] font-bold text-violet-700">{tier.targetInvites}</span>
                    </div>
                    <p className="text-[8px] text-violet-600 font-medium mt-0.5 line-clamp-1">{tier.rewardDesc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tier list */}
        <div className="space-y-2">
          {tiers.sort((a, b) => a.tierNumber - b.tierNumber).map((tier) => (
            <div key={tier.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-border/30">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <Award className="w-5 h-5 text-violet-600" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-bold text-foreground">Tier {tier.tierNumber}: Ajak {tier.targetInvites} orang</p>
                <p className="text-[11px] text-muted-foreground">{tier.rewardDesc}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${tier.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {tier.isActive ? 'Aktif' : 'Off'}
              </span>
              <button onClick={() => deleteTier(tier.id!)} className="p-1.5 text-red-400 hover:text-red-600 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* New tier form */}
        {showNewTier && (
          <div className="mt-4 p-4 rounded-xl bg-violet-50/50 border border-violet-200 space-y-3">
            <h4 className="text-xs font-bold text-violet-800 uppercase tracking-wider">Tier Baru</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground mb-1">TIER #</label>
                <input type="number" value={newTier.tierNumber} onChange={(e) => setNewTier({ ...newTier, tierNumber: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 text-sm bg-white border border-violet-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground mb-1">TARGET (ORANG)</label>
                <input type="number" value={newTier.targetInvites} onChange={(e) => setNewTier({ ...newTier, targetInvites: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 text-sm bg-white border border-violet-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground mb-1">JENIS REWARD</label>
                <select value={newTier.rewardType} onChange={(e) => setNewTier({ ...newTier, rewardType: e.target.value, rewardValue: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-violet-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20">
                  {REWARD_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground mb-1">DESKRIPSI</label>
                <input type="text" value={newTier.rewardDesc} onChange={(e) => setNewTier({ ...newTier, rewardDesc: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-violet-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => saveTier(newTier)} disabled={saving}
                className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center gap-1.5">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Simpan
              </button>
              <button onClick={() => setShowNewTier(false)}
                className="px-4 py-2 rounded-xl bg-white border border-border text-xs font-medium text-muted-foreground hover:bg-gray-50 transition-colors">
                Batal
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Referral Events */}
      <div className="bg-white rounded-2xl border border-border/40 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-pink-50 text-pink-600"><Sparkles className="w-5 h-5" /></div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Event / Promo Referral</h3>
              <p className="text-[10px] text-muted-foreground">Campaign referral untuk momen tertentu (Lebaran, Anniversary, dll)</p>
            </div>
          </div>
          <button onClick={() => setShowNewEvent(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-pink-600 text-white text-xs font-semibold hover:bg-pink-700 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Tambah Event
          </button>
        </div>

        <div className="space-y-2">
          {events.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground/50">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Belum ada event referral</p>
            </div>
          ) : (
            events.map((event: any) => (
              <div key={event.id} className="p-4 rounded-xl bg-gradient-to-r from-pink-50/50 to-violet-50/50 border border-pink-200/50">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[13px] font-bold text-foreground">{event.name}</p>
                    <p className="text-[11px] text-muted-foreground">{event.description}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 text-[10px] font-bold">
                        🎁 Referrer: {event.rewardDesc}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-pink-100 text-pink-700 text-[10px] font-bold">
                        🎉 Referee: {event.refereeReward || '-'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold">
                        📅 {new Date(event.startDate).toLocaleDateString('id-ID')} - {new Date(event.endDate).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${event.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {event.isActive ? 'Aktif' : 'Off'}
                    </span>
                    <button onClick={() => deleteEvent(event.id)} className="p-1.5 text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* New event form */}
        {showNewEvent && (
          <div className="mt-4 p-4 rounded-xl bg-pink-50/50 border border-pink-200 space-y-3">
            <h4 className="text-xs font-bold text-pink-800 uppercase tracking-wider">Event Baru</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="text" placeholder="Nama Event" value={newEvent.name} onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                className="px-3 py-2 text-sm bg-white border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20" />
              <input type="text" placeholder="Deskripsi" value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                className="px-3 py-2 text-sm bg-white border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20" />
              <select value={newEvent.rewardType} onChange={(e) => setNewEvent({ ...newEvent, rewardType: e.target.value, rewardValue: e.target.value })}
                className="px-3 py-2 text-sm bg-white border border-pink-200 rounded-xl">
                {REWARD_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <input type="text" placeholder="Deskripsi Reward Referrer" value={newEvent.rewardDesc} onChange={(e) => setNewEvent({ ...newEvent, rewardDesc: e.target.value })}
                className="px-3 py-2 text-sm bg-white border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20" />
              <input type="text" placeholder="Reward Referee (yang diajak)" value={newEvent.refereeReward} onChange={(e) => setNewEvent({ ...newEvent, refereeReward: e.target.value })}
                className="px-3 py-2 text-sm bg-white border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/20" />
              <div className="flex gap-2">
                <input type="date" value={newEvent.startDate} onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                  className="flex-1 px-3 py-2 text-sm bg-white border border-pink-200 rounded-xl" />
                <input type="date" value={newEvent.endDate} onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                  className="flex-1 px-3 py-2 text-sm bg-white border border-pink-200 rounded-xl" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => saveEvent(newEvent)} disabled={saving || !newEvent.name}
                className="px-4 py-2 rounded-xl bg-pink-600 text-white text-xs font-semibold hover:bg-pink-700 disabled:opacity-50 transition-colors">
                Simpan
              </button>
              <button onClick={() => setShowNewEvent(false)}
                className="px-4 py-2 rounded-xl bg-white border border-border text-xs font-medium text-muted-foreground hover:bg-gray-50 transition-colors">
                Batal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
