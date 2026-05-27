'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HelpCircle, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  ChevronRight, 
  Loader2, 
  Check, 
  EyeOff,
  Eye,
  ArrowUpDown
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function AdminHelpCenterPage() {
  const { showToast } = useToast();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Editor Modal States
  const [isOpen, setIsOpen] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [order, setOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

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
    } catch (err) {
      console.error(err);
      showToast('Kesalahan jaringan', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleOpenNew = () => {
    setId(null);
    setTitle('');
    setContent('');
    setCategory('Pemesanan');
    setOrder('0');
    setIsActive(true);
    setIsOpen(true);
  };

  const handleOpenEdit = (article: any) => {
    setId(article.id);
    setTitle(article.title);
    setContent(article.content);
    setCategory(article.category);
    setOrder(String(article.order));
    setIsActive(article.isActive);
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || !category) {
      showToast('Harap isi semua kolom wajib', 'error');
      return;
    }
    setSaving(true);
    try {
      const method = id ? 'PUT' : 'POST';
      const body = { id, title, content, category, order, isActive };
      const res = await fetch('/api/admin/help-articles', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        showToast(id ? 'Artikel diperbarui' : 'Artikel baru berhasil dibuat', 'success');
        setIsOpen(false);
        fetchArticles();
      } else {
        showToast('Gagal menyimpan artikel', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Kesalahan jaringan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (artId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus artikel FAQ ini secara permanen?')) return;
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
    } catch (err) {
      console.error(err);
      showToast('Kesalahan jaringan', 'error');
    }
  };

  // Group articles by category
  const articlesByCategory = articles.reduce((groups: { [key: string]: any[] }, art) => {
    const cat = art.category || 'Lainnya';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(art);
    return groups;
  }, {});

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-black text-foreground flex items-center gap-3">
            <HelpCircle className="w-6 h-6 text-brand-600" /> Pusat Bantuan & FAQ
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola konten pertanyaan yang sering ditanyakan (FAQ) dan panduan bantuan customer.
          </p>
        </div>
        <button
          onClick={handleOpenNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Tambah Artikel Bantuan
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
          <p className="text-xs text-muted-foreground font-bold">Memuat FAQ...</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl py-16 text-center">
          <HelpCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-foreground mb-1">Pusat Bantuan Kosong</h3>
          <p className="text-xs text-muted-foreground">Belum ada artikel bantuan/FAQ yang dibuat. Klik tombol di atas untuk menambah.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(articlesByCategory).map(([catName, list]) => (
            <div key={catName} className="space-y-3">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">
                Kategori: {catName} ({list.length} artikel)
              </h2>
              
              <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
                {list.map((art) => (
                  <div key={art.id} className="p-4 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap hover:bg-muted/5 transition-colors">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground truncate block">
                          {art.title}
                        </span>
                        {!art.isActive && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-yellow-50 text-yellow-700 border border-yellow-100 text-[8px] font-black uppercase">
                            <EyeOff className="w-2.5 h-2.5" /> Draf / Nonaktif
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {art.content}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="font-semibold flex items-center gap-0.5">
                          <ArrowUpDown className="w-3 h-3 text-brand-600" /> Urutan: {art.order}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(art)}
                        className="p-2 hover:bg-muted text-foreground border border-border rounded-lg transition-colors cursor-pointer"
                        title="Edit Artikel"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(art.id)}
                        className="p-2 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-muted-foreground border border-border rounded-lg transition-colors cursor-pointer"
                        title="Hapus Artikel"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Dialog Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-lg rounded-2xl border border-border p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-serif font-black text-sm text-foreground flex items-center gap-2">
                  <HelpCircle className="w-4.5 h-4.5 text-brand-600" />
                  {id ? 'Edit Artikel Bantuan' : 'Tambah Artikel Bantuan Baru'}
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-muted rounded-lg text-muted-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="block font-bold text-muted-foreground uppercase">Kategori FAQ *</label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Contoh: Pemesanan, Pembayaran, Voucher, Akun"
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl outline-none focus:border-brand-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block font-bold text-muted-foreground uppercase">Urutan Tampil (Order Index)</label>
                    <input
                      type="number"
                      value={order}
                      onChange={(e) => setOrder(e.target.value)}
                      placeholder="Semakin kecil urutan semakin di atas"
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl outline-none focus:border-brand-500"
                    />
                  </div>
                  
                  <div className="space-y-1.5 flex flex-col justify-end pb-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is-active-faq"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="rounded border-border text-brand-600 focus:ring-brand-500"
                      />
                      <label htmlFor="is-active-faq" className="font-bold text-foreground cursor-pointer select-none">
                        Aktif / Tampilkan ke Customer
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-muted-foreground uppercase">Judul / Pertanyaan FAQ *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Bagaimana cara menukarkan voucher reward?"
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl outline-none focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-muted-foreground uppercase">Isi Jawaban Bantuan *</label>
                  <textarea
                    required
                    rows={8}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Tuliskan jawaban lengkap di sini. Anda bisa memberikan langkah-langkah detail..."
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl outline-none focus:border-brand-500 resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    disabled={saving}
                    className="flex-1 py-2.5 border border-border bg-background hover:bg-muted text-muted-foreground rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Simpan FAQ
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
