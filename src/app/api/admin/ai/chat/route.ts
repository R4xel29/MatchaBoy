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
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

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
      storeSettings,
      categories
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
          createdAt: true,
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
        select: { storeName: true, storeAddress: true, openTime: true, closeTime: true, pickupAlarmLeadTime: true, whatsappNumber: true },
      }),
      // Categories
      prisma.category.findMany({
        select: { id: true, name: true, slug: true },
      }),
    ]);

    // ──────────────────────────────────────────────────────────────────────────
    // PREDICTIVE ANALYTICS & BURN-RATE FORECAST
    // ──────────────────────────────────────────────────────────────────────────
    const last7DaysOrders = monthOrders.filter((o) => new Date(o.createdAt) >= sevenDaysAgo);

    // Product velocity (units sold in 7 days)
    const productSalesVelocity: Record<string, number> = {};
    for (const ord of last7DaysOrders) {
      for (const item of ord.items) {
        if (item.product?.name) {
          productSalesVelocity[item.product.name] = (productSalesVelocity[item.product.name] || 0) + item.qty;
        }
      }
    }

    // Daily burn-rate per ingredient & forecast days until empty
    const ingredientBurnRateForecast: Record<string, any> = {};
    const criticalStockAlerts: string[] = [];

    for (const ing of ingredients) {
      let totalUsed7d = 0;
      for (const prod of allProducts) {
        const matchRec = prod.productIngredients.find((pi) => pi.ingredient.id === ing.id);
        if (matchRec) {
          const sold = productSalesVelocity[prod.name] || 0;
          totalUsed7d += matchRec.quantity * sold;
        }
      }

      const dailyBurn = Math.round((totalUsed7d / 7) * 10) / 10;
      const daysLeft = dailyBurn > 0 ? Math.round(ing.stock / dailyBurn) : 999;

      ingredientBurnRateForecast[ing.name] = {
        currentStock: `${ing.stock} ${ing.unit}`,
        dailyBurnRate: `${dailyBurn} ${ing.unit}/hari`,
        estimatedDaysRemaining: daysLeft < 999 ? `${daysLeft} hari` : "Aman (>30 hari)",
        costPerUnit: `Rp ${ing.costPerUnit}/${ing.unit}`,
      };

      if (daysLeft <= 4 && dailyBurn > 0) {
        criticalStockAlerts.push(`⚠️ ${ing.name} tersisa ${ing.stock} ${ing.unit} (Burn-rate: ${dailyBurn} ${ing.unit}/hari, diprediksi habis dalam ${daysLeft} hari!).`);
      }
    }

    // Hourly traffic heatmap
    const hourlyTraffic: Record<number, number> = {};
    for (const ord of last7DaysOrders) {
      const h = new Date(ord.createdAt).getHours();
      hourlyTraffic[h] = (hourlyTraffic[h] || 0) + 1;
    }

    // Calculate aggregated stats
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const monthRevenue = monthOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalExpenses = expensesThisMonth.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Deep Catalog Matrix with Exact Recipe & COGS HPP
    const detailedProductCatalog = allProducts.map((p) => {
      let hppModalPerCup = 0;
      const recipeBreakdown = p.productIngredients.map((pi) => {
        const costForItem = pi.quantity * pi.ingredient.costPerUnit;
        hppModalPerCup += costForItem;
        return {
          ingredient: pi.ingredient.name,
          quantity: `${pi.quantity} ${pi.ingredient.unit}`,
          unitCost: `Rp ${pi.ingredient.costPerUnit}/${pi.ingredient.unit}`,
          subtotalCost: `Rp ${costForItem}`,
        };
      });

      const marginNominal = p.price - hppModalPerCup;
      const marginPercent = p.price > 0 ? Math.round((marginNominal / p.price) * 100) : 0;

      return {
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.category?.name || "Uncategorized",
        badge: p.badge || "normal",
        hppModalPerCup: Math.round(hppModalPerCup),
        marginNominal: Math.round(marginNominal),
        marginPercent: `${marginPercent}%`,
        recipeBreakdown,
        sevenDaySalesCount: productSalesVelocity[p.name] || 0,
      };
    });

    const storeContext = {
      realTimeDate: now.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
      businessOverview: {
        todayOrdersCount: todayOrders.length,
        todayRevenue: `Rp ${todayRevenue.toLocaleString("id-ID")}`,
        monthCompletedOrders: monthOrders.length,
        monthRevenue: `Rp ${monthRevenue.toLocaleString("id-ID")}`,
        monthExpenses: `Rp ${totalExpenses.toLocaleString("id-ID")}`,
        netProfitEstimate: `Rp ${(monthRevenue - totalExpenses).toLocaleString("id-ID")}`,
      },
      predictiveAnalytics: {
        criticalStockAlerts,
        ingredientBurnRateForecast,
        hourlySalesPattern: hourlyTraffic,
      },
      productCatalogWithHpp: detailedProductCatalog,
      categories: categories.map((c) => c.name),
      inventoryStock: ingredients.map((i) => ({
        id: i.id,
        name: i.name,
        stock: `${i.stock} ${i.unit}`,
        costPerUnit: `Rp ${i.costPerUnit}/${i.unit}`,
      })),
      toppings: toppings.map((t) => ({ name: t.name, price: t.price, ingredientLinked: t.ingredient?.name })),
      diningTables: diningTables.map((t) => ({ table: t.number, capacity: t.capacity, status: t.status })),
      popularCustomRecipes: customRecipes,
      storeSettings,
    };

    const systemInstruction = `Kamu adalah ASISTEN TOKO MATCHABOY (AUTONOMOUS OPERATOR & CHIEF OPERATING OFFICER).
Kamu memiliki kendali eksekutif penuh (Omnipotent) atas seluruh data toko, manajemen menu, kalkulasi HPP modal, scan struk belanja multi-entitas, dan analitik prediktif.

KEPRIBADIAN & GAYA KOMUNIKASI:
- Berwibawa, proaktif, ramah, solutif, dan berorientasi pada profitabilitas bisnis Matchaboy.
- Panggil bos/pemilik toko dengan sebutan "Bos" yang sopan dan hangat.
- Berikan wawasan analitik prediktif (seperti burn rate bahan baku dan potensi kehabisan stok) secara berkala.

ATURAN FORMATTING TEKS CHAT (WAJIB DIPATUHI):
1. DILARANG KERAS MENGGUNAKAN SIMBOL HASHTAG MARKDOWN SEPERTI "###", "##", "#" DAN GARIS PEMISAH "---".
2. DILARANG MENINGGALKAN BINTANG GANTUNG seperti "Harga Jual:*".
3. Gunakan format chat yang bersih:
   - Judul / Nama Menu: gunakan huruf tebal **Nama Menu**, misal: **1. Matcha Latte (Rp 28.000)**
   - Poin-poin: gunakan bullet point "• " atau penomoran "1.", "2."
   - Gunakan emoji pendukung: 🍵, 💰, 📦, 📊, ⚠️, 🎨, ✨

FITUR EKSEKUTIF & PROPOSAL AKSI (ACTION PROPOSALS):
Jika pengguna meminta aksi nyata (buat menu baru, ubah harga, scan struk supplier, flash sale, restock, atau buat pesanan), kamu HARUS memberikan analisa ramah terlebih dahulu, lalu di akhir jawaban cantumkan SATU blok JSON Action Proposal dengan format persis:

<<<ACTION_PROPOSAL>>>
{
  "actionType": "CREATE_PRODUCT" | "FULL_RECEIPT_PIPELINE" | "CHAINED_BATCH_ACTION" | "SET_FLASH_SALE" | "SET_PRODUCT_RECIPE" | "CREATE_ORDER" | "CREATE_VOUCHER" | "UPDATE_PRODUCT" | "DELETE_PRODUCT" | "RESTOCK_INGREDIENT" | "RECORD_EXPENSE",
  "title": "Judul Proposal Aksi",
  "summary": "Rangkuman ringkas perubahan",
  "payload": { ... }
}
<<<END_ACTION_PROPOSAL>>>

PANDUAN PAYLOAD AKSI:
1. CREATE_PRODUCT (BUAT MENU BARU LENGKAP DENGAN FOTO AI & RESEP):
   - payload: {
       "name": "Matcha Mango Cloud",
       "description": "Artisan matcha dengan puree mangga manis dan cloud foam.",
       "price": 32000,
       "categoryName": "Signature Matcha",
       "badge": "new",
       "aiImagePrompt": "artisanal layered matcha mango cloud drink in ribbed glass with foam on wooden cafe table, soft cinematic sunlight, 8k resolution",
       "imageUrl": "https://image.pollinations.ai/prompt/artisanal%20layered%20matcha%20mango%20cloud%20drink%20in%20ribbed%20glass%20with%20foam%20on%20wooden%20cafe%20table%20cinematic%208k?width=800&height=800&nologo=true",
       "modifiers": { "sugarLevel": ["Less Sugar (50%)", "Normal (100%)"], "iceLevel": ["Normal Ice", "Less Ice"] },
       "recipes": [{ "ingredientName": "Bubuk Matcha Premium", "quantity": 6 }, { "ingredientName": "Fresh Milk", "quantity": 140 }, { "ingredientName": "Cup 16oz & Lid", "quantity": 1 }]
     }
2. FULL_RECEIPT_PIPELINE (SCAN STRUK SUPPLIER MULTI-ENTITAS):
   - payload: {
       "receiptStoreName": "Nama Toko Supplier",
       "receiptDate": "2026-08-26",
       "totalExpense": 350000,
       "source": "CASH_DRAWER" | "BANK_TRANSFER",
       "items": [{ "ingredientName": "Fresh Milk", "quantity": 12000, "unit": "ml", "totalCost": 216000 }]
     }
3. SET_FLASH_SALE:
   - payload: { "productName": "Matcha Croissant", "promoPrice": 18000 }
4. CREATE_ORDER:
   - payload: { "customerName": "Budi", "orderType": "DINE_IN" | "PICKUP", "tableNumber": "3", "items": [{ "productName": "Matcha Latte", "quantity": 2 }] }
5. SET_PRODUCT_RECIPE:
   - payload: { "productName": "Matcha Latte", "ingredients": [{ "ingredientName": "Bubuk Matcha Premium", "quantity": 8 }, { "ingredientName": "Fresh Milk", "quantity": 180 }] }
6. CREATE_VOUCHER:
   - payload: { "code": "HEMAT20", "title": "Diskon 20%", "discountValue": 20, "minPurchase": 40000 }

DATABASE STORE REAL-TIME, HPP, RESEP, & PREDICTIVE ANALYTICS:
${JSON.stringify(storeContext, null, 2)}`;

    // Build history prompt
    let conversationPrompt = "";
    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-6);
      conversationPrompt = recentHistory
        .map((h: any) => `${h.role === "user" ? "Bos" : "Asisten"}: ${h.content}`)
        .join("\n\n");
      conversationPrompt += `\n\nBos: ${message || "Tolong analisa gambar/struk terlampir."}\nAsisten:`;
    } else {
      conversationPrompt = `Bos: ${message || "Tolong analisa gambar/struk terlampir."}\nAsisten:`;
    }

    // Call Gemini streaming API with optional image payload
    const stream = await generateStoreAIStream(
      conversationPrompt,
      systemInstruction,
      image ? { data: image.data, mimeType: image.mimeType } : undefined
    );

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error: any) {
    console.error("[ADMIN_AI_CHAT_STREAM_ERROR]", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
