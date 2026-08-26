import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
          terms: terms || "Berlaku untuk seluruh menu Arum Seduh.",
          expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // default 30 days
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
    // 2. UPDATE PRODUCT (PRICE / BADGE / STATUS)
    // ──────────────────────────────────────────────────────────────────────────
    if (actionType === "UPDATE_PRODUCT") {
      const { productId, productName, price, badge, description, name } = payload;

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
    // 3. RESTOCK INGREDIENT
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
    // 4. RECORD EXPENSE
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
    // 5. BATCH RECEIPT RESTOCK & EXPENSES (SCAN STRUK)
    // ──────────────────────────────────────────────────────────────────────────
    if (actionType === "BATCH_RECEIPT_RESTOCK") {
      const { receiptStoreName = "Supplier", receiptDate, items = [], totalExpense = 0, source = "CASH_DRAWER" } = payload;

      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: "Daftar item belanjaan kosong" }, { status: 400 });
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

          if (ingredient && qty > 0) {
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
        message: `Berhasil memproses struk belanja dari "${receiptStoreName}". Stok terupdate: ${results.join(", ")}. Total pengeluaran: Rp ${totalExpense.toLocaleString("id-ID")}.`,
        updatedItems: results,
      });
    }

    return NextResponse.json({ error: `Action type "${actionType}" tidak dikenali.` }, { status: 400 });
  } catch (error: any) {
    console.error("[AI_ACTION_EXECUTE_ERROR]", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
