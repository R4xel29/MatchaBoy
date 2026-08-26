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

    // Fetch live store intelligence context
    const [
      todayOrders,
      monthOrders,
      allProducts,
      ingredients,
      expensesThisMonth,
      diningTables,
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
      // All active products
      prisma.product.findMany({
        select: { id: true, name: true, price: true, badge: true, category: { select: { name: true } } },
      }),
      // Stock ingredients
      prisma.ingredient.findMany({
        select: { id: true, name: true, stock: true, unit: true, costPerUnit: true },
      }),
      // Expenses this month
      prisma.expense.findMany({
        where: { date: { gte: thirtyDaysAgo } },
        select: { name: true, amount: true, category: true },
      }),
      // Dining tables
      prisma.diningTable.findMany({
        select: { number: true, status: true, capacity: true, occupiedSeats: true },
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

    // Low stock alerts
    const lowStockIngredients = ingredients
      .filter((ing) => ing.stock <= 5)
      .map((ing) => `${ing.name} (sisa ${ing.stock} ${ing.unit})`);

    const totalExpenses = expensesThisMonth.reduce((sum, e) => sum + e.amount, 0);

    // Build Context Snapshot
    const storeContext = {
      namaToko: storeSettings?.storeName || "Matchaboy",
      jamOperasional: `${storeSettings?.openTime || "08:00"} - ${storeSettings?.closeTime || "21:00"}`,
      performaHariIni: {
        omzet: `Rp ${todayRevenue.toLocaleString("id-ID")}`,
        transaksiSelesai: todayCompleted.length,
        totalPesananMasuk: todayOrders.length,
      },
      performa30Hari: {
        totalOmzet: `Rp ${monthRevenue.toLocaleString("id-ID")}`,
        totalTransaksi: monthOrderCount,
        rataRataPerTransaksi: `Rp ${avgOrderValue.toLocaleString("id-ID")}`,
        totalPengeluaran: `Rp ${totalExpenses.toLocaleString("id-ID")}`,
        estimasiLabaOperasional: `Rp ${(monthRevenue - totalExpenses).toLocaleString("id-ID")}`,
      },
      menuTerlaris30Hari: topProducts.map((p) => `${p.name} (${p.qty} cup terjual, omzet Rp ${p.revenue.toLocaleString("id-ID")})`),
      menuPalingSepi: slowestProducts.map((p) => `${p.name} (hanya ${p.qty} cup terjual)`),
      stokBahanKritis: lowStockIngredients.length > 0 ? lowStockIngredients : ["Semua persediaan bahan baku aman (>5 unit)"],
      mejaDineIn: `${diningTables.filter((t) => t.status === "OCCUPIED").length} terisi dari ${diningTables.length} meja total`,
    };

    const systemInstruction = `Kamu adalah "Asisten Toko Matchaboy", asisten bisnis digital internal & penasihat operasional pemilik toko.
Kepribadianmu:
- Ramah, cerdas, proaktif, dan fokus pada solusi praktis bagi pemilik usaha F&B (Matcha).
- Panggil pengguna dengan "Bos" atau "Kak".
- Jawab secara ringkas, jelas, dan akurat berdasarkan data toko nyata yang diberikan di bawah.
- Jika pengguna meminta ide promo/strategi penjualan, berikan ide kreatif yang mudah dieksekusi dengan memperhitungkan menu yang sepi vs menu terlaris.
- Gunakan formatting markdown (tebal, bullet points, numbering) agar mudah dibaca di layar dashboard.

DATA OPERASIONAL TOKO TERKINI:
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
