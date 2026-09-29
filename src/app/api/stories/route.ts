import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getOrSetCache, invalidateStoriesCache, CACHE_KEYS, CACHE_TTL } from '@/lib/redis-cache';

const DEFAULT_STORY_RETENTION_DAYS = 20;
const DEFAULT_STORY_RETENTION_HOURS = DEFAULT_STORY_RETENTION_DAYS * 24; // 480 jam (20 hari)

// Fallback stories if database is empty or connection fails
const FALLBACK_STORIES = [
  {
    id: 'seed-story-1',
    title: 'Behind The Scenes: Pemetikan Daun Teh Pilihan',
    mediaUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&q=80&w=720',
    mediaType: 'IMAGE',
    linkUrl: '/custom-studio',
    isActive: true,
    duration: 5000,
    likes: [],
    user: null,
  },
  {
    id: 'seed-story-2',
    title: 'Promo Spesial: Happy Hour Diskon 20%!',
    mediaUrl: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&q=80&w=720',
    mediaType: 'IMAGE',
    linkUrl: '/?openMenu=true',
    isActive: true,
    duration: 6000,
    likes: [],
    user: null,
  },
  {
    id: 'seed-story-3',
    title: 'Arum Seduh Secret: Racikan Seduhan Terbaik',
    mediaUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=720',
    mediaType: 'IMAGE',
    linkUrl: '/custom-studio',
    isActive: true,
    duration: 5000,
    likes: [],
    user: null,
  },
];

export async function GET() {
  try {
    const data = await getOrSetCache(
      CACHE_KEYS.STORIES_ACTIVE,
      async () => {
        const now = new Date();

        // Ambil semua story aktif yang belum melewati batas 20 hari
        let stories = await prisma.story.findMany({
          where: {
            isActive: true,
            expiresAt: {
              gt: now,
            },
          },
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
          orderBy: {
            createdAt: 'desc',
          },
        });

        // Auto-seed jika database kosong (tersimpan selama 20 hari)
        if (stories.length === 0) {
          const expiresIn20Days = new Date();
          expiresIn20Days.setHours(expiresIn20Days.getHours() + DEFAULT_STORY_RETENTION_HOURS);

          const seedData = FALLBACK_STORIES.map((s) => ({
            title: s.title,
            mediaUrl: s.mediaUrl,
            mediaType: s.mediaType,
            linkUrl: s.linkUrl,
            isActive: s.isActive,
            duration: s.duration,
            expiresAt: expiresIn20Days,
          }));

          await prisma.story.createMany({
            data: seedData,
          });

          stories = await prisma.story.findMany({
            where: {
              isActive: true,
              expiresAt: {
                gt: now,
              },
            },
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
            orderBy: {
              createdAt: 'desc',
            },
          });
        }

        return { success: true, stories };
      },
      CACHE_TTL.STORIES
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching stories:', error);
    return NextResponse.json({ success: true, stories: FALLBACK_STORIES });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Silakan masuk terlebih dahulu untuk membuat Story.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { title, mediaUrl, mediaType, linkUrl, duration, daysActive, hoursActive, isActive } = body;

    if (!title || !mediaUrl) {
      return NextResponse.json(
        { success: false, error: 'Judul/caption dan media wajib diisi.' },
        { status: 400 }
      );
    }

    // Default penyimpanan selama 20 hari (480 jam)
    const activeHours = daysActive
      ? Number(daysActive) * 24
      : hoursActive
      ? Number(hoursActive)
      : DEFAULT_STORY_RETENTION_HOURS;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + activeHours);

    const isAdmin = (session.user as any).role === 'ADMIN';

    const story = await prisma.story.create({
      data: {
        title: String(title).trim().slice(0, 200),
        mediaUrl,
        mediaType: mediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE',
        linkUrl: isAdmin && linkUrl ? String(linkUrl).trim() : null,
        isActive: typeof isActive === 'boolean' ? isActive : true,
        duration: Number(duration) > 0 ? Number(duration) : mediaType === 'VIDEO' ? 15000 : 5000,
        userId: session.user.id,
        expiresAt,
      },
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

    return NextResponse.json({ success: true, story });
  } catch (error: any) {
    console.error('Error creating story:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
