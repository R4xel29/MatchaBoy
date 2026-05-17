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

    console.log(`Successfully deducted stock for order ${orderId}`);
  } catch (error) {
    console.error('Error in deductStockForOrder:', error);
    // Non-blocking error, we don't want to fail the order update if stock fails
  }
}
