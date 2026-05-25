'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatRupiah } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import {
  Search, Plus, Edit2, Trash2, X, Save, Loader2,
  Package, History, AlertTriangle, TrendingUp, TrendingDown
} from 'lucide-react';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  stock: number;
  costPerUnit: number;
  isPackaging: boolean;
  updatedAt: Date;
}

interface Props {
  initialIngredients: Ingredient[];
}

export default function InventoryClient({ initialIngredients }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [restockIngredient, setRestockIngredient] = useState<Ingredient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ingredient | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    stock: '0',
    costPerUnit: '0',
    isPackaging: false
  });

  const [restockData, setRestockData] = useState({
    quantity: '',
    totalCost: '',
    notes: ''
  });

  const filteredIngredients = initialIngredients.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const openModal = (ingredient?: Ingredient) => {
    if (ingredient) {
      setEditingIngredient(ingredient);
      setFormData({
        name: ingredient.name,
        unit: ingredient.unit,
        stock: ingredient.stock.toString(),
        costPerUnit: ingredient.costPerUnit.toString(),
        isPackaging: ingredient.isPackaging
      });
    } else {
      setEditingIngredient(null);
      setFormData({
        name: '',
        unit: '',
        stock: '0',
        costPerUnit: '0',
        isPackaging: false
      });
    }
    setShowModal(true);
  };

  const openRestockModal = (ingredient: Ingredient) => {
    setRestockIngredient(ingredient);
    setRestockData({ quantity: '', totalCost: '', notes: '' });
    setShowRestockModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.unit) {
      showToast('Nama dan Satuan bahan wajib diisi', 'error');
      return;
    }
    setSaving(true);
    try {
      const url = editingIngredient ? `/api/admin/inventory/${editingIngredient.id}` : '/api/admin/inventory';
      const res = await fetch(url, {
        method: editingIngredient ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to save');
      setShowModal(false);
      router.refresh();
    } catch (err) {
      showToast('Gagal menyimpan bahan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRestock = async () => {
    if (!restockIngredient || !restockData.quantity || !restockData.totalCost) {
      showToast('Jumlah dan Total Biaya wajib diisi', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/inventory/restock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredientId: restockIngredient.id,
          ...restockData
        }),
      });
      if (!res.ok) throw new Error('Failed to restock');
      setShowRestockModal(false);
      router.refresh();
    } catch (err) {
      showToast('Gagal merestock bahan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/inventory/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setDeleteTarget(null);
      router.refresh();
    } catch (err) {
      showToast('Gagal menghapus bahan', 'error');
    }
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input 
            type="text" 
            placeholder="Search ingredients..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all shadow-sm" 
          />
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl gradient-brand text-white hover:opacity-90 transition-all shadow-md active:scale-[0.98] whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Add Ingredient
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-border/40 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-border/40 bg-muted/20">
              <th className="px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Item Name</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Current Stock</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Avg Cost / Unit</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Value</th>
              <th className="px-5 py-3.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {filteredIngredients.map((ing) => (
              <tr key={ing.id} className="group hover:bg-muted/10 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
                      <Package className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-foreground">{ing.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${ing.isPackaging ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {ing.isPackaging ? 'Packaging' : 'Material'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${ing.stock <= 5 ? 'text-rose-600' : 'text-foreground'}`}>
                      {ing.stock} {ing.unit}
                    </span>
                    {ing.stock <= 5 && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                  </div>
                </td>
                <td className="px-5 py-3 text-muted-foreground font-medium">
                  {formatRupiah(ing.costPerUnit)}
                </td>
                <td className="px-5 py-3 font-semibold text-brand-600">
                  {formatRupiah(ing.stock * ing.costPerUnit)}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button 
                      onClick={() => openRestockModal(ing)}
                      className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-colors"
                      title="Restock"
                    >
                      <TrendingUp className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => openModal(ing)} 
                      className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setDeleteTarget(ing)} 
                      className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredIngredients.length === 0 && (
          <div className="py-12 text-center text-muted-foreground/50">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No ingredients found</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
              <h3 className="text-base font-bold font-heading">{editingIngredient ? 'Edit Ingredient' : 'New Ingredient'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Ingredient Name *</label>
                <input 
                  value={formData.name} 
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all" 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Unit (e.g. gr, ml, pcs) *</label>
                  <input 
                    value={formData.unit} 
                    onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all" 
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Type</label>
                  <select 
                    value={formData.isPackaging ? 'true' : 'false'} 
                    onChange={e => setFormData(p => ({ ...p, isPackaging: e.target.value === 'true' }))}
                    className="w-full px-3.5 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all"
                  >
                    <option value="false">Material / Raw</option>
                    <option value="true">Packaging</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Initial Stock</label>
                  <input 
                    type="number"
                    value={formData.stock} 
                    onChange={e => setFormData(p => ({ ...p, stock: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all" 
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Cost per Unit (Avg)</label>
                  <input 
                    type="number"
                    value={formData.costPerUnit} 
                    onChange={e => setFormData(p => ({ ...p, costPerUnit: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm bg-muted/30 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all" 
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border/30 flex justify-end gap-2 bg-muted/10">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium rounded-xl hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 text-sm font-semibold rounded-xl gradient-brand text-white hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && restockIngredient && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30 bg-emerald-50/50">
              <h3 className="text-base font-bold font-heading text-emerald-800">Restock {restockIngredient.name}</h3>
              <button onClick={() => setShowRestockModal(false)} className="p-1 hover:bg-emerald-100/50 rounded-lg"><X className="w-5 h-5 text-emerald-800/50" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Quantity to Add ({restockIngredient.unit})</label>
                  <input 
                    type="number"
                    value={restockData.quantity} 
                    onChange={e => setRestockData(p => ({ ...p, quantity: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm bg-emerald-50/20 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all" 
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Total Cost (Rp)</label>
                  <input 
                    type="number"
                    value={restockData.totalCost} 
                    onChange={e => setRestockData(p => ({ ...p, totalCost: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-sm bg-emerald-50/20 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all" 
                  />
                </div>
              </div>
              {restockData.quantity && restockData.totalCost && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-1">New Average Cost Estimate</p>
                  <p className="text-sm font-semibold text-emerald-800">
                    {formatRupiah(Math.round(((restockIngredient.stock * restockIngredient.costPerUnit) + parseInt(restockData.totalCost)) / (restockIngredient.stock + parseFloat(restockData.quantity))))} / {restockIngredient.unit}
                  </p>
                </div>
              )}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Notes (Optional)</label>
                <textarea 
                  value={restockData.notes} 
                  onChange={e => setRestockData(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3.5 py-2.5 text-sm bg-emerald-50/20 border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all resize-none"
                  placeholder="e.g. Purchased from Supplier X"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border/30 flex justify-end gap-2 bg-emerald-50/10">
              <button onClick={() => setShowRestockModal(false)} className="px-4 py-2 text-sm font-medium rounded-xl hover:bg-muted transition-colors text-emerald-700">Cancel</button>
              <button onClick={handleRestock} disabled={saving}
                className="px-5 py-2 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />} Record Restock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-5 h-5 text-rose-500" />
            </div>
            <h3 className="text-base font-bold mb-1">Delete Ingredient?</h3>
            <p className="text-sm text-muted-foreground mb-5"><strong>{deleteTarget.name}</strong> will be permanently removed. This may affect recipes.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
