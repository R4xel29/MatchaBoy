'use client';

import { useState, useEffect } from 'react';
import { Bell, Send, FileText } from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

import {
  NotificationTab,
  NotificationTarget,
  NotificationTemplate,
} from './_components/types';
import { NotificationSenderCard } from './_components/NotificationSenderCard';
import { NotificationTemplatesTable } from './_components/NotificationTemplatesTable';
import { NotificationTemplateModal } from './_components/NotificationTemplateModal';

export default function AdminNotificationsPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<NotificationTab>('send');

  // Manual Send State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<NotificationTarget>('all');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Templates State
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loadingTpl, setLoadingTpl] = useState(false);
  const [editTpl, setEditTpl] = useState<Partial<NotificationTemplate> | null>(null);
  const [savingTpl, setSavingTpl] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    if (tab === 'templates') {
      fetchTemplates();
    }
  }, [tab]);

  const fetchTemplates = async () => {
    setLoadingTpl(true);
    try {
      const res = await fetch('/api/admin/notifications/templates');
      if (res.ok) {
        setTemplates(await res.json());
      }
    } catch {
      showToast('Gagal memuat template notifikasi', 'error');
    } finally {
      setLoadingTpl(false);
    }
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
        showToast('Notifikasi berhasil dikirim!', 'success');
        setTimeout(() => setSent(false), 3000);
      } else {
        showToast('Gagal mengirim notifikasi', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan saat mengirim notifikasi', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!editTpl?.trigger || !editTpl?.title || !editTpl?.message) return;
    setSavingTpl(true);
    try {
      const res = await fetch('/api/admin/notifications/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editTpl),
      });
      if (res.ok) {
        showToast('Template notifikasi berhasil disimpan', 'success');
        setEditTpl(null);
        fetchTemplates();
      } else {
        showToast('Gagal menyimpan template', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setSavingTpl(false);
    }
  };

  const handleDeleteTemplate = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Template',
      message: 'Apakah Anda yakin ingin menghapus template notifikasi ini secara permanen?',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/admin/notifications/templates?id=${id}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            showToast('Template berhasil dihapus', 'success');
            fetchTemplates();
          } else {
            showToast('Gagal menghapus template', 'error');
          }
        } catch {
          showToast('Terjadi kesalahan saat menghapus', 'error');
        }
      },
    });
  };

  return (
    <div className="p-4 lg:p-8 max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black font-heading text-slate-900 flex items-center gap-3">
            <Bell className="w-6 h-6 text-orange-600" />
            <span>Notifikasi Pelanggan</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kirim pengumuman manual dan kelola template pesan otomatis Arum Seduh
          </p>
        </div>
      </div>

      {/* Segmented Tabs */}
      <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-2xl w-fit">
        {[
          { id: 'send' as NotificationTab, label: 'Kirim Manual', icon: Send },
          { id: 'templates' as NotificationTab, label: 'Template Otomatis', icon: FileText },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
              tab === t.id
                ? 'bg-white shadow-xs text-orange-700'
                : 'text-slate-500 hover:text-slate-800'
            )}
          >
            <t.icon className="w-4 h-4" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab: Kirim Manual */}
      {tab === 'send' && (
        <NotificationSenderCard
          title={title}
          setTitle={setTitle}
          message={message}
          setMessage={setMessage}
          target={target}
          setTarget={setTarget}
          sending={sending}
          sent={sent}
          handleSend={handleSend}
        />
      )}

      {/* Tab: Template Otomatis */}
      {tab === 'templates' && (
        <div className="space-y-5">
          <NotificationTemplateModal
            editTpl={editTpl}
            setEditTpl={setEditTpl}
            savingTpl={savingTpl}
            onSave={handleSaveTemplate}
            onCancel={() => setEditTpl(null)}
          />

          <NotificationTemplatesTable
            templates={templates}
            loadingTpl={loadingTpl}
            onAddNew={() =>
              setEditTpl({ trigger: '', title: '', message: '', isActive: true })
            }
            onEdit={(tpl) => setEditTpl(tpl)}
            onDelete={handleDeleteTemplate}
          />
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
