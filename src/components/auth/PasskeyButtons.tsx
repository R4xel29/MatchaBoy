'use client'

import { signIn } from "next-auth/react"
import { Fingerprint, Loader2 } from "lucide-react"
import { useState } from "react"

export function RegisterPasskeyButton() {
    const [loading, setLoading] = useState(false)

    const handleRegister = async () => {
        try {
            setLoading(true)
            // In Auth.js v5, to register a new passkey while logged in
            // we use the 'passkey' provider with action: 'register'
            await signIn("passkey", { action: "register" })
        } catch (error) {
            console.error("Failed to register passkey:", error)
            alert("Gagal mendaftarkan sidik jari. Pastikan perangkat Anda mendukung biometrik.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleRegister}
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full p-3 bg-amber-100 text-amber-900 border border-amber-200 rounded-xl hover:bg-amber-200 transition-colors disabled:opacity-50"
        >
            {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <Fingerprint className="w-5 h-5" />
            )}
            <span>Daftarkan Sidik Jari (Passkey)</span>
        </button>
    )
}

export function LoginPasskeyButton() {
    const [loading, setLoading] = useState(false)

    const handleLogin = async () => {
        try {
            setLoading(true)
            // To login with passkey, just use signIn("passkey")
            const result = await signIn("passkey", { callbackUrl: "/" })
            if (result?.error) {
                console.error("Passkey login error:", result.error)
            }
        } catch (error) {
            console.error("Failed to login with passkey:", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleLogin}
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full p-4 bg-white text-slate-900 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm hover:shadow-md disabled:opacity-50 font-medium"
        >
            {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <Fingerprint className="w-5 h-5 text-amber-600" />
            )}
            <span>Masuk dengan Sidik Jari</span>
        </button>
    )
}
