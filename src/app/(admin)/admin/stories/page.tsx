import { prisma } from '@/lib/prisma';
import StoriesAdminClient from './StoriesAdminClient';

export const revalidate = 0;

export default async function AdminStoriesPage() {
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

  const serializedStories = stories.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    expiresAt: s.expiresAt.toISOString(),
    likes: s.likes.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    })),
  }));

  return <StoriesAdminClient initialStories={serializedStories} />;
}
