'use client';

import React, { useState } from 'react';
import {
  ListChecks,
  Plus,
  Pencil,
  Trash2,
  Camera,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Check,
  Power,
  Layers,
  Sparkles,
  CheckSquare,
  Square,
  FolderInput,
  CameraOff,
  Settings2,
  ShieldAlert
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export interface SopTemplateItem {
  id: string;
  category: string;
  jobdeskCode?: string;
  title: string;
  description: string | null;
  isPhotoRequired: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface SopJobdesk {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface SopMasterManagementProps {
  templates: SopTemplateItem[];
  jobdesks?: SopJobdesk[];
  onTemplatesChange: (updatedTemplates: SopTemplateItem[]) => void;
  onJobdesksChange?: (updatedJobdesks: SopJobdesk[]) => void;
}

export default function SopMasterManagement({
  templates,
  jobdesks = [],
  onTemplatesChange,
  onJobdesksChange,
}: SopMasterManagementProps) {
  const { showToast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'OPENING' | 'CLOSING' | 'ROUTINE'>('ALL');
  const [selectedJobdeskFilter, setSelectedJobdeskFilter] = useState<string>('ALL');
  
  // Local jobdesks state
  const [localJobdesks, setLocalJobdesks] = useState<SopJobdesk[]>(jobdesks);

  // Selection state for Bulk Action
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);
  const [targetMoveCategory, setTargetMoveCategory] = useState<'OPENING' | 'CLOSING' | 'ROUTINE'>('OPENING');
  const [isBulkMoveJobdeskModalOpen, setIsBulkMoveJobdeskModalOpen] = useState(false);
  const [targetMoveJobdeskCode, setTargetMoveJobdeskCode] = useState<string>('GENERAL');

  // Modal states for single Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SopTemplateItem | null>(null);

  // Form states for SOP Item
  const [formCategory, setFormCategory] = useState<'OPENING' | 'CLOSING' | 'ROUTINE'>('OPENING');
  const [formJobdeskCode, setFormJobdeskCode] = useState<string>('GENERAL');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPhotoRequired, setFormPhotoRequired] = useState(false);
  const [formSortOrder, setFormSortOrder] = useState<number>(1);
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Delete single modal confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Jobdesks Management Modal states
  const [isJobdesksModalOpen, setIsJobdesksModalOpen] = useState(false);
  const [newJobdeskCode, setNewJobdeskCode] = useState('');
  const [newJobdeskName, setNewJobdeskName] = useState('');
  const [newJobdeskDesc, setNewJobdeskDesc] = useState('');
  const [isSavingJobdesk, setIsSavingJobdesk] = useState(false);
  const [editingJobdesk, setEditingJobdesk] = useState<SopJobdesk | null>(null);

  // Helper jobdesk name
  const getJobdeskName = (code?: string | null) => {
    if (!code || code === 'GENERAL') return 'Umum';
    const found = localJobdesks.find((j) => j.code === code);
    return found ? found.name : code;
  };

  // Filter templates
  const filteredTemplates = templates
    .filter((t) => (selectedCategory === 'ALL' ? true : t.category === selectedCategory))
    .filter((t) => (selectedJobdeskFilter === 'ALL' ? true : (t.jobdeskCode || 'GENERAL') === selectedJobdeskFilter))
    .sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.sortOrder - b.sortOrder;
    });

  // Toggle selection for a single item
  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Select all / deselect all currently filtered items
  const handleSelectAll = () => {
    const allFilteredIds = filteredTemplates.map((t) => t.id);
    const areAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.includes(id));

    if (areAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const areAllFilteredSelected =
    filteredTemplates.length > 0 && filteredTemplates.every((t) => selectedIds.includes(t.id));

  // Execute Bulk Action
  const handleExecuteBulkAction = async (action: string, payload?: any) => {
    if (selectedIds.length === 0) return;
    setIsBulkLoading(true);

    try {
      const res = await fetch('/api/admin/inspections/templates/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedIds,
          action,
          payload,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menjalankan aksi massal');

      if (data.items) {
        onTemplatesChange(data.items);
      } else {
        const refreshed = await fetch('/api/admin/inspections/templates');
        const rData = await refreshed.json();
        if (rData.items) onTemplatesChange(rData.items);
      }

      showToast(data.message || 'Aksi massal berhasil!', 'success');
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
      setIsBulkMoveModalOpen(false);
      setIsBulkMoveJobdeskModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Gagal menjalankan aksi massal', 'error');
    } finally {
      setIsBulkLoading(false);
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingItem(null);
    setFormCategory(selectedCategory === 'ALL' ? 'OPENING' : selectedCategory);
    setFormJobdeskCode(selectedJobdeskFilter === 'ALL' ? 'GENERAL' : selectedJobdeskFilter);
    setFormTitle('');
    setFormDescription('');
    setFormPhotoRequired(false);
    const cat = selectedCategory === 'ALL' ? 'OPENING' : selectedCategory;
    const catItems = templates.filter((t) => t.category === cat);
    const maxOrder = catItems.reduce((max, i) => Math.max(max, i.sortOrder), 0);
    setFormSortOrder(maxOrder + 1);
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (item: SopTemplateItem) => {
    setEditingItem(item);
    setFormCategory(item.category as any);
    setFormJobdeskCode(item.jobdeskCode || 'GENERAL');
    setFormTitle(item.title);
    setFormDescription(item.description || '');
    setFormPhotoRequired(item.isPhotoRequired);
    setFormSortOrder(item.sortOrder);
    setFormIsActive(item.isActive);
    setIsModalOpen(true);
  };

  // Submit Create or Edit Item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('Judul / Butir SOP wajib diisi', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (editingItem) {
        const res = await fetch('/api/admin/inspections/templates', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingItem.id,
            category: formCategory,
            jobdeskCode: formJobdeskCode,
            title: formTitle,
            description: formDescription,
            isPhotoRequired: formPhotoRequired,
            sortOrder: Number(formSortOrder),
            isActive: formIsActive,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal memperbarui butir SOP');

        const next = templates.map((t) => (t.id === editingItem.id ? data.item : t));
        onTemplatesChange(next);
        showToast('Butir SOP berhasil diperbarui', 'success');
      } else {
        const res = await fetch('/api/admin/inspections/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: formCategory,
            jobdeskCode: formJobdeskCode,
            title: formTitle,
            description: formDescription,
            isPhotoRequired: formPhotoRequired,
            sortOrder: Number(formSortOrder),
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal menambahkan butir SOP');

        onTemplatesChange([...templates, data.item]);
        showToast('Butir SOP baru berhasil ditambahkan', 'success');
      }

      setIsModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan butir SOP', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Quick Toggle Active
  const handleToggleActive = async (item: SopTemplateItem) => {
    try {
      const res = await fetch('/api/admin/inspections/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          isActive: !item.isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah status');

      onTemplatesChange(templates.map((t) => (t.id === item.id ? data.item : t)));
      showToast(`Status SOP diubah menjadi ${!item.isActive ? 'Aktif' : 'Non-Aktif'}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal mengubah status', 'error');
    }
  };

  // Reorder Item
  const handleReorder = async (item: SopTemplateItem, direction: 'up' | 'down') => {
    const catItems = filteredTemplates.filter((t) => t.category === item.category);
    const currentIndex = catItems.findIndex((t) => t.id === item.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= catItems.length) return;

    const targetItem = catItems[targetIndex];
    const newOrder = targetItem.sortOrder;
    const oldOrder = item.sortOrder;

    try {
      await Promise.all([
        fetch('/api/admin/inspections/templates', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id, sortOrder: newOrder }),
        }),
        fetch('/api/admin/inspections/templates', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: targetItem.id, sortOrder: oldOrder }),
        }),
      ]);

      const updated = templates.map((t) => {
        if (t.id === item.id) return { ...t, sortOrder: newOrder };
        if (t.id === targetItem.id) return { ...t, sortOrder: oldOrder };
        return t;
      });

      onTemplatesChange(updated);
    } catch (err: any) {
      showToast('Gagal mengubah urutan', 'error');
    }
  };

  // Delete Single Item
  const handleDeleteItem = async () => {
    if (!deletingId) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/admin/inspections/templates?id=${deletingId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus SOP');

      onTemplatesChange(templates.filter((t) => t.id !== deletingId));
      setSelectedIds((prev) => prev.filter((id) => id !== deletingId));
      showToast('Butir SOP berhasil dihapus', 'success');
      setDeletingId(null);
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus SOP', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // JOBDESK CRUD HANDLERS
  const handleCreateJobdesk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobdeskName.trim()) {
      showToast('Nama Peran / Jobdesk wajib diisi', 'error');
      return;
    }

    const code = (newJobdeskCode || newJobdeskName).toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    setIsSavingJobdesk(true);

    try {
      const res = await fetch('/api/admin/inspections/jobdesks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          name: newJobdeskName.trim(),
          description: newJobdeskDesc.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menambahkan jobdesk');

      const updated = [...localJobdesks, data.jobdesk];
      setLocalJobdesks(updated);
      if (onJobdesksChange) onJobdesksChange(updated);

      setNewJobdeskCode('');
      setNewJobdeskName('');
      setNewJobdeskDesc('');
      showToast(`Peran Jobdesk "${data.jobdesk.name}" berhasil ditambahkan!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan jobdesk', 'error');
    } finally {
      setIsSavingJobdesk(false);
    }
  };

  const handleUpdateJobdesk = async (j: SopJobdesk) => {
    try {
      const res = await fetch('/api/admin/inspections/jobdesks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: j.id,
          name: j.name,
          description: j.description,
          isActive: j.isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui jobdesk');

      const updated = localJobdesks.map((item) => (item.id === j.id ? data.jobdesk : item));
      setLocalJobdesks(updated);
      if (onJobdesksChange) onJobdesksChange(updated);
      setEditingJobdesk(null);
      showToast('Peran Jobdesk berhasil diperbarui', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui', 'error');
    }
  };

  const handleDeleteJobdesk = async (id: string, code: string) => {
    if (code === 'GENERAL') {
      showToast('Jobdesk Umum (GENERAL) tidak boleh dihapus', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/admin/inspections/jobdesks?id=${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus jobdesk');

      const updated = localJobdesks.filter((j) => j.id !== id);
      setLocalJobdesks(updated);
      if (onJobdesksChange) onJobdesksChange(updated);
      showToast(data.message || 'Peran Jobdesk dihapus', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus jobdesk', 'error');
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'OPENING':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">Buka Toko</span>;
      case 'CLOSING':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800">Tutup Toko</span>;
      case 'ROUTINE':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">Rutin Harian</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">{cat}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-orange-500" />
            Pengaturan Master Template SOP Outlet
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin Utama dapat mengatur butir SOP per shift dan peran jobdesk, serta menggunakan aksi massal (Bulk Action).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsJobdesksModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all"
          >
            <Layers className="w-4 h-4 text-orange-500" />
            <span>Kelola Peran Jobdesk ({localJobdesks.length})</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-sm hover:shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Butir SOP</span>
          </button>
        </div>
      </div>

      {/* Filter Bar: Category & Jobdesk */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        {/* Category Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 mr-1">Shift:</span>
            {[
              { id: 'ALL', label: 'Semua Shift' },
              { id: 'OPENING', label: 'Buka Toko' },
              { id: 'CLOSING', label: 'Tutup Toko' },
              { id: 'ROUTINE', label: 'Rutin Harian' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedCategory === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Select All Checkbox Button */}
          {filteredTemplates.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  areAllFilteredSelected
                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {areAllFilteredSelected ? (
                  <CheckSquare className="w-4 h-4 text-orange-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>{areAllFilteredSelected ? 'Batalkan Pilih Semua' : 'Pilih Semua'} ({filteredTemplates.length})</span>
              </button>
            </div>
          )}
        </div>

        {/* Jobdesk Filters */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Layers className="w-3 h-3 text-orange-500" /> Jobdesk:
          </span>
          <button
            type="button"
            onClick={() => setSelectedJobdeskFilter('ALL')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              selectedJobdeskFilter === 'ALL'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Jobdesk
          </button>
          <button
            type="button"
            onClick={() => setSelectedJobdeskFilter('GENERAL')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              selectedJobdeskFilter === 'GENERAL'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Umum
          </button>
          {localJobdesks
            .filter((j) => j.code !== 'GENERAL')
            .map((j) => (
              <button
                key={j.code}
                type="button"
                onClick={() => setSelectedJobdeskFilter(j.code)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  selectedJobdeskFilter === j.code
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {j.name}
              </button>
            ))}
        </div>
      </div>

      {/* Items Table / Cards */}
      <div className="space-y-3">
        {filteredTemplates.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-sm">
            <p className="text-xs text-slate-400 font-medium">Belum ada butir SOP pada filter shift dan jobdesk ini.</p>
          </div>
        ) : (
          filteredTemplates.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            const jobdeskLabel = getJobdeskName(item.jobdeskCode);

            return (
              <div
                key={item.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isSelected
                    ? 'bg-orange-50/60 border-orange-300 ring-2 ring-orange-200 shadow-sm'
                    : item.isActive
                    ? 'bg-white border-slate-200/80 hover:border-slate-300 shadow-sm'
                    : 'bg-slate-50/70 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1">
                  {/* Select Checkbox */}
                  <div className="pt-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleSelectItem(item.id)}
                      className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'border border-slate-300 bg-white hover:border-orange-400'
                      }`}
                      title="Pilih butir untuk aksi massal"
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>
                  </div>

                  {/* Reorder Buttons */}
                  <div className="flex flex-col gap-1 shrink-0 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleReorder(item, 'up')}
                      className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                      title="Pindah ke atas"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReorder(item, 'down')}
                      className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                      title="Pindah ke bawah"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Content Details */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {getCategoryBadge(item.category)}
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200 flex items-center gap-1">
                        <Layers className="w-2.5 h-2.5" />
                        {jobdeskLabel}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        Urutan #{item.sortOrder}
                      </span>
                      {item.isPhotoRequired && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                          <Camera className="w-2.5 h-2.5" /> Wajib Foto
                        </span>
                      )}
                      {!item.isActive && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-200 text-slate-600">
                          Non-Aktif
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      {item.title}
                    </h4>

                    {item.description && (
                      <p className="text-[11px] text-slate-500 leading-normal line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Item Actions */}
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {/* Toggle Active Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(item)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                      item.isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                    title={item.isActive ? 'Nonaktifkan tugas ini' : 'Aktifkan tugas ini'}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span className="text-[11px]">{item.isActive ? 'Aktif' : 'Non-Aktif'}</span>
                  </button>

                  {/* Edit Button */}
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-600 transition-colors"
                    title="Edit butir SOP"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => setDeletingId(item.id)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 transition-colors"
                    title="Hapus butir SOP"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* FLOATING STICKY BULK ACTION BAR                                           */}
      {/* ========================================================================= */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-3xl px-4 animate-in slide-in-from-bottom duration-300">
          <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-2xl border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-orange-500 text-white font-extrabold text-xs shadow-sm">
                {selectedIds.length} Dipilih
              </span>
              <span className="text-xs text-slate-300 font-medium hidden sm:inline">
                Aksi Massal Master SOP
              </span>
            </div>

            {/* Bulk Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {/* Aktifkan */}
              <button
                type="button"
                disabled={isBulkLoading}
                onClick={() => handleExecuteBulkAction('ACTIVATE')}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-emerald-600 text-white transition-colors flex items-center gap-1.5"
                title="Aktifkan butir terpilih"
              >
                <Power className="w-3.5 h-3.5 text-emerald-400" />
                <span>Aktifkan</span>
              </button>

              {/* Non-Aktif */}
              <button
                type="button"
                disabled={isBulkLoading}
                onClick={() => handleExecuteBulkAction('DEACTIVATE')}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
                title="Nonaktifkan butir terpilih"
              >
                <Power className="w-3.5 h-3.5 text-slate-400" />
                <span>Non-Aktif</span>
              </button>

              {/* Wajib Foto */}
              <button
                type="button"
                disabled={isBulkLoading}
                onClick={() => handleExecuteBulkAction('SET_PHOTO_REQUIRED')}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-amber-600 text-white transition-colors flex items-center gap-1.5"
                title="Wajibkan foto bukti"
              >
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>Wajib Foto</span>
              </button>

              {/* Foto Opsional */}
              <button
                type="button"
                disabled={isBulkLoading}
                onClick={() => handleExecuteBulkAction('SET_PHOTO_OPTIONAL')}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
                title="Jadikan foto opsional"
              >
                <CameraOff className="w-3.5 h-3.5 text-slate-400" />
                <span>Foto Opsional</span>
              </button>

              {/* Pindah Shift */}
              <button
                type="button"
                disabled={isBulkLoading}
                onClick={() => setIsBulkMoveModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-orange-600 text-white transition-colors flex items-center gap-1.5"
                title="Pindahkan shift/kategori"
              >
                <FolderInput className="w-3.5 h-3.5 text-orange-400" />
                <span>Pindah Shift</span>
              </button>

              {/* Pindah Jobdesk */}
              <button
                type="button"
                disabled={isBulkLoading}
                onClick={() => setIsBulkMoveJobdeskModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-orange-600 text-white transition-colors flex items-center gap-1.5"
                title="Pindahkan peran jobdesk"
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Pindah Jobdesk</span>
              </button>

              {/* Hapus Massal */}
              <button
                type="button"
                disabled={isBulkLoading}
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-1.5 shadow-sm"
                title="Hapus massal butir terpilih"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>

              {/* Batal Pilihan */}
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Batalkan pilihan"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BULK MOVE SHIFT CATEGORY                                           */}
      {/* ========================================================================= */}
      {isBulkMoveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-orange-100 space-y-4 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto">
              <FolderInput className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">Pindahkan Shift Massal</h3>
              <p className="text-slate-500">
                Pindahkan <span className="font-bold text-orange-600">{selectedIds.length} butir SOP</span> yang dipilih ke kategori shift:
              </p>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Pilih Kategori Tujuan:</label>
              <select
                value={targetMoveCategory}
                onChange={(e) => setTargetMoveCategory(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-800"
              >
                <option value="OPENING">Buka Toko (Opening Shift)</option>
                <option value="CLOSING">Tutup Toko (Closing Shift)</option>
                <option value="ROUTINE">Kebersihan & Rutin Harian (Mid-Shift)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkMoveModalOpen(false)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isBulkLoading}
                onClick={() => handleExecuteBulkAction('MOVE_CATEGORY', { category: targetMoveCategory })}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 shadow-sm disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {isBulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Pindahkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BULK MOVE JOBDESK                                                  */}
      {/* ========================================================================= */}
      {isBulkMoveJobdeskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-orange-100 space-y-4 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Layers className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">Pindahkan Jobdesk Massal</h3>
              <p className="text-slate-500">
                Pindahkan <span className="font-bold text-orange-600">{selectedIds.length} butir SOP</span> ke peran jobdesk:
              </p>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Pilih Peran Jobdesk Tujuan:</label>
              <select
                value={targetMoveJobdeskCode}
                onChange={(e) => setTargetMoveJobdeskCode(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-800"
              >
                <option value="GENERAL">Umum (Semua Peran)</option>
                {localJobdesks
                  .filter((j) => j.code !== 'GENERAL')
                  .map((j) => (
                    <option key={j.code} value={j.code}>
                      {j.name} ({j.code})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkMoveJobdeskModalOpen(false)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isBulkLoading}
                onClick={() => handleExecuteBulkAction('MOVE_JOBDESK', { jobdeskCode: targetMoveJobdeskCode })}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 shadow-sm disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {isBulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Terapkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BULK DELETE CONFIRMATION                                           */}
      {/* ========================================================================= */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-rose-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">Hapus {selectedIds.length} Butir SOP?</h3>
              <p className="text-xs text-slate-500">
                Apakah Anda yakin ingin menghapus <span className="font-bold text-rose-600">{selectedIds.length} butir SOP</span> sekaligus? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isBulkLoading}
                onClick={() => handleExecuteBulkAction('DELETE')}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {isBulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : `Ya, Hapus (${selectedIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH / EDIT SINGLE BUTIR SOP                                     */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-orange-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListChecks className="w-5 h-5" />
                <h3 className="font-bold text-sm">
                  {editingItem ? 'Edit Butir Master SOP' : 'Tambah Butir Master SOP Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 text-white/80"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 space-y-4 text-xs">
              {/* Kategori Shift & Peran Jobdesk */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Kategori Shift:</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-700"
                  >
                    <option value="OPENING">Buka Toko (Opening Shift)</option>
                    <option value="CLOSING">Tutup Toko (Closing Shift)</option>
                    <option value="ROUTINE">Kebersihan & Rutin Harian (Mid-Shift)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Peran / Jobdesk Tugas:</label>
                  <select
                    value={formJobdeskCode}
                    onChange={(e) => setFormJobdeskCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-700"
                  >
                    <option value="GENERAL">Umum (Semua Peran)</option>
                    {localJobdesks
                      .filter((j) => j.code !== 'GENERAL')
                      .map((j) => (
                        <option key={j.code} value={j.code}>
                          {j.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Judul SOP */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Judul / Nama Tugas SOP:</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Contoh: Periksa suhu chiller susu di bawah 4°C"
                  required
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-800 font-semibold"
                />
              </div>

              {/* Deskripsi Instruksi */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Petunjuk Pelaksanaan / Instruksi Kerja (Opsional):</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Contoh: Catat suhu pada termometer analog, bersihkan bunga es bila ada pembekuan..."
                  rows={3}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-800 placeholder:text-slate-400"
                />
              </div>

              {/* Checkbox Wajib Foto & Status Aktif */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="p-3 bg-orange-50/50 rounded-xl border border-orange-200/80 flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formPhotoRequired}
                    onChange={(e) => setFormPhotoRequired(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block text-[11px]">Wajibkan Foto Bukti</span>
                    <span className="text-[10px] text-slate-500">Staf harus mengunggah foto saat mencentang</span>
                  </div>
                </label>

                {editingItem && (
                  <label className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block text-[11px]">Status Aktif</span>
                      <span className="text-[10px] text-slate-500">Tampilkan butir ini di formulir staf</span>
                    </div>
                  </label>
                )}
              </div>

              {/* Urutan */}
              <div className="space-y-1 pt-1">
                <label className="font-bold text-slate-700">Urutan Prioritas (Sort Order):</label>
                <input
                  type="number"
                  value={formSortOrder}
                  onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 1)}
                  min={1}
                  className="w-24 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-bold text-slate-800"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl shadow-sm disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingItem ? 'Simpan Perubahan' : 'Tambah SOP'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: KELOLA PERAN JOBDESK (CRUD ADMIN UTAMA)                             */}
      {/* ========================================================================= */}
      {isJobdesksModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl border border-orange-100 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">Kelola Peran & Jobdesk Staf</h3>
                  <p className="text-[11px] text-orange-100">Kustomisasi peran tugas shift (Barista, Kasir, Kitchen, dll.)</p>
                </div>
              </div>
              <button
                onClick={() => setIsJobdesksModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
              {/* Form Tambah Jobdesk Baru */}
              <form onSubmit={handleCreateJobdesk} className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 space-y-3">
                <h4 className="font-bold text-orange-950 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-orange-600" />
                  Tambah Peran Jobdesk Baru
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Nama Peran:</label>
                    <input
                      type="text"
                      value={newJobdeskName}
                      onChange={(e) => setNewJobdeskName(e.target.value)}
                      placeholder="Contoh: Barista Espresso / Server"
                      required
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Kode Unik (Opsional):</label>
                    <input
                      type="text"
                      value={newJobdeskCode}
                      onChange={(e) => setNewJobdeskCode(e.target.value.toUpperCase())}
                      placeholder="Contoh: BARISTA_SPECIALTY"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-800 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Deskripsi Tugas (Opsional):</label>
                  <input
                    type="text"
                    value={newJobdeskDesc}
                    onChange={(e) => setNewJobdeskDesc(e.target.value)}
                    placeholder="Contoh: Menangani kalibrasi espresso, steaming susu, dan kebersihan bar kopi"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-800"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSavingJobdesk}
                    className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSavingJobdesk ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Simpan Peran Baru</span>
                  </button>
                </div>
              </form>

              {/* Daftar Jobdesk yang Ada */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Daftar Peran Jobdesk Aktif ({localJobdesks.length})
                </h4>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  {localJobdesks.map((j) => (
                    <div key={j.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-800 text-xs">{j.name}</span>
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            {j.code}
                          </span>
                          {j.code === 'GENERAL' && (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 text-amber-800">
                              Bawaan Sistem
                            </span>
                          )}
                        </div>
                        {j.description && (
                          <p className="text-[11px] text-slate-500">{j.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {j.code !== 'GENERAL' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteJobdesk(j.id, j.code)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                            title="Hapus Jobdesk"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
              <button
                type="button"
                onClick={() => setIsJobdesksModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-all"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: KONFIRMASI HAPUS SINGLE ITEM                                       */}
      {/* ========================================================================= */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-rose-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">Hapus Butir SOP?</h3>
              <p className="text-xs text-slate-500">
                Apakah Anda yakin ingin menghapus butir SOP ini dari master template? Butir ini tidak akan muncul lagi pada formulir staf.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteItem}
                disabled={isDeleting}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
