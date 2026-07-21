'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Search, Star, Eye, EyeOff, Award, Trash2, ChevronDown, ChevronUp,
  MessageSquare, ShieldAlert, Filter, Calendar, TrendingUp, Send
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

interface ReviewLike {
  id: string;
  reviewId: string;
  userId: string;
}

interface ReviewReply {
  id: string;
  reviewId: string;
  userId: string;
  comment: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  comment: string | null;
  images: string | null;
  isFeatured: boolean;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
  user: ReviewUser;
  product: ReviewProduct;
  likes: ReviewLike[];
  replies: ReviewReply[];
}

interface Stats {
  totalReviews: number;
  avgRating: number;
  pendingCount: number;
  featuredCount: number;
}

import { UrlPagination } from '@/components/ui/UrlPagination';

interface AdminReviewsClientProps {
  initialReviews: Review[];
  initialStats: Stats;
  currentPage?: number;
  totalPages?: number;
  totalReviews?: number;
  pageSize?: number;
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

export default function AdminReviewsClient({ 
  initialReviews, 
  initialStats,
  currentPage = 1,
  totalPages = 1,
  totalReviews = 0,
  pageSize = 10
}: AdminReviewsClientProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'FEATURED' | 'REGULAR' | 'HIDDEN'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<{ [reviewId: string]: string }>({});
  const [replyLoading, setReplyLoading] = useState<{ [reviewId: string]: boolean }>({});

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
        (statusFilter === 'ALL' && !r.isHidden) ||
        (statusFilter === 'FEATURED' && r.isFeatured && !r.isHidden) ||
        (statusFilter === 'REGULAR' && !r.isFeatured && !r.isHidden) ||
        (statusFilter === 'HIDDEN' && r.isHidden);

      return matchesSearch && matchesRating && matchesStatus;
    });
  }, [reviews, searchTerm, ratingFilter, statusFilter]);

  // Handle action (feature, unfeature, hide, approve, delete-comment)
  const handleAction = async (id: string, action: 'feature' | 'unfeature' | 'approve' | 'hide' | 'delete-comment') => {
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
        featuredCount: updatedReviews.filter(r => r.isFeatured && !r.isHidden).length,
        pendingCount: updatedReviews.filter(r => r.isHidden).length,
      }));

      const messages: Record<string, string> = {
        feature: 'Review berhasil ditandai sebagai featured! ⭐',
        unfeature: 'Review dihapus dari featured.',
        approve: 'Review berhasil disetujui.',
        hide: 'Review berhasil disembunyikan.',
        'delete-comment': 'Komentar ulasan berhasil dihapus.',
      };
      showToast(messages[action], 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal memperbarui review.';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle post reply from Admin
  const handlePostReply = async (reviewId: string) => {
    const text = replyText[reviewId];
    if (!text || !text.trim()) return;

    setReplyLoading(prev => ({ ...prev, [reviewId]: true }));
    try {
      const res = await fetch(`/api/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: text.trim() }),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();

      setReviews(prev =>
        prev.map(r => {
          if (r.id === reviewId) {
            return {
              ...r,
              replies: [...r.replies, data.reply],
            };
          }
          return r;
        })
      );
      setReplyText(prev => ({ ...prev, [reviewId]: '' }));
      showToast('Balasan berhasil dikirim! 💬', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal mengirim balasan.';
      showToast(message, 'error');
    } finally {
      setReplyLoading(prev => ({ ...prev, [reviewId]: false }));
    }
  };

  // Handle delete reply
  const handleDeleteReply = async (reviewId: string, replyId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus balasan ini?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews?replyId=${replyId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error(await res.text());

      setReviews(prev =>
        prev.map(r => {
          if (r.id === reviewId) {
            return {
              ...r,
              replies: r.replies.filter(reply => reply.id !== replyId),
            };
          }
          return r;
        })
      );
      showToast('Balasan berhasil dihapus.', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menghapus balasan.';
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
            <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center">
              <EyeOff className="w-4 h-4 text-gray-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Tersembunyi</span>
          </div>
          <p className="text-2xl font-black text-foreground">{stats.pendingCount}</p>
          <p className="text-[10px] text-muted-foreground">Ulasan disembunyikan</p>
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
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'FEATURED' | 'REGULAR' | 'HIDDEN')}
          className="px-4 py-2 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500"
        >
          <option value="ALL">Semua Status</option>
          <option value="FEATURED">Featured ⭐</option>
          <option value="REGULAR">Regular</option>
          <option value="HIDDEN">Tersembunyi 👁️‍🗨️</option>
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
          Semua ({reviews.filter(r => !r.isHidden).length})
        </button>
        <button
          onClick={() => setStatusFilter('FEATURED')}
          className={cn(
            "px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5",
            statusFilter === 'FEATURED' ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Award className="w-3.5 h-3.5" />
          Featured ({reviews.filter(r => r.isFeatured && !r.isHidden).length})
        </button>
        <button
          onClick={() => setStatusFilter('REGULAR')}
          className={cn(
            "px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all",
            statusFilter === 'REGULAR' ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Regular ({reviews.filter(r => !r.isFeatured && !r.isHidden).length})
        </button>
        <button
          onClick={() => setStatusFilter('HIDDEN')}
          className={cn(
            "px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5",
            statusFilter === 'HIDDEN' ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <EyeOff className="w-3.5 h-3.5" />
          Tersembunyi ({reviews.filter(r => r.isHidden).length})
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
                review.isHidden && 'opacity-65 bg-muted/30 border-dashed'
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
                {!review.comment ? (
                  <p className="text-xs italic text-muted-foreground mt-3 leading-relaxed">
                    [Konten komentar dihapus oleh administrator]
                  </p>
                ) : (
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

                    {/* User & Likes summary */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-muted-foreground font-medium border-b border-border/30 pb-2">
                      <div className="space-y-1">
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
                      <div className="flex items-center gap-3 mt-1 sm:mt-0 font-semibold bg-muted/50 px-2 py-1 rounded-lg">
                        <span className="flex items-center gap-1">
                          ❤️ {review.likes?.length || 0} Likes
                        </span>
                        <span className="flex items-center gap-1">
                          💬 {review.replies?.length || 0} Balasan
                        </span>
                      </div>
                    </div>

                    {/* Replies section */}
                    <div className="mt-4 space-y-2.5 pl-4 border-l-2 border-brand-500/30">
                      {review.replies && review.replies.length > 0 && (
                        <>
                          <h5 className="text-[11px] font-bold text-foreground mb-1.5 flex items-center gap-1">
                            <span>💬</span> Balasan Pelanggan & Admin:
                          </h5>
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {review.replies.map(reply => (
                              <div key={reply.id} className="p-2.5 bg-muted/40 rounded-xl space-y-1 relative group transition-all border border-border/10">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {reply.user.image ? (
                                      <div className="relative w-5 h-5 rounded-full overflow-hidden shrink-0 border">
                                        <Image src={reply.user.image} alt={reply.user.name || ''} fill className="object-cover" />
                                      </div>
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center text-[10px] font-bold text-brand-700">
                                        {(reply.user.name || '?')[0].toUpperCase()}
                                      </div>
                                    )}
                                    <span className="text-xs font-bold text-foreground">{reply.user.name || 'Anonymous'}</span>
                                    <span className="text-[9px] text-muted-foreground">
                                      {new Date(reply.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteReply(review.id, reply.id)}
                                    disabled={loading}
                                    className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded hover:bg-red-50"
                                    title="Hapus Balasan"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                                <p className="text-xs text-foreground/80 pl-7 leading-relaxed">{reply.comment}</p>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {/* Admin Add Reply Form */}
                      <div className="mt-3 flex items-center gap-2 pt-1 border-t border-border/20">
                        <textarea
                          placeholder="Tulis balasan resmi admin..."
                          value={replyText[review.id] || ''}
                          onChange={(e) => setReplyText(prev => ({ ...prev, [review.id]: e.target.value }))}
                          rows={1}
                          className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500 resize-none max-h-20"
                        />
                        <button
                          onClick={() => handlePostReply(review.id)}
                          disabled={loading || replyLoading[review.id] || !replyText[review.id]?.trim()}
                          className="p-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white transition-colors shrink-0 disabled:opacity-50 disabled:hover:bg-brand-700 flex items-center justify-center"
                          title="Kirim Balasan"
                        >
                          {replyLoading[review.id] ? (
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin block" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
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

                  {review.isHidden ? (
                    <button
                      onClick={() => handleAction(review.id, 'approve')}
                      disabled={loading}
                      className="py-2 px-3 text-[11px] font-bold rounded-xl border border-emerald-300 text-emerald-700 bg-emerald-50/20 hover:bg-emerald-50/50 transition-colors flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Approve
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction(review.id, 'hide')}
                      disabled={loading}
                      className="py-2 px-3 text-[11px] font-bold rounded-xl border border-gray-300 text-gray-650 bg-gray-55/10 hover:bg-gray-50 transition-colors flex items-center gap-1"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      Hide
                    </button>
                  )}

                  {review.comment && (
                    <button
                      onClick={() => {
                        if (confirm('Apakah Anda yakin ingin menghapus konten komentar ulasan ini? (Rating bintang akan tetap dipertahankan)')) {
                          handleAction(review.id, 'delete-comment');
                        }
                      }}
                      disabled={loading}
                      className="py-2 px-3 text-[11px] font-bold rounded-xl border border-red-200 text-red-650 bg-red-55/10 hover:bg-red-50 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Hapus Komentar
                    </button>
                  )}

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

      {/* Pagination Controls */}
      <div className="pt-4 border-t border-border/40">
        <UrlPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalReviews}
          pageSize={pageSize}
        />
      </div>
    </div>
  );
}
