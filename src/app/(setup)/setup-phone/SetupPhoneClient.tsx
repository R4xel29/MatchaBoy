'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Loader2, Smartphone, MessageSquare, Timer, Coffee, LogOut, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useCartStore } from '@/stores/cart-store';

function formatLocalPhoneInput(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.startsWith('62')) return digits.slice(2);
  if (digits.startsWith('0')) return digits.slice(1);
  return digits;
}

export default function SetupPhoneClient({ initialPhone = '' }: { initialPhone?: string }) {
  const [phone, setPhone] = useState(() => formatLocalPhoneInput(initialPhone));
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [step, setStep] = useState<'input' | 'verify'>('input');
  const [verificationCode, setVerificationCode] = useState('');
  const [targetPhone, setTargetPhone] = useState('');
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds
  const [callbackUrl, setCallbackUrl] = useState('/');
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const cb = params.get('callbackUrl');
      if (cb && cb.startsWith('/')) {
        setCallbackUrl(cb);
      }
      // Mark that the user has seen the phone setup screen so they are never trapped in a redirect loop when browsing the menu
      try {
        sessionStorage.setItem('skip_phone_setup', 'true');
        localStorage.setItem('skip_phone_setup', 'true');
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (initialPhone && !phone) {
      setPhone(formatLocalPhoneInput(initialPhone));
    }
  }, [initialPhone]);

  const handleSkipToMenu = () => {
    try {
      sessionStorage.setItem('skip_phone_setup', 'true');
      localStorage.setItem('skip_phone_setup', 'true');
    } catch {}
    router.push('/');
    router.refresh();
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      sessionStorage.removeItem('skip_phone_setup');
      localStorage.removeItem('skip_phone_setup');
      useCartStore.getState().clearCart();
      await signOut({ redirect: false });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error(err);
      setLoggingOut(false);
    }
  };

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

  const handleInstantVerification = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/setup/phone/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (res.ok) {
        setVerificationCode(data.code);
        setTargetPhone('');
        setStep('verify');
        setTimeLeft(900);
        showToast('Menyiapkan verifikasi instan...', 'success');
        
        const waBotNumber = process.env.NEXT_PUBLIC_WA_BOT_NUMBER || '6289525672990';
        const waMessage = `VERIFIKASI-${data.code}`;
        window.open(`https://wa.me/${waBotNumber}?text=${encodeURIComponent(waMessage)}`, '_blank');
      } else {
        showToast(data.error || 'Gagal menyiapkan verifikasi instan', 'error');
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
          try {
            sessionStorage.removeItem('skip_phone_setup');
            localStorage.removeItem('skip_phone_setup');
          } catch {}
          showToast('WhatsApp berhasil diverifikasi!', 'success');
          
          // Complete onboarding, redirect to callbackUrl or homepage
          router.push(callbackUrl || '/');
          router.refresh();
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [step, router, showToast, callbackUrl]);

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
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-between pt-6 px-6 pb-safe">
      {/* Top Bar: Skip to Menu & Logout */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between py-2">
        <button
          type="button"
          onClick={handleSkipToMenu}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100/80 text-xs font-bold transition-all active:scale-95"
        >
          <Coffee className="w-4 h-4" />
          <span>Lihat Menu Dulu</span>
        </button>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:text-red-600 hover:border-red-200 text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
        >
          {loggingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
          <span>Keluar / Ganti Akun</span>
        </button>
      </div>

      <div className="flex-1 max-w-md w-full mx-auto flex flex-col justify-center py-6">
        {callbackUrl.startsWith('/checkout') && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed font-medium">
              Verifikasi nomor WhatsApp diperlukan sebelum menyelesaikan pesanan di halaman Checkout agar Anda menerima info status pesanan.
            </div>
          </div>
        )}

        {step === 'input' ? (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-[#B48A5E]/10 rounded-full flex items-center justify-center mx-auto text-[#B48A5E]">
                <Smartphone className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 font-serif">
                Hubungkan WhatsApp
              </h1>
              <p className="text-sm text-gray-500 max-w-[300px] mx-auto leading-relaxed">
                Silakan hubungkan nomor WhatsApp aktif Anda untuk verifikasi instan dan notifikasi pesanan.
              </p>
            </div>

            {/* INSTANT VERIFICATION BUTTON */}
            <button
              onClick={handleInstantVerification}
              disabled={loading}
              className="w-full py-4 bg-[#25D366] text-white rounded-xl font-bold text-[15px] shadow-lg shadow-[#25D366]/20 hover:bg-[#20bd5a] active:scale-[0.98] transition-all flex justify-center items-center gap-2.5"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              VERIFIKASI INSTAN VIA WA
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-[#FDFBF7] text-gray-400 font-medium">ATAU INPUT MANUAL</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label className="text-sm font-medium text-gray-700">Nomor WhatsApp</label>
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
            </div>

            <button
              onClick={handleRequestVerification}
              disabled={loading || !phone.trim()}
              className="w-full py-4 bg-[#C22C33] text-white rounded-xl font-bold text-[15px] shadow-lg shadow-[#C22C33]/20 hover:bg-[#A12329] active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'KIRIM KODE VERIFIKASI MANUAL'
              )}
            </button>

            <button
              type="button"
              onClick={handleSkipToMenu}
              className="w-full py-3.5 bg-white border border-[#D4A574]/30 text-[#B48A5E] rounded-xl font-bold text-[14px] hover:bg-amber-50/50 active:scale-[0.98] transition-all flex justify-center items-center gap-2"
            >
              <Coffee className="w-4 h-4" />
              <span>Lewati & Lihat Menu Dulu</span>
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
                {targetPhone ? (
                  <>Kami telah menyiapkan kode verifikasi untuk nomor WhatsApp <span className="font-bold text-gray-800">+{targetPhone}</span>.</>
                ) : (
                  <>Kirim pesan verifikasi berikut menggunakan nomor WhatsApp aktif Anda untuk menghubungkannya secara instan.</>
                )}
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

              <button
                type="button"
                onClick={handleSkipToMenu}
                className="w-full py-3.5 bg-white border border-[#D4A574]/30 text-[#B48A5E] rounded-xl font-bold text-[14px] hover:bg-amber-50/50 active:scale-[0.98] transition-all flex justify-center items-center gap-2"
              >
                <Coffee className="w-4 h-4" />
                <span>Lewati & Lihat Menu Dulu</span>
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
