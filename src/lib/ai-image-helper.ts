import { uploadToSupabase } from "@/lib/supabase";

/**
 * Persists an AI-generated product image URL to permanent Supabase Storage.
 * If input is a prompt or external AI generation URL, it fetches the image buffer,
 * uploads it to Supabase bucket 'products', and returns the permanent CDN URL.
 */
export async function persistAiProductImage(
  imageUrlOrPrompt: string | undefined | null,
  productName: string
): Promise<string> {
  const defaultPlaceholder = "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=800&q=80";
  if (!imageUrlOrPrompt || !imageUrlOrPrompt.trim()) {
    return defaultPlaceholder;
  }

  try {
    let sourceUrl = imageUrlOrPrompt.trim();

    // If it's not a URL, construct a high quality studio food photography prompt for Pollinations/Flux
    if (!sourceUrl.startsWith("http://") && !sourceUrl.startsWith("https://")) {
      const sanitizedPrompt = encodeURIComponent(
        `professional high-end food studio photography of ${productName}, ${sourceUrl}, artisanal cafe matcha aesthetic, cinematic lighting, 8k resolution, photorealistic, appetizing, dark minimalist background, shallow depth of field`
      );
      sourceUrl = `https://image.pollinations.ai/prompt/${sanitizedPrompt}?width=800&height=800&nologo=true&seed=${Date.now()}`;
    }

    // Attempt to download image binary with 12-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(sourceUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn("[PERSIST_AI_IMAGE] Image fetch status not OK:", res.status, "using source URL.");
      return sourceUrl;
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ensure valid image buffer
    if (buffer.length < 1000) {
      console.warn("[PERSIST_AI_IMAGE] Image buffer too small, using source URL.");
      return sourceUrl;
    }

    const safeName = productName.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30);
    const filename = `products/ai-${safeName}-${Date.now()}.webp`;

    const publicUrl = await uploadToSupabase("products", filename, buffer, "image/webp");
    return publicUrl || sourceUrl;
  } catch (err: any) {
    console.warn("[PERSIST_AI_IMAGE_FALLBACK] Error downloading/uploading AI image to Supabase:", err?.message || err);
    return imageUrlOrPrompt.startsWith("http") ? imageUrlOrPrompt : defaultPlaceholder;
  }
}
