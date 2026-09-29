"use client";

import { useEffect, useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { MotionLoadingScreen } from "@/components/ui/MotionLoadingScreen";

function VerifyWABody() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const refCode = searchParams.get("ref");
  const [status, setStatus] = useState<"loading" | "success" | "error" | "banned">("loading");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    let activeRefCode = refCode;
    if (activeRefCode) {
      document.cookie = `pending_referral_code=${encodeURIComponent(activeRefCode)}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
    } else if (typeof document !== 'undefined') {
      const match = document.cookie.match(/pending_referral_code=([^;]+)/);
      if (match) {
        activeRefCode = decodeURIComponent(match[1]);
      }
    }

    const verifyToken = async () => {
      try {
        const res = await signIn("whatsapp-link", {
          token,
          referralCode: activeRefCode || "",
          redirect: false,
        });

        if (res?.error) {
          if (res.error === "AccessDenied") {
            setStatus("banned");
          } else {
            setStatus("error");
          }
        } else {
          setStatus("success");
          // Check setup status before redirecting to avoid flashing the home page
          try {
            const checkRes = await fetch('/api/user/check-phone');
            const checkData = await checkRes.json();
            if (!checkData.hasPin) {
              router.push('/setup-pin');
            } else if (!checkData.hasName) {
              router.push('/setup-profile');
            } else if (!checkData.phoneVerified) {
              router.push('/setup-phone');
            } else {
              router.push('/');
            }
          } catch (e) {
            router.push('/');
          }
        }
      } catch (error) {
        setStatus("error");
      }
    };

    verifyToken();
  }, [token, router]);

  if (status === "loading") {
    return (
      <MotionLoadingScreen 
        customMessages={[
          "Membaca token otentikasi...",
          "Memverifikasi WhatsApp Anda...",
          "Mengamankan sesi masuk...",
          "Mempersiapkan beranda Arus Anda..."
        ]}
      />
    );
  }

  if (status === "success") {
    return (
      <div className="fixed inset-0 z-[9999] w-screen h-screen flex flex-col items-center justify-center bg-gradient-to-b from-orange-50/70 via-[#FFFBF7] to-amber-50/60 text-slate-900 overflow-hidden select-none px-6">
        <div className="relative flex flex-col items-center justify-center z-10 space-y-5 text-center max-w-xs w-full bg-white p-8 rounded-3xl border border-orange-100 shadow-xl shadow-orange-500/5">
          {/* Animated checkmark circle */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0.05 }}
            className="w-18 h-18 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/25 ring-4 ring-orange-100"
          >
            <motion.svg
              className="w-9 h-9 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
            >
              <motion.path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </motion.svg>
          </motion.div>

          <div className="space-y-1.5">
            <span className="inline-block px-3 py-0.5 rounded-full bg-orange-100/80 text-orange-700 text-[10px] font-extrabold uppercase tracking-wider">
              Arum Seduh
            </span>
            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-xl font-extrabold text-slate-900"
            >
              Verifikasi Berhasil!
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="text-xs font-medium text-slate-500 leading-relaxed"
            >
              Selamat datang di Arum Seduh. Mengarahkan Anda ke halaman berikutnya...
            </motion.p>
          </div>

          {/* Simple lightweight orange-amber loading line indicator */}
          <div className="w-32 h-1.5 bg-orange-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: "60%" }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFBF7] px-4">
      <div className="max-w-md w-full p-8 bg-white rounded-3xl border border-orange-100 shadow-xl shadow-orange-500/5 text-center space-y-6">
        {status === "banned" && (
          <>
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                <AlertTriangle className="w-7 h-7" />
              </div>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">Akses Akun Ditangguhkan</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Mohon maaf, akun Anda telah dinonaktifkan karena terdeteksi melanggar Ketentuan Layanan kami.
            </p>
            <div className="space-y-3 pt-2">
              <a 
                href={`https://wa.me/${process.env.NEXT_PUBLIC_WA_BOT_NUMBER || "6289525672990"}?text=${encodeURIComponent("Halo Admin Arus, akun saya terdeteksi ditangguhkan saat mencoba login. Bisa tolong dibantu cek?")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl transition-all font-bold w-full flex justify-center items-center gap-2 shadow-md shadow-orange-500/20 text-sm"
              >
                Hubungi Customer Service
              </a>
              <button 
                onClick={() => router.push("/login")}
                className="px-6 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl transition-colors font-semibold w-full text-sm"
              >
                Kembali ke Login
              </button>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">Link Kadaluarsa / Tidak Valid</h2>
            <p className="text-sm text-slate-500">
              Link login yang Anda gunakan salah atau sudah tidak berlaku. Silakan ulangi proses login.
            </p>
            <button 
              onClick={() => router.push("/login")}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl transition-all font-bold w-full text-sm shadow-md shadow-orange-500/20"
            >
              Kembali ke Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyWAPage() {
  return (
    <Suspense fallback={<MotionLoadingScreen />}>
      <VerifyWABody />
    </Suspense>
  );
}
