'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Plus, FileText, Loader2, Trash2, Edit } from 'lucide-react';
import { NotificationTemplate } from './types';

interface NotificationTemplatesTableProps {
  templates: NotificationTemplate[];
  loadingTpl: boolean;
  onAddNew: () => void;
  onEdit: (tpl: NotificationTemplate) => void;
  onDelete: (id: string) => void;
}

export function NotificationTemplatesTable({
  templates,
  loadingTpl,
  onAddNew,
  onEdit,
  onDelete,
}: NotificationTemplatesTableProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 font-medium">
          Daftar template pesan yang dikirim otomatis berdasarkan aksi pelanggan.
        </p>
        <button
          type="button"
          onClick={onAddNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-orange-300 text-orange-700 font-bold text-xs hover:bg-orange-50 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Template Baru</span>
        </button>
      </div>

      {loadingTpl ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-semibold">
            Belum ada template. Buat template pertama!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-start justify-between gap-4 shadow-xs hover:shadow-sm transition-all"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-[10px] font-extrabold uppercase tracking-wider">
                    {tpl.trigger}
                  </span>
                  {tpl.isActive ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      Nonaktif
                    </span>
                  )}
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">{tpl.title}</h4>
                <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap leading-relaxed">
                  {tpl.message}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onEdit(tpl)}
                  className="p-2 rounded-xl hover:bg-orange-50 text-slate-500 hover:text-orange-600 transition-colors cursor-pointer border border-transparent hover:border-orange-100"
                  title="Edit Template"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(tpl.id)}
                  className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer border border-transparent hover:border-rose-100"
                  title="Hapus Template"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
