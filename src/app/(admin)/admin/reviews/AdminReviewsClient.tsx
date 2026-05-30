'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Search, Star, Eye, EyeOff, Award, Trash2, ChevronDown, ChevronUp,
  MessageSquare, ShieldAlert, Filter, Calendar, TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

interface ReviewUser {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  image: string | null;
}

interface ReviewProduct {
  id: string;
  name: string;
  image: string | null;
  category: { name: string };
}

interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  comment: string | null;
  images: string | null;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  user: ReviewUser;
  product: ReviewProduct;
}

interface Stats {
  totalReviews: number;
  avgRating: number;
  pendingCount: number;
  featuredCount: number;
}

interface AdminReviewsClientProps {
  initialReviews: Review[];
  initialStats: Stats;
}

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'md' ? 'w-5 h-5' : 'w-3.5 h-3.5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={cn(
            sizeClass,
            i <= rating
              ? 'text-amber-400 fill-amber-400'
              : 'text-gray-300'
          )}
        />
      ))}
    </div>
  );
}

export default function AdminReviewsClient({ initialReviews, initialStats }: AdminReviewsClientProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'FEATURED' | 'REGULAR'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { showToast } = useToast();

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      const matchesSearch =
        (r.user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.comment || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRating = ratingFilter === 'ALL' || r.rating === parseInt(ratingFilter);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'FEATURED' && r.isFeatured) ||
        (statusFilter === 'REGULAR' && !r.isFeatured);

      return matchesSearch && matchesRating && matchesStatus;
    });
  }, [reviews, searchTerm, ratingFilter, statusFilter]);

  // Handle action (feature, unfeature, hide, approve)
  const handleAction = async (id: string, action: 'feature' | 'unfeature' | 'approve' | 'hide') => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();

      setReviews(prev =>
        prev.map(r => r.id === id ? { ...r, ...data.review } : r)
      );

      // Update stats
      const updatedReviews = reviews.map(r => r.id === id ? { ...r, ...data.review } : r);
      setStats(prev => ({
        ...prev,
        featuredCount: updatedReviews.filter(r => r.isFeatured).length,
      }));

      const messages: Record<string, string> = {
        feature: 'Review berhasil ditandai sebagai featured! ⭐',
        unfeature: 'Review dihapus dari featured.',
        approve: 'Review berhasil disetujui.',
        hide: 'Review berhasil disembunyikan.',
      };
      showToast(messages[action], 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal memperbarui review.';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error(await res.text());

      setReviews(prev => prev.filter(r => r.id !== id));
      setStats(prev => ({
        ...prev,
        totalReviews: prev.totalReviews - 1,
        featuredCount: reviews.filter(r => r.id !== id && r.isFeatured).length,
      }));
      setDeleteConfirmId(null);
      showToast('Review berhasil dihapus.', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menghapus review.';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Parse images JSON
  const parseImages = (images: string | null): string[] => {
    if (!images) return [];
    try {
      return JSON.parse(images);
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-brand-600" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Total</span>
          </div>
          <p className="text-2xl font-black text-foreground">{stats.totalReviews}</p>
          <p className="text-[10px] text-muted-foreground">Total ulasan</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Rata-rata</span>
          </div>
          <p className="text-2xl font-black text-foreground">{stats.avgRating}</p>
          <StarRating rating={Math.round(stats.avgRating)} size="sm" />
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Pending</span>
          </div>
          <p className="text-2xl font-black text-foreground">{stats.pendingCount}</p>
          <p className="text-[10px] text-muted-foreground">Perlu moderasi</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Award className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Featured</span>
          </div>
          <p className="text-2xl font-black text-foreground">{stats.featuredCount}</p>
          <p className="text-[10px] text-muted-foreground">Ulasan unggulan</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari review, produk, atau pelanggan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          className="px-4 py-2 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500"
        >
          <option value="ALL">Semua Rating</option>
          {[5, 4, 3, 2, 1].map(r => (
            <option key={r} value={String(r)}>⭐ {r} Star</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'FEATURED' | 'REGULAR')}
          className="px-4 py-2 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500"
        >
          <option value="ALL">Semua Status</option>
          <option value="FEATURED">Featured ⭐</option>
          <option value="REGULAR">Regular</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border select-none">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={cn(
            "px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all",
            statusFilter === 'ALL' ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Semua ({reviews.length})
        </button>
        <button
          onClick={() => setStatusFilter('FEATURED')}
          className={cn(
            "px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5",
            statusFilter === 'FEATURED' ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Award className="w-3.5 h-3.5" />
          Featured ({stats.featuredCount})
        </button>
        <button
          onClick={() => setStatusFilter('REGULAR')}
          className={cn(
            "px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all",
            statusFilter === 'REGULAR' ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Regular ({reviews.length - stats.featuredCount})
        </button>
      </div>

      {/* Review List */}
      <div className="space-y-3">
        {filteredReviews.map(review => {
          const isExpanded = expandedId === review.id;
          const reviewImages = parseImages(review.images);

          return (
            <div
              key={review.id}
              className={cn(
                "bg-card rounded-2xl border overflow-hidden transition-all",
                review.isFeatured ? 'border-amber-300 shadow-amber-100/50 shadow-md' : 'border-border',
              )}
            >
              {/* Featured badge */}
              {review.isFeatured && (
                <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 px-4 py-1.5 border-b border-amber-200">
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 flex items-center gap-1">
                    <Award className="w-3 h-3" /> Featured Review
                  </span>
                </div>
              )}

              <div className="p-4">
                {/* Header row: user info + product + rating + date */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* User avatar */}
                    <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 border border-border bg-brand-50">
                      {review.user.image ? (
                        <Image src={review.user.image} alt={review.user.name || ''} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-brand-600 font-bold text-sm">
                          {(review.user.name || '?')[0].toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-foreground line-clamp-1">{review.user.name || 'Anonymous'}</h4>
                        <span className="text-[9px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase">
                          {review.product.category.name}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        Review untuk <strong className="text-foreground">{review.product.name}</strong>
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <StarRating rating={review.rating} />
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expand button */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : review.id)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </div>

                {/* Comment preview (always shown) */}
                {review.comment && (
                  <p className={cn(
                    "text-sm text-foreground/80 mt-3 leading-relaxed",
                    !isExpanded && "line-clamp-2"
                  )}>
                    &ldquo;{review.comment}&rdquo;
                  </p>
                )}

                {/* Expanded content */}
                {isExpanded && (
                  <div className="mt-3 space-y-3 pt-3 border-t border-border/50">
                    {/* Review images */}
                    {reviewImages.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {reviewImages.map((img, idx) => (
                          <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border">
                            <Image src={img} alt={`Review image ${idx + 1}`} fill className="object-cover" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* User details */}
                    <div className="text-[10px] space-y-1 text-muted-foreground font-medium">
                      {review.user.email && (
                        <div className="flex items-center gap-1.5">
                          <span>📧</span>
                          <span>{review.user.email}</span>
                        </div>
                      )}
                      {review.user.phone && (
                        <div className="flex items-center gap-1.5">
                          <span>📱</span>
                          <span>{review.user.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/40 select-none flex-wrap">
                  {review.isFeatured ? (
                    <button
                      onClick={() => handleAction(review.id, 'unfeature')}
                      disabled={loading}
                      className="py-2 px-3 text-[11px] font-bold rounded-xl border border-amber-300 text-amber-700 bg-amber-50/50 hover:bg-amber-50 transition-colors flex items-center gap-1"
                    >
                      <Award className="w-3.5 h-3.5" />
                      Hapus Featured
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction(review.id, 'feature')}
                      disabled={loading}
                      className="py-2 px-3 text-[11px] font-bold rounded-xl border border-brand-500 text-brand-700 bg-brand-50/20 hover:bg-brand-50/50 transition-colors flex items-center gap-1"
                    >
                      <Award className="w-3.5 h-3.5" />
                      Featured
                    </button>
                  )}

                  <button
                    onClick={() => handleAction(review.id, 'approve')}
                    disabled={loading}
                    className="py-2 px-3 text-[11px] font-bold rounded-xl border border-emerald-300 text-emerald-700 bg-emerald-50/20 hover:bg-emerald-50/50 transition-colors flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Approve
                  </button>

                  <button
                    onClick={() => handleAction(review.id, 'hide')}
                    disabled={loading}
                    className="py-2 px-3 text-[11px] font-bold rounded-xl border border-gray-300 text-gray-600 bg-gray-50/20 hover:bg-gray-50/50 transition-colors flex items-center gap-1"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    Hide
                  </button>

                  {deleteConfirmId === review.id ? (
                    <div className="flex items-center gap-1 ml-auto">
                      <span className="text-[10px] text-red-600 font-bold">Yakin?</span>
                      <button
                        onClick={() => handleDelete(review.id)}
                        disabled={loading}
                        className="py-1.5 px-2.5 text-[10px] font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                      >
                        Ya, Hapus
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="py-1.5 px-2.5 text-[10px] font-bold rounded-lg border border-border hover:bg-muted transition-colors"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(review.id)}
                      disabled={loading}
                      className="py-2 px-3 text-[11px] font-bold rounded-xl border border-red-200 text-red-600 bg-red-50/10 hover:bg-red-50 transition-colors flex items-center gap-1 ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredReviews.length === 0 && (
        <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl space-y-2">
          <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto" />
          <h4 className="font-bold text-sm text-foreground">Tidak Ada Review</h4>
          <p className="text-xs text-muted-foreground">Belum ada ulasan yang cocok dengan filter.</p>
        </div>
      )}
    </div>
  );
}
