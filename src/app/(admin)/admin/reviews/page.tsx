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
    },
  });

  // Calculate stats
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
    : 0;
  const featuredCount = reviews.filter(r => r.isFeatured).length;

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
          pendingCount: totalReviews,
          featuredCount,
        }}
      />
    </div>
  );
}
