'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Smartphone, MessageSquare, Timer } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function SetupPhoneClient() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'verify'>('input');
  const [verificationCode, setVerificationCode] = useState('');
  const [targetPhone, setTargetPhone] = useState('');
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds
  const router = useRouter();
  const { showToast } = useToast();

  const handleRequestVerification = async () => {
    if (!phone.trim()) return;
    setLoading(true);

    try {
      const res = await fetch('/api/user/setup/phone/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (res.ok) {
        setVerificationCode(data.code);
        setTargetPhone(data.phone);
        setStep('verify');
        setTimeLeft(900); // Reset timer to 15 mins
        showToast('Kode verifikasi berhasil dibuat!', 'success');
      } else {
        showToast(data.error || 'Gagal mengirim permintaan verifikasi', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Countdown timer for State 2
  useEffect(() => {
    if (step !== 'verify' || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [step, timeLeft]);

  // Polling for verification status in State 2
  useEffect(() => {
    if (step !== 'verify') return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/user/setup/phone/status');
        const data = await res.json();

        if (res.ok && data.verified) {
          clearInterval(pollInterval);
          showToast('WhatsApp berhasil diverifikasi!', 'success');
          
          // Complete onboarding, redirect to homepage
          router.push('/');
          router.refresh();
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [step, router, showToast]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOpenWA = () => {
    const waBotNumber = process.env.NEXT_PUBLIC_WA_BOT_NUMBER || '6289525672990';
    const waMessage = `VERIFIKASI-${verificationCode}`;
    window.open(`https://wa.me/${waBotNumber}?text=${encodeURIComponent(waMessage)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-between pt-12 px-6 pb-safe">
      <div className="flex-1 max-w-md w-full mx-auto flex flex-col justify-center">
        {step === 'input' ? (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-[#B48A5E]/10 rounded-full flex items-center justify-center mx-auto text-[#B48A5E]">
                <Smartphone className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 font-serif">
                Verifikasi WhatsApp Anda
              </h1>
              <p className="text-sm text-gray-500 max-w-[300px] mx-auto leading-relaxed">
                Untuk meningkatkan keamanan dan kenyamanan transaksi, harap hubungkan nomor WhatsApp aktif Anda.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label className="text-sm font-medium text-gray-700">Nomor WhatsApp</label>
                <span className="text-[11px] text-gray-400 font-bold uppercase">Wajib Diisi</span>
              </div>
              <div className="flex bg-white rounded-2xl overflow-hidden border border-gray-200 focus-within:border-[#B48A5E] focus-within:ring-1 focus-within:ring-[#B48A5E]/50 transition-all p-1">
                <div className="pl-4 pr-3 py-3.5 flex items-center justify-center font-bold text-gray-800 border-r border-gray-100">
                  +62
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="8123456789"
                  className="flex-1 px-4 py-3.5 bg-transparent outline-none font-medium text-gray-800 placeholder:text-gray-400 placeholder:font-normal"
                />
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed px-1">
                Pastikan nomor WhatsApp Anda aktif untuk menerima link konfirmasi transaksi dan promo menarik.
              </p>
            </div>

            <button
              onClick={handleRequestVerification}
              disabled={loading || !phone.trim()}
              className="w-full py-4 bg-[#C22C33] text-white rounded-xl font-bold text-[15px] shadow-lg shadow-[#C22C33]/20 hover:bg-[#A12329] active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'KIRIM KODE VERIFIKASI'
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500 animate-pulse">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 font-serif">
                Menunggu Konfirmasi WA
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                Kami telah menyiapkan kode verifikasi untuk nomor WhatsApp <span className="font-bold text-gray-800">+{targetPhone}</span>.
              </p>
            </div>

            <div className="bg-[#FFF9EE] rounded-3xl p-5 border border-brand-100/50 space-y-4 text-center">
              <div className="space-y-1">
                <p className="text-[11px] text-[#B48A5E] font-bold uppercase tracking-wider">
                  Salin & Kirim Pesan Ini Ke WA Bot
                </p>
                <p className="text-2xl font-mono font-black text-[#B48A5E] tracking-wider bg-white py-3 rounded-2xl border border-amber-200/50 select-all cursor-pointer">
                  VERIFIKASI-{verificationCode}
                </p>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-xs text-amber-600 font-medium">
                <Timer className="w-4 h-4" />
                <span>Kode kedaluwarsa dalam: <span className="font-bold">{formatTime(timeLeft)}</span></span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleOpenWA}
                className="w-full py-4 bg-[#25D366] text-white rounded-xl font-bold text-[15px] shadow-lg shadow-[#25D366]/20 hover:bg-[#20bd5a] active:scale-[0.98] transition-all flex justify-center items-center gap-2.5"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                KIRIM KE WHATSAPP BOT
              </button>

              <button
                onClick={() => setStep('input')}
                className="w-full py-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-[14px] hover:bg-gray-50 active:scale-[0.98] transition-all flex justify-center items-center gap-1.5"
              >
                Ganti Nomor WhatsApp
              </button>
            </div>

            <div className="flex items-start gap-2.5 p-4 bg-emerald-50/60 rounded-2xl text-[12px] text-emerald-800 leading-relaxed font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0 mt-0.5" />
              <span>Sistem sedang mendeteksi konfirmasi Anda secara otomatis. Anda tidak perlu merefresh halaman ini.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
