import { prisma } from '@/lib/prisma';
import AdminReviewsClient from './AdminReviewsClient';

export const revalidate = 0;

export default async function AdminReviewsPage() {
  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: 'desc' },
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
  });

  // Calculate stats
  const totalReviews = reviews.length;
  const activeReviews = reviews.filter(r => !r.isHidden);
  const avgRating = activeReviews.length > 0
    ? Math.round((activeReviews.reduce((sum, r) => sum + r.rating, 0) / activeReviews.length) * 10) / 10
    : 0;
  const featuredCount = reviews.filter(r => r.isFeatured && !r.isHidden).length;
  const hiddenCount = reviews.filter(r => r.isHidden).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-black font-heading text-foreground">Review Moderation</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Kelola dan moderasi ulasan pelanggan untuk memastikan kualitas konten.</p>
      </div>
      <AdminReviewsClient
        initialReviews={JSON.parse(JSON.stringify(reviews))}
        initialStats={{
          totalReviews,
          avgRating,
          pendingCount: hiddenCount,
          featuredCount,
        }}
      />
    </div>
  );
}
