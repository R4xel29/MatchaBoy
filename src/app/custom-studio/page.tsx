'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ChevronLeft, Sparkles, Save, ShoppingBag, Check, Plus, Minus } from 'lucide-react'
import { useCartStore } from '@/stores/cart-store'
import { useToast } from '@/components/ui/Toast'
import Image from 'next/image'

const MILK_OPTIONS = [
    { name: 'Fresh Milk', price: 0, desc: 'Klasik & Creamy' },
    { name: 'Oat Milk', price: 7000, desc: 'Gurih & Nabati' },
    { name: 'Soy Milk', price: 5000, desc: 'Halus & Sehat' },
    { name: 'Almond Milk', price: 8000, desc: 'Nutty & Ringan' },
]

const TOPPING_OPTIONS = [
    { id: 'espresso', name: 'Espresso Shot', price: 5000 },
    { id: 'biscoff', name: 'Biscoff Crumble', price: 8000 },
    { id: 'extra-cream', name: 'Extra Cream', price: 3000 },
    { id: 'brown-sugar', name: 'Brown Sugar Jelly', price: 5000 },
]

const BASE_PRODUCTS = [
    { id: 'brand-signature', name: 'Matcha Signature', price: 35000, desc: 'Ceremonial-grade matcha base' },
    { id: 'brand-latte', name: 'Iced Matcha Latte', price: 28000, desc: 'Smooth & classic matcha base' },
    { id: 'dirty-matcha', name: 'Dirty Matcha', price: 38000, desc: 'Matcha with espresso kick' },
]

export default function CustomStudioPage() {
    const router = useRouter()
    const { data: session, status } = useSession()
    const { showToast } = useToast()
    const addItem = useCartStore((state) => state.addItem)

    // Customize States
    const [selectedBase, setSelectedBase] = useState(BASE_PRODUCTS[0])
    const [recipeName, setRecipeName] = useState('Racikan Matcha Mimpiku')
    const [matchaLevel, setMatchaLevel] = useState(5) // 1-10
    const [creaminess, setCreaminess] = useState(5) // 1-10
    const [sweetness, setSweetness] = useState(5) // 1-10
    const [milkType, setMilkType] = useState('Fresh Milk')
    const [selectedToppings, setSelectedToppings] = useState<typeof TOPPING_OPTIONS>([])

    const [isSaving, setIsSaving] = useState(false)
    const [isSaved, setIsSaved] = useState(false)

    // Calculate total price
    const basePrice = selectedBase.price
    const milkPremium = MILK_OPTIONS.find(m => m.name === milkType)?.price || 0
    const toppingsPrice = selectedToppings.reduce((sum, t) => sum + t.price, 0)
    const totalPrice = basePrice + milkPremium + toppingsPrice

    // Dynamic color calculation for preview
    // Shifting from creamy-milky (#F5E6D3) at low matcha to emerald-green (#1B4D3E) at high matcha
    const matchaColor = useMemo(() => {
        const factor = matchaLevel / 10
        const r = Math.round(245 - (245 - 27) * factor)
        const g = Math.round(230 - (230 - 77) * factor)
        const b = Math.round(211 - (211 - 62) * factor)
        return `rgb(${r}, ${g}, ${b})`
    }, [matchaLevel])

    // Labels based on meter values
    const matchaLabel = useMemo(() => {
        if (matchaLevel <= 3) return 'Tunas Lembut 🍃'
        if (matchaLevel <= 6) return 'Sedang Nikmat 🍵'
        if (matchaLevel <= 8) return 'Mantap Earthy 🏔️'
        return 'Dewa Matcha 👑'
    }, [matchaLevel])

    const sweetnessLabel = useMemo(() => {
        if (sweetness <= 3) return 'Tanpa/Sedikit Gula 🧘'
        if (sweetness <= 6) return 'Normal Manis 🍯'
        if (sweetness <= 8) return 'Manis Manja 🍭'
        return 'Overload Manis ⚡'
    }, [sweetness])

    const creaminessLabel = useMemo(() => {
        if (creaminess <= 3) return 'Ringan / Airy 💨'
        if (creaminess <= 6) return 'Sedang Pas 🥛'
        return 'Sangat Creamy / Kental 🧈'
    }, [creaminess])

    const toggleTopping = (topping: typeof TOPPING_OPTIONS[0]) => {
        if (selectedToppings.some(t => t.id === topping.id)) {
            setSelectedToppings(selectedToppings.filter(t => t.id !== topping.id))
        } else {
            setSelectedToppings([...selectedToppings, topping])
        }
    }

    const handleSaveRecipe = async () => {
        if (status !== 'authenticated') {
            showToast('Silakan masuk akun terlebih dahulu untuk menyimpan resep!', 'error')
            return
        }

        setIsSaving(true)
        try {
            const res = await fetch('/api/custom-recipes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipeName,
                    baseProductId: selectedBase.id,
                    matchaLevel,
                    creaminess,
                    sweetness,
                    milkType,
                    toppings: selectedToppings,
                    isPublic: true
                })
            })

            const data = await res.json()
            if (res.ok && data.success) {
                setIsSaved(true)
                showToast('Formula Matcha Kustom Anda berhasil disimpan! 💚', 'success')
                setTimeout(() => setIsSaved(false), 3000)
            } else {
                showToast(data.error || 'Gagal menyimpan formula', 'error')
            }
        } catch (err) {
            console.error(err)
            showToast('Kesalahan koneksi saat menyimpan formula', 'error')
        } finally {
            setIsSaving(false)
        }
    }

    const handleAddToCart = () => {
        // Map selected toppings directly to AddOn structure
        const addOns: any[] = selectedToppings.map(t => ({
            id: t.id,
            name: t.name,
            price: t.price
        }))

        // Include milk option as an addon if premium
        if (milkPremium > 0) {
            addOns.push({
                id: milkType.toLowerCase().replace(' ', '-'),
                name: milkType,
                price: milkPremium
            })
        }

        // Add to Zustand Cart
        addItem({
            productId: selectedBase.id,
            name: `${recipeName} (${selectedBase.name})`,
            image: '/products/brand-signature.png', // Fallback product image
            basePrice: selectedBase.price,
            quantity: 1,
            iceLevel: 'Normal Ice',
            sugarLevel: sweetness <= 5 ? 'Less Sugar' : 'Normal Sugar',
            addOns,
            size: 'Normal',
            sizePrice: 0
        })

        showToast('Minuman kustom Anda ditambahkan ke keranjang! 🛒', 'success')
    }

    return (
        <div className="min-h-screen bg-[#FAF8F5] pb-16 pt-6 px-4 md:px-8">
            <div className="max-w-6xl mx-auto">
                
                {/* Header Navigation */}
                <div className="flex items-center justify-between mb-8">
                    <button 
                        onClick={() => router.push('/')}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#EADFC9]/50 hover:bg-[#FAF8F5] transition-all text-gray-800 text-sm font-bold shadow-sm"
                    >
                        <ChevronLeft className="w-4 h-4" /> Kembali ke Home
                    </button>
                    <div className="flex items-center gap-1.5 bg-[#2E5A44]/10 text-[#2E5A44] px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                        <Sparkles className="w-3.5 h-3.5 fill-[#2E5A44]" /> Custom Studio
                    </div>
                </div>

                <div className="text-center mb-10 space-y-2">
                    <h1 className="font-serif text-3xl md:text-4xl font-black text-gray-950 tracking-tight leading-none">
                        Custom Matcha Studio
                    </h1>
                    <p className="text-gray-500 text-sm max-w-xl mx-auto font-medium">
                        Jadilah master blender! Sesuaikan kekuatan matcha, kemanisan, tipe susu premium, dan toppings sesuai seleramu.
                    </p>
                </div>

                {/* Main Visual Builder Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left Column: Glass Visual Preview Container */}
                    <div className="lg:col-span-5 bg-white border border-[#D4A574]/20 rounded-[2.5rem] p-6 shadow-sm flex flex-col items-center justify-center relative overflow-hidden min-h-[460px]">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(212,235,214,0.15)_0%,_rgba(250,248,245,0)_50%)] pointer-events-none z-0" />
                        
                        {/* Interactive Preview Title */}
                        <div className="z-10 text-center mb-6">
                            <span className="text-[10px] font-black tracking-widest text-[#D4A574] uppercase">Live Preview</span>
                            <h3 className="font-serif font-black text-lg text-gray-900 leading-none mt-1">
                                {recipeName || 'Racikan Kustom Anda'}
                            </h3>
                        </div>

                        {/* Glass Body Visual */}
                        <div className="relative w-44 h-72 border-4 border-gray-300/80 rounded-b-[4.5rem] rounded-t-lg shadow-xl overflow-hidden flex items-end justify-center bg-gray-50/20 z-10">
                            
                            {/* Glass highlights */}
                            <div className="absolute top-2 left-3 w-1.5 h-64 bg-white/25 rounded-full pointer-events-none z-30" />
                            <div className="absolute top-8 right-3 w-1 h-56 bg-white/15 rounded-full pointer-events-none z-30" />

                            {/* Liquid matching custom values */}
                            <div 
                                style={{ 
                                    height: '88%', 
                                    backgroundColor: matchaColor,
                                }} 
                                className="w-full rounded-b-[4rem] transition-all duration-500 ease-out relative flex flex-col justify-end overflow-hidden"
                            >
                                {/* Ripple/Wave animation */}
                                <div className="absolute top-0 left-0 right-0 h-4 bg-white/10 animate-pulse pointer-events-none" />

                                {/* Floating topping visual badges inside drink */}
                                <div className="absolute inset-0 p-4 flex flex-wrap content-end justify-center gap-1.5 pointer-events-none z-20">
                                    {selectedToppings.map((t, idx) => (
                                        <span 
                                            key={t.id}
                                            className="bg-white/80 backdrop-blur-md text-[9px] text-[#2E5A44] font-black px-1.5 py-0.5 rounded-md shadow-sm border border-[#2E5A44]/10 transform translate-y-[-10px] animate-bounce"
                                            style={{ animationDelay: `${idx * 0.15}s` }}
                                        >
                                            {t.name}
                                        </span>
                                    ))}
                                    <span className="bg-[#FAF8F5]/30 text-white/90 text-[8px] font-bold px-2 py-0.5 rounded-full border border-white/20 uppercase tracking-widest leading-none mt-1">
                                        {milkType}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Visual Drink Summary badges */}
                        <div className="mt-8 flex flex-wrap justify-center gap-2 z-10">
                            <span className="bg-[#2E5A44]/5 text-[#2E5A44] text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                                {matchaLabel}
                            </span>
                            <span className="bg-amber-600/5 text-amber-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                                {sweetnessLabel}
                            </span>
                            <span className="bg-gray-800/5 text-gray-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                                {creaminessLabel}
                            </span>
                        </div>
                    </div>

                    {/* Right Column: Custom Studio Form Controls */}
                    <div className="lg:col-span-7 space-y-6">
                        
                        {/* Section 1: Base drink and Name */}
                        <div className="bg-white border border-[#EADFC9]/40 rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 tracking-widest mb-1.5">Nama Formula Anda</label>
                                <input 
                                    type="text"
                                    value={recipeName}
                                    onChange={(e) => setRecipeName(e.target.value.substring(0, 32))}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2E5A44]/40 font-serif font-bold text-gray-900"
                                    placeholder="Nama racikan kustom..."
                                    maxLength={32}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 tracking-widest mb-2.5">Pilih Base Product</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {BASE_PRODUCTS.map((prod) => (
                                        <button
                                            key={prod.id}
                                            onClick={() => setSelectedBase(prod)}
                                            className={`p-3 text-left rounded-2xl border transition-all ${
                                                selectedBase.id === prod.id
                                                    ? 'border-[#2E5A44] bg-[#2E5A44]/5 ring-1 ring-[#2E5A44]'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <p className="text-xs font-black text-gray-900">{prod.name}</p>
                                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">{prod.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Gorgeous Slider Meters */}
                        <div className="bg-white border border-[#EADFC9]/40 rounded-3xl p-5 md:p-6 shadow-sm space-y-6">
                            
                            {/* Matcha level slider */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-black uppercase tracking-widest text-gray-400">Kekuatan Matcha (Matcha Level)</span>
                                    <span className="text-xs font-black text-[#2E5A44] bg-[#2E5A44]/10 px-2 py-0.5 rounded-md">{matchaLevel} / 10</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => setMatchaLevel(prev => Math.max(1, prev - 1))}
                                        className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all shrink-0"
                                    >
                                        <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <input 
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={matchaLevel}
                                        onChange={(e) => setMatchaLevel(parseInt(e.target.value))}
                                        className="w-full h-2 bg-gray-150 rounded-lg appearance-none cursor-pointer accent-[#2E5A44]"
                                    />
                                    <button 
                                        onClick={() => setMatchaLevel(prev => Math.min(10, prev + 1))}
                                        className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all shrink-0"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider text-right italic">{matchaLabel}</p>
                            </div>

                            {/* Sweetness slider */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-black uppercase tracking-widest text-gray-400">Tingkat Kemanisan (Sweetness)</span>
                                    <span className="text-xs font-black text-amber-600 bg-amber-600/10 px-2 py-0.5 rounded-md">{sweetness} / 10</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => setSweetness(prev => Math.max(1, prev - 1))}
                                        className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all shrink-0"
                                    >
                                        <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <input 
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={sweetness}
                                        onChange={(e) => setSweetness(parseInt(e.target.value))}
                                        className="w-full h-2 bg-gray-150 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                    />
                                    <button 
                                        onClick={() => setSweetness(prev => Math.min(10, prev + 1))}
                                        className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all shrink-0"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider text-right italic">{sweetnessLabel}</p>
                            </div>

                            {/* Creaminess slider */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-black uppercase tracking-widest text-gray-400">Tekstur Creaminess</span>
                                    <span className="text-xs font-black text-gray-800 bg-gray-800/10 px-2 py-0.5 rounded-md">{creaminess} / 10</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => setCreaminess(prev => Math.max(1, prev - 1))}
                                        className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all shrink-0"
                                    >
                                        <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <input 
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={creaminess}
                                        onChange={(e) => setCreaminess(parseInt(e.target.value))}
                                        className="w-full h-2 bg-gray-150 rounded-lg appearance-none cursor-pointer accent-gray-700"
                                    />
                                    <button 
                                        onClick={() => setCreaminess(prev => Math.min(10, prev + 1))}
                                        className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all shrink-0"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider text-right italic">{creaminessLabel}</p>
                            </div>
                        </div>

                        {/* Section 3: Milk Type & Toppings */}
                        <div className="bg-white border border-[#EADFC9]/40 rounded-3xl p-5 md:p-6 shadow-sm space-y-6">
                            
                            {/* Milk Choice */}
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 tracking-widest mb-3">Tipe Susu Premium</label>
                                <div className="grid grid-cols-2 gap-2.5">
                                    {MILK_OPTIONS.map((milk) => (
                                        <button
                                            key={milk.name}
                                            onClick={() => setMilkType(milk.name)}
                                            className={`p-3 rounded-2xl border text-left transition-all ${
                                                milkType === milk.name
                                                    ? 'border-[#2E5A44] bg-[#2E5A44]/5 ring-1 ring-[#2E5A44]'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-black text-gray-900">{milk.name}</span>
                                                {milk.price > 0 && (
                                                    <span className="text-[9px] font-black text-[#B48A5E] bg-[#B48A5E]/10 px-1.5 py-0.5 rounded">
                                                        +{milk.price / 1000}k
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[9px] text-gray-400 font-bold mt-0.5">{milk.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Toppings Choice */}
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 tracking-widest mb-3">Pilihan Toppings</label>
                                <div className="grid grid-cols-2 gap-2.5">
                                    {TOPPING_OPTIONS.map((top) => {
                                        const isSelected = selectedToppings.some(t => t.id === top.id)
                                        return (
                                            <button
                                                key={top.id}
                                                onClick={() => toggleTopping(top)}
                                                className={`p-3 rounded-2xl border text-left transition-all flex justify-between items-center ${
                                                    isSelected
                                                        ? 'border-[#2E5A44] bg-[#2E5A44]/5 ring-1 ring-[#2E5A44]'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                <div>
                                                    <span className="text-xs font-black text-gray-900">{top.name}</span>
                                                    <p className="text-[9px] text-gray-400 font-bold mt-0.5">Premium Topping</p>
                                                </div>
                                                <span className="text-[10px] font-black text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">
                                                    +Rp{top.price.toLocaleString('id-ID')}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Summary & Actions */}
                        <div className="bg-[#FAF8F5] border border-[#EADFC9]/50 rounded-[2rem] p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-center sm:text-left space-y-1">
                                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Total Harga Racikan</span>
                                <h2 className="font-serif text-2xl font-black text-[#2E5A44]">
                                    Rp{totalPrice.toLocaleString('id-ID')}
                                </h2>
                            </div>

                            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                <button
                                    onClick={handleSaveRecipe}
                                    disabled={isSaving}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-6 py-3.5 bg-white border border-[#EADFC9] hover:bg-gray-50 active:scale-98 transition-all rounded-2xl text-[12px] font-black text-gray-700 shadow-sm"
                                >
                                    {isSaved ? <Check className="w-4 h-4 text-emerald-600" /> : <Save className="w-4 h-4" />}
                                    {isSaving ? 'Menyimpan...' : 'Simpan Formula'}
                                </button>

                                <button
                                    onClick={handleAddToCart}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-6 py-3.5 bg-[#2E5A44] hover:bg-[#1E3F20] active:scale-98 transition-all rounded-2xl text-[12px] font-black text-white shadow-md hover:shadow-lg"
                                >
                                    <ShoppingBag className="w-4 h-4" /> Tambah ke Keranjang
                                </button>
                            </div>
                        </div>

                    </div>

                </div>

            </div>
        </div>
    )
}
