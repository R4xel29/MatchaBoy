'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Ticket, Plus, Edit, Trash2, Search, Calendar, DollarSign, Percent, 
  ShoppingBag, Check, X, Upload, Loader2, Info, Eye, Tag, AlertCircle, FileText
} from 'lucide-react'
import { formatRupiah } from '@/lib/utils'
import Image from 'next/image'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

interface ProductSelectOption {
  id: string
  name: string
  category: {
    name: string
  } | null
}

interface VoucherTemplateShape {
  id: string
  code: string
  title: string
  description: string
  bannerImage: string | null
  type: string
  discountValue: number
  minPurchase: number
  maxDiscount: number | null
  validProductIds: string | null
  terms: string
  expiresAt: string | null
  usageLimit: number
  usageCount: number
  createdAt: string
}

export default function VoucherAdminClient({ 
  initialTemplates, 
  products 
}: { 
  initialTemplates: VoucherTemplateShape[]
  products: ProductSelectOption[]
}) {
  const [templates, setTemplates] = useState<VoucherTemplateShape[]>(initialTemplates)
  const [isOpenForm, setIsOpenForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<VoucherTemplateShape | null>(null)
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  
  // Form State
  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [bannerImage, setBannerImage] = useState<string | null>(null)
  const [type, setType] = useState('DISCOUNT_RP')
  const [discountValue, setDiscountValue] = useState(0)
  const [minPurchase, setMinPurchase] = useState(0)
  const [maxDiscount, setMaxDiscount] = useState<number | null>(null)
  const [terms, setTerms] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [usageLimit, setUsageLimit] = useState(100)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  
  // UI States
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  // Reset errors when modal is opened or closed
  useEffect(() => {
    if (!isOpenForm) {
      setErrors({})
    }
  }, [isOpenForm])

  // Clear a specific field error when user starts editing
  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  // Statistics
  const stats = useMemo(() => {
    const total = templates.length
    const active = templates.filter(t => {
      if (!t.expiresAt) return true
      return new Date(t.expiresAt).getTime() >= new Date().getTime()
    }).length
    const totalClaims = templates.reduce((sum, t) => sum + t.usageCount, 0)
    return { total, active, totalClaims }
  }, [templates])

  // Filter templates list
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchesSearch = t.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            t.title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = typeFilter === 'ALL' || t.type === typeFilter
      return matchesSearch && matchesType
    })
  }, [templates, searchQuery, typeFilter])

  // Client-side WebP/Canvas Compression Helper
  const compressAndUpload = async (file: File) => {
    setIsUploading(true)
    setUploadError('')
    try {
      // 1. Client-side canvas compression
      const image = document.createElement('img')
      const reader = new FileReader()

      const compressedBlob = await new Promise<Blob>((resolve, reject) => {
        reader.onload = (e) => {
          image.src = e.target?.result as string
          image.onload = () => {
            const canvas = document.createElement('canvas')
            let width = image.width
            let height = image.height

            // Max dimensions 1200x800 for banner
            const MAX_WIDTH = 1200
            const MAX_HEIGHT = 800
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width)
              width = MAX_WIDTH
            }
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height)
              height = MAX_HEIGHT
            }

            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            ctx?.drawImage(image, 0, 0, width, height)

            canvas.toBlob((blob) => {
              if (blob) {
                resolve(blob)
              } else {
                reject(new Error('Canvas compression failed'))
              }
            }, 'image/webp', 0.8) // Save as webp with 80% quality
          }
        }
        reader.onerror = () => reject(new Error('File reader failed'))
        reader.readAsDataURL(file)
      })

      // 2. Upload to server
      const compressedFile = new File([compressedBlob], `${file.name.replace(/\.[^.]+$/, '')}.webp`, {
        type: 'image/webp'
      })

      const formData = new FormData()
      formData.append('file', compressedFile)

      const res = await fetch('/api/admin/upload/banner', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengunggah banner')
      
      setBannerImage(data.url)
    } catch (e: any) {
      console.error(e)
      setUploadError(e.message || 'Gagal mengompresi dan mengunggah gambar.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleOpenCreate = () => {
    setEditingTemplate(null)
    setCode('')
    setTitle('')
    setDescription('')
    setBannerImage(null)
    setType('DISCOUNT_RP')
    setDiscountValue(0)
    setMinPurchase(0)
    setMaxDiscount(null)
    setTerms('')
    setUsageLimit(100)
    
    // Default expiry (next month)
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    setExpiresAt(nextMonth)
    setSelectedProductIds([])
    setErrors({})
    setIsOpenForm(true)
  }

  const handleOpenEdit = (t: VoucherTemplateShape) => {
    setEditingTemplate(t)
    setCode(t.code)
    setTitle(t.title)
    setDescription(t.description)
    setBannerImage(t.bannerImage)
    setType(t.type)
    setDiscountValue(t.discountValue)
    setMinPurchase(t.minPurchase)
    setMaxDiscount(t.maxDiscount)
    setTerms(t.terms)
    setExpiresAt(t.expiresAt ? new Date(t.expiresAt).toISOString().split('T')[0] : '')
    setUsageLimit(t.usageLimit)
    const parsed = t.validProductIds ? JSON.parse(t.validProductIds) : []
    setSelectedProductIds(Array.isArray(parsed) ? parsed : [])
    setErrors({})
    setIsOpenForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus template voucher ini? Seluruh voucher personal pengguna yang aktif dari template ini juga akan terhapus.")) {
      try {
        const res = await fetch(`/api/admin/vouchers?id=${id}`, {
          method: 'DELETE'
        })
        if (res.ok) {
          setTemplates(templates.filter(t => t.id !== id))
        } else {
          const data = await res.json()
          alert(data.error || "Gagal menghapus template")
        }
      } catch (err) {
        alert("Koneksi gagal")
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Custom Validation
    const newErrors: Record<string, string> = {}
    if (!code.trim()) {
      newErrors.code = "Kode voucher wajib diisi."
    } else if (!/^[A-Z0-9_-]+$/.test(code.trim())) {
      newErrors.code = "Kode voucher hanya boleh berisi huruf kapital, angka, tanda hubung (-), dan garis bawah (_)."
    }

    if (!title.trim()) {
      newErrors.title = "Judul voucher wajib diisi."
    }

    if (!description.trim()) {
      newErrors.description = "Deskripsi / peraturan voucher wajib diisi."
    }

    if (discountValue === undefined || discountValue === null || isNaN(discountValue) || discountValue <= 0) {
      newErrors.discountValue = "Nilai potongan harus lebih besar dari 0."
    } else if (type === 'DISCOUNT_PCT' && discountValue > 100) {
      newErrors.discountValue = "Nilai potongan persentase maksimal adalah 100%."
    }

    if (minPurchase === undefined || minPurchase === null || isNaN(minPurchase) || minPurchase < 0) {
      newErrors.minPurchase = "Minimal total belanja tidak boleh bernilai negatif."
    }

    if (usageLimit === undefined || usageLimit === null || isNaN(usageLimit) || usageLimit < 0) {
      newErrors.usageLimit = "Kuota klaim tidak boleh bernilai negatif."
    }

    if (!terms.trim()) {
      newErrors.terms = "Syarat dan ketentuan voucher wajib diisi."
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      
      // Auto-focus and scroll to the first field with an error
      const firstErrorField = Object.keys(newErrors)[0]
      const element = document.getElementsByName(firstErrorField)[0] || document.getElementById(firstErrorField)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        if (typeof (element as any).focus === 'function') {
          (element as any).focus()
        }
      }
      return
    }

    const payload = {
      code: code.trim().toUpperCase(),
      title,
      description,
      bannerImage,
      type,
      discountValue: Number(discountValue),
      minPurchase: Number(minPurchase),
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
      terms,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      usageLimit: Number(usageLimit),
      validProductIds: selectedProductIds
    }

    setIsSaving(true)
    try {
      const url = '/api/admin/vouchers'
      const method = editingTemplate ? 'PUT' : 'POST'
      const body = editingTemplate ? { ...payload, id: editingTemplate.id } : payload

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (editingTemplate) {
        setTemplates(templates.map(t => t.id === editingTemplate.id ? data.template : t))
      } else {
        setTemplates([data.template, ...templates])
      }
      setIsOpenForm(false)
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan voucher")
    } finally {
      setIsSaving(false)
    }
  }

  const toggleProduct = (prodId: string) => {
    if (selectedProductIds.includes(prodId)) {
      setSelectedProductIds(selectedProductIds.filter(id => id !== prodId))
    } else {
      setSelectedProductIds([...selectedProductIds, prodId])
    }
  }

  // Filter products for multiselect
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.category?.name || '').toLowerCase().includes(productSearch.toLowerCase())
    )
  }, [products, productSearch])

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 font-sans text-gray-800 pb-20">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6 mb-8">
        <div>
          <h1 className="text-2xl font-serif font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Ticket className="w-7 h-7 text-[#B48A5E]" />
            Sistem Manajemen Voucher
          </h1>
          <p className="text-sm text-gray-500 mt-1">Buat, edit, dan awasi distribusi kupon promo diskon Matchaboy.</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-5 py-3 bg-[#B48A5E] hover:bg-[#946F48] text-white font-bold rounded-2xl shadow-lg shadow-[#B48A5E]/10 transition-all flex items-center gap-2 text-sm md:self-end shrink-0"
        >
          <Plus className="w-4 h-4" />
          Template Voucher Baru
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: "Total Template", value: stats.total, color: "text-[#B48A5E]", bg: "bg-[#B48A5E]/5" },
          { label: "Voucher Aktif", value: stats.active, color: "text-emerald-600", bg: "bg-emerald-50/50" },
          { label: "Total Klaim Pelanggan", value: stats.totalClaims, color: "text-purple-600", bg: "bg-purple-50/50" },
        ].map((s, idx) => (
          <div key={idx} className="bg-white rounded-3xl border border-gray-100 p-6 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
              <h3 className={`text-3xl font-black mt-2 leading-none ${s.color}`}>{s.value}</h3>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${s.bg}`}>
              <Ticket className={`w-6 h-6 ${s.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* List Filters */}
      <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-450" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan kode / judul..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 text-xs focus:outline-none focus:border-[#B48A5E] bg-gray-50/30"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto shrink-0">
          {[
            { id: 'ALL', label: 'Semua Tipe' },
            { id: 'DISCOUNT_RP', label: 'Diskon Nominal' },
            { id: 'DISCOUNT_PCT', label: 'Diskon Persentase' }
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setTypeFilter(opt.id as any)}
              className={`px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                typeFilter === opt.id
                  ? 'bg-[#B48A5E] text-white shadow-md'
                  : 'bg-gray-100 text-gray-650 hover:bg-gray-200/70'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredTemplates.map((t) => (
            <motion.div
              layout
              key={t.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
            >
              {/* Banner image or placeholder */}
              <div className="relative h-40 bg-gray-150 w-full shrink-0 flex items-center justify-center">
                {t.bannerImage ? (
                  <Image 
                    src={t.bannerImage} 
                    alt={t.title} 
                    fill 
                    className="object-cover" 
                    sizes="(max-width: 768px) 100vw, 30vw"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-gray-400">
                    <Ticket className="w-10 h-10 stroke-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">No Banner Image</span>
                  </div>
                )}
                
                {/* Discount Badge */}
                <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/45 backdrop-blur-md text-white font-extrabold text-[10px] tracking-wide uppercase flex items-center gap-1">
                  {t.type === 'DISCOUNT_PCT' ? <Percent className="w-3.5 h-3.5" /> : <DollarSign className="w-3.5 h-3.5" />}
                  <span>
                    {t.type === 'DISCOUNT_PCT' 
                      ? `Potongan ${t.discountValue}%` 
                      : `Potongan ${formatRupiah(t.discountValue)}`}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-amber-800 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">
                      {t.code}
                    </span>
                    <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">
                      Klaim: {t.usageCount}{t.usageLimit > 0 ? ` / ${t.usageLimit}` : ' (∞)'}
                    </span>
                  </div>
                  <h3 className="font-serif font-black text-gray-900 leading-snug">{t.title}</h3>
                  <p className="text-xs text-gray-500 leading-normal line-clamp-2">{t.description}</p>
                </div>

                <div className="space-y-2.5 pt-3 border-t border-gray-50 text-[11px] text-gray-500 font-medium">
                  <div className="flex justify-between">
                    <span>Min. Belanja:</span>
                    <span className="font-bold text-gray-700">{formatRupiah(t.minPurchase)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Produk Valid:</span>
                    <span className="font-bold text-gray-700">
                      {(() => {
                        const parsed = t.validProductIds ? JSON.parse(t.validProductIds) : []
                        return Array.isArray(parsed) && parsed.length > 0 ? `${parsed.length} Item Terdaftar` : "Semua Produk"
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kadaluarsa:</span>
                    <span className="font-bold text-gray-700 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#B48A5E]" />
                      {t.expiresAt ? new Date(t.expiresAt).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) : 'Tanpa Batas'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1.5 shrink-0">
                  <button
                    onClick={() => handleOpenEdit(t)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-2.5 rounded-xl border border-red-100 bg-red-50/50 hover:bg-red-50 text-red-600 transition-colors shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-20 bg-white border border-gray-100 rounded-3xl shadow-sm mt-8 space-y-4">
          <Ticket className="w-12 h-12 text-gray-300 mx-auto stroke-1" />
          <div className="space-y-1">
            <h4 className="font-bold text-gray-800">Tidak Ada Template Voucher</h4>
            <p className="text-xs text-gray-500">Silakan tambahkan template voucher baru untuk memulai.</p>
          </div>
        </div>
      )}

      {/* Form Modal (Create / Edit) */}
      <AnimatePresence>
        {isOpenForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 w-full max-w-2xl h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 shrink-0">
                <h2 className="font-serif font-black text-lg text-gray-900">
                  {editingTemplate ? `Edit Template: ${editingTemplate.code}` : "Template Voucher Baru"}
                </h2>
                <button
                  onClick={() => setIsOpenForm(false)}
                  className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Modal Scrollable Body */}
              <form onSubmit={handleSubmit} noValidate className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* 1. Main Info */}
                <div className="space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400 border-b border-gray-50 pb-2">
                    Informasi Utama
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Kode Voucher *</label>
                      <input
                        type="text"
                        id="code"
                        name="code"
                        value={code}
                        onChange={(e) => { setCode(e.target.value.toUpperCase()); clearError('code') }}
                        placeholder="Contoh: PROMOSEKALI"
                        className={`w-full px-4 py-3 rounded-2xl border text-xs focus:outline-none uppercase font-mono transition-all ${
                          errors.code 
                            ? 'border-red-500 bg-red-50/10 focus:border-red-600 focus:ring-1 focus:ring-red-600' 
                            : 'border-gray-200 focus:border-[#B48A5E]'
                        }`}
                      />
                      {errors.code && (
                        <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          {errors.code}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Judul Voucher *</label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        value={title}
                        onChange={(e) => { setTitle(e.target.value); clearError('title') }}
                        placeholder="Contoh: Diskon Matcha Mantap"
                        className={`w-full px-4 py-3 rounded-2xl border text-xs focus:outline-none transition-all ${
                          errors.title 
                            ? 'border-red-500 bg-red-50/10 focus:border-red-600 focus:ring-1 focus:ring-red-600' 
                            : 'border-gray-200 focus:border-[#B48A5E]'
                        }`}
                      />
                      {errors.title && (
                        <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          {errors.title}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Deskripsi / Peraturan *</label>
                    <textarea
                      id="description"
                      name="description"
                      value={description}
                      onChange={(e) => { setDescription(e.target.value); clearError('description') }}
                      placeholder="Tulis detail syarat, ketentuan, serta produk mana saja yang valid."
                      rows={3}
                      className={`w-full px-4 py-3 rounded-2xl border text-xs focus:outline-none transition-all ${
                        errors.description 
                          ? 'border-red-500 bg-red-50/10 focus:border-red-600 focus:ring-1 focus:ring-red-600' 
                            : 'border-gray-200 focus:border-[#B48A5E]'
                      }`}
                    />
                    {errors.description && (
                      <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {errors.description}
                      </p>
                    )}
                  </div>

                  {/* Banner Upload Card */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Gambar Banner Voucher</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      <div className="md:col-span-2 relative border-2 border-dashed border-gray-250 hover:border-[#B48A5E] rounded-3xl p-5 text-center transition-all bg-gray-50/20 group">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) compressAndUpload(file)
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center gap-1.5 text-gray-400 group-hover:text-[#B48A5E] transition-colors">
                          {isUploading ? (
                            <Loader2 className="w-8 h-8 animate-spin text-[#B48A5E]" />
                          ) : (
                            <Upload className="w-8 h-8 stroke-1" />
                          )}
                          <span className="text-[11px] font-bold uppercase tracking-wider">
                            {isUploading ? "Mengompresi & Mengunggah..." : "Pilih File Gambar Banner"}
                          </span>
                          <span className="text-[9px] text-gray-400">Kompresi WebP otomatis aktif</span>
                        </div>
                      </div>
                      <div className="relative h-28 bg-gray-100 rounded-3xl overflow-hidden flex items-center justify-center border border-gray-100 shadow-inner">
                        {bannerImage ? (
                          <>
                            <Image src={bannerImage} alt="Preview Banner" fill className="object-cover" sizes="200px" />
                            <button
                              type="button"
                              onClick={() => setBannerImage(null)}
                              className="absolute top-1.5 right-1.5 p-1 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black/80 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">No Preview</span>
                        )}
                      </div>
                    </div>
                    {uploadError && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><X className="w-3.5 h-3.5" />{uploadError}</p>}
                  </div>
                </div>

                {/* 2. Values and Spends */}
                <div className="space-y-4 pt-2">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400 border-b border-gray-50 pb-2">
                    Tipe Diskon & Nilai
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tipe Voucher *</label>
                      <select
                        id="type"
                        name="type"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-250 text-xs focus:outline-none focus:border-[#B48A5E] bg-white"
                      >
                        <option value="DISCOUNT_RP">Diskon Nominal (Rp)</option>
                        <option value="DISCOUNT_PCT">Diskon Persentase (%)</option>
                        <option value="FREE_DRINK">Gratis Minuman</option>
                        <option value="FREE_TOPPING">Gratis Topping</option>
                        <option value="UPGRADE_SIZE">Upgrade Size</option>
                        <option value="GRATIS_ONGKIR">Gratis Ongkir</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                        Nilai Potongan {type === 'DISCOUNT_PCT' ? '(%)' : '(Rp)'} *
                      </label>
                      <input
                        type="number"
                        id="discountValue"
                        name="discountValue"
                        min={0}
                        value={discountValue}
                        onChange={(e) => { setDiscountValue(Number(e.target.value)); clearError('discountValue') }}
                        className={`w-full px-4 py-3 rounded-2xl border text-xs focus:outline-none transition-all ${
                          errors.discountValue 
                            ? 'border-red-500 bg-red-50/10 focus:border-red-600 focus:ring-1 focus:ring-red-600' 
                            : 'border-gray-250 focus:border-[#B48A5E]'
                        }`}
                      />
                      {errors.discountValue && (
                        <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          {errors.discountValue}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Minimal Total Belanja (Rp)</label>
                      <input
                        type="number"
                        id="minPurchase"
                        name="minPurchase"
                        min={0}
                        value={minPurchase}
                        onChange={(e) => { setMinPurchase(Number(e.target.value)); clearError('minPurchase') }}
                        className={`w-full px-4 py-3 rounded-2xl border text-xs focus:outline-none transition-all ${
                          errors.minPurchase 
                            ? 'border-red-500 bg-red-50/10 focus:border-red-600 focus:ring-1 focus:ring-red-600' 
                            : 'border-gray-250 focus:border-[#B48A5E]'
                        }`}
                      />
                      {errors.minPurchase && (
                        <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          {errors.minPurchase}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Quota and Expiry */}
                <div className="space-y-4 pt-2">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400 border-b border-gray-50 pb-2">
                    Batasan Kuota & Kadaluarsa
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Kuota Klaim Maksimal (0 = tidak terbatas)</label>
                      <input
                        type="number"
                        id="usageLimit"
                        name="usageLimit"
                        min={0}
                        value={usageLimit}
                        onChange={(e) => { setUsageLimit(Number(e.target.value)); clearError('usageLimit') }}
                        className={`w-full px-4 py-3 rounded-2xl border text-xs focus:outline-none transition-all ${
                          errors.usageLimit 
                            ? 'border-red-500 bg-red-50/10 focus:border-red-600 focus:ring-1 focus:ring-red-600' 
                            : 'border-gray-250 focus:border-[#B48A5E]'
                        }`}
                      />
                      {errors.usageLimit && (
                        <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          {errors.usageLimit}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tanggal Kadaluarsa (opsional)</label>
                      <input
                        type="date"
                        id="expiresAt"
                        name="expiresAt"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-250 text-xs focus:outline-none focus:border-[#B48A5E]"
                      />
                    </div>
                  </div>

                  {/* Terms / S&K */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Syarat & Ketentuan *</label>
                    <textarea
                      id="terms"
                      name="terms"
                      value={terms}
                      onChange={(e) => { setTerms(e.target.value); clearError('terms') }}
                      placeholder="Contoh: Berlaku 1x per pengguna. Tidak bisa digabung dengan promo lain."
                      rows={3}
                      className={`w-full px-4 py-3 rounded-2xl border text-xs focus:outline-none transition-all ${
                        errors.terms 
                          ? 'border-red-500 bg-red-50/10 focus:border-red-600 focus:ring-1 focus:ring-red-600' 
                          : 'border-gray-200 focus:border-[#B48A5E]'
                      }`}
                    />
                    {errors.terms && (
                      <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {errors.terms}
                      </p>
                    )}
                  </div>
                </div>

                {/* 4. Valid Products Selector */}
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400">
                      Produk Valid (Terdaftar)
                    </h3>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                      {selectedProductIds.length === 0 ? "Semua Produk Valid" : `${selectedProductIds.length} Produk Dipilih`}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Cari nama produk / kategori..."
                      className="flex-1 px-4 py-2.5 rounded-xl border border-gray-205 text-xs focus:outline-none focus:border-[#B48A5E]"
                    />
                    {selectedProductIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedProductIds([])}
                        className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 font-bold text-xs hover:bg-red-50 transition-colors"
                      >
                        Kosongkan Seleksi
                      </button>
                    )}
                  </div>

                  {/* Scrollable products check list */}
                  <div className="border border-gray-150 rounded-3xl max-h-56 overflow-y-auto divide-y divide-gray-100 bg-gray-50/10">
                    {filteredProducts.map((prod) => {
                      const isChecked = selectedProductIds.includes(prod.id)
                      return (
                        <div 
                          key={prod.id}
                          onClick={() => toggleProduct(prod.id)}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/40 cursor-pointer transition-colors"
                        >
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                            isChecked 
                              ? 'bg-[#B48A5E] border-[#B48A5E] text-white shadow-sm shadow-[#B48A5E]/20' 
                              : 'border-gray-300 bg-white'
                          }`}>
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-800">{prod.name}</p>
                            {prod.category && (
                              <span className="text-[9px] font-extrabold uppercase text-gray-400 tracking-wider">
                                {prod.category.name}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {filteredProducts.length === 0 && (
                      <div className="p-8 text-center text-xs text-gray-400 font-medium">
                        Tidak ada produk yang cocok dengan pencarian.
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 p-2 bg-amber-500/[0.03] border border-amber-500/10 rounded-2xl">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                      💡 <strong>Catatan:</strong> Jika tidak memilih produk sama sekali, voucher secara otomatis dianggap valid untuk <strong>seluruh menu</strong> di Matchaboy. Jika Anda memilih beberapa produk, potongan harga voucher *hanya memotong* subtotal produk-produk terpilih itu saja saat checkout.
                    </p>
                  </div>
                </div>

                {/* Modal actions */}
                <div className="flex items-center gap-3 pt-6 border-t border-gray-100 shrink-0">
                  <button
                    type="submit"
                    className="flex-1 py-4.5 bg-[#B48A5E] hover:bg-[#946F48] text-white font-bold rounded-2xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#B48A5E]/10"
                  >
                    <span>Simpan Template Voucher</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpenForm(false)}
                    className="px-6 py-4.5 bg-gray-105 hover:bg-gray-150 text-gray-650 font-bold rounded-2xl transition-all text-xs"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saving Loader Overlay Screen */}
      <AnimatePresence>
        {isSaving && (
          <LoadingScreen 
            fullScreen={true}
            customMessages={
              editingTemplate 
                ? [
                    "Menyimpan perubahan voucher...", 
                    "Memperbarui basis data voucher...", 
                    "Menyelaraskan data diskon...", 
                    "Mohon tunggu sebentar..."
                  ]
                : [
                    "Membuat template voucher baru...", 
                    "Mendaftarkan data voucher...", 
                    "Menyelaraskan data diskon...", 
                    "Mohon tunggu sebentar..."
                  ]
            }
          />
        )}
      </AnimatePresence>
    </div>
  )
}
