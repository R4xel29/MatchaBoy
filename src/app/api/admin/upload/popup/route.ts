import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { mkdir } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

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

        // Ensure directory exists
        const uploadDir = path.join(process.cwd(), 'public', 'popups');
        await mkdir(uploadDir, { recursive: true });

        // Buffer and process with sharp
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        await sharp(buffer)
            .avif({ quality: 80, effort: 4 })
            .toFile(path.join(uploadDir, filename));

        return NextResponse.json({ url: `/popups/${filename}` });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
