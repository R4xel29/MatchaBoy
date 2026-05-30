import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Fallback stories if database is empty or connection fails
const FALLBACK_STORIES = [
  {
    id: 'seed-story-1',
    title: 'Behind The Scenes: Pemetikan Daun Teh Uji 🍃',
    mediaUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&q=80&w=720',
    mediaType: 'IMAGE',
    linkUrl: '/custom-studio',
    isActive: true,
    duration: 5000,
  },
  {
    id: 'seed-story-2',
    title: 'Promo Spesial: Happy Hour Diskon 20%! 🔥',
    mediaUrl: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&q=80&w=720',
    mediaType: 'IMAGE',
    linkUrl: '/?openMenu=true',
    isActive: true,
    duration: 6000,
  },
  {
    id: 'seed-story-3',
    title: 'Matchaboy Secret: Seni Pengocokan Chasen 🍵',
    mediaUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=720',
    mediaType: 'IMAGE',
    linkUrl: '/custom-studio',
    isActive: true,
    duration: 5000,
  },
];

export async function GET() {
  try {
    const now = new Date();
    
    // Get active stories that haven't expired
    let stories = await prisma.story.findMany({
      where: {
        isActive: true,
        expiresAt: {
          gt: now,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Auto-seed if empty
    if (stories.length === 0) {
      const tomorrow = new Date();
      tomorrow.setHours(tomorrow.getHours() + 24);
      
      const seedData = FALLBACK_STORIES.map(s => ({
        title: s.title,
        mediaUrl: s.mediaUrl,
        mediaType: s.mediaType,
        linkUrl: s.linkUrl,
        isActive: s.isActive,
        duration: s.duration,
        expiresAt: tomorrow,
      }));

      // Insert into DB
      await prisma.story.createMany({
        data: seedData,
      });

      // Fetch again after seeding
      stories = await prisma.story.findMany({
        where: {
          isActive: true,
          expiresAt: {
            gt: now,
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
    }

    return NextResponse.json({ success: true, stories });
  } catch (error) {
    console.error('Error fetching stories:', error);
    // Graceful degradation with fallback mockup data
    return NextResponse.json({ success: true, stories: FALLBACK_STORIES });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, mediaUrl, mediaType, linkUrl, duration, hoursActive } = body;

    if (!title || !mediaUrl) {
      return NextResponse.json({ success: false, error: 'Title and mediaUrl are required' }, { status: 400 });
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (hoursActive || 24));

    const story = await prisma.story.create({
      data: {
        title,
        mediaUrl,
        mediaType: mediaType || 'IMAGE',
        linkUrl: linkUrl || null,
        duration: duration || 5000,
        expiresAt,
      },
    });

    return NextResponse.json({ success: true, story });
  } catch (error: any) {
    console.error('Error creating story:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
