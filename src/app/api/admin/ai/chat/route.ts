import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateStoreAIResponse } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "CASHIER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { message, history } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const nonSpmbFilter = {
      NOT: {
        source: "SPMB",
        customerPhone: { startsWith: "SPMB-PENDING" },
      },
    };

    // Fetch live store intelligence context with deep recipe & HPP relations
    const [
      todayOrders,
      monthOrders,
      allProducts,
      ingredients,
      toppings,
      expensesThisMonth,
      diningTables,
      customRecipes,
      storeSettings
    ] = await Promise.all([
      // Today's orders
      prisma.order.findMany({
        where: {
          createdAt: { gte: todayStart },
          ...nonSpmbFilter,
        },
        select: {
          id: true,
          total: true,
          status: true,
          orderType: true,
          paymentMethod: true,
        },
      }),
      // Last 30 days completed orders & items
      prisma.order.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          status: { in: ["COMPLETED", "DELIVERED"] },
          ...nonSpmbFilter,
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, price: true } },
            },
          },
        },
      }),
      // All active products WITH complete recipe composition & ingredient costs
      prisma.product.findMany({
        include: {
          category: { select: { name: true } },
          productIngredients: {
            include: {
              ingredient: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                  stock: true,
                  costPerUnit: true,
                  isPackaging: true,
                },
              },
            },
          },
        },
      }),
      // Stock ingredients
      prisma.ingredient.findMany({
        select: { id: true, name: true, stock: true, unit: true, costPerUnit: true, isPackaging: true },
        orderBy: { stock: "asc" },
      }),
      // Toppings with ingredient relations
      prisma.topping.findMany({
        include: {
          ingredient: { select: { name: true, unit: true, costPerUnit: true, stock: true } },
        },
      }),
      // Expenses this month
      prisma.expense.findMany({
        where: { date: { gte: thirtyDaysAgo } },
        select: { name: true, amount: true, category: true, date: true },
      }),
      // Dining tables
      prisma.diningTable.findMany({
        select: { number: true, status: true, capacity: true, occupiedSeats: true },
      }),
      // Popular custom recipes created by users
      prisma.customRecipe.findMany({
        take: 5,
        orderBy: { orderCount: "desc" },
        select: { recipeName: true, matchaLevel: true, milkType: true, sweetness: true, orderCount: true },
      }),
      // Store settings
      prisma.storeSettings.findFirst({
        select: { storeName: true, openTime: true, closeTime: true },
      }),
    ]);

    // Calculate Today Metrics
    const todayCompleted = todayOrders.filter((o) => ["COMPLETED", "DELIVERED"].includes(o.status));
    const todayRevenue = todayCompleted.reduce((sum, o) => sum + o.total, 0);

    // Calculate 30-Day Metrics
    const monthRevenue = monthOrders.reduce((sum, o) => sum + o.total, 0);
    const monthOrderCount = monthOrders.length;
    const avgOrderValue = monthOrderCount > 0 ? Math.round(monthRevenue / monthOrderCount) : 0;

    // Detailed Product HPP, Recipe & Margin Map
    const detailedMenuCatalog = allProducts.map((p) => {
      let totalHPP = 0;
      const recipeBreakdown = p.productIngredients.map((pi) => {
        const cost = (pi.quantity || 0) * (pi.ingredient.costPerUnit || 0);
        totalHPP += cost;
        return {
          bahan: pi.ingredient.name,
          takaranPerPorsi: `${pi.quantity} ${pi.ingredient.unit}`,
          hargaBeliBahan: `Rp ${pi.ingredient.costPerUnit.toLocaleString("id-ID")}/${pi.ingredient.unit}`,
          biayaKomponen: `Rp ${Math.round(cost).toLocaleString("id-ID")}`,
          sisaStokBahanDiGudang: `${pi.ingredient.stock} ${pi.ingredient.unit}`,
          tipe: pi.ingredient.isPackaging ? "Kemasan/Packaging" : "Bahan Baku Resep",
        };
      });

      const profitRupiah = p.price - totalHPP;
      const profitMarginPercent = p.price > 0 ? Math.round((profitRupiah / p.price) * 100) : 0;

      // Estimate max cups that can be made with current remaining stock
      let maxCupsCanMake = 999999;
      if (p.productIngredients.length > 0) {
        p.productIngredients.forEach((pi) => {
          if (pi.quantity > 0) {
            const possible = Math.floor(pi.ingredient.stock / pi.quantity);
            if (possible < maxCupsCanMake) maxCupsCanMake = Math.max(0, possible);
          }
        });
      } else {
        maxCupsCanMake = 0; // No recipe configured
      }

      return {
        id: p.id,
        namaMenu: p.name,
        kategori: p.category?.name || "Matcha",
        deskripsi: p.description || "-",
        hargaJual: `Rp ${p.price.toLocaleString("id-ID")}`,
        hppModalBahan: `Rp ${Math.round(totalHPP).toLocaleString("id-ID")}`,
        keuntunganKotorPerCup: `Rp ${Math.round(profitRupiah).toLocaleString("id-ID")}`,
        marginLabaPersen: `${profitMarginPercent}%`,
        estimasiPorsiTersediaDariStok: maxCupsCanMake === 999999 ? "Tidak terbatas (belum ada resep)" : `${maxCupsCanMake} porsi`,
        rincianResepDanKomposisi: recipeBreakdown.length > 0 ? recipeBreakdown : "Belum di-mapping resep bahan baku",
      };
    });

    // Calculate Product Performance (Sales Frequency)
    const productSalesMap = new Map<string, { name: string; qty: number; revenue: number; category: string }>();
    allProducts.forEach((p) => {
      productSalesMap.set(p.id, { name: p.name, qty: 0, revenue: 0, category: p.category?.name || "Matcha" });
    });

    monthOrders.forEach((order) => {
      order.items.forEach((item) => {
        if (item.product) {
          const curr = productSalesMap.get(item.product.id) || {
            name: item.product.name,
            qty: 0,
            revenue: 0,
            category: "Matcha",
          };
          curr.qty += item.qty;
          curr.revenue += item.qty * item.price;
          productSalesMap.set(item.product.id, curr);
        }
      });
    });

    const sortedProducts = Array.from(productSalesMap.values()).sort((a, b) => b.qty - a.qty);
    const topProducts = sortedProducts.slice(0, 5);
    const slowestProducts = sortedProducts.filter((p) => p.qty <= 3).slice(0, 5);

    // Master Ingredients stock list & valuation
    let totalInventoryValuation = 0;
    const masterIngredientList = ingredients.map((ing) => {
      const valuation = ing.stock * ing.costPerUnit;
      totalInventoryValuation += valuation;
      return {
        namaBahan: ing.name,
        sisaStok: `${ing.stock} ${ing.unit}`,
        hargaBeliPerUnit: `Rp ${ing.costPerUnit.toLocaleString("id-ID")}/${ing.unit}`,
        totalNilaiStok: `Rp ${Math.round(valuation).toLocaleString("id-ID")}`,
        status: ing.stock <= 5 ? "⚠️ MENIPIS / KRITIS" : "✅ AMAN",
      };
    });

    // Toppings catalog
    const toppingsCatalog = toppings.map((t) => ({
      namaTopping: t.name,
      hargaJual: `Rp ${t.price.toLocaleString("id-ID")}`,
      bahanTerkait: t.ingredient ? `${t.ingredient.name} (${t.ingredientQty} ${t.ingredient.unit})` : "Manual",
      biayaModal: t.ingredient ? `Rp ${Math.round(t.ingredientQty * t.ingredient.costPerUnit).toLocaleString("id-ID")}` : "-",
    }));

    const totalExpenses = expensesThisMonth.reduce((sum, e) => sum + e.amount, 0);

    // Build Comprehensive Context Snapshot
    const storeContext = {
      namaToko: storeSettings?.storeName || "Matchaboy",
      jamOperasional: `${storeSettings?.openTime || "08:00"} - ${storeSettings?.closeTime || "21:00"}`,
      ringkasanPenjualanHariIni: {
        omzet: `Rp ${todayRevenue.toLocaleString("id-ID")}`,
        transaksiSelesai: todayCompleted.length,
        totalPesananMasuk: todayOrders.length,
      },
      ringkasanPerforma30Hari: {
        totalOmzet: `Rp ${monthRevenue.toLocaleString("id-ID")}`,
        totalTransaksi: monthOrderCount,
        rataRataNilaiTransaksi: `Rp ${avgOrderValue.toLocaleString("id-ID")}`,
        totalPengeluaranOperasional: `Rp ${totalExpenses.toLocaleString("id-ID")}`,
        estimasiLabaBersihSetelahExpense: `Rp ${(monthRevenue - totalExpenses).toLocaleString("id-ID")}`,
      },
      menuTerlaris30Hari: topProducts.map((p) => `${p.name} (${p.qty} cup terjual, omzet Rp ${p.revenue.toLocaleString("id-ID")})`),
      menuPalingSepi30Hari: slowestProducts.map((p) => `${p.name} (hanya ${p.qty} cup terjual)`),
      katalogLengkapMenuDanHPPResep: detailedMenuCatalog,
      stokGudangDanBahanBaku: masterIngredientList,
      totalNilaiAsetStokGudang: `Rp ${Math.round(totalInventoryValuation).toLocaleString("id-ID")}`,
      katalogTopping: toppingsCatalog,
      resepKustomFavoritPelanggan: customRecipes.map((cr) => `${cr.recipeName} (${cr.milkType}, Matcha Lvl ${cr.matchaLevel}, dipesan ${cr.orderCount}x)`),
      mejaDineIn: `${diningTables.filter((t) => t.status === "OCCUPIED").length} terisi dari ${diningTables.length} meja total`,
    };

    const systemInstruction = `Kamu adalah "Asisten Toko Matchaboy", asisten bisnis digital dan manajer operasional internal kedai Matcha.

ATURAN FORMATTING & TAMPILAN KETAT:
1. DILARANG KERAS MENGGUNAKAN SIMBOL HASHTAG MARKDOWN SEPERTI "###", "##", "#" DAN GARIS PEMISAH "---".
2. DILARANG MENINGGALKAN BINTANG GANTUNG seperti "Harga Jual:*".
3. Gunakan formatting chat yang bersih:
   - Judul / Nama Menu: gunakan huruf tebal **Nama Menu**, misal: **1. Matcha Latte (Rp 28.000)**
   - Poin-poin: gunakan bullet point "• " atau penomoran "1.", "2."
   - Gunakan emoji pendukung yang relevan: 🍵, 💰, 📦, 📊, ⚠️, ✨
4. AKURASI TINGGI PADA HPP & RESEP:
   - Sebutkan angka pasti HPP modal, takaran gram/ml, harga beli bahan baku, dan margin keuntungan (%) sesuai data katalog di bawah.
   - Jika ditanya resep atau HPP, format dengan rapi:
     **1. Nama Menu** (Harga Jual: Rp XX.XXX)
     • Takaran Resep: [Bahan A: XX gr (@Rp XX), Bahan B: XX ml (@Rp XX)]
     • Total HPP Modal: Rp XX.XXX
     • Laba Kotor per Cup: Rp XX.XXX (Margin: XX%)
     • Estimasi Sisa Porsi dari Stok: XX porsi
5. GAYA BAHASA:
   - Ramah, cerdas, solutif, panggil pemilik dengan "Bos" atau "Kak".

DATABASE RESEP, HPP, STOK, & DATA TOKO REAL-TIME:
${JSON.stringify(storeContext, null, 2)}`;

    // Build history prompt if provided
    let conversationPrompt = "";
    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-6);
      recentHistory.forEach((h: { role: string; content: string }) => {
        conversationPrompt += `${h.role === "user" ? "Pengguna" : "Asisten"}: ${h.content}\n`;
      });
    }
    conversationPrompt += `Pengguna: ${message}\nAsisten:`;

    const aiReply = await generateStoreAIResponse({
      systemInstruction,
      prompt: conversationPrompt,
    });

    return NextResponse.json({
      success: true,
      reply: aiReply,
    });
  } catch (error: any) {
    console.error("[ADMIN_AI_CHAT] Error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
