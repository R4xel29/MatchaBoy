import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import ClaimVoucherClient from "./ClaimVoucherClient"

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ code?: string }>
}

export default async function VoucherClaimPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const code = resolvedSearchParams.code

  if (!code) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-md border border-gray-100 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-xl">
            ⚠️
          </div>
          <h2 className="font-serif font-black text-gray-900 text-lg">Kode Voucher Diperlukan</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            Tidak ada kode voucher yang terdeteksi di link klaim Anda. Mohon pastikan link yang Anda buka sudah benar.
          </p>
          <a
            href="/"
            className="block w-full py-3 bg-[#B48A5E] hover:bg-[#946F48] text-white font-bold text-xs rounded-xl transition-colors text-center"
          >
            Kembali ke Beranda
          </a>
        </div>
      </div>
    )
  }

  const cleanCode = code.toUpperCase().trim()

  // Fetch the voucher template
  const template = await prisma.voucherTemplate.findUnique({
    where: { code: cleanCode }
  })

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-md border border-gray-100 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto text-xl font-bold">
            ✕
          </div>
          <h2 className="font-serif font-black text-gray-900 text-lg">Voucher Tidak Valid</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            Maaf, template voucher dengan kode <strong className="font-bold text-gray-700">"{cleanCode}"</strong> tidak ditemukan atau sudah tidak aktif.
          </p>
          <a
            href="/"
            className="block w-full py-3 bg-[#B48A5E] hover:bg-[#946F48] text-white font-bold text-xs rounded-xl transition-colors text-center"
          >
            Kembali ke Beranda
          </a>
        </div>
      </div>
    )
  }

  // Fetch all products to match against applicable voucher product IDs
  const dbProducts = await prisma.product.findMany({
    orderBy: { name: 'asc' }
  })

  // Parse valid product IDs from template
  let validProductIds: string[] | null = null
  if (template.validProductIds) {
    try {
      const parsed = JSON.parse(template.validProductIds)
      if (Array.isArray(parsed)) {
        validProductIds = parsed
      }
    } catch (e) {
      console.error("Error parsing validProductIds JSON", e)
    }
  }

  // Filter products that are valid for this voucher
  const validProducts = dbProducts.filter(p => {
    if (!validProductIds) return true
    return validProductIds.includes(p.id)
  }).map((p: any) => ({
    id: p.id,
    name: p.name,
    price: p.price
  }))

  return (
    <ClaimVoucherClient 
      template={JSON.parse(JSON.stringify(template))}
      validProducts={validProducts}
    />
  )
}
