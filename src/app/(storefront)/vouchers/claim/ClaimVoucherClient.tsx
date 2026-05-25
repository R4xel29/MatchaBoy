'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Ticket, Calendar, CheckCircle2, AlertCircle, Loader2, ArrowRight, Home, Info, ShoppingBag } from 'lucide-react'
import { formatRupiah } from '@/lib/utils'
import { useStorefrontContext } from '@/app/(storefront)/layout'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

interface VoucherTemplate {
  id: string
  code: string
  title: string
  description: string
  bannerImage: string | null
  type: string
  discountValue: number
  minPurchase: number
  maxDiscount: number | null
  terms: string
  expiresAt: string | null
  usageLimit: number
  usageCount: number
}

interface ProductInfo {
  id: string
  name: string
  price: number
}

export default function ClaimVoucherClient({ 
  template,
  validProducts 
}: { 
  template: VoucherTemplate
  validProducts: ProductInfo[]
}) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { openLogin } = useStorefrontContext()
  
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [claimedVoucher, setClaimedVoucher] = useState<any | null>(null)

  const isExpired = template.expiresAt ? new Date(template.expiresAt) < new Date() : false
  const isQuotaFull = template.usageLimit > 0 && template.usageCount >= template.usageLimit

  const getVoucherBadge = () => {
    switch (template.type) {
      case 'DISCOUNT_RP':
        return `Diskon ${formatRupiah(template.discountValue)}`
      case 'DISCOUNT_PCT':
        return `Diskon ${template.discountValue}%`
      case 'FREE_DRINK':
        return 'Gratis Minuman'
      case 'FREE_TOPPING':
        return 'Gratis Topping'
      case 'UPGRADE_SIZE':
        return 'Gratis Upgrade Size'
      case 'GRATIS_ONGKIR':
        return 'Gratis Ongkir'
      default:
        return 'Promo Spesial'
    }
  }

  const handleClaim = async () => {
    if (claiming) return
    setError(null)
    setSuccess(null)
    setClaiming(true)

    try {
      const res = await fetch('/api/user/vouchers/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: template.code })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengklaim voucher')
      }

      setClaimedVoucher(data.voucher)
      setSuccess(data.message || 'Voucher berhasil diklaim!')
      router.refresh() // Refresh layout state to fetch new vouchers count
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem')
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-12">
      <div className="max-w-md mx-auto px-4 pt-6 space-y-6">
        
        {/* Main Claiming Card */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden flex flex-col">
          {/* Banner image or placeholder */}
          <div className="relative h-48 bg-gray-100 w-full shrink-0 flex items-center justify-center">
            {template.bannerImage ? (
              <Image 
                src={template.bannerImage} 
                alt={template.title} 
                fill 
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 400px"
              />
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-gray-300">
                <Ticket className="w-16 h-16 stroke-1 text-[#B48A5E]/40" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#B48A5E]/50">Matchaboy Promo</span>
              </div>
            )}
            
            {/* Promo Type Badge */}
            <div className="absolute top-4 left-4 px-3.5 py-2 rounded-full bg-black/45 backdrop-blur-md text-white font-extrabold text-[11px] tracking-wide uppercase">
              {getVoucherBadge()}
            </div>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Code and Expiry Header */}
              <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                <span className="font-mono text-sm font-black text-amber-800 bg-amber-50 border border-amber-100 px-3 py-1 rounded-xl">
                  {template.code}
                </span>
                
                {template.expiresAt && (
                  <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#B48A5E]" />
                    S/D {new Date(template.expiresAt).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'})}
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h1 className="font-serif font-black text-xl text-gray-900 leading-snug">{template.title}</h1>
                <p className="text-sm text-gray-500 leading-relaxed">{template.description}</p>
              </div>

              {/* Terms and Conditions */}
              <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 space-y-2 text-xs">
                <h3 className="font-bold text-gray-700 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-[#B48A5E]" />
                  Syarat & Ketentuan
                </h3>
                <ul className="list-disc pl-4 space-y-1 text-gray-500 font-medium">
                  {template.terms.split('\n').filter(t => t.trim().length > 0).map((term, index) => (
                    <li key={index}>{term}</li>
                  ))}
                  <li>Minimal pembelian: {formatRupiah(template.minPurchase)}</li>
                  {template.type === 'DISCOUNT_PCT' && template.maxDiscount && (
                    <li>Maksimal potongan: {formatRupiah(template.maxDiscount)}</li>
                  )}
                  {template.usageLimit > 0 && <li>Kuota klaim terbatas ({template.usageLimit} pengguna)</li>}
                </ul>
              </div>

              {/* Applicable Products */}
              {validProducts.length > 0 && validProducts.length < 20 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Produk Terpilih</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {validProducts.map((p) => (
                      <span key={p.id} className="text-[10px] font-bold bg-[#B48A5E]/10 text-amber-900 px-2.5 py-1 rounded-lg">
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Claim Success State */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5 text-center space-y-3"
                >
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                  <div className="space-y-1">
                    <h3 className="font-bold text-emerald-950 text-sm">{success}</h3>
                    <p className="text-[11px] text-emerald-800 font-medium leading-relaxed">
                      Voucher telah ditambahkan ke akun Anda. Gunakan saat checkout untuk mendapatkan potongan harga.
                    </p>
                  </div>
                  {claimedVoucher && (
                    <div className="bg-white border border-emerald-100 rounded-2xl py-2 px-4 inline-block font-mono text-xs font-bold text-emerald-900 select-all">
                      Kode: {claimedVoucher.code}
                    </div>
                  )}
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      onClick={() => router.push('/profile?section=vouchers')}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-colors text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/10"
                    >
                      Lihat Voucher Saya
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => router.push('/')}
                      className="w-full py-3.5 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold rounded-2xl transition-colors text-xs flex items-center justify-center gap-2"
                    >
                      <Home className="w-4 h-4" />
                      Kembali ke Beranda
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error State */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-2.5 text-left text-xs font-medium text-red-700 shadow-sm"
                >
                  <AlertCircle className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Action Call to Action Buttons */}
            {!success && (
              <div className="pt-2">
                {status === 'loading' ? (
                  <button
                    disabled
                    className="w-full py-4.5 bg-gray-200 text-gray-400 rounded-2xl font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Memuat Sesi...
                  </button>
                ) : !session ? (
                  <div className="space-y-3">
                    <button
                      onClick={openLogin}
                      className="w-full py-4.5 bg-[#B48A5E] hover:bg-[#946F48] text-white font-bold rounded-2xl transition-all text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#B48A5E]/10"
                    >
                      Masuk untuk Mengklaim Voucher
                    </button>
                    <p className="text-[10px] text-center text-gray-400 font-medium">
                      💡 Login cepat via WhatsApp atau Google untuk menyimpan voucher ini ke akun Anda.
                    </p>
                  </div>
                ) : isExpired ? (
                  <button
                    disabled
                    className="w-full py-4.5 bg-gray-100 text-gray-400 border border-gray-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-2"
                  >
                    Voucher Sudah Kedaluwarsa
                  </button>
                ) : isQuotaFull ? (
                  <button
                    disabled
                    className="w-full py-4.5 bg-gray-100 text-gray-400 border border-gray-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-2"
                  >
                    Kuota Voucher Sudah Habis
                  </button>
                ) : (
                  <button
                    onClick={handleClaim}
                    disabled={claiming}
                    className="w-full py-4.5 bg-[#B48A5E] hover:bg-[#946F48] disabled:bg-[#B48A5E]/60 text-white font-bold rounded-2xl transition-all text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#B48A5E]/10 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {claiming ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Mengklaim...
                      </>
                    ) : (
                      <>
                        Klaim Voucher Sekarang!
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Back Button */}
        {!success && (
          <button
            onClick={() => router.push('/')}
            className="w-full py-3.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold rounded-2xl transition-colors text-xs flex items-center justify-center gap-2"
          >
            Buka Menu Matchaboy
          </button>
        )}
      </div>
    </div>
  )
}
