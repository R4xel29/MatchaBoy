'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { XCircle, RefreshCw, ShoppingBag, Home, AlertTriangle } from 'lucide-react'
import { formatRupiah } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'

export default function PaymentFailedClient({ order, isStaticQris }: { order: any; isStaticQris?: boolean }) {
  const router = useRouter()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)

  const handleRepay = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${order.id}/repay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await res.json()
      if (res.ok && data.success) {
        showToast("Sesi pembayaran berhasil di-regenerasi!", "success")
        router.push(`/orders/${order.id}/payment`)
      } else {
        showToast(data.error || "Gagal mengulang pembayaran. Silakan checkout ulang.", "error")
      }
    } catch (e) {
      console.error(e)
      showToast("Terjadi kesalahan koneksi.", "error")
    } finally {
      setLoading(false)
    }
  }

  const isCancelled = order.status === 'CANCELLED';

  return (
    <div className="min-h-dvh bg-[#FDFBF7] flex flex-col items-center justify-center px-6 py-12 font-sans text-gray-800">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="w-full max-w-sm bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-xl shadow-gray-200/40 text-center space-y-6"
      >
        {/* Animated Alert icon */}
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] text-red-600 font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-red-50 border border-red-100 inline-block">
            {isCancelled ? 'Pesanan Dibatalkan' : 'Pembayaran Gagal / Kedalwarsa'}
          </span>
          <h2 className="font-serif text-xl font-black text-gray-900 tracking-tight mt-1.5 leading-snug">
            {isCancelled ? 'Pesanan Telah Dibatalkan' : 'Batas Waktu Pembayaran Habis'}
          </h2>
          <p className="text-xs text-gray-400 leading-relaxed font-medium px-2">
            {isCancelled 
              ? 'Pesanan ini telah dibatalkan atau ditolak. Silakan hubungi admin jika Anda membutuhkan bantuan.' 
              : 'Waktu pembayaran 15 menit telah habis sebelum kami menerima konfirmasi dana dari Anda.'}
          </p>
        </div>

        {/* Invoice Info Card */}
        <div className="bg-gray-50 border border-gray-100/50 rounded-2xl p-4 flex justify-between items-center text-left">
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Tagihan</p>
            <p className="text-lg font-black text-gray-800 mt-0.5">{formatRupiah(order.total)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Order ID</p>
            <p className="text-xs font-mono font-bold text-[#B48A5E] mt-0.5">{order.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>

        {/* Primary actions */}
        <div className="space-y-3 pt-2">
          {!(isCancelled && order.paymentMethod === 'QRIS' && isStaticQris) && (
            <button
              onClick={handleRepay}
              disabled={loading}
              className="w-full py-4.5 bg-[#B48A5E] hover:bg-[#946F48] disabled:opacity-50 text-white font-bold rounded-2xl shadow-xl shadow-[#B48A5E]/10 transition-all flex items-center justify-center gap-2.5 active:scale-[0.98] text-sm"
            >
              {loading ? <RefreshCw className="w-4.5 h-4.5 animate-spin" /> : <RefreshCw className="w-4.5 h-4.5" />}
              <span>Ulangi Pembayaran QRIS</span>
            </button>
          )}

          <button
            onClick={() => router.push('/')}
            disabled={loading}
            className="w-full py-4 bg-white hover:bg-gray-50 text-gray-750 border border-gray-250 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] text-xs shadow-sm"
          >
            <Home className="w-4 h-4 text-gray-450" />
            <span>Kembali ke Halaman Utama</span>
          </button>
        </div>
      </motion.div>
    </div>
  )
}
