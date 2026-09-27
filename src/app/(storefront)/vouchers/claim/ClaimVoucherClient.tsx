'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Ticket, Calendar, CheckCircle2, AlertCircle, Loader2, ArrowRight, Home, Info, Sparkles, Zap } from 'lucide-react'
import { formatRupiah } from '@/lib/utils'
import { useStorefrontContext } from '@/app/(storefront)/layout'
import { useCartStore } from '@/stores/cart-store'
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
        return `Potongan ${formatRupiah(template.discountValue)}`
      case 'DISCOUNT_PCT':
        return `Diskon ${template.discountValue}%`
      case 'B2G1':
      case 'BUY_X_GET_Y':
        return `Beli ${template.discountValue > 0 ? template.discountValue : 2} Gratis 1`
      case 'FREE_DRINK':
        return 'Gratis Minuman'
      case 'FREE_TOPPING':
        return 'Gratis Topping'
      case 'UPGRADE_SIZE':
        return 'Gratis Upsize'
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
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem')
    } finally {
      setClaiming(false)
    }
  }

  const handleUseClaimedVoucher = () => {
    if (claimedVoucher) {
      useCartStore.getState().setAppliedVoucher(claimedVoucher)
    }
    const items = useCartStore.getState().items || []
    if (items.length > 0) {
      router.push('/checkout')
    } else {
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-12">
      <div className="max-w-md mx-auto px-4 pt-6 space-y-6">
        
        {/* Main Claiming Card */}
        <div className="bg-white rounded-[2.5rem] border border-orange-100 shadow-xl overflow-hidden flex flex-col">
          {/* Banner image or placeholder */}
          <div className="relative h-48 bg-gradient-to-br from-orange-500 to-amber-500 w-full shrink-0 flex items-center justify-center">
            {template.bannerImage ? (
              <Image 
                src={template.bannerImage} 
                alt={template.title} 
                fill 
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 400px"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-white">
                <Ticket className="w-16 h-16 stroke-[1.5]" />
                <span className="text-xs font-black uppercase tracking-wider text-orange-50">Promo Spesial Arum Seduh</span>
              </div>
            )}
            
            {/* Promo Type Badge */}
            <div className="absolute top-4 left-4 px-3.5 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-white font-black text-[11px] tracking-wide uppercase">
              {getVoucherBadge()}
            </div>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Code and Expiry Header */}
              <div className="flex items-center justify-between border-b border-orange-100 pb-3">
                <span className="font-mono text-sm font-black text-orange-800 bg-orange-50 border border-orange-200 px-3 py-1 rounded-xl">
                  {template.code}
                </span>
                
                {template.expiresAt && (
                  <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-orange-500" />
                    s/d {new Date(template.expiresAt).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'})}
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h1 className="font-serif font-black text-xl text-gray-900 leading-snug">{template.title}</h1>
                <p className="text-sm text-gray-600 leading-relaxed">{template.description}</p>
              </div>

              {/* Terms and Conditions */}
              <div className="bg-orange-50/40 rounded-2xl p-4 border border-orange-100 space-y-2 text-xs">
                <h2 className="font-black text-gray-800 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-orange-500" />
                  Syarat & Ketentuan
                </h2>
                <ul className="list-disc pl-4 space-y-1 text-gray-600 font-medium">
                  {template.terms.split('\n').filter(t => t.trim().length > 0).map((term, index) => (
                    <li key={index}>{term}</li>
                  ))}
                  <li>Minimal pembelian: {template.minPurchase > 0 ? formatRupiah(template.minPurchase) : 'Tanpa minimum belanja'}</li>
                  {template.type === 'DISCOUNT_PCT' && template.maxDiscount && (
                    <li>Maksimal potongan: {formatRupiah(template.maxDiscount)}</li>
                  )}
                  {template.usageLimit > 0 && <li>Kuota klaim terbatas ({template.usageLimit} pengguna)</li>}
                </ul>
              </div>

              {/* Applicable Products */}
              {validProducts.length > 0 && validProducts.length < 20 && (
                <div className="space-y-2">
                  <h2 className="text-xs font-black text-gray-500 uppercase tracking-wider">Berlaku Untuk Menu</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {validProducts.map((p) => (
                      <span key={p.id} className="text-[10px] font-bold bg-orange-50 border border-orange-200 text-orange-800 px-2.5 py-1 rounded-lg">
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
                  className="bg-orange-50/70 border border-orange-200 rounded-3xl p-5 text-center space-y-3"
                >
                  <CheckCircle2 className="w-12 h-12 text-orange-500 mx-auto" />
                  <div className="space-y-1">
                    <h2 className="font-black text-gray-900 text-sm">{success}</h2>
                    <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
                      Voucher telah disimpan ke akun Anda dan siap digunakan untuk potongan harga pesanan.
                    </p>
                  </div>
                  {claimedVoucher && (
                    <div className="bg-white border border-orange-200 rounded-2xl py-2 px-4 inline-block font-mono text-xs font-black text-orange-800 select-all">
                      Kode: {claimedVoucher.code}
                    </div>
                  )}
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      onClick={handleUseClaimedVoucher}
                      className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black rounded-2xl transition-all text-xs flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 cursor-pointer"
                    >
                      <Zap className="w-4 h-4" />
                      Pakai Voucher Sekarang
                    </button>
                    <button
                      onClick={() => router.push('/profile?section=vouchers')}
                      className="w-full py-3.5 bg-white border border-orange-200 text-orange-700 hover:bg-orange-50 font-black rounded-2xl transition-colors text-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      Lihat di Voucher Saya
                      <ArrowRight className="w-4 h-4" />
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
                  className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-2.5 text-left text-xs font-bold text-red-700 shadow-sm"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
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
                    className="w-full py-4 bg-gray-100 text-gray-400 rounded-2xl font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Memuat Sesi...
                  </button>
                ) : !session ? (
                  <div className="space-y-3">
                    <button
                      onClick={openLogin}
                      className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black rounded-2xl transition-all text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 cursor-pointer"
                    >
                      Masuk untuk Mengklaim Voucher
                    </button>
                    <p className="text-[11px] text-center text-gray-500 font-medium flex items-center justify-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span>Login cepat via WhatsApp atau Google untuk menyimpan voucher ini.</span>
                    </p>
                  </div>
                ) : isExpired ? (
                  <button
                    disabled
                    className="w-full py-4 bg-gray-100 text-gray-400 border border-gray-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-2"
                  >
                    Voucher Sudah Kedaluwarsa
                  </button>
                ) : isQuotaFull ? (
                  <button
                    disabled
                    className="w-full py-4 bg-gray-100 text-gray-400 border border-gray-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-2"
                  >
                    Kuota Voucher Sudah Habis
                  </button>
                ) : (
                  <button
                    onClick={handleClaim}
                    disabled={claiming}
                    className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-60 text-white font-black rounded-2xl transition-all text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                  >
                    {claiming ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Mengklaim...
                      </>
                    ) : (
                      <>
                        <Ticket className="w-4 h-4" />
                        <span>Klaim Voucher Gratis Sekarang</span>
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
            className="w-full py-3.5 bg-white border border-orange-200 hover:bg-orange-50 text-orange-700 font-black rounded-2xl transition-colors text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Buka Menu Arum Seduh</span>
          </button>
        )}
      </div>
    </div>
  )
}
