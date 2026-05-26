import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import sharp from 'sharp';
import { uploadToSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Must be image
        if (!file.type.includes('image')) {
            return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const safeName = file.name
            .replace(/\.[^.]+$/, '') // remove extension
            .replace(/[^a-zA-Z0-9-_]/g, '-') // sanitize
            .toLowerCase()
            .slice(0, 50);
        
        const filename = `${safeName}-${timestamp}.avif`;

        // Buffer and process with sharp (in-memory, no filesystem write)
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const processedBuffer = await sharp(buffer)
            .avif({ quality: 80, effort: 4 })
            .toBuffer();

        // Upload to Supabase Storage
        const publicUrl = await uploadToSupabase(
            'popups',
            filename,
            processedBuffer,
            'image/avif'
        );

        return NextResponse.json({ url: publicUrl });
    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json({ 
            error: 'Upload failed', 
            detail: error?.message || String(error) 
        }, { status: 500 });
    }
}
