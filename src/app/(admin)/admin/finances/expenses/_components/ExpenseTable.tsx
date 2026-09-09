'use client';

import { Edit2, Trash2, Receipt } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { Expense, CATEGORIES } from './types';

interface Props {
  expenses: Expense[];
  onEdit: (exp: Expense) => void;
  onDelete: (exp: Expense) => void;
}

export function ExpenseTable({ expenses, onEdit, onDelete }: Props) {
  const getCategoryBadge = (catVal: string) => {
    const found = CATEGORIES.find(c => c.value === catVal);
    if (!found) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-slate-100 text-slate-700 border-slate-200">
          {catVal}
        </span>
      );
    }
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${found.color}`}>
        {found.label}
      </span>
    );
  };

  return (
    <div className="bg-white border border-slate-150/80 rounded-3xl shadow-xs overflow-hidden overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-slate-150 bg-slate-50/70">
            <th className="px-5 py-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Tanggal</th>
            <th className="px-5 py-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Nama Pengeluaran</th>
            <th className="px-5 py-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Kategori</th>
            <th className="px-5 py-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Nominal</th>
            <th className="px-5 py-3.5 text-right text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {expenses.map((exp) => (
            <tr key={exp.id} className="group hover:bg-slate-50/70 transition-colors">
              <td className="px-5 py-3 text-slate-500 font-medium text-xs whitespace-nowrap">
                {new Date(exp.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
              </td>
              <td className="px-5 py-3">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">{exp.name}</span>
                  {exp.notes && <span className="text-[11px] text-slate-400 line-clamp-1">{exp.notes}</span>}
                </div>
              </td>
              <td className="px-5 py-3 whitespace-nowrap">
                {getCategoryBadge(exp.category)}
              </td>
              <td className="px-5 py-3 font-black text-rose-600 text-xs sm:text-sm whitespace-nowrap">
                {formatRupiah(exp.amount)}
              </td>
              <td className="px-5 py-3 text-right whitespace-nowrap">
                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onEdit(exp)} 
                    className="p-1.5 hover:bg-blue-50 rounded-xl text-blue-600 transition-colors cursor-pointer"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onDelete(exp)} 
                    className="p-1.5 hover:bg-rose-50 rounded-xl text-rose-600 transition-colors cursor-pointer"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {expenses.length === 0 && (
        <div className="py-12 text-center text-slate-400">
          <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
          <p className="text-xs font-semibold">Tidak ada pengeluaran yang ditemukan</p>
        </div>
      )}
    </div>
  );
}
