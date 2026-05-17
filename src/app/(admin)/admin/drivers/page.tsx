'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck, Plus, X, UserPlus, Phone, Mail, Bike,
  Hash, Loader2, Check, AlertTriangle, Power, Edit, Ban, Trash2, CheckCircle2, XCircle
} from 'lucide-react';

interface Driver {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  image: string | null;
  createdAt: string;
  driverProfile: {
    isOnline: boolean;
    vehicleType: string;
    plateNumber: string;
    driverImageUrl: string | null;
    shiftStart: string | null;
    shiftEnd: string | null;
    status: string;
  } | null;
}

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Driver | null>(null);
  
  // Tabs: 'APPROVED', 'PENDING', 'SUSPENDED'
  const [activeTab, setActiveTab] = useState('APPROVED');

  // Custom Confirm Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'info'
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [form, setForm] = useState({
    name: '', email: '', phone: '', vehicleType: 'Motor', plateNumber: ''
  });

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/drivers/manage', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setDrivers(data);
      } else {
        const errData = await res.json();
        setError(errData.error || `HTTP Error: ${res.status}`);
      }
    } catch (err: any) {
      console.error(err);
      setError(`Network Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDrivers(); }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/drivers/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menambahkan kurir');

      setSuccess('Kurir berhasil ditambahkan!');
      setForm({ name: '', email: '', phone: '', vehicleType: 'Motor', plateNumber: '' });
      fetchDrivers();
      setTimeout(() => {
        setShowAddModal(false);
        setSuccess('');
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/admin/drivers/manage/${showEditModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah data kurir');

      setSuccess('Data kurir berhasil diubah!');
      fetchDrivers();
      setTimeout(() => {
        setShowEditModal(null);
        setSuccess('');
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (id: string, action: 'APPROVE' | 'REJECT' | 'SUSPEND' | 'ACTIVATE' | 'FORCE_OFFLINE' | 'DELETE') => {
    const executeAction = async () => {
      setConfirmModal(prev => ({ ...prev, isLoading: true }));
      try {
        if (action === 'DELETE') {
          const res = await fetch(`/api/admin/drivers/manage/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Gagal menghapus kurir');
        } else {
          const payload: any = {};
          if (action === 'APPROVE') payload.status = 'APPROVED';
          if (action === 'REJECT') payload.status = 'SUSPENDED';
          if (action === 'SUSPEND') payload.status = 'SUSPENDED';
          if (action === 'ACTIVATE') payload.status = 'APPROVED';
          if (action === 'FORCE_OFFLINE') payload.isOnline = false;

          const res = await fetch(`/api/admin/drivers/manage/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error('Gagal melakukan aksi pada kurir');
        }
        fetchDrivers();
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'info' });
      } catch (err: any) {
        alert(err.message);
        setConfirmModal(prev => ({ ...prev, isLoading: false }));
      }
    };

    let title = 'Konfirmasi Aksi';
    let message = 'Apakah Anda yakin ingin melakukan aksi ini?';
    let variant: 'danger' | 'warning' | 'info' = 'info';

    if (action === 'DELETE') {
      title = 'Hapus Kurir';
      message = 'Akun kurir akan dihapus permanen. Aksi ini tidak dapat dibatalkan.';
      variant = 'danger';
    } else if (action === 'SUSPEND') {
      title = 'Nonaktifkan Kurir';
      message = 'Kurir tidak akan bisa mengambil pesanan untuk sementara.';
      variant = 'warning';
    } else if (action === 'APPROVE') {
      title = 'Terima Kurir';
      message = 'Terima pendaftaran kurir ini agar bisa mulai bekerja.';
      variant = 'info';
    } else if (action === 'FORCE_OFFLINE') {
      title = 'Paksa Offline';
      message = 'Kurir akan dipaksa offline dari sistem.';
      variant = 'warning';
    }

    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: executeAction,
      variant,
      isLoading: false
    });
  };

  const openEditModal = (driver: Driver) => {
    setForm({
      name: driver.name || '',
      email: driver.email || '',
      phone: driver.phone || '',
      vehicleType: driver.driverProfile?.vehicleType || 'Motor',
      plateNumber: driver.driverProfile?.plateNumber || ''
    });
    setShowEditModal(driver);
  };

  // Filter drivers based on tabs
  const filteredDrivers = drivers.filter(d => d.driverProfile?.status === activeTab || (!d.driverProfile?.status && activeTab === 'APPROVED'));
  const pendingCount = drivers.filter(d => d.driverProfile?.status === 'PENDING').length;

  if (loading && drivers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600 mb-3" />
        <p className="text-sm text-muted-foreground">Memuat data kurir...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && !showAddModal && !showEditModal && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm">Gagal memuat data</h3>
            <p className="text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">Kelola Kurir</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Tambah dan kelola akun kurir pengantaran</p>
        </div>
        <button
          onClick={() => {
            setForm({ name: '', email: '', phone: '', vehicleType: 'Motor', plateNumber: '' });
            setShowAddModal(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 text-white text-sm font-semibold shadow-md shadow-sky-600/20 hover:shadow-lg hover:shadow-sky-600/30 transition-all active:scale-[0.97]"
        >
          <Plus className="w-4 h-4" />
          Tambah Kurir
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100/50 p-1 rounded-xl w-full max-w-md">
        {[
          { id: 'APPROVED', label: 'Aktif' },
          { id: 'PENDING', label: `Pending ${pendingCount > 0 ? `(${pendingCount})` : ''}` },
          { id: 'SUSPENDED', label: 'Nonaktif' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-white text-sky-700 shadow-sm border border-black/5'
                : 'text-gray-500 hover:text-gray-700 hover:bg-black/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Drivers Grid */}
      {filteredDrivers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          <Truck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">Belum ada kurir di kategori ini</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDrivers.map((driver) => (
            <motion.div
              key={driver.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-border/40 shadow-sm overflow-hidden flex flex-col"
            >
              <div className="p-5 flex-1">
                <div className="flex items-start gap-3 mb-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center shrink-0 border border-sky-100 overflow-hidden">
                    {driver.driverProfile?.driverImageUrl || driver.image ? (
                      <img 
                        src={driver.driverProfile?.driverImageUrl || driver.image || ''} 
                        alt={driver.name || ''} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <Truck className="w-5 h-5 text-sky-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-foreground truncate">{driver.name || 'Tanpa Nama'}</h3>
                    <p className="text-xs text-muted-foreground truncate">{driver.email}</p>
                  </div>
                  {/* Status Indicator */}
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold ${
                    driver.driverProfile?.status === 'SUSPENDED' 
                      ? 'bg-red-50 text-red-700' 
                      : driver.driverProfile?.status === 'PENDING'
                      ? 'bg-amber-50 text-amber-700'
                      : driver.driverProfile?.isOnline 
                      ? 'bg-emerald-50 text-emerald-700' 
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Power className="w-3 h-3" />
                    {driver.driverProfile?.status === 'SUSPENDED' ? 'Suspended' 
                      : driver.driverProfile?.status === 'PENDING' ? 'Pending'
                      : driver.driverProfile?.isOnline ? 'Online' : 'Offline'}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2">
                  {driver.phone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{driver.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Bike className="w-3.5 h-3.5 shrink-0" />
                    <span>{driver.driverProfile?.vehicleType || 'Motor'}</span>
                  </div>
                  {driver.driverProfile?.plateNumber && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Hash className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200 text-[10px]">
                        {driver.driverProfile.plateNumber}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-3 py-3 bg-gray-50/50 border-t border-border/30 flex items-center justify-end gap-2 flex-wrap">
                {activeTab === 'PENDING' && (
                  <>
                    <button onClick={() => handleAction(driver.id, 'APPROVE')} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-200 transition-colors flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Terima
                    </button>
                    <button onClick={() => handleAction(driver.id, 'DELETE')} className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-200 transition-colors flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Tolak
                    </button>
                  </>
                )}
                {activeTab === 'APPROVED' && (
                  <>
                    <button onClick={() => openEditModal(driver)} className="p-1.5 text-gray-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors" title="Edit">
                      <Edit className="w-4 h-4" />
                    </button>
                    {driver.driverProfile?.isOnline && (
                      <button onClick={() => handleAction(driver.id, 'FORCE_OFFLINE')} className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Force Offline">
                        <Power className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => handleAction(driver.id, 'SUSPEND')} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Suspend">
                      <Ban className="w-4 h-4" />
                    </button>
                  </>
                )}
                {activeTab === 'SUSPENDED' && (
                  <>
                    <button onClick={() => handleAction(driver.id, 'ACTIVATE')} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-200 transition-colors flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Aktifkan
                    </button>
                    <button onClick={() => handleAction(driver.id, 'DELETE')} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto" title="Hapus Permanen">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add / Edit Driver Modal */}
      <AnimatePresence>
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 sticky top-0 bg-white/90 backdrop-blur z-10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center">
                    <UserPlus className="w-4 h-4 text-sky-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">
                      {showAddModal ? 'Tambah Kurir Baru' : 'Edit Kurir'}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      {showAddModal ? 'Masukkan data kurir untuk mendaftarkan' : 'Perbarui informasi kurir'}
                    </p>
                  </div>
                </div>
                <button onClick={() => { setShowAddModal(false); setShowEditModal(null); setError(''); setSuccess(''); }}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={showAddModal ? handleAddSubmit : handleEditSubmit} className="p-6 space-y-4">
                {/* Name */}
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">Nama Lengkap *</label>
                  <input
                    type="text" required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Nama kurir"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                  />
                </div>

                {/* Email (Disabled on Edit) */}
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> Email *</span>
                  </label>
                  <input
                    type="email" required
                    disabled={!!showEditModal}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="kurir@email.com"
                    className={`w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 ${showEditModal ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-card'}`}
                  />
                  {!showEditModal && <p className="text-[10px] text-muted-foreground mt-1">Kurir bisa login Google pakai email ini</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> No. Telepon</span>
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                  />
                </div>

                {/* Vehicle */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1.5 block">Jenis Kendaraan</label>
                    <input
                      type="text"
                      value={form.vehicleType}
                      onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
                      placeholder="Honda Vario"
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1.5 block">Plat Nomor</label>
                    <input
                      type="text"
                      value={form.plateNumber}
                      onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
                      placeholder="B 1234 XYZ"
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Error / Success */}
                {error && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}
                {success && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
                    <Check className="w-4 h-4 shrink-0" />
                    {success}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 text-white font-bold text-sm shadow-md shadow-sky-600/20 hover:shadow-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2 mt-4"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
                  ) : (
                    <><Check className="w-4 h-4" /> Simpan Data</>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20"
            >
              <div className="p-8 text-center">
                <div className={`w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center ${
                  confirmModal.variant === 'danger' ? 'bg-red-50 text-red-600' :
                  confirmModal.variant === 'warning' ? 'bg-amber-50 text-amber-600' :
                  'bg-sky-50 text-sky-600'
                }`}>
                  {confirmModal.variant === 'danger' ? <Trash2 className="w-8 h-8" /> :
                   confirmModal.variant === 'warning' ? <AlertTriangle className="w-8 h-8" /> :
                   <CheckCircle2 className="w-8 h-8" />}
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2">{confirmModal.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>

              <div className="p-6 bg-gray-50/80 flex gap-3">
                <button
                  disabled={confirmModal.isLoading}
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-3 rounded-2xl bg-white border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  disabled={confirmModal.isLoading}
                  onClick={confirmModal.onConfirm}
                  className={`flex-1 py-3 rounded-2xl text-white text-sm font-bold shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 ${
                    confirmModal.variant === 'danger' ? 'bg-gradient-to-r from-red-600 to-rose-500 shadow-red-500/20' :
                    confirmModal.variant === 'warning' ? 'bg-gradient-to-r from-amber-600 to-orange-500 shadow-amber-500/20' :
                    'bg-gradient-to-r from-sky-600 to-blue-500 shadow-sky-500/20'
                  }`}
                >
                  {confirmModal.isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Ya, Lanjutkan'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
