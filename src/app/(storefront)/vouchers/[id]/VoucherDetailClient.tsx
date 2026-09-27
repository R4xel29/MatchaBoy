'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Ticket,
  Calendar,
  ShieldCheck,
  ChevronRight,
  X,
  Sparkles,
  Coffee,
  FileText,
  Copy,
  Check,
  Zap,
  Plus,
} from 'lucide-react'
import Image from 'next/image'
import { formatRupiah } from '@/lib/utils'
import { ProductModal } from '@/components/storefront/ProductModal'
import { useToast } from '@/components/ui/Toast'
import { useCartStore } from '@/stores/cart-store'

export default function VoucherDetailClient({ voucher, products }: { voucher: any; products: any[] }) {
  const router = useRouter()
  const { showToast } = useToast()
  
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isTnCOpen, setIsTnCOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleProductClick = (product: any) => {
    if (product.badge === 'sold-out') return
    setSelectedProduct(product)
    setIsModalOpen(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getVoucherTypeLabel = (type: string) => {
    switch (type) {
      case 'DISCOUNT_PCT': return 'Diskon Persentase'
      case 'DISCOUNT_RP': return 'Potongan Harga'
      case 'B2G1':
      case 'BUY_X_GET_Y': return 'Beli 2 Gratis 1'
      case 'FREE_DRINK': return 'Gratis Minuman'
      case 'FREE_TOPPING': return 'Gratis Topping'
      case 'UPGRADE_SIZE': return 'Gratis Upsize'
      case 'GRATIS_ONGKIR': return 'Gratis Ongkos Kirim'
      default: return 'Promo Spesial'
    }
  }

  const getVoucherValueText = (v: any) => {
    if (v.template) {
      const template = v.template
      if (template.type === 'DISCOUNT_PCT') {
        return `DISKON ${template.discountValue}%`
      } else if (template.type === 'DISCOUNT_RP') {
        return formatCurrency(template.discountValue)
      } else if (template.type === 'B2G1' || template.type === 'BUY_X_GET_Y') {
        const buyQty = template.discountValue > 0 ? template.discountValue : 2;
        return `BELI ${buyQty} GRATIS 1`
      } else if (template.type === 'FREE_DRINK') {
        return 'GRATIS MINUMAN'
      } else if (template.type === 'FREE_TOPPING') {
        return 'GRATIS TOPPING'
      } else if (template.type === 'UPGRADE_SIZE') {
        return 'GRATIS UPSIZE'
      } else if (template.type === 'GRATIS_ONGKIR') {
        return 'GRATIS ONGKIR'
      }
    }
    
    if (v.type === 'DISCOUNT_RP' && v.discountAmount > 0) return formatCurrency(v.discountAmount)
    if (v.type === 'DISCOUNT_PCT' && v.discountAmount > 0) return `DISKON ${v.discountAmount}%`
    if (v.type === 'B2G1' || v.type === 'BUY_X_GET_Y') return 'BELI 2 GRATIS 1'
    if (v.type === 'FREE_DRINK') return 'GRATIS MINUMAN'
    if (v.type === 'FREE_TOPPING') return 'GRATIS TOPPING'
    if (v.type === 'UPGRADE_SIZE') return 'GRATIS UPSIZE'
    if (v.type === 'GRATIS_ONGKIR') return 'GRATIS ONGKIR'
    return 'PROMO SPESIAL'
  }

  const getVoucherGradient = (type: string) => {
    switch (type) {
      case 'B2G1':
      case 'BUY_X_GET_Y':
        return 'from-orange-600 via-orange-500 to-amber-500'
      case 'FREE_DRINK':
      case 'FREE_TOPPING':
        return 'from-amber-600 via-orange-500 to-orange-600'
      case 'DISCOUNT_PCT':
      case 'DISCOUNT_RP':
        return 'from-orange-500 via-amber-500 to-orange-600'
      case 'UPGRADE_SIZE':
        return 'from-amber-500 to-orange-600'
      default:
        return 'from-orange-600 to-amber-500'
    }
  }

  const getVoucherPattern = (type: string) => {
    return (
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" />
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
            <pattern id="circles" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="10" fill="none" stroke="white" strokeWidth="1.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={type.startsWith('DISCOUNT') ? "url(#grid)" : "url(#circles)"} />
        </svg>
      </div>
    )
  }

  const minPurchase = voucher.template?.minPurchase || 0
  const maxDiscount = voucher.template?.maxDiscount || null
  const expiresDate = voucher.expiresAt ? new Date(voucher.expiresAt) : null
  const isExpired = expiresDate ? expiresDate < new Date() : false
  const isUsable = !voucher.isUsed && !isExpired

  const handleCopyCode = () => {
    navigator.clipboard.writeText(voucher.code.toUpperCase())
    setCopied(true)
    showToast('Kode voucher berhasil disalin!', 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleUseVoucherNow = () => {
    useCartStore.getState().setAppliedVoucher(voucher as any)
    const cartItems = useCartStore.getState().items || []
    if (cartItems.length > 0) {
      showToast('Voucher diterapkan! Mengarahkan ke halaman Checkout...', 'success')
      router.push('/checkout')
    } else {
      showToast('Voucher dipilih! Silakan pilih menu favorit Anda.', 'success')
      router.push('/')
    }
  }

  return (
    <div className="min-h-dvh bg-[#FDFBF7] pb-32 font-sans text-gray-800">
      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-between bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-orange-100">
        <button 
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all active:scale-95 cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-serif text-base font-black text-gray-900">Detail Voucher Promo</h1>
        <div className="w-10" />
      </header>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Vibrant Arum Seduh Ticket Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative overflow-hidden rounded-[2.25rem] bg-gradient-to-br ${getVoucherGradient(voucher.template?.type || voucher.type)} p-6 text-white shadow-xl shadow-orange-500/20 flex flex-col justify-between min-h-[210px]`}
        >
          {/* Decorative Pattern overlay */}
          {getVoucherPattern(voucher.template?.type || voucher.type)}

          {/* Glowing Light highlights */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/15 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/10 rounded-full blur-xl" />

          {/* Ticket Edge Notches */}
          <div className="absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-6 bg-[#FDFBF7] rounded-full shadow-inner z-10" />
          <div className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 bg-[#FDFBF7] rounded-full shadow-inner z-10" />

          {/* Card Top */}
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-wider border border-white/25">
                <Sparkles className="w-3 h-3" />
                {getVoucherTypeLabel(voucher.template?.type || voucher.type)}
              </span>
              <h2 className="font-serif text-lg font-black leading-tight mt-1">
                {voucher.template?.title || voucher.description}
              </h2>
              {voucher.template?.title && (
                <p className="text-xs text-orange-50 font-medium leading-snug">
                  {voucher.description}
                </p>
              )}
            </div>
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center shrink-0">
              <Coffee className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Card Bottom */}
          <div className="relative z-10 border-t border-dashed border-white/25 pt-4 mt-4 flex items-end justify-between gap-2">
            <div>
              <p className="text-[10px] text-orange-100 uppercase tracking-widest leading-none font-bold">Keuntungan Promo</p>
              <p className="text-2xl font-black font-serif tracking-tight mt-1 leading-none text-white">
                {getVoucherValueText(voucher)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="text-right group cursor-pointer"
            >
              <p className="text-[9px] text-orange-100 uppercase tracking-widest leading-none font-bold">Kode Voucher</p>
              <div className="mt-1 inline-flex items-center gap-1.5 text-xs font-mono font-black text-orange-950 bg-white hover:bg-orange-50 px-3 py-1.5 rounded-xl shadow-sm transition-all">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-orange-600" />}
                <span>{voucher.code.toUpperCase()}</span>
              </div>
            </button>
          </div>
        </motion.div>

        {/* Voucher Fast Info Grid */}
        <div className="bg-white rounded-3xl border border-orange-100 shadow-sm p-4 grid grid-cols-2 gap-3 divide-x divide-orange-100">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0 border border-orange-100">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-none">Masa Berlaku</p>
              <p className="text-xs font-black text-gray-800 mt-1 truncate">
                {expiresDate ? expiresDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Selamanya'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-none">Min. Belanja</p>
              <p className="text-xs font-black text-gray-800 mt-1">
                {minPurchase > 0 ? formatCurrency(minPurchase) : 'Tanpa Minimum'}
              </p>
            </div>
          </div>
        </div>

        {/* Syarat & Ketentuan Quick Trigger Button */}
        <button
          onClick={() => setIsTnCOpen(true)}
          className="w-full bg-white rounded-3xl border border-orange-100 shadow-sm p-4 flex items-center justify-between hover:bg-orange-50/40 transition-all active:scale-[0.99] cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-100">
              <FileText className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-xs font-black text-gray-900">Syarat & Ketentuan Penggunaan</h3>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">Lihat aturan lengkap pemakaian voucher ini</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-orange-500" />
        </button>

        {/* Applicable Products Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-base font-black text-gray-900 flex items-center gap-2">
              <Coffee className="w-4 h-4 text-orange-600" />
              <span>Menu Pilihan yang Berlaku</span>
            </h3>
            <span className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-[10px] font-black">
              {products.length} Menu
            </span>
          </div>

          {/* Applicable Products Grid */}
          <div className="grid grid-cols-2 gap-4">
            {products.map((p) => (
              <div
                key={p.id}
                onClick={() => handleProductClick(p)}
                className="bg-white border border-orange-100/80 hover:border-orange-300 hover:shadow-md transition-all duration-300 rounded-3xl p-3 flex flex-col justify-between cursor-pointer group overflow-hidden"
              >
                {p.image ? (
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-orange-50/40 mb-3">
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      sizes="150px"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {p.badge && (
                      <span className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[8px] font-black uppercase shadow-sm">
                        {p.badge}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="w-full aspect-square rounded-2xl bg-orange-50/50 flex items-center justify-center text-orange-400 mb-3 border border-orange-100">
                    <Coffee className="w-8 h-8" />
                  </div>
                )}

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black text-gray-900 line-clamp-1 leading-snug group-hover:text-orange-600 transition-colors">
                      {p.name}
                    </h4>
                    <p className="text-[10px] text-gray-500 line-clamp-2 leading-tight mt-1 font-medium">
                      {p.description}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-1.5 pt-1">
                    <span className="text-xs font-black text-gray-900 leading-none">
                      {formatRupiah(p.price)}
                    </span>
                    <span className="w-7 h-7 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-sm transition-transform active:scale-90 select-none">
                      <Plus className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-orange-100 p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.06)]">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={handleCopyCode}
            className="px-4 py-3.5 rounded-2xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Tersalin' : 'Salin Kode'}</span>
          </button>
          <button
            type="button"
            disabled={!isUsable}
            onClick={handleUseVoucherNow}
            className="flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>
              {voucher.isUsed
                ? 'Voucher Sudah Terpakai'
                : isExpired
                ? 'Voucher Kedaluwarsa'
                : 'Pakai Voucher Sekarang'}
            </span>
          </button>
        </div>
      </div>

      {/* Syarat & Ketentuan Bottom Sheet Modal */}
      <AnimatePresence>
        {isTnCOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTnCOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2.5rem] shadow-[0_-12px_48px_rgba(0,0,0,0.15)] flex flex-col max-h-[85vh] pt-4 pb-safe"
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 shrink-0" />
              
              <div className="px-6 pb-4 border-b border-orange-100 flex items-center justify-between shrink-0">
                <h2 className="font-serif text-lg font-black text-gray-900">Syarat & Ketentuan</h2>
                <button
                  onClick={() => setIsTnCOpen(false)}
                  className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center hover:bg-orange-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scrollbar-hide">
                <div className="space-y-4">
                  {(voucher.template?.terms || voucher.terms) && (
                    (voucher.template?.terms || voucher.terms).split('\n').filter((t: string) => t.trim().length > 0).map((term: string, idx: number) => (
                      <div key={`custom-${idx}`} className="flex gap-3 items-start">
                        <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-xs shrink-0 text-orange-600 font-black mt-0.5">
                          •
                        </div>
                        <div className="text-sm text-gray-600 leading-relaxed font-medium">
                          {term}
                        </div>
                      </div>
                    ))
                  )}

                  <div className="flex gap-3 items-start">
                    <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-xs shrink-0 text-orange-600 font-black mt-0.5">
                      1
                    </div>
                    <div className="text-sm text-gray-600 leading-relaxed font-medium">
                      Minimum nilai pembelanjaan subtotal keranjang belanja adalah <span className="font-bold text-gray-800">{minPurchase > 0 ? formatCurrency(minPurchase) : 'tanpa minimum belanja'}</span>.
                    </div>
                  </div>

                  {maxDiscount && (
                    <div className="flex gap-3 items-start">
                      <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-xs shrink-0 text-orange-600 font-black mt-0.5">
                        2
                      </div>
                      <div className="text-sm text-gray-600 leading-relaxed font-medium">
                        Maksimum potongan belanja yang bisa didapatkan dari voucher ini adalah <span className="font-bold text-gray-800">{formatCurrency(maxDiscount)}</span>.
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 items-start">
                    <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-xs shrink-0 text-orange-600 font-black mt-0.5">
                      {maxDiscount ? 3 : 2}
                    </div>
                    <div className="text-sm text-gray-600 leading-relaxed font-medium">
                      Voucher ini berlaku untuk produk-produk pilihan yang tercantum pada daftar menu di halaman detail voucher ini.
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-xs shrink-0 text-orange-600 font-black mt-0.5">
                      {maxDiscount ? 4 : 3}
                    </div>
                    <div className="text-sm text-gray-600 leading-relaxed font-medium">
                      Voucher hanya dapat digunakan satu kali per transaksi dan tidak dapat digabungkan dengan kode kupon promo lainnya.
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-xs shrink-0 text-orange-600 font-black mt-0.5">
                      {maxDiscount ? 5 : 4}
                    </div>
                    <div className="text-sm text-gray-600 leading-relaxed font-medium">
                      Masa berlaku voucher adalah sampai <span className="font-bold text-gray-800">{expiresDate ? expiresDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'selamanya'}</span>.
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-xs shrink-0 text-orange-600 font-black mt-0.5">
                      {maxDiscount ? 6 : 5}
                    </div>
                    <div className="text-sm text-gray-600 leading-relaxed font-medium">
                      Apabila transaksi dibatalkan atau kedaluwarsa sebelum pembayaran selesai, voucher otomatis dipulihkan kembali ke akun Anda.
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-orange-100 shrink-0">
                <button
                  onClick={() => setIsTnCOpen(false)}
                  className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black rounded-2xl shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] text-sm cursor-pointer"
                >
                  Saya Mengerti
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Product custom modal integration */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedProduct(null)
          }}
          allProducts={products}
        />
      )}
    </div>
  )
}
