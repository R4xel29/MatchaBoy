"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Loader2, ArrowLeft } from "lucide-react"
import { registerUser } from "@/app/actions/auth"
import { signIn } from "next-auth/react"
import { useToast } from "@/components/ui/Toast"

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { showToast } = useToast()

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
          <h1 className="font-serif text-4xl text-[#18442D] mb-2">Join Mattchaboy</h1>
          <p className="text-gray-500">Create an account to start ordering.</p>
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
            <label className="text-sm font-medium text-[#18442D]">Nama Lengkap</label>
            <input
              type="text"
              name="name"
              required
              className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#18442D]/20 focus:border-[#18442D] transition-all"
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#18442D]">Email</label>
            <input
              type="email"
              name="email"
              required
              className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#18442D]/20 focus:border-[#18442D] transition-all"
              placeholder="matcha@example.com"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#18442D]">Password</label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#18442D]/20 focus:border-[#18442D] transition-all"
              placeholder="Minimal 6 karakter"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-6 bg-[#18442D] text-white rounded-full font-medium shadow-md hover:bg-[#123321] active:scale-[0.98] transition-all disabled:opacity-70 flex justify-center items-center"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
          </button>
        </motion.form>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 text-center"
        >
          <p className="text-gray-500 text-sm">
            Sudah punya akun?{' '}
            <Link href="/login" className="text-[#18442D] font-medium hover:underline">
              Log in di sini
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
