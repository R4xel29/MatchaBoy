'use client';

import { useState } from 'react';
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
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      {/* Menu Section */}
      <section
        id="menu-section"
        className="px-4 sm:px-6 lg:px-8 py-6 pb-32 max-w-7xl mx-auto"
      >
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
      <ReferralPopup />
    </>
  );
}
