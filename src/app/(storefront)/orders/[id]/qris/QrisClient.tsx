'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Clock, Save, Info, CheckCircle2, ChevronRight, Upload, X, Loader2, Check, Download } from 'lucide-react'
import { formatRupiah } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { QRCodeCanvas } from 'qrcode.react'

export default function QrisClient({ order }: { order: any }) {
  const { showToast } = useToast()
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState('')
  const [percentLeft, setPercentLeft] = useState(100)
  const [isExpired, setIsExpired] = useState(false)

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

  const handleDownloadQr = () => {
    try {
      showToast("Mengunduh QRIS...", "info")
      const canvas = document.getElementById('qris-canvas') as HTMLCanvasElement;
      if (!canvas) {
        throw new Error('Canvas not found');
      }
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a')
      link.href = url
      link.download = `QRIS_MATCHABOY_${order.id.slice(0, 8).toUpperCase()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      showToast("QRIS berhasil diunduh!", "success")
    } catch (error) {
      console.error("Gagal mengunduh QRIS:", error)
      showToast("Gagal mengunduh QRIS.", "error")
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
            
            <QRCodeCanvas
              id="qris-canvas"
              value={order.paymentQrContent}
              size={260}
              level="M"
              includeMargin={false}
              className="object-contain"
            />
          </div>

          {/* Merchant Info */}
          <div className="text-center mt-5 space-y-1 w-full select-none">
            <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Nama Merchant</p>
            <h3 className="text-base font-serif font-black text-gray-900 leading-tight">ARUN SEDUH DRINK</h3>
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

        {/* Info Box directly on QRIS page */}
        {!isExpired && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5 text-center shadow-sm select-none"
          >
            <p className="text-xs text-emerald-800 font-extrabold flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
              Verifikasi Otomatis
            </p>
            <p className="text-[10.5px] text-emerald-650 mt-1 leading-relaxed font-semibold">
              Status pesanan akan terverifikasi secara otomatis setelah pembayaran berhasil. Anda tidak perlu mengunggah bukti pembayaran manual.
            </p>
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
              <p className="leading-relaxed">Periksa nominal bayar <strong>{formatRupiah(order.total)}</strong> dan nama merchant <strong>MATCHABOY</strong>. Jika sesuai, selesaikan pembayaran. Pesanan Anda akan otomatis dikonfirmasi oleh sistem.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
