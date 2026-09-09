'use client';

import { useState, useEffect, useMemo } from 'react';
import { HelpCircle, Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

import { HelpArticle, HelpArticleFormData } from './_components/types';
import { HelpCategoryTabs } from './_components/HelpCategoryTabs';
import { HelpArticleCard } from './_components/HelpArticleCard';
import { HelpArticleModal } from './_components/HelpArticleModal';

export default function AdminHelpCenterPage() {
  const { showToast } = useToast();
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Editor Modal States
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<HelpArticleFormData>({
    id: null,
    title: '',
    content: '',
    category: 'Pemesanan',
    order: '0',
    isActive: true,
  });

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/help-articles');
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles || []);
      } else {
        showToast('Gagal memuat artikel bantuan', 'error');
      }
    } catch {
      showToast('Kesalahan jaringan', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleOpenNew = () => {
    setFormData({
      id: null,
      title: '',
      content: '',
      category: 'Pemesanan',
      order: '0',
      isActive: true,
    });
    setIsOpen(true);
  };

  const handleOpenEdit = (article: HelpArticle) => {
    setFormData({
      id: article.id,
      title: article.title,
      content: article.content,
      category: article.category,
      order: String(article.order),
      isActive: article.isActive,
    });
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content || !formData.category) {
      showToast('Harap isi semua kolom wajib', 'error');
      return;
    }
    setSaving(true);
    try {
      const method = formData.id ? 'PUT' : 'POST';
      const body = {
        id: formData.id,
        title: formData.title,
        content: formData.content,
        category: formData.category,
        order: formData.order,
        isActive: formData.isActive,
      };
      const res = await fetch('/api/admin/help-articles', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        showToast(
          formData.id ? 'Artikel berhasil diperbarui' : 'Artikel baru berhasil dibuat',
          'success'
        );
        setIsOpen(false);
        fetchArticles();
      } else {
        showToast('Gagal menyimpan artikel', 'error');
      }
    } catch {
      showToast('Kesalahan jaringan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (artId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Artikel Bantuan',
      message: 'Apakah Anda yakin ingin menghapus artikel FAQ ini secara permanen?',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/admin/help-articles?id=${artId}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            showToast('Artikel berhasil dihapus', 'success');
            fetchArticles();
          } else {
            showToast('Gagal menghapus artikel', 'error');
          }
        } catch {
          showToast('Kesalahan jaringan', 'error');
        }
      },
    });
  };

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    articles.forEach((a) => {
      if (a.category) cats.add(a.category);
    });
    return Array.from(cats);
  }, [articles]);

  // Group articles by category
  const filteredArticles = useMemo(() => {
    if (selectedCategory === 'ALL') return articles;
    return articles.filter((a) => a.category === selectedCategory);
  }, [articles, selectedCategory]);

  const articlesByCategory = useMemo(() => {
    return filteredArticles.reduce((groups: { [key: string]: HelpArticle[] }, art) => {
      const cat = art.category || 'Lainnya';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(art);
      return groups;
    }, {});
  }, [filteredArticles]);

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-4xl text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black font-heading text-slate-900 flex items-center gap-2.5">
            <HelpCircle className="w-6 h-6 text-orange-600" />
            <span>Pusat Bantuan & FAQ</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola konten pertanyaan yang sering ditanyakan (FAQ) dan panduan bantuan pelanggan Arum Seduh
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenNew}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl text-xs font-bold shadow-glow-orange transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Artikel</span>
        </button>
      </div>

      {/* Category Tabs Filter */}
      {categories.length > 0 && (
        <HelpCategoryTabs
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          totalArticles={articles.length}
        />
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200/80 rounded-3xl text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-2" />
          <p className="text-xs font-bold">Memuat FAQ Arum Seduh...</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl py-16 text-center p-6 shadow-xs">
          <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 mb-1">Pusat Bantuan Kosong</h3>
          <p className="text-xs text-slate-400">
            Belum ada artikel bantuan/FAQ yang dibuat. Klik tombol Tambah Artikel di atas untuk mulai membuat panduan.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(articlesByCategory).map(([catName, list]) => (
            <div key={catName} className="space-y-3">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">
                Kategori: {catName} ({list.length} artikel)
              </h2>

              <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden divide-y divide-slate-100 shadow-xs">
                {list.map((art) => (
                  <HelpArticleCard
                    key={art.id}
                    article={art}
                    onEdit={handleOpenEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      <HelpArticleModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        formData={formData}
        setFormData={setFormData}
        saving={saving}
        onSave={handleSave}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
