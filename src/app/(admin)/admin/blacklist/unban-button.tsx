'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2, RotateCcw } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export default function UnbanButton({ id, value }: { id: string; value: string }) {
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const handleUnban = async () => {
    setLoading(true);
    setModalOpen(false);
    try {
      const res = await fetch(`/api/admin/blacklist/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Gagal menghapus dari blacklist');

      showToast(`${value} telah dihapus dari blacklist`, 'success');
      router.refresh();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        disabled={loading}
        className="p-2 rounded-xl border border-rose-100 bg-rose-50/50 text-rose-600 hover:bg-rose-100 transition-all shadow-sm shadow-rose-100/20 group"
        title="Hapus dari Blacklist"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <RotateCcw className="w-4 h-4 group-hover:rotate-[-45deg] transition-transform" />
        )}
      </button>

      <ConfirmModal
        isOpen={modalOpen}
        title="Hapus dari Blacklist?"
        message={`Apakah Anda yakin ingin menghapus ${value} dari daftar hitam? Pengguna ini akan dapat mendaftar atau login kembali.`}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isLoading={loading}
        onConfirm={handleUnban}
        onCancel={() => setModalOpen(false)}
      />
    </>
  );
}
