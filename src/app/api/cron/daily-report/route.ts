import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage, standardizeJid } from "@/lib/whatsapp-service";
import { generateStoreAIResponse } from "@/lib/gemini";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

async function executeDailyReport() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayEnd = new Date(todayEnd.getTime() - 24 * 60 * 60 * 1000);

  // Non-SPMB pending filter
  const nonSpmbFilter = {
    NOT: {
      source: "SPMB",
      customerPhone: { startsWith: "SPMB-PENDING" },
    },
  };

  const [
    todayOrders,
    yesterdayOrders,
    todayOrderItems,
    criticalIngredients,
    storeSettings
  ] = await Promise.all([
    prisma.order.findMany({
      where: {
        createdAt: { gte: todayStart, lte: todayEnd },
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
    prisma.order.findMany({
      where: {
        createdAt: { gte: yesterdayStart, lte: yesterdayEnd },
        status: { in: ["COMPLETED", "DELIVERED"] },
        ...nonSpmbFilter,
      },
      select: { total: true },
    }),
    prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: todayStart, lte: todayEnd },
          status: { in: ["COMPLETED", "DELIVERED"] },
          ...nonSpmbFilter,
        },
      },
      include: {
        product: {
          select: {
            name: true,
            productIngredients: {
              include: {
                ingredient: { select: { costPerUnit: true } },
              },
            },
          },
        },
      },
    }),
    prisma.ingredient.findMany({
      where: { stock: { lte: 5 } },
      select: { name: true, stock: true, unit: true },
      take: 4,
    }),
    prisma.storeSettings.findFirst({
      select: { adminWaNumbers: true, whatsappNumber: true, storeName: true },
    }),
  ]);

  const completedToday = todayOrders.filter((o) => ["COMPLETED", "DELIVERED"].includes(o.status));
  const todayRevenue = completedToday.reduce((sum, o) => sum + o.total, 0);
  const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + o.total, 0);

  // Calculate actual HPP modal of sold items
  let todayEstimatedHPP = 0;
  todayOrderItems.forEach((item) => {
    if (item.product?.productIngredients) {
      item.product.productIngredients.forEach((pi) => {
        todayEstimatedHPP += (pi.quantity || 0) * (pi.ingredient?.costPerUnit || 0) * item.qty;
      });
    }
  });
  const todayGrossProfit = todayRevenue - todayEstimatedHPP;

  // Revenue diff percentage
  let diffText = "stabil";
  if (yesterdayRevenue > 0) {
    const diffPct = Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100);
    diffText = diffPct >= 0 ? `naik +${diffPct}% dibanding kemarin` : `turun ${diffPct}% dibanding kemarin`;
  }

  // Payment Breakdown
  let qrisTotal = 0;
  let cashTotal = 0;
  let otherTotal = 0;

  completedToday.forEach((o) => {
    const pm = (o.paymentMethod || "").toUpperCase();
    if (pm.includes("QRIS")) qrisTotal += o.total;
    else if (pm === "CASH" || pm === "TUNAI" || pm === "COD") cashTotal += o.total;
    else otherTotal += o.total;
  });

  // Top Products
  const productMap = new Map<string, number>();
  todayOrderItems.forEach((item) => {
    const name = item.product?.name || "Matcha Drink";
    productMap.set(name, (productMap.get(name) || 0) + item.qty);
  });

  const topProducts = Array.from(productMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, qty]) => `${name} (${qty} cup)`);

  const totalCups = todayOrderItems.reduce((sum, i) => sum + i.qty, 0);

  // Prepare AI summary prompt
  const dataSummary = {
    tanggal: now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    namaToko: storeSettings?.storeName || "Arum Seduh",
    totalOmzet: `Rp ${todayRevenue.toLocaleString("id-ID")}`,
    estimasiHppModalBahan: `Rp ${Math.round(todayEstimatedHPP).toLocaleString("id-ID")}`,
    estimasiLabaKotor: `Rp ${Math.round(todayGrossProfit).toLocaleString("id-ID")}`,
    totalTransaksi: `${completedToday.length} transaksi selesai (dari ${todayOrders.length} pesanan masuk)`,
    totalCupTerjual: `${totalCups} cup/item`,
    trenVsKemarin: diffText,
    metodeBayar: {
      qrisDoku: `Rp ${qrisTotal.toLocaleString("id-ID")}`,
      tunaiCash: `Rp ${cashTotal.toLocaleString("id-ID")}`,
      lainnya: otherTotal > 0 ? `Rp ${otherTotal.toLocaleString("id-ID")}` : undefined,
    },
    topMenu: topProducts.length > 0 ? topProducts : ["Belum ada transaksi selesai hari ini"],
    stokMenipis: criticalIngredients.map((ing) => `${ing.name} (sisa ${ing.stock} ${ing.unit})`),
  };

  let whatsappMessageText = "";

  try {
    const systemPrompt = `Kamu adalah "Asisten Toko Arum Seduh", asisten pribadi cerdas dan ramah bagi pemilik kedai teh dan kopi.
Tugasmu adalah menyusun Laporan Penjualan Harian yang dikirim ke WhatsApp pemilik toko.
Format aturan:
- Gunakan bahasa Indonesia santai namun profesional dan hangat (sapa pemilik dengan "Halo Bos" atau "Malam Bos").
- Gunakan formatting WhatsApp: tebal gunakan asterisk (*kata*).
- Jangan terlalu panjang, buat padat, rapi, dan mudah di-scan dengan mata dalam 10 detik.
- Tambahkan 1 kalimat penutup apresiatif atau tips singkat untuk esok hari.
- JANGAN sertakan markdown backticks atau code block, langsung teks polos format WhatsApp.`;

    const userPrompt = `Berikut data operasional toko hari ini:\n${JSON.stringify(dataSummary, null, 2)}\n\nBuatkan pesan WhatsApp rekap harian yang rapi dan memotivasi!`;

    whatsappMessageText = await generateStoreAIResponse({
      systemInstruction: systemPrompt,
      prompt: userPrompt,
    });
  } catch (aiErr) {
    console.error("[DAILY_REPORT] AI generation fallback to template:", aiErr);
    // Fallback template if AI fails
    whatsappMessageText = `*REKAP PENJUALAN HARIAN ARUM SEDUH*\n${dataSummary.tanggal}\n\n` +
      `*Total Omzet:* ${dataSummary.totalOmzet}\n` +
      `*Terjual:* ${dataSummary.totalCupTerjual} (${dataSummary.totalTransaksi})\n` +
      `*Tren:* ${dataSummary.trenVsKemarin}\n\n` +
      `*Rincian Pembayaran:*\n` +
      `• QRIS: ${dataSummary.metodeBayar.qrisDoku}\n` +
      `• Tunai: ${dataSummary.metodeBayar.tunaiCash}\n\n` +
      `*Top Menu Hari Ini:*\n${dataSummary.topMenu.map((m, idx) => `${idx + 1}. ${m}`).join("\n")}\n\n` +
      (dataSummary.stokMenipis.length > 0 ? `*Perhatian Stok:* ${dataSummary.stokMenipis.join(", ")}\n\n` : "") +
      `_Terima kasih atas kerja keras hari ini, Bos! Selamat istirahat._`;
  }

  // Determine recipient phone numbers
  const recipientNumbers: string[] = [];
  if (storeSettings?.adminWaNumbers) {
    storeSettings.adminWaNumbers.split(/[,;\n]/).forEach((num) => {
      const trimmed = num.trim();
      if (trimmed) recipientNumbers.push(trimmed);
    });
  }
  if (recipientNumbers.length === 0 && storeSettings?.whatsappNumber) {
    recipientNumbers.push(storeSettings.whatsappNumber);
  }

  // Send WhatsApp message to each admin number
  const sentResults: Array<{ phone: string; status: string }> = [];
  for (const phone of recipientNumbers) {
    const jid = standardizeJid(phone);
    try {
      await sendWhatsAppMessage(jid, whatsappMessageText);
      sentResults.push({ phone, status: "SENT" });
    } catch (err: any) {
      console.error(`[DAILY_REPORT] Failed sending WA to ${phone}:`, err);
      sentResults.push({ phone, status: `FAILED: ${err?.message}` });
    }
  }

  return {
    success: true,
    dataSummary,
    messageSent: whatsappMessageText,
    recipients: sentResults,
  };
}

// GET: Cron trigger (e.g. at 21:00 or 22:00)
export async function GET(req: Request) {
  try {
    const requestUrl = new URL(req.url);
    const token = req.headers.get("x-api-key") || requestUrl.searchParams.get("token");

    const expectedToken = process.env.WA_BOT_API_KEY;
    if (expectedToken && token !== expectedToken) {
      // Check if logged in admin
      const session = await auth();
      if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
    }

    const result = await executeDailyReport();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[DAILY_REPORT] Error:", error);
    return NextResponse.json({ success: false, error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}

// POST: Instant trigger from Admin Dashboard button
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "CASHIER") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const result = await executeDailyReport();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[DAILY_REPORT_POST] Error:", error);
    return NextResponse.json({ success: false, error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
