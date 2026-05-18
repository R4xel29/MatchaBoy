"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Loader2, ArrowLeft } from "lucide-react"
import { registerUser } from "@/app/actions/auth"
import { signIn } from "next-auth/react"
import { useToast } from "@/components/ui/Toast"

export default function RegisterPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#B48A5E]" /></div>}>
      <RegisterPage />
    </Suspense>
  )
}

function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showOtherMethods, setShowOtherMethods] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const refCode = searchParams.get('ref') || ''
  const { showToast } = useToast()

  const handleWALogin = () => {
    setLoading(true);
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const formattedToken = `${token.substring(0,8)}-${token.substring(8,12)}-${token.substring(12,16)}-${token.substring(16,20)}-${token.substring(20,32)}`;
    const otp = Math.floor(10000 + Math.random() * 90000);
    const waMessage = `Hi Arus, request link untuk Masuk / Daftar ke aplikasi Arus dengan nomor WhatsApp ini dong ${formattedToken}. OTP ${otp}.`;
    
    window.open(`https://wa.me/${process.env.NEXT_PUBLIC_WA_BOT_NUMBER || "6289525672990"}?text=${encodeURIComponent(waMessage)}`, '_blank');
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    
    try {
      const res = await registerUser(formData)
      
      if (res.error) {
        setError(res.error)
        showToast(res.error, "error")
        setLoading(false)
      } else if (res.success) {
        // Auto login after register
        const loginRes = await signIn("credentials", {
          redirect: false,
          email,
          password,
        })
        
        if (!loginRes?.error) {
          showToast("Akun berhasil dibuat!", "success")
          router.push("/profile")
          router.refresh()
        } else {
          router.push("/login")
        }
      }
    } catch (err) {
      setError("Terjadi kesalahan sistem")
      setLoading(false)
    }
  }

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
          <h1 className="font-serif text-4xl text-[#B48A5E] mb-2">Join Arus</h1>
          <p className="text-gray-500">Create an account to start ordering.</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 text-center">
              {error}
            </div>
          )}

          {refCode && (
            <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-xl border border-emerald-100 text-center flex items-center justify-center gap-2 mb-2">
              🎉 Kamu diajak teman! Daftar dan beli pertama untuk dapat bonus.
            </div>
          )}

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
                onClick={handleWALogin}
                className="w-full py-4 bg-[#25D366] text-white rounded-2xl font-bold shadow-lg shadow-[#25D366]/30 hover:bg-[#20bd5a] active:scale-[0.98] transition-all flex justify-center items-center gap-3 text-[17px]"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Daftar Instan
              </button>

              <p className="text-sm text-center text-gray-500 mt-4 px-4 leading-relaxed">
                BARU! Daftar instan dengan WhatsApp—<br/>tanpa ribet OTP atau Password!
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
                Kembali ke Daftar Instan
              </button>

              <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                {/* Hidden referral code field */}
                <input type="hidden" name="referralCode" value={refCode} />
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#B48A5E]">Nama Lengkap</label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#B48A5E]/20 focus:border-[#B48A5E] transition-all"
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#B48A5E]">Email</label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#B48A5E]/20 focus:border-[#B48A5E] transition-all"
                    placeholder="matcha@example.com"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#B48A5E]">Password</label>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={6}
                    className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#B48A5E]/20 focus:border-[#B48A5E] transition-all"
                    placeholder="Minimal 6 karakter"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 mt-6 bg-[#B48A5E] text-white rounded-full font-medium shadow-md hover:bg-[#946F48] active:scale-[0.98] transition-all disabled:opacity-70 flex justify-center items-center"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
                </button>
              </form>

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
                onClick={() => signIn("google", { callbackUrl: "/profile" })}
                className="w-full py-4 bg-white border border-gray-200 text-gray-700 rounded-full font-medium shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-all flex justify-center items-center gap-3"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign up with Google
              </button>
            </div>
          )}
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 text-center"
        >
          <p className="text-gray-500 text-sm">
            Sudah punya akun?{' '}
            <Link href="/login" className="text-[#B48A5E] font-medium hover:underline">
              Log in di sini
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
