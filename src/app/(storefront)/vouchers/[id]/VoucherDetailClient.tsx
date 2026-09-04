'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Ticket, Calendar, ShieldCheck, CheckCircle2, ChevronRight, X, Sparkles, HelpCircle } from 'lucide-react'
import Image from 'next/image'
import { formatRupiah } from '@/lib/utils'
import { ProductModal } from '@/components/storefront/ProductModal'
import { useToast } from '@/components/ui/Toast'

export default function VoucherDetailClient({ voucher, products }: { voucher: any; products: any[] }) {
  const router = useRouter()
  const { showToast } = useToast()
  
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isTnCOpen, setIsTnCOpen] = useState(false)

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
      case 'UPGRADE_SIZE': return 'Upgrade Ukuran'
      case 'GRATIS_ONGKIR': return 'Gratis Ongkos Kirim'
      default: return 'Promo Spesial'
    }
  }

  const getVoucherValueText = (v: any) => {
    if (v.template) {
      const template = v.template
      if (template.type === 'DISCOUNT_PCT') {
        return `${template.discountValue}% OFF`
      } else if (template.type === 'DISCOUNT_RP') {
        return formatCurrency(template.discountValue)
      } else if (template.type === 'B2G1' || template.type === 'BUY_X_GET_Y') {
        const buyQty = template.discountValue > 0 ? template.discountValue : 2;
        return `BELI ${buyQty} GRATIS 1`
      } else if (template.type === 'FREE_DRINK') {
        return 'FREE DRINK'
      } else if (template.type === 'FREE_TOPPING') {
        return 'FREE TOPPING'
      } else if (template.type === 'UPGRADE_SIZE') {
        return 'FREE UPGRADE'
      } else if (template.type === 'GRATIS_ONGKIR') {
        return 'FREE SHIPPING'
      }
    }
    
    // Legacy mapping
    if (v.type === 'B2G1' || v.type === 'BUY_X_GET_Y') return 'BELI 2 GRATIS 1'
    if (v.type === 'FREE_DRINK') return 'FREE DRINK'
    if (v.type === 'FREE_TOPPING') return 'FREE TOPPING'
    if (v.type === 'UPGRADE_SIZE') return 'FREE UPGRADE'
    if (v.type === 'GRATIS_ONGKIR') return 'FREE SHIPPING'
    return 'PROMO'
  }

  const getVoucherGradient = (type: string) => {
    switch (type) {
      case 'B2G1':
      case 'BUY_X_GET_Y':
        return 'from-orange-600 to-amber-600'
      case 'FREE_DRINK':
      case 'FREE_TOPPING':
        return 'from-[#1E3A1A] to-[#122210]' // Premium Dark Forest Matcha Green
      case 'DISCOUNT_PCT':
      case 'DISCOUNT_RP':
        return 'from-[#2C1810] to-[#1C0F0A]' // Premium Luxury Chocolate Dark Coffee
      case 'UPGRADE_SIZE':
        return 'from-[#1A2E3B] to-[#101C24]' // Sophisticated Teal Blue
      default:
        return 'from-[#1B1B1B] to-[#0A0A0A]' // Sleek Minimalist Obsidian Black
    }
  }

  const getVoucherPattern = (type: string) => {
    return (
      <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden">
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

  return (
    <div className="min-h-dvh bg-[#FDFBF7] pb-24 font-sans text-gray-800">
      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-100/50">
        <button 
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-serif text-base font-bold text-gray-900">Detail Voucher</h1>
        <div className="w-10" /> {/* Spacing spacer */}
      </header>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Vibrant Premium Ticket Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br ${getVoucherGradient(voucher.template?.type || voucher.type)} p-6 text-white shadow-xl shadow-gray-200/60 flex flex-col justify-between aspect-[1.8/1]`}
        >
          {/* Decorative Pattern overlay */}
          {getVoucherPattern(voucher.template?.type || voucher.type)}

          {/* Glowing Light highlights */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/5 rounded-full blur-xl" />

          {/* Ticket Edge Notches */}
          <div className="absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-6 bg-[#FDFBF7] rounded-full shadow-inner z-10" />
          <div className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 bg-[#FDFBF7] rounded-full shadow-inner z-10" />

          {/* Card Top */}
          <div className="relative z-10 flex items-start justify-between">
            <div className="space-y-0.5">
              <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[9px] font-black uppercase tracking-wider border border-white/10">
                {getVoucherTypeLabel(voucher.template?.type || voucher.type)}
              </span>
              <h2 className="font-serif text-lg font-bold leading-tight mt-2 opacity-95">
                {voucher.description}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-3xl">🍃</span>
            </div>
          </div>

          {/* Card Bottom */}
          <div className="relative z-10 border-t border-white/10 pt-4 flex items-end justify-between">
            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-widest leading-none font-bold">Voucher Value</p>
              <p className="text-3xl font-black font-serif tracking-tight mt-1 leading-none text-amber-200">
                {getVoucherValueText(voucher)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-white/40 uppercase tracking-widest leading-none font-bold">Kode Voucher</p>
              <p className="text-[11px] font-mono font-bold mt-1 text-white bg-white/10 px-2 py-0.5 rounded-md border border-white/5">
                {voucher.code.toUpperCase()}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Voucher Fast Info Grid */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 grid grid-cols-2 gap-3 divide-x divide-gray-100">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-9 h-9 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
              <Calendar className="w-4.5 h-4.5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider leading-none">Masa Berlaku</p>
              <p className="text-[11.5px] font-bold text-gray-700 mt-1 truncate">
                {expiresDate ? expiresDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Selamanya'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-4">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider leading-none">Min. Belanja</p>
              <p className="text-[11.5px] font-bold text-gray-700 mt-1">
                {minPurchase > 0 ? formatCurrency(minPurchase) : 'Tanpa Min.'}
              </p>
            </div>
          </div>
        </div>

        {/* Syarat & Ketentuan Quick Trigger Button */}
        <button
          onClick={() => setIsTnCOpen(true)}
          className="w-full bg-white rounded-3xl border border-gray-100 shadow-sm p-4 flex items-center justify-between hover:bg-gray-50/50 transition-all active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gray-50 flex items-center justify-center text-lg shrink-0">
              📋
            </div>
            <div className="text-left">
              <h3 className="text-xs font-bold text-gray-800">Syarat & Ketentuan</h3>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">Lihat detail aturan penggunaan voucher ini</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300" />
        </button>

        {/* Applicable Products Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-base font-bold text-gray-800 flex items-center gap-2">
              🍵 Produk Pilihan Yang Berlaku
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-[#B48A5E]/10 text-[#B48A5E] text-[10px] font-bold">
              {products.length} Menu
            </span>
          </div>

          {/* Applicable Products Grid */}
          <div className="grid grid-cols-2 gap-4">
            {products.map((p) => (
              <div
                key={p.id}
                onClick={() => handleProductClick(p)}
                className="bg-white border border-gray-100 hover:border-[#B48A5E]/30 hover:shadow-md transition-all duration-300 rounded-3xl p-3 flex flex-col justify-between cursor-pointer group overflow-hidden"
              >
                {p.image ? (
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-[#FAF8F5] mb-3">
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      sizes="150px"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {p.badge && (
                      <span className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded-lg bg-[#2E5A44] text-white text-[8px] font-black uppercase shadow-sm">
                        {p.badge}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="w-full aspect-square rounded-2xl bg-gray-50 flex items-center justify-center text-2xl mb-3 border border-gray-100">
                    🍵
                  </div>
                )}

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black text-gray-850 line-clamp-1 leading-snug group-hover:text-[#B48A5E] transition-colors">
                      {p.name}
                    </h4>
                    <p className="text-[10px] text-gray-400 line-clamp-2 leading-tight mt-1 font-medium">
                      {p.description}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-1.5 pt-1">
                    <span className="text-xs font-black text-gray-900 leading-none">
                      {formatRupiah(p.price)}
                    </span>
                    <span className="w-7 h-7 rounded-xl bg-[#B48A5E] hover:bg-[#946F48] flex items-center justify-center text-white text-xs font-bold shadow-sm transition-transform active:scale-90 select-none">
                      +
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Syarat & Ketentuan Bottom Sheet Modal (Premium Slide-up) */}
      <AnimatePresence>
        {isTnCOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTnCOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
            />
            {/* Sheet content */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2.5rem] shadow-[0_-12px_48px_rgba(0,0,0,0.15)] flex flex-col max-h-[85vh] pt-4 pb-safe"
            >
              {/* Notchy header line */}
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 shrink-0" />
              
              <div className="px-6 pb-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                <h2 className="font-serif text-lg font-bold text-gray-900">Syarat & Ketentuan</h2>
                <button
                  onClick={() => setIsTnCOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-50 text-gray-500 flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable details container */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scrollbar-hide">
                <div className="space-y-4">
                  {/* Custom Terms from Template */}
                  {(voucher.template?.terms || voucher.terms) && (
                    (voucher.template?.terms || voucher.terms).split('\n').filter((t: string) => t.trim().length > 0).map((term: string, idx: number) => (
                      <div key={`custom-${idx}`} className="flex gap-3 items-start">
                        <div className="w-5 h-5 rounded-full bg-[#B48A5E]/10 flex items-center justify-center text-xs shrink-0 text-[#B48A5E] font-bold mt-0.5">
                          •
                        </div>
                        <div className="text-sm text-gray-600 leading-relaxed font-medium">
                          {term}
                        </div>
                      </div>
                    ))
                  )}

                  <div className="flex gap-3 items-start">
                    <div className="w-5 h-5 rounded-full bg-[#B48A5E]/10 flex items-center justify-center text-xs shrink-0 text-[#B48A5E] font-bold mt-0.5">
                      1
                    </div>
                    <div className="text-sm text-gray-600 leading-relaxed font-medium">
                      Minimum nilai pembelanjaan subtotal keranjang belanja adalah <span className="font-bold text-gray-800">{minPurchase > 0 ? formatCurrency(minPurchase) : 'tanpa minimum belanja'}</span>.
                    </div>
                  </div>

                  {maxDiscount && (
                    <div className="flex gap-3 items-start">
                      <div className="w-5 h-5 rounded-full bg-[#B48A5E]/10 flex items-center justify-center text-xs shrink-0 text-[#B48A5E] font-bold mt-0.5">
                        2
                      </div>
                      <div className="text-sm text-gray-600 leading-relaxed font-medium">
                        Maksimum potongan potongan belanja yang bisa didapatkan dari voucher ini adalah <span className="font-bold text-gray-800">{formatCurrency(maxDiscount)}</span>.
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 items-start">
                    <div className="w-5 h-5 rounded-full bg-[#B48A5E]/10 flex items-center justify-center text-xs shrink-0 text-[#B48A5E] font-bold mt-0.5">
                      {maxDiscount ? 3 : 2}
                    </div>
                    <div className="text-sm text-gray-600 leading-relaxed font-medium">
                      Voucher ini hanya berlaku untuk produk-produk pilihan yang tercantum pada halaman grid di detail voucher ini. Produk di luar grid tersebut tidak akan dihitung dalam total nilai diskon.
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-5 h-5 rounded-full bg-[#B48A5E]/10 flex items-center justify-center text-xs shrink-0 text-[#B48A5E] font-bold mt-0.5">
                      {maxDiscount ? 4 : 3}
                    </div>
                    <div className="text-sm text-gray-600 leading-relaxed font-medium">
                      Voucher hanya dapat digunakan satu kali saja per transaksi dan tidak dapat digabungkan dengan kode kupon promo lainnya.
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-5 h-5 rounded-full bg-[#B48A5E]/10 flex items-center justify-center text-xs shrink-0 text-[#B48A5E] font-bold mt-0.5">
                      {maxDiscount ? 5 : 4}
                    </div>
                    <div className="text-sm text-gray-600 leading-relaxed font-medium">
                      Masa kedaluwarsa voucher adalah sampai <span className="font-bold text-gray-800">{expiresDate ? expiresDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'selamanya'}</span>. Jika melewati batas waktu tersebut, voucher otomatis hangus.
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="w-5 h-5 rounded-full bg-[#B48A5E]/10 flex items-center justify-center text-xs shrink-0 text-[#B48A5E] font-bold mt-0.5">
                      {maxDiscount ? 6 : 5}
                    </div>
                    <div className="text-sm text-gray-600 leading-relaxed font-medium">
                      Apabila transaksi dibatalkan atau kedaluwarsa sebelum pembayaran berhasil diproses penuh, voucher akan otomatis dipulihkan kembali menjadi aktif pada profil Anda.
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom persistent action */}
              <div className="px-6 py-4 border-t border-gray-50 shrink-0">
                <button
                  onClick={() => setIsTnCOpen(false)}
                  className="w-full py-4 bg-[#B48A5E] hover:bg-[#946F48] text-white font-bold rounded-2xl shadow-xl transition-all active:scale-[0.98] text-sm"
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
