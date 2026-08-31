import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateStoreAIResponse } from "@/lib/gemini";
import { normalizeVoiceTranscript } from "@/lib/voice-dictionary";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "CASHIER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { transcript } = body;

    if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
      return NextResponse.json({ error: "Transcript is required" }, { status: 400 });
    }

    const normalizedTranscript = normalizeVoiceTranscript(transcript.trim());

    // Fetch all active products and categories
    const products = await prisma.product.findMany({
      where: {
        NOT: {
          badge: 'sold-out'
        }
      },
      include: {
        category: true,
      },
    });

    const productsCatalog = products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      category: p.category?.name,
      modifiers: p.modifiers,
    }));

    const systemInstruction = `Kamu adalah AI Voice-to-Order Parser khusus kasir F&B "Arum Seduh".
Tugasmu: Mengubah ucapan suara kasir/pelanggan bahasa Indonesia menjadi format JSON pesanan yang siap dimasukkan ke keranjang kasir POS.

ATURAN DEFAULT KETAT (PENTING SEKALI):
1. Jika pengguna TIDAK menyebutkan tingkat kemanisan/gula (sugar level) -> Set "sugarLevel": "Biasa" (atau "Normal Sugar").
2. Jika pengguna TIDAK menyebutkan tingkat es (ice level) -> Set "iceLevel": "Normal Ice".
3. Jika pengguna TIDAK menyebutkan level matcha -> Set "matchaLevel": 5.
4. Jika pengguna TIDAK menyebutkan espresso shot tambahan -> Set "shotName": "Single Shot", "shotCount": 1, "shotPrice": 0.
5. Jika pengguna TIDAK menyebutkan ukuran (size) -> Set "size": "Regular", "sizePrice": 0.
6. Jika pengguna TIDAK menyebutkan jumlah item (qty) -> Set "quantity": 1.

PANDUAN PEMCOCOKAN MENU:
- Cocokkan nama minuman/makanan dari ucapan ke "DAFTAR PRODUK TOKO TERSEDIA" di bawah secara cerdas dan toleran terhadap variasi pengucapan (misal: "matcha latte", "es teh", "croissant", "americano dingin", dll).
- Jika ada pelanggan menyebut nama pelanggan (misal: "atas nama Sarah" atau "buat Kak Budi"), isi field "customerName".
- Jika ada pelanggan menyebut nomor meja atau makan di tempat (misal: "makan di tempat meja 3" atau "dine in meja 4"), isi "orderType": "DINE_IN" dan "tableNumber": "3" / "4". Jika "dibungkus" / "takeaway", isi "orderType": "PICKUP".

DAFTAR PRODUK TOKO TERSEDIA:
${JSON.stringify(productsCatalog, null, 2)}

OUTPUT WAJIB HANYA BERUPA JSON VALID (tanpa markdown backtick atau teks lain) dengan format persis:
{
  "customerName": string | null,
  "orderType": "PICKUP" | "DINE_IN" | null,
  "tableNumber": string | null,
  "items": [
    {
      "productId": "string ID produk yang cocok",
      "productName": "string Nama Produk",
      "quantity": number,
      "sugarLevel": "string (default: 'Biasa')",
      "iceLevel": "string (default: 'Normal Ice')",
      "matchaLevel": number (default: 5),
      "size": "string (default: 'Regular')",
      "sizePrice": number (default: 0),
      "shotName": "string (default: 'Single Shot')",
      "shotCount": number (default: 1),
      "shotPrice": number (default: 0),
      "notes": "string"
    }
  ],
  "spokenSummary": "Ringkasan pesanan yang ramah dan singkat"
}`;

    const rawResponse = await generateStoreAIResponse({
      systemInstruction,
      prompt: `Ucapan Kasir / Pelanggan: "${normalizedTranscript}"`,
    });

    let parsedResult = null;
    try {
      const cleanJson = rawResponse.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedResult = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error("[VOICE_ORDER_PARSE_ERROR]", parseErr, "Raw response:", rawResponse);
      return NextResponse.json({ error: "Gagal memproses ucapan suara menjadi pesanan." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: parsedResult,
    });
  } catch (error: any) {
    console.error("[VOICE_ORDER_ROUTE_ERROR]", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
