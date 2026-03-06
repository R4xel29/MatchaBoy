'use client';

import { useState } from 'react';
import { Hero } from '@/components/storefront/Hero';
import { CategoryTabs } from '@/components/storefront/CategoryTabs';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { ProductModal } from '@/components/storefront/ProductModal';
import { CATEGORIES, PRODUCTS } from '@/lib/constants';
import type { Product } from '@/types';

export default function StorefrontPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleProductClick = (product: Product) => {
    if (product.badge === 'sold-out') return;
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  return (
    <>
      {/* Hero Section */}
      <Hero />

      {/* Category Navigation (Sticky) */}
      <CategoryTabs
        categories={CATEGORIES}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      {/* Menu Section */}
      <section
        id="menu-section"
        className="px-4 py-6 pb-32 max-w-2xl mx-auto"
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
          products={PRODUCTS}
          activeCategory={activeCategory}
          onProductClick={handleProductClick}
        />
      </section>

      {/* Product Customization Modal */}
      <ProductModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
