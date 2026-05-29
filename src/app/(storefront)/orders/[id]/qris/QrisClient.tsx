'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Clock, Save, Info, CheckCircle2, ChevronRight, Upload, X, Loader2, Check, Download } from 'lucide-react'
import { formatRupiah } from '@/lib/utils'
import Image from 'next/image'
import { useToast } from '@/components/ui/Toast'

export default function QrisClient({ order }: { order: any }) {
  const { showToast } = useToast()
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState('')
  const [percentLeft, setPercentLeft] = useState(100)
  const [isExpired, setIsExpired] = useState(false)

  // Upload states
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null)
  const [submittingProof, setSubmittingProof] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  // Countdown timer logic
  useEffect(() => {
    const expiry = new Date(order.paymentExpiredAt).getTime()
    const start = order.createdAt ? new Date(order.createdAt).getTime() : expiry - 15 * 60 * 1000
    const totalDuration = Math.max(expiry - start, 1000)
    
    const updateTimer = () => {
      const now = Date.now()
      const diff = expiry - now

      if (diff <= 0) {
        setTimeLeft('00:00')
        setPercentLeft(0)
        setIsExpired(true)
        fetch(`/api/orders/${order.id}/expire`, { method: 'POST' })
          .then(() => router.push(`/orders/${order.id}/payment-failed?reason=timeout`))
          .catch(console.error)
        return
      }

      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      const formattedMinutes = minutes.toString().padStart(2, '0')
      const formattedSeconds = seconds.toString().padStart(2, '0')

      setTimeLeft(`${formattedMinutes}:${formattedSeconds}`)
      setPercentLeft((diff / totalDuration) * 100)
    }

    updateTimer()
    const timer = setInterval(updateTimer, 1000)
    return () => clearInterval(timer)
  }, [order.paymentExpiredAt, order.createdAt, order.id, router])

  // Handle file upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'payment-proof');

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setPaymentProofUrl(data.url);
        setUploaded(true);
      } else {
        throw new Error('Gagal unggah');
      }
    } catch {
      showToast('Gagal mengunggah bukti pembayaran. Silakan coba lagi.', 'error');
      setPreview(null);
      setUploaded(false);
      setPaymentProofUrl(null);
    } finally {
      setUploading(false);
    }
  };

  // Submit proof of payment to order DB
  const handleSubmitProof = async () => {
    if (!paymentProofUrl) return;
    setSubmittingProof(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/payment-proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentProofUrl }),
      });

      if (res.ok) {
        setShowSuccessModal(true);
        setTimeout(() => {
          router.push(`/orders/${order.id}`);
        }, 3000);
      } else {
        showToast('Gagal memverifikasi bukti pembayaran. Silakan coba lagi.', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setSubmittingProof(false);
    }
  };

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(order.paymentQrContent)}`

  const handleDownloadQr = async () => {
    try {
      showToast("Mengunduh QRIS...", "info")
      const response = await fetch(qrImageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `QRIS_MATCHABOY_${order.id.slice(0, 8).toUpperCase()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      showToast("QRIS berhasil diunduh!", "success")
    } catch (error) {
      console.error("Gagal mengunduh QRIS:", error)
      // Fallback: open in new tab
      window.open(qrImageUrl, '_blank')
      showToast("Gagal mengunduh langsung. QRIS dibuka di tab baru.", "error")
    }
  }

  return (
    <div className="min-h-dvh bg-[#FFFBF5] pb-24 font-sans text-gray-800 noise">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between bg-[#FFFBF5]/90 backdrop-blur-md sticky top-0 z-40 border-b border-gray-100">
        <button 
          onClick={() => router.push(`/orders/${order.id}/payment`)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-gray-655 border border-gray-100 shadow-sm hover:bg-gray-50 transition-all active:scale-95 touch-target"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-serif text-base font-black text-gray-900">Pembayaran QRIS</h1>
        <div className="w-10" />
      </header>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6 relative z-10">
        
        {/* Countdown Info Card */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl px-5 py-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 select-none">
              <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
              <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Masa Berlaku QRIS</span>
            </div>
            <span className="font-mono text-base font-black text-gray-900">{timeLeft}</span>
          </div>
          {/* Visual Progress Bar */}
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 rounded-full ${
                percentLeft > 50 ? 'bg-emerald-500' : percentLeft > 20 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${percentLeft}%` }}
            />
          </div>
        </div>

        {/* Realistic GPN/QRIS Merchant Frame */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] border border-gray-100 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col items-center relative overflow-hidden"
        >
          <div className="w-full flex items-center justify-between border-b border-dashed border-gray-150 pb-3 mb-5 shrink-0 select-none">
            <span className="text-[20px] font-black italic tracking-tighter text-[#1b4353]">
              QR<span className="text-[#e26d5c]">IS</span>
            </span>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#1b4353] bg-gray-50 border border-gray-100 px-2.5 py-0.5 rounded-md">
              GPN Standard
            </span>
          </div>

          {/* QR Code Canvas Frame */}
          <div className="relative w-72 h-72 bg-white rounded-3xl p-3 border border-gray-100 flex items-center justify-center shadow-inner group">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#B48A5E]/5 to-transparent rounded-3xl pointer-events-none" />
            
            <Image
              src={qrImageUrl}
              alt="QRIS Code"
              width={260}
              height={260}
              className="object-contain"
              priority
              unoptimized
            />
          </div>

          {/* Merchant Info */}
          <div className="text-center mt-5 space-y-1 w-full select-none">
            <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Nama Merchant</p>
            <h3 className="text-base font-serif font-black text-gray-900 leading-tight">MATCHABOY</h3>
            <p className="text-[11px] text-gray-500 font-mono mt-1.5 pt-2 border-t border-gray-50">
              Invoice ID: <span className="font-bold">{order.id.slice(0, 12).toUpperCase()}</span>
            </p>
            <p className="text-lg font-black text-[#B48A5E] pt-1">{formatRupiah(order.total)}</p>
          </div>
        </motion.div>

        {/* Download & Save Options */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleDownloadQr}
            className="py-3.5 bg-[#B48A5E] hover:bg-[#946F48] text-white font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98] text-xs"
          >
            <Download className="w-4 h-4" />
            <span>Unduh QR Code</span>
          </button>
          <button
            type="button"
            onClick={() => {
              showToast("Silakan lakukan screenshot (tangkapan layar) pada layar handphone Anda untuk menyimpan kode QRIS ke galeri.", 'info')
            }}
            className="py-3.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-bold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] text-xs"
          >
            <Save className="w-4 h-4 text-[#B48A5E]" />
            <span>Screenshot</span>
          </button>
        </div>

        {/* Uploader Box directly on QRIS page */}
        {!isExpired && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] p-5 space-y-4"
          >
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 pl-1">
              Upload Bukti Pembayaran QRIS
            </h3>
            
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {!preview ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full py-6 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2
                  hover:border-[#B48A5E]/30 hover:bg-[#B48A5E]/5 transition-all active:scale-[0.98] select-none"
              >
                <Upload className="w-6 h-6 text-gray-300" />
                <p className="text-xs font-bold text-gray-750">Upload bukti bayar QRIS di sini</p>
              </button>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-gray-150">
                <img src={preview} alt="Struk QRIS" className="w-full h-40 object-cover" />
                {uploading && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
                {uploaded && (
                  <div className="absolute top-3 right-3 bg-green-500 text-white px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                    <CheckCircle2 className="w-3 h-3" /> Uploaded
                  </div>
                )}
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => { setPreview(null); setUploaded(false); setPaymentProofUrl(null); }}
                  className="absolute top-3 left-3 w-8 h-8 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center border border-gray-100 text-gray-500 hover:text-gray-700 shadow-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              type="button"
              disabled={!uploaded || submittingProof || uploading}
              onClick={handleSubmitProof}
              className={`w-full py-4 rounded-2xl font-bold text-sm tracking-wide shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98]
                ${uploaded && !submittingProof
                  ? 'bg-[#B48A5E] hover:bg-[#946F48] text-white shadow-[#B48A5E]/15'
                  : 'bg-gray-150 text-gray-400 border border-gray-200/50 cursor-not-allowed'}`}
            >
              {submittingProof ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengirim bukti...</span>
                </>
              ) : (
                'Saya Sudah Scan & Bayar QRIS'
              )}
            </button>
          </motion.div>
        )}

        {/* Step by Step guide */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-3xl p-5 space-y-4 select-none">
          <h4 className="font-serif text-sm font-black text-gray-800 flex items-center gap-2">
            <Info className="w-4.5 h-4.5 text-[#B48A5E]" />
            Petunjuk Pembayaran:
          </h4>
          
          <div className="space-y-3.5 text-xs text-gray-500 font-medium">
            <div className="flex gap-3 items-start">
              <div className="w-5.5 h-5.5 rounded-full bg-[#B48A5E]/10 flex items-center justify-center font-bold text-[#B48A5E] shrink-0 text-[10px] mt-0.5">
                1
              </div>
              <p className="leading-relaxed">Screenshot layar QRIS di atas atau simpan ke galeri handphone Anda.</p>
            </div>

            <div className="flex gap-3 items-start">
              <div className="w-5.5 h-5.5 rounded-full bg-[#B48A5E]/10 flex items-center justify-center font-bold text-[#B48A5E] shrink-0 text-[10px] mt-0.5">
                2
              </div>
              <p className="leading-relaxed">Buka aplikasi dompet digital (GoPay, OVO, ShopeePay, Dana, LinkAja) atau mobile banking Anda (BCA, Mandiri, BRI, BNI).</p>
            </div>

            <div className="flex gap-3 items-start">
              <div className="w-5.5 h-5.5 rounded-full bg-[#B48A5E]/10 flex items-center justify-center font-bold text-[#B48A5E] shrink-0 text-[10px] mt-0.5">
                3
              </div>
              <p className="leading-relaxed">Pilih opsi <strong>Scan / Pindai</strong> dari aplikasi tersebut, lalu pilih ikon <strong>Galeri</strong> di kanan atas untuk memuat hasil screenshot tadi.</p>
            </div>

            <div className="flex gap-3 items-start">
              <div className="w-5.5 h-5.5 rounded-full bg-[#B48A5E]/10 flex items-center justify-center font-bold text-[#B48A5E] shrink-0 text-[10px] mt-0.5">
                4
              </div>
              <p className="leading-relaxed">Periksa nominal bayar <strong>{formatRupiah(order.total)}</strong> dan nama merchant <strong>MATCHABOY</strong>. Jika sesuai, selesaikan pembayaran dan upload struknya di uploader atas.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal Overlay */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-7 border border-gray-100 text-center select-none space-y-5"
            >
              <div className="w-16 h-16 bg-green-50 border border-green-200 text-green-500 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
                <Check className="w-8 h-8" strokeWidth={3} />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-serif text-lg font-black text-gray-900 leading-tight">Pembayaran Sukses Dikirim!</h3>
                <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                  Sistem kami telah menerima bukti bayar QRIS Anda. Kami akan segera mengonfirmasi pesanan Anda! 🍵
                </p>
              </div>
              <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-green-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 3, ease: 'linear' }}
                />
              </div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Sedang mengarahkan ke halaman pelacakan...</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
