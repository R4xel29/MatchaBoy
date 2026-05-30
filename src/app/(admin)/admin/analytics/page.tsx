'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { 
    TrendingUp, ShoppingBag, DollarSign, Users, 
    ArrowUpRight, ArrowDownRight, RefreshCw, Calendar, 
    ChevronLeft, BarChart2, PieChart, Layers
} from 'lucide-react'
import { formatRupiah } from '@/lib/utils'

type Range = 'today' | 'week' | 'month' | 'all'

const RANGE_LABELS: Record<Range, string> = {
    today: 'Hari Ini',
    week: 'Minggu Ini',
    month: 'Bulan Ini',
    all: 'Semua Waktu',
}

interface AnalyticsData {
    kpis: {
        totalRevenue: number
        totalOrders: number
        avgOrderValue: number
        totalCustomers: number
        growth: number
    }
    statusDistribution: {
        PENDING: number
        PREPARING: number
        READY: number
        COMPLETED: number
        CANCELLED: number
    }
    categoryRevenue: Array<{
        name: string
        value: number
        percentage: number
    }>
    recentMonthlySales: Array<{
        month: string
        revenue: number
    }>
}

export default function AdminAnalyticsPage() {
    const router = useRouter()
    const { data: session, status } = useSession()
    const [range, setRange] = useState<Range>('month')
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<AnalyticsData | null>(null)

    const fetchAnalytics = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/analytics?range=${range}`)
            if (res.ok) {
                const d = await res.json()
                setData(d)
            }
        } catch (err) {
            console.error('Failed to fetch analytics:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login')
            return
        }
        fetchAnalytics()
    }, [range, status])

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <RefreshCw className="w-8 h-8 animate-spin text-[#2E5A44]" />
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Memuat Dashboard Analitik...</p>
            </div>
        )
    }

    const kpis = data?.kpis || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, totalCustomers: 0, growth: 0 }
    const statusDist = data?.statusDistribution || { PENDING: 0, PREPARING: 0, READY: 0, COMPLETED: 0, CANCELLED: 0 }
    const categoryRev = data?.categoryRevenue || []
    const monthlySales = data?.recentMonthlySales || []

    // Custom SVG Line Graph calculations
    const maxMonthlyRevenue = Math.max(...monthlySales.map(m => m.revenue), 1)
    const svgWidth = 500
    const svgHeight = 200
    const padding = 30
    const chartWidth = svgWidth - padding * 2
    const chartHeight = svgHeight - padding * 2

    const points = monthlySales.map((m, index) => {
        const x = padding + (index / (monthlySales.length - 1 || 1)) * chartWidth
        const y = svgHeight - padding - (m.revenue / maxMonthlyRevenue) * chartHeight
        return { x, y, ...m }
    })

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

    // Donut Chart logic
    let currentAngle = 0
    const donutColors = [
        'stroke-[#2E5A44]', // Signature
        'stroke-[#B48A5E]', // Classic
        'stroke-[#8C6239]', // Hidden Menu
        'stroke-[#EADFC9]', // Seasonal
        'stroke-gray-300'   // Others
    ]

    return (
        <div className="space-y-6">
            
            {/* Top Navigation / Title Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-150 pb-5">
                <div className="space-y-1 text-left">
                    <h1 className="text-2xl font-serif font-black text-gray-950 tracking-tight flex items-center gap-2">
                        <BarChart2 className="w-6 h-6 text-[#2E5A44]" /> Smart Analytics Dashboard
                    </h1>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                        Pemantauan Real-time Penjualan & Kinerja Toko
                    </p>
                </div>

                {/* Range Selectors */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 border border-gray-200 self-start sm:self-auto">
                    {(Object.keys(RANGE_LABELS) as Range[]).map((key) => (
                        <button
                            key={key}
                            onClick={() => setRange(key)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                range === key
                                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            {RANGE_LABELS[key]}
                        </button>
                    ))}
                    <button 
                        onClick={fetchAnalytics}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 transition-colors"
                        title="Segarkan data"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Revenue Card */}
                <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden group hover:border-[#2E5A44]/30 hover:shadow-md transition-all duration-300">
                    <div className="flex justify-between items-start">
                        <div className="w-10 h-10 rounded-2xl bg-[#2E5A44]/10 flex items-center justify-center text-[#2E5A44]">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <span className="flex items-center text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full leading-none">
                            <ArrowUpRight className="w-3.5 h-3.5 stroke-[3px]" /> {kpis.growth}%
                        </span>
                    </div>
                    <div className="text-left">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Total Pendapatan</span>
                        <h3 className="text-xl font-black text-gray-950 mt-1 tracking-tight">
                            {formatRupiah(kpis.totalRevenue)}
                        </h3>
                        <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">Dari {kpis.totalOrders} total pesanan</p>
                    </div>
                </div>

                {/* Orders Card */}
                <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden group hover:border-[#B48A5E]/30 hover:shadow-md transition-all duration-300">
                    <div className="flex justify-between items-start">
                        <div className="w-10 h-10 rounded-2xl bg-[#B48A5E]/10 flex items-center justify-center text-[#B48A5E]">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                        <span className="flex items-center text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full leading-none">
                            <ArrowUpRight className="w-3.5 h-3.5 stroke-[3px]" /> 8.2%
                        </span>
                    </div>
                    <div className="text-left">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Volume Pesanan</span>
                        <h3 className="text-xl font-black text-gray-950 mt-1 tracking-tight">
                            {kpis.totalOrders} <span className="text-sm font-medium text-gray-400">Cups</span>
                        </h3>
                        <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">Transaksi terproses</p>
                    </div>
                </div>

                {/* Avg Order Value Card */}
                <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden group hover:border-gray-300 hover:shadow-md transition-all duration-300">
                    <div className="flex justify-between items-start">
                        <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-700">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <span className="flex items-center text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full leading-none">
                            <ArrowDownRight className="w-3.5 h-3.5 stroke-[3px]" /> 2.1%
                        </span>
                    </div>
                    <div className="text-left">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Rata-rata Transaksi (AOV)</span>
                        <h3 className="text-xl font-black text-gray-950 mt-1 tracking-tight">
                            {formatRupiah(kpis.avgOrderValue)}
                        </h3>
                        <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">Nilai belanja per pelanggan</p>
                    </div>
                </div>

                {/* Customers Card */}
                <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden group hover:border-[#8C6239]/30 hover:shadow-md transition-all duration-300">
                    <div className="flex justify-between items-start">
                        <div className="w-10 h-10 rounded-2xl bg-[#8C6239]/10 flex items-center justify-center text-[#8C6239]">
                            <Users className="w-5 h-5" />
                        </div>
                        <span className="flex items-center text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full leading-none">
                            <ArrowUpRight className="w-3.5 h-3.5 stroke-[3px]" /> 12.4%
                        </span>
                    </div>
                    <div className="text-left">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Pelanggan Terdaftar</span>
                        <h3 className="text-xl font-black text-gray-950 mt-1 tracking-tight">
                            {kpis.totalCustomers} <span className="text-sm font-medium text-gray-400">Jiwa</span>
                        </h3>
                        <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">Total customer loyal</p>
                    </div>
                </div>

            </div>

            {/* Graphs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* SVG Revenue Line Graph */}
                <div className="lg:col-span-8 bg-white border border-gray-150 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-6">
                        <div className="space-y-0.5 text-left">
                            <h3 className="font-serif font-black text-base text-gray-950 tracking-tight flex items-center gap-1.5">
                                <BarChart2 className="w-4 h-4 text-[#2E5A44]" /> Tren Penjualan Bulanan
                            </h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                Grafik performa total penjualan per bulan
                            </p>
                        </div>
                    </div>

                    {/* SVG Render */}
                    <div className="w-full h-56 flex items-center justify-center relative bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
                        {monthlySales.length === 0 ? (
                            <span className="text-xs text-gray-400 font-bold uppercase">Belum ada riwayat penjualan</span>
                        ) : (
                            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
                                <defs>
                                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#2E5A44" stopOpacity="0.25" />
                                        <stop offset="100%" stopColor="#2E5A44" stopOpacity="0" />
                                    </linearGradient>
                                </defs>

                                {/* Background Grid Lines */}
                                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                                    const y = padding + ratio * chartHeight
                                    return (
                                        <line 
                                            key={idx} 
                                            x1={padding} 
                                            y1={y} 
                                            x2={svgWidth - padding} 
                                            y2={y} 
                                            stroke="#E5E7EB" 
                                            strokeWidth="0.8" 
                                            strokeDasharray="4 4" 
                                        />
                                    )
                                })}

                                {/* Area Path */}
                                <path 
                                    d={`${linePath} L ${points[points.length - 1].x} ${svgHeight - padding} L ${points[0].x} ${svgHeight - padding} Z`}
                                    fill="url(#chartGrad)"
                                />

                                {/* Line Path */}
                                <path 
                                    d={linePath} 
                                    fill="none" 
                                    stroke="#2E5A44" 
                                    strokeWidth="3" 
                                    strokeLinecap="round"
                                />

                                {/* Dots and Tooltip triggers */}
                                {points.map((p, idx) => (
                                    <g key={idx} className="group/dot cursor-pointer">
                                        <circle 
                                            cx={p.x} 
                                            cy={p.y} 
                                            r="5" 
                                            fill="#FFFFFF" 
                                            stroke="#2E5A44" 
                                            strokeWidth="3.5" 
                                        />
                                        {/* Label text */}
                                        <text 
                                            x={p.x} 
                                            y={svgHeight - 8} 
                                            textAnchor="middle" 
                                            className="text-[9px] font-bold text-gray-500 uppercase tracking-widest"
                                        >
                                            {p.month}
                                        </text>
                                        <text 
                                            x={p.x} 
                                            y={p.y - 12} 
                                            textAnchor="middle" 
                                            className="text-[8px] font-black text-gray-800 bg-white px-1.5 py-0.5 rounded shadow-sm opacity-0 group-hover/dot:opacity-100 transition-opacity"
                                        >
                                            {(p.revenue / 1000).toFixed(0)}k
                                        </text>
                                    </g>
                                ))}
                            </svg>
                        )}
                    </div>
                </div>

                {/* Donut Chart: Category Share breakdown */}
                <div className="lg:col-span-4 bg-white border border-gray-150 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between">
                    <div className="space-y-0.5 text-left mb-6">
                        <h3 className="font-serif font-black text-base text-gray-950 tracking-tight flex items-center gap-1.5">
                            <PieChart className="w-4 h-4 text-[#B48A5E]" /> Kategori Terlaris
                        </h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            Pembagian penjualan berdasarkan kategori menu
                        </p>
                    </div>

                    {/* Donut Graphic */}
                    <div className="flex flex-col items-center justify-center flex-grow space-y-5">
                        <div className="relative w-36 h-36 flex items-center justify-center">
                            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                <circle 
                                    cx="50" 
                                    cy="50" 
                                    r="38" 
                                    className="stroke-gray-100" 
                                    strokeWidth="10" 
                                    fill="none" 
                                />
                                {categoryRev.map((cat, idx) => {
                                    const percentage = cat.percentage
                                    const strokeDash = `${percentage} ${100 - percentage}`
                                    const strokeOffset = 100 - currentAngle
                                    currentAngle += percentage

                                    return (
                                        <circle 
                                            key={cat.name}
                                            cx="50" 
                                            cy="50" 
                                            r="38" 
                                            className={`${donutColors[idx % donutColors.length] || 'stroke-gray-300'}`} 
                                            strokeWidth="11" 
                                            fill="none"
                                            strokeDasharray={strokeDash}
                                            strokeDashoffset={strokeOffset}
                                            strokeLinecap="round"
                                        />
                                    )
                                })}
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Top Share</span>
                                <span className="text-lg font-serif font-black text-[#2E5A44] leading-none">
                                    {categoryRev[0]?.percentage || 0}%
                                </span>
                            </div>
                        </div>

                        {/* Legend breakdown list */}
                        <div className="w-full space-y-2">
                            {categoryRev.map((cat, idx) => (
                                <div key={cat.name} className="flex justify-between items-center text-xs">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${donutColors[idx % donutColors.length]?.replace('stroke-', 'bg-') || 'bg-gray-350'}`} />
                                        <span className="font-bold text-gray-700">{cat.name}</span>
                                    </div>
                                    <span className="font-black text-gray-900">{cat.percentage}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>

            {/* Bottom Section: Order Status Metrics */}
            <div className="bg-white border border-gray-150 rounded-[2rem] p-6 shadow-sm text-left">
                <div className="space-y-0.5 mb-5">
                    <h3 className="font-serif font-black text-base text-gray-950 tracking-tight flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-amber-500" /> Distribusi Status Pesanan
                    </h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        Perkembangan status pesanan saat ini
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    
                    {/* Pending Status */}
                    <div className="border border-gray-100 rounded-2xl p-4 space-y-2 bg-slate-50/50">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Dalam Antrean</p>
                        <h4 className="text-xl font-black text-slate-900">{statusDist.PENDING}</h4>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-slate-400 h-full rounded-full" style={{ width: `${Math.min(100, (statusDist.PENDING / (kpis.totalOrders || 1)) * 100)}%` }} />
                        </div>
                    </div>

                    {/* Preparing Status */}
                    <div className="border border-[#B48A5E]/10 rounded-2xl p-4 space-y-2 bg-[#B48A5E]/5">
                        <p className="text-[10px] font-black uppercase tracking-wider text-[#B48A5E]">Sedang Diseduh</p>
                        <h4 className="text-xl font-black text-gray-900">{statusDist.PREPARING}</h4>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-[#B48A5E] h-full rounded-full" style={{ width: `${Math.min(100, (statusDist.PREPARING / (kpis.totalOrders || 1)) * 100)}%` }} />
                        </div>
                    </div>

                    {/* Ready Status */}
                    <div className="border border-blue-150 rounded-2xl p-4 space-y-2 bg-blue-50/20">
                        <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Siap Diambil</p>
                        <h4 className="text-xl font-black text-blue-950">{statusDist.READY}</h4>
                        <div className="w-full bg-blue-50 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-blue-600 h-full rounded-full" style={{ width: `${Math.min(100, (statusDist.READY / (kpis.totalOrders || 1)) * 100)}%` }} />
                        </div>
                    </div>

                    {/* Completed Status */}
                    <div className="border border-[#2E5A44]/10 rounded-2xl p-4 space-y-2 bg-[#2E5A44]/5">
                        <p className="text-[10px] font-black uppercase tracking-wider text-[#2E5A44]">Selesai / Terkirim</p>
                        <h4 className="text-xl font-black text-[#2E5A44]">{statusDist.COMPLETED}</h4>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-[#2E5A44] h-full rounded-full" style={{ width: `${Math.min(100, (statusDist.COMPLETED / (kpis.totalOrders || 1)) * 100)}%` }} />
                        </div>
                    </div>

                    {/* Cancelled Status */}
                    <div className="border border-rose-150 rounded-2xl p-4 space-y-2 bg-rose-50/20 col-span-2 md:col-span-1">
                        <p className="text-[10px] font-black uppercase tracking-wider text-rose-600">Dibatalkan</p>
                        <h4 className="text-xl font-black text-rose-950">{statusDist.CANCELLED}</h4>
                        <div className="w-full bg-rose-50 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-rose-600 h-full rounded-full" style={{ width: `${Math.min(100, (statusDist.CANCELLED / (kpis.totalOrders || 1)) * 100)}%` }} />
                        </div>
                    </div>

                </div>
            </div>

        </div>
    )
}
