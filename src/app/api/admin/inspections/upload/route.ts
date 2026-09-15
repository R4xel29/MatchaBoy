import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { uploadToSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'CASHIER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'File gambar wajib disertakan' }, { status: 400 });
    }

    if (!file.type.includes('image')) {
      return NextResponse.json({ error: 'Format file tidak valid. Hanya gambar yang diperbolehkan.' }, { status: 400 });
    }

    // Maksimal 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Ukuran file terlalu besar. Maksimal 5MB.' }, { status: 400 });
    }

    const subType = (formData.get('type') as string) || 'sop';
    const timestamp = Date.now();
    const safeName = file.name
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .toLowerCase()
      .slice(0, 40);

    const filename = `inspections/${subType}/${safeName}-${timestamp}.webp`;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const publicUrl = await uploadToSupabase(
      'products',
      filename,
      buffer,
      'image/webp'
    );

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error: any) {
    console.error('[INSPECTION_UPLOAD_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Gagal mengunggah gambar' }, { status: 500 });
  }
}
