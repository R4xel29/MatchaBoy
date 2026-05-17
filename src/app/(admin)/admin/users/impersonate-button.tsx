'use client';

import { useState } from 'react';
import { UserCircle } from 'lucide-react';
import { impersonateUserAction } from '@/app/actions/admin';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export default function ImpersonateButton({ userId, userName }: { userId: string, userName: string }) {
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const confirmImpersonate = async () => {
    setLoading(true);
    try {
        const result = await impersonateUserAction(userId)
        if (result?.error) {
           alert(result.error);
           setLoading(false);
           setIsModalOpen(false);
        }
    } catch {
       // Next.js redirect will be caught here inside Server Actions
    }
  };

  return (
    <>
      <button 
         onClick={() => setIsModalOpen(true)}
         disabled={loading}
         title={`Masuk sebagai ${userName}`}
         className="inline-flex flex-col items-center justify-center p-1.5 hover:bg-brand-50 rounded-lg text-muted-foreground hover:text-brand-600 transition-colors disabled:opacity-50"
      >
         <UserCircle className="w-4 h-4" />
         <span className="text-[9px] mt-0.5 font-medium">Impersonate</span>
      </button>

      <ConfirmModal
        isOpen={isModalOpen}
        title="Impersonate Akun"
        message={`Apakah Anda yakin ingin masuk sebagai ${userName}?`}
        confirmLabel="Ya, Masuk"
        cancelLabel="Batal"
        isLoading={loading}
        onConfirm={confirmImpersonate}
        onCancel={() => setIsModalOpen(false)}
      />
    </>
  );
}
