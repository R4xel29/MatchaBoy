import { prisma } from './prisma';
import { parseItemModifiers } from './receipt-modifiers';

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
                category: true,
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

      // Check if product is food (food is served on plates with zero packaging cup deduction)
      let isFood = false;
      if (item.product.modifiers) {
        try {
          const pMods = JSON.parse(item.product.modifiers);
          if (pMods.productType === 'makanan') isFood = true;
        } catch {}
      }
      const catName = (item.product.category?.name || '').toLowerCase();
      const prodName = (item.product.name || '').toLowerCase();
      if (
        catName.includes('makanan') ||
        catName.includes('food') ||
        catName.includes('snack') ||
        catName.includes('toast') ||
        catName.includes('roti') ||
        catName.includes('mie') ||
        catName.includes('indomie') ||
        catName.includes('kentang') ||
        prodName.includes('indomie') ||
        prodName.includes('roti') ||
        prodName.includes('toast') ||
        prodName.includes('kentang') ||
        prodName.includes('croissant')
      ) {
        isFood = true;
      }

      // Deduct Cup Packaging ONLY for drinks if customer did NOT bring a tumbler
      if (!isFood && !order.hasTumbler) {
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

        // Parse modifiers comprehensively for sweetness, matcha levels, and espresso shots
        const parsedMod = parseItemModifiers({
          name: item.product.name,
          modifiersString: item.modifiers || undefined,
        });

        let sugarDoses: any = null;
        let matchaDoses: any = null;
        let shotDoses: any = null;

        if (item.product.modifiers) {
          try {
            const mods = JSON.parse(item.product.modifiers);
            if (mods.sugarDoses) sugarDoses = mods.sugarDoses;
            if (mods.matchaDoses) matchaDoses = mods.matchaDoses;
            if (mods.shotDoses) shotDoses = mods.shotDoses;
          } catch {}
        }

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

          // 1. Sugar Doses override if this ingredient is the configured sweetener
          if (sugarDoses && recipeItem.ingredientId === sugarDoses.ingredientId) {
            const sLevel = (parsedMod.sugarLevel || '').toLowerCase();
            if (sLevel.includes('no') || sLevel.includes('tanpa') || sLevel === '0%') {
              perItemQty = 0;
            } else if (sLevel.includes('less') || sLevel.includes('sedikit')) {
              perItemQty = sugarDoses.less > 0 ? sugarDoses.less : recipeItem.quantity * 0.5;
            } else if (sLevel.includes('manis sekali') || sLevel.includes('extra')) {
              perItemQty = sugarDoses.manisSekali > 0 ? sugarDoses.manisSekali : recipeItem.quantity * 1.5;
            } else if (sLevel.includes('lumayan') || sLevel.includes('biasa') || sLevel.includes('normal')) {
              perItemQty = sugarDoses.lumayan > 0 ? sugarDoses.lumayan : recipeItem.quantity;
            }
          }

          // 2. Matcha Doses override if this ingredient is the configured matcha powder
          if (matchaDoses && recipeItem.ingredientId === matchaDoses.ingredientId) {
            const mLvl = parsedMod.matchaLevel;
            if (typeof mLvl === 'number' && mLvl > 0) {
              if (mLvl <= 3) {
                perItemQty = matchaDoses.light > 0 ? matchaDoses.light : recipeItem.quantity * 0.7;
              } else if (mLvl <= 6) {
                perItemQty = matchaDoses.medium > 0 ? matchaDoses.medium : recipeItem.quantity;
              } else if (mLvl <= 8) {
                perItemQty = matchaDoses.bold > 0 ? matchaDoses.bold : recipeItem.quantity * 1.3;
              } else {
                perItemQty = matchaDoses.extraBold > 0 ? matchaDoses.extraBold : recipeItem.quantity * 1.6;
              }
            }
          }

          // 3. Espresso Shot Doses override if this ingredient is the coffee/espresso
          if (shotDoses && recipeItem.ingredientId === shotDoses.ingredientId) {
            const sName = (parsedMod.shotName || '').toLowerCase();
            if (sName.includes('triple') || sName.includes('3')) {
              perItemQty = shotDoses.triple > 0 ? shotDoses.triple : recipeItem.quantity * 3;
            } else if (sName.includes('double') || sName.includes('2')) {
              perItemQty = shotDoses.double > 0 ? shotDoses.double : recipeItem.quantity * 2;
            } else if (sName.includes('single') || sName.includes('1')) {
              perItemQty = shotDoses.single > 0 ? shotDoses.single : recipeItem.quantity;
            }
          }

          if (isLarge) {
            if (customJumboRecipe) {
              const customMatch = customJumboRecipe.find((j: any) => j.ingredientId === recipeItem.ingredientId);
              if (customMatch && customMatch.quantity > 0) {
                perItemQty = customMatch.quantity;
              } else {
                perItemQty = perItemQty * sizeMultiplier;
              }
            } else {
              perItemQty = perItemQty * sizeMultiplier;
            }
          }

          const totalQtyToDeduct = Math.round(perItemQty * item.qty * 100) / 100;

          if (totalQtyToDeduct > 0) {
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

        // 4. If extra espresso shot was selected on a beverage that doesn't have coffee in base recipe
        if (
          shotDoses &&
          shotDoses.ingredientId &&
          parsedMod.shotName &&
          !recipe.some((r) => r.ingredientId === shotDoses.ingredientId)
        ) {
          const sName = (parsedMod.shotName || '').toLowerCase();
          let shotQty = 0;
          if (sName.includes('triple') || sName.includes('3')) {
            shotQty = shotDoses.triple > 0 ? shotDoses.triple : 45;
          } else if (sName.includes('double') || sName.includes('2')) {
            shotQty = shotDoses.double > 0 ? shotDoses.double : 30;
          } else if (sName.includes('single') || sName.includes('1')) {
            shotQty = shotDoses.single > 0 ? shotDoses.single : 15;
          }

          if (shotQty > 0) {
            const totalShotQty = Math.round(shotQty * item.qty * 100) / 100;
            await prisma.$transaction([
              prisma.ingredient.update({
                where: { id: shotDoses.ingredientId },
                data: {
                  stock: {
                    decrement: totalShotQty,
                  },
                },
              }),
              prisma.stockMovement.create({
                data: {
                  ingredientId: shotDoses.ingredientId,
                  quantity: -totalShotQty,
                  type: 'OUT',
                  reason: `Order #${orderId.slice(-6).toUpperCase()} - Extra ${parsedMod.shotName} (${item.product.name}) (Qty: ${item.qty})`,
                },
              }),
            ]);
          }
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
