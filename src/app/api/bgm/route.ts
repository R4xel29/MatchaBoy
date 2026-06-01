import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/bgm — Fetch all active BGM songs for storefront player
export async function GET() {
    try {
        const songs = await prisma.bgmSong.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json(songs);
    } catch (error) {
        console.error('Error fetching storefront bgm:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
export const revalidate = 0; // Disable caching so it's always real-time
