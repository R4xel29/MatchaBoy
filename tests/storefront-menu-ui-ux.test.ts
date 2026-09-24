/**
 * Storefront Food & Beverage Menu UI/UX Compliance Test Suite (Desktop & Android/Mobile)
 * Validates interactive menu explorer, Grid/List view toggle, food vs beverage badges & modifier guards,
 * desktop split-layout vs mobile bottom-sheet modal, and cup-stock exemption for food items.
 */

import { describe, it, expect } from './test-framework';
import { getEffectiveProductDisplay } from '../src/lib/utils';
import * as fs from 'fs';
import * as path from 'path';

describe('Tier 1.18: Storefront Food & Beverage Menu UI/UX Compliance (Desktop & Android)', () => {
  it('T1.18.1: StorefrontClient implements interactive Menu Explorer with Type Tabs, Category Pills, and Grid/List Toggle', () => {
    const filePath = path.resolve(process.cwd(), 'src/app/(storefront)/StorefrontClient.tsx');
    expect(fs.existsSync(filePath)).toBeTruthy();
    const content = fs.readFileSync(filePath, 'utf8');

    // Interactive catalog explorer state & UI
    expect(content.includes('id="katalog-menu"')).toBeTruthy();
    expect(content.includes('Eksplorasi Menu Makanan & Minuman')).toBeTruthy();
    expect(content.includes('catalogTypeFilter')).toBeTruthy();
    expect(content.includes('catalogViewMode')).toBeTruthy();
    expect(content.includes("setCatalogViewMode('grid')")).toBeTruthy();
    expect(content.includes("setCatalogViewMode('list')")).toBeTruthy();

    // Food vs Beverage icon badges & transparent discount formula (Rule 8)
    expect(content.includes('UtensilsCrossed')).toBeTruthy();
    expect(content.includes('Minuman Segar')).toBeTruthy();
    expect(content.includes('Makanan & Cemilan')).toBeTruthy();
    expect(content.includes('{formatRupiah(originalPrice)} - {formatRupiah(discountAmount)} =')).toBeTruthy();

    // Brand integrity (Rule 1 & 2)
    expect(content.includes('Matchaboy')).toBeFalsy();
  });

  it('T1.18.2: SpmbClient implements Search, Type Filter Tabs, Grid/List View Toggle, and Rule 7 Modifier Formatting', () => {
    const filePath = path.resolve(process.cwd(), 'src/app/(storefront)/spmb/SpmbClient.tsx');
    expect(fs.existsSync(filePath)).toBeTruthy();
    const content = fs.readFileSync(filePath, 'utf8');

    // Search + Type Filter + View Mode Toggle
    expect(content.includes('menuSearch')).toBeTruthy();
    expect(content.includes('menuTypeFilter')).toBeTruthy();
    expect(content.includes('menuViewMode')).toBeTruthy();
    expect(content.includes("setMenuViewMode('grid')")).toBeTruthy();
    expect(content.includes("setMenuViewMode('list')")).toBeTruthy();

    // Rule 7 arrow separator for ice -> sugar & Rule 8 discount transparency
    expect(content.includes('`${item.iceLevel} → ${item.sugarLevel}`')).toBeTruthy();
    expect(content.includes('{formatRupiah(originalPrice)} - {formatRupiah(discountAmount)} =')).toBeTruthy();
    expect(content.includes('Matchaboy')).toBeFalsy();
  });

  it('T1.18.3: ProductModal implements Desktop 2-Column Split Layout, Mobile Swipeable Sheet, and Food Modifier Guards', () => {
    const filePath = path.resolve(process.cwd(), 'src/components/storefront/ProductModal.tsx');
    expect(fs.existsSync(filePath)).toBeTruthy();
    const content = fs.readFileSync(filePath, 'utf8');

    // Desktop 2-column split layout & mobile swipeable sheet
    expect(content.includes('md:grid md:grid-cols-12')).toBeTruthy();
    expect(content.includes('md:col-span-5')).toBeTruthy();
    expect(content.includes('md:col-span-7')).toBeTruthy();
    expect(content.includes("drag={isDesktop ? false : 'y'}")).toBeTruthy();

    // Food Serving Info Card & Beverage Modifier Guards (Rule 7)
    expect(content.includes('Penyajian Hidangan Makanan')).toBeTruthy();
    expect(content.includes('Bebas Biaya Cup')).toBeTruthy();
    expect(content.includes('if (isFood) return [];')).toBeTruthy();
    expect(content.includes('if (!product || isFood) return false;')).toBeTruthy();
    expect(content.includes('Matchaboy')).toBeFalsy();
  });

  it('T1.18.4: SearchOverlay implements Desktop Category Rail, Mobile Category Pills, Type Filter, and Grid/List Cards', () => {
    const filePath = path.resolve(process.cwd(), 'src/components/storefront/SearchOverlay.tsx');
    expect(fs.existsSync(filePath)).toBeTruthy();
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content.includes('lg:grid-cols-[220px_1fr]')).toBeTruthy();
    expect(content.includes("setViewMode('grid')")).toBeTruthy();
    expect(content.includes("setViewMode('list')")).toBeTruthy();
    expect(content.includes('MenuProductCard')).toBeTruthy();
    expect(content.includes('{formatRupiah(originalPrice)} - {formatRupiah(discountAmount)} = {formatRupiah(displayPrice)}')).toBeTruthy();
    expect(content.includes('Matchaboy')).toBeFalsy();
  });

  it('T1.18.5: getEffectiveProductDisplay exempts food items from cup-stock Jumbo surcharge and cup sold-out status', () => {
    const foodProduct = {
      id: 'food-1',
      name: 'Butter Croissant',
      price: 18000,
      category: 'makanan',
      modifiers: { productType: 'makanan' },
    };
    const drinkProduct = {
      id: 'drink-1',
      name: 'Signature Iced Matcha Latte',
      price: 22000,
      category: 'signature',
      modifiers: { productType: 'minuman' },
    };

    // Case 1: Regular cup out of stock, Jumbo cup available
    const regOutStock = { cupRegular: 0, cupJumbo: 15 };
    const foodDisplay1 = getEffectiveProductDisplay(foodProduct, regOutStock);
    const drinkDisplay1 = getEffectiveProductDisplay(drinkProduct, regOutStock);

    expect(foodDisplay1.isRegularOut).toBe(false);
    expect(foodDisplay1.displayPrice).toBe(18000);
    expect(foodDisplay1.sizeNotice).toBe(null);

    expect(drinkDisplay1.isRegularOut).toBe(true);
    expect(drinkDisplay1.displayPrice).toBe(25000);
    expect(drinkDisplay1.sizeNotice).toBe('Hanya Jumbo');

    // Case 2: Both Regular and Jumbo cups out of stock
    const bothOutStock = { cupRegular: 0, cupJumbo: 0 };
    const foodDisplay2 = getEffectiveProductDisplay(foodProduct, bothOutStock);
    const drinkDisplay2 = getEffectiveProductDisplay(drinkProduct, bothOutStock);

    expect(foodDisplay2.isBothOut).toBe(false);
    expect(foodDisplay2.isSoldOut).toBe(false);
    expect(drinkDisplay2.isBothOut).toBe(true);
    expect(drinkDisplay2.isSoldOut).toBe(true);
  });

  it('T1.18.6: Regression guards for ProductModal state persistence, mobile drag/scroll isolation, and SPMB/SearchOverlay category & bundle sync', () => {
    const modalContent = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/storefront/ProductModal.tsx'),
      'utf8'
    );
    expect(modalContent.includes('EMPTY_PRODUCTS')).toBeTruthy();
    expect(modalContent.includes('EMPTY_CATEGORIES')).toBeTruthy();
    expect(modalContent.includes('useDragControls')).toBeTruthy();
    expect(modalContent.includes('dragListener={false}')).toBeTruthy();
    expect(modalContent.includes('checkProductIsFood(optProduct, option.name)')).toBeTruthy();
    expect(
      modalContent.includes('packagingStock.cupRegular <= 0 && packagingStock.cupJumbo <= 0')
    ).toBeTruthy();

    const spmbContent = fs.readFileSync(
      path.resolve(process.cwd(), 'src/app/(storefront)/spmb/SpmbClient.tsx'),
      'utf8'
    );
    expect(spmbContent.includes('visibleCategories')).toBeTruthy();
    expect(spmbContent.includes('!isFood && !isBundle')).toBeTruthy();
    expect(spmbContent.includes('item.bundleSelections.map')).toBeTruthy();

    const searchContent = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/storefront/SearchOverlay.tsx'),
      'utf8'
    );
    expect(searchContent.includes('initialTypeFilter')).toBeTruthy();
    expect(searchContent.includes('productMatchesCategory')).toBeTruthy();
    expect(searchContent.includes('className="flex-1 overflow-y-auto pb-28 relative"')).toBeTruthy();
  });
});
