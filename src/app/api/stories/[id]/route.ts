import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { invalidateStoriesCache } from '@/lib/redis-cache';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.story.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: 'Story tidak ditemukan' }, { status: 404 });
    }

    const isAdmin = (session.user as any).role === 'ADMIN';
    if (!isAdmin && existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { title, mediaUrl, mediaType, linkUrl, duration, isActive, daysActive } = body;

    const updateData: Record<string, any> = {};
    if (typeof title === 'string' && title.trim()) updateData.title = title.trim();
    if (typeof mediaUrl === 'string' && mediaUrl.trim()) updateData.mediaUrl = mediaUrl.trim();
    if (mediaType === 'IMAGE' || mediaType === 'VIDEO') updateData.mediaType = mediaType;
    if (isAdmin && linkUrl !== undefined) updateData.linkUrl = linkUrl ? String(linkUrl).trim() : null;
    if (typeof duration === 'number' && duration > 0) updateData.duration = duration;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    if (typeof daysActive === 'number' && daysActive > 0) {
      const newExpires = new Date();
      newExpires.setHours(newExpires.getHours() + daysActive * 24);
      updateData.expiresAt = newExpires;
    }

    const updated = await prisma.story.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
          },
        },
        likes: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    await invalidateStoriesCache();

    return NextResponse.json({ success: true, story: updated });
  } catch (error: any) {
    console.error('Error updating story:', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui story' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.story.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: 'Story tidak ditemukan' }, { status: 404 });
    }

    const isAdmin = (session.user as any).role === 'ADMIN';
    if (!isAdmin && existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.story.delete({ where: { id } });
    await invalidateStoriesCache();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting story:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghapus story' }, { status: 500 });
  }
}
