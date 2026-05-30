'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Clock, CreditCard, ChevronDown, ChevronUp, AlertCircle,
  ShoppingBag, MessageCircle, ArrowRight, Copy, Check, Upload, CheckCircle, X, Loader2
} from 'lucide-react'
import { formatRupiah } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

interface BankAccount {
  id: string;
  bankName: string;
  bankLogo: string | null;
  accountNumber: string;
  accountName: string;
}

interface QrisConfig {
  enabled: boolean;
  image: string | null;
  label: string;
}

export default function PaymentClient({
  order,
  adminWhatsApp,
  bankAccounts = [],
  qrisConfig = null
}: {
  order: any;
  adminWhatsApp: string;
  bankAccounts?: BankAccount[];
  qrisConfig?: QrisConfig | null;
}) {
  const { showToast } = useToast()
  const router = useRouter()
  const paymentChannel = order.notes?.match(/\[CHANNEL:\s*([^\]]+)\]/)?.[1] || '';
  const [timeLeft, setTimeLeft] = useState('')
  const [percentLeft, setPercentLeft] = useState(100)
  const [isExpired, setIsExpired] = useState(false)
  const [showItems, setShowItems] = useState(false)
  
  // Upload state
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null)
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null)
  const [submittingProof, setSubmittingProof] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })

  const fileRef = useRef<HTMLInputElement>(null)

  // Countdown timer logic
  useEffect(() => {
    const expiry = new Date(order.paymentExpiredAt).getTime()
    const createdAt = new Date(order.createdAt).getTime()
    const totalDuration = expiry - createdAt

    const updateTimer = () => {
      const now = new Date().getTime()
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

  // Poll order status to redirect when payment is verified or cancelled
  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        const res = await fetch(`/api/orders/${order.id}/status`)
        if (res.ok) {
          const data = await res.json()
          
          // Check if user came from order details page to break back button redirect loops
          if (typeof document !== 'undefined' && document.referrer && document.referrer.includes(`/orders/${order.id}`)) {
            if (data.status !== 'PENDING_PAYMENT') {
              router.replace('/profile?section=orders')
              return
            }
          }

          if (data.status === 'CANCELLED') {
            showToast('Pesanan ditolak/dibatalkan oleh admin.', 'error')
            router.replace(`/orders/${order.id}/payment-failed?reason=cancelled`)
          } else if (data.status !== 'PENDING_PAYMENT') {
            showToast('Pembayaran berhasil diverifikasi!', 'success')
            router.replace(`/orders/${order.id}`)
          }
        }
      } catch (err) {
        console.error('Error polling payment status:', err)
      }
    }

    checkPaymentStatus() // Run immediately on mount
    const interval = setInterval(checkPaymentStatus, 5000)
    return () => clearInterval(interval)
  }, [order.id, router])

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedAccount(id)
    setTimeout(() => setCopiedAccount(null), 2000)
  }

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file); // fallback to original file
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              resolve(blob || file);
            },
            'image/webp',
            0.5
          );
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  // Handle file upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      // Compress to WebP (usually reduces filesize by 90%+)
      const compressedBlob = await compressImage(file);

      const formData = new FormData();
      formData.append('file', compressedBlob, 'payment-proof.webp');
      formData.append('type', 'payment-proof');

      const res = await fetch('/api/upload', {
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
    } catch (err) {
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
          router.replace(`/orders/${order.id}`);
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

  const handleCancelOrder = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Batalkan Pesanan',
      message: 'Apakah Anda yakin ingin membatalkan pesanan ini?',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
        setSubmittingProof(true)
        try {
          const res = await fetch(`/api/orders/${order.id}/expire`, { method: 'POST' })
          if (res.ok) {
            router.push(`/orders/${order.id}/payment-failed?reason=cancelled`)
          } else {
            showToast("Gagal membatalkan pesanan.", 'error')
          }
        } catch (e) {
          showToast("Terjadi kesalahan koneksi.", 'error')
        } finally {
          setSubmittingProof(false)
        }
      }
    });
  }

  const getBankColor = (bankName: string) => {
    const name = bankName.toLowerCase();
    if (name.includes('bca')) return 'from-[#005A9C]/10 to-blue-50 border-blue-200 text-[#003D79]';
    if (name.includes('mandiri')) return 'from-[#FFB703]/10 to-amber-50 border-amber-200 text-[#003B73]';
    if (name.includes('bri')) return 'from-[#003580]/10 to-sky-50 border-sky-200 text-[#00529C]';
    return 'from-gray-50 to-white border-gray-200 text-gray-700';
  };

  return (
    <div className="min-h-dvh bg-[#FFFBF5] pb-24 font-sans text-gray-800 noise">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between bg-[#FFFBF5]/90 backdrop-blur-md sticky top-0 z-40 border-b border-gray-100">
        <button
          onClick={() => router.push(`/orders/${order.id}`)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-gray-650 hover:bg-gray-100 border border-gray-100 shadow-sm transition-all active:scale-95 touch-target"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-serif text-base font-black text-gray-900">Menunggu Pembayaran</h1>
        <div className="w-10" />
      </header>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6 relative z-10">
        
        {/* Visual Timer Progress Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] text-center relative overflow-hidden space-y-6"
        >
          {/* Circular Countdown Progress */}
          <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                className="stroke-gray-100"
                strokeWidth="6"
                fill="transparent"
              />
              <motion.circle
                cx="64"
                cy="64"
                r="56"
                className={`${percentLeft < 20 ? 'stroke-red-500' : 'stroke-[#B48A5E]'}`}
                strokeWidth="6"
                fill="transparent"
                strokeDasharray="351.8"
                strokeDashoffset={351.8 - (351.8 * percentLeft) / 100}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center select-none pt-1">
              <Clock className={`w-5 h-5 mb-0.5 ${percentLeft < 20 ? 'text-red-500 animate-pulse' : 'text-[#B48A5E]'}`} />
              <span className="text-xl font-bold font-mono text-gray-900">{timeLeft}</span>
              <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Sisa Waktu</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-100 pt-5 text-center">
            <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Total Tagihan</p>
            <p className="text-3xl font-black font-serif text-[#B48A5E] mt-1 tracking-tight leading-none">
              {formatRupiah(order.total)}
            </p>
          </div>
        </motion.div>

        {/* Collapsible Order Summary */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] overflow-hidden">
          <button
            onClick={() => setShowItems(!showItems)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50/30 transition-all font-bold text-xs uppercase tracking-wider text-gray-500"
          >
            <span>Detail Belanja ({order.items.length} Menu)</span>
            {showItems ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          
          <AnimatePresence>
            {showItems && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden border-t border-gray-50 bg-gray-50/20"
              >
                <div className="px-5 py-3 divide-y divide-gray-100/50">
                  {order.items.map((item: any, i: number) => (
                    <div key={i} className="py-2.5 flex justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold text-gray-800 leading-snug">{item.qty}x {item.name}</p>
                        {item.mods && <p className="text-[10px] text-gray-400 mt-0.5 leading-normal">{item.mods}</p>}
                      </div>
                      <p className="text-xs font-bold text-gray-700 shrink-0">{formatRupiah(item.price * item.qty)}</p>
                    </div>
                  ))}
                  <div className="py-3 text-xs space-y-1.5 font-semibold">
                    <div className="flex justify-between text-gray-500">
                      <span>Subtotal</span>
                      <span>{formatRupiah(order.subtotal)}</span>
                    </div>
                    {order.deliveryFee > 0 && (
                      <div className="flex justify-between text-gray-500">
                        <span>Ongkos Kirim</span>
                        <span>{formatRupiah(order.deliveryFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-gray-800 pt-1.5 border-t border-dashed border-gray-150">
                      <span>Total</span>
                      <span className="text-[#B48A5E]">{formatRupiah(order.total)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* QRIS Instan Display Panel */}
        {order.paymentMethod === 'QRIS' && (qrisConfig?.image || order.paymentQrContent) && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] p-5 text-center relative overflow-hidden flex flex-col items-center">
              {/* QRIS Header */}
              <div className="w-full flex items-center justify-between border-b border-dashed border-gray-150 pb-3 mb-4 shrink-0">
                <span className="text-[18px] font-black italic tracking-tighter text-[#1b4353]">
                  QR<span className="text-[#e26d5c]">IS</span>
                </span>
                <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#1b4353] bg-gray-50 border border-gray-100 px-2.5 py-0.5 rounded-md">
                  {qrisConfig?.image ? 'Statis • Scan & Pay' : 'GPN Standard'}
                </span>
              </div>

              {/* QR Image — Prioritaskan gambar statis dari admin, fallback ke auto-generate */}
              <div className="relative w-64 h-64 bg-white rounded-2xl p-2.5 border border-gray-100 shadow-inner flex items-center justify-center">
                {qrisConfig?.image ? (
                  // Mode 1: Gambar QRIS statis yang diupload admin (dari bank/PJSP resmi)
                  <img
                    src={qrisConfig.image}
                    alt="QRIS Code"
                    className="w-full h-full object-contain rounded-xl"
                  />
                ) : (
                  // Mode 2: QR auto-generate dari sistem (dinamis dengan nominal)
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(order.paymentQrContent)}`}
                    alt="QRIS Code"
                    className="w-full h-full object-contain rounded-xl"
                  />
                )}
              </div>

              {/* Info mode QRIS */}
              {qrisConfig?.image ? (
                <div className="mt-3 px-3 py-2 rounded-xl bg-purple-50 border border-purple-100 w-full text-center">
                  <p className="text-[10px] text-purple-600 font-bold">
                    📷 Scan QR di atas, lalu masukkan nominal{' '}
                    <span className="text-purple-800">{formatRupiah(order.total)}</span> secara manual
                  </p>
                </div>
              ) : (
                <div className="mt-3 px-3 py-2 rounded-xl bg-green-50 border border-green-100 w-full text-center">
                  <p className="text-[10px] text-green-600 font-bold">
                    ✅ Nominal sudah otomatis terisi: <span className="text-green-800">{formatRupiah(order.total)}</span>
                  </p>
                </div>
              )}

              <p className="text-[10px] text-gray-400 font-bold uppercase mt-3">Nama Merchant</p>
              <h3 className="text-base font-serif font-black text-gray-900 mt-0.5">MATCHABOY</h3>

              {!qrisConfig?.image && (
                <button
                  type="button"
                  onClick={() => router.push(`/orders/${order.id}/qris`)}
                  className="w-full mt-4 py-3 bg-[#FAF6EE] hover:bg-[#FAF6EE]/70 text-[#946F48] border border-[#EADFC9]/30 rounded-2xl text-xs font-bold transition-all active:scale-[0.98]"
                >
                  Unduh / Buka QRIS Lebih Besar
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* DOKU Instan Display Panel */}
        {order.paymentMethod === 'DOKU' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {paymentChannel === 'OVO' ? (
              // ── A. OVO DIRECT PUSH SCREEN (Gambar 3) ──
              <div className="bg-white rounded-[2.5rem] border border-gray-100 p-6 text-center shadow-[0_8px_30px_rgb(0,0,0,0.015)] relative overflow-hidden flex flex-col items-center gap-5 select-none">
                {/* OVO Branding Header */}
                <div className="w-16 h-16 bg-[#4C2A86]/10 border border-[#4C2A86]/20 text-[#4C2A86] rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <span className="font-serif font-black text-xl italic tracking-tighter">OVO</span>
                </div>
                
                <div className="space-y-1">
                  <h3 className="font-serif text-lg font-black text-gray-900 leading-tight">Lanjutkan Pembayaran OVO</h3>
                  <p className="text-xs text-gray-550 leading-relaxed font-semibold px-2">
                    Notifikasi push OVO telah dikirimkan ke HP Anda. Silakan selesaikan pembayaran.
                  </p>
                </div>

                {/* Steps List (Gambar 3 style) */}
                <div className="w-full text-left bg-gray-50/50 border border-gray-100 rounded-3xl p-5 space-y-4 font-semibold text-xs text-gray-700">
                  <div className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#4C2A86] text-white flex items-center justify-center text-[10px] shrink-0 font-extrabold">1</div>
                    <div>
                      <p className="font-bold text-gray-800">Buka Aplikasi OVO</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Ketuk ikon <span className="text-[#4C2A86] font-extrabold">"LONCENG"</span> di sudut kanan atas layar utama Anda.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#4C2A86] text-white flex items-center justify-center text-[10px] shrink-0 font-extrabold">2</div>
                    <div>
                      <p className="font-bold text-gray-800">Konfirmasi Pembayaran</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Pilih notifikasi tagihan Matchaboy, verifikasi nominal <span className="text-[#4C2A86] font-extrabold">{formatRupiah(order.total)}</span>, lalu masukkan PIN OVO Anda.</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#4C2A86] text-white flex items-center justify-center text-[10px] shrink-0 font-extrabold">3</div>
                    <div>
                      <p className="font-bold text-gray-800">Kembali Ke Matchaboy</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Pesanan Anda akan terverifikasi secara otomatis dalam beberapa detik setelah transaksi sukses.</p>
                    </div>
                  </div>
                </div>

                {/* Fallback to Web Checkout URL if push doesn't arrive */}
                {order.paymentUrl && (
                  <a
                    href={order.paymentUrl}
                    target="_self"
                    className="w-full py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <span>Tidak Menerima Notifikasi? Bayar via Web Portal DOKU</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ) : paymentChannel === 'QRIS' && order.paymentQrContent ? (
              // ── B. QRIS DIRECT SCREEN (Gambar 5 & 6) ──
              <div className="bg-white rounded-[2.5rem] border border-gray-100 p-6 text-center shadow-[0_8px_30px_rgb(0,0,0,0.015)] relative overflow-hidden flex flex-col items-center gap-4">
                {/* QRIS Header */}
                <div className="w-full flex items-center justify-between border-b border-dashed border-gray-150 pb-3 mb-1 shrink-0">
                  <span className="text-[18px] font-black italic tracking-tighter text-[#1b4353]">
                    QR<span className="text-[#e26d5c]">IS</span>
                  </span>
                  <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#1b4353] bg-gray-50 border border-gray-100 px-2.5 py-0.5 rounded-md">
                    Dinas Standard GPN
                  </span>
                </div>

                {/* QR Image */}
                <div className="relative w-64 h-64 bg-white rounded-2xl p-2.5 border border-gray-100 shadow-inner flex items-center justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(order.paymentQrContent)}`}
                    alt="QRIS Code"
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>

                <div className="w-full text-center">
                  <p className="text-[10px] text-gray-400 font-extrabold uppercase">Unduh atau screenshot gambar QRIS</p>
                  
                  {/* Download Trigger */}
                  <a
                    href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(order.paymentQrContent)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-3.5 px-6 py-2.5 bg-red-700 hover:bg-red-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Simpan Gambar QRIS
                  </a>
                </div>

                {/* QRIS Instructions Steps (Gambar 6 style) */}
                <div className="w-full text-left bg-gray-50/50 border border-gray-100 rounded-3xl p-5 space-y-4 font-semibold text-xs text-gray-700 mt-2">
                  <h4 className="text-gray-800 font-extrabold text-xs uppercase tracking-wider pl-1 mb-1">Cara bayar dengan QRIS</h4>
                  
                  <div className="flex gap-3.5 items-center">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0 shadow-sm p-2">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-xs">Langkah 1</p>
                      <p className="text-[10.5px] text-gray-400 leading-tight">Simpan atau screenshot gambar QRIS di atas.</p>
                    </div>
                  </div>

                  <div className="flex gap-3.5 items-center">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-sm p-2">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-xs">Langkah 2</p>
                      <p className="text-[10.5px] text-gray-400 leading-tight">Buka aplikasi Bank / E-wallet kamu (Gojek, DANA, Shopee, BCA, dll), kemudian pilih pembayaran QRIS.</p>
                    </div>
                  </div>

                  <div className="flex gap-3.5 items-center">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm p-2">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-xs">Langkah 3</p>
                      <p className="text-[10.5px] text-gray-400 leading-tight">Lakukan pembayaran dengan upload gambar QRIS melalui menu gallery.</p>
                    </div>
                  </div>
                </div>

                {/* Fallback link to DOKU page */}
                {order.paymentUrl && (
                  <a
                    href={order.paymentUrl}
                    target="_self"
                    className="text-[10.5px] text-gray-400 hover:text-gray-605 hover:underline font-bold mt-2 cursor-pointer"
                  >
                    Buka di Portal Pembayaran DOKU
                  </a>
                )}
              </div>
            ) : (
              // ── C. STANDARD DOKU CHECKOUT REDIRECT PANEL (Fallback) ──
              <div className="bg-white rounded-[2.5rem] border border-gray-100 p-6 text-center shadow-[0_8px_30px_rgb(0,0,0,0.015)] relative overflow-hidden flex flex-col items-center gap-4">
                <div className="w-28 h-14 bg-white border border-gray-150 rounded-2xl flex items-center justify-center mx-auto p-2 shadow-sm overflow-hidden">
                  <img src="https://www.doku.com/wp-content/themes/doku/assets/images/logo.png" alt="DOKU" className="object-contain max-h-full max-w-full" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif text-lg font-black text-gray-900 leading-tight">Pembayaran Online DOKU</h3>
                  <p className="text-xs text-gray-550 leading-relaxed font-semibold px-2">
                    Selesaikan pembayaran pesanan Anda dengan aman menggunakan E-Wallet, QRIS, Virtual Account, atau Kartu Kredit.
                  </p>
                </div>

                {order.paymentUrl && (
                  <a
                    href={order.paymentUrl}
                    target="_self"
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:opacity-95 text-white font-bold text-sm tracking-wide shadow-md shadow-indigo-100 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <span>Bayar Sekarang</span>
                    <ArrowRight className="w-4.5 h-4.5" />
                  </a>
                )}

                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 w-full text-center">
                  <p className="text-[10px] text-indigo-600 font-bold">
                    💡 Status pesanan akan terverifikasi secara instan setelah pembayaran sukses di portal DOKU. Anda tidak perlu mengunggah bukti transfer manual.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Bank Accounts transfer box */}
        {order.paymentMethod === 'TRANSFER' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 pl-1">Instruksi Rekening Bank</h3>
            <div className="space-y-2.5">
              {bankAccounts.map((bank) => (
                <div 
                  key={bank.id}
                  className={`bg-gradient-to-br ${getBankColor(bank.bankName)} p-4 rounded-3xl border shadow-sm flex items-center justify-between gap-4`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest opacity-80">{bank.bankName}</p>
                    <p className="text-lg font-mono font-bold tracking-tight mt-1">{bank.accountNumber}</p>
                    <p className="text-[11px] font-bold opacity-70 mt-0.5">a.n. {bank.accountName}</p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => handleCopy(bank.accountNumber, bank.id)}
                    className="w-10 h-10 rounded-2xl bg-white border border-gray-150 shadow-sm flex items-center justify-center text-gray-600 hover:text-[#B48A5E] hover:border-[#B48A5E]/20 transition-all shrink-0"
                  >
                    {copiedAccount === bank.id ? (
                      <Check className="w-4.5 h-4.5 text-green-500" />
                    ) : (
                      <Copy className="w-4.5 h-4.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Drag-and-drop uploader box */}
        {!isExpired && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] p-5 space-y-4"
          >
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 pl-1">
              Upload Bukti Transfer
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
                className="w-full py-8 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2
                  hover:border-[#B48A5E]/30 hover:bg-[#B48A5E]/5 transition-all active:scale-[0.98] select-none"
              >
                <Upload className="w-7 h-7 text-gray-300" />
                <p className="text-xs font-bold text-gray-700">Sentuh untuk upload struk bukti bayar</p>
                <p className="text-[9.5px] text-gray-400 font-medium">Format JPG, PNG, atau Tangkapan Layar (Screenshot)</p>
              </button>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-gray-150 shadow-inner">
                <img src={preview} alt="Struk Pembayaran" className="w-full h-44 object-cover" />
                
                {uploading && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
                
                {uploaded && (
                  <div className="absolute top-3.5 right-3.5 bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                    <CheckCircle className="w-3.5 h-3.5" /> Uploaded
                  </div>
                )}
                
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => { setPreview(null); setUploaded(false); setPaymentProofUrl(null); }}
                  className="absolute top-3 left-3 w-8 h-8 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center border border-gray-100 text-gray-500 hover:text-gray-700 shadow-sm"
                >
                  <X className="w-4.5 h-4.5" />
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
                  <span>Mengirim konfirmasi...</span>
                </>
              ) : (
                'Saya Sudah Transfer & Bayar'
              )}
            </button>
          </motion.div>
        )}

        {/* WhatsApp Help / Cancel link */}
        <div className="space-y-3 pt-2">
          <button
            onClick={() => {
              const msg = encodeURIComponent(`Halo Arus! Saya butuh bantuan pembayaran pesanan ${order.id}`);
              window.open(`https://wa.me/${adminWhatsApp}?text=${msg}`, '_blank');
            }}
            className="w-full py-4 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 font-bold text-xs flex items-center justify-center gap-2 text-gray-700 transition-colors shadow-sm"
          >
            <MessageCircle className="w-4.5 h-4.5 text-emerald-500 fill-emerald-50" />
            <span>Butuh Bantuan? Hubungi Admin WhatsApp</span>
          </button>
          
          <div className="text-center pt-2">
            <button
              onClick={handleCancelOrder}
              disabled={submittingProof}
              className="text-[10px] font-black text-red-500 hover:text-red-700 hover:underline uppercase tracking-widest"
            >
              Batalkan Pesanan Ini
            </button>
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
                <h3 className="font-serif text-lg font-black text-gray-900 leading-tight">Bukti Pembayaran Terkirim!</h3>
                <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                  Kasir kami akan segera memverifikasi bukti transfer Anda. Pesanan akan segera disiapkan! 🍵
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
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}
