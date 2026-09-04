import { formatRupiah } from './utils';

export interface ParsedItemModifier {
  isFood: boolean;
  iceLevel?: string;
  sugarLevel?: string;
  matchaLevel?: number;
  size?: string;
  shotName?: string;
  addOns: Array<{ name: string; price?: number }>;
  bundleSelections: Array<{ groupName?: string; productName?: string }>;
  promoText?: string;
  originalPrice?: number;
  promoDiscount?: number;
  otherVariants: string[];
}

export function isFoodItem(name: string): boolean {
  if (!name) return false;
  const n = name.toLowerCase();
  const foodKeywords = [
    'indomie', 'mie ', 'mie-', 'mie', 'nasi', 'snack', 'kentang', 'french fries', 'fries',
    'roti', 'toast', 'pisang', 'cireng', 'tahu', 'sosis', 'dimsum', 'platter',
    'ayam', 'pastry', 'croissant', 'donut', 'donat', 'singkong', 'burger',
    'croffle', 'waffle', 'bakso', 'makaroni', 'pasta', 'spaghetti', 'rice bowl',
    'makanan', 'cemilan', 'gorengan'
  ];
  return foodKeywords.some((kw) => n.includes(kw));
}

export function parseItemModifiers(item: {
  name: string;
  iceLevel?: string;
  sugarLevel?: string;
  matchaLevel?: number;
  size?: string;
  shotName?: string;
  addOns?: Array<{ name: string; price?: number }>;
  bundleSelections?: Array<{ groupName?: string; productName?: string }>;
  modifiersString?: string;
  originalPrice?: number;
  promoDiscount?: number;
  price?: number;
}): ParsedItemModifier {
  const isFood = isFoodItem(item.name);
  const nameLower = (item.name || '').toLowerCase();

  let iceLevel = isFood ? undefined : (item.iceLevel || undefined);
  let sugarLevel = isFood ? undefined : (item.sugarLevel || undefined);
  let matchaLevel = isFood ? undefined : (item.matchaLevel !== undefined && item.matchaLevel > 0 ? item.matchaLevel : undefined);
  let size = item.size || undefined;
  let shotName = isFood ? undefined : ((item.shotName && item.shotName !== 'Tanpa Shot') ? item.shotName : undefined);
  
  const addOns: Array<{ name: string; price?: number }> = item.addOns ? [...item.addOns] : [];
  const bundleSelections = item.bundleSelections ? [...item.bundleSelections] : [];
  const otherVariants: string[] = [];
  let promoText: string | undefined = undefined;

  // 1. Guard against crossed drink modifiers:
  // Kopi Latte / Espresso drinks should NEVER have matcha level
  const isCoffeeDrink = (nameLower.includes('kopi') || nameLower.includes('coffee') || nameLower.includes('espresso') || nameLower.includes('latte arus') || nameLower.includes('americano')) && !nameLower.includes('matcha');
  if (isCoffeeDrink) {
    matchaLevel = undefined;
  }

  // Pure Matcha drinks should NEVER default to Single Shot
  const isPureMatcha = nameLower.includes('matcha') && !nameLower.includes('kopi') && !nameLower.includes('coffee') && !nameLower.includes('espresso');
  if (isPureMatcha && shotName?.toLowerCase().includes('single shot')) {
    shotName = undefined;
  }

  // 2. Parse modifiersString if available
  if (item.modifiersString && typeof item.modifiersString === 'string') {
    // Split by comma or semicolon or newline
    const rawTokens = item.modifiersString.split(/[\n,]+/).map((t) => t.trim()).filter(Boolean);

    for (const token of rawTokens) {
      const lower = token.toLowerCase();

      // Check for Promo / Potongan
      if (lower.startsWith('potongan:') || lower.includes('potongan')) {
        promoText = token;
        continue;
      }

      // Check for Arrow format: "Ice → Sugar" (e.g. "Normal Ice → Biasa")
      if (token.includes('→') || token.includes('->')) {
        if (!isFood) {
          const parts = token.split(/→|->/).map((p) => p.trim());
          if (parts.length >= 2) {
            if (!iceLevel) iceLevel = parts[0];
            if (!sugarLevel) sugarLevel = parts[1];
          }
        }
        continue;
      }

      // Check for Ice
      if (lower.includes('ice') || lower.includes('dingin') || lower.includes('panas') || lower.includes('hot') || lower.includes('hangat')) {
        if (!isFood && !iceLevel) {
          iceLevel = token;
        }
        continue;
      }

      // Check for Sugar
      if (lower.includes('gula') || lower.includes('sugar') || lower === 'biasa' || lower === 'sedikit' || lower.includes('tanpa gula') || lower.includes('normal (100%)')) {
        if (!isFood && !sugarLevel) {
          sugarLevel = token;
        }
        continue;
      }

      // Check for Matcha Level
      const matchaMatch = lower.match(/(?:matcha\s*)?level\s*(\d+)/i);
      if (matchaMatch) {
        if (!isFood && !isCoffeeDrink && (matchaLevel === undefined || matchaLevel === 0)) {
          matchaLevel = parseInt(matchaMatch[1], 10);
        }
        continue;
      }

      // Check for Espresso Shot
      if (lower.includes('shot') || lower.includes('espresso')) {
        if (!isFood && !isPureMatcha && !shotName) {
          shotName = token;
        }
        continue;
      }

      // Check for Size
      if (lower === 'regular' || lower === 'large' || lower === 'medium' || lower === 'small' || lower.includes('upsize')) {
        if (!size) size = token;
        continue;
      }

      // Check for Add-on
      if (token.startsWith('+')) {
        addOns.push({ name: token.replace(/^\+\s*/, '') });
        continue;
      }

      // Skip redundant "Level" or defaults if already matched
      if (isFood) {
        if (!otherVariants.includes(token)) {
          otherVariants.push(token);
        }
      } else {
        if (!otherVariants.includes(token)) {
          otherVariants.push(token);
        }
      }
    }
  }

  // 3. Fallback promo text from originalPrice and promoDiscount or price difference
  const inferredDiscount = item.promoDiscount || (item.originalPrice && item.price && item.originalPrice > item.price ? item.originalPrice - item.price : 0);
  if (!promoText && inferredDiscount > 0) {
    promoText = `-${formatRupiah(inferredDiscount)} (Flash Sale)`;
  }

  return {
    isFood,
    iceLevel: isFood ? undefined : iceLevel,
    sugarLevel: isFood ? undefined : sugarLevel,
    matchaLevel: (isFood || isCoffeeDrink) ? undefined : matchaLevel,
    size,
    shotName: (isFood || isPureMatcha) ? undefined : shotName,
    addOns,
    bundleSelections,
    promoText,
    originalPrice: item.originalPrice,
    promoDiscount: inferredDiscount,
    otherVariants,
  };
}

export function getReceiptModifierLines(
  parsed: ParsedItemModifier,
  includePromo: boolean = true
): Array<{ label: string; value: string }> {
  const lines: Array<{ label: string; value: string }> = [];

  if (parsed.sugarLevel) {
    lines.push({ label: 'GULA', value: parsed.sugarLevel.toUpperCase() });
  }
  if (parsed.iceLevel) {
    lines.push({ label: 'ES', value: parsed.iceLevel.toUpperCase() });
  }
  if (parsed.matchaLevel !== undefined && parsed.matchaLevel > 0) {
    lines.push({ label: 'MATCHA', value: `LEVEL ${parsed.matchaLevel}` });
  }
  if (parsed.size) {
    lines.push({ label: 'UKURAN', value: parsed.size.toUpperCase() });
  }
  if (parsed.shotName) {
    lines.push({ label: 'SHOT', value: parsed.shotName.toUpperCase() });
  }
  if (parsed.addOns && parsed.addOns.length > 0) {
    parsed.addOns.forEach((a) => {
      lines.push({
        label: 'TOPPING',
        value: `+${a.name.toUpperCase()}${a.price ? ` (${formatRupiah(a.price)})` : ''}`,
      });
    });
  }
  if (parsed.bundleSelections && parsed.bundleSelections.length > 0) {
    parsed.bundleSelections.forEach((b) => {
      lines.push({
        label: 'PILIHAN',
        value: (b.productName || b.groupName || '').toUpperCase(),
      });
    });
  }
  if (parsed.otherVariants && parsed.otherVariants.length > 0) {
    lines.push({
      label: 'VARIAN',
      value: parsed.otherVariants.join(', ').toUpperCase(),
    });
  }
  if (includePromo && parsed.promoText) {
    let cleanPromo = parsed.promoText.replace(/^potongan:\s*/i, '').trim();
    if (!cleanPromo.startsWith('-') && !cleanPromo.toLowerCase().includes('=')) {
      cleanPromo = `-${cleanPromo}`;
    }
    lines.push({
      label: 'POTONGAN',
      value: cleanPromo,
    });
  }

  return lines;
}

export function formatOrderCardModifiers(
  modifiersString?: string | null,
  productName?: string
): {
  tags: string[];
  promoText?: string;
} {
  if (!modifiersString) return { tags: [] };
  const parsed = parseItemModifiers({
    name: productName || '',
    modifiersString,
  });

  const tags: string[] = [];

  if (!parsed.isFood) {
    if (parsed.iceLevel && parsed.sugarLevel) {
      tags.push(`${parsed.iceLevel} → ${parsed.sugarLevel}`);
    } else {
      if (parsed.iceLevel) tags.push(parsed.iceLevel);
      if (parsed.sugarLevel) tags.push(parsed.sugarLevel);
    }
    if (parsed.matchaLevel !== undefined && parsed.matchaLevel > 0) {
      tags.push(`Matcha Lvl ${parsed.matchaLevel}`);
    }
    if (parsed.size) tags.push(parsed.size);
    if (parsed.shotName) tags.push(parsed.shotName);
  }

  if (parsed.addOns && parsed.addOns.length > 0) {
    parsed.addOns.forEach((a) => tags.push(`+${a.name}`));
  }

  if (parsed.bundleSelections && parsed.bundleSelections.length > 0) {
    parsed.bundleSelections.forEach((b) => tags.push(b.productName || b.groupName || ''));
  }

  if (parsed.otherVariants && parsed.otherVariants.length > 0) {
    tags.push(...parsed.otherVariants);
  }

  return {
    tags,
    promoText: parsed.promoText,
  };
}

export const KNOWN_VOUCHER_TITLES: Record<string, string> = {
  SEDUH1K: 'Diskon Spesial Rp 1.000',
  WELCOME: 'Diskon Pengguna Baru',
  AXELGANTENG: 'Beli 1 Matcha diskon 80%',
  REFERRAL_REWARD: 'Reward Ajak Teman',
  FREE_TOPPING: 'Eco Milestone - Gratis 1 Topping',
  UPGRADE_SIZE: 'Eco Milestone - Free Upgrade Size',
  FREE_DRINK: 'Eco Milestone - 1 Minuman Gratis Pilihan',
  TUMBLER_REWARD: 'Eco Reward - Bawa Tumbler',
};

export interface ReceiptPricingSummary {
  grossSubtotal: number;
  totalFlashSaleDiscount: number;
  voucherDiscount: number;
  voucherCode?: string;
  voucherTitle?: string;
  voucherLabel: string;
  tumblerDiscount: number;
  deliveryFee: number;
  finalTotal: number;
  items: Array<{
    name: string;
    qty: number;
    unitOriginalPrice: number;
    unitFinalPrice: number;
    totalOriginalPrice: number;
    totalFinalPrice: number;
    unitDiscount: number;
    hasDiscount: boolean;
    modifiersString?: string;
    rawItem: any;
  }>;
}

/**
 * Universal calculator for receipt summaries ensuring mathematical transparency:
 * Gross Subtotal - Flash Sale - Voucher - Tumbler + Delivery = Final Total
 */
export function calculateGrossReceiptSummary(order: {
  subtotal?: number;
  total: number;
  deliveryFee?: number;
  discount?: number;
  voucherDiscount?: number;
  tumblerDiscount?: number;
  voucherCode?: string | null;
  voucherTitle?: string | null;
  items?: any[];
}): ReceiptPricingSummary {
  const items = order.items || [];
  let calculatedGrossSubtotal = 0;
  let calculatedTotalFlashSale = 0;

  const processedItems = items.map((item: any) => {
    const qty = Number(item.qty) || 1;
    const finalUnitPrice = Number(item.totalPrice || item.price) || 0;

    // Detect original price
    let originalUnitPrice = Number(item.originalPrice);
    if (!originalUnitPrice || isNaN(originalUnitPrice)) {
      if (item.promoDiscount && Number(item.promoDiscount) > 0) {
        originalUnitPrice = finalUnitPrice + Number(item.promoDiscount);
      } else if (item.product?.price && item.product.price > finalUnitPrice) {
        originalUnitPrice = item.product.price;
      } else {
        originalUnitPrice = finalUnitPrice;
      }
    }

    const unitDiscount = Math.max(0, originalUnitPrice - finalUnitPrice);
    const totalOriginalPrice = originalUnitPrice * qty;
    const totalFinalPrice = finalUnitPrice * qty;

    calculatedGrossSubtotal += totalOriginalPrice;
    calculatedTotalFlashSale += unitDiscount * qty;

    return {
      name: item.name || item.product?.name || 'Item',
      qty,
      unitOriginalPrice: originalUnitPrice,
      unitFinalPrice: finalUnitPrice,
      totalOriginalPrice,
      totalFinalPrice,
      unitDiscount,
      hasDiscount: unitDiscount > 0,
      modifiersString: item.modifiersString || item.modifiers || undefined,
      rawItem: item,
    };
  });

  // Ensure grossSubtotal is at least order.subtotal if DB already stored gross
  const grossSubtotal = Math.max(calculatedGrossSubtotal, Number(order.subtotal) || calculatedGrossSubtotal);
  const deliveryFee = Number(order.deliveryFee) || 0;
  const tumblerDiscount = Number(order.tumblerDiscount) || 0;
  const finalTotal = Number(order.total) || 0;

  // Compute remaining voucher discount
  let voucherDiscount = Number(order.voucherDiscount);
  if (!voucherDiscount || isNaN(voucherDiscount)) {
    // If order has discount field, check if it was voucher
    if (order.discount && order.discount > 0) {
      voucherDiscount = Math.max(0, order.discount - calculatedTotalFlashSale - tumblerDiscount);
    } else {
      // Calculate from gross subtotal and final total
      voucherDiscount = Math.max(
        0,
        grossSubtotal - calculatedTotalFlashSale - tumblerDiscount + deliveryFee - finalTotal
      );
    }
  }

  // Resolve voucher name/title from DB lookup or known dictionary
  const rawCode = order.voucherCode ? order.voucherCode.toString().trim() : undefined;
  let voucherTitle = order.voucherTitle || undefined;
  if (!voucherTitle && rawCode) {
    voucherTitle = KNOWN_VOUCHER_TITLES[rawCode.toUpperCase()];
  }

  let voucherLabel = 'Diskon Voucher';
  if (voucherTitle && rawCode && voucherTitle.toUpperCase() !== rawCode.toUpperCase()) {
    voucherLabel = `Diskon (${rawCode} - ${voucherTitle})`;
  } else if (voucherTitle) {
    voucherLabel = `Diskon (${voucherTitle})`;
  } else if (rawCode) {
    voucherLabel = `Diskon (${rawCode})`;
  }

  return {
    grossSubtotal,
    totalFlashSaleDiscount: calculatedTotalFlashSale,
    voucherDiscount,
    voucherCode: rawCode,
    voucherTitle,
    voucherLabel,
    tumblerDiscount,
    deliveryFee,
    finalTotal,
    items: processedItems,
  };
}

