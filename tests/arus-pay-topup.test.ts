import fs from 'fs';
import path from 'path';
import { describe, it, expect } from './test-framework';

describe('Tier 1.19: Arus Pay Top-Up Functional & UI/UX Compliance', () => {
  const walletRoutePath = path.join(process.cwd(), 'src/app/api/user/wallet/route.ts');
  const dokuWebhookPath = path.join(process.cwd(), 'src/app/api/payment/doku-webhook/route.ts');
  const topUpOverlayPath = path.join(process.cwd(), 'src/components/storefront/TopUpOverlay.tsx');
  const storefrontClientPath = path.join(process.cwd(), 'src/app/(storefront)/StorefrontClient.tsx');
  const profileClientPath = path.join(process.cwd(), 'src/app/(storefront)/profile/ProfileClient.tsx');
  const checkoutPagePath = path.join(process.cwd(), 'src/app/(storefront)/checkout/page.tsx');

  it('T1.19.1: /api/user/wallet supports fallback dynamic QRIS, bonus calculation, live status check, and sandbox simulation', () => {
    const content = fs.readFileSync(walletRoutePath, 'utf-8');
    expect(content).toContain('buildFallbackQrisString');
    expect(content).toContain('calculateTopUpBonus');
    expect(content).toContain('completeTopUpTransaction');
    expect(content).toContain("action === 'simulate'");
    expect(content).toContain("action === 'change_method'");
    expect(content).toContain("action === 'cancel'");
    expect(content).toContain('pendingTransactions');
  });

  it('T1.19.2: DOKU webhook handles both AS-TOPUP- and MB-TOPUP- invoice prefixes', () => {
    const content = fs.readFileSync(dokuWebhookPath, 'utf-8');
    expect(content).toContain("invoiceNumber.startsWith('AS-TOPUP-')");
    expect(content).toContain("invoiceNumber.startsWith('MB-TOPUP-')");
  });

  it('T1.19.3: TopUpOverlay uploads compressed WebP proofs to /api/upload (accessible to customers) and has 3-step receipt UX', () => {
    const content = fs.readFileSync(topUpOverlayPath, 'utf-8');
    expect(content).toContain("fetch('/api/upload'");
    expect(content).not.toContain("fetch('/api/admin/upload'");
    expect(content).toContain('compressImage');
    expect(content).toContain('Total Saldo Diterima');
    expect(content).toContain('Rincian Top Up Arus Pay');
    // Rule 3: Zero OS emojis in TopUpOverlay
    expect(content).not.toContain('🎁');
    expect(content).not.toContain('🎉');
    expect(content).not.toContain('🔥');
    expect(content).not.toContain('🏪');
    expect(content).not.toContain('⚡');
  });

  it('T1.19.4: Storefront, Profile, and Checkout integrate TopUpOverlay with Arum Seduh Orange/Amber identity', () => {
    const storefront = fs.readFileSync(storefrontClientPath, 'utf-8');
    const profile = fs.readFileSync(profileClientPath, 'utf-8');
    const checkout = fs.readFileSync(checkoutPagePath, 'utf-8');

    expect(storefront).toContain('Riwayat Transaksi Arus Pay');
    expect(storefront).toContain('Math.abs(tx.amount)');
    expect(profile).toContain('TopUpOverlay');
    expect(profile).toContain('Top Up Arus Pay');
    expect(checkout).toContain('TopUpOverlay');
    expect(checkout).toContain('refreshCheckoutWallet');
  });
});
