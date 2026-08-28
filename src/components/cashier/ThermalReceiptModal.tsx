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
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { BluetoothPrinterPill } from './BluetoothPrinterPill';
import { isBluetoothPrinterConnected, printDirectBluetooth, printElementAsRasterBluetooth } from '@/lib/bluetooth-printer';

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
  const tableDisplay = order.tableNumber ? `MEJA ${order.tableNumber}` : (order.queueNumber ? `A-${order.queueNumber}` : (order.orderType === 'DINE_IN' ? 'DINE IN' : 'PICKUP'));

  // Clean HTML generator specifically designed for 58mm / 80mm ESC/POS Thermal Printers in CGV Cinema Ticket Style
  const generateCustomerReceiptHtml = () => {
    let itemsHtml = '';
    order.items.forEach((item) => {
      const itemTotalPrice = (item.totalPrice || item.price) * item.qty;
      const priceFormatted = formatRupiah(itemTotalPrice);
      
      let modsHtml = '';
      if (item.sugarLevel) {
        modsHtml += `<div class="cgv-mod-line">» <b>GULA:</b> <span class="cgv-mod-val">${item.sugarLevel.toUpperCase()}</span></div>`;
      }
      if (item.iceLevel) {
        modsHtml += `<div class="cgv-mod-line">» <b>ES:</b> <span class="cgv-mod-val">${item.iceLevel.toUpperCase()}</span></div>`;
      }
      if (item.matchaLevel !== undefined && item.matchaLevel > 0) {
        modsHtml += `<div class="cgv-mod-line">» <b>MATCHA:</b> <span class="cgv-mod-val">LEVEL ${item.matchaLevel}</span></div>`;
      }
      if (item.size) {
        modsHtml += `<div class="cgv-mod-line">» <b>UKURAN:</b> <span class="cgv-mod-val">${item.size.toUpperCase()}</span></div>`;
      }
      if (item.shotName) {
        modsHtml += `<div class="cgv-mod-line">» <b>SHOT:</b> <span class="cgv-mod-val">${item.shotName.toUpperCase()}</span></div>`;
      }
      if (item.addOns && item.addOns.length > 0) {
        item.addOns.forEach((a) => {
          modsHtml += `<div class="cgv-mod-line">» <b>TOPPING:</b> <span class="cgv-mod-val">+${a.name.toUpperCase()} (${formatRupiah(a.price)})</span></div>`;
        });
      }
      if (item.bundleSelections && item.bundleSelections.length > 0) {
        item.bundleSelections.forEach((b) => {
          modsHtml += `<div class="cgv-mod-line">» <b>PILIHAN:</b> <span class="cgv-mod-val">${(b.productName || b.groupName || '').toUpperCase()}</span></div>`;
        });
      }
      if (item.modifiersString && !item.sugarLevel && !item.iceLevel) {
        modsHtml += `<div class="cgv-mod-line">» <b>VARIAN:</b> <span class="cgv-mod-val">${item.modifiersString.toUpperCase()}</span></div>`;
      }

      itemsHtml += `
        <div class="cgv-item-card">
          <div class="cgv-item-header">
            <span class="cgv-item-name">[ ${item.qty}x ] ${item.name.toUpperCase()}</span>
            <span class="cgv-item-price">${priceFormatted}</span>
          </div>
          ${modsHtml ? `<div class="cgv-mod-box">${modsHtml}</div>` : ''}
        </div>
      `;
    });

    const is80mm = settings.paperWidth === '80mm';
    const paperWidthStyle = is80mm ? '72mm' : '48mm';
    const pageSizeStyle = is80mm ? '80mm auto' : '58mm auto';
    const tableDisplay = order.tableNumber ? `MEJA ${order.tableNumber}` : (order.queueNumber ? `A-${order.queueNumber}` : 'PICKUP');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Struk ${settings.storeName}</title>
          <style>
            @page {
              size: ${pageSizeStyle};
              margin: 0;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            html, body {
              width: ${paperWidthStyle};
              margin: 0 auto;
              padding: 2mm 0 8mm 0;
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              line-height: 1.3;
              color: #000000;
              background: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: 900; }
            
            /* CGV Solid Inverted Badge Header */
            .cgv-tag {
              background: #000000;
              color: #ffffff;
              font-size: 9px;
              font-weight: 900;
              letter-spacing: 0.8px;
              text-transform: uppercase;
              padding: 2px 6px;
              display: inline-block;
              margin-bottom: 2px;
            }
            
            .cgv-title {
              font-size: 13px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              line-height: 1.2;
              margin: 2px 0;
            }

            .logo-wrap {
              text-align: center;
              margin-bottom: 3px;
            }
            .logo-img {
              max-width: 85px;
              max-height: 36px;
              object-fit: contain;
              filter: grayscale(100%) contrast(200%);
              display: inline-block;
            }

            .divider {
              border-top: 1px dashed #000;
              margin: 4px 0;
              width: 100%;
            }
            .divider-solid {
              border-top: 2px solid #000;
              margin: 5px 0;
              width: 100%;
            }

            /* 2-Column Split Box (Identik Time/Date & Auditorium CGV) */
            .cgv-split-box {
              display: flex;
              border: 1.5px solid #000;
              margin: 4px 0;
            }
            .cgv-split-left {
              flex: 1.1;
              padding: 4px;
              border-right: 1.5px solid #000;
            }
            .cgv-split-right {
              flex: 0.9;
              padding: 4px;
              text-align: center;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              background: #f9f9f9;
            }
            .cgv-huge-number {
              font-size: 15px;
              font-weight: 900;
              letter-spacing: 0.5px;
              margin-top: 2px;
              text-transform: uppercase;
            }

            /* Items & Modifiers */
            .cgv-item-card {
              padding: 3.5px 0;
              border-bottom: 1px dashed #666;
            }
            .cgv-item-card:last-child {
              border-bottom: none;
            }
            .cgv-item-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .cgv-item-name {
              font-size: 11px;
              font-weight: 900;
              flex: 1;
              padding-right: 4px;
              text-transform: uppercase;
            }
            .cgv-item-price {
              font-size: 11px;
              font-weight: 900;
              white-space: nowrap;
            }
            .cgv-mod-box {
              margin-top: 2px;
              padding: 2px 0 2px 4px;
              border-left: 2px solid #000;
            }
            .cgv-mod-line {
              font-size: 9.5px;
              font-weight: 900;
              margin-top: 1px;
              line-height: 1.3;
            }
            .cgv-mod-val {
              font-weight: 900;
              text-decoration: underline;
            }

            /* Barcode Area */
            .cgv-barcode {
              text-align: center;
              font-family: monospace;
              letter-spacing: 2px;
              font-size: 12px;
              font-weight: 900;
              margin: 4px 0 1px 0;
            }

            /* Total Payment Banner */
            .cgv-total-banner {
              background: #000000;
              color: #ffffff;
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 4px 6px;
              font-size: 12px;
              font-weight: 900;
              margin: 4px 0;
            }

            .row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 10px;
              margin-bottom: 1.5px;
            }

            /* Member Promo Banner (CGV Style) */
            .cgv-promo-card {
              border: 1.5px solid #000;
              padding: 5px;
              text-align: center;
              margin: 6px 0;
              background: #fafafa;
            }
            .cgv-promo-title {
              font-size: 10.5px;
              font-weight: 900;
              letter-spacing: 0.5px;
            }
            .cgv-promo-sub {
              font-size: 8.5px;
              font-weight: bold;
              margin-top: 1px;
            }
            .cgv-promo-scan {
              font-size: 8px;
              font-weight: bold;
              margin-top: 2px;
              letter-spacing: 0.5px;
            }

            .footer-text {
              font-size: 9px;
              text-align: center;
              line-height: 1.3;
              margin-top: 4px;
              white-space: pre-line;
            }
          </style>
        </head>
        <body>
          ${settings.showLogo && settings.logoUrl ? `
            <div class="logo-wrap">
              <img src="${settings.logoUrl}" class="logo-img" alt="Logo" />
            </div>
          ` : ''}

          <div class="center" style="margin-bottom: 4px;">
            <div class="bold" style="font-size: 13px; letter-spacing: 1px; text-transform: uppercase;">
              ${settings.storeName}
            </div>
            ${settings.tagline ? `<div style="font-size: 9px; font-weight: bold;">${settings.tagline}</div>` : ''}
            ${settings.address ? `<div style="font-size: 8.5px;">${settings.address}</div>` : ''}
            ${settings.phone ? `<div style="font-size: 8.5px;">WA: ${settings.phone}</div>` : ''}
            ${settings.headerNotes ? `<div style="font-size: 8px; font-style: italic; color: #444; margin-top: 1px; white-space: pre-line;">${settings.headerNotes}</div>` : ''}
          </div>

          <div class="divider-solid"></div>

          <!-- Section 1: Movie / Customer Header (CGV Style) -->
          <div style="margin-bottom: 3px;">
            <div class="cgv-tag">PESANAN</div>
            <div class="cgv-title">${order.customerName.toUpperCase()}</div>
            <div style="font-size: 9px; font-weight: bold;">ORDER: #${orderIdShort}</div>
          </div>

          <!-- Section 2: Split Time & Table/Auditorium (CGV Style) -->
          <div class="cgv-split-box">
            <div class="cgv-split-left">
              <div class="cgv-tag">WAKTU & TANGGAL</div>
              <div style="font-size: 9.5px; font-weight: 900; margin-top: 2px;">${formattedDate}</div>
              <div style="font-size: 11px; font-weight: 900;">${formattedTime} WIB</div>
            </div>
            <div class="cgv-split-right">
              <div class="cgv-tag">${order.orderType === 'DINE_IN' ? 'NOMOR MEJA' : 'ANTRIAN'}</div>
              <div class="cgv-huge-number">${tableDisplay}</div>
            </div>
          </div>

          <!-- Section 3: Seats / Order Items (CGV Style) -->
          <div style="margin-top: 5px;">
            <div class="cgv-tag">DETAIL PESANAN</div>
            <div style="margin-top: 3px;">
              ${itemsHtml}
            </div>
          </div>

          <div class="divider-solid"></div>

          <!-- Section 4: Barcode & Payment -->
          <div class="cgv-barcode">|||| | ||||| || ||||||||| | |||</div>
          <div class="center" style="font-size: 8.5px; letter-spacing: 1px; margin-bottom: 4px;">
            ${order.id}
          </div>

          <div class="row">
            <span>Subtotal:</span>
            <span class="bold">${formatRupiah(order.subtotal)}</span>
          </div>
          ${totalDiscount > 0 ? `
            <div class="row">
              <span>Diskon / Promo:</span>
              <span class="bold">-${formatRupiah(totalDiscount)}</span>
            </div>
          ` : ''}

          <div class="cgv-total-banner">
            <span>TOTAL</span>
            <span>${formatRupiah(order.total)}</span>
          </div>

          <div class="row" style="font-size: 9.5px;">
            <span>Metode Pembayaran:</span>
            <span class="bold">${order.paymentMethod} (LUNAS)</span>
          </div>
          ${order.cashPaid ? `
            <div class="row">
              <span>Tunai Diterima:</span>
              <span>${formatRupiah(order.cashPaid)}</span>
            </div>
            <div class="row">
              <span class="bold">Kembalian:</span>
              <span class="bold">${formatRupiah(order.change || 0)}</span>
            </div>
          ` : ''}

          ${order.pointsEarned && order.pointsEarned > 0 ? `
            <div class="divider"></div>
            <div class="center" style="font-size: 9px; font-weight: 900;">
              POIN DIPEROLEH: +${order.pointsEarned} POIN
              ${order.totalPoints ? `<div style="font-size: 8.5px; font-weight: normal;">TOTAL POIN MEMBER: ${order.totalPoints} POIN</div>` : ''}
            </div>
          ` : ''}

          <!-- Section 5: Member Reward Promo Banner (CGV Style) -->
          <div class="cgv-promo-card">
            <div class="cgv-promo-title">GRATIS VOUCHER & CASHBACK</div>
            <div class="cgv-promo-sub">DENGAN JOIN MEMBER ARUM SEDUH</div>
            <div class="cgv-promo-scan">KUMPULKAN POIN DI SETIAP KUNJUNGAN</div>
          </div>

          ${settings.showWifi && settings.wifiSsid ? `
            <div class="center" style="font-size: 9px; padding: 2px 0;">
              Wi-Fi: <b>${settings.wifiSsid}</b> | Pass: <b>${settings.wifiPassword || '-'}</b>
            </div>
          ` : ''}

          <div class="footer-text">
            ${settings.footerNotes ? `${settings.footerNotes}` : ''}
            ${settings.showSocial && settings.instagram ? `<div style="font-weight: 900; margin-top: 2px;">IG: ${settings.instagram}</div>` : ''}
            ${settings.showSocial && settings.tiktok ? `<div style="font-weight: 900; margin-top: 1px;">TikTok: ${settings.tiktok}</div>` : ''}
            <div style="font-size: 8px; color: #444; margin-top: 3px;">*** TERIMA KASIH • SELAMAT MENIKMATI ***</div>
          </div>
        </body>
      </html>
    `;
  };

  const generateKitchenTicketHtml = () => {
    let itemsHtml = '';
    order.items.forEach((item) => {
      let modsHtml = '';
      if (item.sugarLevel) {
        modsHtml += `<div style="font-size: 12px; font-weight: 900; color: #000;">» GULA: ${item.sugarLevel.toUpperCase()}</div>`;
      }
      if (item.iceLevel) {
        modsHtml += `<div style="font-size: 12px; font-weight: 900; color: #000;">» ES: ${item.iceLevel.toUpperCase()}</div>`;
      }
      if (item.matchaLevel !== undefined && item.matchaLevel > 0) {
        modsHtml += `<div style="font-size: 12px; font-weight: 900; color: #000;">» MATCHA: LEVEL ${item.matchaLevel}</div>`;
      }
      if (item.size) {
        modsHtml += `<div style="font-size: 11px; font-weight: 900; color: #000;">» SIZE: ${item.size.toUpperCase()}</div>`;
      }
      if (item.shotName) {
        modsHtml += `<div style="font-size: 11px; font-weight: 900; color: #000;">» SHOT: ${item.shotName.toUpperCase()}</div>`;
      }
      if (item.addOns && item.addOns.length > 0) {
        item.addOns.forEach((a) => {
          modsHtml += `<div style="font-size: 11px; font-weight: 900; color: #000;">» +TOPPING: ${a.name.toUpperCase()}</div>`;
        });
      }
      if (item.bundleSelections && item.bundleSelections.length > 0) {
        item.bundleSelections.forEach((b) => {
          modsHtml += `<div style="font-size: 11px; font-weight: 900; color: #000;">» PILIHAN: ${(b.productName || b.groupName || '').toUpperCase()}</div>`;
        });
      }

      itemsHtml += `
        <div style="border-bottom: 1.5px dashed #000; padding: 5px 0;">
          <div style="font-size: 13px; font-weight: 900; text-transform: uppercase;">
            [ ${item.qty}x ] ${item.name}
          </div>
          ${modsHtml ? `<div style="padding-left: 6px; margin-top: 3px; border-left: 2.5px solid #000;">${modsHtml}</div>` : ''}
        </div>
      `;
    });

    const is80mm = settings.paperWidth === '80mm';
    const paperWidthStyle = is80mm ? '72mm' : '48mm';
    const pageSizeStyle = is80mm ? '80mm auto' : '58mm auto';
    const tableDisplay = order.tableNumber ? `MEJA ${order.tableNumber}` : (order.queueNumber ? `A-${order.queueNumber}` : 'PICKUP');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Kitchen Ticket - #${orderIdShort}</title>
          <style>
            @page {
              size: ${pageSizeStyle};
              margin: 0;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            html, body {
              width: ${paperWidthStyle};
              margin: 0 auto;
              padding: 2mm 0 8mm 0;
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              line-height: 1.35;
              color: #000000;
              background: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .center { text-align: center; }
            .bold { font-weight: 900; }
            .cgv-tag {
              background: #000000;
              color: #ffffff;
              font-size: 10px;
              font-weight: 900;
              letter-spacing: 1px;
              text-transform: uppercase;
              padding: 3px 6px;
              display: inline-block;
            }
            .cgv-split-box {
              display: flex;
              border: 2px solid #000;
              margin: 5px 0;
            }
            .cgv-split-left {
              flex: 1.1;
              padding: 4px;
              border-right: 2px solid #000;
            }
            .cgv-split-right {
              flex: 0.9;
              padding: 4px;
              text-align: center;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              background: #000;
              color: #fff;
            }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="cgv-tag">KITCHEN / BARISTA TICKET</div>
          </div>

          <div class="cgv-split-box">
            <div class="cgv-split-left">
              <div style="font-size: 9px; font-weight: 900; color: #555;">PELANGGAN & ORDER</div>
              <div style="font-size: 13px; font-weight: 900; text-transform: uppercase;">${order.customerName}</div>
              <div style="font-size: 10px; font-weight: 900;">#${orderIdShort} • ${formattedTime} WIB</div>
            </div>
            <div class="cgv-split-right">
              <div style="font-size: 8.5px; font-weight: 900; letter-spacing: 0.5px;">LOKASI</div>
              <div style="font-size: 15px; font-weight: 900; text-transform: uppercase;">${tableDisplay}</div>
            </div>
          </div>

          <div style="border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 2px 0; margin: 4px 0; font-size: 10px; font-weight: 900; text-align: center; letter-spacing: 0.5px;">
            DAFTAR PESANAN MINUMAN & MAKANAN
          </div>

          <div style="margin: 4px 0;">
            ${itemsHtml}
          </div>

          ${order.notes ? `
            <div style="border: 1.5px solid #000; padding: 4px; margin-top: 4px; font-size: 11px; font-weight: 900; background: #f5f5f5;">
              <b>CATATAN KHUSUS:</b><br/>${order.notes}
            </div>
          ` : ''}

          <div class="center" style="font-size: 9px; font-weight: 900; margin-top: 6px; letter-spacing: 0.5px;">
            --- SELESAIKAN & SAJIKAN ---
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = async () => {
    // 1. Direct Web Bluetooth Print (High-Fidelity CGV Raster Bitmap Graphic)
    if (isBluetoothPrinterConnected()) {
      try {
        const previewEl = document.getElementById('printable-thermal-receipt-preview');
        if (previewEl) {
          const rasterSuccess = await printElementAsRasterBluetooth(previewEl, settings.paperWidth);
          if (rasterSuccess) {
            return;
          }
        }
        const textSuccess = await printDirectBluetooth(order, settings, activeTab === 'kitchen');
        if (textSuccess) {
          return;
        }
      } catch (err) {
        console.warn('Bluetooth raster direct print failed, falling back to browser print:', err);
      }
    }

    // 2. Hidden Iframe Print Dialog Fallback
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

    const htmlContent = activeTab === 'customer' 
      ? generateCustomerReceiptHtml() 
      : generateKitchenTicketHtml();

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        window.print();
      }
    }, 250);
  };

  const handleCopyText = () => {
    let receiptText = `================================\n`;
    receiptText += `           ${settings.storeName.toUpperCase()}\n`;
    if (settings.tagline) receiptText += `     ${settings.tagline}\n`;
    if (settings.address) receiptText += `  ${settings.address}\n`;
    if (settings.phone) receiptText += `      WA: ${settings.phone}\n`;
    receiptText += `================================\n`;
    receiptText += `[ PESANAN ]\n`;
    receiptText += `Pelanggan : ${order.customerName.toUpperCase()}\n`;
    receiptText += `No. Order : #${orderIdShort}\n`;
    receiptText += `--------------------------------\n`;
    receiptText += `[ WAKTU ]   : ${formattedDate} ${formattedTime}\n`;
    receiptText += `[ LOKASI ]  : ${order.orderType === 'DINE_IN' ? `MEJA ${order.tableNumber || '?'}` : (order.queueNumber ? `ANTRIAN A-${order.queueNumber}` : order.orderType)}\n`;
    receiptText += `--------------------------------\n`;
    receiptText += `[ DETAIL PESANAN ]\n`;
    order.items.forEach((item) => {
      receiptText += `* ${item.qty}x ${item.name.toUpperCase().padEnd(18)} ${formatRupiah((item.totalPrice || item.price) * item.qty).padStart(10)}\n`;
      if (item.sugarLevel) receiptText += `  » GULA: ${item.sugarLevel.toUpperCase()}\n`;
      if (item.iceLevel) receiptText += `  » ES: ${item.iceLevel.toUpperCase()}\n`;
      if (item.matchaLevel !== undefined && item.matchaLevel > 0) receiptText += `  » MATCHA: LEVEL ${item.matchaLevel}\n`;
      if (item.size) receiptText += `  » UKURAN: ${item.size.toUpperCase()}\n`;
      if (item.shotName) receiptText += `  » SHOT: ${item.shotName.toUpperCase()}\n`;
      if (item.addOns && item.addOns.length > 0) {
        item.addOns.forEach((a) => {
          receiptText += `  » TOPPING: +${a.name.toUpperCase()} (${formatRupiah(a.price)})\n`;
        });
      }
      if (item.bundleSelections && item.bundleSelections.length > 0) {
        item.bundleSelections.forEach((b) => {
          receiptText += `  » PILIHAN: ${(b.productName || b.groupName || '').toUpperCase()}\n`;
        });
      }
      if (item.modifiersString && !item.sugarLevel && !item.iceLevel) {
        receiptText += `  » VARIAN: ${item.modifiersString.toUpperCase()}\n`;
      }
    });
    receiptText += `--------------------------------\n`;
    receiptText += `Subtotal                ${formatRupiah(order.subtotal).padStart(10)}\n`;
    if (totalDiscount > 0) {
      receiptText += `Diskon / Promo         -${formatRupiah(totalDiscount).padStart(10)}\n`;
    }
    receiptText += `TOTAL AKHIR             ${formatRupiah(order.total).padStart(10)}\n`;
    receiptText += `METODE: ${order.paymentMethod.padEnd(12)} (LUNAS)\n`;
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
                <p className="text-[11px] text-slate-500 font-mono">Format Tiket CGV Style • {settings.paperWidth}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <BluetoothPrinterPill />
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-slate-200/70 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
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

          {/* Scrollable Receipt Body (On-Screen Interactive CGV Preview) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/80 flex justify-center">
            <div
              id="printable-thermal-receipt-preview"
              className="w-full max-w-[310px] bg-white p-4 sm:p-5 rounded-lg shadow-md border-2 border-black text-black font-mono text-[11px] leading-tight transition-all select-none"
            >
              {activeTab === 'customer' ? (
                /* ================= CUSTOMER CGV CINEMA TICKET PREVIEW ================= */
                <div className="space-y-2">
                  {/* Store Logo */}
                  {settings.showLogo && settings.logoUrl && (
                    <div className="flex justify-center mb-1">
                      <img
                        src={settings.logoUrl}
                        alt="Logo Struk"
                        className="max-h-9 max-w-[85px] object-contain grayscale contrast-200"
                      />
                    </div>
                  )}

                  {/* Store Header */}
                  <div className="text-center pb-2 border-b-2 border-black">
                    <h2 className="font-black text-sm tracking-wider uppercase">{settings.storeName}</h2>
                    {settings.tagline && <p className="text-[9.5px] font-bold text-slate-700">{settings.tagline}</p>}
                    {settings.address && <p className="text-[8.5px] text-slate-600 mt-0.5">{settings.address}</p>}
                    {settings.phone && <p className="text-[8.5px] text-slate-600">WA: {settings.phone}</p>}
                    {settings.headerNotes && (
                      <p className="text-[8px] italic text-slate-500 mt-1 whitespace-pre-line">{settings.headerNotes}</p>
                    )}
                  </div>

                  {/* Section 1: Customer & Order (CGV Header Style) */}
                  <div>
                    <span className="bg-black text-white text-[8.5px] font-black uppercase px-1.5 py-0.5 tracking-wider inline-block">
                      PESANAN
                    </span>
                    <h3 className="font-black text-sm uppercase tracking-wide mt-1 text-black">
                      {order.customerName}
                    </h3>
                    <p className="text-[9.5px] font-bold text-slate-600">
                      ORDER: #{orderIdShort}
                    </p>
                  </div>

                  {/* Section 2: Split Box Time/Date & Table/Auditorium (CGV 2-Col Style) */}
                  <div className="border-2 border-black flex my-1">
                    <div className="flex-1 p-2 border-r-2 border-black bg-white">
                      <span className="bg-black text-white text-[7.5px] font-black uppercase px-1 py-0.5 tracking-wider inline-block">
                        WAKTU & TANGGAL
                      </span>
                      <div className="font-black text-[10px] mt-1">{formattedDate}</div>
                      <div className="font-black text-xs">{formattedTime} WIB</div>
                    </div>
                    <div className="w-2/5 p-2 bg-slate-50 flex flex-col items-center justify-center text-center">
                      <span className="bg-black text-white text-[7.5px] font-black uppercase px-1 py-0.5 tracking-wider inline-block">
                        {order.orderType === 'DINE_IN' ? 'NOMOR MEJA' : 'ANTRIAN'}
                      </span>
                      <div className="font-black text-sm sm:text-base uppercase tracking-tight mt-1 text-black">
                        {order.tableNumber ? `MEJA ${order.tableNumber}` : (order.queueNumber ? `A-${order.queueNumber}` : 'PICKUP')}
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Order Items (CGV Seat Breakdown Style) */}
                  <div className="pt-1">
                    <span className="bg-black text-white text-[8.5px] font-black uppercase px-1.5 py-0.5 tracking-wider inline-block">
                      DETAIL PESANAN
                    </span>

                    <div className="divide-y divide-dashed divide-slate-400 mt-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="py-2 space-y-1">
                          <div className="flex justify-between items-start">
                            <span className="font-black text-xs uppercase flex-1 pr-2">
                              [ {item.qty}x ] {item.name}
                            </span>
                            <span className="font-black text-xs shrink-0">
                              {formatRupiah((item.totalPrice || item.price) * item.qty)}
                            </span>
                          </div>

                          {/* Super Clear & Bold Modifiers */}
                          <div className="border-l-2 border-black pl-2 space-y-0.5 text-[10px] font-bold text-black mt-1">
                            {item.sugarLevel && (
                              <div>» <span className="font-black">GULA:</span> <span className="underline font-black">{item.sugarLevel.toUpperCase()}</span></div>
                            )}
                            {item.iceLevel && (
                              <div>» <span className="font-black">ES:</span> <span className="underline font-black">{item.iceLevel.toUpperCase()}</span></div>
                            )}
                            {item.matchaLevel !== undefined && item.matchaLevel > 0 && (
                              <div>» <span className="font-black">MATCHA:</span> <span className="underline font-black">LEVEL {item.matchaLevel}</span></div>
                            )}
                            {item.size && (
                              <div>» <span className="font-black">UKURAN:</span> <span className="underline font-black">{item.size.toUpperCase()}</span></div>
                            )}
                            {item.shotName && (
                              <div>» <span className="font-black">SHOT:</span> <span className="underline font-black">{item.shotName.toUpperCase()}</span></div>
                            )}
                            {item.addOns && item.addOns.length > 0 && (
                              item.addOns.map((addon, aIdx) => (
                                <div key={aIdx}>» <span className="font-black">TOPPING:</span> <span className="underline font-black">+{addon.name.toUpperCase()} ({formatRupiah(addon.price)})</span></div>
                              ))
                            )}
                            {item.bundleSelections && item.bundleSelections.length > 0 && (
                              item.bundleSelections.map((bundle, bIdx) => (
                                <div key={bIdx}>» <span className="font-black">PILIHAN:</span> <span className="underline font-black">{(bundle.productName || bundle.groupName || '').toUpperCase()}</span></div>
                              ))
                            )}
                            {item.modifiersString && !item.sugarLevel && !item.iceLevel && (
                              <div>» <span className="font-black">VARIAN:</span> <span className="underline font-black">{item.modifiersString.toUpperCase()}</span></div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 4: Barcode & Payment Breakdown */}
                  <div className="border-t-2 border-black pt-2">
                    <div className="text-center font-mono font-black text-xs tracking-widest">
                      |||| | ||||| || ||||||||| | |||
                    </div>
                    <div className="text-center text-[8.5px] font-mono text-slate-600 mb-2">
                      {order.id}
                    </div>

                    <div className="space-y-1 text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-slate-700">Subtotal:</span>
                        <span className="font-bold">{formatRupiah(order.subtotal)}</span>
                      </div>
                      {totalDiscount > 0 && (
                        <div className="flex justify-between text-slate-800">
                          <span>Diskon / Promo:</span>
                          <span className="font-bold">-{formatRupiah(totalDiscount)}</span>
                        </div>
                      )}

                      {/* Total Inverted Banner */}
                      <div className="bg-black text-white px-2 py-1.5 flex justify-between font-black text-xs tracking-wide my-1.5">
                        <span>TOTAL</span>
                        <span>{formatRupiah(order.total)}</span>
                      </div>

                      <div className="flex justify-between text-[10px]">
                        <span>Metode Pembayaran:</span>
                        <span className="font-bold">{order.paymentMethod} (LUNAS)</span>
                      </div>

                      {order.cashPaid !== undefined && order.cashPaid > 0 && (
                        <>
                          <div className="flex justify-between text-slate-600">
                            <span>Tunai Diterima:</span>
                            <span>{formatRupiah(order.cashPaid)}</span>
                          </div>
                          <div className="flex justify-between font-black text-black">
                            <span>Kembalian:</span>
                            <span>{formatRupiah(order.change || 0)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Section 5: Loyalty Points Info */}
                  {order.pointsEarned && order.pointsEarned > 0 ? (
                    <div className="border-t border-dashed border-slate-400 py-1.5 text-center text-[9.5px]">
                      <span className="font-black text-black">
                        POIN DIPEROLEH: +{order.pointsEarned} POIN
                      </span>
                      {order.totalPoints ? (
                        <div className="text-[8.5px] text-slate-600">TOTAL POIN MEMBER: {order.totalPoints} POIN</div>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Section 6: Promo Loyalty Card (CGV Style) */}
                  <div className="border-2 border-black p-2 text-center bg-slate-50 my-2">
                    <div className="font-black text-[10px] tracking-wide uppercase">
                      GRATIS VOUCHER & CASHBACK
                    </div>
                    <div className="text-[8.5px] font-bold text-slate-700 mt-0.5">
                      DENGAN JOIN MEMBER ARUM SEDUH
                    </div>
                    <div className="text-[7.5px] font-bold text-slate-500 mt-1 uppercase">
                      KUMPULKAN POIN DI SETIAP KUNJUNGAN
                    </div>
                  </div>

                  {/* Wi-Fi & Footer */}
                  {settings.showWifi && settings.wifiSsid && (
                    <div className="text-center text-[9px] text-slate-700 py-1 border-t border-dashed border-slate-400">
                      Wi-Fi: <span className="font-black">{settings.wifiSsid}</span> | Pass: <span className="font-bold">{settings.wifiPassword || '-'}</span>
                    </div>
                  )}

                  <div className="text-center text-[9px] text-slate-600 space-y-0.5 pt-1">
                    {settings.footerNotes && (
                      <p className="whitespace-pre-line font-medium leading-tight">{settings.footerNotes}</p>
                    )}
                    {settings.showSocial && settings.instagram && (
                      <p className="font-black text-black mt-0.5">IG: {settings.instagram}</p>
                    )}
                    {settings.showSocial && settings.tiktok && (
                      <p className="font-black text-black text-[8.5px]">TikTok: {settings.tiktok}</p>
                    )}
                    <p className="text-[8px] text-slate-400 pt-1">*** TERIMA KASIH • SELAMAT MENIKMATI ***</p>
                  </div>
                </div>
              ) : (
                /* ================= KITCHEN / BARISTA TICKET PREVIEW ================= */
                <div className="space-y-2">
                  <div className="text-center pb-1">
                    <span className="bg-black text-white text-[9px] font-black uppercase px-2 py-0.5 tracking-wider inline-block">
                      KITCHEN / BARISTA TICKET
                    </span>
                  </div>

                  {/* Split Box */}
                  <div className="border-2 border-black flex my-1">
                    <div className="flex-1 p-2 border-r-2 border-black bg-white">
                      <div className="text-[8px] font-bold text-slate-500 uppercase">PELANGGAN & ORDER</div>
                      <div className="font-black text-sm uppercase truncate">{order.customerName}</div>
                      <div className="font-bold text-[10px] text-slate-700">#{orderIdShort} • {formattedTime} WIB</div>
                    </div>
                    <div className="w-2/5 p-2 bg-black text-white flex flex-col items-center justify-center text-center">
                      <div className="text-[7.5px] font-bold tracking-wider text-slate-300">LOKASI</div>
                      <div className="font-black text-sm uppercase tracking-tight mt-0.5">
                        {tableDisplay}
                      </div>
                    </div>
                  </div>

                  <div className="border-y-2 border-black py-1 text-center font-black text-[9.5px] tracking-wider uppercase">
                    DAFTAR PESANAN MINUMAN & MAKANAN
                  </div>

                  {/* Kitchen Items with Large Bold Modifiers */}
                  <div className="divide-y-2 divide-dashed divide-black py-1 space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="pt-2 first:pt-0 space-y-1">
                        <div className="font-black text-sm uppercase text-black">
                          [ {item.qty}x ] {item.name}
                        </div>

                        {/* Modifiers for Barista */}
                        <div className="border-l-2 border-black pl-2 space-y-0.5 text-[11px] font-black text-black">
                          {item.sugarLevel && <div>» GULA: {item.sugarLevel.toUpperCase()}</div>}
                          {item.iceLevel && <div>» ES: {item.iceLevel.toUpperCase()}</div>}
                          {item.matchaLevel !== undefined && item.matchaLevel > 0 && (
                            <div>» MATCHA: LEVEL {item.matchaLevel}</div>
                          )}
                          {item.size && <div>» UKURAN: {item.size.toUpperCase()}</div>}
                          {item.shotName && <div>» SHOT: {item.shotName.toUpperCase()}</div>}
                          {item.addOns && item.addOns.length > 0 && (
                            item.addOns.map((addon, aIdx) => (
                              <div key={aIdx}>» +TOPPING: {addon.name.toUpperCase()}</div>
                            ))
                          )}
                          {item.bundleSelections && item.bundleSelections.length > 0 && (
                            item.bundleSelections.map((bundle, bIdx) => (
                              <div key={bIdx}>» PILIHAN: {(bundle.productName || bundle.groupName || '').toUpperCase()}</div>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <div className="border-2 border-black p-2 bg-slate-50 text-black text-[10px] font-black mt-2">
                      <div className="underline">CATATAN KHUSUS:</div>
                      <p className="mt-0.5 text-[11px]">{order.notes}</p>
                    </div>
                  )}

                  <div className="pt-2 text-center text-[8.5px] font-black text-slate-500 uppercase tracking-wider">
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
              {copied ? 'Tersalin' : 'Salin Teks (WA)'}
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
      </div>
    </AnimatePresence>
  );
}
