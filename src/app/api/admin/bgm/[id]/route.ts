import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { logAdminAction } from '@/lib/admin-logger';

// PATCH /api/admin/bgm/[id] — Update BGM song details
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (session?.user?.role !== 'ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { title, artist, url, mood, timePeriod, isActive } = body;

        const song = await prisma.bgmSong.update({
            where: { id },
            data: {
                title,
                artist,
                url,
                mood,
                timePeriod,
                isActive,
            },
        });

        await logAdminAction({
            userId: session.user.id,
            action: 'UPDATE',
            entity: 'BGM_SONG',
            entityId: song.id,
            details: `Mengubah lagu BGM: "${song.title}" (${song.timePeriod})`
        });

        return NextResponse.json(song);
    } catch (error) {
        console.error('Error updating bgm:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

// DELETE /api/admin/bgm/[id] — Delete BGM song
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (session?.user?.role !== 'ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { id } = await params;
        const song = await prisma.bgmSong.delete({
            where: { id },
        });

        await logAdminAction({
            userId: session.user.id,
            action: 'DELETE',
            entity: 'BGM_SONG',
            entityId: id,
            details: `Menghapus lagu BGM: "${song.title}" oleh ${song.artist}`
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting bgm:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
