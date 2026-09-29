import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateStoreAIResponse } from '@/lib/gemini';

function buildSmartFallbackDescription(
  name: string,
  categoryName?: string,
  productType?: string
): string {
  const cleanName = name.trim();
  const lower = `${cleanName} ${categoryName || ''}`.toLowerCase();

  if (productType === 'combo' || lower.includes('paket') || lower.includes('bundle') || lower.includes('combo')) {
    return `Perpaduan hemat dan nikmat ${cleanName} khas Arum Seduh, diracik segar dengan bahan pilihan berkualitas untuk menemani momen santaimu.`;
  }

  if (
    productType === 'makanan' ||
    lower.includes('croissant') ||
    lower.includes('roti') ||
    lower.includes('toast') ||
    lower.includes('pastry') ||
    lower.includes('cake') ||
    lower.includes('cookie') ||
    lower.includes('snack') ||
    lower.includes('mie') ||
    lower.includes('kentang') ||
    lower.includes('rice') ||
    lower.includes('nasi')
  ) {
    return `Sajian ${cleanName} hangat dengan tekstur renyah dan cita rasa gurih-lembut yang kaya, dibuat dari bahan baku pilihan khas dapur Arum Seduh.`;
  }

  if (lower.includes('matcha') || lower.includes('uji') || lower.includes('green tea') || lower.includes('hojicha')) {
    return `Racikan ${cleanName} dengan seduhan bubuk teh hijau autentik beraroma harum dan tekstur creamy yang lembut di setiap tegukan.`;
  }

  if (
    lower.includes('kopi') ||
    lower.includes('coffee') ||
    lower.includes('espresso') ||
    lower.includes('latte') ||
    lower.includes('americano') ||
    lower.includes('cappuccino') ||
    lower.includes('macchiato') ||
    lower.includes('aren')
  ) {
    return `Seduhan ${cleanName} dari biji kopi pilihan dengan keseimbangan rasa bold, aroma karamel yang khas, dan sentuhan akhir yang lembut menyegarkan.`;
  }

  if (
    lower.includes('tea') ||
    lower.includes('teh') ||
    lower.includes('yuzu') ||
    lower.includes('lemon') ||
    lower.includes('berry') ||
    lower.includes('lychee') ||
    lower.includes('peach') ||
    lower.includes('mojito') ||
    lower.includes('squash')
  ) {
    return `Kesegaran ${cleanName} dengan perpaduan ekstrak buah asli dan seduhan pilihan yang ringan, manis seimbang, serta menyegarkan hari Anda.`;
  }

  if (lower.includes('choco') || lower.includes('cokelat') || lower.includes('coklat') || lower.includes('taro') || lower.includes('red velvet')) {
    return `Minuman ${cleanName} bertekstur velvety yang kaya rasa dan creamy, diracik dengan takaran manis yang pas untuk memanjakan lidah.`;
  }

  return `Sajian spesial ${cleanName} khas Arum Seduh yang diracik dari bahan baku berkualitas pilihan untuk menghadirkan cita rasa autentik dan berkesan.`;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (
      !session?.user ||
      ((session.user as any).role !== 'ADMIN' && (session.user as any).role !== 'CASHIER')
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, categoryName, productType } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Nama menu wajib diisi terlebih dahulu' },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    const typeLabel =
      productType === 'makanan'
        ? 'Makanan / Pastry / Cemilan'
        : productType === 'combo'
        ? 'Paket Bundling / Combo'
        : 'Minuman Kafe';

    const systemInstruction = `Kamu adalah Copywriter Kuliner & Barista Kepala untuk brand kafe "Arum Seduh".
Tugasmu adalah membuat deskripsi menu yang singkat, menggugah selera (appetizing), elegan, dan jelas dalam Bahasa Indonesia.
Aturan wajib:
- Panjang: 1 hingga 2 kalimat saja (maksimal 180 karakter).
- Fokus pada profil rasa, tekstur, aroma, dan keunikan menu.
- JANGAN gunakan tanda kutip di awal/akhir, JANGAN gunakan markdown (* atau #), dan JANGAN gunakan emoji.
- JANGAN pernah menyebut nama selain Arum Seduh.`;

    const prompt = `Buatkan deskripsi menu singkat dan menggugah selera untuk produk berikut:
Nama Menu: ${cleanName}
Kategori: ${categoryName || 'Menu Spesial'}
Tipe: ${typeLabel}

Langsung tuliskan teks deskripsinya saja tanpa kata pengantar.`;

    try {
      const aiText = await generateStoreAIResponse({
        prompt,
        systemInstruction,
        temperature: 0.65,
      });

      const cleaned = aiText
        .replace(/^["'“”]+|["'“”]+$/g, '')
        .replace(/\*\*/g, '')
        .replace(/\n+/g, ' ')
        .trim();

      if (cleaned.length >= 15) {
        return NextResponse.json({ description: cleaned });
      }
    } catch (aiErr) {
      console.warn('[AI_PRODUCT_DESC_FALLBACK] Using smart fallback:', aiErr);
    }

    const fallback = buildSmartFallbackDescription(cleanName, categoryName, productType);
    return NextResponse.json({ description: fallback });
  } catch (error) {
    console.error('Error generating AI product description:', error);
    return NextResponse.json(
      { error: 'Gagal membuat deskripsi otomatis' },
      { status: 500 }
    );
  }
}
