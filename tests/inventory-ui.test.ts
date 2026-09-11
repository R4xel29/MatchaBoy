/**
 * Inventory UI/UX Compliance & Feature Verification Test Suite
 * Validates Arum Seduh minimalist modern UI, KPI metrics, dual view tabs,
 * category filters, restock calculator, and brand adherence.
 */

import { describe, it, expect } from './test-framework';
import * as fs from 'fs';
import * as path from 'path';

describe('Tier 1.11: Inventory Modern Minimalist UI/UX Compliance', () => {
  it('T1.11.1: InventoryClient.tsx exists and adheres to Arum Seduh brand rules', () => {
    const clientPath = path.resolve(process.cwd(), 'src/app/(admin)/admin/inventory/InventoryClient.tsx');
    expect(fs.existsSync(clientPath)).toBeTruthy();

    const content = fs.readFileSync(clientPath, 'utf8');
    // Brand compliance: no Matchaboy brand name in UI text
    expect(content.includes('Matchaboy')).toBeFalsy();
    // Modern Orange/Amber palette
    expect(content.includes('from-orange-500 to-amber-500')).toBeTruthy();
    expect(content.includes('text-orange-600') || content.includes('text-amber-600')).toBeTruthy();
    // Lucide React icons
    expect(content.includes('lucide-react')).toBeTruthy();
    expect(content.includes('Package')).toBeTruthy();
    expect(content.includes('CupSoda')).toBeTruthy();
    expect(content.includes('Boxes')).toBeTruthy();
  });

  it('T1.11.2: InventoryClient includes 4 KPI summary cards', () => {
    const clientPath = path.resolve(process.cwd(), 'src/app/(admin)/admin/inventory/InventoryClient.tsx');
    const content = fs.readFileSync(clientPath, 'utf8');

    // Total Asset Value
    expect(content.includes('totalAssetValue')).toBeTruthy();
    expect(content.includes('Total Nilai Aset Gudang') || content.includes('Nilai Aset')).toBeTruthy();
    // Total Items & Breakdown
    expect(content.includes('totalItems')).toBeTruthy();
    expect(content.includes('rawMaterialsCount')).toBeTruthy();
    expect(content.includes('packagingCount')).toBeTruthy();
    // Low Stock Alert
    expect(content.includes('lowStockCount')).toBeTruthy();
    expect(content.includes('Perlu Restock') || content.includes('Stok Menipis')).toBeTruthy();
    // Cup Packaging Health
    expect(content.includes('Kesiapan Kemasan Cup')).toBeTruthy();
  });

  it('T1.11.3: InventoryClient provides dual view tabs (Items & Movements)', () => {
    const clientPath = path.resolve(process.cwd(), 'src/app/(admin)/admin/inventory/InventoryClient.tsx');
    const content = fs.readFileSync(clientPath, 'utf8');

    expect(content.includes("activeView === 'ITEMS'")).toBeTruthy();
    expect(content.includes("activeView === 'MOVEMENTS'")).toBeTruthy();
    expect(content.includes('Daftar Bahan Baku & Kemasan')).toBeTruthy();
    expect(content.includes('Riwayat Mutasi Stok')).toBeTruthy();
  });

  it('T1.11.4: InventoryClient supports category filters and smart sorting', () => {
    const clientPath = path.resolve(process.cwd(), 'src/app/(admin)/admin/inventory/InventoryClient.tsx');
    const content = fs.readFileSync(clientPath, 'utf8');

    // Category filters
    expect(content.includes("'ALL'")).toBeTruthy();
    expect(content.includes("'RAW'")).toBeTruthy();
    expect(content.includes("'PACKAGING'")).toBeTruthy();
    expect(content.includes("'LOW_STOCK'")).toBeTruthy();

    // Sort options
    expect(content.includes("'NAME_ASC'")).toBeTruthy();
    expect(content.includes("'STOCK_ASC'")).toBeTruthy();
    expect(content.includes("'STOCK_DESC'")).toBeTruthy();
    expect(content.includes("'VALUE_DESC'")).toBeTruthy();
  });

  it('T1.11.5: Restock modal supports live weighted-average cost preview and payment source selection', () => {
    const clientPath = path.resolve(process.cwd(), 'src/app/(admin)/admin/inventory/InventoryClient.tsx');
    const content = fs.readFileSync(clientPath, 'utf8');

    // Live preview
    expect(content.includes('Estimasi Rata-rata HPP Baru')).toBeTruthy();

    // Payment source selection
    expect(content.includes('restockData.source')).toBeTruthy();
    expect(content.includes('CASH_DRAWER')).toBeTruthy();
    expect(content.includes('BANK_TRANSFER')).toBeTruthy();
    expect(content.includes('Kas Laci (Tunai)')).toBeTruthy();
    expect(content.includes('Transfer Bank / Rekening')).toBeTruthy();
  });

  it('T1.11.6: Inventory page.tsx loads both ingredients and stockMovements server-side', () => {
    const pagePath = path.resolve(process.cwd(), 'src/app/(admin)/admin/inventory/page.tsx');
    expect(fs.existsSync(pagePath)).toBeTruthy();

    const content = fs.readFileSync(pagePath, 'utf8');
    expect(content.includes('prisma.ingredient.findMany')).toBeTruthy();
    expect(content.includes('prisma.stockMovement.findMany')).toBeTruthy();
    expect(content.includes('initialIngredients')).toBeTruthy();
    expect(content.includes('initialMovements')).toBeTruthy();
  });
});
