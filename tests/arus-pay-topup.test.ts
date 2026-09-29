import fs from 'fs';
import path from 'path';
import { describe, it, expect } from './test-framework';
import {
  calculateTopUpBonus,
  parsePromoPackages,
  isQrisTransactionExpired,
  generateServerQrSvgData,
  QRIS_EXPIRE_MINUTES,
  QRIS_EXPIRE_MS,
} from '../src/lib/wallet-utils';
import {
  formatReceiptPaymentMethod,
  calculateGrossReceiptSummary,
} from '../src/lib/receipt-modifiers';

describe('Tier 1.19: Arus Pay Top-Up Bug Fixes, Security & Admin Alignment', () => {
  const walletRoutePath = path.join(process.cwd(), 'src/app/api/user/wallet/route.ts');
  const adminWalletRoutePath = path.join(process.cwd(), 'src/app/api/admin/wallet/route.ts');
  const adminWalletClientPath = path.join(
    process.cwd(),
    'src/app/(admin)/admin/wallet/AdminWalletClient.tsx'
  );
  const dokuWebhookPath = path.join(process.cwd(), 'src/app/api/payment/doku-webhook/route.ts');
  const topUpOverlayPath = path.join(process.cwd(), 'src/components/storefront/TopUpOverlay.tsx');
  const storefrontClientPath = path.join(process.cwd(), 'src/app/(storefront)/StorefrontClient.tsx');
  const profileClientPath = path.join(process.cwd(), 'src/app/(storefront)/profile/ProfileClient.tsx');
  const checkoutPagePath = path.join(process.cwd(), 'src/app/(storefront)/checkout/page.tsx');
  const paymentMethodsRoutePath = path.join(process.cwd(), 'src/app/api/payment-methods/route.ts');
  const orderTrackingClientPath = path.join(process.cwd(), 'src/app/(storefront)/orders/[id]/OrderTrackingClient.tsx');

  it('T1.19.1: First-time top-up bonus packages give 50k->3k, 100k->5k, 200k->10k and migrate legacy 2-tier defaults', () => {
    const defaultPkgs = parsePromoPackages(null);
    expect(defaultPkgs.length).toBe(3);
    expect(defaultPkgs[0].amount).toBe(50000);
    expect(defaultPkgs[0].bonus).toBe(3000);
    expect(defaultPkgs[1].amount).toBe(100000);
    expect(defaultPkgs[1].bonus).toBe(5000);
    expect(defaultPkgs[2].amount).toBe(200000);
    expect(defaultPkgs[2].bonus).toBe(10000);

    // Legacy 2-package DB string auto-migrates to the new 3-tier bonus
    const migrated = parsePromoPackages('[{"amount":50000,"bonus":5000},{"amount":200000,"bonus":10000}]');
    expect(migrated.length).toBe(3);
    expect(migrated[0].bonus).toBe(3000);
    expect(migrated[1].amount).toBe(100000);
    expect(migrated[1].bonus).toBe(5000);
    expect(migrated[2].bonus).toBe(10000);

    // Verify first-time bonus calculation for 50k, 100k, 200k, and below-threshold 25k
    const b25 = calculateTopUpBonus(25000, true, {});
    expect(b25.bonusAmount).toBe(0);

    const b50 = calculateTopUpBonus(50000, true, {});
    expect(b50.bonusAmount).toBe(3000);
    expect(b50.bonusType).toBe('FIRST_TIME');

    const b100 = calculateTopUpBonus(100000, true, {});
    expect(b100.bonusAmount).toBe(5000);
    expect(b100.bonusType).toBe('FIRST_TIME');

    const b200 = calculateTopUpBonus(200000, true, {});
    expect(b200.bonusAmount).toBe(10000);
    expect(b200.bonusType).toBe('FIRST_TIME');

    // Repeat user gets regular percentage bonus (10% on >= 100k)
    const repeat100 = calculateTopUpBonus(100000, false, {});
    expect(repeat100.bonusAmount).toBe(10000);
    expect(repeat100.bonusType).toBe('REGULAR');
  });

  it('T1.19.2: QRIS 15-minute expiration logic, server-side QR matrix generation, and security removal of instant simulation in /api/user/wallet', () => {
    expect(QRIS_EXPIRE_MINUTES).toBe(15);
    expect(QRIS_EXPIRE_MS).toBe(15 * 60 * 1000);

    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    const sixteenMinsAgo = new Date(Date.now() - 16 * 60 * 1000);

    expect(
      isQrisTransactionExpired({
        paymentMethod: 'QRIS',
        status: 'PENDING',
        createdAt: tenMinsAgo,
      })
    ).toBe(false);

    expect(
      isQrisTransactionExpired({
        paymentMethod: 'QRIS',
        status: 'PENDING',
        createdAt: sixteenMinsAgo,
      })
    ).toBe(true);

    // Default missing/null paymentMethod on legacy QRIS records also expires after 15 mins
    expect(
      isQrisTransactionExpired({
        paymentMethod: null,
        status: 'PENDING',
        createdAt: sixteenMinsAgo,
      })
    ).toBe(true);

    // Offline and Bank do not auto-expire on 15-min QRIS rule
    expect(
      isQrisTransactionExpired({
        paymentMethod: 'OFFLINE',
        status: 'PENDING',
        createdAt: sixteenMinsAgo,
      })
    ).toBe(false);

    // Server-side QR SVG generator produces real QR matrix paths without client DOM
    const qrData = generateServerQrSvgData('ARUMSEDUH-QRIS|AS-TOPUP-TEST|50000|IDR');
    expect(qrData.svgPath.length > 500).toBe(true);
    expect(qrData.svgPath.startsWith('M')).toBe(true);
    expect(qrData.viewBoxSize >= 29).toBe(true);

    const content = fs.readFileSync(walletRoutePath, 'utf-8');
    expect(content).toContain('Content-Disposition');
    expect(content).toContain("searchParams.get('downloadQr') === '1'");
    expect(content).toContain('generateServerQrSvgData');
    expect(content).toContain("Simulasi pembayaran instan telah dinonaktifkan demi keamanan.");
    expect(content).toContain("Fitur unggah bukti pembayaran hanya tersedia untuk metode Transfer Bank.");
  });

  it('T1.19.3: TopUpOverlay enforces single method view, 15m QRIS timer, synchronous QR download, bank-only proof upload, Kasir Booth-only Salin Kode, auto-hide empty banks, and no simulation button', () => {
    const content = fs.readFileSync(topUpOverlayPath, 'utf-8');
    expect(content).not.toContain('handleSwitchMethodInPayment');
    expect(content).not.toContain('handleSimulatePayment');
    expect(content).not.toContain('Simulasi Lunas Instan');
    expect(content).toContain('hasBankOption');
    expect(content).toContain('Batas Waktu Pembayaran QRIS');
    expect(content).toContain('Khusus Transfer Bank');
    expect(content).toContain('Salin Kode');
    expect(content).toContain('Unduh Gambar QRIS');
    expect(content).toContain("downloadQr: '1'");
    expect(content).toContain('handleDownloadQr = () =>');
    // Rule 3: Zero OS emojis in TopUpOverlay
    expect(content).not.toContain('🎁');
    expect(content).not.toContain('🎉');
    expect(content).not.toContain('🔥');
    expect(content).not.toContain('🏪');
    expect(content).not.toContain('⚡');
  });

  it('T1.19.4: Admin Arus Pay and DOKU webhook align with user features, TOCTOU bonus recalculation, and fast queries', () => {
    const adminRoute = fs.readFileSync(adminWalletRoutePath, 'utf-8');
    const adminClient = fs.readFileSync(adminWalletClientPath, 'utf-8');
    const webhook = fs.readFileSync(dokuWebhookPath, 'utf-8');
    const storefront = fs.readFileSync(storefrontClientPath, 'utf-8');
    const profile = fs.readFileSync(profileClientPath, 'utf-8');
    const checkout = fs.readFileSync(checkoutPagePath, 'utf-8');

    expect(adminRoute).toContain('Promise.all');
    expect(adminRoute).toContain('isQrisTransactionExpired');
    expect(adminRoute).toContain('calculateTopUpBonus');
    expect(adminClient).toContain('Antrean Verifikasi Top-Up');
    expect(adminClient).toContain('Kode Tiket Kasir Booth');
    expect(adminClient).toContain('Periksa Bukti Transfer');
    expect(adminClient).toContain('Batas Waktu QRIS (15 Menit)');
    expect(adminClient).toContain('QRIS Kedaluwarsa');

    expect(webhook).toContain("invoiceNumber.startsWith('AS-TOPUP-')");
    expect(webhook).toContain('isQrisTransactionExpired');
    expect(webhook).toContain('calculateTopUpBonus');
    expect(storefront).toContain('Riwayat Transaksi Arus Pay');
    expect(profile).toContain('TopUpOverlay');
    expect(checkout).toContain('TopUpOverlay');
  });

  it('T1.19.5: Checkout UI/UX & Receipt (Struk) integrate Arus Pay (SALDO) and transparent discount breakdown', () => {
    expect(formatReceiptPaymentMethod('WALLET')).toBe('ARUS PAY (SALDO)');
    expect(formatReceiptPaymentMethod('CASH')).toBe('TUNAI');
    expect(formatReceiptPaymentMethod('COD')).toBe('BAYAR DI TEMPAT (COD)');
    expect(formatReceiptPaymentMethod('DOKU', '[Kanal DOKU: QRIS]')).toBe('DOKU (QRIS)');

    const summary = calculateGrossReceiptSummary({
      total: 18000,
      items: [{ price: 22000, qty: 1 }],
      voucherDiscount: 2000,
      pointsDiscount: 1000,
      hasTumbler: true,
      tumblerDiscount: 1000,
    });
    expect(summary.grossSubtotal).toBe(22000);
    expect(summary.voucherDiscount).toBe(2000);
    expect(summary.pointsDiscount).toBe(1000);
    expect(summary.tumblerDiscount).toBe(1000);
    expect(summary.finalTotal).toBe(18000);

    const paymentMethodsRoute = fs.readFileSync(paymentMethodsRoutePath, 'utf-8');
    expect(paymentMethodsRoute).toContain('wallet:');

    const checkout = fs.readFileSync(checkoutPagePath, 'utf-8');
    expect(checkout).toContain('Rincian Potongan Harga');
    expect(checkout).toContain('Sisa saldo setelah bayar:');
    expect(checkout).toContain("setPaymentMethod('WALLET')");
    expect(checkout).toContain("setPaymentMethod('QRIS')");
    expect(checkout).toContain("setPaymentMethod('COD')");
    expect(checkout.includes('Scan & Upload')).toBe(false);
    expect(checkout.includes('QRIS Manual')).toBe(false);

    const orderTracking = fs.readFileSync(orderTrackingClientPath, 'utf-8');
    expect(orderTracking).toContain('Struk & Rincian Pesanan');
    expect(orderTracking).toContain('Cetak Struk');
    expect(orderTracking).toContain('formatReceiptPaymentMethod');
  });

  it('T1.19.6: User Vouchers UI/UX Overhaul eliminates Voucher Pack confusion, supports allVouchers history, 1-click Klaim & Pakai, and Arum Seduh Orange/Amber compliance', () => {
    const userVouchersRoute = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/user/vouchers/route.ts'),
      'utf-8'
    );
    const claimVoucherRoute = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/user/vouchers/claim/route.ts'),
      'utf-8'
    );
    const voucherDetailClient = fs.readFileSync(
      path.join(process.cwd(), 'src/app/(storefront)/vouchers/[id]/VoucherDetailClient.tsx'),
      'utf-8'
    );
    const claimPage = fs.readFileSync(
      path.join(process.cwd(), 'src/app/(storefront)/vouchers/claim/page.tsx'),
      'utf-8'
    );
    const claimClient = fs.readFileSync(
      path.join(process.cwd(), 'src/app/(storefront)/vouchers/claim/ClaimVoucherClient.tsx'),
      'utf-8'
    );
    const profile = fs.readFileSync(profileClientPath, 'utf-8');
    const checkout = fs.readFileSync(checkoutPagePath, 'utf-8');

    // 1. API returns allVouchers and filters out system/quota-exhausted templates
    expect(userVouchersRoute).toContain('allVouchers');
    expect(userVouchersRoute).toContain('systemCodes');
    expect(userVouchersRoute).toContain('t.usageLimit > 0 && t.usageCount >= t.usageLimit');
    expect(claimVoucherRoute).toContain('template: true');

    // 2. Profile VouchersSection replaces "Voucher Pack" with "Klaim Promo Gratis" & 1-click "Klaim & Pakai"
    expect(profile).toContain('Klaim Promo Gratis');
    expect(profile).toContain('Klaim & Pakai');
    expect(profile).toContain('data.allVouchers || data.vouchers');
    expect(profile.includes('Tidak Ada Voucher Pack')).toBe(false);

    // 3. Checkout passes items & subtotal to validate-voucher and supports 1-click Klaim & Pakai
    expect(checkout).toContain('Klaim Promo Gratis');
    expect(checkout).toContain('Klaim & Pakai');
    expect(checkout).toContain('items: checkoutItems');
    expect(checkout).toContain('Sparkles, ShieldCheck, Receipt, Gift');
    expect(checkout.includes('Tidak ada voucher pack baru untuk diklaim')).toBe(false);

    // 4. VoucherDetailClient & ClaimVoucherClient adhere to Arum Seduh Orange/Amber & Lucide icons (zero green, zero OS emojis)
    expect(voucherDetailClient).toContain('Pakai Voucher Sekarang');
    expect(voucherDetailClient).toContain('Salin Kode');
    expect(voucherDetailClient.includes('#1E3A1A')).toBe(false);
    expect(voucherDetailClient.includes('#2E5A44')).toBe(false);
    expect(voucherDetailClient.includes('🍃')).toBe(false);
    expect(voucherDetailClient.includes('📋')).toBe(false);
    expect(voucherDetailClient.includes('🍵')).toBe(false);

    expect(claimPage).toContain('AlertTriangle');
    expect(claimPage).toContain('XCircle');
    expect(claimPage.includes('⚠️')).toBe(false);
    expect(claimPage.includes('✕')).toBe(false);

    expect(claimClient).toContain('Pakai Voucher Sekarang');
    expect(claimClient.includes('💡')).toBe(false);
  });

  it('T1.19.7: Storefront App & SPMB QRIS unify 15-minute expiry, guaranteed pure QR code display, and binary PNG download', () => {
    const orderUtils = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/order-utils.ts'),
      'utf-8'
    );
    const checkoutRoute = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/checkout/route.ts'),
      'utf-8'
    );
    const ordersRoute = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/orders/route.ts'),
      'utf-8'
    );
    const spmbCheckoutRoute = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/checkout/spmb/route.ts'),
      'utf-8'
    );
    const paymentClient = fs.readFileSync(
      path.join(process.cwd(), 'src/app/(storefront)/orders/[id]/payment/PaymentClient.tsx'),
      'utf-8'
    );
    const qrisClient = fs.readFileSync(
      path.join(process.cwd(), 'src/app/(storefront)/orders/[id]/qris/QrisClient.tsx'),
      'utf-8'
    );
    const spmbClient = fs.readFileSync(
      path.join(process.cwd(), 'src/app/(storefront)/spmb/SpmbClient.tsx'),
      'utf-8'
    );
    const orderTracking = fs.readFileSync(orderTrackingClientPath, 'utf-8');
    const walletRoute = fs.readFileSync(walletRoutePath, 'utf-8');

    // 1. 15-minute expiration across order-utils, checkout, orders, and SPMB
    expect(orderUtils).toContain('15 * 60 * 1000');
    expect(orderUtils).toContain('orderAgeMinutes >= 15');
    expect(checkoutRoute).toContain('15 * 60 * 1000');
    expect(checkoutRoute).toContain('buildFallbackQrisString(secureTotal)');
    expect(ordersRoute).toContain('15 * 60 * 1000');
    expect(ordersRoute).toContain('buildFallbackQrisString(secureTotal)');
    expect(spmbCheckoutRoute).toContain('15 * 60 * 1000');
    expect(spmbCheckoutRoute).toContain('buildFallbackQrisString(secureTotal)');

    // 2. Binary PNG attachment download with prefix support in /api/user/wallet
    expect(walletRoute).toContain('rawPrefix');
    expect(walletRoute).toContain('prisma.order.findUnique');

    // 3. PaymentClient, QrisClient, OrderTrackingClient, and SpmbClient use binary download & 15-min countdown & pure QR
    expect(paymentClient).toContain("prefix: 'ARUM_SEDUH'");
    expect(paymentClient).toContain('/api/user/wallet?');
    expect(paymentClient).toContain('Otomatis batal jika melewati 15 menit');
    expect(paymentClient).toContain('qrValueString');
    expect(paymentClient.includes('🍵')).toBe(false);
    expect(paymentClient.includes('✅')).toBe(false);

    expect(qrisClient).toContain("prefix: 'ARUM_SEDUH'");
    expect(qrisClient).toContain('/api/user/wallet?');
    expect(qrisClient).toContain('Batas Waktu Pembayaran QRIS (15 Menit)');
    expect(qrisClient).toContain('qrValueString');

    expect(orderTracking).toContain("prefix: 'ARUM_SEDUH'");
    expect(orderTracking).toContain('/api/user/wallet?');

    expect(spmbClient).toContain('/api/user/wallet?downloadQr=1&prefix=SPMB');
    expect(spmbClient).toContain('Otomatis batal jika melewati 15 menit');
    expect(spmbClient).toContain('effectiveSpmbQrContent');
  });

  it('T1.19.8: Arum Seduh 6-Digit PIN Protection enforced on every Arus Pay (WALLET) usage', () => {
    const pinRoute = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/user/setup/pin/route.ts'),
      'utf-8'
    );
    const pinModal = fs.readFileSync(
      path.join(process.cwd(), 'src/components/storefront/ArusPayPinModal.tsx'),
      'utf-8'
    );
    const setupPinClient = fs.readFileSync(
      path.join(process.cwd(), 'src/app/(setup)/setup-pin/SetupPinClient.tsx'),
      'utf-8'
    );
    const checkoutRoute = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/checkout/route.ts'),
      'utf-8'
    );
    const autoReorderRoute = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/auto-reorder/route.ts'),
      'utf-8'
    );
    const autoReorderOverlay = fs.readFileSync(
      path.join(process.cwd(), 'src/components/storefront/AutoReorderOverlay.tsx'),
      'utf-8'
    );
    const checkout = fs.readFileSync(checkoutPagePath, 'utf-8');
    const profile = fs.readFileSync(profileClientPath, 'utf-8');

    // 1. PIN API supports GET status, verify, change, and initial setup
    expect(pinRoute).toContain('return NextResponse.json({ hasPin })');
    expect(pinRoute).toContain("action === 'verify'");
    expect(pinRoute).toContain("action === 'change'");

    // 2. ArusPayPinModal uses Arum Seduh Orange/Amber branding and Lucide React icons
    expect(pinModal).toContain('Masukkan PIN Arum Seduh');
    expect(pinModal).toContain('Arum Seduh • Proteksi Arus Pay');
    expect(pinModal).toContain('from-orange-500 to-amber-500');
    expect(pinModal.includes('#1E3F20')).toBe(false);

    // 3. SetupPinClient explains Arus Pay protection with Orange/Amber palette
    expect(setupPinClient).toContain('Arus Pay');
    expect(setupPinClient).toContain('from-orange-500 to-amber-500');
    expect(setupPinClient.includes('#1E3F20')).toBe(false);

    // 4. Checkout & Auto-Reorder enforce PIN verification both client-side and server-side
    expect(checkoutRoute).toContain('PIN Arum Seduh tidak sesuai');
    expect(autoReorderRoute).toContain('PIN Arum Seduh tidak sesuai');
    expect(checkout).toContain('ArusPayPinModal');
    expect(checkout).toContain('setShowArusPayPinModal(true)');
    expect(autoReorderOverlay).toContain('ArusPayPinModal');
    expect(profile).toContain('ArusPayPinModal');
  });
});




