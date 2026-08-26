import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateStoreAIStream } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "CASHIER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { message, history, image } = body;

    if ((!message || typeof message !== "string" || !message.trim()) && !image) {
      return NextResponse.json({ error: "Message or image is required" }, { status: 400 });
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

FITUR EKSEKUTIF & PROPOSAL AKSI (ACTION PROPOSALS):
Jika pengguna meminta untuk melakukan perubahan data toko nyata (misal: memesan/menambahkan pesanan menu baru, buat voucher baru, ubah harga produk, ubah status menu jadi sold-out/aktif, restock bahan baku, catat pengeluaran, atau menganalisis foto struk belanjaan yang dilampirkan), kamu HARUS memberikan penjelasan ramah terlebih dahulu, lalu di akhir jawaban cantumkan SATU blok JSON Action Proposal dengan format persis seperti ini:

<<<ACTION_PROPOSAL>>>
{
  "actionType": "CREATE_ORDER" | "CREATE_VOUCHER" | "UPDATE_PRODUCT" | "RESTOCK_INGREDIENT" | "RECORD_EXPENSE" | "BATCH_RECEIPT_RESTOCK",
  "title": "Judul Singkat Proposal",
  "summary": "Rangkuman ringkas apa yang akan diubah/dipesan",
  "payload": { ... }
}
<<<END_ACTION_PROPOSAL>>>

PANDUAN PAYLOAD AKSI:
1. CREATE_ORDER (UNTUK MENAMBAH PESANAN TOKO):
   - Jika pengguna meminta pesankan menu (misal: "pesankan 2 matcha latte meja 3 atas nama Budi" atau "tambah pesanan 1 croissant"):
   - payload: { "customerName": "Budi", "orderType": "DINE_IN" | "PICKUP", "tableNumber": "3", "items": [{ "productName": "Matcha Latte", "quantity": 2, "sugarLevel": "Biasa", "iceLevel": "Normal Ice", "matchaLevel": 5, "size": "Regular", "shotName": "Single Shot" }], "notes": "Pesanan dibuat via Asisten Bot AI" }
2. CREATE_VOUCHER:
   - payload: { "code": "KODE", "title": "Nama Promo", "type": "PERCENTAGE" | "FIXED", "discountValue": 20, "minPurchase": 50000, "maxDiscount": 20000, "usageLimit": 30, "terms": "S&K promo" }
3. UPDATE_PRODUCT:
   - payload: { "productName": "Nama Produk", "price": 28000 (opsional), "badge": "sold-out" | "best-seller" | "none" (opsional), "description": "..." (opsional) }
4. RESTOCK_INGREDIENT:
   - payload: { "ingredientName": "Nama Bahan", "quantity": 5, "totalCost": 250000, "notes": "...", "source": "CASH_DRAWER" | "BANK_TRANSFER" }
5. RECORD_EXPENSE:
   - payload: { "name": "Beli Es Batu", "amount": 25000, "category": "RAW_MATERIAL" | "OPERATIONAL" | "MARKETING", "notes": "..." }
6. BATCH_RECEIPT_RESTOCK (untuk struk belanja):
   - payload: { "receiptStoreName": "Nama Toko / Supplier", "receiptDate": "2026-08-26", "totalExpense": 150000, "items": [{ "ingredientName": "Fresh Milk", "quantity": 10, "unitPrice": 15000, "totalCost": 150000 }] }

AKURASI TINGGI PADA HPP & RESEP:
- Sebutkan angka pasti HPP modal, takaran gram/ml, harga beli bahan baku, dan margin keuntungan (%) sesuai data katalog di bawah.

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
    const currentInputText = message || (image ? "Tolong analisa foto struk/gambar terlampir ini dan buatkan proposal restock/expense-nya jika relevan." : "");
    conversationPrompt += `Pengguna: ${currentInputText}\nAsisten:`;

    const responseStream = await generateStoreAIStream({
      systemInstruction,
      prompt: conversationPrompt,
      image: image ? { mimeType: image.mimeType || "image/jpeg", data: image.data } : undefined,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            const chunkText = chunk.text;
            if (chunkText) {
              controller.enqueue(encoder.encode(chunkText));
            }
          }
        } catch (streamErr) {
          console.error("[ADMIN_AI_CHAT_STREAM] Error in stream:", streamErr);
          controller.error(streamErr);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error: any) {
    console.error("[ADMIN_AI_CHAT] Error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
