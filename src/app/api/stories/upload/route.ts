import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import sharp from 'sharp';
import { uploadToSupabase } from '@/lib/supabase';

const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB before sharp compression
const MAX_VIDEO_SIZE = 30 * 1024 * 1024; // 30MB max video size

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Silakan masuk terlebih dahulu untuk mengunggah Story.' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'File media wajib disertakan.' }, { status: 400 });
    }

    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|heic)$/i.test(file.name);
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: 'Format file tidak didukung. Gunakan foto (JPG/PNG/WebP) atau video (MP4/WebM/MOV).' },
        { status: 400 }
      );
    }

    if (isImage && file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'Ukuran gambar maksimal 15MB.' }, { status: 400 });
    }

    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      return NextResponse.json({ error: 'Ukuran video maksimal 30MB.' }, { status: 400 });
    }

    const timestamp = Date.now();
    const safeName = file.name
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .toLowerCase()
      .slice(0, 40) || 'story';

    const bytes = await file.arrayBuffer();
    const originalBuffer = Buffer.from(bytes);

    if (isImage) {
      // Kompres dan konversi otomatis semua gambar Story menjadi WebP berkualitas optimal
      const processedBuffer = await sharp(originalBuffer)
        .rotate()
        .resize(1080, 1920, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 78, effort: 4 })
        .toBuffer();

      const filename = `stories/img-${session.user.id}-${safeName}-${timestamp}.webp`;
      const publicUrl = await uploadToSupabase('products', filename, processedBuffer, 'image/webp');

      return NextResponse.json({
        success: true,
        url: publicUrl,
        mediaType: 'IMAGE',
        format: 'webp',
        originalSize: originalBuffer.length,
        compressedSize: processedBuffer.length,
      });
    }

    // Penanganan file Video (sudah dikompresi di sisi klien sebelum upload)
    const rawExt = file.name.split('.').pop()?.toLowerCase() || 'mp4';
    const ext = ['mp4', 'webm', 'mov', 'm4v'].includes(rawExt) ? rawExt : 'mp4';
    const contentType =
      file.type && file.type.startsWith('video/')
        ? file.type
        : ext === 'webm'
        ? 'video/webm'
        : 'video/mp4';

    const filename = `stories/vid-${session.user.id}-${safeName}-${timestamp}.${ext}`;
    const publicUrl = await uploadToSupabase('products', filename, originalBuffer, contentType);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      mediaType: 'VIDEO',
      format: ext,
      originalSize: originalBuffer.length,
      compressedSize: originalBuffer.length,
    });
  } catch (error: any) {
    console.error('[STORY_UPLOAD_ERROR]', error);
    return NextResponse.json(
      { error: error?.message || 'Gagal mengunggah media Story.' },
      { status: 500 }
    );
  }
}
