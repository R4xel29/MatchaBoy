"use client"

import { useState, useEffect, Suspense } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Loader2, ArrowLeft, AlertTriangle } from "lucide-react"
import { useToast } from "@/components/ui/Toast"
import { LoginPasskeyButton } from "@/components/auth/PasskeyButtons"

function LoginContent() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isBanned, setIsBanned] = useState(false)
  const [showEmailLogin, setShowEmailLogin] = useState(false)
  const [waToken, setWaToken] = useState("")
  const [waMessage, setWaMessage] = useState("")
  
  const searchParams = useSearchParams()
  const errorParam = searchParams.get("error")
  const router = useRouter()
  const { showToast } = useToast()

  // Generate a random token on mount for WA
  useState(() => {
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const formattedToken = `${token.substring(0,8)}-${token.substring(8,12)}-${token.substring(12,16)}-${token.substring(16,20)}-${token.substring(20,32)}`;
    const otp = Math.floor(10000 + Math.random() * 90000);
    setWaToken(formattedToken);
    setWaMessage(`Hi Arus, request link untuk Masuk / Daftar ke aplikasi Arus dengan nomor WhatsApp ini dong ${formattedToken}. OTP ${otp}.`);
  })

  // Detect banned access from URL query parameter (like Google OAuth / Passkey redirects)
  useEffect(() => {
    if (errorParam === "AccessDenied") {
      setIsBanned(true)
      setError("Akun ditangguhkan")
      showToast("Akun Anda telah ditangguhkan", "error")
    }
  }, [errorParam, showToast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setIsBanned(false)
    
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      })
      
      if (res?.error) {
        if (res.error === "AccessDenied") {
          setIsBanned(true)
          setError("Akun ditangguhkan")
          showToast("Login gagal: Akun ditangguhkan", "error")
        } else {
          setError("Email atau password salah")
          showToast("Email atau password salah", "error")
        }
      } else {
        showToast("Login berhasil!", "success")
        // Fetch updated session to get user role
        const session = await getSession()
        const role = (session?.user as any)?.role
        
        if (role === 'ADMIN') {
          router.push("/admin")
        } else if (role === 'CASHIER') {
          router.push("/admin/cashier")
        } else {
          router.push("/profile")
        }
        router.refresh()
      }
    } catch (err) {
      setError("Terjadi kesalahan sistem")
    } finally {
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
          <h1 className="font-serif text-4xl text-[#B48A5E] mb-2">Welcome Back</h1>
          <p className="text-gray-500">Log in to track your matcha orders.</p>
        </motion.div>
        
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {isBanned ? (
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
          ) : (
            error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 text-center">
                {error}
              </div>
            )
          )}
          
          {/* WHATSAPP LOGIN - PRIMARY */}
          {!showEmailLogin ? (
            <div className="space-y-4">
              <a
                href={`https://wa.me/${process.env.NEXT_PUBLIC_WA_BOT_NUMBER || "628123456789"}?text=${encodeURIComponent(waMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 bg-[#25D366] text-white rounded-full font-medium shadow-md hover:bg-[#20bd5a] active:scale-[0.98] transition-all flex justify-center items-center gap-3"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Login dengan WhatsApp
              </a>
              <p className="text-xs text-center text-gray-500 mt-2">
                Klik tombol di atas untuk mengirim pesan konfirmasi ke WhatsApp kami.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#B48A5E]">Email</label>
                <input
                  type="email"
                  required={showEmailLogin}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#B48A5E]/20 focus:border-[#B48A5E] transition-all"
                  placeholder="matcha@example.com"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#B48A5E]">Password</label>
                <input
                  type="password"
                  required={showEmailLogin}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#B48A5E]/20 focus:border-[#B48A5E] transition-all"
                  placeholder="••••••••"
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 mt-4 bg-[#B48A5E] text-white rounded-full font-medium shadow-md hover:bg-[#946F48] active:scale-[0.98] transition-all disabled:opacity-70 flex justify-center items-center"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In with Email"}
              </button>
            </>
          )}
          <div className="relative mt-8 mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#FDFBF7] text-gray-500">Atau lanjutkan dengan</span>
            </div>
          </div>

          <div className="space-y-4">
            <LoginPasskeyButton />
            
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/profile" })}
              className="w-full py-4 bg-white border border-gray-200 text-gray-700 rounded-full font-medium shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-all flex justify-center items-center gap-3"
            >
            <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </button>
          
          {!showEmailLogin && (
            <button
              type="button"
              onClick={() => setShowEmailLogin(true)}
              className="w-full py-4 bg-white border border-gray-200 text-gray-700 rounded-full font-medium shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-all flex justify-center items-center gap-3 mt-4"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Sign in with Email
            </button>
          )}
          </div>
        </motion.form>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 text-center"
        >
          <p className="text-gray-500 text-sm">
            Belum punya akun?{' '}
            <Link href="/register" className="text-[#B48A5E] font-medium hover:underline">
              Daftar sekarang
            </Link>
          </p>
        </motion.div>
      </div>
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
