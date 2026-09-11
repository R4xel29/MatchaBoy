/**
 * Recipe Print Sheet & Barista Guide Card A4 Compliance Test Suite
 * Validates 12 recipes per A4 sheet grid, pagination, modifier doses (Sweetness, Matcha, Espresso),
 * and Arum Seduh brand rules.
 */

import { describe, it, expect } from './test-framework';
import * as fs from 'fs';
import * as path from 'path';

describe('Tier 1.13: Recipe Print Sheet & Barista Guide Card A4 Compliance', () => {
  it('T1.13.1: RecipePrintModal.tsx exists and adheres to Arum Seduh brand rules', () => {
    const modalPath = path.resolve(
      process.cwd(),
      'src/components/admin/products/RecipePrintModal.tsx'
    );
    expect(fs.existsSync(modalPath)).toBeTruthy();

    const content = fs.readFileSync(modalPath, 'utf8');
    // Brand compliance
    expect(content.includes('Matchaboy')).toBeFalsy();
    expect(content.includes('ARUM SEDUH')).toBeTruthy();
    // Palette
    expect(content.includes('from-orange-500 to-amber-500')).toBeTruthy();
    // Lucide Icons
    expect(content.includes('lucide-react')).toBeTruthy();
    expect(content.includes('Printer')).toBeTruthy();
  });

  it('T1.12.2: Modal enforces 12 recipes per A4 sheet with 3x4 grid and pagination', () => {
    const modalPath = path.resolve(
      process.cwd(),
      'src/components/admin/products/RecipePrintModal.tsx'
    );
    const content = fs.readFileSync(modalPath, 'utf8');

    // 12 chunk size
    expect(content.includes('chunkSize = 12')).toBeTruthy();
    // 3 columns x 4 rows
    expect(content.includes('repeat(3, 1fr)')).toBeTruthy();
    expect(content.includes('repeat(4, 1fr)')).toBeTruthy();
    // A4 print CSS
    expect(content.includes('size: A4 portrait')).toBeTruthy();
    expect(content.includes('page-break-after: always')).toBeTruthy();
    expect(content.includes('#recipe-print-sheet-container')).toBeTruthy();
  });

  it('T1.12.3: Recipe cards display base ingredients and modifier doses (Sugar, Matcha, Shot)', () => {
    const modalPath = path.resolve(
      process.cwd(),
      'src/components/admin/products/RecipePrintModal.tsx'
    );
    const content = fs.readFileSync(modalPath, 'utf8');

    // Base ingredients
    expect(content.includes('Takaran Dasar')).toBeTruthy();
    // Sugar / Sweetness
    expect(content.includes('GULA / MANIS')).toBeTruthy();
    expect(content.includes('sugarDoses.less')).toBeTruthy();
    expect(content.includes('sugarDoses.lumayan')).toBeTruthy();
    expect(content.includes('sugarDoses.manisSekali')).toBeTruthy();
    // Matcha
    expect(content.includes('MATCHA (BUBUK)')).toBeTruthy();
    expect(content.includes('matchaDoses.bold')).toBeTruthy();
    // Espresso shot
    expect(content.includes('ESPRESSO SHOT')).toBeTruthy();
    expect(content.includes('shotDoses.triple')).toBeTruthy();
    // Rule 7 compliance for food items
    expect(content.includes('isFood')).toBeTruthy();
  });

  it('T1.12.4: AdminProductsClient integrates Cetak Resep Barista (A4) button and modal', () => {
    const clientPath = path.resolve(
      process.cwd(),
      'src/app/(admin)/admin/products/AdminProductsClient.tsx'
    );
    expect(fs.existsSync(clientPath)).toBeTruthy();

    const content = fs.readFileSync(clientPath, 'utf8');
    expect(content.includes('RecipePrintModal')).toBeTruthy();
    expect(content.includes('showRecipePrintModal')).toBeTruthy();
    expect(content.includes('Cetak Resep Barista (A4)')).toBeTruthy();
    expect(content.includes('<RecipePrintModal')).toBeTruthy();
  });
});
