'use client';

import { useState, useMemo } from 'react';
import {
  Search, ChefHat, Eye, EyeOff, Award, Trash2, ShieldAlert,
  Milk, Candy, Leaf, CupSoda, Sparkles, Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

interface RecipeUser {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  image: string | null;
}

interface CustomRecipe {
  id: string;
  userId: string;
  baseProductId: string;
  recipeName: string;
  matchaLevel: number;
  creaminess: number;
  sweetness: number;
  milkType: string;
  toppings: string | null;
  isPublic: boolean;
  orderCount: number;
  createdAt: string;
  updatedAt: string;
  user: RecipeUser;
}

interface Stats {
  totalRecipes: number;
  publicCount: number;
  pendingApproval: number;
}

interface AdminRecipesClientProps {
  initialRecipes: CustomRecipe[];
  initialStats: Stats;
}

function LevelBar({ value, max = 10, color }: { value: number; max?: number; color: string }) {
  const percent = (value / max) * 100;
  return (
    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all", color)}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function parseToppings(toppings: string | null): { id: string; name: string; price: number }[] {
  if (!toppings) return [];
  try {
    return JSON.parse(toppings);
  } catch {
    return [];
  }
}

export default function AdminRecipesClient({ initialRecipes, initialStats }: AdminRecipesClientProps) {
  const [recipes, setRecipes] = useState<CustomRecipe[]>(initialRecipes);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLIC' | 'PRIVATE'>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'popularity'>('newest');
  const [loading, setLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { showToast } = useToast();

  // Filtered & sorted recipes
  const filteredRecipes = useMemo(() => {
    let result = recipes.filter(r => {
      const matchesSearch =
        r.recipeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.user.name || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PUBLIC' && r.isPublic) ||
        (statusFilter === 'PRIVATE' && !r.isPublic);

      return matchesSearch && matchesStatus;
    });

    if (sortBy === 'popularity') {
      result = [...result].sort((a, b) => b.orderCount - a.orderCount);
    } else {
      result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [recipes, searchTerm, statusFilter, sortBy]);

  // Handle action
  const handleAction = async (id: string, action: 'approve' | 'reject' | 'feature' | 'unfeature') => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/custom-recipes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();

      setRecipes(prev =>
        prev.map(r => r.id === id ? { ...r, ...data.recipe } : r)
      );

      // Update stats
      const updatedRecipes = recipes.map(r => r.id === id ? { ...r, ...data.recipe } : r);
      const newPublicCount = updatedRecipes.filter(r => r.isPublic).length;
      setStats(prev => ({
        ...prev,
        publicCount: newPublicCount,
        pendingApproval: prev.totalRecipes - newPublicCount,
      }));

      const messages: Record<string, string> = {
        approve: 'Resep berhasil disetujui dan ditampilkan ke publik! ✅',
        reject: 'Resep diubah menjadi privat.',
        feature: 'Resep ditambahkan ke menu publik! 🎉',
        unfeature: 'Resep dihapus dari menu publik.',
      };
      showToast(messages[action], 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal memperbarui resep.';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/custom-recipes?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error(await res.text());

      const deletedRecipe = recipes.find(r => r.id === id);
      setRecipes(prev => prev.filter(r => r.id !== id));
      setStats(prev => ({
        totalRecipes: prev.totalRecipes - 1,
        publicCount: deletedRecipe?.isPublic ? prev.publicCount - 1 : prev.publicCount,
        pendingApproval: deletedRecipe?.isPublic ? prev.pendingApproval : prev.pendingApproval - 1,
      }));
      setDeleteConfirmId(null);
      showToast('Resep berhasil dihapus.', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menghapus resep.';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Milk type emoji
  const milkEmoji: Record<string, string> = {
    'Fresh Milk': '🥛',
    'Oat Milk': '🌾',
    'Soy Milk': '🫘',
    'Almond Milk': '🌰',
  };

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center">
              <ChefHat className="w-4 h-4 text-brand-600" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Total</span>
          </div>
          <p className="text-2xl font-black text-foreground">{stats.totalRecipes}</p>
          <p className="text-[10px] text-muted-foreground">Total resep kreasi</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Pending</span>
          </div>
          <p className="text-2xl font-black text-foreground">{stats.pendingApproval}</p>
          <p className="text-[10px] text-muted-foreground">Menunggu persetujuan</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Eye className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Publik</span>
          </div>
          <p className="text-2xl font-black text-foreground">{stats.publicCount}</p>
          <p className="text-[10px] text-muted-foreground">Tampil di menu publik</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari resep atau pembuat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'newest' | 'popularity')}
          className="px-4 py-2 text-sm rounded-xl border border-border bg-card focus:outline-none focus:border-brand-500"
        >
          <option value="newest">Terbaru</option>
          <option value="popularity">Paling Populer</option>
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
          Semua ({recipes.length})
        </button>
        <button
          onClick={() => setStatusFilter('PRIVATE')}
          className={cn(
            "px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5",
            statusFilter === 'PRIVATE' ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Pending ({stats.pendingApproval})
        </button>
        <button
          onClick={() => setStatusFilter('PUBLIC')}
          className={cn(
            "px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5",
            statusFilter === 'PUBLIC' ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Publik ({stats.publicCount})
        </button>
      </div>

      {/* Recipe Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRecipes.map(recipe => {
          const toppings = parseToppings(recipe.toppings);

          return (
            <div
              key={recipe.id}
              className={cn(
                "bg-card rounded-2xl border overflow-hidden hover:shadow-md transition-shadow relative flex flex-col",
                recipe.isPublic ? 'border-emerald-200' : 'border-border'
              )}
            >
              {/* Status Badge */}
              {recipe.isPublic ? (
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black tracking-wide uppercase flex items-center gap-1 z-10">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Publik
                </span>
              ) : (
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-black tracking-wide uppercase z-10">
                  Pending
                </span>
              )}

              {/* Recipe Header - Matcha Gradient */}
              <div className="bg-gradient-to-br from-brand-100/80 via-brand-50/50 to-emerald-50/30 p-4 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center text-lg shadow-sm">
                    🍵
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-foreground leading-snug line-clamp-1">{recipe.recipeName}</h4>
                    <p className="text-[10px] text-muted-foreground">oleh <strong>{recipe.user.name || 'Anonymous'}</strong></p>
                  </div>
                </div>

                {/* Order count */}
                {recipe.orderCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-brand-700 bg-white/60 px-2 py-0.5 rounded-full">
                    <CupSoda className="w-3 h-3" />
                    {recipe.orderCount}x dipesan
                  </span>
                )}
              </div>

              {/* Recipe Details */}
              <div className="p-4 space-y-3 flex-1">
                {/* Milk Type */}
                <div className="flex items-center gap-2">
                  <Milk className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-foreground font-medium">
                    {milkEmoji[recipe.milkType] || '🥛'} {recipe.milkType}
                  </span>
                </div>

                {/* Level Bars */}
                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Leaf className="w-3 h-3 text-brand-600" /> Matcha Level
                      </span>
                      <span className="text-[10px] font-black text-brand-700">{recipe.matchaLevel}/10</span>
                    </div>
                    <LevelBar value={recipe.matchaLevel} color="bg-gradient-to-r from-brand-400 to-brand-600" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Milk className="w-3 h-3 text-blue-500" /> Creaminess
                      </span>
                      <span className="text-[10px] font-black text-blue-600">{recipe.creaminess}/10</span>
                    </div>
                    <LevelBar value={recipe.creaminess} color="bg-gradient-to-r from-blue-300 to-blue-500" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Candy className="w-3 h-3 text-pink-500" /> Sweetness
                      </span>
                      <span className="text-[10px] font-black text-pink-600">{recipe.sweetness}/10</span>
                    </div>
                    <LevelBar value={recipe.sweetness} color="bg-gradient-to-r from-pink-300 to-pink-500" />
                  </div>
                </div>

                {/* Toppings */}
                {toppings.length > 0 && (
                  <div className="pt-2 border-t border-border/50">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1 block">Toppings</span>
                    <div className="flex flex-wrap gap-1">
                      {toppings.map((t, idx) => (
                        <span key={idx} className="text-[10px] font-medium bg-muted px-2 py-0.5 rounded-full text-foreground">
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 p-4 pt-0 select-none border-t border-border/40 mt-auto">
                <div className="flex items-center gap-2 flex-1 pt-3">
                  {recipe.isPublic ? (
                    <button
                      onClick={() => handleAction(recipe.id, 'reject')}
                      disabled={loading}
                      className="flex-1 py-2 px-3 text-[11px] font-bold rounded-xl border border-gray-300 text-gray-600 bg-gray-50/20 hover:bg-gray-50/50 transition-colors flex items-center justify-center gap-1"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      Jadikan Privat
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction(recipe.id, 'approve')}
                      disabled={loading}
                      className="flex-1 py-2 px-3 text-[11px] font-bold rounded-xl border border-brand-500 text-brand-700 bg-brand-50/20 hover:bg-brand-50/50 transition-colors flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Approve
                    </button>
                  )}

                  {deleteConfirmId === recipe.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(recipe.id)}
                        disabled={loading}
                        className="py-1.5 px-2.5 text-[10px] font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                      >
                        Hapus
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
                      onClick={() => setDeleteConfirmId(recipe.id)}
                      disabled={loading}
                      className="py-2 px-3 text-[11px] font-bold rounded-xl border border-red-200 text-red-600 bg-red-50/10 hover:bg-red-50 transition-colors flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredRecipes.length === 0 && (
        <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl space-y-2">
          <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto" />
          <h4 className="font-bold text-sm text-foreground">Tidak Ada Resep</h4>
          <p className="text-xs text-muted-foreground">Belum ada resep kreasi pelanggan yang cocok dengan filter.</p>
        </div>
      )}
    </div>
  );
}
