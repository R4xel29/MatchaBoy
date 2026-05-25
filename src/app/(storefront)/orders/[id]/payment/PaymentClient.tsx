'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Clock, CreditCard, ChevronDown, ChevronUp, AlertCircle,
  ShoppingBag, MessageCircle, ArrowRight, Copy, Check, Upload, CheckCircle, X, Loader2
} from 'lucide-react'
import { formatRupiah } from '@/lib/utils'

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
  const router = useRouter()
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

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedAccount(id)
    setTimeout(() => setCopiedAccount(null), 2000)
  }

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
      setPaymentProofUrl('pending-review');
      setUploaded(true);
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
        alert('Gagal memverifikasi bukti pembayaran. Silakan coba lagi.');
      }
    } catch {
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setSubmittingProof(false);
    }
  };

  const handleCancelOrder = async () => {
    if (confirm("Apakah Anda yakin ingin membatalkan pesanan ini?")) {
      setSubmittingProof(true)
      try {
        const res = await fetch(`/api/orders/${order.id}/expire`, { method: 'POST' })
        if (res.ok) {
          router.push(`/orders/${order.id}/payment-failed?reason=cancelled`)
        } else {
          alert("Gagal membatalkan pesanan.")
        }
      } catch (e) {
        alert("Terjadi kesalahan koneksi.")
      } finally {
        setSubmittingProof(false)
      }
    }
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
          onClick={handleCancelOrder}
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
    </div>
  )
}
