'use client';

import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Image as ImageIcon,
  Video,
  Trash2,
  Edit2,
  Loader2,
  Save,
  X,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Heart,
  Users,
  Clock,
  Sparkles,
  Search,
  Upload,
  CheckCircle2,
  RefreshCw,
  Play,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast';
import { compressStoryMedia } from '@/lib/story-media-compressor';

export interface AdminStoryLike {
  id: string;
  userId: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email?: string | null;
    image: string | null;
    role?: string;
  };
}

export interface AdminStoryItem {
  id: string;
  title: string;
  mediaUrl: string;
  mediaType: string;
  linkUrl?: string | null;
  isActive: boolean;
  duration: number;
  userId?: string | null;
  createdAt: string;
  expiresAt: string;
  user?: {
    id: string;
    name: string | null;
    email?: string | null;
    image: string | null;
    role?: string;
  } | null;
  likes: AdminStoryLike[];
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getRemainingDays(expiresAt: string): number {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export default function StoriesAdminClient({
  initialStories,
}: {
  initialStories: AdminStoryItem[];
}) {
  const { showToast } = useToast();
  const router = useRouter();

  const [stories, setStories] = useState<AdminStoryItem[]>(initialStories);
  const [filterTab, setFilterTab] = useState<'ALL' | 'OFFICIAL' | 'USER' | 'ACTIVE' | 'EXPIRED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Create / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<AdminStoryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: number;
    compressedSize: number;
    format: string;
  } | null>(null);

  // Likers Modal (Siapa saja yang menyukai story)
  const [selectedLikersStory, setSelectedLikersStory] = useState<AdminStoryItem | null>(null);

  // Delete Modal
  const [storyToDelete, setStoryToDelete] = useState<AdminStoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    mediaUrl: '',
    mediaType: 'IMAGE' as 'IMAGE' | 'VIDEO',
    linkUrl: '',
    durationSec: 5,
    daysActive: 20,
    isActive: true,
  });

  const filteredStories = useMemo(() => {
    const now = Date.now();
    return stories.filter((story) => {
      const isExpired = new Date(story.expiresAt).getTime() <= now;
      const isOfficial = !story.user || story.user.role === 'ADMIN';

      if (filterTab === 'OFFICIAL' && !isOfficial) return false;
      if (filterTab === 'USER' && isOfficial) return false;
      if (filterTab === 'ACTIVE' && (!story.isActive || isExpired)) return false;
      if (filterTab === 'EXPIRED' && story.isActive && !isExpired) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = story.title.toLowerCase().includes(q);
        const matchAuthor = (story.user?.name || 'Arum Seduh Official').toLowerCase().includes(q);
        return matchTitle || matchAuthor;
      }

      return true;
    });
  }, [stories, filterTab, searchQuery]);

  const handleOpenModal = (story?: AdminStoryItem) => {
    setCompressionInfo(null);
    if (story) {
      setEditingStory(story);
      const remDays = Math.max(1, getRemainingDays(story.expiresAt));
      setFormData({
        title: story.title,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE',
        linkUrl: story.linkUrl || '',
        durationSec: Math.max(1, Math.round((story.duration || 5000) / 1000)),
        daysActive: remDays > 0 ? remDays : 20,
        isActive: story.isActive,
      });
    } else {
      setEditingStory(null);
      setFormData({
        title: '',
        mediaUrl: '',
        mediaType: 'IMAGE',
        linkUrl: '',
        durationSec: 5,
        daysActive: 20,
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setCompressing(true);
    setCompressionProgress(5);
    setCompressionInfo(null);

    try {
      // 1. Kompresi di sisi klien (Gambar -> WebP, Video -> Kompresi)
      const compressed = await compressStoryMedia(rawFile, (pct) => {
        setCompressionProgress(pct);
      });

      setCompressing(false);
      setUploadingMedia(true);

      const form = new FormData();
      form.append('file', compressed.file);

      const res = await fetch('/api/stories/upload', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Gagal mengunggah media');
      }

      const detectedType = data.mediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE';
      setFormData((prev) => ({
        ...prev,
        mediaUrl: data.url,
        mediaType: detectedType,
        durationSec:
          detectedType === 'VIDEO'
            ? Math.max(3, Math.round(compressed.durationMs / 1000))
            : prev.durationSec,
      }));

      setCompressionInfo({
        originalSize: compressed.originalSize,
        compressedSize: data.compressedSize || compressed.compressedSize,
        format: (data.format || compressed.format).toUpperCase(),
      });

      showToast(
        detectedType === 'IMAGE'
          ? 'Gambar berhasil dikompresi & dikonversi ke WebP'
          : 'Video berhasil dikompresi & diunggah',
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Gagal mengunggah media', 'error');
    } finally {
      setCompressing(false);
      setUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.mediaUrl.trim()) {
      showToast('Judul dan Media wajib diisi', 'error');
      return;
    }

    setLoading(true);
    try {
      const url = editingStory ? `/api/stories/${editingStory.id}` : '/api/admin/stories';
      const method = editingStory ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          mediaUrl: formData.mediaUrl.trim(),
          mediaType: formData.mediaType,
          linkUrl: formData.linkUrl.trim() || null,
          duration: Math.max(1, Number(formData.durationSec)) * 1000,
          daysActive: Math.max(1, Number(formData.daysActive) || 20),
          isActive: formData.isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.story) {
        throw new Error(data.error || 'Gagal menyimpan story');
      }

      if (editingStory) {
        setStories((prev) => prev.map((s) => (s.id === data.story.id ? data.story : s)));
        showToast('Story berhasil diperbarui', 'success');
      } else {
        setStories((prev) => [data.story, ...prev]);
        showToast('Story berhasil diterbitkan selama 20 hari', 'success');
      }

      setIsModalOpen(false);
      router.refresh();
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan story', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (story: AdminStoryItem) => {
    try {
      const res = await fetch(`/api/stories/${story.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !story.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.story) throw new Error('Gagal mengubah status');
      setStories((prev) => prev.map((s) => (s.id === story.id ? data.story : s)));
      showToast(
        data.story.isActive ? 'Story diaktifkan di Beranda' : 'Story disembunyikan dari Beranda',
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui status', 'error');
    }
  };

  const handleExtend20Days = async (story: AdminStoryItem) => {
    try {
      const res = await fetch(`/api/stories/${story.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: true,
          daysActive: 20,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.story) throw new Error('Gagal memperpanjang masa aktif');
      setStories((prev) => prev.map((s) => (s.id === story.id ? data.story : s)));
      showToast('Masa aktif Story diperpanjang 20 hari ke depan', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal memperpanjang masa aktif', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!storyToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/stories/${storyToDelete.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Gagal menghapus story');
      setStories((prev) => prev.filter((s) => s.id !== storyToDelete.id));
      setStoryToDelete(null);
      showToast('Story berhasil dihapus', 'success');
      router.refresh();
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus story', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* CLEAN ACTION BAR & FILTER TABS (Rule 9 Compliant: Tanpa Headline Judul Besar) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: `Semua (${stories.length})` },
            {
              id: 'OFFICIAL',
              label: `Official Admin (${stories.filter((s) => !s.user || s.user.role === 'ADMIN').length})`,
            },
            {
              id: 'USER',
              label: `Story Pelanggan (${stories.filter((s) => s.user && s.user.role !== 'ADMIN').length})`,
            },
            {
              id: 'ACTIVE',
              label: `Aktif Tayang (${stories.filter((s) => s.isActive && getRemainingDays(s.expiresAt) > 0).length})`,
            },
            {
              id: 'EXPIRED',
              label: `Nonaktif / Habis (${stories.filter((s) => !s.isActive || getRemainingDays(s.expiresAt) <= 0).length})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterTab === tab.id
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul atau pembuat story..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black shadow-md shadow-orange-500/20 hover:opacity-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Story (20 Hari)</span>
          </button>
        </div>
      </div>

      {/* GRID DAFTAR STORIES */}
      {filteredStories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-800">Belum ada Story pada kategori ini</p>
          <p className="text-xs text-slate-500">
            Unggah foto (otomatis WebP) atau video terkompresi yang akan tayang di Beranda selama 20 hari.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredStories.map((story) => {
            const remDays = getRemainingDays(story.expiresAt);
            const isExpired = remDays <= 0;
            const isOfficial = !story.user || story.user.role === 'ADMIN';
            const likesCount = story.likes?.length || 0;

            return (
              <div
                key={story.id}
                className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Media Thumbnail 9:16 */}
                  <div className="relative h-72 w-full bg-stone-900 overflow-hidden">
                    {story.mediaType === 'VIDEO' ? (
                      <video
                        src={story.mediaUrl}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Image
                        src={story.mediaUrl}
                        alt={story.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 320px"
                        className="object-cover"
                      />
                    )}

                    <div className="absolute inset-x-0 top-0 p-3 bg-gradient-to-b from-black/75 to-transparent flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 ${
                          story.isActive && !isExpired
                            ? 'bg-orange-500 text-white'
                            : 'bg-stone-700 text-stone-200'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        {isExpired
                          ? 'Kedaluwarsa'
                          : story.isActive
                          ? `Aktif • ${remDays} Hari`
                          : 'Disembunyikan'}
                      </span>

                      <span className="px-2 py-1 rounded-full bg-black/60 backdrop-blur-md text-amber-300 text-[10px] font-bold flex items-center gap-1 border border-white/15">
                        {story.mediaType === 'VIDEO' ? (
                          <>
                            <Play className="w-3 h-3 fill-amber-300" /> Video
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-3 h-3" /> WebP
                          </>
                        )}
                      </span>
                    </div>

                    {/* Tombol Lihat Siapa yang Like di atas thumbnail */}
                    <button
                      type="button"
                      onClick={() => setSelectedLikersStory(story)}
                      className="absolute bottom-3 left-3 right-3 px-3 py-2 rounded-xl bg-black/65 backdrop-blur-md border border-white/15 text-white flex items-center justify-between hover:bg-black/80 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Heart className="w-4 h-4 text-orange-400 fill-orange-400 shrink-0" />
                        <span className="text-xs font-black truncate">
                          {likesCount} Suka
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-amber-300 shrink-0">
                        Lihat Penyuka →
                      </span>
                    </button>
                  </div>

                  {/* Detail Story & Pembuat */}
                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="relative w-6 h-6 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white text-[10px] font-black flex items-center justify-center shrink-0 overflow-hidden">
                          {story.user?.image ? (
                            <Image
                              src={story.user.image}
                              alt={story.user.name || 'Creator'}
                              fill
                              sizes="24px"
                              className="object-cover"
                            />
                          ) : (
                            <span>{(story.user?.name || 'A')[0]?.toUpperCase()}</span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-700 truncate">
                          {isOfficial ? 'Arum Seduh Official' : story.user?.name || 'Pelanggan'}
                        </span>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isOfficial
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-orange-50 text-orange-700 border border-orange-200'
                        }`}
                      >
                        {isOfficial ? 'Official' : 'User Story'}
                      </span>
                    </div>

                    <h4 className="text-xs font-black text-slate-900 line-clamp-2 leading-snug">
                      {story.title}
                    </h4>

                    {story.linkUrl && (
                      <div className="flex items-center gap-1.5 text-[11px] text-orange-600 font-semibold truncate">
                        <LinkIcon className="w-3 h-3 shrink-0" />
                        <span className="truncate">{story.linkUrl}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tombol Aksi Admin */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(story)}
                      title={story.isActive ? 'Sembunyikan' : 'Tampilkan'}
                      className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-orange-600 hover:border-orange-200 transition-colors cursor-pointer"
                    >
                      {story.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExtend20Days(story)}
                      title="Perpanjang 20 Hari"
                      className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-amber-600 hover:border-amber-200 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenModal(story)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-orange-50 hover:text-orange-600 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStoryToDelete(story)}
                      className="p-2 rounded-xl border border-red-100 bg-red-50/60 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL TAMBAH / EDIT STORY ADMIN */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => !loading && !uploadingMedia && setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="text-sm font-black">
                    {editingStory ? 'Edit Story Arum Seduh' : 'Tambah Story Baru (20 Hari)'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/mp4,video/webm,video/quicktime"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {/* Area Unggah Media */}
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    Media Story (Gambar otomatis WebP / Video otomatis dikompresi)
                  </label>
                  {!formData.mediaUrl ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={compressing || uploadingMedia}
                      className="w-full h-48 rounded-2xl border-2 border-dashed border-amber-300 bg-orange-50/40 hover:bg-orange-50 transition-all flex flex-col items-center justify-center gap-2 p-4 cursor-pointer"
                    >
                      <Upload className="w-7 h-7 text-orange-500" />
                      <span className="text-xs font-black text-slate-800">
                        Klik untuk pilih Foto atau Video
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Foto otomatis dikonversi ke WebP & Video dikompresi otomatis
                      </span>
                    </button>
                  ) : (
                    <div className="relative h-56 w-full rounded-2xl overflow-hidden bg-stone-900 border border-slate-200">
                      {formData.mediaType === 'VIDEO' ? (
                        <video
                          src={formData.mediaUrl}
                          controls
                          playsInline
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Image
                          src={formData.mediaUrl}
                          alt="Preview"
                          fill
                          className="object-cover"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-black/65 text-white text-xs font-bold hover:bg-black/80 cursor-pointer"
                      >
                        Ganti Media
                      </button>
                    </div>
                  )}
                </div>

                {(compressing || uploadingMedia) && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs font-bold text-orange-700 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      {compressing
                        ? `Mengompresi media (${compressionProgress}%)...`
                        : 'Mengunggah media ke server...'}
                    </span>
                  </div>
                )}

                {compressionInfo && (
                  <div className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-orange-600" />
                      Format {compressionInfo.format} Terkompresi
                    </span>
                    <span className="text-orange-600 font-black">
                      {formatBytes(compressionInfo.originalSize)} → {formatBytes(compressionInfo.compressedSize)}
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Judul / Caption Story
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Contoh: Promo Spesial Sore Ini di Arum Seduh!"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Tautan Tujuan / CTA (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.linkUrl}
                    onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                    placeholder="Contoh: /?openMenu=true atau /custom-studio"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      Durasi Tampil (Detik)
                    </label>
                    <input
                      type="number"
                      min={3}
                      max={60}
                      value={formData.durationSec}
                      onChange={(e) =>
                        setFormData({ ...formData, durationSec: Number(e.target.value) || 5 })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      Masa Simpan (Hari)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={formData.daysActive}
                      onChange={(e) =>
                        setFormData({ ...formData, daysActive: Number(e.target.value) || 20 })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading || compressing || uploadingMedia}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-orange-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Simpan Story</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DAFTAR ORANG YANG MENYUKAI STORY (SIAPA SAJA YANG LIKE) */}
      <AnimatePresence>
        {selectedLikersStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setSelectedLikersStory(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 fill-white" />
                  <div>
                    <h3 className="text-sm font-black">
                      Daftar Penyuka Story ({selectedLikersStory.likes.length})
                    </h3>
                    <p className="text-[10px] text-amber-100 truncate max-w-[260px]">
                      {selectedLikersStory.title}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLikersStory(null)}
                  className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
                {selectedLikersStory.likes.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-xs font-medium">
                    Belum ada pengguna yang menyukai Story ini.
                  </div>
                ) : (
                  selectedLikersStory.likes.map((like) => (
                    <div
                      key={like.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/70"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white text-xs font-black flex items-center justify-center overflow-hidden">
                          {like.user?.image ? (
                            <Image
                              src={like.user.image}
                              alt={like.user.name || 'User'}
                              fill
                              sizes="36px"
                              className="object-cover"
                            />
                          ) : (
                            <span>{(like.user?.name || 'U')[0]?.toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900">
                            {like.user?.name || 'Pelanggan Arum Seduh'}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {like.user?.email || 'Member Arum Seduh'} •{' '}
                            {new Date(like.createdAt).toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>
                      <Heart className="w-4 h-4 text-orange-500 fill-orange-500 shrink-0" />
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL KONFIRMASI HAPUS */}
      <ConfirmModal
        isOpen={!!storyToDelete}
        onClose={() => setStoryToDelete(null)}
        onConfirm={confirmDelete}
        title="Hapus Story"
        message={`Apakah Anda yakin ingin menghapus story "${storyToDelete?.title}"?`}
        confirmText={isDeleting ? 'Menghapus...' : 'Hapus Story'}
        variant="danger"
      />
    </div>
  );
}
