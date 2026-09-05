import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { uploadToSupabase } from '@/lib/supabase';

// POST /api/admin/store-settings/upload-alarm — Upload custom incoming order alarm audio
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file audio yang diberikan' }, { status: 400 });
    }

    // Validate file type — audio files
    const isAudio =
      file.type.startsWith('audio/') ||
      file.name.endsWith('.mp3') ||
      file.name.endsWith('.wav') ||
      file.name.endsWith('.ogg') ||
      file.name.endsWith('.m4a');

    if (!isAudio) {
      return NextResponse.json(
        { error: 'Format file tidak valid. Hanya file audio (.mp3, .wav, .ogg, .m4a) yang diperbolehkan.' },
        { status: 400 }
      );
    }

    // Validate file size — max 5MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Ukuran file terlalu besar. Maksimum 5MB.' }, { status: 400 });
    }

    // Generate unique filename inside 'alarm/' folder in storage
    const timestamp = Date.now();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'mp3';
    const safeName = file.name
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .toLowerCase()
      .slice(0, 40);

    const filename = `alarm/${safeName}-${timestamp}.${ext}`;

    // Read into buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const contentType =
      file.type ||
      (ext === 'wav' ? 'audio/wav' : ext === 'ogg' ? 'audio/ogg' : 'audio/mpeg');

    const publicUrl = await uploadToSupabase(
      'products',
      filename,
      buffer,
      contentType
    );

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('Alarm audio upload error:', error);
    return NextResponse.json({ error: 'Gagal mengupload file audio alarm' }, { status: 500 });
  }
}
