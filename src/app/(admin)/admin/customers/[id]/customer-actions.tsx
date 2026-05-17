'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  LogOut, 
  UserX, 
  Trash2, 
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface CustomerActionsProps {
  userId: string;
  userName: string;
}

export default function CustomerActions({ userId, userName }: CustomerActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    isOpen: boolean;
    action: 'logout' | 'ban' | 'delete' | null;
    title: string;
    message: string;
  }>({
    isOpen: false,
    action: null,
    title: '',
    message: '',
  });

  const router = useRouter();
  const { showToast } = useToast();

  const openConfirm = (action: 'logout' | 'ban' | 'delete') => {
    const config = {
      logout: {
        title: 'Logout Paksa',
        message: `Apakah Anda yakin ingin mengeluarkan paksa ${userName}? Semua sesi aktif akan dihentikan.`
      },
      ban: {
        title: 'Blokir User',
        message: `Apakah Anda yakin ingin memblokir ${userName}? Email dan nomor HP akan masuk daftar hitam dan akun akan dihapus.`
      },
      delete: {
        title: 'Hapus Akun Permanen',
        message: `APAKAH ANDA YAKIN? Penghapusan akun ${userName} bersifat PERMANEN dan tidak dapat dibatalkan.`
      }
    }[action];

    setModal({
      isOpen: true,
      action,
      ...config
    });
  };

  const handleAction = async () => {
    const action = modal.action;
    if (!action) return;

    setLoading(action);
    setModal(prev => ({ ...prev, isOpen: false }));
    
    try {
      const res = await fetch(`/api/admin/customers/${userId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan');

      showToast(data.message || 'Aksi berhasil dilakukan', 'success');
      
      if (action === 'ban' || action === 'delete') {
        router.push('/admin/customers');
        router.refresh();
      } else {
        router.refresh();
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(null);
      setModal(prev => ({ ...prev, action: null }));
    }
  };

  return (
    <>
      <div className="bg-white rounded-3xl border border-red-100 shadow-[0_8px_30px_rgb(220,38,38,0.04)] overflow-hidden">
        <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="font-bold">Zona Bahaya (Danger Zone)</h3>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Logout Paksa */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-red-100 bg-red-50/10 gap-4">
            <div>
              <p className="text-sm font-bold text-foreground">Logout Paksa</p>
              <p className="text-xs text-muted-foreground">Hentikan semua sesi aktif pengguna ini segera.</p>
            </div>
            <button
              onClick={() => openConfirm('logout')}
              disabled={!!loading}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 transition-all disabled:opacity-50"
            >
              {loading === 'logout' ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              Logout Paksa
            </button>
          </div>

          {/* Banned / Blacklist */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-red-100 bg-red-50/10 gap-4">
            <div>
              <p className="text-sm font-bold text-foreground">Blokir & Blacklist</p>
              <p className="text-xs text-muted-foreground">Blacklist email/HP dan hapus akses selamanya.</p>
            </div>
            <button
              onClick={() => openConfirm('ban')}
              disabled={!!loading}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-100 border border-red-200 text-red-700 text-sm font-bold hover:bg-red-200 transition-all disabled:opacity-50"
            >
              {loading === 'ban' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
              Blokir User
            </button>
          </div>

          {/* Permanent Delete */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-red-200 bg-red-600 gap-4">
            <div>
              <p className="text-sm font-bold text-white">Hapus Akun Permanen</p>
              <p className="text-xs text-red-100">Menghapus seluruh data pengguna dari sistem.</p>
            </div>
            <button
              onClick={() => openConfirm('delete')}
              disabled={!!loading}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-red-600 text-sm font-black hover:bg-red-50 transition-all shadow-lg disabled:opacity-50"
            >
              {loading === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              HAPUS PERMANEN
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        isDestructive={true}
        isLoading={!!loading}
        onConfirm={handleAction}
        onCancel={() => setModal(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}
