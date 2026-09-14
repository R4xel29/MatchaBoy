'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Printer,
  X,
  Search,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  SlidersHorizontal,
  Layers,
} from 'lucide-react';
import type {
  ProductItem,
  CategoryItem,
  IngredientItem,
  ModifiersData,
} from './types';

interface RecipePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductItem[];
  categories: CategoryItem[];
  ingredients: IngredientItem[];
}

export function RecipePrintModal({
  isOpen,
  onClose,
  products,
  categories,
}: RecipePrintModalProps) {
  // Filter & Search states
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterWithRecipeOnly, setFilterWithRecipeOnly] = useState(true);

  // Selected Products for Print
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(() => {
    return products
      .filter((p) => p.badge !== 'archived' && (p.productIngredients || []).length > 0)
      .slice(0, 12)
      .map((p) => p.id);
  });

  // Modal active tab ('preview' or 'selector')
  const [activeTab, setActiveTab] = useState<'preview' | 'selector'>('preview');

  // Available products matching filters
  const eligibleProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.badge === 'archived') return false;
      const hasRecipe = (p.productIngredients || []).length > 0;
      if (filterWithRecipeOnly && !hasRecipe) return false;

      if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchCat = p.category?.name?.toLowerCase().includes(q);
        if (!matchName && !matchCat) return false;
      }

      return true;
    });
  }, [products, selectedCategory, searchQuery, filterWithRecipeOnly]);

  // The actual products chosen for printing
  const printProducts = useMemo(() => {
    return products.filter((p) => selectedProductIds.includes(p.id));
  }, [products, selectedProductIds]);

  // Group print products into chunks of 12 per A4 sheet
  const printPages = useMemo(() => {
    const pages: ProductItem[][] = [];
    const chunkSize = 12;
    for (let i = 0; i < printProducts.length; i += chunkSize) {
      pages.push(printProducts.slice(i, i + chunkSize));
    }
    return pages;
  }, [printProducts]);

  // Selection handlers
  const handleToggleProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const idsToAdd = eligibleProducts.map((p) => p.id);
    setSelectedProductIds((prev) => Array.from(new Set([...prev, ...idsToAdd])));
  };

  const handleSelectFirst12 = () => {
    const first12 = eligibleProducts.slice(0, 12).map((p) => p.id);
    setSelectedProductIds(first12);
  };

  // Standalone A4 HTML generator with embedded styles for high-fidelity printing
  const generateA4PrintHtml = () => {
    const pagesHtml = printPages.map((pageItems, pageIdx) => {
      const cardsHtml = pageItems.map((prod) => {
        let pMods: ModifiersData = {};
        try {
          pMods = typeof prod.modifiers === 'string' ? JSON.parse(prod.modifiers || '{}') : (prod.modifiers || {});
        } catch {}

        const isFood =
          pMods.productType === 'makanan' ||
          (prod.category?.name || '').toLowerCase().includes('makanan') ||
          (prod.category?.name || '').toLowerCase().includes('snack') ||
          (prod.category?.name || '').toLowerCase().includes('food');

        const bIngs = prod.productIngredients || [];
        const jIngs = Array.isArray(pMods.jumboRecipe) ? pMods.jumboRecipe : [];
        const sDoses = pMods.sugarDoses;
        const mDoses = pMods.matchaDoses;
        const shDoses = pMods.shotDoses;

        // Base Ingredients
        const ingsHtml = bIngs.map((bi) => {
          const jItem = jIngs.find((j) => j.ingredientId === bi.ingredientId);
          const hasJumbo = !isFood && jItem && jItem.quantity > 0;
          return `
            <div style="background: #fafaf9; border: 0.5px solid #e7e5e4; border-radius: 4px; padding: 1mm 1.6mm; font-size: 6.8pt; color: #292524; display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8mm;">
              <span style="font-weight: 700; color: #1c1917;">${bi.ingredient?.name || 'Bahan'}</span>
              <span style="font-size: 6.8pt; color: #57534e;">
                ${bi.quantity} ${bi.ingredient?.unit || ''}
                ${hasJumbo ? `<strong style="color: #ea580c; font-weight: 800; margin-left: 2mm; background: #fff7ed; padding: 0.2mm 1mm; border-radius: 2px; border: 0.5px solid #fed7aa;">Jmb: ${jItem.quantity} ${bi.ingredient?.unit || ''}</strong>` : ''}
              </span>
            </div>
          `;
        }).join('');

        // Modifiers Blocks
        let modHtml = '';
        if (!isFood) {
          let sHtml = '';
          if (sDoses && (sDoses.less > 0 || sDoses.lumayan > 0 || sDoses.manisSekali > 0)) {
            sHtml = `
              <div style="background: #fffbeb; border: 0.5px solid #fde68a; border-radius: 4px; padding: 0.8mm 1.5mm; margin-top: 1mm;">
                <div style="font-size: 5.8pt; font-weight: 800; color: #92400e; margin-bottom: 0.4mm;">GULA / MANIS:</div>
                <div style="display: flex; justify-content: space-between; font-size: 6.5pt; color: #78350f; font-weight: 700;">
                  <span>Less: ${sDoses.less}</span>
                  <span>Sedang: ${sDoses.lumayan}</span>
                  <span>Manis: ${sDoses.manisSekali}</span>
                </div>
              </div>
            `;
          }

          let mHtml = '';
          if (mDoses && (mDoses.light > 0 || mDoses.medium > 0 || mDoses.bold > 0 || mDoses.extraBold > 0)) {
            mHtml = `
              <div style="background: #f0fdf4; border: 0.5px solid #bbf7d0; border-radius: 4px; padding: 0.8mm 1.5mm; margin-top: 1mm;">
                <div style="font-size: 5.8pt; font-weight: 800; color: #166534; margin-bottom: 0.4mm;">MATCHA (BUBUK):</div>
                <div style="display: flex; justify-content: space-between; font-size: 6.2pt; color: #14532d; font-weight: 700;">
                  <span>Light: ${mDoses.light}g</span>
                  <span>Med: ${mDoses.medium}g</span>
                  <span>Bold: ${mDoses.bold}g</span>
                  <span>Ex: ${mDoses.extraBold}g</span>
                </div>
              </div>
            `;
          }

          let shHtml = '';
          if (shDoses && (shDoses.single > 0 || shDoses.double > 0 || shDoses.triple > 0)) {
            shHtml = `
              <div style="background: #fff7ed; border: 0.5px solid #fed7aa; border-radius: 4px; padding: 0.8mm 1.5mm; margin-top: 1mm;">
                <div style="font-size: 5.8pt; font-weight: 800; color: #9a3412; margin-bottom: 0.4mm;">ESPRESSO SHOT:</div>
                <div style="display: flex; justify-content: space-between; font-size: 6.2pt; color: #7c2d12; font-weight: 700;">
                  <span>Single: ${shDoses.single}</span>
                  <span>Double: ${shDoses.double}</span>
                  <span>Triple: ${shDoses.triple}</span>
                </div>
              </div>
            `;
          }

          if (sHtml || mHtml || shHtml) {
            modHtml = `<div style="border-top: 0.5px dashed #e7e5e4; padding-top: 1mm; margin-top: auto;">${sHtml}${mHtml}${shHtml}</div>`;
          }
        }

        return `
          <div style="background: #ffffff; border: 1px solid #e7e5e4; border-top: 3px solid #ea580c; border-radius: 6px; padding: 2mm; display: flex; flex-direction: column; justify-content: space-between; page-break-inside: avoid; break-inside: avoid; box-sizing: border-box; overflow: hidden; position: relative;">
            <div style="border-bottom: 0.5px solid #e7e5e4; padding-bottom: 1.2mm; margin-bottom: 1.2mm; display: flex; justify-content: space-between; align-items: flex-start; gap: 1mm;">
              <div style="font-weight: 900; font-size: 8.5pt; color: #1c1917; line-height: 1.15;">${prod.name}</div>
              <span style="font-size: 6pt; font-weight: 800; text-transform: uppercase; padding: 0.4mm 1.5mm; border-radius: 3px; background: #fff7ed; color: #c2410c; border: 0.5px solid #ffedd5; white-space: nowrap;">${prod.category?.name || 'Menu'}</span>
            </div>
            
            <div style="margin-bottom: 1mm;">
              <div style="font-size: 5.8pt; font-weight: 800; text-transform: uppercase; color: #78716c; margin-bottom: 0.6mm; display: flex; justify-content: space-between; align-items: center;">
                <span>Takaran Dasar:</span>
                ${!isFood ? `<span style="font-size: 5.5pt; color: #ea580c; font-weight: 800;">Reg 12oz • Jmb 16oz</span>` : ''}
              </div>
              ${ingsHtml || '<div style="font-style: italic; color: #a8a29e; font-size: 6.5pt;">Resep belum dikonfigurasi</div>'}
            </div>

            ${modHtml}
          </div>
        `;
      }).join('');

      const emptySlotsHtml = Array.from({ length: 12 - pageItems.length }).map(() => `
        <div style="border: 1px dashed #e7e5e4; border-radius: 6px; padding: 2mm; display: flex; align-items: center; justify-content: center; color: #d6d3d1; font-size: 7pt; font-weight: 600;">
          (Slot Resep Kosong)
        </div>
      `).join('');

      return `
        <div class="a4-print-page" style="width: 100%; height: 284mm; max-height: 284mm; page-break-after: always; break-after: page; display: flex; flex-direction: column; justify-content: space-between; padding: 0; box-sizing: border-box;">
          <!-- Sheet Header -->
          <div style="border-bottom: 2px solid #ea580c; padding-bottom: 2mm; margin-bottom: 2mm; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 2.5mm;">
              <div style="width: 28px; height: 28px; border-radius: 6px; background: linear-gradient(135deg, #f97316, #f59e0b); color: white; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 11pt;">
                AS
              </div>
              <div>
                <div style="font-size: 12pt; font-weight: 900; color: #1c1917; letter-spacing: -0.3px; line-height: 1.1;">
                  ARUM SEDUH &bull; PANDUAN TAKARAN RESEP BARISTA
                </div>
                <div style="font-size: 7.5pt; color: #78716c; font-weight: 600;">
                  Standar Resmi Meja Bar &bull; Regular (12 oz) &bull; Jumbo (16 oz) &bull; Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>
            <div style="font-size: 8pt; font-weight: 800; background: #1c1917; color: white; padding: 1mm 2.5mm; border-radius: 4px;">
              Halaman ${pageIdx + 1} dari ${printPages.length}
            </div>
          </div>

          <!-- 3x4 Grid = 12 Cards -->
          <div class="a4-print-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(4, 1fr); gap: 2.2mm; flex: 1;">
            ${cardsHtml}
            ${emptySlotsHtml}
          </div>

          <!-- Sheet Footer -->
          <div style="border-top: 1px solid #e7e5e4; padding-top: 1.5mm; margin-top: 1.5mm; font-size: 6.5pt; color: #78716c; display: flex; justify-content: space-between; align-items: center;">
            <span>Arum Seduh Official Recipe Guide &bull; Selalu gunakan timbangan digital atau jigger takar</span>
            <span>Format Standar 12 Resep / Lembar A4</span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>ARUM SEDUH - PANDUAN TAKARAN RESEP BARISTA (A4)</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 6mm 6mm 6mm 6mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              background: #ffffff;
              color: #1c1917;
            }
            .a4-print-page:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
          </style>
        </head>
        <body>
          ${pagesHtml}
        </body>
      </html>
    `;
  };

  // Dedicated Print Execution via Isolated Iframe to prevent modal backdrop clipping & POS58 printer override
  const handlePrint = () => {
    if (printProducts.length === 0) return;

    let iframe = document.getElementById('recipe-print-sheet-iframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'recipe-print-sheet-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      window.print();
      return;
    }

    const htmlContent = generateA4PrintHtml();
    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.print();
      }
    }, 250);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto bg-stone-900/70 backdrop-blur-sm">
        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="bg-white rounded-3xl w-full max-w-6xl shadow-2xl relative z-10 border border-stone-200 flex flex-col max-h-[94vh] overflow-hidden text-left"
        >
          {/* Top Bar Header */}
          <div className="p-4 sm:px-6 border-b border-stone-200/80 flex items-center justify-between bg-stone-50/80 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading font-bold text-lg sm:text-xl text-stone-900">
                    Cetak Panduan Resep & Takaran Barista (A4)
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-bold">
                    Standar 12 Resep / Lembar
                  </span>
                </div>
                <p className="text-xs text-stone-500">
                  Format lembar kerja resmi Arum Seduh untuk meja bar kasir dan dapur.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Tab Toggle: Selector vs Preview */}
              <div className="flex items-center bg-stone-200/70 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'preview'
                      ? 'bg-white text-orange-600 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Pratinjau Lembar A4</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('selector')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'selector'
                      ? 'bg-white text-orange-600 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Pilih Menu ({selectedProductIds.length})</span>
                </button>
              </div>

              {/* Print Button */}
              <button
                type="button"
                onClick={handlePrint}
                disabled={printProducts.length === 0}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / Simpan PDF</span>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Selection Status Bar */}
          <div className="px-6 py-2.5 bg-amber-50/60 border-b border-amber-200/60 flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2 text-amber-900 font-semibold">
              <Sparkles className="w-4 h-4 text-orange-600 shrink-0" />
              <span>
                <strong>{selectedProductIds.length} resep</strong> dipilih &rarr;{' '}
                <span className="text-orange-700 font-bold">
                  {printPages.length} Lembar Kertas A4
                </span>{' '}
                ({printPages.length > 0 ? `Halaman 1 s/d ${printPages.length}` : 'Belum ada menu dipilih'})
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectFirst12}
                className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-[11px] font-bold text-stone-700 transition-colors cursor-pointer"
              >
                Pilih Tepat 12 (1 Lembar)
              </button>
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-[11px] font-bold text-stone-700 transition-colors cursor-pointer"
              >
                Pilih Semua ({eligibleProducts.length})
              </button>
              {selectedProductIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedProductIds([])}
                  className="px-2.5 py-1 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg text-[11px] font-bold text-rose-700 transition-colors cursor-pointer"
                >
                  Kosongkan Pilihan
                </button>
              )}
            </div>
          </div>

          {/* Body Section */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-stone-100/70">
            {activeTab === 'selector' ? (
              /* TAB 1: PRODUCT SELECTOR & FILTER VIEW */
              <div className="space-y-4 max-w-5xl mx-auto">
                {/* Search & Category Toolbar */}
                <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari nama menu atau kategori..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>

                  {/* Category Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto w-full py-0.5">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        selectedCategory === 'all'
                          ? 'bg-stone-900 text-white shadow-xs'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      Semua Kategori
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                          selectedCategory === cat.id
                            ? 'bg-orange-600 text-white shadow-xs'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Products Grid Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {eligibleProducts.map((p) => {
                    const isSelected = selectedProductIds.includes(p.id);
                    const ingCount = (p.productIngredients || []).length;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleToggleProduct(p.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-orange-50/50 border-orange-300 ring-1 ring-orange-400 shadow-xs'
                            : 'bg-white border-stone-200/80 hover:border-stone-300 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'bg-orange-600 text-white'
                                  : 'border border-stone-300 bg-stone-50 text-transparent'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </span>
                            <span className="text-xs font-bold text-stone-900 line-clamp-1">
                              {p.name}
                            </span>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-600">
                            {p.category?.name}
                          </span>
                        </div>

                        <div className="text-[11px] text-stone-500 space-y-1">
                          <p className="flex items-center justify-between">
                            <span>Bahan Baku:</span>
                            <strong className="text-stone-700">
                              {ingCount > 0 ? `${ingCount} bahan` : 'Belum ada'}
                            </strong>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* TAB 2: A4 VISUAL PREVIEW & PAGINATION */
              <div className="space-y-6 max-w-5xl mx-auto">
                {/* Visual Tip Banner for Browser Printer Selection */}
                <div className="p-3.5 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 rounded-2xl border border-orange-200 flex items-start sm:items-center gap-3 text-xs shadow-xs text-left">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-stone-900">
                      Petunjuk Cetak Lembar Presisi Kertas A4:
                    </p>
                    <p className="text-stone-600 text-[11px] leading-relaxed mt-0.5">
                      Jika di jendela cetak browser Anda otomatis mengarah ke <strong>POS58 Printer</strong> (printer kasir struk), silakan ubah menu <strong>"Printer / Destination"</strong> di bagian atas dialog menjadi <strong>"Save as PDF"</strong> atau printer kantor A4 Anda agar hasil cetak pas di kertas A4 dan tidak mengecil ke kertas struk roll.
                    </p>
                  </div>
                </div>

                {printProducts.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-3xl border border-stone-200/80 shadow-xs">
                    <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-stone-900 mb-1">
                      Belum Ada Resep Produk yang Dipilih
                    </h3>
                    <p className="text-xs text-stone-500 mb-4 max-w-sm mx-auto">
                      Silakan klik tombol di bawah untuk memilih 12 resep pertama atau buka tab "Pilih Menu".
                    </p>
                    <button
                      type="button"
                      onClick={handleSelectFirst12}
                      className="px-4 py-2 rounded-xl bg-orange-600 text-white font-bold text-xs shadow-xs cursor-pointer"
                    >
                      Pilih 12 Resep Pertama
                    </button>
                  </div>
                ) : (
                  printPages.map((pageItems, pageIdx) => (
                    <div key={pageIdx} className="space-y-2">
                      {/* Page Marker Ribbon */}
                      <div className="flex items-center justify-between px-2 text-xs text-stone-500 font-semibold">
                        <span>
                          Lembar A4 Ke-{pageIdx + 1} ({pageItems.length} dari 12 slot resep terisi)
                        </span>
                        <span>Format: 3 Kolom &times; 4 Baris</span>
                      </div>

                      {/* Scaled Visual Sheet */}
                      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-stone-200/90 shadow-md">
                        {/* Sheet Header */}
                        <div className="pb-3 mb-3.5 border-b-2 border-orange-500 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                              AS
                            </div>
                            <div>
                              <h1 className="text-base font-heading font-black text-stone-900 tracking-tight">
                                ARUM SEDUH &bull; PANDUAN TAKARAN RESEP BARISTA
                              </h1>
                              <p className="text-[10px] text-stone-500 font-medium">
                                Standar Resmi Meja Bar &bull; Regular (12 oz) &bull; Jumbo (16 oz) &bull; Tanggal Cetak:{' '}
                                {new Date().toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="px-2.5 py-1 rounded-lg bg-stone-900 text-white text-[10px] font-black uppercase tracking-wider shadow-2xs">
                              Lembar {pageIdx + 1} / {printPages.length}
                            </span>
                          </div>
                        </div>

                        {/* 3x4 Grid of Recipe Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {pageItems.map((product) => (
                            <RecipeSheetCard key={product.id} product={product} />
                          ))}

                          {/* Empty slots placeholders if fewer than 12 on last page */}
                          {Array.from({ length: 12 - pageItems.length }).map((_, emptyIdx) => (
                            <div
                              key={`empty-${emptyIdx}`}
                              className="border border-dashed border-stone-200 rounded-2xl p-3 flex flex-col items-center justify-center text-stone-300 text-xs min-h-[140px]"
                            >
                              <Layers className="w-5 h-5 mb-1 text-stone-200" />
                              <span className="text-[10px] font-medium">Slot Resep Kosong</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3 border-t border-stone-200/80 bg-white flex items-center justify-between text-xs">
            <span className="text-stone-500 text-[11px]">
              Tip: Saat mencetak, pilih opsi kertas <strong>A4 Portrait</strong> dengan margin <strong>Minimum / 8mm</strong> untuk hasil presisi.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handlePrint}
                disabled={printProducts.length === 0}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Lembar A4</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── HIDDEN CONTAINER SPECIFICALLY TARGETED BY @media print ── */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body * {
            visibility: hidden !important;
          }
          #recipe-print-sheet-container,
          #recipe-print-sheet-container * {
            visibility: visible !important;
          }
          #recipe-print-sheet-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            display: block !important;
          }
          .a4-print-page {
            width: 100% !important;
            min-height: 275mm !important;
            max-height: 277mm !important;
            page-break-after: always !important;
            break-after: page !important;
            box-sizing: border-box !important;
            padding: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
          .a4-print-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .a4-print-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            grid-template-rows: repeat(4, 1fr) !important;
            gap: 2.2mm !important;
            flex: 1 !important;
          }
          .recipe-print-card {
            border: 1px solid #78716c !important;
            border-radius: 6px !important;
            padding: 2mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            background: white !important;
          }
        }
      `}</style>

      <div id="recipe-print-sheet-container" className="hidden print:block">
        {printPages.map((pageItems, pageIdx) => (
          <div key={`print-page-${pageIdx}`} className="a4-print-page">
            {/* Sheet Print Header */}
            <div
              style={{
                borderBottom: '2px solid #000',
                paddingBottom: '2mm',
                marginBottom: '2mm',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '13pt', fontWeight: 900, letterSpacing: '-0.3px' }}>
                  ARUM SEDUH &bull; PANDUAN TAKARAN RESEP BARISTA
                </div>
                <div style={{ fontSize: '7.5pt', color: '#57534e' }}>
                  Standar Takaran Resmi Meja Bar & Dapur &bull; Tanggal:{' '}
                  {new Date().toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
              </div>
              <div
                style={{
                  fontSize: '8pt',
                  fontWeight: 800,
                  border: '1px solid #000',
                  padding: '1mm 2.5mm',
                  borderRadius: '3px',
                }}
              >
                Halaman {pageIdx + 1} dari {printPages.length}
              </div>
            </div>

            {/* 3x4 Grid = 12 Cards */}
            <div className="a4-print-grid">
              {pageItems.map((product) => (
                <RecipeSheetCard key={`print-${product.id}`} product={product} isPrintMode={true} />
              ))}

              {/* Empty place filler cards */}
              {Array.from({ length: 12 - pageItems.length }).map((_, emptyIdx) => (
                <div
                  key={`print-empty-${emptyIdx}`}
                  className="recipe-print-card"
                  style={{
                    border: '1px dashed #d6d3d1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#a8a29e',
                    fontSize: '8pt',
                  }}
                >
                  (Slot Kosong)
                </div>
              ))}
            </div>

            {/* Sheet Print Footer */}
            <div
              style={{
                borderTop: '1px solid #d6d3d1',
                paddingTop: '1.5mm',
                marginTop: '1.5mm',
                fontSize: '6.5pt',
                color: '#78716c',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Arum Seduh Standard Recipe Sheet &bull; Selalu gunakan timbangan digital atau jigger takar</span>
              <span>1 Lembar A4 = 12 Kartu Resep</span>
            </div>
          </div>
        ))}
      </div>
    </AnimatePresence>
  );
}

/**
 * Single Recipe Card Component (used in both Preview and Print)
 */
function RecipeSheetCard({
  product,
  isPrintMode = false,
}: {
  product: ProductItem;
  isPrintMode?: boolean;
}) {
  const parsedMods = useMemo<ModifiersData>(() => {
    if (!product.modifiers) return {};
    try {
      return typeof product.modifiers === 'string'
        ? JSON.parse(product.modifiers)
        : product.modifiers;
    } catch {
      return {};
    }
  }, [product.modifiers]);

  const isFood =
    parsedMods.productType === 'makanan' ||
    product.category?.name?.toLowerCase().includes('makanan') ||
    product.category?.name?.toLowerCase().includes('snack') ||
    product.category?.name?.toLowerCase().includes('food');

  // Base Ingredients list
  const baseIngredients = product.productIngredients || [];

  // Jumbo Recipe from user's custom configuration
  const jumboIngredients = useMemo(() => {
    if (Array.isArray(parsedMods.jumboRecipe) && parsedMods.jumboRecipe.length > 0) {
      return parsedMods.jumboRecipe;
    }
    return null;
  }, [parsedMods.jumboRecipe]);

  // Sweetener dosage
  const sugarConfig = parsedMods.sugarDoses;
  const sweetenerIngredient = baseIngredients.find((bi) => {
    const n = (bi.ingredient?.name || '').toLowerCase();
    return (
      n.includes('gula') ||
      n.includes('sugar') ||
      n.includes('aren') ||
      n.includes('syrup') ||
      n.includes('fructose')
    );
  });

  const sugarDoses = useMemo(() => {
    if (isFood) return null;
    if (sugarConfig && (sugarConfig.less > 0 || sugarConfig.lumayan > 0 || sugarConfig.manisSekali > 0)) {
      return {
        unit: 'ml/gr',
        less: sugarConfig.less,
        lumayan: sugarConfig.lumayan,
        manisSekali: sugarConfig.manisSekali,
      };
    }
    if (sweetenerIngredient) {
      const q = sweetenerIngredient.quantity;
      const u = sweetenerIngredient.ingredient?.unit || 'ml';
      return {
        unit: u,
        less: Math.round(q * 0.5),
        lumayan: q,
        manisSekali: Math.round(q * 1.5),
      };
    }
    return null;
  }, [isFood, sugarConfig, sweetenerIngredient]);

  // Matcha dosage
  const matchaConfig = parsedMods.matchaDoses;
  const isMatchaDrink =
    !isFood &&
    (parsedMods.showMatcha ||
      product.name.toLowerCase().includes('matcha') ||
      product.category?.name?.toLowerCase().includes('matcha') ||
      baseIngredients.some((bi) => (bi.ingredient?.name || '').toLowerCase().includes('matcha')));

  const matchaDoses = useMemo(() => {
    if (!isMatchaDrink) return null;
    if (
      matchaConfig &&
      (matchaConfig.light > 0 ||
        matchaConfig.medium > 0 ||
        matchaConfig.bold > 0 ||
        matchaConfig.extraBold > 0)
    ) {
      return {
        unit: 'gr',
        light: matchaConfig.light,
        medium: matchaConfig.medium,
        bold: matchaConfig.bold,
        extraBold: matchaConfig.extraBold,
      };
    }
    return {
      unit: 'gr',
      light: 4,
      medium: 6,
      bold: 8,
      extraBold: 10,
    };
  }, [isMatchaDrink, matchaConfig]);

  // Espresso Shot dosage
  const shotConfig = parsedMods.shotDoses;
  const isCoffeeDrink =
    !isFood &&
    (parsedMods.showEspressoShot ||
      product.name.toLowerCase().includes('kopi') ||
      product.name.toLowerCase().includes('coffee') ||
      product.name.toLowerCase().includes('espresso') ||
      product.name.toLowerCase().includes('latte') ||
      product.name.toLowerCase().includes('americano') ||
      product.category?.name?.toLowerCase().includes('kopi') ||
      product.category?.name?.toLowerCase().includes('coffee') ||
      baseIngredients.some((bi) => (bi.ingredient?.name || '').toLowerCase().includes('espresso')));

  const shotDoses = useMemo(() => {
    if (!isCoffeeDrink) return null;
    if (shotConfig && (shotConfig.single > 0 || shotConfig.double > 0 || shotConfig.triple > 0)) {
      return {
        unit: 'ml/shot',
        single: shotConfig.single,
        double: shotConfig.double,
        triple: shotConfig.triple,
      };
    }
    return {
      unit: 'shot',
      single: '1x (30ml)',
      double: '2x (60ml)',
      triple: '3x (90ml)',
    };
  }, [isCoffeeDrink, shotConfig]);

  return (
    <div
      className={`recipe-print-card ${
        isPrintMode
          ? 'recipe-print-card'
          : 'bg-white rounded-2xl border border-stone-200/90 hover:border-orange-300 transition-all p-3.5 shadow-2xs flex flex-col justify-between text-left text-xs border-t-4 border-t-orange-500'
      }`}
      style={
        isPrintMode
          ? {
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              fontSize: '7.5pt',
              lineHeight: 1.25,
              backgroundColor: '#ffffff',
              border: '1px solid #e7e5e4',
              borderTop: '3px solid #ea580c',
              borderRadius: '6px',
              padding: '2mm',
              boxSizing: 'border-box',
              overflow: 'hidden',
              breakInside: 'avoid',
              pageBreakInside: 'avoid',
            }
          : undefined
      }
    >
      {/* 1. Header Card: Nama Menu & Kategori */}
      <div
        style={{
          borderBottom: '0.5px solid #e7e5e4',
          paddingBottom: isPrintMode ? '1.2mm' : '6px',
          marginBottom: isPrintMode ? '1.2mm' : '8px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
          <div
            className={!isPrintMode ? 'font-black text-stone-900 text-sm line-clamp-1 tracking-tight' : ''}
            style={isPrintMode ? { fontWeight: 900, fontSize: '8.5pt', color: '#1c1917', lineHeight: 1.15 } : undefined}
          >
            {product.name}
          </div>
          <span
            className={
              !isPrintMode
                ? 'px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200/80 shrink-0'
                : ''
            }
            style={
              isPrintMode
                ? {
                    fontSize: '6pt',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    padding: '0.4mm 1.5mm',
                    borderRadius: '3px',
                    backgroundColor: '#fff7ed',
                    color: '#c2410c',
                    border: '0.5px solid #ffedd5',
                    whiteSpace: 'nowrap',
                  }
                : undefined
            }
          >
            {product.category?.name || 'Menu'}
          </span>
        </div>
      </div>

      {/* 2. Bahan Baku Pokok (Base Recipe & Jumbo Recipe) */}
      <div style={{ marginBottom: isPrintMode ? '1mm' : '8px' }}>
        <div
          style={{
            fontSize: isPrintMode ? '5.8pt' : '10px',
            fontWeight: 800,
            textTransform: 'uppercase',
            color: '#78716c',
            marginBottom: isPrintMode ? '0.6mm' : '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>Takaran Dasar:</span>
          {!isFood && (
            <span
              style={{
                fontSize: isPrintMode ? '5.5pt' : '9.5px',
                color: '#ea580c',
                fontWeight: 800,
              }}
            >
              Reg (12 oz) &bull; Jumbo (16 oz)
            </span>
          )}
        </div>

        {baseIngredients.length === 0 ? (
          <div
            style={{
              fontStyle: 'italic',
              color: '#a8a29e',
              fontSize: isPrintMode ? '6.5pt' : '11px',
              padding: isPrintMode ? '1mm' : '6px',
            }}
          >
            Resep belum dikonfigurasi
          </div>
        ) : isPrintMode ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6mm' }}>
            {baseIngredients.map((bi, idx) => {
              const jItem = jumboIngredients?.find((j) => j.ingredientId === bi.ingredientId);
              const hasJumbo = !isFood && jItem && jItem.quantity > 0;
              return (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#fafaf9',
                    border: '0.5px solid #e7e5e4',
                    borderRadius: '3px',
                    padding: '0.8mm 1.4mm',
                    fontSize: '6.8pt',
                    color: '#292524',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontWeight: 700, color: '#1c1917' }}>{bi.ingredient?.name || 'Bahan'}</span>
                  <span style={{ color: '#57534e' }}>
                    {bi.quantity} {bi.ingredient?.unit || ''}
                    {hasJumbo && (
                      <strong
                        style={{
                          color: '#ea580c',
                          fontWeight: 800,
                          marginLeft: '1.5mm',
                          backgroundColor: '#fff7ed',
                          padding: '0.2mm 0.8mm',
                          borderRadius: '2px',
                          border: '0.5px solid #fed7aa',
                        }}
                      >
                        Jmb: {jItem.quantity} {bi.ingredient?.unit || ''}
                      </strong>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1">
            {baseIngredients.map((bi, idx) => {
              const jItem = jumboIngredients?.find((j) => j.ingredientId === bi.ingredientId);
              const hasJumbo = !isFood && jItem && jItem.quantity > 0;
              return (
                <div
                  key={idx}
                  className="bg-stone-50/90 border border-stone-200/70 rounded-lg px-2.5 py-1 text-[11px] text-stone-800 flex items-center justify-between"
                >
                  <span className="font-semibold text-stone-900">{bi.ingredient?.name || 'Bahan'}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-stone-600">
                      {bi.quantity} {bi.ingredient?.unit || ''}
                    </span>
                    {hasJumbo && (
                      <span className="bg-orange-50 text-orange-700 border border-orange-200/80 font-bold px-1.5 py-0.5 rounded text-[10px]">
                        Jmb: {jItem.quantity} {bi.ingredient?.unit || ''}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Matriks Takaran Modifikasi (Variasi Kemanisan, Matcha, Espresso) */}
      {!isFood && (sugarDoses || matchaDoses || shotDoses) && (
        <div
          style={{
            borderTop: '0.5px dashed #d6d3d1',
            paddingTop: isPrintMode ? '1mm' : '8px',
            marginTop: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: isPrintMode ? '0.8mm' : '6px',
          }}
        >
          {/* A. Takaran Kemanisan / Gula */}
          {sugarDoses && (
            <div
              className={!isPrintMode ? 'bg-amber-50/80 border border-amber-200 rounded-xl p-2' : ''}
              style={
                isPrintMode
                  ? {
                      backgroundColor: '#fffbeb',
                      border: '0.5px solid #fde68a',
                      borderRadius: '4px',
                      padding: '0.8mm 1.4mm',
                    }
                  : undefined
              }
            >
              <div
                className={!isPrintMode ? 'text-[10px] font-black text-amber-900 mb-1 flex items-center justify-between' : ''}
                style={
                  isPrintMode
                    ? {
                        fontSize: '5.8pt',
                        fontWeight: 800,
                        color: '#92400e',
                        marginBottom: '0.4mm',
                      }
                    : undefined
                }
              >
                <span>GULA / MANIS:</span>
                {!isPrintMode && <span className="text-[9px] font-normal text-amber-700">({sugarDoses.unit})</span>}
              </div>
              <div
                className={!isPrintMode ? 'grid grid-cols-3 gap-1 text-center text-[10px] font-bold text-amber-950' : ''}
                style={
                  isPrintMode
                    ? {
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '6.5pt',
                        color: '#78350f',
                        fontWeight: 700,
                      }
                    : undefined
                }
              >
                <div className={!isPrintMode ? 'bg-white/80 rounded py-0.5 px-1 border border-amber-100' : ''}>
                  Less: {sugarDoses.less}
                </div>
                <div className={!isPrintMode ? 'bg-white/80 rounded py-0.5 px-1 border border-amber-100' : ''}>
                  Sedang: {sugarDoses.lumayan}
                </div>
                <div className={!isPrintMode ? 'bg-white/80 rounded py-0.5 px-1 border border-amber-100' : ''}>
                  Manis: {sugarDoses.manisSekali}
                </div>
              </div>
            </div>
          )}

          {/* B. Takaran Bubuk Matcha */}
          {matchaDoses && (
            <div
              className={!isPrintMode ? 'bg-emerald-50/80 border border-emerald-200 rounded-xl p-2' : ''}
              style={
                isPrintMode
                  ? {
                      backgroundColor: '#f0fdf4',
                      border: '0.5px solid #bbf7d0',
                      borderRadius: '4px',
                      padding: '0.8mm 1.4mm',
                    }
                  : undefined
              }
            >
              <div
                className={!isPrintMode ? 'text-[10px] font-black text-emerald-900 mb-1 flex items-center justify-between' : ''}
                style={
                  isPrintMode
                    ? {
                        fontSize: '5.8pt',
                        fontWeight: 800,
                        color: '#166534',
                        marginBottom: '0.4mm',
                      }
                    : undefined
                }
              >
                <span>MATCHA (BUBUK):</span>
                {!isPrintMode && <span className="text-[9px] font-normal text-emerald-700">({matchaDoses.unit})</span>}
              </div>
              <div
                className={!isPrintMode ? 'grid grid-cols-4 gap-1 text-center text-[10px] font-bold text-emerald-950' : ''}
                style={
                  isPrintMode
                    ? {
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '6.2pt',
                        color: '#14532d',
                        fontWeight: 700,
                      }
                    : undefined
                }
              >
                <div className={!isPrintMode ? 'bg-white/80 rounded py-0.5 px-0.5 border border-emerald-100' : ''}>
                  Light: {matchaDoses.light}g
                </div>
                <div className={!isPrintMode ? 'bg-white/80 rounded py-0.5 px-0.5 border border-emerald-100' : ''}>
                  Med: {matchaDoses.medium}g
                </div>
                <div className={!isPrintMode ? 'bg-white/80 rounded py-0.5 px-0.5 border border-emerald-100' : ''}>
                  Bold: {matchaDoses.bold}g
                </div>
                <div className={!isPrintMode ? 'bg-white/80 rounded py-0.5 px-0.5 border border-emerald-100' : ''}>
                  Ex: {matchaDoses.extraBold}g
                </div>
              </div>
            </div>
          )}

          {/* C. Takaran Espresso Shot */}
          {shotDoses && (
            <div
              className={!isPrintMode ? 'bg-orange-50/80 border border-orange-200 rounded-xl p-2' : ''}
              style={
                isPrintMode
                  ? {
                      backgroundColor: '#fff7ed',
                      border: '0.5px solid #fed7aa',
                      borderRadius: '4px',
                      padding: '0.8mm 1.4mm',
                    }
                  : undefined
              }
            >
              <div
                className={!isPrintMode ? 'text-[10px] font-black text-orange-950 mb-1 flex items-center justify-between' : ''}
                style={
                  isPrintMode
                    ? {
                        fontSize: '5.8pt',
                        fontWeight: 800,
                        color: '#9a3412',
                        marginBottom: '0.4mm',
                      }
                    : undefined
                }
              >
                <span>ESPRESSO SHOT:</span>
                {!isPrintMode && <span className="text-[9px] font-normal text-orange-700">({shotDoses.unit})</span>}
              </div>
              <div
                className={!isPrintMode ? 'grid grid-cols-3 gap-1 text-center text-[10px] font-bold text-orange-950' : ''}
                style={
                  isPrintMode
                    ? {
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '6.2pt',
                        color: '#7c2d12',
                        fontWeight: 700,
                      }
                    : undefined
                }
              >
                <div className={!isPrintMode ? 'bg-white/80 rounded py-0.5 px-1 border border-orange-100' : ''}>
                  Single: {shotDoses.single}
                </div>
                <div className={!isPrintMode ? 'bg-white/80 rounded py-0.5 px-1 border border-orange-100' : ''}>
                  Double: {shotDoses.double}
                </div>
                <div className={!isPrintMode ? 'bg-white/80 rounded py-0.5 px-1 border border-orange-100' : ''}>
                  Triple: {shotDoses.triple}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
