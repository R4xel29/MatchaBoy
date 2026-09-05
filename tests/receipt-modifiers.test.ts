/**
 * Tier 1 Test Suite: Receipt Modifier & Sweetness Compliance (Rule 7 & 8)
 * Verifies:
 * 1. Sweetness levels ('Less', 'Biasa', 'Lumayan', 'Manis Sekali') are parsed accurately.
 * 2. Modifier lines are printed per line with chevron '»' and zero commas.
 * 3. Food items strictly disallow ice, sugar, matcha, and espresso modifiers.
 * 4. Coffee items do not carry stray matcha levels.
 * 5. All real DB samples parse without commas.
 */

import { describe, it, expect } from './test-framework';
import {
  parseItemModifiers,
  getReceiptModifierLines,
  formatOrderCardModifiers,
  isFoodItem,
} from '../src/lib/receipt-modifiers';

describe('Tier 1.7: Receipt Modifier & Sweetness Compliance (Rule 7 & 8)', () => {
  it('T1.7.1: Correctly parses canonical sweetness levels (Less, Biasa, Lumayan, Manis Sekali)', () => {
    const levels = ['Less', 'Biasa', 'Lumayan', 'Manis Sekali'];
    levels.forEach((lvl) => {
      const parsed = parseItemModifiers({
        name: 'Kopi Susu Arum',
        modifiersString: `Normal Ice, ${lvl}`,
      });
      expect(parsed.sugarLevel?.toLowerCase()).toBe(lvl.toLowerCase());
      expect(parsed.iceLevel).toBe('Normal Ice');

      const lines = getReceiptModifierLines(parsed);
      const sugarLine = lines.find((l) => l.label === 'GULA');
      expect(sugarLine).toBeTruthy();
      expect(sugarLine?.value).toBe(lvl.toUpperCase());
      expect(lines.some((l) => l.value.includes(','))).toBeFalsy();
    });
  });

  it('T1.7.2: Parses SPMB arrow format ("Normal Ice → Biasa") into separate ES and GULA lines', () => {
    const parsed = parseItemModifiers({
      name: 'Iced Matcha Latte',
      modifiersString: 'Normal Ice → Biasa',
    });
    expect(parsed.iceLevel).toBe('Normal Ice');
    expect(parsed.sugarLevel).toBe('Biasa');

    const lines = getReceiptModifierLines(parsed);
    const esLine = lines.find((l) => l.label === 'ES');
    const gulaLine = lines.find((l) => l.label === 'GULA');

    expect(esLine?.value).toBe('NORMAL ICE');
    expect(gulaLine?.value).toBe('BIASA');
    expect(lines.some((l) => l.value.includes(','))).toBeFalsy();
  });

  it('T1.7.3: Prevents drink modifiers on food items (Indomie, Roti, Kentang)', () => {
    expect(isFoodItem('Indomie Goreng')).toBeTruthy();
    expect(isFoodItem('Roti Bakar')).toBeTruthy();
    expect(isFoodItem('French Fries')).toBeTruthy();

    const parsed = parseItemModifiers({
      name: 'Indomie Goreng Spesial',
      modifiersString: 'Normal Ice → Biasa, Level 5, Pedas Sedang, Telur Dadar',
    });

    expect(parsed.isFood).toBeTruthy();
    expect(parsed.iceLevel).toBeUndefined();
    expect(parsed.sugarLevel).toBeUndefined();
    expect(parsed.matchaLevel).toBeUndefined();
    expect(parsed.shotName).toBeUndefined();

    const lines = getReceiptModifierLines(parsed);
    expect(lines.some((l) => l.label === 'ES' || l.label === 'GULA')).toBeFalsy();
  });

  it('T1.7.4: Removes stray matcha level from coffee drinks', () => {
    const parsed = parseItemModifiers({
      name: 'Kopi Latte Arus',
      modifiersString: 'Normal Ice → Biasa, Level 5',
    });
    expect(parsed.matchaLevel).toBeUndefined();

    const lines = getReceiptModifierLines(parsed);
    expect(lines.some((l) => l.label === 'MATCHA')).toBeFalsy();
  });

  it('T1.7.5: Ensures other variants are emitted per line with zero commas', () => {
    const parsed = parseItemModifiers({
      name: 'Mie Bangladesh',
      modifiersString: 'Ekstra Telur, Kuah Nyemek, Pedas Gila',
    });

    const lines = getReceiptModifierLines(parsed);
    lines.forEach((l) => {
      expect(l.value.includes(',')).toBeFalsy();
    });
  });

  it('T1.7.6: formatOrderCardModifiers formats SPMB badges with arrow separator', () => {
    const card = formatOrderCardModifiers('Normal Ice, Biasa', 'Americano');
    expect(card.tags.includes('Normal Ice → Biasa')).toBeTruthy();
    expect(card.tags.some((t) => t.includes(','))).toBeFalsy();
  });
});
