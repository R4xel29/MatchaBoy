"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, ArrowLeft, Mail, Lock, Eye, EyeOff, ShieldCheck, AlertCircle } from "lucide-react"
import { useToast } from "@/components/ui/Toast"

export default function AdminArusLoginClient() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { showToast } = useToast()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email || !password) return

    setLoading(true)
    setError("")

    try {
      // Use NextAuth credentials provider to authenticate
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      })

      if (res?.error) {
        let errorMsg = "Email atau password salah"
        if (res.error.includes("CredentialsSignin")) {
          errorMsg = "Email atau password yang Anda masukkan tidak valid"
        }
        setError(errorMsg)
        showToast(errorMsg, "error")
        setLoading(false)
      } else {
        showToast("Login Berhasil! Mengalihkan ke Dashboard...", "success")
        
        // Use window.location to force a complete page reload.
        // This ensures NextAuth session state is synchronized globally across the site
        // and Next.js middleware routes the user correctly based on their role.
        setTimeout(() => {
          window.location.href = "/admin"
        }, 600)
      }
    } catch (err) {
      console.error("Login error:", err)
      const systemError = "Terjadi kesalahan sistem saat mencoba masuk"
      setError(systemError)
      showToast(systemError, "error")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] relative overflow-hidden flex flex-col justify-between px-6 py-8">
      {/* Decorative Matcha Organic Background Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-gradient-to-b from-[#2E5A44]/5 via-transparent to-transparent blur-3xl pointer-events-none -mr-40 -mt-40" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-gradient-to-t from-[#B48A5E]/5 via-transparent to-transparent blur-3xl pointer-events-none -ml-40 -mb-40" />

      {/* Header */}
      <div className="max-w-md w-full mx-auto">
        <Link 
          href="/" 
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-[#B48A5E] transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Kembali ke Storefront
        </Link>
      </div>

      {/* Main Login Form Container */}
      <div className="flex-1 flex items-center justify-center py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-md w-full"
        >
          <div className="bg-white/80 backdrop-blur-xl border border-gray-100/80 shadow-xl rounded-3xl p-8 sm:p-10 relative overflow-hidden">
            {/* Elegant Top Highlight Line */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#2E5A44] via-[#B48A5E] to-[#2E5A44]" />

            {/* Portal Branding */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#2E5A44]/10 text-[#2E5A44] mb-4 shadow-inner">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h1 className="font-serif text-3xl text-gray-800 tracking-wide mb-2">
                Arum Seduh Admin
              </h1>
              <p className="text-sm text-gray-500 font-medium">
                Administrative & Cashier Secure Portal
              </p>
            </div>

            {/* Error Alert Display */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 overflow-hidden"
                >
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-700">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div className="text-xs font-semibold leading-relaxed">
                      {error}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">
                  Email Kantor
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#2E5A44] transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@arumseduh.com"
                    className="w-full pl-11 pr-4 py-4 bg-gray-50/50 focus:bg-white border border-gray-200/80 rounded-2xl outline-none focus:ring-2 focus:ring-[#2E5A44]/15 focus:border-[#2E5A44] transition-all font-medium text-gray-800 placeholder:text-gray-400 placeholder:font-normal text-sm"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Sandi Keamanan
                  </label>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#2E5A44] transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-4 bg-gray-50/50 focus:bg-white border border-gray-200/80 rounded-2xl outline-none focus:ring-2 focus:ring-[#2E5A44]/15 focus:border-[#2E5A44] transition-all font-medium text-gray-800 placeholder:text-gray-400 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-[#2E5A44] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 py-4 bg-[#2E5A44] text-white rounded-2xl font-bold shadow-lg shadow-[#2E5A44]/25 hover:bg-[#203f2f] hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-75 disabled:pointer-events-none flex justify-center items-center gap-2.5 text-[15px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Memverifikasi Akses...
                  </>
                ) : (
                  "Masuk ke Dashboard"
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </div>

      {/* Footer / Powered By Info */}
      <div className="max-w-md w-full mx-auto text-center text-xs text-gray-400 font-medium">
        <p>© {new Date().getFullYear()} Arum Seduh. All rights reserved.</p>
        <p className="mt-1 text-gray-300">Secure Environment Level 3 Active</p>
      </div>
    </div>
  )
}
