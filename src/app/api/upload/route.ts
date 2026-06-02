import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { uploadToSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    const session = await auth();
    // Allow any authenticated user (customer, cashier, driver, admin)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate file type
        if (!file.type.includes('image')) {
            return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 });
        }

        const type = formData.get('type') as string | null;

        // Validate file size — max 5MB for reviews, 1MB for payments
        const maxLimit = type === 'review' ? 5 * 1024 * 1024 : 1024 * 1024;
        if (file.size > maxLimit) {
            return NextResponse.json({ error: `File too large. Max ${type === 'review' ? '5MB' : '1MB'}.` }, { status: 400 });
        }

        // Generate unique filename inside the appropriate folder
        const timestamp = Date.now();
        const safeName = file.name
            .replace(/\.[^.]+$/, '') // remove extension
            .replace(/[^a-zA-Z0-9-_]/g, '-') // sanitize
            .toLowerCase()
            .slice(0, 50);
        
        const folder = type === 'review' ? 'reviews' : 'payments';
        const filename = `${folder}/${safeName}-${timestamp}.webp`;

        // Read file into buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to Supabase Storage in 'products' bucket with 'payments/' prefix
        const publicUrl = await uploadToSupabase(
            'products',
            filename,
            buffer,
            'image/webp'
        );

        return NextResponse.json({ url: publicUrl });
    } catch (error) {
        console.error('User upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
