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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden z-10 p-6"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-6 pt-2">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-extrabold text-xl text-stone-900">
              Pilih Tipe Produk Baru
            </h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              Sistem akan otomatis menyesuaikan opsi takaran (gula, es, matcha) sesuai jenis menu.
            </p>
          </div>

          {/* Selection Cards */}
          <div className="space-y-3">
            {/* 1. Minuman */}
            <button
              type="button"
              onClick={() => onSelectType('minuman')}
              className="w-full group p-4 rounded-2xl border-2 border-stone-100 hover:border-orange-500 bg-stone-50/50 hover:bg-orange-50/30 transition-all flex items-center justify-between text-left shadow-sm hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
                  <CupSoda className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-stone-900 group-hover:text-orange-600 transition-colors flex items-center gap-1.5">
                    Minuman (Beverage)
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-extrabold">
                      Kustomisasi Lengkap
                    </span>
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Dilengkapi pengaturan tingkat gula, es, intensitas matcha, dan espresso shot.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
            </button>

            {/* 2. Makanan / Pastry */}
            <button
              type="button"
              onClick={() => onSelectType('makanan')}
              className="w-full group p-4 rounded-2xl border-2 border-stone-100 hover:border-amber-500 bg-stone-50/50 hover:bg-amber-50/30 transition-all flex items-center justify-between text-left shadow-sm hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-700 text-white flex items-center justify-center shadow-md shadow-amber-600/20 group-hover:scale-105 transition-transform">
                  <Utensils className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-stone-900 group-hover:text-amber-700 transition-colors">
                    Makanan, Pastry & Snack
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Form simpel tanpa opsi es/gula, cocok untuk pastry, cake, cookies, dan makanan berat.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
            </button>

            {/* 3. Paket Combo / Bundle */}
            <button
              type="button"
              onClick={() => onSelectType('combo')}
              className="w-full group p-4 rounded-2xl border-2 border-stone-100 hover:border-emerald-500 bg-stone-50/50 hover:bg-emerald-50/30 transition-all flex items-center justify-between text-left shadow-sm hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-stone-900 group-hover:text-emerald-700 transition-colors">
                    Paket Combo & Bundling
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Kombinasi beberapa produk dengan kalkulator diskon bundle khusus.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
