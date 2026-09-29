'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Ticket, Plus, Edit, Trash2, Search, Calendar, DollarSign, Percent,
  ShoppingBag, Check, X, Upload, Loader2, Info, Eye, EyeOff, AlertCircle,
  Copy, Download, Printer, FileSpreadsheet, Sparkles, Gift, Users,
  CheckCircle2, Clock, Truck, Coffee, ArrowUpCircle, Wand2, ChevronRight, ChevronLeft
} from 'lucide-react'
import { formatRupiah } from '@/lib/utils'
import Image from 'next/image'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import * as XLSX from 'xlsx'

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
  targetNewUserOnly: boolean
  hideFromVoucherPack: boolean
  createdAt: string
  _count?: {
    vouchers: number
  }
}

type VoucherStatusKey = 'ACTIVE' | 'EXPIRED' | 'EXHAUSTED'

function getVoucherStatus(t: VoucherTemplateShape): {
  key: VoucherStatusKey
  label: string
  badgeClass: string
  dotClass: string
} {
  const isExpired = t.expiresAt ? new Date(t.expiresAt).getTime() < Date.now() : false
  if (isExpired) {
    return {
      key: 'EXPIRED',
      label: 'Kedaluwarsa',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      dotClass: 'bg-rose-500'
    }
  }
  const isExhausted = t.usageLimit > 0 && t.usageCount >= t.usageLimit
  if (isExhausted) {
    return {
      key: 'EXHAUSTED',
      label: 'Kuota Habis',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      dotClass: 'bg-amber-500'
    }
  }
  return {
    key: 'ACTIVE',
    label: 'Aktif',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500'
  }
}

function getVoucherTypeMeta(t: { type: string; discountValue: number; maxDiscount?: number | null }) {
  switch (t.type) {
    case 'DISCOUNT_PCT':
      return {
        typeName: 'Diskon Persen',
        badgeText: `Diskon ${t.discountValue}%`,
        benefitSummary: t.maxDiscount
          ? `${t.discountValue}% (Maks. ${formatRupiah(t.maxDiscount)})`
          : `${t.discountValue}% (Tanpa Batas Maks.)`,
        Icon: Percent
      }
    case 'B2G1':
    case 'BUY_X_GET_Y': {
      const buyCount = t.discountValue > 0 ? t.discountValue : 2
      return {
        typeName: 'Beli X Gratis 1',
        badgeText: `Beli ${buyCount} Gratis 1`,
        benefitSummary: t.maxDiscount
          ? `Gratis 1 Cup (Maks. ${formatRupiah(t.maxDiscount)})`
          : 'Gratis 1 Cup Termurah (Penuh)',
        Icon: ShoppingBag
      }
    }
    case 'FREE_DRINK':
      return {
        typeName: 'Gratis Minuman',
        badgeText: 'Gratis Minuman',
        benefitSummary: `Subsidi s/d ${formatRupiah(t.discountValue)}`,
        Icon: Coffee
      }
    case 'FREE_TOPPING':
      return {
        typeName: 'Gratis Topping',
        badgeText: 'Gratis Topping',
        benefitSummary: `Subsidi s/d ${formatRupiah(t.discountValue)}`,
        Icon: Sparkles
      }
    case 'UPGRADE_SIZE':
      return {
        typeName: 'Upgrade Size',
        badgeText: 'Free Upgrade Size',
        benefitSummary: `Nilai Upgrade ${formatRupiah(t.discountValue)}`,
        Icon: ArrowUpCircle
      }
    case 'GRATIS_ONGKIR':
      return {
        typeName: 'Gratis Ongkir',
        badgeText: 'Gratis Ongkir',
        benefitSummary: `Potongan Ongkir ${formatRupiah(t.discountValue)}`,
        Icon: Truck
      }
    case 'DISCOUNT_RP':
    default:
      return {
        typeName: 'Diskon Nominal',
        badgeText: `Hemat ${formatRupiah(t.discountValue)}`,
        benefitSummary: `Potongan ${formatRupiah(t.discountValue)}`,
        Icon: DollarSign
      }
  }
}

export default function VoucherAdminClient({
  initialTemplates,
  products
}: {
  initialTemplates: VoucherTemplateShape[]
  products: ProductSelectOption[]
}) {
  const { showToast } = useToast()
  const [templates, setTemplates] = useState<VoucherTemplateShape[]>(initialTemplates)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    isDestructive?: boolean
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  })
  const [isOpenForm, setIsOpenForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<VoucherTemplateShape | null>(null)

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')

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
  const [targetNewUserOnly, setTargetNewUserOnly] = useState(false)
  const [hideFromVoucherPack, setHideFromVoucherPack] = useState(false)
  const [expiresAt, setExpiresAt] = useState('')
  const [usageLimit, setUsageLimit] = useState(100)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])

  // UI States
  const [formStep, setFormStep] = useState<1 | 2 | 3 | 4>(1)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  // Detail Modal States
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailData, setDetailData] = useState<any | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [historySearchQuery, setHistorySearchQuery] = useState('')
  const [detailTab, setDetailTab] = useState<'info' | 'history'>('info')
  const [copied, setCopied] = useState(false)
  const [copiedCardCode, setCopiedCardCode] = useState<string | null>(null)
  const [detailsCache, setDetailsCache] = useState<Record<string, any>>({})
  const [isMounted, setIsMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'templates' | 'system'>('templates')
  const [systemVouchers, setSystemVouchers] = useState<any[]>([])
  const [loadingSystem, setLoadingSystem] = useState(false)

  const fetchSystemVouchers = async () => {
    setLoadingSystem(true)
    try {
      const res = await fetch('/api/admin/vouchers/system')
      if (res.ok) {
        const data = await res.json()
        setSystemVouchers(data.systemVouchers || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingSystem(false)
    }
  }

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (activeTab === 'system') {
      fetchSystemVouchers()
    }
  }, [activeTab])

  const handleInitSystemVoucher = async (key: string) => {
    try {
      const res = await fetch('/api/admin/vouchers/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      })
      if (res.ok) {
        const data = await res.json()
        showToast(data.message || 'Template berhasil diinisialisasi', 'success')
        if (data.template) {
          setTemplates(prev => {
            const exists = prev.some(t => t.id === data.template.id)
            return exists ? prev : [data.template, ...prev]
          })
        }
        fetchSystemVouchers()
      } else {
        const err = await res.json()
        showToast(err.error || 'Gagal inisialisasi template', 'error')
      }
    } catch {
      showToast('Koneksi gagal', 'error')
    }
  }

  const handleUpdateSystemVoucherCode = async (key: string, newCode: string) => {
    try {
      const res = await fetch('/api/admin/vouchers/system', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, code: newCode })
      })
      if (res.ok) {
        const data = await res.json()
        showToast(data.message || 'Kode voucher sistem diperbarui', 'success')
        fetchSystemVouchers()
      } else {
        const err = await res.json()
        showToast(err.error || 'Gagal memperbarui kode', 'error')
      }
    } catch {
      showToast('Koneksi gagal', 'error')
    }
  }

  const claimUrl = useMemo(() => {
    if (typeof window === 'undefined' || !detailData?.code) return ''
    return `${window.location.origin}/vouchers/claim?code=${detailData.code}`
  }, [detailData?.code])

  const qrImageSrc = useMemo(() => {
    if (!claimUrl) return ''
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(claimUrl)}`
  }, [claimUrl])

  const handleOpenDetail = async (id: string) => {
    setDetailModalOpen(true)
    setDetailTab('info')
    setHistorySearchQuery('')

    if (detailsCache[id]) {
      setDetailData(detailsCache[id])
      setLoadingDetail(false)
      return
    }

    setLoadingDetail(true)
    setDetailData(null)
    try {
      const res = await fetch(`/api/admin/vouchers?id=${id}`)
      if (!res.ok) throw new Error('Gagal mengambil detail voucher')
      const data = await res.json()
      setDetailData(data)
      setDetailsCache(prev => ({ ...prev, [id]: data }))
    } catch (err: any) {
      showToast(err.message || 'Gagal mengambil detail voucher', 'error')
      setDetailModalOpen(false)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleCopyLink = (voucherCode: string) => {
    if (typeof window === 'undefined') return
    const url = `${window.location.origin}/vouchers/claim?code=${voucherCode}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    showToast('Link klaim voucher berhasil disalin', 'success')
  }

  const handleCopyCode = (voucherCode: string) => {
    if (typeof window === 'undefined') return
    navigator.clipboard.writeText(voucherCode)
    setCopiedCardCode(voucherCode)
    setTimeout(() => setCopiedCardCode(null), 1500)
    showToast(`Kode ${voucherCode} disalin`, 'success')
  }

  const handleDownloadQR = async (voucherCode: string) => {
    if (typeof window === 'undefined') return
    const url = `${window.location.origin}/vouchers/claim?code=${voucherCode}`
    try {
      const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(url)}`)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `QR_Voucher_${voucherCode}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)
    } catch (error) {
      showToast('Gagal mengunduh QR Code', 'error')
      console.error(error)
    }
  }

  const handlePrintFlyer = (templateData: any) => {
    if (typeof window === 'undefined') return
    const url = `${window.location.origin}/vouchers/claim?code=${templateData.code}`
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      showToast('Pop-up terblokir oleh browser Anda. Izinkan pop-up untuk mencetak.', 'error')
      return
    }

    let validProductsText = 'Semua Menu Arum Seduh'
    if (templateData.validProductIds) {
      try {
        const parsed = JSON.parse(templateData.validProductIds)
        if (Array.isArray(parsed) && parsed.length > 0) {
          validProductsText = `${parsed.length} Produk Pilihan`
        }
      } catch {}
    }

    const meta = getVoucherTypeMeta(templateData)

    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Flyer Voucher - ${templateData.code}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
            body { font-family: 'Plus Jakarta Sans', sans-serif; text-align: center; padding: 36px; color: #1e293b; background-color: #fff7ed; }
            .container { border: 3px dashed #f97316; padding: 44px 36px; border-radius: 32px; max-width: 480px; margin: 0 auto; background: #ffffff; }
            .logo { font-size: 28px; font-weight: 800; color: #ea580c; margin-bottom: 20px; letter-spacing: -0.5px; }
            .badge { font-size: 12px; font-weight: 800; background: linear-gradient(90deg, #f97316, #f59e0b); color: white; display: inline-block; padding: 8px 18px; border-radius: 999px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.8px; }
            .title { font-size: 24px; font-weight: 800; margin-bottom: 10px; color: #0f172a; line-height: 1.3; }
            .desc { font-size: 14px; color: #64748b; margin-bottom: 24px; line-height: 1.6; max-width: 380px; margin-left: auto; margin-right: auto; }
            .qr { margin: 20px auto; display: block; width: 210px; height: 210px; border: 1px solid #fed7aa; padding: 12px; border-radius: 20px; background: white; }
            .instruction { font-size: 13px; font-weight: 600; color: #475569; margin-top: 12px; }
            .code-box { font-size: 26px; font-weight: 800; background: #fff7ed; border: 2px solid #fed7aa; display: inline-block; padding: 10px 26px; border-radius: 16px; margin: 20px 0; letter-spacing: 1.5px; color: #c2410c; font-family: monospace; }
            .footer-info { font-size: 11px; color: #64748b; margin-top: 28px; border-top: 1px dashed #e2e8f0; padding-top: 18px; text-align: left; }
            .footer-info h4 { margin: 0 0 8px 0; color: #334155; font-size: 12px; }
            .footer-info ul { margin: 0; padding-left: 16px; }
            .footer-info li { margin-bottom: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">Arum Seduh</div>
            <div class="badge">${meta.badgeText}</div>
            <div class="title">${templateData.title}</div>
            <div class="desc">${templateData.description}</div>
            <img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}" alt="QR Code" />
            <div class="instruction">Pindai QR Code untuk klaim voucher</div>
            <div class="code-box">${templateData.code}</div>
            <div class="footer-info">
              <h4>Ketentuan Penggunaan:</h4>
              <ul>
                <li>Minimal belanja: ${formatRupiah(templateData.minPurchase)}</li>
                <li>Berlaku untuk: ${validProductsText}</li>
                ${templateData.maxDiscount ? `<li>Maksimal potongan: ${formatRupiah(templateData.maxDiscount)}</li>` : ''}
                ${(templateData.terms || '').split('\n').filter((t: string) => t.trim().length > 0).map((term: string) => `<li>${term}</li>`).join('')}
              </ul>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.onafterprint = function() { window.close(); };
              }, 500);
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleExportExcel = (templateData: any) => {
    if (!templateData || !templateData.vouchers) return

    const exportData = templateData.vouchers.map((v: any) => ({
      'Nama Pelanggan': v.user?.name || 'Guest',
      'No. WhatsApp': v.user?.phone || '-',
      'Email': v.user?.email || '-',
      'Kode Voucher': v.code,
      'Status': v.isUsed ? 'Terpakai' : 'Belum Dipakai',
      'Tanggal Klaim': new Date(v.createdAt).toLocaleString('id-ID'),
      'Tanggal Pakai': v.usedAt ? new Date(v.usedAt).toLocaleString('id-ID') : '-'
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Klaim')

    ws['!cols'] = [
      { wch: 25 },
      { wch: 18 },
      { wch: 25 },
      { wch: 22 },
      { wch: 15 },
      { wch: 20 },
      { wch: 20 }
    ]

    XLSX.writeFile(wb, `Riwayat_Voucher_${templateData.code}.xlsx`)
    showToast('Berhasil mengekspor data ke Excel', 'success')
  }

  useEffect(() => {
    if (!isOpenForm) {
      setErrors({})
    }
  }, [isOpenForm])

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  // Unified Statistics (no contradiction with card statuses)
  const stats = useMemo(() => {
    const total = templates.length
    const active = templates.filter(t => getVoucherStatus(t).key === 'ACTIVE').length
    const inactive = total - active
    const totalClaims = templates.reduce((sum, t) => sum + (t.usageCount || 0), 0)
    return { total, active, inactive, totalClaims }
  }, [templates])

  // Filtered templates list
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        t.code.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)

      const matchesType =
        typeFilter === 'ALL' ||
        t.type === typeFilter ||
        (typeFilter === 'B2G1' && (t.type === 'B2G1' || t.type === 'BUY_X_GET_Y')) ||
        (typeFilter === 'FREE_ITEM' && ['FREE_DRINK', 'FREE_TOPPING', 'UPGRADE_SIZE', 'GRATIS_ONGKIR'].includes(t.type))

      const statusKey = getVoucherStatus(t).key
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && statusKey === 'ACTIVE') ||
        (statusFilter === 'INACTIVE' && statusKey !== 'ACTIVE')

      return matchesSearch && matchesType && matchesStatus
    })
  }, [templates, searchQuery, typeFilter, statusFilter])

  // Generate non-contradictory Terms & Conditions from current form settings
  const buildGeneratedTerms = () => {
    const lines: string[] = []
    if (minPurchase > 0) {
      lines.push(`Minimum pembelian ${formatRupiah(minPurchase)}.`)
    } else {
      lines.push('Tanpa minimum pembelian.')
    }
    if ((type === 'DISCOUNT_PCT' || type === 'B2G1' || type === 'BUY_X_GET_Y') && maxDiscount && maxDiscount > 0) {
      lines.push(`Maksimal potongan ${formatRupiah(maxDiscount)}.`)
    }
    if (selectedProductIds.length > 0) {
      lines.push(`Berlaku khusus pada ${selectedProductIds.length} menu pilihan.`)
    } else {
      lines.push('Berlaku untuk seluruh menu Arum Seduh.')
    }
    if (targetNewUserOnly) {
      lines.push('Khusus untuk pengguna baru (< 14 hari sejak registrasi).')
    }
    lines.push('Satu voucher hanya dapat digunakan untuk 1 kali transaksi.')
    return lines.join('\n')
  }

  // Client-side WebP/Canvas Compression Helper
  const compressAndUpload = async (file: File) => {
    setIsUploading(true)
    setUploadError('')
    try {
      const image = document.createElement('img')
      const reader = new FileReader()

      const compressedBlob = await new Promise<Blob>((resolve, reject) => {
        reader.onload = (e) => {
          image.src = e.target?.result as string
          image.onload = () => {
            const canvas = document.createElement('canvas')
            let width = image.width
            let height = image.height

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
              if (blob) resolve(blob)
              else reject(new Error('Canvas compression failed'))
            }, 'image/webp', 0.8)
          }
        }
        reader.onerror = () => reject(new Error('File reader failed'))
        reader.readAsDataURL(file)
      })

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
    setDiscountValue(5000)
    setMinPurchase(0)
    setMaxDiscount(null)
    setTerms('')
    setUsageLimit(100)
    setTargetNewUserOnly(false)
    setHideFromVoucherPack(false)

    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    setExpiresAt(nextMonth)
    setSelectedProductIds([])
    setProductSearch('')
    setErrors({})
    setFormStep(1)
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
    setTargetNewUserOnly(t.targetNewUserOnly || false)
    setHideFromVoucherPack(t.hideFromVoucherPack || false)
    setExpiresAt(t.expiresAt ? new Date(t.expiresAt).toISOString().split('T')[0] : '')
    setUsageLimit(t.usageLimit)
    let parsed: string[] = []
    if (t.validProductIds) {
      try {
        const raw = JSON.parse(t.validProductIds)
        if (Array.isArray(raw)) parsed = raw
      } catch {}
    }
    setSelectedProductIds(parsed)
    setProductSearch('')
    setErrors({})
    setFormStep(1)
    setIsOpenForm(true)
  }

  const validateStepFields = (stepToValidate: 1 | 2 | 3 | 4): Record<string, string> => {
    const stepErrors: Record<string, string> = {}
    if (stepToValidate === 1) {
      if (!code.trim()) {
        stepErrors.code = 'Kode voucher wajib diisi.'
      } else if (!/^[A-Z0-9_-]+$/.test(code.trim())) {
        stepErrors.code = 'Hanya boleh huruf kapital, angka, tanda hubung (-), dan garis bawah (_).'
      }
      if (!title.trim()) {
        stepErrors.title = 'Judul voucher wajib diisi.'
      }
      if (!description.trim()) {
        stepErrors.description = 'Deskripsi singkat wajib diisi.'
      }
    } else if (stepToValidate === 2) {
      if (discountValue === undefined || discountValue === null || isNaN(discountValue) || discountValue <= 0) {
        stepErrors.discountValue = (type === 'B2G1' || type === 'BUY_X_GET_Y')
          ? 'Jumlah beli minimal 1 cup (rekomendasi: 2).'
          : 'Nilai harus lebih besar dari 0.'
      } else if (type === 'DISCOUNT_PCT' && discountValue > 100) {
        stepErrors.discountValue = 'Persentase diskon maksimal adalah 100%.'
      }
      if (minPurchase === undefined || minPurchase === null || isNaN(minPurchase) || minPurchase < 0) {
        stepErrors.minPurchase = 'Minimal belanja tidak boleh negatif.'
      }
      if ((type === 'DISCOUNT_PCT' || type === 'B2G1' || type === 'BUY_X_GET_Y') && maxDiscount !== null && (isNaN(maxDiscount) || maxDiscount < 0)) {
        stepErrors.maxDiscount = 'Batas diskon maksimal tidak boleh negatif.'
      }
    } else if (stepToValidate === 3) {
      if (usageLimit === undefined || usageLimit === null || isNaN(usageLimit) || usageLimit < 0) {
        stepErrors.usageLimit = 'Kuota tidak boleh negatif.'
      }
    }
    return stepErrors
  }

  const handleNextStep = () => {
    const stepErrors = validateStepFields(formStep)
    if (Object.keys(stepErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...stepErrors }))
      return
    }
    if (formStep < 4) {
      setFormStep((formStep + 1) as 1 | 2 | 3 | 4)
    }
  }

  const handlePrevStep = () => {
    if (formStep > 1) {
      setFormStep((formStep - 1) as 1 | 2 | 3 | 4)
    }
  }

  const handleJumpToStep = (targetStep: 1 | 2 | 3 | 4) => {
    if (targetStep <= formStep) {
      setFormStep(targetStep)
      return
    }
    // Validate intermediate steps before jumping forward
    for (let s = formStep; s < targetStep; s++) {
      const stepErrors = validateStepFields(s as 1 | 2 | 3 | 4)
      if (Object.keys(stepErrors).length > 0) {
        setErrors(prev => ({ ...prev, ...stepErrors }))
        setFormStep(s as 1 | 2 | 3 | 4)
        return
      }
    }
    setFormStep(targetStep)
  }

  const handleDelete = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Template Voucher',
      message: 'Apakah Anda yakin ingin menghapus template voucher ini? Seluruh voucher pelanggan yang belum digunakan dari template ini juga akan dihapus.',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
        try {
          const res = await fetch(`/api/admin/vouchers?id=${id}`, {
            method: 'DELETE'
          })
          if (res.ok) {
            setTemplates(prev => prev.filter(t => t.id !== id))
            setDetailsCache(prev => {
              const next = { ...prev }
              delete next[id]
              return next
            })
            showToast('Template voucher berhasil dihapus', 'success')
          } else {
            const data = await res.json()
            showToast(data.error || 'Gagal menghapus template', 'error')
          }
        } catch {
          showToast('Koneksi gagal', 'error')
        }
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const s1 = validateStepFields(1)
    const s2 = validateStepFields(2)
    const s3 = validateStepFields(3)
    const newErrors = { ...s1, ...s2, ...s3 }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      if (Object.keys(s1).length > 0) setFormStep(1)
      else if (Object.keys(s2).length > 0) setFormStep(2)
      else if (Object.keys(s3).length > 0) setFormStep(3)
      return
    }

    const finalTerms = terms.trim() || buildGeneratedTerms()

    const payload = {
      code: code.trim().toUpperCase(),
      title: title.trim(),
      description: description.trim(),
      bannerImage,
      type,
      discountValue: Number(discountValue),
      minPurchase: Number(minPurchase),
      maxDiscount: ((type === 'DISCOUNT_PCT' || type === 'B2G1' || type === 'BUY_X_GET_Y') && maxDiscount !== null && maxDiscount > 0) ? Number(maxDiscount) : null,
      terms: finalTerms,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      usageLimit: Number(usageLimit),
      validProductIds: selectedProductIds,
      targetNewUserOnly,
      hideFromVoucherPack
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
        setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? data.template : t))
        // Invalidate detail cache so reopening Detail shows fresh data
        setDetailsCache(prev => {
          const next = { ...prev }
          delete next[editingTemplate.id]
          return next
        })
        if (activeTab === 'system') {
          fetchSystemVouchers()
        }
      } else {
        setTemplates(prev => [data.template, ...prev])
        if (activeTab === 'system') {
          fetchSystemVouchers()
        }
      }
      setIsOpenForm(false)
      showToast(editingTemplate ? 'Voucher berhasil diperbarui' : 'Voucher berhasil dibuat', 'success')
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan voucher', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleProduct = (prodId: string) => {
    setSelectedProductIds(prev =>
      prev.includes(prodId) ? prev.filter(id => id !== prodId) : [...prev, prodId]
    )
  }

  const filteredProducts = useMemo(() => {
    return products.filter(p =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.category?.name || '').toLowerCase().includes(productSearch.toLowerCase())
    )
  }, [products, productSearch])

  const renderSystemIcon = (iconKey: string) => {
    if (iconKey === 'users') return <Users className="w-5 h-5 text-orange-600" />
    if (iconKey === 'sparkles') return <Sparkles className="w-5 h-5 text-amber-600" />
    return <Gift className="w-5 h-5 text-orange-600" />
  }

  return (
    <div className="space-y-5 text-left pb-14">
      {/* Top Action & Navigation Bar (Clean, No Page Headline) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center bg-slate-100/80 p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'templates'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Ticket className={`w-3.5 h-3.5 ${activeTab === 'templates' ? 'text-orange-600' : 'text-slate-400'}`} />
            <span>Template Promo</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
              activeTab === 'templates' ? 'bg-orange-50 text-orange-600' : 'bg-slate-200/70 text-slate-600'
            }`}>
              {templates.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'system'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${activeTab === 'system' ? 'text-orange-600' : 'text-slate-400'}`} />
            <span>Voucher Otomatis (Sistem)</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-sm shadow-orange-500/15 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Voucher Baru</span>
        </button>
      </div>

      {activeTab === 'templates' ? (
        <>
          {/* Compact Statistics Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center justify-between shadow-xs">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Template</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-extrabold text-slate-900">{stats.total}</span>
                  <span className="text-[11px] text-slate-400 font-medium">Terdaftar</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <Ticket className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center justify-between shadow-xs">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status Siap Pakai</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-extrabold text-emerald-600">{stats.active}</span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Aktif {stats.inactive > 0 ? `• ${stats.inactive} Nonaktif` : ''}
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center justify-between shadow-xs">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Diklaim / Terpakai</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-extrabold text-amber-600">{stats.totalClaims}</span>
                  <span className="text-[11px] text-slate-400 font-medium">Klaim Pelanggan</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search & Unified Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-xs flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kode, judul, atau deskripsi voucher..."
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 bg-slate-50/50 text-slate-800 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Type Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0">
                {[
                  { id: 'ALL', label: 'Semua Tipe' },
                  { id: 'DISCOUNT_RP', label: 'Nominal (Rp)' },
                  { id: 'DISCOUNT_PCT', label: 'Persen (%)' },
                  { id: 'B2G1', label: 'Beli X Gratis 1' },
                  { id: 'FREE_ITEM', label: 'Gratis Item / Ongkir' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTypeFilter(opt.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      typeFilter === opt.id
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="h-4 w-px bg-slate-200 hidden sm:block" />

              {/* Status Filter Select */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:border-orange-500 cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value="ACTIVE">Hanya Aktif</option>
                <option value="INACTIVE">Kedaluwarsa / Habis</option>
              </select>
            </div>
          </div>

          {/* Voucher Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredTemplates.map((t) => {
                const status = getVoucherStatus(t)
                const meta = getVoucherTypeMeta(t)
                const TypeIcon = meta.Icon
                const quotaPercent = t.usageLimit > 0 ? Math.min(100, Math.round((t.usageCount / t.usageLimit) * 100)) : 0
                let validProductsLabel = 'Semua Menu'
                if (t.validProductIds) {
                  try {
                    const parsed = JSON.parse(t.validProductIds)
                    if (Array.isArray(parsed) && parsed.length > 0) {
                      validProductsLabel = `${parsed.length} Menu Pilihan`
                    }
                  } catch {}
                }

                return (
                  <motion.div
                    layout
                    key={t.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:shadow-md hover:border-orange-200/80 transition-all overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Top Header / Optional Banner */}
                      {t.bannerImage ? (
                        <div className="relative h-32 w-full bg-slate-100 overflow-hidden">
                          <Image
                            src={t.bannerImage}
                            alt={t.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 33vw"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                            <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white font-bold text-[11px] flex items-center gap-1.5">
                              <TypeIcon className="w-3.5 h-3.5 text-amber-400" />
                              {meta.badgeText}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 bg-white/95 ${status.badgeClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`} />
                              {status.label}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="px-4 pt-4 pb-3 bg-gradient-to-r from-orange-50/70 via-amber-50/40 to-transparent border-b border-slate-100 flex items-center justify-between gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-xs">
                            <TypeIcon className="w-3.5 h-3.5" />
                            {meta.badgeText}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${status.badgeClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`} />
                            {status.label}
                          </span>
                        </div>
                      )}

                      {/* Main Card Content */}
                      <div className="p-4 space-y-3.5">
                        {/* Code + Distribution Tags */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleCopyCode(t.code)}
                            title="Klik untuk salin kode"
                            className="group inline-flex items-center gap-1.5 font-mono text-xs font-extrabold text-orange-700 bg-orange-50 hover:bg-orange-100/80 border border-orange-200/70 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            <span>{t.code}</span>
                            {copiedCardCode === t.code ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-orange-400 group-hover:text-orange-600" />
                            )}
                          </button>

                          <div className="flex items-center gap-1.5">
                            {t.targetNewUserOnly && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 text-[10px] font-bold">
                                Pengguna Baru
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${
                                t.hideFromVoucherPack
                                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                                  : 'bg-sky-50 text-sky-700 border-sky-200/60'
                              }`}
                              title={t.hideFromVoucherPack ? 'Hanya bisa diklaim via Kode/QR atau Sistem' : 'Tampil publik di halaman Voucher Pack'}
                            >
                              {t.hideFromVoucherPack ? (
                                <>
                                  <EyeOff className="w-2.5 h-2.5" />
                                  <span>Kode / QR</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-2.5 h-2.5" />
                                  <span>Publik</span>
                                </>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Title & Short Description */}
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 leading-snug line-clamp-1">{t.title}</h3>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{t.description}</p>
                        </div>

                        {/* Clean Key Parameters Grid (Zero Contradictions) */}
                        <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 text-[11px]">
                          <div className="bg-slate-50/70 rounded-xl p-2.5 border border-slate-100">
                            <span className="text-slate-400 font-medium block text-[10px]">Min. Belanja</span>
                            <span className="font-bold text-slate-800 mt-0.5 block">
                              {t.minPurchase > 0 ? formatRupiah(t.minPurchase) : 'Tanpa Minimum'}
                            </span>
                          </div>
                          <div className="bg-slate-50/70 rounded-xl p-2.5 border border-slate-100">
                            <span className="text-slate-400 font-medium block text-[10px]">Nilai Manfaat</span>
                            <span className="font-bold text-slate-800 mt-0.5 block truncate" title={meta.benefitSummary}>
                              {meta.benefitSummary}
                            </span>
                          </div>
                          <div className="bg-slate-50/70 rounded-xl p-2.5 border border-slate-100">
                            <span className="text-slate-400 font-medium block text-[10px]">Berlaku Untuk</span>
                            <span className="font-bold text-slate-700 mt-0.5 block truncate">{validProductsLabel}</span>
                          </div>
                          <div className="bg-slate-50/70 rounded-xl p-2.5 border border-slate-100">
                            <span className="text-slate-400 font-medium block text-[10px]">Batas Waktu</span>
                            <span className="font-bold text-slate-700 mt-0.5 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-orange-500 shrink-0" />
                              <span className="truncate">
                                {t.expiresAt
                                  ? new Date(t.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                  : 'Selamanya'}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Quota Progress Bar */}
                        <div className="space-y-1 pt-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 font-medium">Kuota Klaim</span>
                            <span className="font-bold text-slate-700">
                              {t.usageCount} {t.usageLimit > 0 ? `/ ${t.usageLimit} (${quotaPercent}%)` : 'diklaim (Tanpa Batas)'}
                            </span>
                          </div>
                          {t.usageLimit > 0 && (
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  quotaPercent >= 100 ? 'bg-amber-500' : 'bg-gradient-to-r from-orange-500 to-amber-500'
                                }`}
                                style={{ width: `${quotaPercent}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="px-4 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(t.id)}
                        className="flex-1 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        title="Lihat Detail, QR Code & Riwayat Klaim"
                      >
                        <Eye className="w-3.5 h-3.5 text-orange-600" />
                        <span>Detail & QR</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(t)}
                        className="flex-1 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5 text-slate-500" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id)}
                        className="p-2 rounded-xl border border-rose-100 bg-rose-50/60 hover:bg-rose-100/70 text-rose-600 transition-colors cursor-pointer"
                        title="Hapus Voucher"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {/* Empty State */}
          {filteredTemplates.length === 0 && (
            <div className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto">
                <Ticket className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-slate-800">Tidak Ada Voucher Ditemukan</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL'
                    ? 'Coba ubah kata kunci pencarian atau reset filter tipe/status di atas.'
                    : 'Belum ada template voucher. Klik tombol Buat Voucher Baru untuk memulai.'}
                </p>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Voucher Otomatis (Sistem) Tab Content */
        <div className="space-y-4">
          <div className="bg-orange-50/70 border border-orange-200/70 p-4 rounded-2xl text-xs text-slate-700 leading-relaxed flex items-start gap-3">
            <Info className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900">Voucher Otomatis Terintegrasi Sistem: </span>
              <span>
                Kelola voucher reward yang otomatis dikirimkan sistem untuk pengguna baru (Welcome), program Ajak Teman (Referral), dan Eco Tumbler.
              </span>
            </div>
          </div>

          {loadingSystem ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              <p className="text-xs text-slate-500 font-bold">Memuat konfigurasi voucher sistem...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {systemVouchers.map((v) => {
                const hasTemplate = v.isCreated && v.template
                const meta = hasTemplate ? getVoucherTypeMeta(v.template) : null

                return (
                  <div
                    key={v.key}
                    className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-5 flex flex-col justify-between gap-5"
                  >
                    <div className="space-y-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                            {renderSystemIcon(v.icon)}
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-slate-900 leading-snug">{v.label}</h3>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{v.key}</p>
                          </div>
                        </div>

                        {hasTemplate ? (
                          <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold shrink-0">
                            Aktif
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold shrink-0">
                            Belum Aktif
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed">{v.description}</p>

                      {hasTemplate && meta ? (
                        <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100 space-y-2 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-medium">Kode Aktif</span>
                            <span className="font-mono font-bold text-orange-700 bg-orange-50 border border-orange-200/60 px-2 py-0.5 rounded text-[11px]">
                              {v.template.code}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-medium">Manfaat</span>
                            <span className="font-bold text-slate-800">{meta.benefitSummary}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-medium">Min. Belanja</span>
                            <span className="font-bold text-slate-700">
                              {v.template.minPurchase > 0 ? formatRupiah(v.template.minPurchase) : 'Tanpa Minimum'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-medium">Total Diterbitkan</span>
                            <span className="font-bold text-slate-700">{v.template._count?.vouchers ?? v.template.usageCount ?? 0}x</span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-amber-50/70 rounded-xl p-3.5 border border-amber-200/60 text-xs text-amber-900 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>Template default belum dibuat. Klik tombol di bawah untuk mengaktifkan otomatis.</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 pt-3 border-t border-slate-100">
                      {hasTemplate ? (
                        <>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(v.template.id)}
                              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                              title="Lihat Detail & QR"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(v.template)}
                              className="flex-1 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Edit Aturan Voucher</span>
                            </button>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Hubungkan ke Template Lain
                            </label>
                            <select
                              value={v.activeCode}
                              onChange={(e) => handleUpdateSystemVoucherCode(v.key, e.target.value)}
                              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-orange-500 cursor-pointer"
                            >
                              {templates.map(t => (
                                <option key={t.id} value={t.code}>{t.code} — {t.title}</option>
                              ))}
                            </select>
                          </div>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleInitSystemVoucher(v.key)}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Aktifkan Template Default</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Detail Voucher Modal */}
      <AnimatePresence>
        {detailModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 shrink-0 gap-3 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center">
                    <Ticket className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-base text-slate-900">
                        {detailData ? detailData.title : 'Memuat Voucher...'}
                      </h2>
                      {detailData && (
                        <span className="font-mono text-xs font-extrabold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">
                          {detailData.code}
                        </span>
                      )}
                    </div>
                    {detailData && (
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        Dibuat {new Date(detailData.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setDetailTab('info')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        detailTab === 'info'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Ringkasan & QR
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailTab('history')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        detailTab === 'history'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Riwayat Klaim ({detailData?.vouchers?.length || 0})
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDetailModalOpen(false)}
                    className="w-9 h-9 rounded-xl hover:bg-slate-200/70 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 min-h-0">
                {loadingDetail ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3 py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    <p className="text-xs text-slate-500 font-bold">Memuat rincian voucher...</p>
                  </div>
                ) : detailData ? (
                  <>
                    {detailTab === 'info' && (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Left Column: Details */}
                        <div className="lg:col-span-7 space-y-5">
                          {detailData.bannerImage && (
                            <div className="relative h-40 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200/80">
                              <Image
                                src={detailData.bannerImage}
                                alt={detailData.title}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 40vw"
                              />
                            </div>
                          )}

                          <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-100 space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Deskripsi Singkat</span>
                            <p className="text-xs text-slate-700 leading-relaxed">{detailData.description}</p>
                          </div>

                          {/* Unified Non-Contradictory Parameter Grid */}
                          {(() => {
                            const meta = getVoucherTypeMeta(detailData)
                            const status = getVoucherStatus(detailData)
                            return (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</span>
                                  <div className="mt-1">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${status.badgeClass}`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`} />
                                      {status.label}
                                    </span>
                                  </div>
                                </div>

                                <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Manfaat Promo</span>
                                  <p className="text-xs font-extrabold text-orange-600 mt-1">{meta.benefitSummary}</p>
                                </div>

                                <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Min. Belanja</span>
                                  <p className="text-xs font-extrabold text-slate-800 mt-1">
                                    {detailData.minPurchase > 0 ? formatRupiah(detailData.minPurchase) : 'Tanpa Minimum'}
                                  </p>
                                </div>

                                <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Kuota & Klaim</span>
                                  <p className="text-xs font-extrabold text-slate-800 mt-1">
                                    {detailData.usageCount} / {detailData.usageLimit > 0 ? detailData.usageLimit : 'Tanpa Batas'}
                                  </p>
                                </div>

                                <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Masa Berlaku</span>
                                  <p className="text-xs font-extrabold text-slate-800 mt-1">
                                    {detailData.expiresAt
                                      ? new Date(detailData.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                      : 'Selamanya'}
                                  </p>
                                </div>

                                <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Distribusi & Target</span>
                                  <p className="text-xs font-bold text-slate-700 mt-1">
                                    {detailData.hideFromVoucherPack ? 'Khusus Kode/QR' : 'Voucher Pack'} • {detailData.targetNewUserOnly ? 'User Baru' : 'Semua User'}
                                  </p>
                                </div>
                              </div>
                            )
                          })()}

                          {/* Applicable Products */}
                          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-2">
                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Menu yang Berlaku
                            </h3>
                            <div className="text-xs text-slate-600 font-medium">
                              {(() => {
                                let parsed: string[] = []
                                if (detailData.validProductIds) {
                                  try {
                                    const raw = JSON.parse(detailData.validProductIds)
                                    if (Array.isArray(raw)) parsed = raw
                                  } catch {}
                                }
                                if (parsed.length > 0) {
                                  const names = parsed.map(id => products.find(p => p.id === id)?.name || id)
                                  return (
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                      {names.map((name, i) => (
                                        <span key={i} className="px-2.5 py-1 bg-orange-50 text-orange-800 border border-orange-200/60 rounded-lg text-[11px] font-semibold">
                                          {name}
                                        </span>
                                      ))}
                                    </div>
                                  )
                                }
                                return <p className="text-slate-700 font-semibold">Berlaku untuk seluruh menu Arum Seduh</p>
                              })()}
                            </div>
                          </div>

                          {/* Terms and Conditions */}
                          {detailData.terms && (
                            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 space-y-2">
                              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Catatan Syarat & Ketentuan</h3>
                              <ul className="list-disc pl-4 space-y-1 text-xs text-slate-600 leading-relaxed">
                                {detailData.terms.split('\n').filter((t: string) => t.trim().length > 0).map((term: string, idx: number) => (
                                  <li key={idx}>{term}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Right Column: QR Code Claim Card */}
                        <div className="lg:col-span-5">
                          <div className="bg-slate-50/70 border border-slate-200/80 p-5 rounded-2xl flex flex-col items-center text-center space-y-4">
                            <div>
                              <h3 className="font-bold text-slate-900 text-xs">QR Code Klaim Instan</h3>
                              <p className="text-[11px] text-slate-500 mt-0.5 max-w-[230px] mx-auto">
                                Pindai dengan kamera HP pelanggan untuk langsung mengklaim voucher ini.
                              </p>
                            </div>

                            <div className="relative w-44 h-44 border border-slate-200 p-2.5 rounded-2xl bg-white shadow-xs flex items-center justify-center">
                              {isMounted && qrImageSrc ? (
                                <img
                                  src={qrImageSrc}
                                  alt="Claim QR Code"
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <div className="flex flex-col items-center justify-center gap-1">
                                  <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                                  <span className="text-[10px] text-slate-400">Memuat QR...</span>
                                </div>
                              )}
                            </div>

                            <div className="w-full space-y-2">
                              <button
                                type="button"
                                onClick={() => handleCopyLink(detailData.code)}
                                className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                              >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                <span>{copied ? 'Link Klaim Disalin!' : 'Salin Link Klaim'}</span>
                              </button>

                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleDownloadQR(detailData.code)}
                                  className="py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Unduh QR</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePrintFlyer(detailData)}
                                  className="py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>Cetak Flyer</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: CLAIM & USAGE HISTORY */}
                    {detailTab === 'history' && (
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                          <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type="text"
                              value={historySearchQuery}
                              onChange={(e) => setHistorySearchQuery(e.target.value)}
                              placeholder="Cari nama, no. WA, atau kode..."
                              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleExportExcel(detailData)}
                            disabled={!detailData.vouchers || detailData.vouchers.length === 0}
                            className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                            <span>Ekspor Excel (.xlsx)</span>
                          </button>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left text-xs text-slate-600">
                              <thead className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                                <tr>
                                  <th className="px-5 py-3.5">Pelanggan</th>
                                  <th className="px-5 py-3.5">No. WhatsApp</th>
                                  <th className="px-5 py-3.5">Kode Voucher</th>
                                  <th className="px-5 py-3.5">Status</th>
                                  <th className="px-5 py-3.5">Tgl Klaim</th>
                                  <th className="px-5 py-3.5">Tgl Pakai</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium">
                                {(() => {
                                  const filtered = (detailData.vouchers || []).filter((v: any) => {
                                    const q = historySearchQuery.toLowerCase()
                                    return (
                                      (v.user?.name || '').toLowerCase().includes(q) ||
                                      (v.user?.phone || '').toLowerCase().includes(q) ||
                                      (v.code || '').toLowerCase().includes(q)
                                    )
                                  })

                                  if (filtered.length === 0) {
                                    return (
                                      <tr>
                                        <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                                          {historySearchQuery ? 'Tidak ada data yang cocok dengan pencarian.' : 'Belum ada pelanggan yang mengklaim voucher ini.'}
                                        </td>
                                      </tr>
                                    )
                                  }

                                  return filtered.map((v: any) => (
                                    <tr key={v.id} className="hover:bg-slate-50/60">
                                      <td className="px-5 py-3.5 font-bold text-slate-900">{v.user?.name || 'Guest'}</td>
                                      <td className="px-5 py-3.5 font-mono">{v.user?.phone || '-'}</td>
                                      <td className="px-5 py-3.5 font-mono text-orange-700 font-semibold">{v.code}</td>
                                      <td className="px-5 py-3.5">
                                        {v.isUsed ? (
                                          <span className="inline-flex items-center px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold">
                                            Terpakai
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold">
                                            Belum Dipakai
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-5 py-3.5 text-slate-500">
                                        {new Date(v.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                      </td>
                                      <td className="px-5 py-3.5">
                                        {v.usedAt ? (
                                          <span className="text-slate-800 font-bold">
                                            {new Date(v.usedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                          </span>
                                        ) : (
                                          <span className="text-slate-300">-</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-2 py-16 text-center">
                    <AlertCircle className="w-8 h-8 text-rose-500" />
                    <p className="text-xs text-slate-500 font-bold">Detail data tidak tersedia.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form Modal (Create / Edit) — Modern 4-Step Progress Wizard */}
      <AnimatePresence>
        {isOpenForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Modal Top Header */}
              <div className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0 bg-gradient-to-b from-orange-50/40 to-white space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-xs shadow-orange-500/20">
                      <Ticket className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="font-bold text-base text-slate-900 leading-tight">
                        {editingTemplate ? `Edit Voucher: ${editingTemplate.code}` : 'Buat Voucher Baru'}
                      </h2>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Langkah {formStep} dari 4 —{' '}
                        {formStep === 1
                          ? 'Identitas & Tampilan Voucher'
                          : formStep === 2
                          ? 'Skema Potongan & Minimum Belanja'
                          : formStep === 3
                          ? 'Kuota, Masa Berlaku & Distribusi'
                          : 'Menu Berlaku & Finalisasi'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpenForm(false)}
                    className="w-8 h-8 rounded-xl hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>

                {/* Interactive Stepper Pills + Progress Bar */}
                <div className="space-y-2.5">
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { step: 1 as const, title: 'Identitas', sub: 'Kode & Judul' },
                      { step: 2 as const, title: 'Skema Promo', sub: 'Tipe & Nilai' },
                      { step: 3 as const, title: 'Kuota & Akses', sub: 'Batas & Target' },
                      { step: 4 as const, title: 'Finalisasi', sub: 'Menu & S&K' }
                    ].map((s) => {
                      const isCurrent = formStep === s.step
                      const isDone = formStep > s.step
                      return (
                        <button
                          key={s.step}
                          type="button"
                          onClick={() => handleJumpToStep(s.step)}
                          className={`group flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-orange-50/90 border-orange-300 shadow-2xs'
                              : isDone
                              ? 'bg-emerald-50/40 border-emerald-200/70 hover:bg-emerald-50/80'
                              : 'bg-slate-50/70 border-slate-200/70 hover:bg-slate-100/70'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-lg text-[11px] font-extrabold flex items-center justify-center shrink-0 transition-all ${
                              isCurrent
                                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                                : isDone
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-200/80 text-slate-500'
                            }`}
                          >
                            {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.step}
                          </div>
                          <div className="min-w-0">
                            <p
                              className={`text-[11px] font-bold truncate leading-tight ${
                                isCurrent ? 'text-orange-950' : isDone ? 'text-emerald-900' : 'text-slate-600'
                              }`}
                            >
                              {s.title}
                            </p>
                            <p className="text-[9px] text-slate-400 truncate hidden sm:block">{s.sub}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Smooth Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                      initial={false}
                      animate={{ width: `${(formStep / 4) * 100}%` }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Body — Single Active Step */}
              <form onSubmit={handleSubmit} noValidate className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto p-6">
                  <AnimatePresence mode="wait">
                    {/* STEP 1: IDENTITAS VOUCHER & BANNER */}
                    {formStep === 1 && (
                      <motion.div
                        key="step-1"
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{ duration: 0.18 }}
                        className="space-y-5"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-xs font-bold text-slate-700">Kode Voucher *</label>
                              <button
                                type="button"
                                onClick={() => {
                                  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
                                  setCode(`ARUM${randomSuffix}`)
                                  clearError('code')
                                }}
                                className="text-[10px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
                              >
                                <Wand2 className="w-3 h-3" />
                                <span>Buat Kode Unik</span>
                              </button>
                            </div>
                            <input
                              type="text"
                              id="code"
                              name="code"
                              value={code}
                              onChange={(e) => { setCode(e.target.value.toUpperCase()); clearError('code') }}
                              placeholder="Contoh: HEMAT10K"
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none uppercase font-mono font-bold transition-all ${
                                errors.code
                                  ? 'border-rose-500 bg-rose-50/20 focus:border-rose-600'
                                  : 'border-slate-200 focus:border-orange-500 bg-slate-50/40 focus:bg-white'
                              }`}
                            />
                            {errors.code ? (
                              <p className="text-rose-600 text-[11px] mt-1 flex items-center gap-1 font-medium">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                {errors.code}
                              </p>
                            ) : (
                              <p className="text-[10px] text-slate-400 mt-1">Gunakan huruf kapital & angka tanpa spasi.</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Judul Promo *</label>
                            <input
                              type="text"
                              id="title"
                              name="title"
                              value={title}
                              onChange={(e) => { setTitle(e.target.value); clearError('title') }}
                              placeholder="Contoh: Diskon Spesial Arum Seduh"
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-all ${
                                errors.title
                                  ? 'border-rose-500 bg-rose-50/20 focus:border-rose-600'
                                  : 'border-slate-200 focus:border-orange-500 bg-slate-50/40 focus:bg-white'
                              }`}
                            />
                            {errors.title ? (
                              <p className="text-rose-600 text-[11px] mt-1 flex items-center gap-1 font-medium">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                {errors.title}
                              </p>
                            ) : (
                              <p className="text-[10px] text-slate-400 mt-1">Nama promo yang dilihat oleh pelanggan.</p>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">Deskripsi Singkat *</label>
                          <textarea
                            id="description"
                            name="description"
                            rows={2}
                            value={description}
                            onChange={(e) => { setDescription(e.target.value); clearError('description') }}
                            placeholder="Contoh: Potongan langsung untuk pembelian menu minuman favoritmu di Arum Seduh."
                            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-all ${
                              errors.description
                                ? 'border-rose-500 bg-rose-50/20 focus:border-rose-600'
                                : 'border-slate-200 focus:border-orange-500 bg-slate-50/40 focus:bg-white'
                            }`}
                          />
                          {errors.description && (
                            <p className="text-rose-600 text-[11px] mt-1 flex items-center gap-1 font-medium">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              {errors.description}
                            </p>
                          )}
                        </div>

                        {/* Optional Banner Image Upload */}
                        <div className="pt-1">
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Banner Visual Voucher <span className="text-slate-400 font-normal">(Opsional)</span>
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                            <div className="sm:col-span-2 relative border border-dashed border-slate-300 hover:border-orange-400 rounded-2xl p-4 text-center transition-all bg-slate-50/50 group">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) compressAndUpload(file)
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                              <div className="flex flex-col items-center justify-center gap-1 text-slate-500 group-hover:text-orange-600 transition-colors">
                                {isUploading ? (
                                  <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                                ) : (
                                  <Upload className="w-5 h-5" />
                                )}
                                <span className="text-xs font-bold">
                                  {isUploading ? 'Mengunggah & Kompresi WebP...' : 'Klik untuk Unggah Banner'}
                                </span>
                                <span className="text-[10px] text-slate-400">Otomatis dikompresi ke format WebP</span>
                              </div>
                            </div>
                            <div className="relative h-20 bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-200">
                              {bannerImage ? (
                                <>
                                  <Image src={bannerImage} alt="Preview Banner" fill className="object-cover" sizes="180px" />
                                  <button
                                    type="button"
                                    onClick={() => setBannerImage(null)}
                                    className="absolute top-1.5 right-1.5 p-1 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-semibold">Tanpa Banner</span>
                              )}
                            </div>
                          </div>
                          {uploadError && (
                            <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              {uploadError}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* STEP 2: SKEMA POTONGAN & MINIMUM BELANJA */}
                    {formStep === 2 && (
                      <motion.div
                        key="step-2"
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{ duration: 0.18 }}
                        className="space-y-5"
                      >
                        {/* Visual Promo Type Picker */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-2">Pilih Tipe Promo *</label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-2.5">
                            {[
                              { id: 'DISCOUNT_RP', label: 'Nominal (Rp)', desc: 'Potongan langsung', Icon: DollarSign },
                              { id: 'DISCOUNT_PCT', label: 'Persentase (%)', desc: 'Diskon persen', Icon: Percent },
                              { id: 'B2G1', label: 'Beli X Gratis 1', desc: 'Gratis 1 cup', Icon: ShoppingBag },
                              { id: 'FREE_DRINK', label: 'Reward / Gratis', desc: 'Minuman/Ongkir/Size', Icon: Gift }
                            ].map((card) => {
                              const isRewardGroup = ['FREE_DRINK', 'FREE_TOPPING', 'UPGRADE_SIZE', 'GRATIS_ONGKIR'].includes(type)
                              const active = card.id === 'FREE_DRINK' ? isRewardGroup : type === card.id || (card.id === 'B2G1' && type === 'BUY_X_GET_Y')
                              const CardIcon = card.Icon
                              return (
                                <button
                                  key={card.id}
                                  type="button"
                                  onClick={() => {
                                    setType(card.id)
                                    if (card.id === 'B2G1') setDiscountValue(2)
                                    else if (card.id === 'DISCOUNT_PCT' && discountValue > 100) setDiscountValue(10)
                                    else if (card.id === 'DISCOUNT_RP' && discountValue <= 100) setDiscountValue(5000)
                                  }}
                                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                                    active
                                      ? 'bg-orange-50/80 border-orange-400 shadow-xs'
                                      : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/70'
                                  }`}
                                >
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                    active ? 'bg-orange-500 text-white' : 'bg-white text-slate-500 border border-slate-200'
                                  }`}>
                                    <CardIcon className="w-3.5 h-3.5" />
                                  </div>
                                  <div>
                                    <p className={`text-xs font-bold leading-tight ${active ? 'text-orange-950' : 'text-slate-800'}`}>
                                      {card.label}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{card.desc}</p>
                                  </div>
                                </button>
                              )
                            })}
                          </div>

                          {/* Sub-selector when Reward / Gratis is active, plus full select for accessibility */}
                          {['FREE_DRINK', 'FREE_TOPPING', 'UPGRADE_SIZE', 'GRATIS_ONGKIR'].includes(type) && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {[
                                { id: 'FREE_DRINK', label: 'Gratis Minuman' },
                                { id: 'FREE_TOPPING', label: 'Gratis Topping' },
                                { id: 'UPGRADE_SIZE', label: 'Free Upgrade Size' },
                                { id: 'GRATIS_ONGKIR', label: 'Gratis Ongkir' }
                              ].map((sub) => (
                                <button
                                  key={sub.id}
                                  type="button"
                                  onClick={() => setType(sub.id)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    type === sub.id
                                      ? 'bg-orange-500 text-white border-orange-500'
                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  {sub.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Value & Spend Inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              {type === 'DISCOUNT_PCT'
                                ? 'Besaran Diskon (%) *'
                                : type === 'B2G1' || type === 'BUY_X_GET_Y'
                                ? 'Jumlah Cup Berbayar (X) *'
                                : ['FREE_DRINK', 'FREE_TOPPING', 'UPGRADE_SIZE', 'GRATIS_ONGKIR'].includes(type)
                                ? 'Batas Nilai Subsidi / Gratis (Rp) *'
                                : 'Nominal Potongan (Rp) *'}
                            </label>
                            <input
                              type="number"
                              id="discountValue"
                              name="discountValue"
                              min={0}
                              value={discountValue}
                              onChange={(e) => { setDiscountValue(Number(e.target.value)); clearError('discountValue') }}
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold focus:outline-none transition-all ${
                                errors.discountValue
                                  ? 'border-rose-500 bg-rose-50/20 focus:border-rose-600'
                                  : 'border-slate-200 focus:border-orange-500'
                              }`}
                            />
                            {errors.discountValue && (
                              <p className="text-rose-600 text-[11px] mt-1 flex items-center gap-1 font-medium">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                {errors.discountValue}
                              </p>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-xs font-bold text-slate-700">Minimal Belanja (Rp)</label>
                              <div className="flex items-center gap-1">
                                {[0, 20000, 35000, 50000].map((preset) => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => { setMinPurchase(preset); clearError('minPurchase') }}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                      minPurchase === preset
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                  >
                                    {preset === 0 ? '0' : `${preset / 1000}rb`}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <input
                              type="number"
                              id="minPurchase"
                              name="minPurchase"
                              min={0}
                              value={minPurchase}
                              onChange={(e) => { setMinPurchase(Number(e.target.value)); clearError('minPurchase') }}
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-all ${
                                errors.minPurchase
                                  ? 'border-rose-500 bg-rose-50/20 focus:border-rose-600'
                                  : 'border-slate-200 focus:border-orange-500'
                              }`}
                            />
                            {errors.minPurchase && (
                              <p className="text-rose-600 text-[11px] mt-1 flex items-center gap-1 font-medium">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                {errors.minPurchase}
                              </p>
                            )}
                          </div>
                        </div>

                        {(type === 'DISCOUNT_PCT' || type === 'B2G1' || type === 'BUY_X_GET_Y') && (
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              {type === 'DISCOUNT_PCT' ? 'Batas Maksimal Potongan (Rp) — Opsional' : 'Batas Harga Cup Gratis (Rp) — Opsional'}
                            </label>
                            <input
                              type="number"
                              id="maxDiscount"
                              name="maxDiscount"
                              min={0}
                              value={maxDiscount !== null ? maxDiscount : ''}
                              onChange={(e) => {
                                const val = e.target.value
                                setMaxDiscount(val === '' ? null : Number(val))
                                clearError('maxDiscount')
                              }}
                              placeholder="Kosongkan jika tanpa batas maksimal"
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-all ${
                                errors.maxDiscount
                                  ? 'border-rose-500 bg-rose-50/20 focus:border-rose-600'
                                  : 'border-slate-200 focus:border-orange-500'
                              }`}
                            />
                            {errors.maxDiscount && (
                              <p className="text-rose-600 text-[11px] mt-1 flex items-center gap-1 font-medium">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                {errors.maxDiscount}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Live Benefit Preview Box */}
                        {(() => {
                          const previewMeta = getVoucherTypeMeta({ type, discountValue, maxDiscount })
                          return (
                            <div className="bg-gradient-to-r from-orange-50/90 to-amber-50/60 border border-orange-200/80 rounded-2xl p-4 flex items-center justify-between gap-3">
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 block">
                                  Simulasi Manfaat Pelanggan
                                </span>
                                <p className="text-xs font-bold text-slate-900">
                                  {previewMeta.benefitSummary} • {minPurchase > 0 ? `Min. belanja ${formatRupiah(minPurchase)}` : 'Tanpa minimum belanja'}
                                </p>
                              </div>
                              <span className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-extrabold text-xs shrink-0 shadow-xs">
                                {previewMeta.badgeText}
                              </span>
                            </div>
                          )
                        })()}
                      </motion.div>
                    )}

                    {/* STEP 3: KUOTA, MASA BERLAKU & DISTRIBUSI */}
                    {formStep === 3 && (
                      <motion.div
                        key="step-3"
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{ duration: 0.18 }}
                        className="space-y-5"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-xs font-bold text-slate-700">Kuota Klaim Maksimal</label>
                              <div className="flex items-center gap-1">
                                {[0, 50, 100, 250].map((qPreset) => (
                                  <button
                                    key={qPreset}
                                    type="button"
                                    onClick={() => { setUsageLimit(qPreset); clearError('usageLimit') }}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                      usageLimit === qPreset
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                  >
                                    {qPreset === 0 ? 'Tanpa Batas' : qPreset}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <input
                              type="number"
                              id="usageLimit"
                              name="usageLimit"
                              min={0}
                              value={usageLimit}
                              onChange={(e) => { setUsageLimit(Number(e.target.value)); clearError('usageLimit') }}
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold focus:outline-none transition-all ${
                                errors.usageLimit
                                  ? 'border-rose-500 bg-rose-50/20 focus:border-rose-600'
                                  : 'border-slate-200 focus:border-orange-500'
                              }`}
                            />
                            <p className="text-[10px] text-slate-400 mt-1">Isi 0 jika kuota klaim tidak dibatasi.</p>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-xs font-bold text-slate-700">Batas Tanggal Berlaku</label>
                              <div className="flex items-center gap-1">
                                {[
                                  { label: '+7 Hari', days: 7 },
                                  { label: '+30 Hari', days: 30 },
                                  { label: 'Selamanya', days: 0 }
                                ].map((dPreset) => (
                                  <button
                                    key={dPreset.label}
                                    type="button"
                                    onClick={() => {
                                      if (dPreset.days === 0) setExpiresAt('')
                                      else {
                                        const dt = new Date(Date.now() + dPreset.days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                                        setExpiresAt(dt)
                                      }
                                    }}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-orange-600 cursor-pointer transition-colors"
                                  >
                                    {dPreset.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <input
                              type="date"
                              id="expiresAt"
                              name="expiresAt"
                              value={expiresAt}
                              onChange={(e) => setExpiresAt(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-orange-500"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">
                              {expiresAt ? `Berlaku hingga ${new Date(expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Aktif selamanya tanpa tanggal kedaluwarsa'}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2.5 pt-1">
                          <label className="block text-xs font-bold text-slate-700">Pengaturan Visibilitas & Target Pelanggan</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setHideFromVoucherPack(!hideFromVoucherPack)}
                              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                                !hideFromVoucherPack
                                  ? 'bg-orange-50/70 border-orange-300 shadow-2xs'
                                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100/60'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-md mt-0.5 flex items-center justify-center border shrink-0 ${
                                !hideFromVoucherPack ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-slate-300'
                              }`}>
                                {!hideFromVoucherPack && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900">Tampilkan di Voucher Pack</p>
                                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                  {!hideFromVoucherPack
                                    ? 'Publik — pelanggan dapat melihat & klaim langsung di aplikasi.'
                                    : 'Privat — tersembunyi dari daftar, hanya bisa diklaim via Kode/QR.'}
                                </p>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setTargetNewUserOnly(!targetNewUserOnly)}
                              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                                targetNewUserOnly
                                  ? 'bg-orange-50/70 border-orange-300 shadow-2xs'
                                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100/60'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-md mt-0.5 flex items-center justify-center border shrink-0 ${
                                targetNewUserOnly ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-slate-300'
                              }`}>
                                {targetNewUserOnly && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900">Khusus Pengguna Baru</p>
                                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                  {targetNewUserOnly
                                    ? 'Hanya untuk pelanggan baru yang mendaftar kurang dari 14 hari.'
                                    : 'Berlaku untuk seluruh pelanggan (pelanggan lama maupun baru).'}
                                </p>
                              </div>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* STEP 4: MENU BERLAKU & SYARAT KETENTUAN (FINALISASI) */}
                    {formStep === 4 && (
                      <motion.div
                        key="step-4"
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{ duration: 0.18 }}
                        className="space-y-4"
                      >
                        {/* Product Filter */}
                        <div className="space-y-2.5">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-700">
                              Batasi pada Menu Tertentu <span className="text-slate-400 font-normal">(Opsional)</span>
                            </label>
                            <span className="text-[11px] font-bold text-orange-700 bg-orange-50 border border-orange-200/60 px-2.5 py-0.5 rounded-md">
                              {selectedProductIds.length === 0 ? 'Semua Menu Berlaku' : `${selectedProductIds.length} Menu Dipilih`}
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                              <input
                                type="text"
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                placeholder="Cari menu jika voucher hanya berlaku untuk produk tertentu..."
                                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-orange-500"
                              />
                            </div>
                            {selectedProductIds.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setSelectedProductIds([])}
                                className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 font-bold text-xs hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                Reset ({selectedProductIds.length})
                              </button>
                            )}
                          </div>

                          <div className="border border-slate-200 rounded-2xl max-h-36 overflow-y-auto divide-y divide-slate-100 bg-slate-50/30">
                            {filteredProducts.map((prod) => {
                              const isChecked = selectedProductIds.includes(prod.id)
                              return (
                                <div
                                  key={prod.id}
                                  onClick={() => toggleProduct(prod.id)}
                                  className="flex items-center gap-3 px-3.5 py-2 hover:bg-white cursor-pointer transition-colors"
                                >
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                    isChecked
                                      ? 'bg-orange-500 border-orange-500 text-white'
                                      : 'border-slate-300 bg-white'
                                  }`}>
                                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                  <div className="flex items-center justify-between flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-800 truncate">{prod.name}</p>
                                    {prod.category && (
                                      <span className="text-[10px] font-bold text-slate-400 ml-2 shrink-0">
                                        {prod.category.name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}

                            {filteredProducts.length === 0 && (
                              <div className="p-4 text-center text-xs text-slate-400">
                                Tidak ada menu yang cocok dengan pencarian.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* S&K with Auto-Sync Button */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-slate-700">
                              Syarat & Ketentuan <span className="text-slate-400 font-normal">(Otomatis dibuat jika kosong)</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => setTerms(buildGeneratedTerms())}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
                            >
                              <Wand2 className="w-3 h-3" />
                              <span>Susun Otomatis sesuai Pengaturan</span>
                            </button>
                          </div>
                          <textarea
                            id="terms"
                            name="terms"
                            value={terms}
                            onChange={(e) => { setTerms(e.target.value); clearError('terms') }}
                            placeholder="Kosongkan untuk membuat S&K otomatis yang sinkron dengan pengaturan Anda, atau tambahkan catatan khusus..."
                            rows={2}
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-orange-500 transition-all"
                          />
                        </div>

                        {/* Final Review Strip */}
                        {(() => {
                          const reviewMeta = getVoucherTypeMeta({ type, discountValue, maxDiscount })
                          return (
                            <div className="bg-orange-50/70 border border-orange-200/80 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono font-extrabold text-orange-700 bg-white border border-orange-200 px-2.5 py-1 rounded-lg">
                                  {code || 'KODE'}
                                </span>
                                <div>
                                  <p className="font-bold text-slate-900">{title || 'Judul Voucher'}</p>
                                  <p className="text-[11px] text-slate-600">
                                    {reviewMeta.benefitSummary} • {minPurchase > 0 ? `Min. ${formatRupiah(minPurchase)}` : 'Tanpa Min.'} • Kuota: {usageLimit > 0 ? usageLimit : 'Tanpa Batas'}
                                  </p>
                                </div>
                              </div>
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                Siap Disimpan
                              </span>
                            </div>
                          )
                        })()}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Pinned Wizard Footer Actions */}
                <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
                  <div>
                    {formStep === 1 ? (
                      <button
                        type="button"
                        onClick={() => setIsOpenForm(false)}
                        className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-all text-xs cursor-pointer"
                      >
                        Batal
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handlePrevStep}
                        className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-all text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Sebelumnya</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {editingTemplate && formStep < 4 && (
                      <button
                        type="submit"
                        className="px-4 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 font-bold rounded-xl transition-all text-xs cursor-pointer"
                      >
                        Simpan Langsung
                      </button>
                    )}

                    {formStep < 4 ? (
                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl transition-all text-xs shadow-sm shadow-orange-500/20 flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Selanjutnya</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl transition-all text-xs shadow-sm shadow-orange-500/20 flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{editingTemplate ? 'Simpan Perubahan' : 'Buat Voucher Sekarang'}</span>
                      </button>
                    )}
                  </div>
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
                    'Menyimpan perubahan voucher...',
                    'Memperbarui basis data voucher...',
                    'Menyelaraskan data diskon...',
                    'Mohon tunggu sebentar...'
                  ]
                : [
                    'Membuat template voucher baru...',
                    'Mendaftarkan data voucher...',
                    'Menyelaraskan data diskon...',
                    'Mohon tunggu sebentar...'
                  ]
            }
          />
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
