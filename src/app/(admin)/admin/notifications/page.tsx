'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Send, FileText, Plus, Trash2, Loader2, Users, User, ToggleLeft, ToggleRight, Save } from 'lucide-react';

type Tab = 'send' | 'templates';
type Template = { id: string; trigger: string; title: string; message: string; isActive: boolean };

const TRIGGER_OPTIONS = [
  { value: 'ORDER_COMPLETED', label: 'Order Selesai' },
  { value: 'POINTS_EARNED', label: 'Poin Bertambah' },
  { value: 'WELCOME', label: 'Welcome (User Baru)' },
  { value: 'PICKUP_REMINDER', label: 'Pengingat Pickup' },
  { value: 'CUSTOM', label: 'Custom' },
];

export default function AdminNotificationsPage() {
  const [tab, setTab] = useState<Tab>('send');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<'all' | 'specific'>('all');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTpl, setLoadingTpl] = useState(false);
  const [editTpl, setEditTpl] = useState<Partial<Template> | null>(null);
  const [savingTpl, setSavingTpl] = useState(false);

  useEffect(() => { if (tab === 'templates') fetchTemplates(); }, [tab]);

  const fetchTemplates = async () => {
    setLoadingTpl(true);
    try {
      const res = await fetch('/api/admin/notifications/templates');
      if (res.ok) setTemplates(await res.json());
    } catch {}
    finally { setLoadingTpl(false); }
  };

  const handleSend = async () => {
    if (!title || !message) return;
    setSending(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, type: 'promo', target }),
      });
      if (res.ok) {
        setSent(true);
        setTitle('');
        setMessage('');
        setTimeout(() => setSent(false), 3000);
      }
    } catch {}
    finally { setSending(false); }
  };

  const handleSaveTemplate = async () => {
    if (!editTpl?.trigger || !editTpl?.title || !editTpl?.message) return;
    setSavingTpl(true);
    try {
      await fetch('/api/admin/notifications/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editTpl),
      });
      setEditTpl(null);
      fetchTemplates();
    } catch {}
    finally { setSavingTpl(false); }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Hapus template ini?')) return;
    await fetch(`/api/admin/notifications/templates?id=${id}`, { method: 'DELETE' });
    fetchTemplates();
  };

  return (
    <div className="p-4 lg:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Bell className="w-6 h-6 text-matcha-600" /> Notifikasi
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Kirim notifikasi dan kelola template pesan otomatis</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-muted/50 p-1 rounded-xl w-fit">
        {[
          { id: 'send' as Tab, label: 'Kirim Manual', icon: Send },
          { id: 'templates' as Tab, label: 'Template Otomatis', icon: FileText },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === t.id ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Send Manual */}
      {tab === 'send' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Target</label>
              <div className="flex gap-2">
                <button onClick={() => setTarget('all')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all
                    ${target === 'all' ? 'border-matcha-600 bg-matcha-50 text-matcha-700' : 'border-border bg-card text-muted-foreground'}`}>
                  <Users className="w-4 h-4" /> Semua Customer
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Judul</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Judul notifikasi..."
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-matcha-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Pesan</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder="Isi pesan notifikasi..."
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:border-matcha-500" />
            </div>
            <button onClick={handleSend} disabled={sending || !title || !message}
              className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-matcha text-white font-semibold text-sm disabled:opacity-50 hover:opacity-90 transition-all">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Mengirim...' : 'Kirim Notifikasi'}
            </button>
            {sent && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-green-600 font-medium">
                ✓ Notifikasi berhasil dikirim!
              </motion.p>
            )}
          </div>
        </motion.div>
      )}

      {/* Templates */}
      {tab === 'templates' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          <button onClick={() => setEditTpl({ trigger: '', title: '', message: '', isActive: true })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-matcha-300 text-matcha-700 font-medium text-sm hover:bg-matcha-50 transition-colors">
            <Plus className="w-4 h-4" /> Tambah Template Baru
          </button>

          {/* Edit form */}
          {editTpl && (
            <div className="bg-card rounded-2xl border border-matcha-200 p-6 space-y-4">
              <h3 className="font-bold text-foreground">
                {editTpl.id ? 'Edit Template' : 'Template Baru'}
              </h3>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Trigger</label>
                <select value={editTpl.trigger || ''} onChange={e => setEditTpl({ ...editTpl, trigger: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-matcha-500">
                  <option value="">Pilih trigger...</option>
                  {TRIGGER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Judul</label>
                <input value={editTpl.title || ''} onChange={e => setEditTpl({ ...editTpl, title: e.target.value })}
                  placeholder="e.g. Pesanan Selesai! 🎉" className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-matcha-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Pesan <span className="text-muted-foreground/60 normal-case">(placeholder: {'{{name}}'}, {'{{points}}'}, {'{{orderNo}}'})</span>
                </label>
                <textarea value={editTpl.message || ''} onChange={e => setEditTpl({ ...editTpl, message: e.target.value })} rows={3}
                  placeholder="Halo {{name}}! Pesanan {{orderNo}} sudah selesai. Kamu dapat {{points}} poin!"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:border-matcha-500" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveTemplate} disabled={savingTpl}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-matcha text-white font-semibold text-sm disabled:opacity-50">
                  {savingTpl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan
                </button>
                <button onClick={() => setEditTpl(null)} className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground">Batal</button>
              </div>
            </div>
          )}

          {/* Template list */}
          {loadingTpl ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-matcha-600" /></div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-2xl border border-border">
              <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Belum ada template. Buat template pertama!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((tpl) => (
                <div key={tpl.id} className="bg-card rounded-2xl border border-border p-5 flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full bg-matcha-50 text-matcha-700 text-[10px] font-bold uppercase tracking-wider">{tpl.trigger}</span>
                      {tpl.isActive ? (
                        <span className="text-[10px] text-green-600 font-bold">● Aktif</span>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-bold">○ Nonaktif</span>
                      )}
                    </div>
                    <h4 className="font-bold text-foreground text-sm">{tpl.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{tpl.message}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditTpl(tpl)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                      <FileText className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteTemplate(tpl.id)} className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
