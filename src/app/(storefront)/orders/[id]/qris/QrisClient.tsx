'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Clock, Save, Info, CheckCircle2, ChevronRight, Upload, X, Loader2, Check, Download } from 'lucide-react'
import { formatRupiah } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react'

export default function QrisClient({ order }: { order: any }) {
  const { showToast } = useToast()
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState('')
  const [percentLeft, setPercentLeft] = useState(100)
  const [isExpired, setIsExpired] = useState(false)
  const [downloadingQr, setDownloadingQr] = useState(false)
  const qrValueString =
    order.paymentQrContent ||
    `00020101021226670016ID.CO.ARUMSEDUH.WWW01189360091430000000005204581253033605802ID5910ARUM SEDUH6007JAKARTA62070703A016304ABCD`

  // Countdown timer logic (15 minutes)
  useEffect(() => {
    const start = order.createdAt ? new Date(order.createdAt).getTime() : Date.now()
    const expiry = order.paymentExpiredAt
      ? new Date(order.paymentExpiredAt).getTime()
      : start + 15 * 60 * 1000
    const totalDuration = Math.max(expiry - start, 15 * 60 * 1000)
    
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
      setPercentLeft(Math.min(100, Math.max(0, (diff / totalDuration) * 100)))
    }

    updateTimer()
    const timer = setInterval(updateTimer, 1000)
    return () => clearInterval(timer)
  }, [order.paymentExpiredAt, order.createdAt, order.id, router])

  // Poll order status so user is automatically redirected when QRIS payment completes
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/orders/${order.id}/status`)
        if (res.ok) {
          const data = await res.json()
          if (data.status === 'CANCELLED') {
            router.replace(`/orders/${order.id}/payment-failed?reason=cancelled`)
          } else if (data.status !== 'PENDING_PAYMENT') {
            showToast('Pembayaran QRIS berhasil diverifikasi!', 'success')
            router.replace(`/orders/${order.id}`)
          }
        }
      } catch {
        // silent
      }
    }
    checkStatus()
    const interval = setInterval(checkStatus, 3000)
    return () => clearInterval(interval)
  }, [order.id, router])

  const handleDownloadQr = () => {
    if (downloadingQr) return
    setDownloadingQr(true)
    try {
      const code = String(order.id || 'ORDER').slice(0, 8).toUpperCase().replace(/[^A-Za-z0-9-_]/g, '')
      const txId = String(order.id || code)
      const fileName = `QRIS_ARUM_SEDUH_${code}.png`

      const params = new URLSearchParams({
        downloadQr: '1',
        prefix: 'ARUM_SEDUH',
        transactionId: txId,
        code,
        amount: String(order.total || 0),
        qr: qrValueString,
        t: String(Date.now()),
      })
      const downloadUrl = `/api/user/wallet?${params.toString()}`
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = fileName
      link.rel = 'noopener'
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()

      setTimeout(() => {
        if (link.parentNode) {
          link.parentNode.removeChild(link)
        }
      }, 60000)

      showToast("Gambar QRIS berhasil diunduh ke perangkat Anda!", "success")
    } catch (error) {
      console.error("Gagal mengunduh QRIS:", error)
      showToast("Gagal mengunduh gambar QRIS.", "error")
    } finally {
      setTimeout(() => setDownloadingQr(false), 600)
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
        
        {/* Countdown Info Card (15 Minutes) */}
        <div className="bg-white border border-amber-200/80 shadow-sm rounded-2xl px-5 py-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 select-none">
              <Clock className="w-4 h-4 text-orange-600 animate-pulse" />
              <span className="text-[11px] text-gray-700 font-extrabold uppercase tracking-wider">Batas Waktu Pembayaran QRIS (15 Menit)</span>
            </div>
            <span className="font-mono text-base font-black text-orange-600">{timeLeft}</span>
          </div>
          {/* Visual Progress Bar */}
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 rounded-full ${
                percentLeft > 50 ? 'bg-orange-500' : percentLeft > 20 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${percentLeft}%` }}
            />
          </div>
        </div>

        {/* Pure QR Code Display Frame */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] border border-amber-200/80 p-6 shadow-sm flex flex-col items-center relative overflow-hidden"
        >
          <div className="relative p-4 bg-white rounded-3xl border-2 border-amber-200 flex items-center justify-center shadow-sm">
            <QRCodeCanvas
              id="qris-canvas"
              value={qrValueString}
              size={256}
              level="M"
              includeMargin={true}
              marginSize={2}
              className="max-w-full max-h-full block rounded-lg"
            />
            <div className="hidden" aria-hidden="true">
              <QRCodeSVG
                id="qris-svg"
                value={qrValueString}
                size={256}
                level="M"
                includeMargin={true}
                marginSize={2}
              />
            </div>
          </div>

          <div className="text-center mt-4 space-y-0.5 w-full select-none">
            <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Total Tagihan</p>
            <p className="text-xl font-black font-serif text-orange-600">{formatRupiah(order.total)}</p>
          </div>
        </motion.div>

        {/* Download & Save Options */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={downloadingQr}
            onClick={handleDownloadQr}
            className="py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98] text-xs cursor-pointer"
          >
            {downloadingQr ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Unduh Gambar QRIS</span>
          </button>
          <button
            type="button"
            onClick={() => {
              showToast("Silakan lakukan screenshot (tangkapan layar) pada layar handphone Anda untuk menyimpan kode QRIS ke galeri.", 'info')
            }}
            className="py-3.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-bold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] text-xs"
          >
            <Save className="w-4 h-4 text-orange-600" />
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
              <p className="leading-relaxed">Periksa nominal bayar <strong>{formatRupiah(order.total)}</strong> dan nama merchant <strong>ARUM SEDUH</strong>. Jika sesuai, selesaikan pembayaran. Pesanan Anda akan otomatis dikonfirmasi oleh sistem.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
