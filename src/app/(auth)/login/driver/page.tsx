"use client"

import { useState, useEffect, Suspense } from "react"
import { signIn, useSession } from "next-auth/react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Loader2, ArrowLeft, AlertTriangle, Truck, Mail, Lock, ShieldCheck, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/components/ui/Toast"

function DriverLoginContent() {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  
  const searchParams = useSearchParams()
  const errorParam = searchParams.get("error")
  const callbackUrl = searchParams.get("callbackUrl") || "/driver"
  const { showToast } = useToast()

  // Redirect if already logged in as a driver
  useEffect(() => {
    if (sessionStatus === "authenticated") {
      if (session?.user?.role === "DRIVER") {
        router.replace("/driver")
      } else {
        showToast("Anda masuk dengan akun non-kurir. Dialihkan ke profil.", "info")
        router.replace("/profile")
      }
    }
  }, [sessionStatus, session, router, showToast])

  // Handle Credentials Login (Email/Password)
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      })

      if (res?.error) {
        showToast("Email atau password salah.", "error")
      } else {
        showToast("Berhasil masuk!", "success")
        window.location.href = callbackUrl
      }
    } catch (err) {
      console.error(err)
      showToast("Terjadi kesalahan sistem", "error")
    } finally {
      setLoading(false)
    }
  }

  // Detect custom error parameters from NextAuth redirect
  useEffect(() => {
    if (errorParam === "AccessDenied") {
      showToast("Akun Anda telah ditangguhkan. Silakan hubungi admin.", "error")
    } else if (errorParam === "CredentialsSignin") {
      showToast("Gagal melakukan verifikasi kredensial.", "error")
    }
  }, [errorParam, showToast])

  if (sessionStatus === "loading") {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#B48A5E] animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#FDFBF7] flex flex-col px-6 relative overflow-hidden">
      {/* Decorative backdrop gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] aspect-square bg-[#B48A5E]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] aspect-square bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Back button header */}
      <div className="pt-8 pb-4 z-10 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center text-sm font-semibold text-gray-500 hover:text-[#B48A5E] transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Beranda
        </Link>
      </div>
      
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto pb-20 z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-[#B48A5E] to-[#8C663E] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#B48A5E]/20">
            <Truck className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h1 className="font-serif text-3xl text-gray-800 font-bold mb-1">Portal Kurir</h1>
          <p className="text-sm text-gray-500 max-w-[280px] mx-auto">
            Masuk dengan email dan password yang diberikan oleh Admin.
          </p>
        </motion.div>

        {/* Error notification block */}
        {errorParam === "AccessDenied" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-amber-50/90 border border-amber-200/80 rounded-2xl flex flex-col gap-3 text-left shadow-sm backdrop-blur-sm mb-6"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100/80 flex items-center justify-center shrink-0 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-amber-900 font-serif">Akses Mitra Ditangguhkan</h3>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Akun kurir Anda dinonaktifkan atau ditangguhkan oleh Admin. Silakan hubungi admin toko.
                </p>
              </div>
            </div>
            <div className="border-t border-amber-200/50 pt-2.5 flex justify-end">
              <a
                href={`https://wa.me/${process.env.NEXT_PUBLIC_WA_BOT_NUMBER || "6289525672990"}?text=${encodeURIComponent("Halo Admin Matchaboy, akun kurir saya ditangguhkan/tidak bisa masuk. Bisa dibantu cek?")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shadow-sm"
              >
                Hubungi Admin Toko
              </a>
            </div>
          </motion.div>
        )}

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div className="space-y-3">
              {/* Email */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 block pl-1">Email Kurir</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="kurir@email.com"
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white focus:ring-2 focus:ring-[#B48A5E]/20 focus:border-[#B48A5E] outline-none text-sm transition-all font-medium text-gray-800"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-600 block pl-1">Kata Sandi</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3.5 rounded-2xl border border-gray-200 bg-white focus:ring-2 focus:ring-[#B48A5E]/20 focus:border-[#B48A5E] outline-none text-sm transition-all font-medium text-gray-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-[#B48A5E] to-[#96714C] text-white rounded-2xl font-bold hover:from-[#96714C] hover:to-[#7D5B3D] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center text-sm shadow-lg shadow-[#B48A5E]/20 mt-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Masuk"}
            </button>
          </form>

          {/* Help note */}
          <div className="mt-6 bg-gray-50/80 border border-gray-100 rounded-2xl p-4 text-center">
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Password diberikan oleh Admin. Jika Anda lupa password, hubungi Admin untuk mengatur ulang.
            </p>
          </div>
        </motion.div>

        {/* Secure badge footer */}
        <div className="mt-8 flex items-center justify-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          Sistem Autentikasi Mitra Aman
        </div>
      </div>
    </div>
  )
}

export default function DriverLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#B48A5E] animate-spin" />
      </div>
    }>
      <DriverLoginContent />
    </Suspense>
  )
}
