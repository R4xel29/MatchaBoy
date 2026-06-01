import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { logAdminAction } from '@/lib/admin-logger';

// GET /api/admin/bgm — List all BGM songs for admin panel
export async function GET() {
    try {
        const session = await auth();
        if (session?.user?.role !== 'ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const songs = await prisma.bgmSong.findMany({
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(songs);
    } catch (error) {
        console.error('Error fetching admin bgm:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

// POST /api/admin/bgm — Create a new BGM song
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (session?.user?.role !== 'ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await request.json();
        const { title, artist, url, mood, timePeriod, isActive } = body;

        if (!title || !artist || !url || !timePeriod) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        // Validate timePeriod values
        const validPeriods = ['pagi', 'siang', 'sore', 'malam'];
        if (!validPeriods.includes(timePeriod)) {
            return new NextResponse('Invalid time period', { status: 400 });
        }

        const song = await prisma.bgmSong.create({
            data: {
                title,
                artist,
                url,
                mood: mood || '',
                timePeriod,
                isActive: isActive !== undefined ? isActive : true,
            },
        });

        await logAdminAction({
            userId: session.user.id,
            action: 'CREATE',
            entity: 'BGM_SONG',
            entityId: song.id,
            details: `Menambahkan lagu BGM baru: "${title}" oleh ${artist}`
        });

        return NextResponse.json(song, { status: 201 });
    } catch (error) {
        console.error('Error creating bgm:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
