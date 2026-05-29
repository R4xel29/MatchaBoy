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
      <div className="fixed inset-0 z-[9999] w-screen h-screen flex flex-col items-center justify-center bg-[#0B130E] text-[#FFFBF5] overflow-hidden select-none">
        {/* Glow backdrop */}
        <div className="absolute w-[350px] h-[350px] rounded-full bg-[#2E5A44]/25 blur-[100px] pointer-events-none" />
        
        <div className="relative flex flex-col items-center justify-center z-10 space-y-6 text-center px-6">
          {/* Animated checkmark circle */}
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
            className="w-20 h-20 rounded-full bg-[#2E5A44] border border-[#D4A574]/40 flex items-center justify-center shadow-lg shadow-[#2E5A44]/30"
          >
            <motion.svg
              className="w-10 h-10 text-[#FFFBF5]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3.5}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
            >
              <motion.path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </motion.svg>
          </motion.div>

          <div className="space-y-2">
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-2xl font-semibold tracking-wide font-serif text-[#FFFBF5]"
            >
              Verifikasi Berhasil!
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-sm text-[#E8F5E9]/75 max-w-[280px] mx-auto leading-relaxed"
            >
              Selamat datang di Arus. Mengarahkan Anda ke beranda...
            </motion.p>
          </div>

          {/* Simple premium loading line indicator */}
          <div className="w-24 h-[2px] bg-[#2E5A44]/35 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#D4A574]"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: '60%' }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg text-center space-y-6">
        {status === "banned" && (
          <>
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white font-serif">Akses Akun Ditangguhkan</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Mohon maaf, akun Anda telah dinonaktifkan karena terdeteksi melanggar Ketentuan Layanan kami.
            </p>
            <div className="space-y-3 pt-2">
              <a 
                href={`https://wa.me/${process.env.NEXT_PUBLIC_WA_BOT_NUMBER || "6289525672990"}?text=${encodeURIComponent("Halo Admin Arus, akun saya terdeteksi ditangguhkan saat mencoba login. Bisa tolong dibantu cek?")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors font-medium w-full flex justify-center items-center gap-2 shadow-sm text-sm"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Hubungi Customer Service
              </a>
              <button 
                onClick={() => router.push("/login")}
                className="px-6 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl transition-colors font-medium w-full text-sm"
              >
                Kembali ke Login
              </button>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white font-serif">Link Kadaluarsa / Tidak Valid</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Link login yang Anda gunakan salah atau sudah tidak berlaku. Silakan ulangi proses login.
            </p>
            <button 
              onClick={() => router.push("/login")}
              className="mt-4 px-6 py-2 bg-[#B48A5E] hover:bg-[#946F48] text-white rounded-xl transition-colors font-medium w-full text-sm"
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
