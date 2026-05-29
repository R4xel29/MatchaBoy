'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  Sparkles, 
  Award, 
  AlertCircle, 
  Coffee, 
  Croissant, 
  Flame, 
  RefreshCw, 
  Wifi, 
  Utensils 
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  category: string;
  categoryName?: string;
  categorySlug?: string;
  badge?: string; // 'best-seller', 'new', 'sold-out'
  modifiers?: any;
}

interface Category {
  id: string;
  slug: string;
  name: string;
}

const MAX_PRODUCTS_PER_COLUMN = 5;
const SLIDE_DURATION = 15000; // 15 seconds per slide
const POLLING_INTERVAL = 20000; // Poll every 20 seconds for updates

// Helper to get category icons
const getCategoryIcon = (slug: string, name: string) => {
  const s = (slug || name || '').toLowerCase();
  if (s.includes('matcha') || s.includes('beverage') || s.includes('minum') || s.includes('drink')) {
    return <span className="mr-3 text-4xl">🍵</span>;
  }
  if (s.includes('kopi') || s.includes('coffee')) {
    return <span className="mr-3 text-4xl">☕</span>;
  }
  if (s.includes('pastry') || s.includes('bakery') || s.includes('croissant') || s.includes('roti') || s.includes('snack')) {
    return <span className="mr-3 text-4xl">🥐</span>;
  }
  if (s.includes('cake') || s.includes('dessert') || s.includes('kue')) {
    return <span className="mr-3 text-4xl">🍰</span>;
  }
  if (s.includes('tea') || s.includes('teh')) {
    return <span className="mr-3 text-4xl">🫖</span>;
  }
  return <span className="mr-3 text-4xl">✨</span>;
};

// Formatter for IDR
const formatIDR = (price: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

export default function TVMenuBoard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastSynced, setLastSynced] = useState<Date>(new Date());
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [timeString, setTimeString] = useState<string>('');
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [mounted, setMounted] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  // Fetch menu data from public API
  const fetchMenuData = async () => {
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      
      if (data.products) {
        setProducts(data.products);
      }
      if (data.categories) {
        setCategories(data.categories);
      }
      setLastSynced(new Date());
      setIsOnline(true);
    } catch (err) {
      console.error('Error fetching products for TV Menu Board:', err);
      setIsOnline(false);
    } finally {
      setLoading(false);
    }
  };

  // Sync clock & mounting checks
  useEffect(() => {
    setMounted(true);
    fetchMenuData();

    // Clock update interval
    const clockInterval = setInterval(() => {
      const now = new Date();
      setTimeString(now.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false 
      }));
    }, 1000);

    // Polling interval
    const pollInterval = setInterval(() => {
      fetchMenuData();
    }, POLLING_INTERVAL);

    return () => {
      clearInterval(clockInterval);
      clearInterval(pollInterval);
    };
  }, []);

  // Columns & Slides dynamic calculations
  const slides = useMemo(() => {
    if (products.length === 0 || categories.length === 0) return [];

    interface MenuColumn {
      categoryName: string;
      categorySlug: string;
      products: Product[];
      partIndex?: number;
      totalParts?: number;
    }

    const columns: MenuColumn[] = [];

    // Group active products by category
    categories.forEach(cat => {
      const catProducts = products.filter(p => p.category === cat.id);
      if (catProducts.length === 0) return;

      // Sort products - active first, sold-out at bottom
      const sortedProducts = [...catProducts].sort((a, b) => {
        const aSold = a.badge === 'sold-out';
        const bSold = b.badge === 'sold-out';
        if (aSold && !bSold) return 1;
        if (!aSold && bSold) return -1;
        return 0;
      });

      // Split into beautifully sized sub-columns if there are too many products
      const totalParts = Math.ceil(sortedProducts.length / MAX_PRODUCTS_PER_COLUMN);
      for (let i = 0; i < totalParts; i++) {
        columns.push({
          categoryName: cat.name,
          categorySlug: cat.slug,
          products: sortedProducts.slice(i * MAX_PRODUCTS_PER_COLUMN, (i + 1) * MAX_PRODUCTS_PER_COLUMN),
          partIndex: totalParts > 1 ? i + 1 : undefined,
          totalParts: totalParts > 1 ? totalParts : undefined
        });
      }
    });

    if (columns.length === 0) return [];

    // Pair columns into Menu Pages (Left and Right columns)
    const menuPages: { left: MenuColumn; right: MenuColumn }[] = [];
    for (let i = 0; i < columns.length; i += 2) {
      const left = columns[i];
      // If there is only one column left, pair it with the first column or duplicate it elegantly
      const right = columns[i + 1] || columns[0];
      menuPages.push({ left, right });
    }

    return menuPages;
  }, [products, categories]);

  // Handle slide transitions and bottom progress bar animation
  useEffect(() => {
    if (slides.length <= 1) {
      setProgress(100);
      return;
    }

    setProgress(0);
    const stepTime = 100; // update progress every 100ms
    const totalSteps = SLIDE_DURATION / stepTime;
    let currentStep = 0;

    const progressInterval = setInterval(() => {
      currentStep++;
      const currentProgress = (currentStep / totalSteps) * 100;
      setProgress(currentProgress);

      if (currentStep >= totalSteps) {
        clearInterval(progressInterval);
        setCurrentPageIndex((prev) => (prev + 1) % slides.length);
      }
    }, stepTime);

    return () => clearInterval(progressInterval);
  }, [currentPageIndex, slides.length]);

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen w-full bg-[#09150E] text-[#FFFBF5] font-body flex flex-col justify-between overflow-hidden select-none noise">
      
      {/* BACKGROUND DECORATION: Glowing Ambient Mesh */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#D4A574]/5 blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-800/10 blur-[180px] pointer-events-none" />

      {/* HEADER: Zero Navbar layout designed strictly for Shop Display TVs */}
      <header className="relative z-10 w-full px-12 py-8 flex items-center justify-between border-b border-[#D4A574]/15 bg-[#09150E]/80 backdrop-blur-md">
        <div className="flex items-center space-x-6">
          <div className="h-16 w-16 rounded-full bg-[#D4A574]/15 border-2 border-[#D4A574] flex items-center justify-between p-1.5 shadow-[0_0_15px_rgba(212,165,116,0.2)]">
            <span className="text-3xl m-auto">🌿</span>
          </div>
          <div>
            <h1 className="text-4xl font-heading font-extrabold tracking-wider text-[#D4A574] uppercase">
              Matchaboy
            </h1>
            <p className="text-sm font-sans tracking-widest text-[#FFFBF5]/60 uppercase mt-0.5">
              Arum Seduh — Premium Matcha & Artisanal Bakery
            </p>
          </div>
        </div>

        {/* Real-time shop monitoring block */}
        <div className="flex items-center space-x-8">
          {/* Status Indicator */}
          <div className="flex items-center space-x-3 bg-[#0F2216] border border-emerald-500/25 px-5 py-2.5 rounded-xl">
            <span className={`h-3.5 w-3.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'} block`} />
            <span className="text-sm font-sans font-bold tracking-widest text-emerald-400/90 uppercase">
              {isOnline ? 'LIVE SYNCED' : 'OFFLINE MODE'}
            </span>
            <span className="text-xs font-sans text-[#FFFBF5]/40 ml-2">
              Last: {lastSynced.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
            </span>
          </div>

          {/* Large display digital clock */}
          <div className="flex items-center space-x-3 text-[#D4A574] font-mono text-3xl font-extrabold bg-[#0F2216] border border-[#D4A574]/20 px-6 py-2.5 rounded-xl shadow-inner">
            <Clock className="w-6 h-6 text-[#D4A574] animate-pulse" />
            <span>{timeString || '00:00:00'}</span>
          </div>
        </div>
      </header>

      {/* MAIN SCREEN AREA */}
      <main className="relative z-10 flex-grow w-full px-12 py-10 flex flex-col justify-center">
        {loading ? (
          /* SKELETON SCREEN: Premium shimmering blocks matching the board design */
          <div className="grid grid-cols-2 gap-12 w-full h-[70vh]">
            {[1, 2].map((col) => (
              <div key={col} className="bg-[#0F2216]/40 border border-[#D4A574]/15 rounded-3xl p-10 flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="h-12 w-2/3 bg-[#D4A574]/10 rounded-2xl animate-pulse" />
                  <div className="h-1 bg-[#D4A574]/15 w-full my-4" />
                  <div className="space-y-8 mt-8">
                    {[1, 2, 3, 4].map((item) => (
                      <div key={item} className="flex justify-between items-start">
                        <div className="space-y-3 w-3/4">
                          <div className="h-8 bg-[#FFFBF5]/10 rounded-xl w-1/2 animate-pulse" />
                          <div className="h-5 bg-[#FFFBF5]/5 rounded-xl w-3/4 animate-pulse" />
                        </div>
                        <div className="h-8 bg-[#D4A574]/10 rounded-xl w-20 animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : slides.length === 0 ? (
          /* EMPTY STATE */
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <Utensils className="w-20 h-20 text-[#D4A574]/40 mb-6" />
            <h2 className="text-4xl font-heading text-[#D4A574]">Menu Not Available</h2>
            <p className="text-lg text-white/60 mt-2 max-w-md">
              We are currently preparing our menu cards. Please refresh or check back later!
            </p>
          </div>
        ) : (
          /* ACTIVE TV BOARD LAYOUT WITH MOTION TRANSITIONS */
          <div className="h-[72vh] relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPageIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
                className="grid grid-cols-2 gap-12 w-full h-full"
              >
                {/* LEFT COLUMN */}
                <div className="bg-[#0E2015]/60 border border-[#D4A574]/20 backdrop-blur-md rounded-3xl p-10 flex flex-col shadow-[0_15px_35px_rgba(4,12,7,0.5)]">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      {getCategoryIcon(slides[currentPageIndex].left.categorySlug, slides[currentPageIndex].left.categoryName)}
                      <h2 className="text-4xl font-heading font-extrabold text-[#D4A574] tracking-wide uppercase">
                        {slides[currentPageIndex].left.categoryName}
                      </h2>
                    </div>
                    {slides[currentPageIndex].left.partIndex && (
                      <span className="text-lg font-sans font-bold text-[#D4A574]/70 bg-[#D4A574]/10 px-4 py-1.5 rounded-full border border-[#D4A574]/20">
                        {slides[currentPageIndex].left.partIndex} of {slides[currentPageIndex].left.totalParts}
                      </span>
                    )}
                  </div>
                  
                  {/* Decorative golden rule divider */}
                  <div className="relative h-[2px] bg-gradient-to-r from-[#D4A574] via-[#D4A574]/40 to-transparent w-full mb-8">
                    <div className="absolute top-1/2 left-0 transform -translate-y-1/2 w-3 h-3 bg-[#D4A574] rotate-45" />
                  </div>

                  {/* List of items */}
                  <div className="flex-grow flex flex-col justify-between space-y-6">
                    {slides[currentPageIndex].left.products.map((product) => {
                      const isSoldOut = product.badge === 'sold-out';
                      return (
                        <div 
                          key={product.id} 
                          className={`flex items-start justify-between relative transition-opacity duration-300 ${isSoldOut ? 'opacity-40' : 'opacity-100'}`}
                        >
                          <div className="space-y-1.5 w-3/4 pr-4">
                            <div className="flex items-center flex-wrap gap-3">
                              <h3 className={`text-3xl font-heading font-extrabold tracking-wide ${isSoldOut ? 'line-through text-white/50' : 'text-[#FFFBF5]'}`}>
                                {product.name}
                              </h3>
                              
                              {/* Display gorgeous badges */}
                              {product.badge === 'best-seller' && (
                                <span className="flex items-center text-xs font-sans font-extrabold px-3 py-1 bg-[#D4A574]/20 border border-[#D4A574] text-[#D4A574] rounded-full uppercase tracking-wider">
                                  <Award className="w-3.5 h-3.5 mr-1" />
                                  Best Seller
                                </span>
                              )}
                              {product.badge === 'new' && (
                                <span className="flex items-center text-xs font-sans font-extrabold px-3 py-1 bg-emerald-500/20 border border-emerald-500 text-emerald-400 rounded-full uppercase tracking-wider">
                                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                                  NEW
                                </span>
                              )}
                              {isSoldOut && (
                                <span className="flex items-center text-xs font-sans font-extrabold px-3 py-1 bg-red-950 border border-red-500 text-red-400 rounded-full uppercase tracking-wider shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                                  <AlertCircle className="w-3.5 h-3.5 mr-1" />
                                  SOLD OUT
                                </span>
                              )}
                            </div>
                            <p className="text-lg font-sans text-white/60 line-clamp-2 leading-relaxed">
                              {product.description}
                            </p>
                          </div>

                          <div className={`text-right font-mono text-3xl font-extrabold ${isSoldOut ? 'line-through text-white/40' : 'text-[#D4A574]'}`}>
                            {formatIDR(product.price)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="bg-[#0E2015]/60 border border-[#D4A574]/20 backdrop-blur-md rounded-3xl p-10 flex flex-col shadow-[0_15px_35px_rgba(4,12,7,0.5)]">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      {getCategoryIcon(slides[currentPageIndex].right.categorySlug, slides[currentPageIndex].right.categoryName)}
                      <h2 className="text-4xl font-heading font-extrabold text-[#D4A574] tracking-wide uppercase">
                        {slides[currentPageIndex].right.categoryName}
                      </h2>
                    </div>
                    {slides[currentPageIndex].right.partIndex && (
                      <span className="text-lg font-sans font-bold text-[#D4A574]/70 bg-[#D4A574]/10 px-4 py-1.5 rounded-full border border-[#D4A574]/20">
                        {slides[currentPageIndex].right.partIndex} of {slides[currentPageIndex].right.totalParts}
                      </span>
                    )}
                  </div>
                  
                  {/* Decorative golden rule divider */}
                  <div className="relative h-[2px] bg-gradient-to-r from-[#D4A574] via-[#D4A574]/40 to-transparent w-full mb-8">
                    <div className="absolute top-1/2 left-0 transform -translate-y-1/2 w-3 h-3 bg-[#D4A574] rotate-45" />
                  </div>

                  {/* List of items */}
                  <div className="flex-grow flex flex-col justify-between space-y-6">
                    {slides[currentPageIndex].right.products.map((product) => {
                      const isSoldOut = product.badge === 'sold-out';
                      return (
                        <div 
                          key={product.id} 
                          className={`flex items-start justify-between relative transition-opacity duration-300 ${isSoldOut ? 'opacity-40' : 'opacity-100'}`}
                        >
                          <div className="space-y-1.5 w-3/4 pr-4">
                            <div className="flex items-center flex-wrap gap-3">
                              <h3 className={`text-3xl font-heading font-extrabold tracking-wide ${isSoldOut ? 'line-through text-white/50' : 'text-[#FFFBF5]'}`}>
                                {product.name}
                              </h3>
                              
                              {/* Display gorgeous badges */}
                              {product.badge === 'best-seller' && (
                                <span className="flex items-center text-xs font-sans font-extrabold px-3 py-1 bg-[#D4A574]/20 border border-[#D4A574] text-[#D4A574] rounded-full uppercase tracking-wider">
                                  <Award className="w-3.5 h-3.5 mr-1" />
                                  Best Seller
                                </span>
                              )}
                              {product.badge === 'new' && (
                                <span className="flex items-center text-xs font-sans font-extrabold px-3 py-1 bg-emerald-500/20 border border-emerald-500 text-emerald-400 rounded-full uppercase tracking-wider">
                                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                                  NEW
                                </span>
                              )}
                              {isSoldOut && (
                                <span className="flex items-center text-xs font-sans font-extrabold px-3 py-1 bg-red-950 border border-red-500 text-red-400 rounded-full uppercase tracking-wider shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                                  <AlertCircle className="w-3.5 h-3.5 mr-1" />
                                  SOLD OUT
                                </span>
                              )}
                            </div>
                            <p className="text-lg font-sans text-white/60 line-clamp-2 leading-relaxed">
                              {product.description}
                            </p>
                          </div>

                          <div className={`text-right font-mono text-3xl font-extrabold ${isSoldOut ? 'line-through text-white/40' : 'text-[#D4A574]'}`}>
                            {formatIDR(product.price)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* FOOTER AREA */}
      <footer className="relative z-10 w-full mt-auto bg-[#07110C] border-t border-[#D4A574]/15">
        {/* PROGRESS BAR TIMER (Only shows when there are multiple slides to rotate) */}
        {slides.length > 1 && (
          <div className="w-full h-1.5 bg-[#09150E] relative overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-[#D4A574] via-[#E8C9A0] to-[#D4A574]"
              style={{ width: `${progress}%` }}
              transition={{ ease: 'linear' }}
            />
          </div>
        )}

        {/* PROMOTIONAL MARQUEE TICKER */}
        <div className="w-full py-4.5 overflow-hidden relative flex items-center bg-[#07110C]">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#07110C] to-transparent z-20 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#07110C] to-transparent z-20 pointer-events-none" />

          <div className="animate-marquee whitespace-nowrap flex space-x-16 text-lg font-sans font-bold tracking-wider text-[#FFFBF5]/80 uppercase">
            <span>🌿 100% Organic Premium Uji Japanese Matcha & Hojicha</span>
            <span>🥐 All pastries baked fresh in-house daily by our master baker</span>
            <span>🌍 Bring your own Eco-Tumbler to receive 10% eco-discount instantly!</span>
            <span>📱 Order ahead online or find us on Instagram @matchaboy.co 📸</span>
            <span>🌟 Free high-speed WiFi for all customers — matchaboy-guest / matcha2026</span>
            <span>🌿 100% Organic Premium Uji Japanese Matcha & Hojicha</span>
            <span>🥐 All pastries baked fresh in-house daily by our master baker</span>
            <span>🌍 Bring your own Eco-Tumbler to receive 10% eco-discount instantly!</span>
            <span>📱 Order ahead online or find us on Instagram @matchaboy.co 📸</span>
          </div>
        </div>
      </footer>

      {/* CUSTOM MARQUEE TAILWIND ANIMATION */}
      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: inline-flex;
          animation: marquee 35s linear infinite;
        }
      `}</style>
    </div>
  );
}
