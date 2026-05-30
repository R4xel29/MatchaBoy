'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Users, Share2, Copy, Check, ShoppingBag, Trash2, Plus, 
    Minus, X, CheckSquare, Square, ChevronRight, Info, AlertTriangle, 
    ArrowRight, Loader2, Sparkles, MessageCircle, ExternalLink
} from 'lucide-react'
import { formatRupiah } from '@/lib/utils'

interface Product {
    id: string
    name: string
    description: string
    price: number
    image: string | null
    category: string
    badge: string | null
    modifiers: any | null
}

interface GroupCartClientProps {
    groupCartId: string
    creatorId: string
    creatorName: string
    status: string
    categories: { id: string; name: string; slug: string }[]
    products: Product[]
}

export default function GroupCartClient({
    groupCartId,
    creatorId,
    creatorName,
    status,
    categories,
    products
}: GroupCartClientProps) {
    const router = useRouter()
    const { data: session } = useSession()
    
    // Member name states
    const [memberName, setMemberName] = useState<string>('')
    const [nameInput, setNameInput] = useState<string>('')
    const [isJoining, setIsJoining] = useState<boolean>(true)

    // Shared cart states
    const [cartItems, setCartItems] = useState<any[]>([])
    const [groupedItems, setGroupedItems] = useState<Record<string, any[]>>({})
    const [splitBill, setSplitBill] = useState<any>({ breakdown: [], subtotal: 0, total: 0 })
    const [isLoadingCart, setIsLoadingCart] = useState<boolean>(true)

    // Share link states
    const [copied, setCopied] = useState<boolean>(false)

    // Active category filter & search query
    const [activeCategory, setActiveCategory] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState<string>('')

    // Product detail modal state
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [selectedSize, setSelectedSize] = useState<string>('Normal')
    const [selectedSizePrice, setSelectedSizePrice] = useState<number>(0)
    const [selectedIce, setSelectedIce] = useState<string>('Normal Ice')
    const [selectedSugar, setSelectedSugar] = useState<string>('Normal Sugar')
    const [selectedAddOns, setSelectedAddOns] = useState<any[]>([])
    const [quantity, setQuantity] = useState<number>(1)
    const [isAddingToCart, setIsAddingToCart] = useState<boolean>(false)

    // Toast feedback state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Check if name is saved in localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedName = localStorage.getItem('matchaboy_group_member_name')
            if (savedName) {
                setMemberName(savedName)
                setIsJoining(false)
            } else if (session?.user?.name) {
                setNameInput(session.user.name)
            }
        }
    }, [session])

    // Load group cart items and short poll every 3 seconds for collaborative changes
    const fetchCartItems = async (silent = false) => {
        if (!silent) setIsLoadingCart(true)
        try {
            const res = await fetch(`/api/group-cart/${groupCartId}/items`)
            if (res.ok) {
                const data = await res.json()
                setCartItems(data.groupedItems ? Object.values(data.groupedItems).flat() : [])
                setGroupedItems(data.groupedItems || {})
                setSplitBill(data.splitBill || { breakdown: [], subtotal: 0, total: 0 })
                
                // If the cart is already checked out, redirect to normal status page
                if (data.groupCart?.status === 'CHECKED_OUT') {
                    showToast('Group Cart ini telah dicheckout!', 'success')
                    setTimeout(() => {
                        router.push('/')
                    }, 2000)
                }
            }
        } catch (error) {
            console.error('Error fetching group cart:', error)
        } finally {
            setIsLoadingCart(false)
        }
    }

    useEffect(() => {
        fetchCartItems()
        const interval = setInterval(() => {
            fetchCartItems(true)
        }, 3000)
        return () => clearInterval(interval)
    }, [groupCartId])

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault()
        if (!nameInput.trim()) return
        localStorage.setItem('matchaboy_group_member_name', nameInput.trim())
        setMemberName(nameInput.trim())
        setIsJoining(false)
        showToast(`Selamat bergabung, ${nameInput.trim()}! 🍵`, 'success')
    }

    const handleCopyLink = () => {
        if (typeof window === 'undefined') return
        const link = `${window.location.origin}/group-cart/${groupCartId}`
        navigator.clipboard.writeText(link)
        setCopied(true)
        showToast('Link Group Cart berhasil disalin!', 'success')
        setTimeout(() => setCopied(false), 2000)
    }

    const handleShareWA = () => {
        if (typeof window === 'undefined') return
        const link = `${window.location.origin}/group-cart/${groupCartId}`
        const text = encodeURIComponent(
            `Halo! Yuk gabung ke Group Order Matchaboy bareng saya. Klik link ini untuk langsung menambahkan menu favoritmu:\n${link}`
        )
        window.open(`https://wa.me/?text=${text}`, '_blank')
    }

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
    }

    // Modal helpers
    const openProductCustomizer = (product: Product) => {
        if (product.badge === 'sold-out') return
        setSelectedProduct(product)
        setSelectedSize('Normal')
        setSelectedSizePrice(0)
        setSelectedIce('Normal Ice')
        setSelectedSugar('Normal Sugar')
        setSelectedAddOns([])
        setQuantity(1)
    }

    const closeProductCustomizer = () => {
        setSelectedProduct(null)
    }

    const toggleAddOn = (addOn: any) => {
        setSelectedAddOns(prev => {
            const exists = prev.find(a => a.id === addOn.id)
            if (exists) {
                return prev.filter(a => a.id !== addOn.id)
            } else {
                return [...prev, addOn]
            }
        })
    }

    const currentPrice = useMemo(() => {
        if (!selectedProduct) return 0
        const basePrice = selectedProduct.price
        const addOnTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0)
        return (basePrice + selectedSizePrice + addOnTotal) * quantity
    }, [selectedProduct, selectedSizePrice, selectedAddOns, quantity])

    const handleAddToGroupCart = async () => {
        if (!selectedProduct || !memberName) return
        setIsAddingToCart(true)

        const modifiers = {
            size: selectedSize,
            iceLevel: selectedIce,
            sugarLevel: selectedSugar,
            addOns: selectedAddOns,
            addOnIds: selectedAddOns.map(a => a.id)
        }

        const modsStringParts: string[] = []
        if (selectedSize !== 'Normal') modsStringParts.push(selectedSize)
        modsStringParts.push(selectedIce)
        modsStringParts.push(selectedSugar)
        selectedAddOns.forEach(a => modsStringParts.push(a.name))

        const bodyPayload = {
            memberName,
            productId: selectedProduct.id,
            qty: quantity,
            modifiers: JSON.stringify({
                ...modifiers,
                modsString: modsStringParts.join(', ')
            })
        }

        try {
            const res = await fetch(`/api/group-cart/${groupCartId}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
            })

            if (res.ok) {
                showToast(`${selectedProduct.name} berhasil ditambahkan! 🍵`, 'success')
                closeProductCustomizer()
                fetchCartItems(true)
            } else {
                const errData = await res.json()
                showToast(errData.error || 'Gagal menambahkan produk', 'error')
            }
        } catch (error) {
            console.error('Error adding group item:', error)
            showToast('Kesalahan koneksi ke server', 'error')
        } finally {
            setIsAddingToCart(false)
        }
    }

    const handleDeleteItem = async (itemId: string, productName: string) => {
        try {
            const res = await fetch(`/api/group-cart/${groupCartId}/items?itemId=${itemId}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                showToast(`${productName} berhasil dihapus dari keranjang grup!`, 'success')
                fetchCartItems(true)
            } else {
                showToast('Gagal menghapus item', 'error')
            }
        } catch (error) {
            console.error('Error deleting group item:', error)
            showToast('Kesalahan koneksi', 'error')
        }
    }

    // Filter products
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesCategory = activeCategory === 'all' || p.category === activeCategory
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 p.description.toLowerCase().includes(searchQuery.toLowerCase())
            return matchesCategory && matchesSearch
        })
    }, [products, activeCategory, searchQuery])

    // Proceed to Creator Checkout
    const handleCreatorCheckout = () => {
        router.push(`/checkout?groupCartId=${groupCartId}`)
    }

    // Checking if current user is creator
    const isCreator = session?.user?.id === creatorId

    if (isJoining) {
        return (
            <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(212,235,214,0.35)_0%,_rgba(250,248,245,0)_60%)] pointer-events-none z-0" />
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full max-w-md bg-white rounded-3xl border border-[#D4A574]/20 p-8 shadow-xl relative z-10 text-center space-y-6"
                >
                    <div className="w-20 h-20 bg-[#1E3F20] rounded-2xl mx-auto flex items-center justify-center text-4xl shadow-md border border-[#EADFC9]/20">
                        🍵
                    </div>
                    <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-[#8C6239] tracking-[0.25em]">Group Order</span>
                        <h2 className="font-serif text-2xl font-black text-gray-900 tracking-tight">
                            Matchaboy Collaborative
                        </h2>
                        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                            Bergabunglah dalam pesanan bersama yang dibuat oleh <span className="font-bold text-gray-800">{creatorName}</span>. Silakan masukkan nama panggilanmu.
                        </p>
                    </div>

                    <form onSubmit={handleJoin} className="space-y-4">
                        <div className="text-left space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Nama Lengkap / Panggilan
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">👤</span>
                                <input
                                    type="text"
                                    placeholder="Contoh: Andi, Budi, Susi"
                                    required
                                    maxLength={25}
                                    value={nameInput}
                                    onChange={(e) => setNameInput(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-3.5 rounded-xl gradient-brand text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            Bergabung Pesan <ChevronRight className="w-4 h-4" />
                        </button>
                    </form>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FAF8F5] pb-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(212,235,214,0.35)_0%,_rgba(250,248,245,0)_60%)] pointer-events-none z-0" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.01)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(0,0,0,0.01)_1px,_transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0 opacity-40" />

            {/* Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div 
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 20, opacity: 1 }}
                        exit={{ y: -50, opacity: 0 }}
                        className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-2 font-bold text-xs border ${
                            toast.type === 'success' 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                : 'bg-rose-50 border-rose-200 text-rose-800'
                        }`}
                    >
                        {toast.type === 'success' ? '✅' : '⚠️'} {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Collaborative Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-[#EADFC9]/30 sticky top-0 z-50 px-4 py-3">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#1E3F20] rounded-xl flex items-center justify-center text-xl shadow-md border border-[#EADFC9]/20">
                            🍵
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                <h1 className="font-serif text-lg font-black text-gray-900 leading-none">Group Cart</h1>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                Dibuat oleh <span className="font-bold text-gray-800">{creatorName}</span> • Anggota Anda: <span className="font-bold text-[#8C6239]">{memberName}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopyLink}
                            className="px-3.5 py-2 rounded-xl bg-[#FAF8F5] hover:bg-[#EADFC9]/20 border border-[#D4A574]/20 text-xs font-bold text-gray-700 flex items-center gap-1.5 transition-all"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-600" />}
                            Salin Link
                        </button>
                        <button
                            onClick={handleShareWA}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                        >
                            <MessageCircle className="w-3.5 h-3.5" />
                            Undang Teman
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
                {/* Storefront Menu (8 cols on desktop) */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Menu Header with Category Tabs */}
                    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="font-serif font-black text-lg text-gray-900">Browse Menu Matchaboy</h2>
                                <p className="text-xs text-muted-foreground">Silakan pilih minuman premium dan tambahkan langsung ke keranjang bersama.</p>
                            </div>

                            {/* Search bar */}
                            <div className="relative w-full md:w-64">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">🔍</span>
                                <input
                                    type="text"
                                    placeholder="Cari matcha..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-border bg-[#FAF8F5] focus:outline-none focus:border-brand-500"
                                />
                            </div>
                        </div>

                        {/* Category tabs */}
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            {categories.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => setActiveCategory(c.id)}
                                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 border ${
                                        activeCategory === c.id
                                            ? 'bg-[#1E3F20] text-white border-[#1E3F20] shadow-sm'
                                            : 'bg-[#FAF8F5] text-muted-foreground border-border hover:border-[#D4A574]/40'
                                    }`}
                                >
                                    {c.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Products Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {filteredProducts.map((p) => {
                            const isSoldOut = p.badge === 'sold-out'
                            return (
                                <div
                                    key={p.id}
                                    onClick={() => openProductCustomizer(p)}
                                    className={`bg-white rounded-[2rem] border border-gray-150 p-4 flex flex-col justify-between transition-all duration-300 relative group overflow-hidden ${
                                        isSoldOut 
                                            ? 'opacity-60 cursor-not-allowed'
                                            : 'hover:border-[#B48A5E]/40 hover:shadow-lg hover:-translate-y-1 cursor-pointer'
                                    }`}
                                >
                                    <div>
                                        {/* Product image */}
                                        {p.image && (
                                            <div className="relative w-full aspect-square rounded-[1.5rem] overflow-hidden bg-brand-50 mb-3 border border-[#EADFC9]/20 shadow-inner">
                                                <Image
                                                    src={p.image}
                                                    alt={p.name}
                                                    fill
                                                    sizes="(max-width: 768px) 150px, 200px"
                                                    className={`object-cover group-hover:scale-105 transition-transform duration-500 ${isSoldOut ? 'grayscale brightness-50' : ''}`}
                                                />
                                                {isSoldOut && (
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                        <span className="bg-black/80 text-white font-extrabold text-[8px] px-2 py-0.5 rounded-md tracking-wider uppercase">Habis</span>
                                                    </div>
                                                )}
                                                {p.badge && p.badge !== 'sold-out' && (
                                                    <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[8px] font-black uppercase tracking-wider leading-none shadow-sm">
                                                        {p.badge}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        <h3 className="font-serif font-black text-xs text-gray-900 leading-snug line-clamp-1 group-hover:text-[#1E3F20] transition-colors">
                                            {p.name}
                                        </h3>
                                        <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1 leading-normal">
                                            {p.description}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between mt-3.5">
                                        <span className="font-bold text-xs text-[#B48A5E]">
                                            {formatRupiah(p.price)}
                                        </span>
                                        {!isSoldOut && (
                                            <span className="w-7 h-7 bg-[#1E3F20] hover:bg-[#152C16] text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-md transition-all">
                                                +
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Siapa Pesan Apa & Split Bill (4 cols on desktop) */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Live Grid: Siapa Pesan Apa */}
                    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="font-serif font-black text-sm text-gray-900 flex items-center gap-2">
                                <Users className="w-4.5 h-4.5 text-[#1E3F20]" /> Siapa Pesan Apa
                            </h3>
                            <span className="bg-emerald-50 text-emerald-800 font-extrabold text-[8px] px-2 py-0.5 rounded-full tracking-wider uppercase flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" /> Live
                            </span>
                        </div>

                        {isLoadingCart && cartItems.length === 0 ? (
                            <div className="text-center py-6">
                                <Loader2 className="w-7 h-7 animate-spin text-[#1E3F20] mx-auto" />
                                <p className="text-[10px] text-muted-foreground mt-2">Memuat keranjang grup...</p>
                            </div>
                        ) : cartItems.length === 0 ? (
                            <div className="text-center py-8 bg-[#FAF8F5] rounded-2xl border border-dashed border-gray-250 p-4">
                                <p className="text-xl">🛒</p>
                                <p className="text-xs font-bold text-gray-800 mt-2">Keranjang masih kosong</p>
                                <p className="text-[10px] text-muted-foreground mt-1 max-w-xs mx-auto">Silakan pilih matcha dari menu di samping untuk mulai memesan bersama!</p>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {Object.entries(groupedItems).map(([name, items]) => {
                                    const isMe = name === memberName
                                    const memberTotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0)

                                    return (
                                        <div key={name} className="space-y-2 border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                                            {/* Member Name tag header */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-[10px] uppercase shadow-sm ${
                                                        isMe ? 'bg-[#1E3F20] text-white' : 'bg-[#EADFC9]/50 text-gray-700'
                                                    }`}>
                                                        {name.charAt(0)}
                                                    </span>
                                                    <span className={`text-xs font-black tracking-tight ${isMe ? 'text-gray-900 font-black' : 'text-gray-700'}`}>
                                                        {name} {isMe && '(Anda)'}
                                                    </span>
                                                </div>
                                                <span className="text-[11px] font-bold text-[#8C6239]">
                                                    {formatRupiah(memberTotal)}
                                                </span>
                                            </div>

                                            {/* Items list */}
                                            <div className="space-y-2.5 pl-8">
                                                {items.map((item) => {
                                                    const parsedModifiers = item.modifiers ? JSON.parse(item.modifiers) : null
                                                    return (
                                                        <div key={item.id} className="flex items-start justify-between gap-2 text-xs">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-baseline gap-1">
                                                                    <p className="font-bold text-gray-800 line-clamp-1 leading-snug">{item.product.name}</p>
                                                                    <span className="text-[10px] font-extrabold text-muted-foreground whitespace-nowrap">x{item.qty}</span>
                                                                </div>
                                                                {parsedModifiers?.modsString && (
                                                                    <p className="text-[9px] text-[#8C6239] font-medium leading-tight mt-0.5">
                                                                        {parsedModifiers.modsString}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-2 whitespace-nowrap">
                                                                <span className="font-bold text-gray-800 text-[11px]">{formatRupiah(item.price * item.qty)}</span>
                                                                {/* Only delete items that belong to the current member or if the user is the creator */}
                                                                {(isMe || isCreator) && (
                                                                    <button
                                                                        onClick={() => handleDeleteItem(item.id, item.product.name)}
                                                                        className="p-1 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-lg transition-all"
                                                                        title="Hapus menu ini"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Split-Bill & Checkout Summary */}
                    {cartItems.length > 0 && (
                        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-5">
                            <div>
                                <h3 className="font-serif font-black text-sm text-gray-900 flex items-center gap-2">
                                    💰 Ringkasan & Split Bill
                                </h3>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Estimasi pembagian pembayaran yang harus dibayar masing-masing anggota.</p>
                            </div>

                            {/* Split bill members table */}
                            <div className="space-y-2.5">
                                {splitBill.breakdown?.map((member: any) => (
                                    <div key={member.memberName} className="flex justify-between items-center text-xs">
                                        <div className="space-y-0.5">
                                            <p className="font-bold text-gray-800">{member.memberName}</p>
                                            <p className="text-[9px] text-muted-foreground font-semibold">Porsi: {member.sharePercentage}% dari subtotal</p>
                                        </div>
                                        <span className="font-extrabold text-gray-900">{formatRupiah(member.subtotal)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-gray-150 pt-4 space-y-2">
                                <div className="flex justify-between text-xs font-medium text-gray-500">
                                    <span>Subtotal Keranjang</span>
                                    <span className="font-bold">{formatRupiah(splitBill.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-xs font-black text-gray-900 border-t border-dashed border-gray-200 pt-3 text-sm">
                                    <span>Total Estimasi</span>
                                    <span className="text-[#1E3F20] text-base">{formatRupiah(splitBill.total)}</span>
                                </div>
                            </div>

                            {/* Action Button: Checkout integration */}
                            <div className="pt-2">
                                {isCreator ? (
                                    <button
                                        onClick={handleCreatorCheckout}
                                        className="w-full py-4 rounded-2xl gradient-brand text-white font-bold text-xs shadow-lg shadow-brand-700/20 active:shadow-md transition-all flex items-center justify-center gap-2 group"
                                    >
                                        Proses ke Checkout (Rp{splitBill.total.toLocaleString('id-ID')})
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                ) : (
                                    <div className="bg-[#FAF8F5] border border-gray-150 rounded-2xl p-4 text-center space-y-2">
                                        <div className="flex items-center justify-center gap-2 text-[#8C6239] font-bold text-xs">
                                            <Loader2 className="w-4 h-4 animate-spin text-[#8C6239]" />
                                            <span>Menunggu Creator Checkout...</span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground leading-normal">
                                            Pesanan bersama ini hanya bisa dicheckout oleh pembuat grup (<span className="font-bold text-gray-800">{creatorName}</span>). Anda masih bisa terus menambahkan menu minuman.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* PRODUCT CUSTOMIZER DIALOG (Dedicated Lightweight Modal) */}
            <AnimatePresence>
                {selectedProduct && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
                            onClick={closeProductCustomizer}
                        />

                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                            className="fixed z-[101] bottom-0 left-0 right-0 max-h-[90vh] bg-white rounded-t-3xl overflow-hidden flex flex-col shadow-2xl md:top-1/2 md:left-1/2 md:w-full md:max-w-md md:rounded-2xl md:max-h-[85vh] md:-translate-x-1/2 md:-translate-y-1/2"
                        >
                            {/* Drag handle (Mobile) */}
                            <div className="flex justify-center pt-3 pb-1 shrink-0 bg-white">
                                <div className="w-10 h-1 rounded-full bg-border" />
                            </div>

                            {/* Close button */}
                            <button
                                onClick={closeProductCustomizer}
                                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div className="overflow-y-auto flex-1 pb-safe">
                                {/* Image cover */}
                                {selectedProduct.image && (
                                    <div className="relative w-full aspect-[16/10] bg-brand-50">
                                        <Image
                                            src={selectedProduct.image}
                                            alt={selectedProduct.name}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                )}

                                <div className="p-5 space-y-5">
                                    <div>
                                        <h2 className="font-serif font-black text-lg text-gray-900">{selectedProduct.name}</h2>
                                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{selectedProduct.description}</p>
                                        <p className="text-xs font-black text-[#B48A5E] mt-2">{formatRupiah(selectedProduct.price)}</p>
                                    </div>

                                    {/* Modifiers form */}
                                    {selectedProduct.modifiers && (
                                        <div className="space-y-4 text-left">
                                            {/* Size modifiers */}
                                            {selectedProduct.modifiers.sizes && selectedProduct.modifiers.sizes.length > 0 && (
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ukuran Drink</label>
                                                    <div className="flex gap-2 flex-wrap">
                                                        {selectedProduct.modifiers.sizes.map((sz: any) => (
                                                            <button
                                                                key={sz.name}
                                                                onClick={() => {
                                                                    setSelectedSize(sz.name)
                                                                    setSelectedSizePrice(sz.price)
                                                                }}
                                                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                                                                    selectedSize === sz.name
                                                                        ? 'bg-[#1E3F20] text-white border-[#1E3F20]'
                                                                        : 'bg-[#FAF8F5] text-muted-foreground border-border hover:border-brand-400'
                                                                }`}
                                                            >
                                                                {sz.name} {sz.price > 0 && `(+${formatRupiah(sz.price)})`}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Ice option */}
                                            {selectedProduct.modifiers.iceLevel && selectedProduct.modifiers.iceLevel.length > 0 && (
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ice Level</label>
                                                    <div className="flex gap-2 flex-wrap">
                                                        {selectedProduct.modifiers.iceLevel.map((lvl: string) => (
                                                            <button
                                                                key={lvl}
                                                                onClick={() => setSelectedIce(lvl)}
                                                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                                                                    selectedIce === lvl
                                                                        ? 'bg-[#1E3F20] text-white border-[#1E3F20]'
                                                                        : 'bg-[#FAF8F5] text-muted-foreground border-border hover:border-brand-400'
                                                                }`}
                                                            >
                                                                {lvl}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Sugar option */}
                                            {selectedProduct.modifiers.sugarLevel && selectedProduct.modifiers.sugarLevel.length > 0 && (
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sugar Level</label>
                                                    <div className="flex gap-2 flex-wrap">
                                                        {selectedProduct.modifiers.sugarLevel.map((lvl: string) => (
                                                            <button
                                                                key={lvl}
                                                                onClick={() => setSelectedSugar(lvl)}
                                                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                                                                    selectedSugar === lvl
                                                                        ? 'bg-[#1E3F20] text-white border-[#1E3F20]'
                                                                        : 'bg-[#FAF8F5] text-muted-foreground border-border hover:border-brand-400'
                                                                }`}
                                                            >
                                                                {lvl}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Add Ons */}
                                            {selectedProduct.modifiers.addOns && selectedProduct.modifiers.addOns.length > 0 && (
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Add Toppings</label>
                                                    <div className="space-y-2">
                                                        {selectedProduct.modifiers.addOns.map((addon: any) => {
                                                            const isSelected = selectedAddOns.some(a => a.id === addon.id)
                                                            return (
                                                                <button
                                                                    key={addon.id}
                                                                    onClick={() => toggleAddOn(addon)}
                                                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold transition-all ${
                                                                        isSelected 
                                                                            ? 'bg-emerald-50/50 border-emerald-500 text-emerald-800' 
                                                                            : 'bg-[#FAF8F5] border-border text-gray-700 hover:border-brand-300'
                                                                    }`}
                                                                >
                                                                    <span className="flex items-center gap-2">
                                                                        <span className="text-base">{isSelected ? '✅' : '➕'}</span>
                                                                        {addon.name}
                                                                    </span>
                                                                    <span className="text-[#B48A5E] font-extrabold">+{formatRupiah(addon.price)}</span>
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Quantity and Action Button */}
                                    <div className="border-t border-gray-150 pt-4 flex items-center gap-4">
                                        <div className="flex items-center gap-2 bg-[#FAF8F5] rounded-xl p-1 border border-border">
                                            <button
                                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                                className="w-8 h-8 bg-white rounded-lg border border-border flex items-center justify-center font-bold"
                                            >
                                                -
                                            </button>
                                            <span className="w-6 text-center font-bold text-xs">{quantity}</span>
                                            <button
                                                onClick={() => setQuantity(quantity + 1)}
                                                className="w-8 h-8 bg-white rounded-lg border border-border flex items-center justify-center font-bold"
                                            >
                                                +
                                            </button>
                                        </div>

                                        <button
                                            onClick={handleAddToGroupCart}
                                            disabled={isAddingToCart}
                                            className="flex-1 py-3.5 rounded-xl gradient-brand text-white font-bold text-xs flex items-center justify-center gap-2"
                                        >
                                            {isAddingToCart ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                `Tambah ke Keranjang • ${formatRupiah(currentPrice)}`
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
