import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { invalidateStoriesCache } from '@/lib/redis-cache';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storyId } = await params;

    const likes = await prisma.storyLike.findMany({
      where: { storyId },
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
    });

    return NextResponse.json({
      success: true,
      likesCount: likes.length,
      likes,
    });
  } catch (error) {
    console.error('Error fetching story likes:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Silakan masuk terlebih dahulu untuk menyukai Story.' },
        { status: 401 }
      );
    }

    const { id: storyId } = await params;
    const userId = session.user.id;

    const story = await prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      return NextResponse.json({ error: 'Story tidak ditemukan.' }, { status: 404 });
    }

    const existingLike = await prisma.storyLike.findUnique({
      where: {
        userId_storyId: {
          userId,
          storyId,
        },
      },
    });

    let isLiked = false;
    if (existingLike) {
      await prisma.storyLike.delete({
        where: { id: existingLike.id },
      });
    } else {
      await prisma.storyLike.create({
        data: {
          userId,
          storyId,
        },
      });
      isLiked = true;
    }

    const likes = await prisma.storyLike.findMany({
      where: { storyId },
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
    });

    await invalidateStoriesCache();

    return NextResponse.json({
      success: true,
      isLiked,
      likesCount: likes.length,
      likes,
    });
  } catch (error) {
    console.error('Error toggling story like:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
