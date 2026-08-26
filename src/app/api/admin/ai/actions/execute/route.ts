import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { persistAiProductImage } from "@/lib/ai-image-helper";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "CASHIER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { actionType, payload } = body;

    if (!actionType || !payload) {
      return NextResponse.json({ error: "Action type and payload are required" }, { status: 400 });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. CREATE VOUCHER TEMPLATE
    // ──────────────────────────────────────────────────────────────────────────
    if (actionType === "CREATE_VOUCHER") {
      const {
        code,
        title,
        description,
        type = "PERCENTAGE",
        discountValue,
        minPurchase = 0,
        maxDiscount,
        terms,
        expiresAt,
        usageLimit = 50,
      } = payload;

      if (!code || !title) {
        return NextResponse.json({ error: "Kode dan judul voucher harus diisi" }, { status: 400 });
      }

      const cleanCode = code.toUpperCase().trim();
      const existing = await prisma.voucherTemplate.findUnique({
        where: { code: cleanCode },
      });

      if (existing) {
        return NextResponse.json({ error: `Kode voucher "${cleanCode}" sudah pernah dibuat sebelumnya.` }, { status: 400 });
      }

      const template = await prisma.voucherTemplate.create({
        data: {
          code: cleanCode,
          title: title || `Promo ${cleanCode}`,
          description: description || `Voucher diskon ${discountValue}${type === "PERCENTAGE" ? "%" : "rb"}`,
          type: type === "FIXED" ? "FIXED" : "PERCENTAGE",
          discountValue: Number(discountValue) || 10,
          minPurchase: Number(minPurchase) || 0,
          maxDiscount: maxDiscount ? Number(maxDiscount) : null,
          terms: terms || "Berlaku untuk seluruh menu Matchaboy.",
          expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          usageLimit: Number(usageLimit) || 50,
          targetNewUserOnly: false,
          hideFromVoucherPack: false,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Voucher "${template.code}" (${template.title}) berhasil dibuat dan aktif di sistem!`,
        data: template,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. CREATE PRODUCT (WITH AI IMAGE GENERATOR & RECIPE COGS LINK)
    // ──────────────────────────────────────────────────────────────────────────
    if (actionType === "CREATE_PRODUCT") {
      const {
        name,
        description = "",
        price,
        categoryName = "Signature Matcha",
        badge = "new",
        imageUrl,
        aiImagePrompt,
        modifiers,
        recipes = [],
      } = payload;

      if (!name || price === undefined) {
        return NextResponse.json({ error: "Nama produk dan harga jual wajib diisi." }, { status: 400 });
      }

      // Find or create category
      let category = await prisma.category.findFirst({
        where: { name: { contains: categoryName, mode: "insensitive" } },
      });

      if (!category) {
        const slug = categoryName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
        category = await prisma.category.create({
          data: {
            name: categoryName,
            slug: slug || `cat-${Date.now()}`,
          },
        });
      }

      // Persist AI Image to Supabase CDN
      const finalImage = await persistAiProductImage(imageUrl || aiImagePrompt || name, name);

      // Default standard modifiers if not provided
      const defaultMods = {
        sugarLevel: ["Tanpa Gula (0%)", "Less Sugar (50%)", "Normal (100%)", "Extra Sweet (120%)"],
        iceLevel: ["No Ice", "Less Ice", "Normal Ice", "Extra Ice"],
        sizes: [
          { name: "Regular", price: 0 },
          { name: "Large (+Rp 4.000)", price: 4000 },
        ],
      };

      const finalModifiersStr = typeof modifiers === "string" 
        ? modifiers 
        : JSON.stringify(modifiers || defaultMods);

      let totalCalculatedHpp = 0;
      const createdProduct = await prisma.$transaction(async (tx) => {
        const prod = await tx.product.create({
          data: {
            name,
            description: description || `Menu spesial ${name} khas Matchaboy.`,
            price: Number(price) || 0,
            image: finalImage,
            badge: badge === "none" ? null : badge,
            categoryId: category.id,
            modifiers: finalModifiersStr,
          },
        });

        // Link recipes (ProductIngredient)
        if (Array.isArray(recipes) && recipes.length > 0) {
          for (const rec of recipes) {
            let ingredient = null;
            if (rec.ingredientId) {
              ingredient = await tx.ingredient.findUnique({ where: { id: rec.ingredientId } });
            } else if (rec.ingredientName) {
              ingredient = await tx.ingredient.findFirst({
                where: { name: { contains: rec.ingredientName, mode: "insensitive" } },
              });

              // If ingredient doesn't exist, create master data for it!
              if (!ingredient) {
                ingredient = await tx.ingredient.create({
                  data: {
                    name: rec.ingredientName,
                    unit: rec.unit || "g",
                    stock: 1000,
                    costPerUnit: rec.costPerUnit || 100,
                    minStockAlert: 100,
                  },
                });
              }
            }

            if (ingredient) {
              const qty = Number(rec.quantity) || 1;
              await tx.productIngredient.create({
                data: {
                  productId: prod.id,
                  ingredientId: ingredient.id,
                  quantity: qty,
                },
              });
              totalCalculatedHpp += qty * ingredient.costPerUnit;
            }
          }
        }

        return prod;
      });

      const marginPct = createdProduct.price > 0 
        ? Math.round(((createdProduct.price - totalCalculatedHpp) / createdProduct.price) * 100) 
        : 0;

      return NextResponse.json({
        success: true,
        message: `Menu baru "${createdProduct.name}" berhasil dibuat di kategori "${category.name}" seharga Rp ${createdProduct.price.toLocaleString("id-ID")}! Foto produk studio AI telah disimpan. (HPP Modal: Rp ${totalCalculatedHpp.toLocaleString("id-ID")}, Margin: ${marginPct}%).`,
        product: createdProduct,
        hpp: totalCalculatedHpp,
        margin: marginPct,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. UPDATE PRODUCT (PRICE / BADGE / IMAGE / STATUS)
    // ──────────────────────────────────────────────────────────────────────────
    if (actionType === "UPDATE_PRODUCT") {
      const { productId, productName, price, badge, description, name, imageUrl, aiImagePrompt } = payload;

      let targetProduct = null;
      if (productId) {
        targetProduct = await prisma.product.findUnique({ where: { id: productId } });
      } else if (productName) {
        targetProduct = await prisma.product.findFirst({
          where: { name: { contains: productName, mode: "insensitive" } },
        });
      }

      if (!targetProduct) {
        return NextResponse.json({ error: `Produk "${productName || productId}" tidak ditemukan di database.` }, { status: 404 });
      }

      const updateData: Record<string, any> = {};
      if (price !== undefined) updateData.price = Number(price);
      if (badge !== undefined) updateData.badge = badge === "none" ? null : badge;
      if (description !== undefined) updateData.description = description;
      if (name !== undefined) updateData.name = name;

      if (imageUrl || aiImagePrompt) {
        updateData.image = await persistAiProductImage(imageUrl || aiImagePrompt, name || targetProduct.name);
      }

      const updated = await prisma.product.update({
        where: { id: targetProduct.id },
        data: updateData,
      });

      return NextResponse.json({
        success: true,
        message: `Menu "${updated.name}" berhasil diperbarui (Harga: Rp ${updated.price.toLocaleString("id-ID")}${updated.badge ? `, Status: ${updated.badge}` : ""}).`,
        data: updated,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. DELETE / ARCHIVE PRODUCT
    // ──────────────────────────────────────────────────────────────────────────
    if (actionType === "DELETE_PRODUCT") {
      const { productId, productName } = payload;

      let targetProduct = null;
      if (productId) {
        targetProduct = await prisma.product.findUnique({ where: { id: productId } });
      } else if (productName) {
        targetProduct = await prisma.product.findFirst({
          where: { name: { contains: productName, mode: "insensitive" } },
        });
      }

      if (!targetProduct) {
        return NextResponse.json({ error: `Menu "${productName || productId}" tidak ditemukan.` }, { status: 404 });
      }

      // Check if product has active orders, if so mark sold-out instead of hard delete
      const orderCount = await prisma.orderItem.count({
        where: { productId: targetProduct.id },
      });

      if (orderCount > 0) {
        await prisma.product.update({
          where: { id: targetProduct.id },
          data: { badge: "sold-out" },
        });
        return NextResponse.json({
          success: true,
          message: `Menu "${targetProduct.name}" telah memiliki riwayat pesanan, sehingga statusnya berhasil diubah menjadi Nonaktif / Sold-out.`,
        });
      }

      await prisma.product.delete({
        where: { id: targetProduct.id },
      });

      return NextResponse.json({
        success: true,
        message: `Menu "${targetProduct.name}" berhasil dihapus secara permanen dari sistem.`,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. SET PRODUCT RECIPE & RECALCULATE COGS (HPP)
    // ──────────────────────────────────────────────────────────────────────────
    if (actionType === "SET_PRODUCT_RECIPE") {
      const { productId, productName, ingredients = [] } = payload;

      let targetProduct = null;
      if (productId) {
        targetProduct = await prisma.product.findUnique({ where: { id: productId } });
      } else if (productName) {
        targetProduct = await prisma.product.findFirst({
          where: { name: { contains: productName, mode: "insensitive" } },
        });
      }

      if (!targetProduct) {
        return NextResponse.json({ error: `Menu "${productName || productId}" tidak ditemukan.` }, { status: 404 });
      }

      let totalNewHpp = 0;
      const recipeResults: string[] = [];

      await prisma.$transaction(async (tx) => {
        // Delete old recipe links
        await tx.productIngredient.deleteMany({
          where: { productId: targetProduct.id },
        });

        for (const item of ingredients) {
          let ing = null;
          if (item.ingredientId) {
            ing = await tx.ingredient.findUnique({ where: { id: item.ingredientId } });
          } else if (item.ingredientName) {
            ing = await tx.ingredient.findFirst({
              where: { name: { contains: item.ingredientName, mode: "insensitive" } },
            });
            if (!ing) {
              ing = await tx.ingredient.create({
                data: {
                  name: item.ingredientName,
                  unit: item.unit || "g",
                  stock: 1000,
                  costPerUnit: item.costPerUnit || 100,
                  minStockAlert: 100,
                },
              });
            }
          }

          if (ing) {
            const qty = Number(item.quantity) || 1;
            await tx.productIngredient.create({
              data: {
                productId: targetProduct.id,
                ingredientId: ing.id,
                quantity: qty,
              },
            });
            totalNewHpp += qty * ing.costPerUnit;
            recipeResults.push(`${ing.name} (${qty} ${ing.unit})`);
          }
        }
      });

      const newMargin = targetProduct.price > 0 
        ? Math.round(((targetProduct.price - totalNewHpp) / targetProduct.price) * 100) 
        : 0;

      return NextResponse.json({
        success: true,
        message: `Resep menu "${targetProduct.name}" berhasil diperbarui! Komposisi: ${recipeResults.join(", ")}. HPP Baru: Rp ${totalNewHpp.toLocaleString("id-ID")}, Margin: ${newMargin}%.`,
        newHpp: totalNewHpp,
        margin: newMargin,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 6. RESTOCK INGREDIENT
    // ──────────────────────────────────────────────────────────────────────────
    if (actionType === "RESTOCK_INGREDIENT") {
      const { ingredientId, ingredientName, quantity, totalCost, notes, source = "CASH_DRAWER" } = payload;

      let targetIngredient = null;
      if (ingredientId) {
        targetIngredient = await prisma.ingredient.findUnique({ where: { id: ingredientId } });
      } else if (ingredientName) {
        targetIngredient = await prisma.ingredient.findFirst({
          where: { name: { contains: ingredientName, mode: "insensitive" } },
        });
      }

      if (!targetIngredient) {
        return NextResponse.json({ error: `Bahan baku "${ingredientName || ingredientId}" tidak ditemukan.` }, { status: 404 });
      }

      const qty = parseFloat(quantity) || 0;
      const cost = parseInt(totalCost) || 0;
      const newStock = targetIngredient.stock + qty;

      const currentTotalValue = targetIngredient.stock * targetIngredient.costPerUnit;
      const newTotalValue = currentTotalValue + cost;
      const newAverageCost = newStock > 0 ? Math.round(newTotalValue / newStock) : targetIngredient.costPerUnit;

      await prisma.$transaction(async (tx) => {
        await tx.ingredient.update({
          where: { id: targetIngredient.id },
          data: {
            stock: newStock,
            costPerUnit: newAverageCost,
          },
        });

        await tx.stockMovement.create({
          data: {
            ingredientId: targetIngredient.id,
            quantity: qty,
            type: "IN",
            reason: notes ? `Restock AI: ${notes}` : `Restock AI ${targetIngredient.name} (+${qty} ${targetIngredient.unit})`,
          },
        });

        if (cost > 0) {
          const sourceLabel = source === "CASH_DRAWER" ? "Kas Laci (Tunai)" : "Transfer Bank / Rekening";
          await tx.expense.create({
            data: {
              name: `Restock AI: ${targetIngredient.name} (+${qty} ${targetIngredient.unit})`,
              amount: cost,
              category: "RAW_MATERIAL",
              date: new Date(),
              notes: notes
                ? `${notes} [Sumber: ${sourceLabel}]`
                : `Pembelian stok bahan baku ${targetIngredient.name} [Sumber: ${sourceLabel}]`,
            },
          });
        }
      });

      return NextResponse.json({
        success: true,
        message: `Stok "${targetIngredient.name}" berhasil ditambah +${qty} ${targetIngredient.unit} (Total stok baru: ${newStock} ${targetIngredient.unit}).`,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 7. RECORD EXPENSE
    // ──────────────────────────────────────────────────────────────────────────
    if (actionType === "RECORD_EXPENSE") {
      const { name, amount, category = "OPERATIONAL", notes } = payload;

      if (!name || !amount) {
        return NextResponse.json({ error: "Nama pengeluaran dan jumlah nominal wajib diisi" }, { status: 400 });
      }

      const expense = await prisma.expense.create({
        data: {
          name,
          amount: Number(amount) || 0,
          category,
          date: new Date(),
          notes: notes || "Dicatat via Asisten AI Matchaboy",
        },
      });

      return NextResponse.json({
        success: true,
        message: `Pengeluaran "${expense.name}" senilai Rp ${expense.amount.toLocaleString("id-ID")} berhasil dicatat!`,
        data: expense,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 8. FULL MULTI-ENTITY RECEIPT PIPELINE (SCAN STRUK ➔ EXPENSE + RESTOCK + CREATE INGREDIENT)
    // ──────────────────────────────────────────────────────────────────────────
    if (actionType === "FULL_RECEIPT_PIPELINE" || actionType === "BATCH_RECEIPT_RESTOCK") {
      const {
        receiptStoreName = "Supplier",
        receiptDate,
        items = [],
        totalExpense = 0,
        source = "CASH_DRAWER",
      } = payload;

      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: "Daftar item belanjaan struk kosong" }, { status: 400 });
      }

      const results: string[] = [];

      await prisma.$transaction(async (tx) => {
        for (const item of items) {
          let ingredient = null;
          if (item.ingredientId) {
            ingredient = await tx.ingredient.findUnique({ where: { id: item.ingredientId } });
          } else if (item.ingredientName) {
            ingredient = await tx.ingredient.findFirst({
              where: { name: { contains: item.ingredientName, mode: "insensitive" } },
            });
          }

          const qty = parseFloat(item.quantity) || 0;
          const cost = parseInt(item.totalCost) || 0;
          const unit = item.unit || "g";

          // If ingredient does not exist, create new master data!
          if (!ingredient && item.ingredientName && qty > 0) {
            const unitCost = qty > 0 ? Math.round(cost / qty) : 100;
            ingredient = await tx.ingredient.create({
              data: {
                name: item.ingredientName,
                unit: unit,
                stock: qty,
                costPerUnit: unitCost,
                minStockAlert: item.minStockAlert || Math.round(qty * 0.2),
              },
            });

            await tx.stockMovement.create({
              data: {
                ingredientId: ingredient.id,
                quantity: qty,
                type: "IN",
                reason: `Scan Struk [${receiptStoreName}]: Registrasi Bahan Baru (+${qty} ${unit})`,
              },
            });

            results.push(`${ingredient.name} (Baru: +${qty} ${unit})`);
          } else if (ingredient && qty > 0) {
            const newStock = ingredient.stock + qty;
            const currentTotalValue = ingredient.stock * ingredient.costPerUnit;
            const newTotalValue = currentTotalValue + cost;
            const newAverageCost = newStock > 0 ? Math.round(newTotalValue / newStock) : ingredient.costPerUnit;

            await tx.ingredient.update({
              where: { id: ingredient.id },
              data: { stock: newStock, costPerUnit: newAverageCost },
            });

            await tx.stockMovement.create({
              data: {
                ingredientId: ingredient.id,
                quantity: qty,
                type: "IN",
                reason: `Scan Struk [${receiptStoreName}]: +${qty} ${ingredient.unit}`,
              },
            });

            results.push(`${ingredient.name} (+${qty} ${ingredient.unit})`);
          }
        }

        // Record total receipt expense
        const finalCost = totalExpense > 0 ? totalExpense : items.reduce((sum: number, i: any) => sum + (parseInt(i.totalCost) || 0), 0);
        if (finalCost > 0) {
          const sourceLabel = source === "CASH_DRAWER" ? "Kas Laci (Tunai)" : "Transfer Bank / Rekening";
          await tx.expense.create({
            data: {
              name: `Belanja Struk: ${receiptStoreName}`,
              amount: finalCost,
              category: "RAW_MATERIAL",
              date: receiptDate ? new Date(receiptDate) : new Date(),
              notes: `Scan Struk Otomatis (${results.join(", ")}) [Sumber: ${sourceLabel}]`,
            },
          });
        }
      });

      return NextResponse.json({
        success: true,
        message: `Berhasil memproses struk belanja dari "${receiptStoreName}". Bahan terupdate: ${results.join(", ")}. Total pengeluaran: Rp ${totalExpense.toLocaleString("id-ID")}.`,
        updatedItems: results,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 9. CHAINED BATCH ACTIONS (MULTI-STEP ATOMIC EXECUTION)
    // ──────────────────────────────────────────────────────────────────────────
    if (actionType === "CHAINED_BATCH_ACTION") {
      const { actions = [] } = payload;
      if (!Array.isArray(actions) || actions.length === 0) {
        return NextResponse.json({ error: "Daftar batch action kosong." }, { status: 400 });
      }

      const batchResults: string[] = [];

      for (const singleAction of actions) {
        const subRes = await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/admin/ai/actions/execute`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: req.headers.get("cookie") || "",
          },
          body: JSON.stringify(singleAction),
        });

        if (subRes.ok) {
          const subData = await subRes.json();
          batchResults.push(subData.message || `Aksi ${singleAction.actionType} berhasil.`);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Rangkaian aksi multi-langkah berhasil dieksekusi!\n${batchResults.map((r, idx) => `${idx + 1}. ${r}`).join("\n")}`,
        results: batchResults,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 10. SET FLASH SALE
    // ──────────────────────────────────────────────────────────────────────────
    if (actionType === "SET_FLASH_SALE") {
      const { productName, productId, promoPrice } = payload;

      let product = null;
      if (productId) {
        product = await prisma.product.findUnique({ where: { id: productId } });
      } else if (productName) {
        product = await prisma.product.findFirst({
          where: { name: { contains: productName, mode: "insensitive" } },
        });
      }

      if (!product) {
        return NextResponse.json({ error: `Menu "${productName || productId}" tidak ditemukan.` }, { status: 404 });
      }

      // Update product badge and store promo price in modifiers
      let mods: any = {};
      try {
        mods = product.modifiers ? JSON.parse(product.modifiers) : {};
      } catch (_) {}

      mods.flashSale = {
        active: true,
        promoPrice: Number(promoPrice),
        startedAt: new Date().toISOString(),
      };

      const updated = await prisma.product.update({
        where: { id: product.id },
        data: {
          badge: "best-seller",
          modifiers: JSON.stringify(mods),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Flash Sale berhasil diaktifkan untuk menu "${updated.name}" dengan harga promo Rp ${Number(promoPrice).toLocaleString("id-ID")}!`,
        product: updated,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 11. CREATE REAL ORDER (LANGSUNG MASUK PREPARING & POTONG STOK INVENTARIS)
    // ──────────────────────────────────────────────────────────────────────────
    if (actionType === "CREATE_ORDER") {
      const {
        customerName = "Pelanggan Bot AI",
        customerPhone = "-",
        orderType = "PICKUP",
        tableNumber,
        items = [],
        notes = "Pesanan dibuat via Asisten Bot AI",
      } = payload;

      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: "Daftar menu pesanan kosong." }, { status: 400 });
      }

      // Fetch products with their recipe relations
      const allProductNames = items.map((i: any) => i.productName?.toLowerCase()).filter(Boolean);
      const allProductIds = items.map((i: any) => i.productId).filter(Boolean);

      const dbProducts = await prisma.product.findMany({
        where: {
          OR: [
            { id: { in: allProductIds } },
            { name: { in: allProductNames, mode: "insensitive" } },
          ],
        },
        include: {
          productIngredients: {
            include: { ingredient: true },
          },
        },
      });

      if (dbProducts.length === 0) {
        return NextResponse.json({ error: "Menu yang dipesan tidak ditemukan di database toko." }, { status: 404 });
      }

      let calculatedSubtotal = 0;
      const orderItemsToCreate: any[] = [];
      const ingredientDeductionsSummary: string[] = [];

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const createdOrder = await prisma.$transaction(async (tx) => {
        const todayCount = await tx.order.count({
          where: { createdAt: { gte: todayStart } },
        });
        const queueNumber = todayCount + 1;

        for (const reqItem of items) {
          const matchedProd = dbProducts.find(
            (p) =>
              p.id === reqItem.productId ||
              p.name.toLowerCase() === reqItem.productName?.toLowerCase() ||
              p.name.toLowerCase().includes(reqItem.productName?.toLowerCase() || "")
          );

          if (!matchedProd) continue;

          const itemQty = Number(reqItem.quantity) || 1;
          const itemPrice = matchedProd.price;
          calculatedSubtotal += itemPrice * itemQty;

          const modsString = `${reqItem.matchaLevel !== undefined ? `Matcha Lvl: ${reqItem.matchaLevel}, ` : ""}${reqItem.iceLevel || "Normal Ice"}, ${reqItem.sugarLevel || "Biasa"}${reqItem.shotName && reqItem.shotName !== "Single Shot" ? `, +${reqItem.shotName}` : ""}`;

          orderItemsToCreate.push({
            productId: matchedProd.id,
            qty: itemQty,
            price: itemPrice,
            modifiers: modsString,
          });

          // Deduct actual ingredient stocks based on recipe
          if (matchedProd.productIngredients && matchedProd.productIngredients.length > 0) {
            for (const pi of matchedProd.productIngredients) {
              const deductAmount = pi.quantity * itemQty;
              const newRemainingStock = Math.max(0, pi.ingredient.stock - deductAmount);

              await tx.ingredient.update({
                where: { id: pi.ingredientId },
                data: { stock: newRemainingStock },
              });

              await tx.stockMovement.create({
                data: {
                  ingredientId: pi.ingredientId,
                  quantity: -deductAmount,
                  type: "OUT",
                  reason: `Pesanan AI #${queueNumber} (${itemQty}x ${matchedProd.name})`,
                },
              });

              ingredientDeductionsSummary.push(`${pi.ingredient.name} (-${deductAmount} ${pi.ingredient.unit})`);
            }
          }
        }

        if (orderItemsToCreate.length === 0) {
          throw new Error("Tidak ada menu valid yang dapat diproses.");
        }

        // Set table status if dine in
        if (orderType === "DINE_IN" && tableNumber) {
          const tbl = await tx.diningTable.findUnique({
            where: { number: String(tableNumber) },
          });
          if (tbl) {
            await tx.diningTable.update({
              where: { number: String(tableNumber) },
              data: { status: "OCCUPIED" },
            });
          }
        }

        const queueNumberStr = String(queueNumber);

        const newOrder = await tx.order.create({
          data: {
            cashierId: session.user.id,
            customerName,
            customerPhone: customerPhone || "-",
            orderType: orderType === "DINE_IN" ? "DINE_IN" : "PICKUP",
            source: "AI_BOT",
            tableNumber: tableNumber ? String(tableNumber) : null,
            status: "PREPARING",
            paymentMethod: "CASH",
            paymentProofUrl: "/verified-cashier.svg",
            subtotal: Math.round(calculatedSubtotal),
            total: Math.round(calculatedSubtotal),
            deliveryFee: 0,
            notes,
            queueNumber: queueNumberStr,
            items: {
              create: orderItemsToCreate,
            },
          },
          include: {
            items: {
              include: { product: true },
            },
          },
        });

        return newOrder;
      });

      const itemsSummary = createdOrder.items.map((i) => `${i.qty}x ${i.product.name}`).join(", ");
      const stockSummary = ingredientDeductionsSummary.length > 0 ? ` Pemotongan stok gudang: ${ingredientDeductionsSummary.join(", ")}.` : "";

      return NextResponse.json({
        success: true,
        message: `Pesanan #${createdOrder.queueNumber} (${itemsSummary}) berhasil dibuat dengan status PREPARING! Total: Rp ${createdOrder.total.toLocaleString("id-ID")}.${stockSummary}`,
        order: createdOrder,
      });
    }

    return NextResponse.json({ error: `Action type "${actionType}" tidak dikenali.` }, { status: 400 });
  } catch (error: any) {
    console.error("[AI_ACTION_EXECUTE_ERROR]", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
