'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Printer,
  Receipt,
  Coffee,
  Check,
  Share2,
  Copy,
  Wifi,
  Sparkles,
  ChevronRight,
  Info,
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import Image from 'next/image';

export interface ReceiptData {
  id: string;
  orderNumber?: string;
  queueNumber?: string | null;
  customerName: string;
  customerPhone?: string;
  orderType: string;
  tableNumber?: string | null;
  paymentMethod: string;
  createdAt: string | Date;
  items: Array<{
    id?: string;
    name: string;
    qty: number;
    price: number;
    totalPrice?: number;
    iceLevel?: string;
    sugarLevel?: string;
    matchaLevel?: number;
    size?: string;
    shotName?: string;
    addOns?: Array<{ name: string; price: number }>;
    modifiersString?: string;
    bundleSelections?: Array<{ groupName?: string; productName?: string }>;
  }>;
  subtotal: number;
  discount?: number;
  tumblerDiscount?: number;
  voucherDiscount?: number;
  total: number;
  cashPaid?: number;
  change?: number;
  pointsEarned?: number;
  totalPoints?: number;
  notes?: string;
}

interface ReceiptSettingsState {
  storeName: string;
  tagline: string;
  address: string;
  phone: string;
  headerNotes: string;
  footerNotes: string;
  showLogo: boolean;
  logoUrl: string | null;
  showWifi: boolean;
  wifiSsid: string;
  wifiPassword: string;
  showSocial: boolean;
  instagram: string;
  tiktok: string;
  showOrderQr: boolean;
  paperWidth: string;
}

const DEFAULT_SETTINGS: ReceiptSettingsState = {
  storeName: 'Arum Seduh',
  tagline: 'Kopi & Seduhan Istimewa',
  address: 'Jl. Sukajadi No. 88, Bandung',
  phone: '0812-3456-7890',
  headerNotes: '',
  footerNotes: 'Terima kasih atas kunjungan Anda!\nSelamat menikmati seduhan kami.',
  showLogo: true,
  logoUrl: null,
  showWifi: true,
  wifiSsid: 'ArumSeduh_Free',
  wifiPassword: 'seduhkopi123',
  showSocial: true,
  instagram: '@arumseduh.id',
  tiktok: '@arumseduh',
  showOrderQr: false,
  paperWidth: '58mm',
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: ReceiptData | null;
  customSettings?: ReceiptSettingsState;
}

export function ThermalReceiptModal({ isOpen, onClose, order, customSettings }: Props) {
  const [activeTab, setActiveTab] = useState<'customer' | 'kitchen'>('customer');
  const [settings, setSettings] = useState<ReceiptSettingsState>(customSettings || DEFAULT_SETTINGS);
  const [copied, setCopied] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (customSettings) {
      setSettings(customSettings);
    } else {
      fetch('/api/admin/receipt-settings')
        .then((res) => res.json())
        .then((data) => {
          if (data && !data.error) {
            setSettings({
              storeName: data.storeName || 'Arum Seduh',
              tagline: data.tagline || 'Kopi & Seduhan Istimewa',
              address: data.address || '',
              phone: data.phone || '',
              headerNotes: data.headerNotes || '',
              footerNotes: data.footerNotes || '',
              showLogo: data.showLogo ?? true,
              logoUrl: data.logoUrl || null,
              showWifi: data.showWifi ?? true,
              wifiSsid: data.wifiSsid || '',
              wifiPassword: data.wifiPassword || '',
              showSocial: data.showSocial ?? true,
              instagram: data.instagram || '',
              tiktok: data.tiktok || '',
              showOrderQr: data.showOrderQr ?? false,
              paperWidth: data.paperWidth || '58mm',
            });
          }
        })
        .catch(() => {});
    }
  }, [customSettings]);

  if (!isOpen || !order) return null;

  const orderDate = new Date(order.createdAt);
  const formattedDate = orderDate.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const formattedTime = orderDate.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalDiscount = (order.discount || 0) + (order.tumblerDiscount || 0) + (order.voucherDiscount || 0);
  const orderIdShort = order.id.slice(0, 8).toUpperCase();

  const handlePrint = () => {
    const printableElement = document.getElementById('printable-thermal-receipt');
    if (!printableElement) {
      window.print();
      return;
    }

    // Use hidden iframe to isolate the exact receipt and prevent viewport clipping
    let iframe = document.getElementById('thermal-print-iframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'thermal-print-iframe';
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

    const printableHtml = printableElement.innerHTML;
    const is80mm = settings.paperWidth === '80mm';
    const widthMm = is80mm ? '72mm' : '48mm';
    const pageMm = is80mm ? '80mm' : '58mm';

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Struk ${settings.storeName}</title>
          <style>
            @page {
              size: ${pageMm} auto;
              margin: 0mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            html, body {
              width: ${pageMm};
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #000000;
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              line-height: 1.35;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .receipt-wrapper {
              width: ${widthMm};
              margin: 0 auto;
              padding: 2mm 0 10mm 0;
            }
            img {
              max-width: 100%;
              height: auto;
              filter: grayscale(100%) contrast(200%);
              display: block;
              margin: 0 auto;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .font-semibold { font-weight: 600; }
            .font-extrabold { font-weight: 800; }
            .uppercase { text-transform: uppercase; }
            .border-b { border-bottom: 1px dashed #000; }
            .border-b-2 { border-bottom: 2px solid #000; }
            .border-t { border-top: 1px dashed #000; }
            .border-dashed { border-style: dashed; }
            .py-2 { padding-top: 6px; padding-bottom: 6px; }
            .py-1 { padding-top: 3px; padding-bottom: 3px; }
            .py-1\\.5 { padding-top: 4px; padding-bottom: 4px; }
            .py-3 { padding-top: 8px; padding-bottom: 8px; }
            .pt-0\\.5 { padding-top: 2px; }
            .pt-1 { padding-top: 3px; }
            .pt-2 { padding-top: 6px; }
            .pb-2 { padding-bottom: 6px; }
            .pl-3 { padding-left: 10px; }
            .pl-4 { padding-left: 12px; }
            .pl-6 { padding-left: 16px; }
            .space-y-0\\.5 > * + * { margin-top: 2px; }
            .space-y-1 > * + * { margin-top: 4px; }
            .space-y-2 > * + * { margin-top: 7px; }
            .space-y-3 > * + * { margin-top: 10px; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .items-start { align-items: flex-start; }
            .items-center { align-items: center; }
            .flex-1 { flex: 1 1 0%; }
            .shrink-0 { flex-shrink: 0; }
            .text-\\[9px\\] { font-size: 9px; }
            .text-\\[9\\.5px\\] { font-size: 9.5px; }
            .text-\\[10px\\] { font-size: 10px; }
            .text-\\[11px\\] { font-size: 11px; }
            .text-\\[12px\\] { font-size: 12px; }
            .text-xs { font-size: 10.5px; }
            .text-sm { font-size: 12px; }
            .text-base { font-size: 14px; }
            .whitespace-pre-line { white-space: pre-line; }
          </style>
        </head>
        <body>
          <div class="receipt-wrapper">
            ${printableHtml}
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        window.print();
      }
    }, 300);
  };

  const handleCopyText = () => {
    let receiptText = `================================\n`;
    receiptText += `           ${settings.storeName.toUpperCase()}\n`;
    if (settings.tagline) receiptText += `     ${settings.tagline}\n`;
    if (settings.address) receiptText += `  ${settings.address}\n`;
    if (settings.phone) receiptText += `      WA: ${settings.phone}\n`;
    receiptText += `================================\n`;
    receiptText += `Order ID  : #${orderIdShort}\n`;
    receiptText += `Waktu     : ${formattedDate} ${formattedTime}\n`;
    receiptText += `Tipe      : ${order.orderType} ${order.tableNumber ? `(Meja ${order.tableNumber})` : ''}\n`;
    receiptText += `Pelanggan : ${order.customerName}\n`;
    receiptText += `--------------------------------\n`;
    order.items.forEach((item) => {
      receiptText += `${item.qty}x ${item.name.padEnd(18)} ${formatRupiah(item.price * item.qty).padStart(10)}\n`;
      if (item.iceLevel) receiptText += `   * Es: ${item.iceLevel}\n`;
      if (item.sugarLevel) receiptText += `   * Gula: ${item.sugarLevel}\n`;
      if (item.size) receiptText += `   * Ukuran: ${item.size}\n`;
      if (item.shotName) receiptText += `   * Espresso: ${item.shotName}\n`;
      if (item.addOns && item.addOns.length > 0) {
        item.addOns.forEach((a) => {
          receiptText += `   * ${a.name} (+${formatRupiah(a.price)})\n`;
        });
      }
    });
    receiptText += `--------------------------------\n`;
    receiptText += `Subtotal                ${formatRupiah(order.subtotal).padStart(10)}\n`;
    if (totalDiscount > 0) {
      receiptText += `Diskon                 -${formatRupiah(totalDiscount).padStart(10)}\n`;
    }
    receiptText += `TOTAL AKHIR             ${formatRupiah(order.total).padStart(10)}\n`;
    receiptText += `METODE: ${order.paymentMethod.padEnd(12)} ${formatRupiah(order.total).padStart(10)}\n`;
    if (order.cashPaid) {
      receiptText += `DITERIMA                ${formatRupiah(order.cashPaid).padStart(10)}\n`;
      receiptText += `KEMBALIAN               ${formatRupiah(order.change || 0).padStart(10)}\n`;
    }
    receiptText += `================================\n`;
    if (settings.showWifi && settings.wifiSsid) {
      receiptText += `Wi-Fi: ${settings.wifiSsid} | Pass: ${settings.wifiPassword}\n`;
      receiptText += `--------------------------------\n`;
    }
    if (settings.footerNotes) {
      receiptText += `${settings.footerNotes}\n`;
    }
    if (settings.showSocial && settings.instagram) {
      receiptText += `Instagram: ${settings.instagram}\n`;
    }
    receiptText += `================================\n`;

    navigator.clipboard.writeText(receiptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]"
        >
          {/* Header Modal */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">Cetak Struk Transaksi</h3>
                <p className="text-[11px] text-slate-500 font-mono">Format Thermal {settings.paperWidth} (Algoo AT-5805)</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-slate-200/70 text-slate-500 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Selector */}
          <div className="px-5 pt-3 pb-2 flex gap-2 border-b border-slate-100 bg-white">
            <button
              onClick={() => setActiveTab('customer')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'customer'
                  ? 'bg-orange-50 text-orange-600 border border-orange-200 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              Struk Kasir (Pelanggan)
            </button>
            <button
              onClick={() => setActiveTab('kitchen')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'kitchen'
                  ? 'bg-orange-50 text-orange-600 border border-orange-200 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              Struk Dapur / Barista
            </button>
          </div>

          {/* Scrollable Receipt Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 flex justify-center">
            {/* The Actual Printable Thermal Paper Simulation */}
            <div
              id="printable-thermal-receipt"
              ref={receiptRef}
              className={`w-full max-w-[320px] bg-white p-4 sm:p-5 rounded-lg shadow-md border border-slate-200 text-slate-900 font-mono text-[11px] leading-relaxed transition-all`}
              style={{
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.05))',
              }}
            >
              {activeTab === 'customer' ? (
                /* ================= CUSTOMER RECEIPT ================= */
                <div>
                  {/* Store Logo */}
                  {settings.showLogo && settings.logoUrl && (
                    <div className="flex justify-center mb-2">
                      <img
                        src={settings.logoUrl}
                        alt="Logo Struk"
                        className="max-h-12 max-w-[140px] object-contain grayscale contrast-200"
                      />
                    </div>
                  )}

                  {/* Header */}
                  <div className="text-center pb-2 border-b border-dashed border-slate-400">
                    <h2 className="font-bold text-sm tracking-wider uppercase">{settings.storeName}</h2>
                    {settings.tagline && <p className="text-[10px] text-slate-600">{settings.tagline}</p>}
                    {settings.address && <p className="text-[10px] text-slate-600 mt-0.5">{settings.address}</p>}
                    {settings.phone && <p className="text-[10px] text-slate-600">WA: {settings.phone}</p>}
                    {settings.headerNotes && (
                      <p className="text-[10px] italic text-slate-500 mt-1 whitespace-pre-line">{settings.headerNotes}</p>
                    )}
                  </div>

                  {/* Order Metadata */}
                  <div className="py-2 border-b border-dashed border-slate-400 space-y-0.5 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-slate-600">No. Order:</span>
                      <span className="font-bold">#{orderIdShort}</span>
                    </div>
                    {order.queueNumber && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">No. Antrian:</span>
                        <span className="font-bold text-xs bg-slate-100 px-1 rounded">A-{order.queueNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-600">Waktu:</span>
                      <span>{formattedDate} {formattedTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Tipe:</span>
                      <span className="font-semibold">
                        {order.orderType === 'DINE_IN' ? `DINE IN ${order.tableNumber ? `(Meja ${order.tableNumber})` : ''}` : order.orderType}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Pelanggan:</span>
                      <span className="font-semibold truncate max-w-[140px]">{order.customerName}</span>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="py-2 border-b border-dashed border-slate-400 space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex justify-between items-start">
                          <span className="font-bold flex-1 pr-2">
                            {item.qty}x {item.name}
                          </span>
                          <span className="font-semibold shrink-0">
                            {formatRupiah((item.totalPrice || item.price) * item.qty)}
                          </span>
                        </div>
                        {/* Modifiers breakdown */}
                        <div className="pl-4 text-[9.5px] text-slate-600 space-y-0.5">
                          {item.sugarLevel && <div>- Gula: {item.sugarLevel}</div>}
                          {item.iceLevel && <div>- Es: {item.iceLevel}</div>}
                          {item.matchaLevel !== undefined && item.matchaLevel > 0 && (
                            <div>- Level Matcha: Level {item.matchaLevel}</div>
                          )}
                          {item.size && <div>- Ukuran: {item.size}</div>}
                          {item.shotName && <div>- Shot: {item.shotName}</div>}
                          {item.addOns && item.addOns.length > 0 && (
                            item.addOns.map((addon, aIdx) => (
                              <div key={aIdx}>- {addon.name} (+{formatRupiah(addon.price)})</div>
                            ))
                          )}
                          {item.bundleSelections && item.bundleSelections.length > 0 && (
                            item.bundleSelections.map((bundle, bIdx) => (
                              <div key={bIdx}>* {bundle.productName || bundle.groupName}</div>
                            ))
                          )}
                          {item.modifiersString && !item.sugarLevel && !item.iceLevel && (
                            <div>- {item.modifiersString}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[10px]">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatRupiah(order.subtotal)}</span>
                    </div>
                    {totalDiscount > 0 && (
                      <div className="flex justify-between text-slate-700">
                        <span>Diskon / Promo</span>
                        <span>-{formatRupiah(totalDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-[12px] pt-1 border-t border-slate-300">
                      <span>TOTAL</span>
                      <span>{formatRupiah(order.total)}</span>
                    </div>
                    <div className="flex justify-between pt-0.5">
                      <span>Metode ({order.paymentMethod})</span>
                      <span>{formatRupiah(order.total)}</span>
                    </div>
                    {order.cashPaid !== undefined && order.cashPaid > 0 && (
                      <>
                        <div className="flex justify-between text-slate-600">
                          <span>Tunai Diterima</span>
                          <span>{formatRupiah(order.cashPaid)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-slate-800">
                          <span>Kembalian</span>
                          <span>{formatRupiah(order.change || 0)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Loyalty Points Info */}
                  {order.pointsEarned && order.pointsEarned > 0 ? (
                    <div className="py-1.5 border-b border-dashed border-slate-400 text-center text-[10px]">
                      <span className="font-semibold text-slate-800">
                        Poin Didapat: +{order.pointsEarned} Poin
                      </span>
                      {order.totalPoints ? (
                        <div className="text-[9px] text-slate-500">Total Poin Akun: {order.totalPoints} Poin</div>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Extra Store Info (Wi-Fi) */}
                  {settings.showWifi && settings.wifiSsid && (
                    <div className="py-1.5 border-b border-dashed border-slate-400 text-center text-[9.5px] text-slate-600">
                      <div>Wi-Fi: <span className="font-bold">{settings.wifiSsid}</span></div>
                      {settings.wifiPassword && (
                        <div>Password: <span className="font-mono font-bold">{settings.wifiPassword}</span></div>
                      )}
                    </div>
                  )}

                  {/* Footer Greetings & Social Media */}
                  <div className="pt-2 text-center text-[9.5px] text-slate-600 space-y-1">
                    {settings.footerNotes && (
                      <p className="whitespace-pre-line font-medium leading-tight">{settings.footerNotes}</p>
                    )}
                    {settings.showSocial && settings.instagram && (
                      <p className="text-[9px] font-semibold text-slate-800 mt-1">
                        IG: {settings.instagram}
                      </p>
                    )}
                    <p className="text-[8px] text-slate-400 pt-1">*** {settings.storeName} ***</p>
                  </div>
                </div>
              ) : (
                /* ================= KITCHEN TICKET ================= */
                <div>
                  <div className="text-center pb-2 border-b-2 border-slate-800">
                    <h2 className="font-extrabold text-base tracking-widest uppercase">KITCHEN / BAR TICKET</h2>
                    <p className="text-xs font-bold mt-1 text-slate-800">
                      {order.orderType === 'DINE_IN' ? `DINE IN - MEJA ${order.tableNumber || '?'}` : order.orderType}
                    </p>
                  </div>

                  <div className="py-2 border-b border-dashed border-slate-500 flex justify-between text-[11px]">
                    <div>
                      <div><span className="text-slate-500">Order:</span> <b className="text-xs">#{orderIdShort}</b></div>
                      <div><span className="text-slate-500">Cust:</span> <b>{order.customerName}</b></div>
                    </div>
                    <div className="text-right">
                      {order.queueNumber && (
                        <div className="text-sm font-extrabold bg-slate-900 text-white px-2 py-0.5 rounded">
                          A-{order.queueNumber}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-500 mt-0.5">{formattedTime}</div>
                    </div>
                  </div>

                  {/* Kitchen Items with Large Clear Modifiers */}
                  <div className="py-3 border-b-2 border-slate-800 space-y-3">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="border-b border-slate-200 pb-2 last:border-none last:pb-0">
                        <div className="text-xs font-extrabold flex items-center gap-1.5 text-slate-900">
                          <span className="inline-block bg-slate-900 text-white px-1.5 py-0.2 rounded text-[11px]">
                            {item.qty}x
                          </span>
                          <span className="text-sm uppercase tracking-tight">{item.name}</span>
                        </div>

                        {/* Modifiers for Barista / Chef */}
                        <div className="pl-6 pt-1 text-[11px] font-bold text-slate-800 space-y-0.5">
                          {item.sugarLevel && <div className="text-orange-600">• Gula: {item.sugarLevel}</div>}
                          {item.iceLevel && <div className="text-blue-600">• Es: {item.iceLevel}</div>}
                          {item.matchaLevel !== undefined && item.matchaLevel > 0 && (
                            <div className="text-emerald-700">• Level Matcha: Level {item.matchaLevel}</div>
                          )}
                          {item.size && <div>• Size: {item.size}</div>}
                          {item.shotName && <div className="text-amber-700">• Shot: {item.shotName}</div>}
                          {item.addOns && item.addOns.length > 0 && (
                            item.addOns.map((addon, aIdx) => (
                              <div key={aIdx} className="text-purple-700">• +Topping: {addon.name}</div>
                            ))
                          )}
                          {item.bundleSelections && item.bundleSelections.length > 0 && (
                            item.bundleSelections.map((bundle, bIdx) => (
                              <div key={bIdx} className="text-indigo-700">• {bundle.productName || bundle.groupName}</div>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <div className="pt-2 text-[10px] bg-amber-50 p-2 rounded border border-amber-200 text-amber-900">
                      <b>Catatan Pesanan:</b>
                      <p className="mt-0.5">{order.notes}</p>
                    </div>
                  )}

                  <div className="pt-2 text-center text-[9px] text-slate-400 font-mono">
                    --- SELESAIKAN & SAJIKAN ---
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between gap-3">
            <button
              onClick={handleCopyText}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Tersalin' : 'Salin Teks'}
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Tutup
              </button>
              <button
                onClick={handlePrint}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 flex items-center gap-2 transition-all transform active:scale-95"
              >
                <Printer className="w-4 h-4" />
                Cetak ke Algoo (58mm)
              </button>
            </div>
          </div>
        </motion.div>

        {/* Global Print CSS Stylesheet specifically for 58mm / 80mm Continuous Receipt */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-thermal-receipt,
            #printable-thermal-receipt * {
              visibility: visible;
            }
            #printable-thermal-receipt {
              position: absolute;
              left: 0;
              top: 0;
              width: ${settings.paperWidth === '80mm' ? '72mm' : '48mm'} !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 4px !important;
              border: none !important;
              box-shadow: none !important;
              font-family: 'Courier New', Courier, monospace !important;
              color: black !important;
              background: white !important;
            }
            @page {
              size: ${settings.paperWidth === '80mm' ? '80mm auto' : '58mm auto'};
              margin: 0mm;
            }
          }
        `}</style>
      </div>
    </AnimatePresence>
  );
}
