import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { invalidateStoriesCache } from '@/lib/redis-cache';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stories = await prisma.story.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
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
                email: true,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ success: true, stories });
  } catch (error: any) {
    console.error('Error fetching admin stories:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, mediaUrl, mediaType, linkUrl, duration, daysActive, isActive } = body;

    if (!title || !mediaUrl) {
      return NextResponse.json({ error: 'Judul dan media wajib diisi' }, { status: 400 });
    }

    // Default tersimpan 20 hari (480 jam)
    const days = Number(daysActive) > 0 ? Number(daysActive) : 20;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + days * 24);

    const story = await prisma.story.create({
      data: {
        title: String(title).trim(),
        mediaUrl,
        mediaType: mediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE',
        linkUrl: linkUrl ? String(linkUrl).trim() : null,
        duration: Number(duration) > 0 ? Number(duration) : mediaType === 'VIDEO' ? 15000 : 5000,
        isActive: typeof isActive === 'boolean' ? isActive : true,
        userId: session.user.id,
        expiresAt,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
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
                email: true,
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

    return NextResponse.json({ success: true, story });
  } catch (error: any) {
    console.error('Error creating admin story:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
