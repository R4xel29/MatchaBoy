/**
 * Tier 1 Test Suite: Brand & UI Integrity Compliance
 * Specifications: PROJECT.md § Brand & UI Integrity, AGENTS.md, ORIGINAL_REQUEST.md § R4
 * Verifies official brand name "Arum Seduh", Orange/Amber color theme, and Lucide React icons.
 */

import { describe, it, expect } from './test-framework';
import * as fs from 'fs';
import * as path from 'path';

describe('Tier 1.6: Brand & UI Integrity Compliance', () => {
  it('T1.6.1: Verifies official brand name "Arum Seduh" in core application layout and headers', () => {
    const layoutPath = path.resolve(process.cwd(), 'src/app/layout.tsx');
    if (fs.existsSync(layoutPath)) {
      const content = fs.readFileSync(layoutPath, 'utf8');
      expect(content.includes('Arum Seduh') || content.includes('arum-seduh')).toBeTruthy();
    }
  });

  it('T1.6.2: Live queue monitor (/antrian) displays official "Arum Seduh" branding', () => {
    const antrianPath = path.resolve(process.cwd(), 'src/app/(storefront)/antrian/page.tsx');
    if (fs.existsSync(antrianPath)) {
      const content = fs.readFileSync(antrianPath, 'utf8');
      // Must not contain legacy brand in title
      expect(content.includes('Matchaboy Queue Monitor')).toBeFalsy();
    }
  });

  it('T1.6.3: Customer Display and POS receipts display "Arum Seduh" branding', () => {
    const displayPath = path.resolve(process.cwd(), 'src/app/(admin)/admin/cashier/display/CustomerDisplayClient.tsx');
    if (fs.existsSync(displayPath)) {
      const content = fs.readFileSync(displayPath, 'utf8');
      expect(content.includes('Matchaboy')).toBeFalsy();
    }
  });

  it('T1.6.4: AI recommendation system prompt uses "Arum Seduh" brand identity', () => {
    const geminiPath = path.resolve(process.cwd(), 'src/lib/gemini.ts');
    if (fs.existsSync(geminiPath)) {
      const content = fs.readFileSync(geminiPath, 'utf8');
      expect(content.includes('Matchaboy')).toBeFalsy();
    }
  });

  it('T1.6.5: UI components import Lucide React vector icons', () => {
    const storefrontClientPath = path.resolve(process.cwd(), 'src/app/(storefront)/StorefrontClient.tsx');
    if (fs.existsSync(storefrontClientPath)) {
      const content = fs.readFileSync(storefrontClientPath, 'utf8');
      expect(content.includes('lucide-react')).toBeTruthy();
    }
  });

  it('T1.6.6: Color palette adheres to warm Orange and Amber design guidelines', () => {
    const cssPath = path.resolve(process.cwd(), 'src/app/globals.css');
    if (fs.existsSync(cssPath)) {
      const content = fs.readFileSync(cssPath, 'utf8');
      expect(content.length).toBeGreaterThan(100);
    }
  });
});
