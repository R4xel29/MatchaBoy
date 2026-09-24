/**
 * Test Suite: QRIS Payment Lifecycle & Receipt Auto-Print Compliance
 * Verifies that:
 * 1. autoCancelExpiredQrisOrders strictly queries PENDING_PAYMENT and excludes verified payments.
 * 2. expireOrder does not cancel PENDING (already paid/cooking) orders on payment timeouts.
 * 3. CashierOrdersClient excludes PENDING_PAYMENT from receipt auto-print.
 * 4. DOKU Webhook protects paid/processed orders from out-of-order FAILED/EXPIRED cancellations.
 */

import { describe, it, expect } from './test-framework';
import * as fs from 'fs';
import * as path from 'path';

describe('QRIS Payment Lifecycle & Receipt Auto-Print Compliance', () => {
  it('T_QRIS_1: autoCancelExpiredQrisOrders in order-utils.ts targets only PENDING_PAYMENT and ignores PENDING', () => {
    const filePath = path.resolve(process.cwd(), 'src/lib/order-utils.ts');
    expect(fs.existsSync(filePath)).toBeTruthy();
    const content = fs.readFileSync(filePath, 'utf8');

    // Extract the autoCancelExpiredQrisOrders function body
    const fnMatch = content.match(/export\s+async\s+function\s+autoCancelExpiredQrisOrders[\s\S]*?^}/m);
    expect(fnMatch).toBeTruthy();
    const fnBody = fnMatch![0];

    // Must strictly check status: 'PENDING_PAYMENT' and NOT include 'PENDING'
    expect(fnBody.includes("status: 'PENDING_PAYMENT'")).toBeTruthy();
    expect(fnBody.includes("status: { in: ['PENDING_PAYMENT', 'PENDING'] }")).toBeFalsy();
    // Must protect verified payments
    expect(fnBody.includes('/verified-webhook.svg')).toBeTruthy();
  });

  it('T_QRIS_2: expireOrder in order-utils.ts protects PENDING and verified orders from auto-expiry', () => {
    const filePath = path.resolve(process.cwd(), 'src/lib/order-utils.ts');
    const content = fs.readFileSync(filePath, 'utf8');

    const fnMatch = content.match(/export\s+async\s+function\s+expireOrder[\s\S]*?^}/m);
    expect(fnMatch).toBeTruthy();
    const fnBody = fnMatch![0];

    // Non-force auto-expiration must only apply to PENDING_PAYMENT
    expect(fnBody.includes("order.status !== 'PENDING_PAYMENT' && !force")).toBeTruthy();
    // Verified payment proof must never be auto-cancelled
    expect(fnBody.includes('/verified-webhook.svg')).toBeTruthy();
  });

  it('T_QRIS_3: CashierOrdersClient excludes PENDING_PAYMENT from incoming order auto-print', () => {
    const filePath = path.resolve(process.cwd(), 'src/app/(admin)/admin/cashier/orders/CashierOrdersClient.tsx');
    expect(fs.existsSync(filePath)).toBeTruthy();
    const content = fs.readFileSync(filePath, 'utf8');

    // Check isEligible in autoPrintIncomingOrders
    expect(content.includes("const isEligible = ['PENDING', 'PREPARING'].includes(ord.status);")).toBeTruthy();
    expect(content.includes("['PENDING', 'PENDING_PAYMENT', 'PREPARING'].includes(ord.status)")).toBeFalsy();

    // Check initialOrders mount ref initialization
    expect(content.includes("o.status !== 'PENDING_PAYMENT'")).toBeTruthy();
  });

  it('T_QRIS_4: DOKU webhook route guards paid/processed orders against late cancellation events', () => {
    const filePath = path.resolve(process.cwd(), 'src/app/api/payment/doku-webhook/route.ts');
    expect(fs.existsSync(filePath)).toBeTruthy();
    const content = fs.readFileSync(filePath, 'utf8');

    // Must verify order status before calling expireOrder on FAILED/EXPIRED/CANCELLED
    expect(content.includes("existingOrder.status !== 'PENDING_PAYMENT'")).toBeTruthy();
    expect(content.includes("Order already processed or paid")).toBeTruthy();
  });

  it('T_QRIS_5: CashierOrdersClient simplifies completion to direct Selesai and greys out unpaid QRIS orders', () => {
    const filePath = path.resolve(process.cwd(), 'src/app/(admin)/admin/cashier/orders/CashierOrdersClient.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    // Must have isUnpaidQrisOrder helper and greyed-out disabled card classes
    expect(content.includes('isUnpaidQrisOrder')).toBeTruthy();
    expect(content.includes('bg-stone-100/90 border-stone-300 text-stone-400 opacity-70 grayscale')).toBeTruthy();
    expect(content.includes('Menunggu Pembayaran QRIS...')).toBeTruthy();

    // Must directly call handleUpdateStatus(order.id, 'COMPLETED') without requiring handleUpdateStatus(order.id, 'READY')
    expect(content.includes("handleUpdateStatus(order.id, 'COMPLETED')")).toBeTruthy();
    expect(content.includes("handleUpdateStatus(order.id, 'READY')")).toBeFalsy();
  });

  it('T_QRIS_6: Unpaid QRIS orders cannot print receipts manually or be marked completed in API/POS', () => {
    const ordersClientPath = path.resolve(process.cwd(), 'src/app/(admin)/admin/cashier/orders/CashierOrdersClient.tsx');
    const ordersClientContent = fs.readFileSync(ordersClientPath, 'utf8');
    expect(ordersClientContent.includes('disabled={isUnpaidQris}')).toBeTruthy();
    expect(ordersClientContent.includes('Pembayaran QRIS belum terkonfirmasi masuk. Struk belum dapat dicetak.')).toBeTruthy();

    const patchRoutePath = path.resolve(process.cwd(), 'src/app/api/cashier/orders/[id]/route.ts');
    const patchRouteContent = fs.readFileSync(patchRoutePath, 'utf8');
    expect(patchRouteContent.includes("existingOrder.status === 'PENDING_PAYMENT' && isAttemptingProgress")).toBeTruthy();

    const posRoutePath = path.resolve(process.cwd(), 'src/app/api/cashier/orders/route.ts');
    const posRouteContent = fs.readFileSync(posRoutePath, 'utf8');
    expect(posRouteContent.includes("existingOrder.status === 'PENDING_PAYMENT'")).toBeTruthy();
  });
});
