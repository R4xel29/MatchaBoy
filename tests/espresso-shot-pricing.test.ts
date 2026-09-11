/**
 * Espresso Shot Pricing Compliance Test Suite
 * Validates that Double Shot is priced at Rp 3.000 and Triple Shot at Rp 6.000
 * across Storefront, POS Kasir, Cart Store, Checkout APIs, and Voice Dictionary.
 */

import { describe, it, expect } from './test-framework';
import * as fs from 'fs';
import * as path from 'path';
import { normalizeVoiceTranscript } from '../src/lib/voice-dictionary';

describe('Tier 1.12: Espresso Shot Pricing Compliance (Double 3k / Triple 6k)', () => {
  it('T1.12.1: CashierPOSClient DEFAULT_ESPRESSO_SHOTS defines Double Shot as 3000 and Triple Shot as 6000', () => {
    const posPath = path.resolve(process.cwd(), 'src/app/(admin)/admin/cashier/CashierPOSClient.tsx');
    expect(fs.existsSync(posPath)).toBeTruthy();

    const content = fs.readFileSync(posPath, 'utf8');
    expect(content.includes("{ name: 'Double Shot', shots: 2, price: 3000 }")).toBeTruthy();
    expect(content.includes("{ name: 'Triple Shot', shots: 3, price: 6000 }")).toBeTruthy();
    expect(content.includes("{ name: 'Double Shot', shots: 2, price: 5000 }")).toBeFalsy();
    expect(content.includes("{ name: 'Triple Shot', shots: 3, price: 10000 }")).toBeFalsy();
  });

  it('T1.12.2: ProductModal fallback availableShots defines Double Shot as 3000 and Triple Shot as 6000', () => {
    const modalPath = path.resolve(process.cwd(), 'src/components/storefront/ProductModal.tsx');
    expect(fs.existsSync(modalPath)).toBeTruthy();

    const content = fs.readFileSync(modalPath, 'utf8');
    expect(content.includes("{ name: 'Double Shot', price: 3000, label: 'Double Shot (+Rp 3.000)', shots: 2 }")).toBeTruthy();
    expect(content.includes("{ name: 'Triple Shot', price: 6000, label: 'Triple Shot (+Rp 6.000)', shots: 3 }")).toBeTruthy();
    expect(content.includes("{ name: 'Double Shot', price: 5000")).toBeFalsy();
    expect(content.includes("{ name: 'Triple Shot', price: 10000")).toBeFalsy();
  });

  it('T1.12.3: cart-store calcItemTotal fallback incorporates Double Shot (3000) and Triple Shot (6000)', () => {
    const cartStorePath = path.resolve(process.cwd(), 'src/stores/cart-store.ts');
    expect(fs.existsSync(cartStorePath)).toBeTruthy();

    const content = fs.readFileSync(cartStorePath, 'utf8');
    expect(content.includes("item.shot === 'Triple Shot' || item.shot === 'Triple' ? 6000")).toBeTruthy();
    expect(content.includes("item.shot === 'Double Shot' || item.shot === 'Double' ? 3000")).toBeTruthy();
  });

  it('T1.12.4: orders, checkout, and spmb route handlers enforce Double Shot 3000 and Triple Shot 6000', () => {
    const routes = [
      'src/app/api/orders/route.ts',
      'src/app/api/checkout/route.ts',
      'src/app/api/checkout/spmb/route.ts',
    ];

    for (const r of routes) {
      const fullPath = path.resolve(process.cwd(), r);
      expect(fs.existsSync(fullPath)).toBeTruthy();
      const content = fs.readFileSync(fullPath, 'utf8');

      expect(content.includes("item.shot === 'Triple Shot' || item.shot === 'Triple'")).toBeTruthy();
      expect(content.includes("shotAdjustment = 6000")).toBeTruthy();
      expect(content.includes("item.shot === 'Double Shot' || item.shot === 'Double'")).toBeTruthy();
      expect(content.includes("shotAdjustment = 3000")).toBeTruthy();
    }
  });

  it('T1.12.5: voice dictionary normalizes "double shoot" to "Double Shot" and "triple shoot" to "Triple Shot"', () => {
    const testDouble = normalizeVoiceTranscript('pesan kopi susu double shoot ya');
    expect(testDouble.includes('Double Shot')).toBeTruthy();

    const testTriple = normalizeVoiceTranscript('americano dingin triple shoot');
    expect(testTriple.includes('Triple Shot')).toBeTruthy();

    const testDobel = normalizeVoiceTranscript('kopi dobel shot');
    expect(testDobel.includes('Double Shot')).toBeTruthy();

    const testTripel = normalizeVoiceTranscript('kopi tripel shot');
    expect(testTripel.includes('Triple Shot')).toBeTruthy();
  });
});
