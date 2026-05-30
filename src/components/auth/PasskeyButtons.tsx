'use client'

import { signIn } from "next-auth/webauthn"
import { Fingerprint, Loader2, X, AlertCircle, HelpCircle, ShieldAlert } from "lucide-react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

export function RegisterPasskeyButton() {
    const [loading, setLoading] = useState(false)
    const [showUnsupportedModal, setShowUnsupportedModal] = useState(false)
    const [showErrorModal, setShowErrorModal] = useState(false)
    const [isSupported, setIsSupported] = useState<boolean | null>(null)

    const [errorMessage, setErrorMessage] = useState<string>("")

    useEffect(() => {
        const checkSupport = async () => {
            const hasWebAuthn = typeof window !== 'undefined' && !!window.PublicKeyCredential;
            if (!hasWebAuthn) {
                setIsSupported(false);
                return;
            }
            try {
                const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
                setIsSupported(available);
            } catch {
                setIsSupported(false);
            }
        };
        checkSupport();
    }, []);

    const handleRegister = async () => {
        if (isSupported === false) {
            setShowUnsupportedModal(true);
            return;
        }

        try {
            setLoading(true)
            setErrorMessage("")
            // In Auth.js v5, to register a new passkey while logged in
            // we use the 'passkey' provider with action: 'register'
            const result = await signIn("passkey", { action: "register", redirect: false })
            if (result?.error) {
                setErrorMessage(result.error)
                setShowErrorModal(true)
            }
        } catch (error: any) {
            console.error("Failed to register passkey:", error)
            setErrorMessage(error?.message || String(error))
            setShowErrorModal(true)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <button
                onClick={handleRegister}
                disabled={loading}
                className="flex items-center justify-center gap-2 w-full p-3.5 bg-amber-50 text-[#B48A5E] border border-amber-200/50 rounded-2xl hover:bg-amber-100 transition-all font-semibold active:scale-[0.98] disabled:opacity-50"
            >
                {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <Fingerprint className="w-5 h-5" />
                )}
                <span>Daftarkan Sidik Jari (Passkey)</span>
            </button>

            {/* Popup Modal: Device Not Supported */}
            <AnimatePresence>
                {showUnsupportedModal && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowUnsupportedModal(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />

                        {/* Modal Container */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", duration: 0.5 }}
                            className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full border border-gray-100 relative z-10 text-center overflow-hidden"
                        >
                            {/* Top decoration element */}
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 to-[#B48A5E]" />

                            <button 
                                onClick={() => setShowUnsupportedModal(false)}
                                className="absolute top-4 right-4 p-1.5 rounded-full bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4 mt-2">
                                <ShieldAlert className="w-8 h-8 text-[#B48A5E]" />
                            </div>

                            <h3 className="font-serif text-lg font-bold text-gray-900 mb-2">
                                Perangkat Tidak Mendukung
                            </h3>
                            <p className="text-xs text-gray-500 leading-relaxed mb-6">
                                Perangkat Anda tidak mendukung dalam scan sidik jari. Pastikan perangkat Anda memiliki sensor sidik jari aktif atau gunakan metode masuk lainnya.
                            </p>

                            <div className="space-y-2">
                                <button
                                    onClick={() => setShowUnsupportedModal(false)}
                                    className="w-full py-3 bg-[#B48A5E] hover:bg-[#946F48] text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-brand-100"
                                >
                                    Saya Mengerti
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Popup Modal: Error Occurred */}
            <AnimatePresence>
                {showErrorModal && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowErrorModal(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />

                        {/* Modal Container */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", duration: 0.5 }}
                            className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full border border-gray-100 relative z-10 text-center overflow-hidden"
                        >
                            {/* Top decoration element */}
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-400 to-red-600" />

                            <button 
                                onClick={() => setShowErrorModal(false)}
                                className="absolute top-4 right-4 p-1.5 rounded-full bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div className="mx-auto w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4 mt-2">
                                <AlertCircle className="w-8 h-8 text-red-500" />
                            </div>

                            <h3 className="font-serif text-lg font-bold text-gray-900 mb-2">
                                Registrasi Gagal
                            </h3>
                            <p className="text-xs text-gray-500 leading-relaxed mb-3">
                                Terjadi kesalahan saat mendaftarkan sidik jari Anda. Pastikan sensor sidik jari Anda bersih atau coba daftarkan ulang melalui browser ini.
                            </p>
                            {errorMessage && (
                                <p className="text-[10px] text-red-500 font-mono bg-red-50 p-2 rounded-lg mb-4 text-left overflow-hidden text-ellipsis break-words">
                                    Error: {errorMessage}
                                </p>
                            )}

                            <div className="space-y-2">
                                <button
                                    onClick={() => {
                                        setShowErrorModal(false);
                                        handleRegister();
                                    }}
                                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md"
                                >
                                    Coba Lagi
                                </button>
                                <button
                                    onClick={() => setShowErrorModal(false)}
                                    className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold transition-all"
                                >
                                    Batal
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    )
}

export function LoginPasskeyButton() {
    const [loading, setLoading] = useState(false)
    const [showUnsupportedModal, setShowUnsupportedModal] = useState(false)
    const [isSupported, setIsSupported] = useState<boolean | null>(null)

    useEffect(() => {
        const checkSupport = async () => {
            const hasWebAuthn = typeof window !== 'undefined' && !!window.PublicKeyCredential;
            if (!hasWebAuthn) {
                setIsSupported(false);
                return;
            }
            try {
                const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
                setIsSupported(available);
            } catch {
                setIsSupported(false);
            }
        };
        checkSupport();
    }, []);

    const handleLogin = async () => {
        if (isSupported === false) {
            setShowUnsupportedModal(true);
            return;
        }

        try {
            setLoading(true)
            // To login with passkey, just use signIn("passkey")
            const result = (await signIn("passkey", { callbackUrl: "/" })) as any
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
        <>
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

            {/* Popup Modal: Device Not Supported during Login */}
            <AnimatePresence>
                {showUnsupportedModal && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowUnsupportedModal(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />

                        {/* Modal Container */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", duration: 0.5 }}
                            className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full border border-gray-100 relative z-10 text-center overflow-hidden"
                        >
                            {/* Top decoration element */}
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 to-[#B48A5E]" />

                            <button 
                                onClick={() => setShowUnsupportedModal(false)}
                                className="absolute top-4 right-4 p-1.5 rounded-full bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4 mt-2">
                                <ShieldAlert className="w-8 h-8 text-[#B48A5E]" />
                            </div>

                            <h3 className="font-serif text-lg font-bold text-gray-900 mb-2">
                                Perangkat Tidak Mendukung
                            </h3>
                            <p className="text-xs text-gray-500 leading-relaxed mb-6">
                                Perangkat Anda tidak mendukung dalam scan sidik jari. Silakan masuk menggunakan WhatsApp atau Email Anda.
                            </p>

                            <div className="space-y-2">
                                <button
                                    onClick={() => setShowUnsupportedModal(false)}
                                    className="w-full py-3 bg-[#B48A5E] hover:bg-[#946F48] text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-brand-100"
                                >
                                    Masuk dengan Cara Lain
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    )
}
