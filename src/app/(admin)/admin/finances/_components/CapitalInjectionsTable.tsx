'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Banknote, QrCode } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { Pagination } from '@/components/ui/Pagination';
import { CapitalInjectionItem } from '@/components/admin/finances/InjectCapitalModal';

interface Props {
  injections: CapitalInjectionItem[];
  onAddNew: () => void;
  onEdit: (inj: CapitalInjectionItem) => void;
  onDelete: (inj: CapitalInjectionItem) => void;
}

export function CapitalInjectionsTable({
  injections,
  onAddNew,
  onEdit,
  onDelete,
}: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const totalPages = Math.ceil(injections.length / pageSize) || 1;
  const paginatedInjections = injections.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">
            Riwayat Suntikan Modal & Penyesuaian Dana
          </h3>
          <p className="text-xs text-slate-500">
            Daftar modal awal kas fisik, modal rekening QRIS, dan suntikan dana tambahan oleh owner
          </p>
        </div>

        <button
          onClick={onAddNew}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Suntik Modal Baru</span>
        </button>
      </div>

      <div className="bg-white border border-slate-150/80 rounded-3xl shadow-xs overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-slate-150 bg-slate-50/80 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              <th className="px-5 py-3.5">Tanggal</th>
              <th className="px-5 py-3.5">Nama Transaksi</th>
              <th className="px-5 py-3.5">Target Saldo</th>
              <th className="px-5 py-3.5">Kategori</th>
              <th className="px-5 py-3.5 text-right">Nominal</th>
              <th className="px-5 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {injections.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-400">
                  Belum ada data suntikan modal.
                </td>
              </tr>
            ) : (
              paginatedInjections.map((inj) => (
                <tr key={inj.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5 text-xs text-slate-500 font-medium whitespace-nowrap">
                    {new Date(inj.date).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">
                        {inj.name}
                      </span>
                      {inj.notes && (
                        <span className="text-[11px] text-slate-400">{inj.notes}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    {inj.paymentMethod === 'CASH' ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                        <Banknote className="w-3 h-3 text-amber-600" /> Kas Tunai (Laci)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-sky-50 text-sky-800 border border-sky-200 inline-flex items-center gap-1">
                        <QrCode className="w-3 h-3 text-sky-600" /> QRIS (Rekening)
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-600 font-medium whitespace-nowrap">
                    {inj.category === 'INITIAL_BALANCE'
                      ? 'Modal Awal'
                      : inj.category === 'OWNER_LOAN'
                      ? 'Talangan Owner'
                      : inj.category === 'WITHDRAWAL'
                      ? 'Penarikan Modal / Prive'
                      : 'Suntikan Modal'}
                  </td>
                  <td className="px-5 py-3.5 text-right font-black text-xs whitespace-nowrap">
                    <span
                      className={inj.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}
                    >
                      {inj.amount >= 0 ? '+ ' : '- '}
                      {formatRupiah(Math.abs(inj.amount))}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onEdit(inj)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(inj)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {injections.length > 0 && (
          <div className="p-4 border-t border-slate-150 bg-slate-50/50">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={injections.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
