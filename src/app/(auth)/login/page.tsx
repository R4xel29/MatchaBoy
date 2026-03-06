"use client"

import { useState } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Loader2, ArrowLeft } from "lucide-react"
import { useToast } from "@/components/ui/Toast"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { showToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      })
      
      if (res?.error) {
        setError("Email atau password salah")
        showToast("Email atau password salah", "error")
      } else {
        showToast("Login berhasil!", "success")
        // Fetch updated session to get user role
        const session = await getSession()
        const role = (session?.user as any)?.role
        
        if (role === 'ADMIN') {
          router.push("/admin")
        } else if (role === 'DRIVER') {
          router.push("/driver/orders")
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
        <Link href="/" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-[#18442D] transition-colors">
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
          <h1 className="font-serif text-4xl text-[#18442D] mb-2">Welcome Back</h1>
          <p className="text-gray-500">Log in to track your matcha orders.</p>
        </motion.div>
        
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#18442D]">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#18442D]/20 focus:border-[#18442D] transition-all"
              placeholder="matcha@example.com"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#18442D]">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#18442D]/20 focus:border-[#18442D] transition-all"
              placeholder="••••••••"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-4 bg-[#18442D] text-white rounded-full font-medium shadow-md hover:bg-[#123321] active:scale-[0.98] transition-all disabled:opacity-70 flex justify-center items-center"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
          </button>
        </motion.form>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 text-center"
        >
          <p className="text-gray-500 text-sm">
            Belum punya akun?{' '}
            <Link href="/register" className="text-[#18442D] font-medium hover:underline">
              Daftar sekarang
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
