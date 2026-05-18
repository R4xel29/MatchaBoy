"use client"

import { useState, useEffect, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Loader2, ArrowLeft, AlertTriangle, X } from "lucide-react"
import { useToast } from "@/components/ui/Toast"

function LoginContent() {
  const [loading, setLoading] = useState(false)
  const [phone, setPhone] = useState("")
  const [showOtherMethods, setShowOtherMethods] = useState(false)
  const [showGoogleModal, setShowGoogleModal] = useState(false)
  const [googlePhone, setGooglePhone] = useState("")
  const [googleLoading, setGoogleLoading] = useState(false)
  const searchParams = useSearchParams()
  const errorParam = searchParams.get("error")
  const { showToast } = useToast()

  const handleWALogin = (targetPhone?: string) => {
    setLoading(true);
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const formattedToken = `${token.substring(0,8)}-${token.substring(8,12)}-${token.substring(12,16)}-${token.substring(16,20)}-${token.substring(20,32)}`;
    const otp = Math.floor(10000 + Math.random() * 90000);
    
    let waMessage = `Hi Arus, request link untuk Masuk / Daftar ke aplikasi Arus dengan nomor WhatsApp ini dong ${formattedToken}. OTP ${otp}.`;
    
    if (targetPhone) {
      let stdPhone = targetPhone.replace(/[^0-9]/g, '');
      if (stdPhone.startsWith('08')) {
        stdPhone = '62' + stdPhone.substring(1);
      } else if (stdPhone.startsWith('8')) {
        stdPhone = '62' + stdPhone;
      }
      waMessage += ` HP: ${stdPhone}.`;
    }
    
    window.open(`https://wa.me/${process.env.NEXT_PUBLIC_WA_BOT_NUMBER || "6289525672990"}?text=${encodeURIComponent(waMessage)}`, '_blank');
    setLoading(false);
  };

  const handleGoogleSubmit = async () => {
    if (!googlePhone) return;
    setGoogleLoading(true);

    try {
      const res = await fetch(`/api/user/check-phone-available?phone=${googlePhone}`);
      const data = await res.json();

      if (!res.ok || !data.available) {
        showToast(
          data.error || "Nomor WhatsApp ini sudah terdaftar di akun lain. Silakan hubungkan akun lama Anda melalui Halaman Profil.",
          "error"
        );
        setGoogleLoading(false);
        return;
      }

      // Save standardized phone to cookie
      let standardizedPhone = googlePhone.replace(/[^0-9]/g, '');
      if (standardizedPhone.startsWith('08')) {
        standardizedPhone = '62' + standardizedPhone.substring(1);
      } else if (standardizedPhone.startsWith('8')) {
        standardizedPhone = '62' + standardizedPhone;
      }
      
      document.cookie = `pending_oauth_phone=${standardizedPhone}; path=/; max-age=900; SameSite=Lax`;

      // Trigger Google Sign-In
      await signIn("google", { callbackUrl: "/profile" });
    } catch (err) {
      console.error(err);
      showToast("Gagal memproses pendaftaran", "error");
    } finally {
      setGoogleLoading(false);
    }
  };

  // Detect custom error parameters from NextAuth redirect
  useEffect(() => {
    if (errorParam === "AccessDenied") {
      showToast("Akun Anda telah ditangguhkan. Silakan hubungi admin.", "error")
    } else if (errorParam === "PhoneRequired") {
      showToast("Silakan hubungkan nomor WhatsApp Anda untuk melanjutkan.", "error")
      setShowGoogleModal(true)
    } else if (errorParam === "PhoneConflict") {
      showToast("Nomor WhatsApp ini sudah digunakan oleh akun lain.", "error")
      setShowGoogleModal(true)
    }
  }, [errorParam, showToast])

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col px-6">
      <div className="pt-8 pb-4">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-[#B48A5E] transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali ke Home
        </Link>
      </div>
      
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="font-serif text-4xl text-[#B48A5E] mb-2">Welcome Back</h1>
          <p className="text-gray-500">Log in to track your matcha orders.</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {errorParam === "AccessDenied" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-amber-50/90 border border-amber-200/80 rounded-2xl flex flex-col gap-3 text-left shadow-sm backdrop-blur-sm"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100/80 flex items-center justify-center shrink-0 text-amber-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-amber-900 font-serif">Akses Akun Ditangguhkan</h3>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Mohon maaf, akun Anda telah ditangguhkan karena terdeteksi melanggar Ketentuan Layanan kami.
                  </p>
                </div>
              </div>
              
              <div className="border-t border-amber-200/50 pt-2.5 flex justify-end">
                <a
                  href={`https://wa.me/${process.env.NEXT_PUBLIC_WA_BOT_NUMBER || "6289525672990"}?text=${encodeURIComponent("Halo Admin Arus, akun saya terdeteksi ditangguhkan saat mencoba login. Bisa tolong dibantu cek?")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-medium transition-colors inline-flex items-center gap-1.5 shadow-sm"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Hubungi Customer Service
                </a>
              </div>
            </motion.div>
          )}
          
          {/* WHATSAPP LOGIN - PRIMARY */}
          {!showOtherMethods ? (
            <div className="space-y-4">
              <div className="flex justify-end mb-4">
                <button 
                  type="button"
                  onClick={() => setShowOtherMethods(true)}
                  className="px-4 py-2 border border-[#B48A5E] text-[#B48A5E] rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#B48A5E]/5"
                >
                  Metode Lainnya
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleWALogin()}
                className="w-full py-4 bg-[#25D366] text-white rounded-2xl font-bold shadow-lg shadow-[#25D366]/30 hover:bg-[#20bd5a] active:scale-[0.98] transition-all flex justify-center items-center gap-3 text-[17px]"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Masuk / Daftar Instan
              </button>

              <p className="text-sm text-center text-gray-500 mt-4 px-4 leading-relaxed">
                BARU! Masuk atau Daftar instan dengan WhatsApp—<br/>tanpa ribet OTP!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <button 
                type="button"
                onClick={() => setShowOtherMethods(false)}
                className="px-4 py-2 border border-[#B48A5E] text-[#B48A5E] rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#B48A5E]/5 w-max"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                WhatsApp Masuk / Daftar Instan
              </button>

              <div className="space-y-4 mt-6">
                <div className="flex bg-white rounded-xl overflow-hidden border border-gray-200 focus-within:border-[#B48A5E] focus-within:ring-1 focus-within:ring-[#B48A5E]/50 transition-all">
                  <div className="pl-4 pr-3 py-4 flex items-center justify-center font-bold text-gray-800 border-r border-gray-200">
                    +62
                  </div>
                  <input 
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="Nomor Handphone"
                    className="flex-1 px-4 py-4 bg-transparent outline-none font-medium text-gray-800 placeholder:text-gray-400 placeholder:font-normal"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleWALogin(phone)}
                  disabled={!phone || loading}
                  className="w-full py-4 bg-gray-200 text-gray-500 rounded-xl font-bold hover:bg-[#B48A5E] hover:text-white transition-all disabled:opacity-50 disabled:hover:bg-gray-200 disabled:hover:text-gray-500 flex items-center justify-center"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Lanjut Konfirmasi"}
                </button>
              </div>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-[#FDFBF7] text-gray-500 font-medium">ATAU</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowGoogleModal(true)}
                className="w-full py-3.5 bg-white border border-gray-200 text-gray-700 rounded-full font-bold shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-all flex justify-center items-center gap-3"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Lanjutkan dengan Google
              </button>
            </div>
          )}
        </motion.div>
        
    
      </div>

      {showGoogleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all">
          <div className="bg-[#FDFBF7] w-full max-w-md rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl border border-gray-100 flex flex-col p-6 animate-in slide-in-from-bottom duration-300 relative min-h-[500px]">
            {/* Close button */}
            <button
              type="button"
              onClick={() => {
                setShowGoogleModal(false);
                setGooglePhone("");
              }}
              className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-all cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header / Google Logo */}
            <div className="flex flex-col items-center mt-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span className="font-bold text-gray-800 text-[15px] tracking-tight">Terhubung dengan Google</span>
              </div>
              <div className="w-full border-b border-gray-100"></div>
            </div>

            {/* Content body */}
            <div className="flex-1 flex flex-col justify-between mt-2">
              <div className="space-y-6">
                <p className="text-center text-sm font-medium text-gray-600 max-w-[280px] mx-auto leading-relaxed">
                  Masukkan No. HP untuk melanjutkan pendaftaran
                </p>

                {/* Input */}
                <div className="space-y-2">
                  <div className="flex bg-[#F3F4F6] rounded-2xl overflow-hidden p-1">
                    <div className="pl-4 pr-3 py-3.5 flex items-center justify-center font-bold text-gray-800 text-lg border-r border-gray-200">
                      +62
                    </div>
                    <input 
                      type="tel"
                      value={googlePhone}
                      onChange={(e) => setGooglePhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="Nomor Handphone"
                      className="flex-1 px-4 py-3.5 bg-transparent outline-none font-bold text-lg text-gray-800 placeholder:text-gray-400 placeholder:font-normal"
                    />
                  </div>
                </div>

                {/* Yellow Alert Box */}
                <div className="bg-[#FFF9EE] border border-amber-200/50 rounded-2xl p-4 flex gap-3 items-start text-left">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-amber-600 font-bold text-sm">
                    ?
                  </div>
                  <div className="text-[12px] text-amber-800 leading-relaxed font-medium">
                    Hubungkan akun lama kamu dengan Google melalui Profile Page
                  </div>
                </div>
              </div>

              {/* Red Confirm Button */}
              <button
                type="button"
                onClick={handleGoogleSubmit}
                disabled={!googlePhone || googleLoading}
                className="w-full py-4.5 bg-[#C22C33] text-white rounded-2xl font-bold text-[15px] shadow-lg shadow-[#C22C33]/20 hover:bg-[#A12329] active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center gap-2 mt-8"
              >
                {googleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "LANJUT KONFIRMASI"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#B48A5E] animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
