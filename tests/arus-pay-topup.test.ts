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
});


