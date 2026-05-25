import { prisma } from './prisma';

/**
 * Deducts stock for all items in an order based on their product recipes.
 */
export async function deductStockForOrder(orderId: string) {
  try {
    // 1. Check if stock was already deducted for this order to prevent double deduction
    const existingMovement = await prisma.stockMovement.findFirst({
      where: {
        reason: {
          contains: `Order #${orderId.slice(-6).toUpperCase()}`,
        },
        type: 'OUT',
      },
    });

    if (existingMovement) {
      console.log(`Stock already deducted for order ${orderId}`);
      return;
    }

    // 2. Fetch order items with their products and recipes
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: {
                productIngredients: true,
              },
            },
          },
        },
      },
    });

    if (!order) throw new Error('Order not found');

    // 3. Process each order item
    for (const item of order.items) {
      let isBundle = false;
      let bundleSelections: any[] = [];
      if (item.modifiers) {
        try {
          const parsed = JSON.parse(item.modifiers);
          if (parsed && parsed.isBundle && Array.isArray(parsed.bundleSelections)) {
            isBundle = true;
            bundleSelections = parsed.bundleSelections;
          }
        } catch {
          // Ignore
        }
      }

      if (isBundle && bundleSelections.length > 0) {
        // Fetch recipes for all products selected in the bundle
        const selectProductIds = bundleSelections.map(s => s.productId);
        const selectedProducts = await prisma.product.findMany({
          where: { id: { in: selectProductIds } },
          include: { productIngredients: true }
        });

        for (const sel of bundleSelections) {
          const selProduct = selectedProducts.find(p => p.id === sel.productId);
          const recipe = selProduct?.productIngredients;
          if (!recipe || recipe.length === 0) continue;

          for (const recipeItem of recipe) {
            const totalQtyToDeduct = recipeItem.quantity * item.qty;

            await prisma.$transaction([
              // Deduct stock
              prisma.ingredient.update({
                where: { id: recipeItem.ingredientId },
                data: {
                  stock: {
                    decrement: totalQtyToDeduct,
                  },
                },
              }),
              // Log movement
              prisma.stockMovement.create({
                data: {
                  ingredientId: recipeItem.ingredientId,
                  quantity: -totalQtyToDeduct,
                  type: 'OUT',
                  reason: `Order #${orderId.slice(-6).toUpperCase()} - Combo Selection: ${sel.productName} (Qty: ${item.qty})`,
                },
              }),
            ]);
          }
        }
      } else {
        const recipe = item.product.productIngredients;
        if (!recipe || recipe.length === 0) continue;

        for (const recipeItem of recipe) {
          const totalQtyToDeduct = recipeItem.quantity * item.qty;

          await prisma.$transaction([
            // Deduct stock
            prisma.ingredient.update({
              where: { id: recipeItem.ingredientId },
              data: {
                stock: {
                  decrement: totalQtyToDeduct,
                },
              },
            }),
            // Log movement
            prisma.stockMovement.create({
              data: {
                ingredientId: recipeItem.ingredientId,
                quantity: -totalQtyToDeduct,
                type: 'OUT',
                reason: `Order #${orderId.slice(-6).toUpperCase()} - ${item.product.name} (Qty: ${item.qty})`,
              },
            }),
          ]);
        }
      }
    }

    console.log(`Successfully deducted stock for order ${orderId}`);
  } catch (error) {
    console.error('Error in deductStockForOrder:', error);
    // Non-blocking error, we don't want to fail the order update if stock fails
  }
}

/**
 * Restores stock for an order if it was previously deducted.
 */
export async function restoreStockForOrder(orderId: string) {
  try {
    // Find all 'OUT' movements for this order
    const movements = await prisma.stockMovement.findMany({
      where: {
        reason: {
          contains: `Order #${orderId.slice(-6).toUpperCase()}`,
        },
        type: 'OUT',
      },
    });

    if (movements.length === 0) {
      console.log(`No stock was deducted for order ${orderId}, skipping restoration.`);
      return;
    }

    // Check if we already did a restoration to prevent double refund
    const alreadyRestored = await prisma.stockMovement.findFirst({
      where: {
        reason: {
          contains: `Refund Order #${orderId.slice(-6).toUpperCase()}`,
        },
        type: 'IN',
      },
    });

    if (alreadyRestored) {
      console.log(`Stock already restored for order ${orderId}`);
      return;
    }

    // Process restoration
    for (const move of movements) {
      const refundQty = Math.abs(move.quantity);
      if (refundQty <= 0) continue;

      await prisma.$transaction([
        // Restore stock
        prisma.ingredient.update({
          where: { id: move.ingredientId },
          data: {
            stock: {
              increment: refundQty,
            },
          },
        }),
        // Log movement
        prisma.stockMovement.create({
          data: {
            ingredientId: move.ingredientId,
            quantity: refundQty,
            type: 'IN',
            reason: `Refund Order #${orderId.slice(-6).toUpperCase()} - Restoration (Original: ${move.reason})`,
          },
        }),
      ]);
    }

    console.log(`Successfully restored stock for order ${orderId}`);
  } catch (error) {
    console.error('Error in restoreStockForOrder:', error);
  }
}

