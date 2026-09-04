import { prisma } from '@/lib/prisma';
import { formatRupiah } from '@/lib/utils';

export interface DiscountItemInput {
  productId: string;
  quantity: number;
  size?: string | null;
  sizePrice?: number;
  addOnIds?: string[];
  addOns?: Array<{ id: string; name?: string; price?: number }>;
  price?: number;
  basePrice?: number;
  [key: string]: any;
}

export interface ValidateDiscountParams {
  code?: string;
  voucherCode?: string;
  items?: DiscountItemInput[];
  cartItems?: DiscountItemInput[];
  subtotal: number;
  userId?: string | null;
  customerPhone?: string | null;
}

export interface DiscountValidationResult {
  valid: boolean;
  error?: string;
  message?: string;
  code?: string;
  discountAmount: number;
  type?: string;
  description?: string;
  voucherId?: string | null;
  templateId?: string | null;
  minPurchase?: number;
  maxDiscount?: number | null;
}

/**
 * Checks if a product is eligible for the voucher based on validProductIds JSON
 */
export function isProductValidForVoucher(
  productId: string,
  validProductIdsJson?: string | null
): boolean {
  if (!validProductIdsJson || validProductIdsJson === '[]') return true;
  try {
    const validIds: string[] = JSON.parse(validProductIdsJson);
    if (!Array.isArray(validIds) || validIds.length === 0) return true;
    return validIds.includes(productId);
  } catch {
    return true;
  }
}

/**
 * Universal validator and calculator for vouchers and voucher templates.
 */
export async function validateAndCalculateDiscount(
  params: ValidateDiscountParams
): Promise<DiscountValidationResult> {
  const rawCode = params.code || params.voucherCode;
  const items = params.items || params.cartItems || [];
  const subtotal = params.subtotal || 0;
  const userId = params.userId;
  const customerPhone = params.customerPhone;

  if (!rawCode || !rawCode.trim()) {
    return { valid: false, error: 'Kode diskon wajib diisi', message: 'Kode diskon wajib diisi', discountAmount: 0 };
  }

  const cleanCode = rawCode.trim().toUpperCase();

  // 1. Fetch products from DB to ensure secure price evaluation
  const productIds = (items || []).map((i) => i.productId);
  const dbProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });

  let matchedVoucher: any = null;
  let matchedTemplate: any = null;

  // 2. Try looking up personal User Voucher first if userId or customerPhone provided
  let effectiveUserId = userId;
  if (!effectiveUserId && customerPhone && customerPhone !== '-' && !customerPhone.startsWith('SPMB-PENDING')) {
    const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
    const userByPhone = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: customerPhone },
          { phone: cleanPhone },
          { phone: cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone },
        ],
      },
      select: { id: true },
    });
    if (userByPhone) {
      effectiveUserId = userByPhone.id;
    }
  }

  if (effectiveUserId) {
    matchedVoucher = await prisma.voucher.findFirst({
      where: {
        userId: effectiveUserId,
        isUsed: false,
        OR: [{ code: cleanCode }, { template: { code: cleanCode } }],
      },
      include: { template: true },
    });
  }

  // 3. If no personal voucher found, look up global VoucherTemplate by code
  if (!matchedVoucher) {
    matchedTemplate = await prisma.voucherTemplate.findUnique({
      where: { code: cleanCode },
    });
  } else if (matchedVoucher.template) {
    matchedTemplate = matchedVoucher.template;
  }

  if (!matchedVoucher && !matchedTemplate) {
    return {
      valid: false,
      error: `Kode promo "${cleanCode}" tidak ditemukan atau tidak valid`,
      discountAmount: 0,
    };
  }

  // 4. Validate Expiration
  const now = new Date();
  if (matchedVoucher?.expiresAt && matchedVoucher.expiresAt < now) {
    return { valid: false, error: 'Voucher ini sudah kedaluwarsa', discountAmount: 0 };
  }
  if (!matchedVoucher && matchedTemplate?.expiresAt && matchedTemplate.expiresAt < now) {
    return { valid: false, error: 'Masa berlaku kode promo ini sudah berakhir', discountAmount: 0 };
  }

  // 5. Validate Usage Limits on template (for general vouchers)
  if (!matchedVoucher && matchedTemplate?.usageLimit && matchedTemplate.usageLimit > 0) {
    if (matchedTemplate.usageCount >= matchedTemplate.usageLimit) {
      return { valid: false, error: 'Kuota pemakaian kode promo ini sudah habis', discountAmount: 0 };
    }
  }

  // 6. Validate Minimum Purchase
  const minPurchase = matchedTemplate?.minPurchase ?? matchedVoucher?.minPurchase ?? 0;
  if (subtotal < minPurchase) {
    return {
      valid: false,
      error: `Total belanja belum memenuhi syarat minimum pembelian (${formatRupiah(minPurchase)})`,
      discountAmount: 0,
    };
  }

  // 7. Calculate Discount Amount based on rules
  const templateType = matchedTemplate?.type || matchedVoucher?.type || 'DISCOUNT_RP';
  const validProductIdsJson = matchedTemplate?.validProductIds;
  let discountAmount = 0;

  // Calculate subtotal of eligible products and track individual unit prices
  let validProductsSubtotal = 0;
  let maxSingleUnitEligiblePrice = 0;
  let maxEligibleToppingPrice = 0;
  let maxEligibleSizePrice = 0;
  const eligibleUnitPrices: number[] = [];

  for (const item of (items || [])) {
    const isEligible = isProductValidForVoucher(item.productId, validProductIdsJson);
    const dbProduct = dbProducts.find((p) => p.id === item.productId);

    if (dbProduct) {
      let dbModifiers: any = {};
      if (dbProduct.modifiers) {
        try {
          dbModifiers = JSON.parse(dbProduct.modifiers);
        } catch {}
      }

      // Calculate base price
      let unitPrice = dbProduct.price;
      const sizePrice = Number(item.sizePrice) || 0;
      let addOnsTotal = 0;

      const addOnIds = item.addOnIds || (item.addOns ? item.addOns.map((a: any) => a.id) : []);
      if (addOnIds && Array.isArray(addOnIds) && dbModifiers.addOns) {
        for (const addOnId of addOnIds) {
          const validAddOn = dbModifiers.addOns.find((a: any) => a.id === addOnId);
          if (validAddOn) {
            addOnsTotal += validAddOn.price;
            if (isEligible && validAddOn.price > maxEligibleToppingPrice) {
              maxEligibleToppingPrice = validAddOn.price;
            }
          }
        }
      }

      unitPrice += sizePrice + addOnsTotal;
      const itemTotal = unitPrice * item.quantity;

      if (isEligible) {
        validProductsSubtotal += itemTotal;
        if (unitPrice > maxSingleUnitEligiblePrice) {
          maxSingleUnitEligiblePrice = unitPrice;
        }

        // Collect all individual units for quantity-based bundles (e.g. Beli 2 Gratis 1)
        const qty = Math.max(1, Number(item.quantity) || 1);
        for (let q = 0; q < qty; q++) {
          eligibleUnitPrices.push(unitPrice);
        }

        if (item.size && item.size !== 'Normal' && item.size !== 'Regular') {
          if (sizePrice > maxEligibleSizePrice) {
            maxEligibleSizePrice = sizePrice;
          }
        }
      }
    }
  }

  if (validProductIdsJson && validProductsSubtotal === 0) {
    return {
      valid: false,
      error: 'Kode promo ini tidak berlaku untuk menu yang Anda pilih',
      discountAmount: 0,
    };
  }

  const baseEligibleTotal = validProductIdsJson ? validProductsSubtotal : subtotal;

  if (templateType === 'DISCOUNT_PCT') {
    const pct = matchedTemplate?.discountValue ?? matchedVoucher?.discountAmount ?? 0;
    let computed = Math.round((baseEligibleTotal * pct) / 100);
    const maxDiscount = matchedTemplate?.maxDiscount;
    if (maxDiscount && maxDiscount > 0) {
      computed = Math.min(computed, maxDiscount);
    }
    discountAmount = Math.min(computed, subtotal);
  } else if (templateType === 'DISCOUNT_RP') {
    const fixedVal = matchedTemplate?.discountValue ?? matchedVoucher?.discountAmount ?? 0;
    discountAmount = Math.min(fixedVal, baseEligibleTotal, subtotal);
  } else if (templateType === 'B2G1' || templateType === 'BUY_X_GET_Y') {
    // Buy X Get Y: buyQty is configured in discountValue (default: 2 for B2G1)
    const rawBuyQty = matchedTemplate?.discountValue ?? matchedVoucher?.discountAmount ?? 2;
    const buyQty = rawBuyQty > 0 ? rawBuyQty : 2;
    const getQty = 1; // 1 free item per set
    const requiredSetQty = buyQty + getQty; // e.g. 2 + 1 = 3

    if (eligibleUnitPrices.length < requiredSetQty) {
      const shortage = requiredSetQty - eligibleUnitPrices.length;
      return {
        valid: false,
        error: `Promo Beli ${buyQty} Gratis ${getQty} memerlukan minimal ${requiredSetQty} produk di keranjang (${buyQty} berbayar + ${getQty} gratis). Silakan tambahkan ${shortage} produk lagi.`,
        message: `Tambahkan ${shortage} produk lagi untuk menikmati promo Beli ${buyQty} Gratis ${getQty}`,
        discountAmount: 0,
      };
    }

    // Number of free items based on complete bundle sets
    const numberOfFreeItems = Math.floor(eligibleUnitPrices.length / requiredSetQty) * getQty;

    // Sort ascending to get the CHEAPEST item(s) free (standard F&B business rule)
    const sortedPrices = [...eligibleUnitPrices].sort((a, b) => a - b);
    const maxDiscountCap = matchedTemplate?.maxDiscount ?? null;

    let computedDiscount = 0;
    for (let i = 0; i < numberOfFreeItems; i++) {
      let freeItemPrice = sortedPrices[i];
      if (maxDiscountCap && maxDiscountCap > 0) {
        freeItemPrice = Math.min(freeItemPrice, maxDiscountCap);
      }
      computedDiscount += freeItemPrice;
    }

    discountAmount = Math.min(computedDiscount, subtotal);
  } else if (templateType === 'FREE_DRINK') {
    const cap = matchedTemplate?.discountValue ?? matchedVoucher?.discountAmount ?? 25000;
    discountAmount = Math.min(cap, maxSingleUnitEligiblePrice || cap, subtotal);
  } else if (templateType === 'FREE_TOPPING') {
    discountAmount = Math.min(maxEligibleToppingPrice || 3000, subtotal);
  } else if (templateType === 'UPGRADE_SIZE') {
    discountAmount = Math.min(maxEligibleSizePrice || 3000, subtotal);
  } else if (templateType === 'REFERRAL_REWARD') {
    discountAmount = Math.min(matchedVoucher?.discountAmount || 25000, maxSingleUnitEligiblePrice || 25000, subtotal);
  } else {
    const val = matchedTemplate?.discountValue ?? matchedVoucher?.discountAmount ?? 0;
    discountAmount = Math.min(val, subtotal);
  }

  if (discountAmount <= 0) {
    return {
      valid: false,
      error: 'Potongan promo tidak dapat diterapkan pada kombinasi pesanan ini',
      discountAmount: 0,
    };
  }

  return {
    valid: true,
    code: cleanCode,
    discountAmount,
    type: templateType,
    description: matchedTemplate?.description || matchedVoucher?.description || `Diskon Promo ${cleanCode}`,
    voucherId: matchedVoucher?.id || null,
    templateId: matchedTemplate?.id || null,
    minPurchase,
    maxDiscount: matchedTemplate?.maxDiscount || null,
  };
}

/**
 * Apply voucher usage inside a database transaction
 */
export async function applyVoucherUsage(
  tx: any,
  params: string | {
    code: string;
    voucherId?: string | null;
    templateId?: string | null;
  }
) {
  const code = typeof params === 'string' ? params : params.code;
  const voucherId = typeof params === 'object' ? params.voucherId : undefined;
  const templateId = typeof params === 'object' ? params.templateId : undefined;
  const cleanCode = (code || '').trim().toUpperCase();

  if (voucherId) {
    await tx.voucher.update({
      where: { id: voucherId },
      data: { isUsed: true, usedAt: new Date() },
    });
    return;
  }

  // If voucherId not given, attempt updating voucher by code
  const personalVoucher = await tx.voucher.findFirst({
    where: { code: cleanCode, isUsed: false },
  });
  if (personalVoucher) {
    await tx.voucher.update({
      where: { id: personalVoucher.id },
      data: { isUsed: true, usedAt: new Date() },
    });
    return;
  }

  if (templateId) {
    await tx.voucherTemplate.update({
      where: { id: templateId },
      data: { usageCount: { increment: 1 } },
    });
  } else {
    await tx.voucherTemplate.updateMany({
      where: { code: cleanCode },
      data: { usageCount: { increment: 1 } },
    });
  }
}

/**
 * Revert voucher usage when order is cancelled or expired
 */
export async function revertVoucherUsage(tx: any, code: string | null | undefined) {
  if (!code) return;
  const cleanCode = code.trim().toUpperCase();

  try {
    // 1. Revert personal voucher if it was used
    const personalVoucher = await tx.voucher.findFirst({
      where: { code: cleanCode },
    });
    if (personalVoucher) {
      await tx.voucher.update({
        where: { id: personalVoucher.id },
        data: { isUsed: false, usedAt: null },
      });
    }

    // 2. Decrement template usage count
    const template = await tx.voucherTemplate.findFirst({
      where: { code: cleanCode },
    });
    if (template && template.usageCount > 0) {
      await tx.voucherTemplate.update({
        where: { id: template.id },
        data: { usageCount: { decrement: 1 } },
      });
    }
  } catch (err) {
    console.error(`[VOUCHER REVERT ERROR] Failed to revert voucher ${cleanCode}:`, err);
  }
}
