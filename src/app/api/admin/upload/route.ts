import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate file type — must be WebP (client already compressed)
        if (!file.type.includes('webp') && !file.type.includes('image')) {
            return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
        }

        // Validate file size — max 500KB (post-compression should be small)
        if (file.size > 500 * 1024) {
            return NextResponse.json({ error: 'File too large. Max 500KB.' }, { status: 400 });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const safeName = file.name
            .replace(/\.[^.]+$/, '') // remove extension
            .replace(/[^a-zA-Z0-9-_]/g, '-') // sanitize
            .toLowerCase()
            .slice(0, 50);
        const filename = `${safeName}-${timestamp}.webp`;

        // Ensure directory exists
        const uploadDir = path.join(process.cwd(), 'public', 'products');
        await mkdir(uploadDir, { recursive: true });

        // Write file
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(path.join(uploadDir, filename), buffer);

        return NextResponse.json({ url: `/products/${filename}` });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
