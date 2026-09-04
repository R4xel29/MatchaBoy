import { prisma } from '@/lib/prisma';
import { formatRupiah } from '@/lib/utils';
import type { Prisma } from '@prisma/client';

/**
 * Representasi item pesanan/keranjang untuk evaluasi diskon voucher.
 */
export interface DiscountItemInput {
  /** ID produk unik di database */
  productId: string;
  /** Kuantitas item yang dipesan */
  quantity: number;
  /** Ukuran cup (misal: 'Normal', 'Large', 'Jumbo') */
  size?: string | null;
  /** Harga tambahan ukuran */
  sizePrice?: number;
  /** Daftar ID topping / add-on terpilih */
  addOnIds?: string[];
  /** Daftar objek add-on lengkap terpilih */
  addOns?: Array<{ id: string; name?: string; price?: number }>;
  /** Harga per unit yang dikirim dari klien (akan divalidasi ulang dengan DB) */
  price?: number;
  /** Harga dasar produk sebelum penyesuaian */
  basePrice?: number;
  [key: string]: unknown;
}

/**
 * Parameter input untuk validasi dan kalkulasi diskon universal.
 */
export interface ValidateDiscountParams {
  /** Kode voucher umum atau personal */
  code?: string;
  /** Alias alternatif untuk kode voucher */
  voucherCode?: string;
  /** Daftar item pesanan untuk diverifikasi kelayakannya */
  items?: DiscountItemInput[];
  /** Alias alternatif daftar item keranjang */
  cartItems?: DiscountItemInput[];
  /** Total harga kotor sebelum diskon */
  subtotal: number;
  /** ID pengguna terdaftar (opsional untuk personal voucher) */
  userId?: string | null;
  /** Nomor telepon pelanggan (opsional untuk lookup user voucher otomatis di kasir) */
  customerPhone?: string | null;
}

/**
 * Hasil kalkulasi dan validasi diskon voucher.
 */
export interface DiscountValidationResult {
  /** Apakah voucher valid dan dapat diterapkan */
  valid: boolean;
  /** Pesan error jika tidak valid */
  error?: string;
  /** Pesan notifikasi ramah pengguna */
  message?: string;
  /** Kode voucher yang telah distandarisasi (UPPERCASE) */
  code?: string;
  /** Nominal potongan harga final yang dapat dipotongkan ke subtotal */
  discountAmount: number;
  /** Tipe skema promo (misal: 'DISCOUNT_RP', 'DISCOUNT_PCT', 'B2G1', dsb.) */
  type?: string;
  /** Deskripsi rincian promo untuk dicetak di struk */
  description?: string;
  /** ID voucher personal pengguna di database (jika ada) */
  voucherId?: string | null;
  /** ID template promo global di database (jika ada) */
  templateId?: string | null;
  /** Syarat minimum pembelanjaan untuk mengaktifkan promo */
  minPurchase?: number;
  /** Batas maksimal potongan diskon (khusus persentase atau B2G1) */
  maxDiscount?: number | null;
}

/**
 * Parameter untuk pemakaian voucher dalam transaksi database.
 */
export type ApplyVoucherParams =
  | string
  | {
      code: string;
      voucherId?: string | null;
      templateId?: string | null;
    };

/**
 * Memeriksa apakah suatu produk memenuhi syarat penggunaan voucher tertentu
 * berdasarkan konfigurasi JSON daftar ID produk yang diperbolehkan.
 *
 * @param {string} productId - ID produk yang akan diperiksa
 * @param {string | null} [validProductIdsJson] - String JSON array berisi ID produk yang valid (contoh: '["id1","id2"]')
 * @returns {boolean} `true` jika produk memenuhi syarat atau jika tidak ada batasan produk
 *
 * @example
 * ```typescript
 * const isValid = isProductValidForVoucher('prod-123', '["prod-123", "prod-456"]');
 * // returns true
 * ```
 */
export function isProductValidForVoucher(
  productId: string,
  validProductIdsJson?: string | null
): boolean {
  if (!validProductIdsJson || validProductIdsJson === '[]') return true;
  try {
    const validIds: unknown = JSON.parse(validProductIdsJson);
    if (!Array.isArray(validIds) || validIds.length === 0) return true;
    return validIds.includes(productId);
  } catch {
    return true;
  }
}

/**
 * Validator dan kalkulator universal diskon pesanan Arum Seduh.
 *
 * Fungsi ini bertindak sebagai satu-satunya *single source of truth* kalkulasi promo
 * baik untuk transaksi Checkout Online maupun POS Kasir.
 *
 * Karakteristik penting:
 * - Menilai ulang harga produk langsung dari database untuk mencegah manipulasi harga dari klien.
 * - Mendukung personal voucher (terikat ke User ID atau nomor telepon) dan voucher template umum.
 * - Mengecek masa berlaku (kadaluwarsa) dan kuota pemakaian (`usageLimit`).
 * - Menghitung diskon multi-skema: Persentase (`DISCOUNT_PCT`), Potongan Tetap (`DISCOUNT_RP`),
 *   Beli X Gratis Y (`B2G1`), Gratis Minuman (`FREE_DRINK`), Gratis Topping (`FREE_TOPPING`),
 *   dan Upgrade Ukuran (`UPGRADE_SIZE`).
 *
 * @param {ValidateDiscountParams} params - Data kode promo, keranjang item, dan identitas pembeli
 * @returns {Promise<DiscountValidationResult>} Hasil evaluasi diskon beserta nominal potongannya
 *
 * @example
 * ```typescript
 * const discount = await validateAndCalculateDiscount({
 *   code: 'DISKON10K',
 *   subtotal: 50000,
 *   items: [{ productId: 'prod-1', quantity: 2, price: 25000 }]
 * });
 * if (discount.valid) {
 *   console.log('Potongan:', discount.discountAmount);
 * }
 * ```
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

  type VoucherRecord = Prisma.VoucherGetPayload<{ include: { template: true } }>;
  type TemplateRecord = Prisma.VoucherTemplateGetPayload<Record<string, never>>;

  let matchedVoucher: VoucherRecord | null = null;
  let matchedTemplate: TemplateRecord | null = null;

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
 * Mencatat penggunaan voucher ke dalam basis data di dalam Prisma `$transaction`.
 *
 * Menandai personal voucher pengguna sebagai `isUsed = true`, atau
 * menginkremen kolom `usageCount` pada template voucher global.
 *
 * @param {Prisma.TransactionClient} tx - Klien transaksi aktif Prisma
 * @param {ApplyVoucherParams} params - Kode voucher atau objek ID rujukan
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * await prisma.$transaction(async (tx) => {
 *   await applyVoucherUsage(tx, { code: 'WELCOME10', templateId: 'tpl-1' });
 * });
 * ```
 */
export async function applyVoucherUsage(
  tx: Prisma.TransactionClient,
  params: ApplyVoucherParams
): Promise<void> {
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
 * Memulihkan kuota penggunaan voucher ketika suatu pesanan dibatalkan atau kedaluwarsa.
 *
 * Sesuai aturan **AGENTS.md Bagian 5 (INTEGRITAS PROMO & ROLLBACK DISKON)**:
 * Setiap pembatalan pesanan WAJIB memulihkan status voucher personal (`isUsed = false`)
 * maupun mengurangi kembali kuota `usageCount` pada voucher template.
 *
 * @param {Prisma.TransactionClient} tx - Klien transaksi aktif Prisma
 * @param {string | null | undefined} code - Kode promo yang ingin di-rollback
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * await prisma.$transaction(async (tx) => {
 *   await revertVoucherUsage(tx, order.voucherCode);
 * });
 * ```
 */
export async function revertVoucherUsage(
  tx: Prisma.TransactionClient,
  code: string | null | undefined
): Promise<void> {
  if (!code) return;
  const cleanCode = code.trim().toUpperCase();

  try {
    // 1. Pulihkan personal voucher jika pernah ditandai terpakai
    const personalVoucher = await tx.voucher.findFirst({
      where: { code: cleanCode },
    });
    if (personalVoucher) {
      await tx.voucher.update({
        where: { id: personalVoucher.id },
        data: { isUsed: false, usedAt: null },
      });
    }

    // 2. Kembalikan kuota pemakaian template global (decrement)
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
    console.error(`[VOUCHER REVERT ERROR] Gagal mengembalikan status voucher ${cleanCode}:`, err);
  }
}
