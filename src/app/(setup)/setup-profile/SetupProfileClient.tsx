'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, User, Cake, Mail, Sparkles, Check, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SetupProfileClient() {
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'MAN' | 'WOMAN' | 'SECRET'>('MAN');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const genderOptions: { id: 'MAN' | 'WOMAN' | 'SECRET'; label: string }[] = [
    { id: 'MAN', label: 'Laki-laki' },
    { id: 'WOMAN', label: 'Perempuan' },
    { id: 'SECRET', label: 'Rahasiakan' },
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama lengkap wajib diisi');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/user/setup/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          birthDate: birthDate || undefined,
          gender,
          email: email.trim() || undefined,
        }),
      });

      if (res.ok) {
        try {
          const checkRes = await fetch('/api/user/check-phone');
          const checkData = await checkRes.json();
          if (!checkData.phoneVerified) {
            router.push('/setup-phone');
            router.refresh();
            return;
          }
        } catch {}
        router.push('/');
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Gagal menyimpan profil. Silakan coba lagi.');
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan jaringan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/60 via-[#FFFBF7] to-amber-50/40 flex flex-col justify-between pt-10 pb-8 px-6">
      <div className="flex-1 max-w-md w-full mx-auto">
        {/* Step Progress Indicator */}
        <div className="w-full mb-6">
          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-orange-600 mb-2">
            <span>Langkah 2 dari 2</span>
            <span>Lengkapi Profil</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="h-1.5 rounded-full bg-orange-400/70" />
            <div className="h-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 shadow-xs" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white/95 backdrop-blur-sm border border-orange-100 rounded-3xl p-6 shadow-[0_12px_35px_rgba(249,115,22,0.08)]"
        >
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center mb-3.5 shadow-lg shadow-orange-500/25 ring-4 ring-orange-50">
              <User className="w-7 h-7" />
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 border border-orange-200/70 px-3 py-1 rounded-full mb-2">
              <Sparkles className="w-3 h-3" /> Selamat Datang di Arum Seduh
            </span>
            <h1 className="text-2xl font-bold text-gray-900 font-serif">
              Lengkapi Informasi Diri
            </h1>
            <p className="text-xs text-gray-500 mt-1 max-w-[270px] leading-relaxed font-medium">
              Isi data singkat berikut agar pengalaman memesan dan kejutan promo kamu makin personal.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Nama Lengkap */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-extrabold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-orange-500" />
                  <span>Nama Panggilan / Lengkap</span>
                </label>
                <span className="text-[10px] text-orange-600 font-black uppercase bg-orange-50 px-2 py-0.5 rounded-full">
                  Wajib
                </span>
              </div>
              <div className="relative bg-orange-50/30 rounded-2xl border border-orange-200/70 px-4 py-3.5 focus-within:bg-white focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/15 transition-all">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    if (e.target.value.length <= 25) {
                      setName(e.target.value);
                    }
                  }}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full bg-transparent outline-none text-sm font-bold text-gray-900 placeholder:text-gray-400 placeholder:font-medium pr-12"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-400">
                  {name.length}/25
                </span>
              </div>
            </div>

            {/* Tanggal Lahir */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-extrabold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                  <Cake className="w-3.5 h-3.5 text-orange-500" />
                  <span>Tanggal Lahir</span>
                </label>
                <span className="text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full">
                  Hadiah Ulang Tahun
                </span>
              </div>
              <div className="bg-orange-50/30 rounded-2xl border border-orange-200/70 px-4 py-3.5 focus-within:bg-white focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/15 transition-all">
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full bg-transparent outline-none text-sm font-bold text-gray-900 cursor-pointer"
                />
              </div>
              <p className="text-[10px] text-gray-400 font-medium pl-1">
                Kami akan mengirimkan voucher spesial di hari ulang tahunmu.
              </p>
            </div>

            {/* Jenis Kelamin */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-gray-600 block">
                Jenis Kelamin
              </label>
              <div className="grid grid-cols-3 gap-2">
                {genderOptions.map((opt) => {
                  const isSelected = gender === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setGender(opt.id)}
                      className={`py-3 px-2.5 rounded-2xl border text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-500 shadow-sm shadow-orange-500/20'
                          : 'bg-orange-50/30 text-gray-600 border-orange-200/60 hover:bg-orange-50'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Email (Opsional) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-extrabold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-orange-500" />
                  <span>Alamat Email</span>
                </label>
                <span className="text-[10px] text-gray-400 font-bold">Opsional</span>
              </div>
              <div className="bg-orange-50/30 rounded-2xl border border-orange-200/70 px-4 py-3.5 focus-within:bg-white focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/15 transition-all">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full bg-transparent outline-none text-sm font-bold text-gray-900 placeholder:text-gray-400 placeholder:font-medium"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-500 font-bold text-center bg-red-50 border border-red-100 py-2 px-3 rounded-xl">
                {error}
              </p>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Menyimpan Profil...</span>
                  </>
                ) : (
                  <>
                    <span>Simpan & Mulai Pesan</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
