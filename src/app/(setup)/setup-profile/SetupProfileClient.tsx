'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function SetupProfileClient() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    
    try {
      const res = await fetch('/api/user/setup/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      
      if (res.ok) {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col pt-16 px-6 pb-6">
      <div className="flex-1">
        <h1 className="text-xl font-bold text-gray-900 mb-8 font-serif text-center">
          Tinggal Beberapa Langkah Lagi
        </h1>

        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <label className="text-sm font-medium text-gray-700">Nama</label>
            <span className="text-[11px] text-gray-400 font-bold uppercase">Wajib Diisi</span>
          </div>
          <div className="relative bg-gray-50 rounded-2xl border border-gray-100 p-4 focus-within:border-[#B48A5E] focus-within:ring-1 focus-within:ring-[#B48A5E]/50 transition-all">
            <input
              type="text"
              value={name}
              onChange={(e) => {
                if (e.target.value.length <= 18) {
                  setName(e.target.value);
                }
              }}
              placeholder="Nama lengkap"
              className="w-full bg-transparent outline-none text-[15px] font-medium text-gray-800 placeholder:text-gray-400 placeholder:font-normal"
            />
            <div className="absolute right-4 bottom-3 text-xs text-gray-400">
              {name.length}/18
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6">
        <button
          onClick={handleSave}
          disabled={loading || !name.trim()}
          className="w-full py-4 bg-[#C22C33] text-white rounded-xl font-bold text-[15px] shadow-lg shadow-[#C22C33]/20 hover:bg-[#A12329] active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "SIMPAN PROFIL"}
        </button>
      </div>
    </div>
  );
}
