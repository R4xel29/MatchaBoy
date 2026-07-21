import { prisma } from '@/lib/prisma';
import AdminReviewsClient from './AdminReviewsClient';

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminReviewsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params?.page) || 1);
  const pageSize = 10;

  const [totalReviewsCount, reviews, allStats] = await Promise.all([
    prisma.review.count(),
    prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            image: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            image: true,
            category: { select: { name: true } },
          },
        },
        likes: true,
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    }),
    prisma.review.aggregate({
      _avg: { rating: true },
      _count: { id: true },
    }),
  ]);

  const hiddenCount = await prisma.review.count({ where: { isHidden: true } });
  const featuredCount = await prisma.review.count({ where: { isFeatured: true, isHidden: false } });
  const avgRating = allStats._avg.rating ? Math.round(allStats._avg.rating * 10) / 10 : 0;
  const totalPages = Math.ceil(totalReviewsCount / pageSize) || 1;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-black font-heading text-foreground">Review Moderation</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Kelola dan moderasi ulasan pelanggan untuk memastikan kualitas konten.</p>
      </div>
      <AdminReviewsClient
        initialReviews={JSON.parse(JSON.stringify(reviews))}
        initialStats={{
          totalReviews: totalReviewsCount,
          avgRating,
          pendingCount: hiddenCount,
          featuredCount,
        }}
        currentPage={page}
        totalPages={totalPages}
        totalReviews={totalReviewsCount}
        pageSize={pageSize}
      />
    </div>
  );
}
