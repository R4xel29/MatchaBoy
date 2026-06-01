'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, X, Save, Loader2, Music, Sun, Sunrise, Sunset, Moon, Play, Pause } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface BgmSong {
  id: string;
  title: string;
  artist: string;
  url: string;
  mood: string;
  timePeriod: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Props {
  initialSongs: BgmSong[];
}

export default function AdminBgmClient({ initialSongs }: Props) {
  const { showToast } = useToast();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingSong, setEditingSong] = useState<BgmSong | null>(null);
  
  // Form states
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [url, setUrl] = useState('');
  const [mood, setMood] = useState('');
  const [timePeriod, setTimePeriod] = useState('siang');
  const [isActive, setIsActive] = useState(true);
  
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BgmSong | null>(null);
  
  // Audio preview states
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/') && !file.name.endsWith('.mp3')) {
      showToast('Hanya file MP3 yang diperbolehkan!', 'error');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      showToast('Ukuran file maksimal 15MB!', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/bgm/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await res.json();
      setUrl(data.url);
      
      // Auto fill title if empty
      if (!title) {
        const cleanTitle = file.name
          .replace(/\.[^.]+$/, '')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());
        setTitle(cleanTitle);
      }
      
      showToast('Audio berhasil diupload!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Gagal mengupload audio', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const openModal = (song?: BgmSong) => {
    if (song) {
      setEditingSong(song);
      setTitle(song.title);
      setArtist(song.artist);
      setUrl(song.url);
      setMood(song.mood);
      setTimePeriod(song.timePeriod);
      setIsActive(song.isActive);
    } else {
      setEditingSong(null);
      setTitle('');
      setArtist('');
      setUrl('');
      setMood('');
      setTimePeriod('siang');
      setIsActive(true);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSong(null);
    setTitle('');
    setArtist('');
    setUrl('');
    setMood('');
  };

  const handleSave = async () => {
    if (!title.trim()) { showToast('Song title is required', 'error'); return; }
    if (!artist.trim()) { showToast('Artist is required', 'error'); return; }
    if (!url.trim()) { showToast('MP3 URL is required', 'error'); return; }
    
    // basic URL format validation
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      showToast('URL must start with http:// or https://', 'error');
      return;
    }

    setSaving(true);
    try {
      const isEdit = !!editingSong;
      const apiPath = isEdit ? `/api/admin/bgm/${editingSong.id}` : '/api/admin/bgm';
      const method = isEdit ? 'PATCH' : 'POST';
      
      const res = await fetch(apiPath, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          artist: artist.trim(),
          url: url.trim(),
          mood: mood.trim(),
          timePeriod,
          isActive,
        }),
      });

      if (!res.ok) throw new Error('Failed to save BGM song');

      closeModal();
      router.refresh();
      showToast(isEdit ? 'Lagu berhasil diubah' : 'Lagu berhasil ditambahkan', 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal menyimpan lagu', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      // Stop preview if deleting
      if (previewingId === deleteTarget.id) {
        stopPreview();
      }

      const res = await fetch(`/api/admin/bgm/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete BGM song');
      
      setDeleteTarget(null);
      router.refresh();
      showToast('Lagu berhasil dihapus', 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal menghapus lagu', 'error');
    }
  };

  const handleToggleActive = async (song: BgmSong) => {
    try {
      const res = await fetch(`/api/admin/bgm/${song.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !song.isActive }),
      });
      if (!res.ok) throw new Error('Failed to toggle song state');
      
      router.refresh();
      showToast(`Lagu ${!song.isActive ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal mengubah status lagu', 'error');
    }
  };

  const startPreview = (song: BgmSong) => {
    if (previewAudio) {
      previewAudio.pause();
    }

    const audio = new Audio(song.url);
    audio.play()
      .then(() => {
        setPreviewAudio(audio);
        setPreviewingId(song.id);
        
        audio.onended = () => {
          setPreviewingId(null);
          setPreviewAudio(null);
        };
      })
      .catch((err) => {
        console.error(err);
        showToast('Gagal memutar audio preview. Pastikan link MP3 valid.', 'error');
      });
  };

  const stopPreview = () => {
    if (previewAudio) {
      previewAudio.pause();
    }
    setPreviewingId(null);
    setPreviewAudio(null);
  };

  const getPeriodBadge = (period: string) => {
    switch (period) {
      case 'pagi':
        return (
          <span className="flex items-center gap-1 bg-sky-50 border border-sky-200 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            <Sunrise className="w-3 h-3 text-sky-500" /> Pagi (06:00 - 10:00)
          </span>
        );
      case 'siang':
        return (
          <span className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            <Sun className="w-3 h-3 text-amber-500" /> Siang (10:00 - 16:00)
          </span>
        );
      case 'sore':
        return (
          <span className="flex items-center gap-1 bg-orange-50 border border-orange-200 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            <Sunset className="w-3 h-3 text-orange-500" /> Sore (16:00 - 18:00)
          </span>
        );
      case 'malam':
      default:
        return (
          <span className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            <Moon className="w-3 h-3 text-indigo-500" /> Malam (18:00 - 06:00)
          </span>
        );
    }
  };

  return (
    <>
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{initialSongs.length} lagu terdaftar</p>
        <button onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl gradient-brand text-white hover:opacity-90 transition-all shadow-md shadow-brand-700/15 active:scale-[0.98]">
          <Plus className="w-4 h-4" /> Tambah Lagu BGM
        </button>
      </div>

      {/* Grid Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {initialSongs.map(song => (
          <div key={song.id} className={`group p-5 rounded-3xl bg-white border border-border/40 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between ${!song.isActive ? 'opacity-70 bg-slate-50/50' : ''}`}>
            
            <div>
              {/* Card Top row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${song.isActive ? 'bg-brand-500/10 text-brand-600' : 'bg-slate-300/10 text-slate-500'}`}>
                    <Music className="w-5 h-5" />
                  </div>
                  <div>
                    {getPeriodBadge(song.timePeriod)}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Preview Button */}
                  {previewingId === song.id ? (
                    <button onClick={stopPreview}
                      className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all cursor-pointer">
                      <Pause className="w-4 h-4 fill-rose-600" />
                    </button>
                  ) : (
                    <button onClick={() => startPreview(song)}
                      className="p-2 bg-brand-50 text-brand-700 rounded-xl hover:bg-brand-100 transition-all cursor-pointer">
                      <Play className="w-4 h-4 fill-brand-700" />
                    </button>
                  )}

                  {/* Actions dropdown/buttons */}
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openModal(song)} className="p-2 hover:bg-blue-50 rounded-xl text-muted-foreground hover:text-blue-600 transition-colors cursor-pointer">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteTarget(song)} className="p-2 hover:bg-rose-50 rounded-xl text-muted-foreground hover:text-rose-600 transition-colors cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Title & Artist */}
              <div className="mt-2 space-y-1">
                <h3 className="font-bold text-foreground text-base leading-tight tracking-wide">
                  {song.title}
                </h3>
                <p className="text-xs text-muted-foreground font-semibold">
                  oleh {song.artist}
                </p>
                {song.mood && (
                  <p className="text-[11px] text-brand-700/80 bg-brand-500/5 border border-brand-500/10 rounded-lg px-2.5 py-1 inline-block mt-2 italic">
                    "{song.mood}"
                  </p>
                )}
              </div>
            </div>

            {/* Bottom Row: Active toggle and details */}
            <div className="flex items-center justify-between mt-5 pt-3.5 border-t border-border/10">
              <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]" title={song.url}>
                URL: {song.url}
              </div>

              {/* Active Toggle Switch */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {song.isActive ? 'Aktif' : 'Nonaktif'}
                </span>
                <button
                  onClick={() => handleToggleActive(song)}
                  className={`w-9 h-5 rounded-full relative transition-colors duration-200 cursor-pointer ${
                    song.isActive ? 'bg-brand-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 transition-transform duration-200 ${
                      song.isActive ? 'left-4.5' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>

      {initialSongs.length === 0 && (
        <div className="py-20 text-center text-muted-foreground/50 bg-white rounded-3xl border border-border/40 mt-3 shadow-sm">
          <Music className="w-12 h-12 mx-auto mb-3 opacity-30 text-brand-600" />
          <p className="text-sm font-semibold">Belum ada lagu BGM buatan admin</p>
          <p className="text-xs text-muted-foreground/60 mt-1 max-w-sm mx-auto">
            Storefront akan otomatis memutar lagu lofi default. Tambahkan lagu kustom Anda sendiri untuk memikat hati pelanggan!
          </p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={closeModal}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
              <h3 className="text-base font-bold font-heading">
                {editingSong ? 'Edit Lagu BGM' : 'Tambah Lagu BGM Baru'}
              </h3>
              <button onClick={closeModal} className="p-1.5 hover:bg-muted rounded-xl transition-all cursor-pointer">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              
              {/* Title Input */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Judul Lagu *</label>
                <input 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="e.g. Uji Sunrise 🌅"
                  className="w-full px-3.5 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all" 
                />
              </div>

              {/* Artist Input */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Artis *</label>
                <input 
                  value={artist} 
                  onChange={e => setArtist(e.target.value)} 
                  placeholder="e.g. Matchaboy Chill"
                  className="w-full px-3.5 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all" 
                />
              </div>

              {/* MP3 URL Input & Local Upload */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Link URL File MP3 *</label>
                  <label className={`text-[11px] font-bold text-brand-600 hover:underline cursor-pointer flex items-center gap-1 ${isUploading ? 'pointer-events-none opacity-50' : ''}`}>
                    {isUploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>📁 Upload MP3</>
                    )}
                    <input 
                      type="file" 
                      accept="audio/mpeg,audio/mp3,audio/*" 
                      onChange={handleFileUpload} 
                      disabled={isUploading}
                      className="hidden" 
                    />
                  </label>
                </div>
                
                <input 
                  value={url} 
                  onChange={e => setUrl(e.target.value)} 
                  disabled={isUploading}
                  placeholder="https://example.com/song.mp3 atau hasil upload"
                  className="w-full px-3.5 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all font-mono text-xs disabled:opacity-50" 
                />
                
                {isUploading && (
                  <div className="text-[10px] text-brand-600 font-semibold animate-pulse flex items-center gap-1.5 bg-brand-500/5 border border-brand-500/10 rounded-lg px-2.5 py-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sedang mengupload MP3 ke database... Mohon tunggu.
                  </div>
                )}
                
                <span className="text-[10px] text-muted-foreground/80 mt-1 block">
                  Anda bisa mengupload file MP3 secara langsung dengan mengklik tombol <strong>Upload MP3</strong>, atau memasukkan link MP3 langsung (Direct Link).
                </span>
              </div>

              {/* Mood Input */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Mood / Deskripsi Lagu (Opsional)</label>
                <input 
                  value={mood} 
                  onChange={e => setMood(e.target.value)} 
                  placeholder="e.g. Fresh & Ceria (Gitar Akustik Lofi)"
                  className="w-full px-3.5 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all" 
                />
              </div>

              {/* Time Period Select */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Waktu Pemutaran *</label>
                <select 
                  value={timePeriod} 
                  onChange={e => setTimePeriod(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all cursor-pointer font-semibold"
                >
                  <option value="pagi">🌅 Pagi Hari (06:00 - 10:00)</option>
                  <option value="siang">☀️ Siang Hari (10:00 - 16:00)</option>
                  <option value="sore">🌇 Sore Hari (16:00 - 18:00)</option>
                  <option value="malam">🌃 Malam Hari (18:00 - 06:00)</option>
                </select>
              </div>

              {/* Active Switch */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-border/30">
                <div>
                  <span className="text-xs font-bold text-foreground block">Status Lagu Aktif</span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">Jika aktif, lagu akan masuk antrean player</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`w-9 h-5 rounded-full relative transition-colors duration-200 cursor-pointer ${
                    isActive ? 'bg-brand-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 transition-transform duration-200 ${
                      isActive ? 'left-4.5' : 'left-1'
                    }`}
                  />
                </button>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 border-t border-border/30 flex justify-end gap-2 bg-muted/10">
              <button onClick={closeModal} className="px-4 py-2.5 text-sm font-medium rounded-xl hover:bg-muted transition-colors cursor-pointer">
                Batal
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2.5 text-sm font-semibold rounded-xl gradient-brand text-white hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50 shadow-md shadow-brand-700/15 cursor-pointer">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Menyimpan...' : 'Simpan Lagu'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-5.5 h-5.5 text-rose-500" />
            </div>
            <h3 className="text-base font-bold mb-1">Hapus Lagu BGM?</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Lagu <strong>{deleteTarget.title}</strong> akan dihapus permanen dari pemutar musik.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl hover:bg-muted transition-colors cursor-pointer">
                Batal
              </button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2.5 text-sm font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer">
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
