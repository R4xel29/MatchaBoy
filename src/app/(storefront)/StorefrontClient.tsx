'use client';

import { useState, useMemo } from 'react';
import { Hero } from '@/components/storefront/Hero';
import { CategoryTabs } from '@/components/storefront/CategoryTabs';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { ProductModal } from '@/components/storefront/ProductModal';
import { SearchOverlay } from '@/components/storefront/SearchOverlay';
import { ReferralPopup } from '@/components/storefront/ReferralPopup';
import { PointsWidget } from '@/components/storefront/PointsWidget';
import { useToast } from '@/components/ui/Toast';
import { useStorefrontContext } from './layout';
import type { Product, Category } from '@/types';
import Image from 'next/image';
import { formatRupiah } from '@/lib/utils';

export default function StorefrontClient({ 
  categories, 
  products,
  banners
}: { 
  categories: Category[]; 
  products: Product[];
  banners: any[];
}) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { searchOpen, setSearchOpen } = useStorefrontContext();
  const { showToast } = useToast();

  const hasBundles = useMemo(() => products.some(p => p.modifiers?.isBundle === true), [products]);

  const displayCategories = useMemo(() => {
    if (!hasBundles) return categories;
    const list = [...categories];
    // Insert 'bundle' category tab right after 'All' at index 1
    list.splice(1, 0, { id: 'bundle', name: 'Combo Hemat', slug: 'bundle' });
    return list;
  }, [categories, hasBundles]);

  const handleProductClick = (product: Product) => {
    if (product.badge === 'sold-out') return;
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleSearchSelect = (product: Product) => {
    if (product.badge === 'sold-out') return;
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  return (
    <>
      {/* Hero Section */}
      <Hero banners={banners} />

      {/* Points Progress Widget (only for logged-in users) */}
      <PointsWidget />

      {/* Category Navigation (Sticky) */}
      <CategoryTabs
        categories={displayCategories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      {/* Menu Section */}
      <section
        id="menu-section"
        className="px-4 sm:px-6 lg:px-8 py-6 pb-32 max-w-7xl mx-auto"
      >
        {/* Highlighted Bundle Section at the top when 'all' is active */}
        {activeCategory === 'all' && hasBundles && (
          <div className="mb-8 bg-gradient-to-br from-amber-50/20 via-brand-50/10 to-transparent p-5 rounded-3xl border border-brand-100/30">
            <div className="mb-4">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 text-[10px] font-bold uppercase tracking-wider">Spesial</span>
              <h3 className="font-heading font-bold text-lg text-foreground mt-1 flex items-center gap-1.5">
                <span>📦</span> Paket Combo Hemat
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Patungan lebih hemat, nikmat dinikmati bersama teman atau keluarga</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.filter(p => p.modifiers?.isBundle === true).map((product) => (
                <div 
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="bg-white rounded-2xl p-3.5 border border-brand-100/40 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer flex gap-3.5 group relative overflow-hidden"
                >
                  <div className="absolute top-2.5 right-2.5 z-10 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-extrabold shadow-sm">
                    Hemat
                  </div>
                  {product.image && (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-brand-50 shrink-0">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        sizes="80px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="flex-grow min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <h4 className="font-bold text-[14px] text-foreground leading-tight group-hover:text-brand-700 transition-colors line-clamp-1">{product.name}</h4>
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-tight">{product.description}</p>
                    </div>
                    <p className="font-black text-sm text-[#B48A5E] leading-none mt-2">{formatRupiah(product.price)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-5">
          <h2 className="font-heading font-bold text-2xl text-foreground">
            Our Menu
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Pilih dan nikmati matcha favoritmu
          </p>
        </div>

        <ProductGrid
          products={products}
          activeCategory={activeCategory}
          onProductClick={handleProductClick}
        />
      </section>

      {/* Product Customization Modal */}
      <ProductModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
        }}
        allProducts={products}
      />

      {/* Search Overlay */}
      <SearchOverlay
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onProductSelect={handleSearchSelect}
        products={products}
        categories={categories}
      />

      {/* Referral Popup */}
      {/* <ReferralPopup /> */}
    </>
  );
}
