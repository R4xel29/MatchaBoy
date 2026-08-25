import { prisma } from './prisma';

/**
 * Deducts stock for all items in an order based on their product recipes and packaging cups.
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

    // Fetch cup packaging ingredients
    const [cupRegular, cupJumbo] = await Promise.all([
      prisma.ingredient.findFirst({
        where: { isPackaging: true, name: { contains: 'Regular', mode: 'insensitive' } },
      }),
      prisma.ingredient.findFirst({
        where: { isPackaging: true, name: { contains: 'Jumbo', mode: 'insensitive' } },
      }),
    ]);

    // 3. Process each order item
    for (const item of order.items) {
      let isBundle = false;
      let bundleSelections: any[] = [];
      let addOns: any[] = [];
      let itemSize = 'Regular';

      if (item.modifiers) {
        try {
          const parsed = JSON.parse(item.modifiers);
          if (parsed && parsed.isBundle && Array.isArray(parsed.bundleSelections)) {
            isBundle = true;
            bundleSelections = parsed.bundleSelections;
          }
          if (parsed && Array.isArray(parsed.addOns)) {
            addOns = parsed.addOns;
          }
          if (parsed && parsed.size) {
            itemSize = parsed.size;
          }
        } catch {
          if (item.modifiers.toLowerCase().includes('large') || item.modifiers.toLowerCase().includes('jumbo')) {
            itemSize = 'Large';
          }
        }
      }

      // Deduct Cup Packaging if customer did NOT bring a tumbler
      if (!order.hasTumbler) {
        const isLarge = itemSize.toLowerCase().includes('large') || itemSize.toLowerCase().includes('jumbo');
        const targetCup = isLarge ? (cupJumbo || cupRegular) : cupRegular;

        if (targetCup) {
          const totalCupQty = item.qty;
          await prisma.$transaction([
            prisma.ingredient.update({
              where: { id: targetCup.id },
              data: {
                stock: {
                  decrement: totalCupQty,
                },
              },
            }),
            prisma.stockMovement.create({
              data: {
                ingredientId: targetCup.id,
                quantity: -totalCupQty,
                type: 'OUT',
                reason: `Order #${orderId.slice(-6).toUpperCase()} - ${targetCup.name} (${item.product.name} Size ${itemSize}, Qty: ${item.qty})`,
              },
            }),
          ]);
        }
      }

      // Deduct addOns if any
      for (const addOn of addOns) {
        if (addOn.ingredientId && addOn.ingredientQty) {
          const totalAddOnQty = addOn.ingredientQty * item.qty;
          await prisma.$transaction([
            prisma.ingredient.update({
              where: { id: addOn.ingredientId },
              data: {
                stock: {
                  decrement: totalAddOnQty,
                },
              },
            }),
            prisma.stockMovement.create({
              data: {
                ingredientId: addOn.ingredientId,
                quantity: -totalAddOnQty,
                type: 'OUT',
                reason: `Order #${orderId.slice(-6).toUpperCase()} - Topping: ${addOn.name} (Qty: ${item.qty})`,
              },
            }),
          ]);
        }
      }

      if (isBundle && bundleSelections.length > 0) {
        // Fetch recipes for all products selected in the bundle
        const selectProductIds = bundleSelections.map((s) => s.productId);
        const selectedProducts = await prisma.product.findMany({
          where: { id: { in: selectProductIds } },
          include: { productIngredients: true },
        });

        for (const sel of bundleSelections) {
          const selProduct = selectedProducts.find((p) => p.id === sel.productId);
          const recipe = selProduct?.productIngredients;
          if (!recipe || recipe.length === 0) continue;

          for (const recipeItem of recipe) {
            const totalQtyToDeduct = recipeItem.quantity * item.qty;

            await prisma.$transaction([
              prisma.ingredient.update({
                where: { id: recipeItem.ingredientId },
                data: {
                  stock: {
                    decrement: totalQtyToDeduct,
                  },
                },
              }),
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

        // Scale recipe slightly if Large / Jumbo (e.g. 1.25x portion for liquids/powder)
        const isLarge = itemSize.toLowerCase().includes('large') || itemSize.toLowerCase().includes('jumbo');
        const sizeMultiplier = isLarge ? 1.25 : 1.0;

        for (const recipeItem of recipe) {
          // Skip if this ingredient is a cup packaging (already deducted dynamically per order size above)
          if (cupRegular && recipeItem.ingredientId === cupRegular.id) continue;
          if (cupJumbo && recipeItem.ingredientId === cupJumbo.id) continue;

          const totalQtyToDeduct = Math.round(recipeItem.quantity * sizeMultiplier * item.qty * 100) / 100;

          await prisma.$transaction([
            prisma.ingredient.update({
              where: { id: recipeItem.ingredientId },
              data: {
                stock: {
                  decrement: totalQtyToDeduct,
                },
              },
            }),
            prisma.stockMovement.create({
              data: {
                ingredientId: recipeItem.ingredientId,
                quantity: -totalQtyToDeduct,
                type: 'OUT',
                reason: `Order #${orderId.slice(-6).toUpperCase()} - ${item.product.name} [Size ${itemSize}] (Qty: ${item.qty})`,
              },
            }),
          ]);
        }
      }
    }

    console.log(`Successfully deducted stock for order ${orderId}`);
  } catch (error) {
    console.error('Error in deductStockForOrder:', error);
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
        prisma.ingredient.update({
          where: { id: move.ingredientId },
          data: {
            stock: {
              increment: refundQty,
            },
          },
        }),
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
