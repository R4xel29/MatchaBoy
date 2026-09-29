'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CupSoda, Utensils, Sparkles, Layers, X, ArrowRight } from 'lucide-react';

interface ProductTypePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: 'minuman' | 'makanan' | 'combo') => void;
}

export function ProductTypePickerModal({
  isOpen,
  onClose,
  onSelectType,
}: ProductTypePickerModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 16 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200/90 overflow-hidden z-10 p-6 text-left"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-lg text-stone-900">
                Tambah Menu Baru Arum Seduh
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Pilih jenis menu untuk menyesuaikan form varian & kustomisasi secara otomatis.
              </p>
            </div>
          </div>

          {/* Selection Cards */}
          <div className="space-y-3">
            {/* 1. Minuman */}
            <button
              type="button"
              onClick={() => onSelectType('minuman')}
              className="w-full group p-4 rounded-2xl border border-stone-200/90 hover:border-orange-400 bg-stone-50/40 hover:bg-orange-50/40 transition-all flex items-center justify-between text-left shadow-xs hover:shadow-md cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
                  <CupSoda className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-sm text-stone-900 group-hover:text-orange-600 transition-colors">
                      Minuman (Beverage)
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-extrabold border border-orange-200/60">
                      Kustomisasi Lengkap
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                    Dilengkapi opsi ukuran cup, level es, kemanisan gula, takaran matcha & espresso shot.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
            </button>

            {/* 2. Makanan / Pastry */}
            <button
              type="button"
              onClick={() => onSelectType('makanan')}
              className="w-full group p-4 rounded-2xl border border-stone-200/90 hover:border-amber-400 bg-stone-50/40 hover:bg-amber-50/40 transition-all flex items-center justify-between text-left shadow-xs hover:shadow-md cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
                  <Utensils className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-stone-900 group-hover:text-amber-700 transition-colors">
                    Makanan, Pastry & Snack
                  </h4>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                    Form ringkas tanpa opsi es/gula, cocok untuk croissant, roti bakar, kue, dan makanan.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-amber-600 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
            </button>

            {/* 3. Paket Combo / Bundle */}
            <button
              type="button"
              onClick={() => onSelectType('combo')}
              className="w-full group p-4 rounded-2xl border border-stone-200/90 hover:border-orange-500 bg-stone-50/40 hover:bg-orange-50/30 transition-all flex items-center justify-between text-left shadow-xs hover:shadow-md cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-stone-900 text-amber-400 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-stone-900 group-hover:text-orange-600 transition-colors">
                    Paket Combo & Bundling
                  </h4>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                    Gabungan beberapa menu sekaligus dengan kalkulator potongan harga paket.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-orange-600 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
