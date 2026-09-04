import { prisma } from './prisma';

/**
 * Struktur parsed modifier item pesanan untuk inventaris.
 */
interface ParsedItemModifiers {
  isBundle?: boolean;
  bundleSelections?: Array<{
    groupId?: string;
    groupName?: string;
    productId: string;
    productName?: string;
  }>;
  addOns?: Array<{
    id?: string;
    name?: string;
    price?: number;
    ingredientId?: string;
    ingredientQty?: number;
  }>;
  size?: string;
}

interface CustomJumboIngredient {
  ingredientId: string;
  quantity: number;
}

/**
 * Mengurangi stok bahan baku dan kemasan berdasarkan resep produk untuk pesanan tertentu.
 *
 * Logika operasional:
 * 1. Mengecek mutasi stok sebelumnya untuk mencegah *double deduction*.
 * 2. Memotong stok cup kemasan (Regular vs Jumbo) jika pelanggan tidak membawa tumbler (`hasTumbler: false`).
 * 3. Memotong stok topping/add-on jika memiliki mapping `ingredientId`.
 * 4. Mendukung komposisi Bundle combo maupun resep dinamis (scaling ukuran Jumbo 1.25x atau resep khusus jumbo).
 *
 * @param {string} orderId - ID pesanan unik yang masuk proses masak/persiapan
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * await deductStockForOrder(order.id);
 * ```
 */
export async function deductStockForOrder(orderId: string): Promise<void> {
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

        // Scale recipe or use custom jumboRecipe if Large / Jumbo
        const isLarge = itemSize.toLowerCase().includes('large') || itemSize.toLowerCase().includes('jumbo');
        const sizeMultiplier = isLarge ? 1.25 : 1.0;

        let customJumboRecipe: any[] | null = null;
        if (isLarge && item.product.modifiers) {
          try {
            const mods = JSON.parse(item.product.modifiers);
            if (Array.isArray(mods.jumboRecipe) && mods.jumboRecipe.length > 0) {
              customJumboRecipe = mods.jumboRecipe;
            }
          } catch {}
        }

        for (const recipeItem of recipe) {
          // Skip if this ingredient is a cup packaging (already deducted dynamically per order size above)
          if (cupRegular && recipeItem.ingredientId === cupRegular.id) continue;
          if (cupJumbo && recipeItem.ingredientId === cupJumbo.id) continue;

          let perItemQty = recipeItem.quantity;
          if (isLarge) {
            if (customJumboRecipe) {
              const customMatch = customJumboRecipe.find((j: any) => j.ingredientId === recipeItem.ingredientId);
              if (customMatch && customMatch.quantity > 0) {
                perItemQty = customMatch.quantity;
              } else {
                perItemQty = recipeItem.quantity * sizeMultiplier;
              }
            } else {
              perItemQty = recipeItem.quantity * sizeMultiplier;
            }
          }

          const totalQtyToDeduct = Math.round(perItemQty * item.qty * 100) / 100;

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
 * Memulihkan stok bahan baku dan kemasan suatu pesanan yang dibatalkan
 * jika stok pesanan tersebut sebelumnya telah dipotong (status 'OUT').
 *
 * Menggunakan mekanisme pengecekan idempoten: Jika sudah pernah tercatat mutasi 'IN'
 * dengan label 'Refund Order', maka proses pemulihan dilewati untuk mencegah *double refund*.
 *
 * @param {string} orderId - ID pesanan unik yang dibatalkan
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * await restoreStockForOrder(order.id);
 * ```
 */
export async function restoreStockForOrder(orderId: string): Promise<void> {
  try {
    // Cari seluruh mutasi stok 'OUT' yang berkaitan dengan orderId ini
    const movements = await prisma.stockMovement.findMany({
      where: {
        reason: {
          contains: `Order #${orderId.slice(-6).toUpperCase()}`,
        },
        type: 'OUT',
      },
    });

    if (movements.length === 0) {
      console.log(`[Stok Restore] Tidak ada pemotongan stok tercatat untuk pesanan ${orderId}, lewati pemulihan.`);
      return;
    }

    // Pengecekan idempotensi: Cegah double refund stok
    const alreadyRestored = await prisma.stockMovement.findFirst({
      where: {
        reason: {
          contains: `Refund Order #${orderId.slice(-6).toUpperCase()}`,
        },
        type: 'IN',
      },
    });

    if (alreadyRestored) {
      console.log(`[Stok Restore] Stok untuk pesanan ${orderId} sudah pernah dipulihkan sebelumnya.`);
      return;
    }

    // Eksekusi pemulihan stok per bahan
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

    console.log(`[Stok Restore] Berhasil memulihkan stok untuk pesanan ${orderId}`);
  } catch (error) {
    console.error('[Stok Restore Error] Terjadi kesalahan dalam restoreStockForOrder:', error);
  }
}
