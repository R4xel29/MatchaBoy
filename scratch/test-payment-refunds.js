import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';
import { verifyDokuWebhookSignature, generateSignature, generateDigest } from '../src/lib/doku.js';
import { expireOrder } from '../src/lib/order-utils.js';
import { deductStockForOrder } from '../src/lib/inventory-utils.js';
import { POST as dokuWebhookPOST } from '../src/app/api/payment/doku-webhook/route.js';
import { GET as paymentMethodsGET } from '../src/app/api/payment-methods/route.js';
import crypto from 'crypto';

// ANSI terminal styling
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function logSection(title) {
  console.log(`\n${BOLD}${BLUE}======================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}🚀 ${title}${RESET}`);
  console.log(`${BOLD}${BLUE}======================================================================${RESET}`);
}

function logSuccess(msg) {
  console.log(`${GREEN}✔ SUCCESS: ${msg}${RESET}`);
}

function logFailure(msg) {
  console.log(`${RED}✘ FAILURE: ${msg}${RESET}`);
}

function logStep(msg) {
  console.log(`${YELLOW}➔ ${msg}${RESET}`);
}

function assert(condition, message) {
  if (!condition) {
    logFailure(message);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    logSuccess(message);
  }
}

async function main() {
  console.log(`${BOLD}${MAGENTA}--- MATCHABOY PAYMENT & INTEGRATION TEST SYSTEM ---${RESET}`);

  // Test definitions
  const TEST_USER_ID = 'test_user_loyalty_123';
  const TEST_VOUCHER_CODE = 'TESTVOUCHER100';
  const TEST_ORDER_ID = 'test_order_doku_999';
  const TEST_CATEGORY_ID = 'test_cat_matcha';
  const TEST_PRODUCT_ID = 'test_prod_latte';
  const TEST_INGREDIENT_ID = 'test_ing_matcha_powder';

  let originalPaymentSettings = null;

  try {
    // -------------------------------------------------------------------------
    // SETUP MOCK RECORDS
    // -------------------------------------------------------------------------
    logSection('TEST SETUP: INITIALIZING DATABASE STATE');
    
    // Save or create Payment Settings
    logStep('Configuring test Payment Settings...');
    originalPaymentSettings = await prisma.paymentSettings.findFirst();
    
    const testPaymentSettings = {
      dokuEnabled: true,
      dokuClientId: 'test_client_id_val',
      dokuSharedKey: 'test_shared_key_secret',
      dokuSandbox: true,
    };

    if (originalPaymentSettings) {
      await prisma.paymentSettings.update({
        where: { id: originalPaymentSettings.id },
        data: testPaymentSettings
      });
    } else {
      await prisma.paymentSettings.create({
        data: {
          ...testPaymentSettings,
          codEnabled: true,
          qrisEnabled: true,
          transferEnabled: true
        }
      });
    }
    logSuccess('Test Payment Settings written to DB.');

    // Cleanup any leaking records from previous crash
    logStep('Cleaning up any old test records...');
    await prisma.orderItem.deleteMany({ where: { orderId: TEST_ORDER_ID } });
    await prisma.order.deleteMany({ where: { id: TEST_ORDER_ID } });
    await prisma.voucher.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.pointHistory.deleteMany({ where: { userId: TEST_USER_ID } });
    await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
    await prisma.productIngredient.deleteMany({ where: { productId: TEST_PRODUCT_ID } });
    await prisma.product.deleteMany({ where: { id: TEST_PRODUCT_ID } });
    await prisma.category.deleteMany({ where: { id: TEST_CATEGORY_ID } });
    await prisma.stockMovement.deleteMany({ where: { ingredientId: TEST_INGREDIENT_ID } });
    await prisma.ingredient.deleteMany({ where: { id: TEST_INGREDIENT_ID } });
    await prisma.notification.deleteMany({ where: { userId: TEST_USER_ID } });

    // Create Category & Product
    logStep('Creating test Category and Product...');
    await prisma.category.create({
      data: { id: TEST_CATEGORY_ID, name: 'Test Category', slug: 'test-category' }
    });
    await prisma.product.create({
      data: {
        id: TEST_PRODUCT_ID,
        name: 'Test Matcha Latte Extra',
        description: 'Test Matcha Latte',
        price: 15000,
        categoryId: TEST_CATEGORY_ID
      }
    });

    // Create Ingredient & Recipe (ProductIngredient)
    logStep('Creating test Ingredient (Matcha Powder, stock: 100) & Recipe...');
    await prisma.ingredient.create({
      data: {
        id: TEST_INGREDIENT_ID,
        name: 'Test Matcha Powder',
        unit: 'gr',
        stock: 100.0,
        costPerUnit: 100
      }
    });
    await prisma.productIngredient.create({
      data: {
        productId: TEST_PRODUCT_ID,
        ingredientId: TEST_INGREDIENT_ID,
        quantity: 5.0 // 5gr per cup
      }
    });

    // Create User with 50 loyalty points
    logStep('Creating test User with 50 points...');
    const user = await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        name: 'Test Customer Webhook',
        email: 'tester@matchaboy.com',
        role: 'CUSTOMER',
        points: 50
      }
    });
    assert(user.points === 50, 'User points set to 50');

    // Create Voucher
    logStep('Creating test Voucher...');
    const voucher = await prisma.voucher.create({
      data: {
        userId: TEST_USER_ID,
        code: TEST_VOUCHER_CODE,
        type: 'DISCOUNT_RP',
        description: 'Test Voucher Discount',
        discountAmount: 10000,
        isUsed: false
      }
    });
    assert(voucher.isUsed === false, 'Voucher initialized to unused');

    // -------------------------------------------------------------------------
    // STEP 1: SIMULATE CHECKOUT & STOCK DEDUCTION
    // -------------------------------------------------------------------------
    logSection('STEP 1: SIMULATE CHECKOUT & INVENTORY DEDUCTION');

    // Create Order in PENDING_PAYMENT status
    logStep('Creating Order in PENDING_PAYMENT status...');
    const order = await prisma.order.create({
      data: {
        id: TEST_ORDER_ID,
        userId: TEST_USER_ID,
        customerName: 'Test Customer Webhook',
        customerPhone: '08123456789',
        address: 'Ambil di toko',
        subtotal: 45000, // 3 cups of 15000
        deliveryFee: 0,
        total: 35000, // Subtotal 45000 - 10000 voucher discount
        paymentMethod: 'DOKU',
        status: 'PENDING_PAYMENT',
        pointsEarned: 5,
        voucherCode: TEST_VOUCHER_CODE,
        paymentExpiredAt: new Date(Date.now() + 15 * 60 * 1000), // Expire in 15 mins
        items: {
          create: {
            productId: TEST_PRODUCT_ID,
            qty: 3, // Ordered 3 cups (requires 3 * 5 = 15gr matcha powder)
            price: 15000
          }
        }
      }
    });
    assert(order.status === 'PENDING_PAYMENT', 'Order status is PENDING_PAYMENT');
    assert(order.voucherCode === TEST_VOUCHER_CODE, 'Voucher applied to order');

    // Simulate Point Deduction
    logStep('Simulating point deduction from User account (redeeming 20 points)...');
    await prisma.$transaction([
      prisma.user.update({
        where: { id: TEST_USER_ID },
        data: { points: { decrement: 20 } }
      }),
      prisma.pointHistory.create({
        data: {
          userId: TEST_USER_ID,
          amount: -20,
          type: 'REDEEM_ORDER',
          description: 'Redeem 20 points for order discount',
          orderId: TEST_ORDER_ID
        }
      })
    ]);

    const userAfterDeduction = await prisma.user.findUnique({ where: { id: TEST_USER_ID } });
    assert(userAfterDeduction.points === 30, 'User points correctly deducted to 30');

    // Simulate Voucher usage mark
    logStep('Marking Voucher as used...');
    await prisma.voucher.update({
      where: { code: TEST_VOUCHER_CODE },
      data: { isUsed: true, usedAt: new Date() }
    });
    const voucherAfterCheckout = await prisma.voucher.findUnique({ where: { code: TEST_VOUCHER_CODE } });
    assert(voucherAfterCheckout.isUsed === true, 'Voucher correctly marked isUsed = true');

    // Deduct stock for the ordered items
    logStep('Deducting inventory stock based on product ingredients...');
    await deductStockForOrder(TEST_ORDER_ID);

    const ingredientAfterDeduction = await prisma.ingredient.findUnique({ where: { id: TEST_INGREDIENT_ID } });
    console.log(`Initial Stock: 100.0, Remaining Stock: ${ingredientAfterDeduction.stock}`);
    assert(ingredientAfterDeduction.stock === 85.0, 'Stock correctly deducted to 85.0 (100 - 3 * 5)');

    const stockMovementOut = await prisma.stockMovement.findFirst({
      where: { ingredientId: TEST_INGREDIENT_ID, type: 'OUT' }
    });
    assert(stockMovementOut !== null, 'Stock movement of type OUT successfully logged');
    assert(Math.abs(stockMovementOut.quantity) === 15.0, 'Stock movement OUT quantity matches recipe requirement (15.0)');

    // -------------------------------------------------------------------------
    // STEP 2: SIMULATE DOKU WEBHOOK SUCCESS
    // -------------------------------------------------------------------------
    logSection('STEP 2: SIMULATE DOKU WEBHOOK SUCCESS');

    // Construct mock success payload
    const successPayload = {
      order: {
        invoice_number: TEST_ORDER_ID
      },
      payment: {
        status: 'SUCCESS'
      }
    };

    const rawBody = JSON.stringify(successPayload);
    const digest = generateDigest(successPayload);
    const requestId = `REQ-${Date.now()}`;
    const timestamp = new Date().toISOString().split('.')[0] + 'Z';
    const requestTarget = '/api/payment/doku-webhook';

    const signature = generateSignature({
      clientId: testPaymentSettings.dokuClientId,
      sharedKey: testPaymentSettings.dokuSharedKey,
      requestId,
      timestamp,
      requestTarget,
      digest
    });

    logStep('Fabricating simulated webhook HTTP Request...');
    const mockRequest = {
      text: async () => rawBody,
      headers: {
        forEach: (callback) => {
          const headerMap = {
            'signature': signature,
            'client-id': testPaymentSettings.dokuClientId,
            'request-id': requestId,
            'request-timestamp': timestamp,
            'content-type': 'application/json'
          };
          Object.entries(headerMap).forEach(([key, val]) => callback(val, key));
        }
      }
    };

    logStep('Invoking DOKU webhook route POST handler...');
    const response = await dokuWebhookPOST(mockRequest);
    const responseBody = await response.json();
    console.log('[Webhook Response Body]:', responseBody);
    assert(response.status === 200, 'Webhook POST returned status 200 OK');

    // Verify order transitioned to PREPARING
    const orderAfterSuccess = await prisma.order.findUnique({ where: { id: TEST_ORDER_ID } });
    assert(orderAfterSuccess.status === 'PREPARING', 'Order status correctly transitioned from PENDING_PAYMENT to PREPARING');
    assert(orderAfterSuccess.notes.includes('[DOKU Webhook] Pembayaran otomatis sukses via DOKU'), 'Doku payment success note appended to order notes');

    // Verify notification was dispatched to User
    const notifications = await prisma.notification.findMany({ where: { userId: TEST_USER_ID } });
    assert(notifications.length > 0, `User received real-time payment confirmation notification (Count: ${notifications.length})`);
    console.log('Customer Notification details:', {
      title: notifications[0].title,
      message: notifications[0].message
    });

    // -------------------------------------------------------------------------
    // STEP 3: SIMULATE CANCELLATION & EXPIRES (REFUNDS)
    // -------------------------------------------------------------------------
    logSection('STEP 3: SIMULATE CANCELLATION & EXPIRES');

    logStep('Reverting order status back to PENDING_PAYMENT to test centralized expireOrder utility...');
    await prisma.order.update({
      where: { id: TEST_ORDER_ID },
      data: { status: 'PENDING_PAYMENT' }
    });

    logStep('Calling centralized expireOrder(..., force = true) to trigger cancellation/expiry flow...');
    const expiredResult = await expireOrder(TEST_ORDER_ID, true);
    assert(expiredResult !== null, 'expireOrder execution succeeded');

    // Verify order transitioned to CANCELLED
    const orderAfterCancel = await prisma.order.findUnique({ where: { id: TEST_ORDER_ID } });
    assert(orderAfterCancel.status === 'CANCELLED', 'Order status correctly transitioned to CANCELLED');

    // Verify points were fully refunded
    const userAfterCancel = await prisma.user.findUnique({ where: { id: TEST_USER_ID } });
    assert(userAfterCancel.points === 50, 'User points fully refunded back to 50');

    // Verify PointHistory refund entry
    const pointRefundHistory = await prisma.pointHistory.findFirst({
      where: { userId: TEST_USER_ID, amount: 20 }
    });
    assert(pointRefundHistory !== null, 'PointHistory refund entry recorded');
    console.log('Point History Refund details:', pointRefundHistory.description);

    // Verify Voucher is restored to unused
    const voucherAfterCancel = await prisma.voucher.findUnique({ where: { code: TEST_VOUCHER_CODE } });
    assert(voucherAfterCancel.isUsed === false, 'Voucher successfully restored (isUsed = false)');
    assert(voucherAfterCancel.usedAt === null, 'Voucher usedAt cleared (usedAt = null)');

    // Verify stock is fully restored
    const ingredientAfterCancel = await prisma.ingredient.findUnique({ where: { id: TEST_INGREDIENT_ID } });
    console.log(`Stock before restoration: 85.0, Stock after restoration: ${ingredientAfterCancel.stock}`);
    assert(ingredientAfterCancel.stock === 100.0, 'Stock correctly restored to 100.0');

    // Verify StockMovement logs
    const stockMovementIn = await prisma.stockMovement.findFirst({
      where: { ingredientId: TEST_INGREDIENT_ID, type: 'IN' }
    });
    assert(stockMovementIn !== null, 'Stock movement of type IN successfully logged for restoration');
    assert(stockMovementIn.quantity === 15.0, 'Stock movement IN quantity matches restored requirement (15.0)');
    console.log('Stock Movement restoration reason:', stockMovementIn.reason);

    // -------------------------------------------------------------------------
    // STEP 4: TEST SIGNATURE FALLBACK LOGIC
    // -------------------------------------------------------------------------
    logSection('STEP 4: TEST WEBHOOK SIGNATURE FALLBACK');

    const signatureSecret = 'fallback_test_secret_key';
    const clientVal = 'fallback_client';
    const reqId = 'fallback_req_id';
    const timeVal = new Date().toISOString().split('.')[0] + 'Z';
    const target = '/api/payment/doku-webhook';

    // Scenario A: Minified payload
    logStep('Scenario A: Verifying matching signature for minified body...');
    const minifiedPayload = { order: { id: '123' }, status: 'SUCCESS' };
    const minifiedRawBody = JSON.stringify(minifiedPayload);
    const minifiedDigest = crypto.createHash('sha256').update(minifiedRawBody).digest('base64');
    
    const minifiedSignature = generateSignature({
      clientId: clientVal,
      sharedKey: signatureSecret,
      requestId: reqId,
      timestamp: timeVal,
      requestTarget: target,
      digest: minifiedDigest
    });

    const isMinifiedValid = verifyDokuWebhookSignature({
      clientId: clientVal,
      sharedKey: signatureSecret,
      headers: {
        'signature': minifiedSignature,
        'client-id': clientVal,
        'request-id': reqId,
        'request-timestamp': timeVal
      },
      rawBody: minifiedRawBody,
      requestTarget: target
    });
    assert(isMinifiedValid === true, 'verifyDokuWebhookSignature returns true for standard minified JSON payload');

    // Scenario B: Perturbed (prettified/extra spaces) payload
    logStep('Scenario B: Verifying signature with rawBody fallback (extra spaces/newlines)...');
    
    // The signature was generated on a specific raw string
    const perturbedRawBody = `{\n  "order": {\n    "id": "123"\n  },\n  "status": "SUCCESS"\n}`;
    const perturbedDigest = crypto.createHash('sha256').update(perturbedRawBody).digest('base64');
    
    const perturbedSignature = generateSignature({
      clientId: clientVal,
      sharedKey: signatureSecret,
      requestId: reqId,
      timestamp: timeVal,
      requestTarget: target,
      digest: perturbedDigest
    });

    // In a perturbed body check, JSON.stringify(JSON.parse(perturbedRawBody)) is NOT equal to perturbedRawBody.
    // It will fail the minified body check but succeed on the rawBody direct digest verification fallback!
    const isPerturbedValid = verifyDokuWebhookSignature({
      clientId: clientVal,
      sharedKey: signatureSecret,
      headers: {
        'signature': perturbedSignature,
        'client-id': clientVal,
        'request-id': reqId,
        'request-timestamp': timeVal
      },
      rawBody: perturbedRawBody,
      requestTarget: target
    });
    assert(isPerturbedValid === true, 'verifyDokuWebhookSignature successfully falls back and returns true for perturbed formatting payload!');

    // -------------------------------------------------------------------------
    // STEP 5: VERIFY PAYMENT METHODS ENDPOINT
    // -------------------------------------------------------------------------
    logSection('STEP 5: VERIFY PUBLIC PAYMENT-METHODS API');

    logStep('Calling GET /api/payment-methods...');
    const methodsResponse = await paymentMethodsGET();
    assert(methodsResponse.status === 200, 'Endpoint returned 200 OK');

    const methodsData = await methodsResponse.json();
    console.log('Payment methods response structure:', JSON.stringify(methodsData, null, 2));

    assert(methodsData.doku !== undefined, 'Response contains "doku" key');
    assert(methodsData.doku.enabled === true, 'Response returns DOKU as enabled (enabled = true)');
    assert(methodsData.doku.clientId === 'test_client_id_val', 'Response returns correct DOKU clientId matching database');

  } catch (error) {
    console.error(`${RED}${BOLD}CRITICAL ERROR DURING INTEGRATION RUN:${RESET}`, error);
    process.exit(1);
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP DATABASE
    // -------------------------------------------------------------------------
    logSection('TEST CLEANUP: DELETING MOCK DATABASE RECORDS');

    logStep('Deleting Order Items...');
    await prisma.orderItem.deleteMany({ where: { orderId: TEST_ORDER_ID } });

    logStep('Deleting Order...');
    await prisma.order.deleteMany({ where: { id: TEST_ORDER_ID } });

    logStep('Deleting Voucher...');
    await prisma.voucher.deleteMany({ where: { userId: TEST_USER_ID } });

    logStep('Deleting Point History...');
    await prisma.pointHistory.deleteMany({ where: { userId: TEST_USER_ID } });

    logStep('Deleting User...');
    await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });

    logStep('Deleting Product Recipe...');
    await prisma.productIngredient.deleteMany({ where: { productId: TEST_PRODUCT_ID } });

    logStep('Deleting Product...');
    await prisma.product.deleteMany({ where: { id: TEST_PRODUCT_ID } });

    logStep('Deleting Category...');
    await prisma.category.deleteMany({ where: { id: TEST_CATEGORY_ID } });

    logStep('Deleting Stock Movements...');
    await prisma.stockMovement.deleteMany({ where: { ingredientId: TEST_INGREDIENT_ID } });

    logStep('Deleting Ingredient...');
    await prisma.ingredient.deleteMany({ where: { id: TEST_INGREDIENT_ID } });

    logStep('Deleting Notifications...');
    await prisma.notification.deleteMany({ where: { userId: TEST_USER_ID } });

    logStep('Restoring original Payment Settings...');
    if (originalPaymentSettings) {
      await prisma.paymentSettings.update({
        where: { id: originalPaymentSettings.id },
        data: {
          dokuEnabled: originalPaymentSettings.dokuEnabled,
          dokuClientId: originalPaymentSettings.dokuClientId,
          dokuSharedKey: originalPaymentSettings.dokuSharedKey,
          dokuSandbox: originalPaymentSettings.dokuSandbox
        }
      });
    } else {
      await prisma.paymentSettings.deleteMany();
    }

    logSuccess('Database cleaned up perfectly. Closing connection.');
    await prisma.$disconnect();
    console.log(`\n${BOLD}${GREEN}🎉 ALL 5 INTEGRATION TEST FLOWS SCRIPT CONCLUDED WITH 100% SUCCESS! 🎉${RESET}\n`);
  }
}

main();
