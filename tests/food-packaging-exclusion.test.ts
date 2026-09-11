/**
 * Food Packaging Exclusion & Plate Serving Compliance Test Suite
 * Validates that food items (served on plates) are completely exempt from cup packaging fees,
 * show Rp 0 packaging cost in HPP, do not deduct cup inventory stock, and display appropriate plate UI.
 */

import { describe, it, expect } from './test-framework';
import * as fs from 'fs';
import * as path from 'path';

describe('Tier 1.14: Food Packaging Fee Exemption & Plate Serving Compliance', () => {
  it('T1.14.1: RecipeHppModal sets zero cupCost for food items and displays plate serving tab', () => {
    const modalPath = path.resolve(
      process.cwd(),
      'src/components/admin/products/RecipeHppModal.tsx'
    );
    expect(fs.existsSync(modalPath)).toBeTruthy();

    const content = fs.readFileSync(modalPath, 'utf8');

    // isFood detection
    expect(content.includes('isFood = useMemo')).toBeTruthy();
    expect(content.includes("parsedModifiers?.productType === 'makanan'")).toBeTruthy();

    // Zero cup cost in calculations
    expect(content.includes('const cupCost = isFood ? 0 : cupRegularCost')).toBeTruthy();
    expect(content.includes('const cupCost = isFood ? 0 : cupJumboCost')).toBeTruthy();

    // Plate UI indicators
    expect(content.includes('Porsi Standar (Piring Dine-In)')).toBeTruthy();
    expect(content.includes('Bebas Biaya Kemasan')).toBeTruthy();
    expect(content.includes('Penyajian Makanan: <strong>Piring Dine-in</strong>')).toBeTruthy();
    expect(content.includes('Kemasan: Rp 0 (Piring)')).toBeTruthy();

    // Suppress cup packaging badge for food
    expect(content.includes('isCup && !isFood')).toBeTruthy();
  });

  it('T1.14.2: inventory-utils.ts exempts food items from cup packaging stock deduction', () => {
    const invPath = path.resolve(process.cwd(), 'src/lib/inventory-utils.ts');
    expect(fs.existsSync(invPath)).toBeTruthy();

    const content = fs.readFileSync(invPath, 'utf8');

    // Product query includes category
    expect(content.includes('category: true')).toBeTruthy();

    // isFood detection before cup deduction
    expect(content.includes("pMods.productType === 'makanan'")).toBeTruthy();
    expect(content.includes("catName.includes('makanan')")).toBeTruthy();

    // Conditional cup packaging deduction
    expect(content.includes('if (!isFood && !order.hasTumbler)')).toBeTruthy();
  });

  it('T1.14.3: ProductInspectorDrawer displays plate serving and zero packaging cost for food', () => {
    const drawerPath = path.resolve(
      process.cwd(),
      'src/components/admin/products/ProductInspectorDrawer.tsx'
    );
    expect(fs.existsSync(drawerPath)).toBeTruthy();

    const content = fs.readFileSync(drawerPath, 'utf8');

    // isFood detection in drawer
    expect(content.includes('isFood = useMemo')).toBeTruthy();

    // packagingCost is forced to 0 for food
    expect(content.includes('packagingCost = 0;')).toBeTruthy();

    // UI labels
    expect(content.includes('Piring Dine-in (Bebas Biaya Kemasan)')).toBeTruthy();
    expect(content.includes("isFood ? 'Keuntungan Kotor / Porsi' : 'Keuntungan Kotor / Cup'")).toBeTruthy();
  });

  it('T1.14.4: Brand integrity and Rule 7 compliance', () => {
    const modalPath = path.resolve(
      process.cwd(),
      'src/components/admin/products/RecipeHppModal.tsx'
    );
    const content = fs.readFileSync(modalPath, 'utf8');
    expect(content.includes('Matchaboy')).toBeFalsy();
  });
});
