'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  QrCode,
  Banknote,
  Wallet,
  Save,
  Loader2,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { cn } from '@/lib/utils';

import { PaymentConfig, BankAccount, PromoPackage, PaymentTab } from './_components/types';
import { CashAndBankSettingsTab } from './_components/CashAndBankSettingsTab';
import { DokuSettingsTab } from './_components/DokuSettingsTab';
import { MidtransSettingsTab } from './_components/MidtransSettingsTab';

export default function PaymentSettingsClient() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<PaymentTab>('all');
  const [settings, setSettings] = useState<PaymentConfig | null>(null);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // New bank form state
  const [showNewBank, setShowNewBank] = useState(false);
  const [newBank, setNewBank] = useState({ bankName: '', accountNumber: '', accountName: '', bankLogo: '' });

  // First-time promo package inputs
  const [newPromoAmount, setNewPromoAmount] = useState('');
  const [newPromoBonus, setNewPromoBonus] = useState('');

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

  // Helper to get parsed promo packages from settings
  const getPromoPackages = (): PromoPackage[] => {
    try {
      if (settings?.walletFirstTimePromoPackages) {
        return JSON.parse(settings.walletFirstTimePromoPackages);
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  };

  // Helper to update promo packages list
  const updatePromoPackages = (packages: PromoPackage[]) => {
    update('walletFirstTimePromoPackages', JSON.stringify(packages));
  };

  const addPromoPackage = () => {
    const amountVal = parseInt(newPromoAmount);
    const bonusVal = parseInt(newPromoBonus);
    if (isNaN(amountVal) || isNaN(bonusVal) || amountVal <= 0 || bonusVal <= 0) {
      showToast('Nominal dan bonus harus berupa angka positif', 'error');
      return;
    }
    const current = getPromoPackages();
    if (current.some((pkg) => pkg.amount === amountVal)) {
      showToast('Paket nominal ini sudah terdaftar', 'error');
      return;
    }
    const updated = [...current, { amount: amountVal, bonus: bonusVal }].sort((a, b) => a.amount - b.amount);
    updatePromoPackages(updated);
    setNewPromoAmount('');
    setNewPromoBonus('');
    showToast('Paket promo berhasil ditambahkan', 'success');
  };

  const removePromoPackage = (amountVal: number) => {
    const current = getPromoPackages();
    const updated = current.filter((pkg) => pkg.amount !== amountVal);
    updatePromoPackages(updated);
    showToast('Paket promo berhasil dihapus', 'success');
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/payment-settings');
      const data = await res.json();
      setSettings(data.settings);
      setBanks(data.banks || []);
    } catch (err) {
      console.error(err);
      showToast('Gagal memuat pengaturan pembayaran', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/payment-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaved(true);
        showToast('Pengaturan pembayaran berhasil disimpan', 'success');
        setTimeout(() => setSaved(false), 2000);
      } else {
        throw new Error();
      }
    } catch {
      showToast('Gagal menyimpan pengaturan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addBank = async () => {
    try {
      const res = await fetch('/api/admin/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBank),
      });
      const bank = await res.json();
      setBanks([...banks, bank]);
      setNewBank({ bankName: '', accountNumber: '', accountName: '', bankLogo: '' });
      setShowNewBank(false);
      showToast('Rekening bank berhasil ditambahkan', 'success');
    } catch {
      showToast('Gagal menambah bank', 'error');
    }
  };

  const deleteBank = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Rekening',
      message: 'Apakah Anda yakin ingin menghapus rekening bank ini secara permanen?',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await fetch(`/api/admin/bank-accounts?id=${id}`, { method: 'DELETE' });
          setBanks(banks.filter((b) => b.id !== id));
          showToast('Rekening bank berhasil dihapus', 'success');
        } catch {
          showToast('Gagal menghapus rekening', 'error');
        }
      },
    });
  };

  const update = (key: keyof PaymentConfig, value: any) => {
    if (settings) {
      setSettings({ ...settings, [key]: value });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-2" />
        <p className="text-xs font-semibold">Memuat data pengaturan pembayaran...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight font-heading text-slate-900 flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-orange-600" />
            <span>Pengaturan Pembayaran</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Konfigurasi gerbang pembayaran otomatis DOKU, QRIS, Dompet Arus Pay, dan rekening bank transfer
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white shadow-glow-orange transition-all cursor-pointer active:scale-95 disabled:opacity-50 self-start sm:self-auto',
            saved
              ? 'bg-emerald-500 hover:bg-emerald-600'
              : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600'
          )}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{saving ? 'Menyimpan...' : saved ? 'Tersimpan!' : 'Simpan Pengaturan'}</span>
        </button>
      </div>

      {/* Segmented Tab Filter */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
        {[
          { id: 'all' as PaymentTab, label: 'Semua Metode', icon: Layers },
          { id: 'digital-qris' as PaymentTab, label: 'QRIS & Dompet Digital', icon: QrCode },
          { id: 'doku' as PaymentTab, label: 'DOKU Gateway', icon: CreditCard },
          { id: 'cash-bank' as PaymentTab, label: 'COD & Transfer Bank', icon: Banknote },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={cn(
              'py-3 px-4 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer',
              activeTab === t.id
                ? 'border-orange-500 text-orange-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            <t.icon className="w-4 h-4" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content Rendering based on Tab */}
      {(activeTab === 'all' || activeTab === 'digital-qris') && (
        <MidtransSettingsTab
          settings={settings}
          update={update}
          getPromoPackages={getPromoPackages}
          addPromoPackage={addPromoPackage}
          removePromoPackage={removePromoPackage}
          newPromoAmount={newPromoAmount}
          setNewPromoAmount={setNewPromoAmount}
          newPromoBonus={newPromoBonus}
          setNewPromoBonus={setNewPromoBonus}
        />
      )}

      {(activeTab === 'all' || activeTab === 'doku') && (
        <DokuSettingsTab settings={settings} update={update} />
      )}

      {(activeTab === 'all' || activeTab === 'cash-bank') && (
        <CashAndBankSettingsTab
          settings={settings}
          update={update}
          banks={banks}
          showNewBank={showNewBank}
          setShowNewBank={setShowNewBank}
          newBank={newBank}
          setNewBank={setNewBank}
          addBank={addBank}
          deleteBank={deleteBank}
        />
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Saving Loader Overlay Screen */}
      <AnimatePresence>
        {saving && (
          <LoadingScreen
            fullScreen={true}
            customMessages={[
              'Menyimpan pengaturan pembayaran...',
              'Memperbarui kredensial gerbang pembayaran...',
              'Menyelaraskan data rekening bank Arum Seduh...',
              'Mohon tunggu sebentar...',
            ]}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
