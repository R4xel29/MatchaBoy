import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { uploadToSupabase } from '@/lib/supabase';

// POST /api/admin/bgm/upload — Upload a custom MP3 background music file
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user || (session.user as any).role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate file type — must be audio/mpeg or mp3
        const isAudio = file.type.startsWith('audio/') || file.name.endsWith('.mp3');
        if (!isAudio) {
            return NextResponse.json({ error: 'Format file tidak valid. Hanya file MP3 yang diperbolehkan.' }, { status: 400 });
        }

        // Validate file size — max 15MB
        const MAX_SIZE = 15 * 1024 * 1024; // 15MB
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'File terlalu besar. Maksimum ukuran adalah 15MB.' }, { status: 400 });
        }

        // Generate unique filename inside the 'bgm' folder
        const timestamp = Date.now();
        const safeName = file.name
            .replace(/\.[^.]+$/, '') // remove extension
            .replace(/[^a-zA-Z0-9-_]/g, '-') // sanitize
            .toLowerCase()
            .slice(0, 50);
        
        // Prefix with 'bgm/' to organize in the Supabase bucket
        const filename = `bgm/${safeName}-${timestamp}.mp3`;

        // Read file into buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to Supabase Storage in 'products' bucket with 'bgm/' prefix
        const publicUrl = await uploadToSupabase(
            'products',
            filename,
            buffer,
            'audio/mpeg'
        );

        return NextResponse.json({ url: publicUrl });
    } catch (error) {
        console.error('BGM audio upload error:', error);
        return NextResponse.json({ error: 'Gagal mengupload audio' }, { status: 500 });
    }
}
