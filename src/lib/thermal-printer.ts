import { formatRupiah } from './utils';
import { parseItemModifiers, getReceiptModifierLines, calculateGrossReceiptSummary } from './receipt-modifiers';
import { isBluetoothPrinterConnected, printDirectBluetooth } from './bluetooth-printer';

/**
 * Data pesanan untuk pencetakan struk termal kasir dan tiket dapur Arum Seduh.
 */
export interface ThermalPrintOrder {
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
    originalPrice?: number;
    promoDiscount?: number;
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
  deliveryFee?: number;
  discount?: number;
  tumblerDiscount?: number;
  voucherDiscount?: number;
  voucherCode?: string;
  voucherTitle?: string;
  hasTumbler?: boolean;
  total: number;
  cashPaid?: number;
  change?: number;
  pointsEarned?: number;
  totalPoints?: number;
  notes?: string;
}

/**
 * Konfigurasi kustomisasi tampilan struk cetak (header, footer, sosial media, lebar kertas).
 */
export interface ThermalPrintSettings {
  storeName?: string;
  tagline?: string;
  address?: string;
  phone?: string;
  headerNotes?: string;
  footerNotes?: string;
  showLogo?: boolean;
  logoUrl?: string | null;
  showWifi?: boolean;
  wifiSsid?: string;
  wifiPassword?: string;
  showSocial?: boolean;
  instagram?: string;
  tiktok?: string;
  paperWidth?: string;
  printKitchenTicket?: boolean;
}

/**
 * Mencetak struk fisik kasir atau tiket pesanan dapur.
 * Prioritas utama: Mengirim data biner ESC/POS langsung ke printer Web Bluetooth yang terhubung (zero dialog).
 * Fallback: Jika tidak terhubung ke Bluetooth, membuat elemen iframe tersembunyi dan memicu dialog cetak browser (Ctrl+P).
 *
 * @param order - Objek data pesanan lengkap
 * @param settings - Konfigurasi cetak kasir (nama toko, alamat, footer, wifi, dsb.)
 * @param isKitchenTicket - Bernilai true jika mencetak tiket antrean dapur (tanpa rincian harga/pembayaran)
 */
export async function printThermalReceipt(
  order: ThermalPrintOrder,
  settings: ThermalPrintSettings = {},
  isKitchenTicket = false
): Promise<void> {
  if (typeof window === 'undefined') return;

  // 1. Direct Web Bluetooth Print (Zero Dialogs, Instant Hardware Print)
  if (isBluetoothPrinterConnected()) {
    try {
      const printed = await printDirectBluetooth(order, settings, isKitchenTicket);
      if (printed) return;
    } catch (err) {
      console.warn('Bluetooth direct print failed, falling back to browser print:', err);
    }
  }

  const storeName = settings.storeName || 'Arum Seduh';
  const is80mm = settings.paperWidth === '80mm';
  const paperWidthStyle = is80mm ? '72mm' : '48mm';
  const pageSizeStyle = is80mm ? '80mm auto' : '58mm auto';

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

  const orderIdShort = order.id.slice(0, 8).toUpperCase();
  const totalDiscount = (order.discount || 0) + (order.tumblerDiscount || 0) + (order.voucherDiscount || 0);

  let htmlContent = '';

  if (isKitchenTicket) {
    let itemsHtml = '';
    order.items.forEach((item) => {
      const parsed = parseItemModifiers(item);
      const modLines = getReceiptModifierLines(parsed, false);
      const mods = modLines.map((l) => `<div style="font-weight: bold;">» ${l.label}: ${l.value}</div>`).join('');

      itemsHtml += `
        <div style="border-bottom: 1px dashed #000; padding: 4px 0;">
          <div style="font-size: 12px; font-weight: bold;">
            [ ${item.qty}x ] ${item.name.toUpperCase()}
          </div>
          ${mods ? `<div style="padding-left: 8px; font-size: 11px; font-weight: bold; margin-top: 2px;">${mods}</div>` : ''}
        </div>
      `;
    });

    htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Kitchen Ticket - #${orderIdShort}</title>
          <style>
            @page { size: ${pageSizeStyle}; margin: 0; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              width: ${paperWidthStyle};
              margin: 0 auto;
              padding: 2mm 0 10mm 0;
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              line-height: 1.35;
              color: #000000;
              background: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider-solid { border-top: 2px solid #000; margin: 4px 0; }
            .divider-dash { border-top: 1px dashed #000; margin: 4px 0; }
            .row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2px; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="center">
            <div style="font-size: 14px; font-weight: 900; letter-spacing: 1px;">KITCHEN / BAR TICKET</div>
            <div style="font-size: 12px; font-weight: bold; margin-top: 2px;">
              ${order.orderType === 'DINE_IN' ? `DINE IN - MEJA ${order.tableNumber || '?'}` : order.orderType}
            </div>
          </div>

          <div class="divider-solid"></div>

          <div class="row">
            <div>
              <div>Order: <b>#${orderIdShort}</b></div>
              <div>Cust: <b>${order.customerName}</b></div>
            </div>
            <div style="text-align: right;">
              ${order.queueNumber ? `<div style="font-size: 14px; font-weight: 900;">A-${order.queueNumber}</div>` : ''}
              <div style="font-size: 10px;">${formattedTime}</div>
            </div>
          </div>

          <div class="divider-solid"></div>

          <div style="margin: 4px 0;">
            ${itemsHtml}
          </div>

          ${order.notes ? `
            <div style="border: 1px solid #000; padding: 4px; margin-top: 4px; font-size: 10.5px;">
              <b>Catatan:</b><br/>${order.notes}
            </div>
          ` : ''}

          <div class="divider-dash"></div>
          <div class="center" style="font-size: 9px; margin-top: 4px;">--- SELESAIKAN & SAJIKAN ---</div>
        </body>
      </html>
    `;
  } else {
    const summary = calculateGrossReceiptSummary(order);
    let itemsHtml = '';
    summary.items.forEach((pItem) => {
      const parsed = parseItemModifiers({
        ...pItem.rawItem,
        originalPrice: pItem.unitOriginalPrice,
        promoDiscount: pItem.unitDiscount,
        price: pItem.unitFinalPrice,
        modifiersString: pItem.modifiersString,
      });
      const modLines = getReceiptModifierLines(parsed, true);
      const mods = modLines.map((l) => `<div class="mod-line">» <b>${l.label}:</b> ${l.value}</div>`).join('');

      itemsHtml += `
        <div class="item-block">
          <div class="row">
            <span class="item-name">${pItem.qty}x ${pItem.name}</span>
            <span class="item-price">
              ${pItem.hasDiscount ? `<span style="text-decoration: line-through; color: #666; font-size: 10px; margin-right: 4px;">${formatRupiah(pItem.totalOriginalPrice)}</span>` : ''}
              ${formatRupiah(pItem.totalFinalPrice)}
            </span>
          </div>
          ${mods ? `<div class="mod-container">${mods}</div>` : ''}
        </div>
      `;
    });

    htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Struk ${storeName}</title>
          <style>
            @page { size: ${pageSizeStyle}; margin: 0; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              width: ${paperWidthStyle};
              margin: 0 auto;
              padding: 2mm 0 10mm 0;
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              line-height: 1.35;
              color: #000000;
              background: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .logo-wrap { text-align: center; margin-bottom: 4px; }
            .logo-img {
              max-width: 85px;
              max-height: 38px;
              object-fit: contain;
              filter: grayscale(100%) contrast(200%);
              display: inline-block;
            }
            .store-name {
              font-size: 13px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 1px;
            }
            .store-sub { font-size: 9.5px; color: #111; margin-bottom: 1px; }
            .divider { border-top: 1px dashed #000; margin: 4px 0; width: 100%; }
            .divider-solid { border-top: 1px solid #000; margin: 4px 0; width: 100%; }
            .row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              width: 100%;
              margin-bottom: 1.5px;
              font-size: 10.5px;
            }
            .item-block { margin-bottom: 4px; }
            .item-name { font-weight: bold; font-size: 11px; flex: 1; padding-right: 4px; }
            .item-price { font-weight: bold; font-size: 11px; white-space: nowrap; }
            .mod-container { padding-left: 8px; font-size: 9.5px; color: #222; margin-top: 1px; }
            .mod-line { margin-top: 1px; }
            .row-total {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 12px;
              font-weight: bold;
              padding: 2px 0;
            }
            .footer-text {
              font-size: 9.5px;
              text-align: center;
              line-height: 1.3;
              margin-top: 4px;
              white-space: pre-line;
            }
            .wifi-text { font-size: 9.5px; text-align: center; padding: 2px 0; }
          </style>
        </head>
        <body>
          ${settings.showLogo && settings.logoUrl ? `
            <div class="logo-wrap">
              <img src="${settings.logoUrl}" class="logo-img" alt="Logo" />
            </div>
          ` : ''}

          <div class="center">
            <div class="store-name">${storeName}</div>
            ${settings.tagline ? `<div class="store-sub">${settings.tagline}</div>` : ''}
            ${settings.address ? `<div class="store-sub">${settings.address}</div>` : ''}
            ${settings.phone ? `<div class="store-sub">WA: ${settings.phone}</div>` : ''}
            ${settings.headerNotes ? `<div class="store-sub" style="font-style:italic;">${settings.headerNotes}</div>` : ''}
          </div>

          <div class="divider"></div>

          <div class="row">
            <span>No. Order:</span>
            <span class="bold">#${orderIdShort}</span>
          </div>
          ${order.queueNumber ? `
            <div class="row">
              <span>No. Antrian:</span>
              <span class="bold">A-${order.queueNumber}</span>
            </div>
          ` : ''}
          <div class="row">
            <span>Waktu:</span>
            <span>${formattedDate} ${formattedTime}</span>
          </div>
          <div class="row">
            <span>Tipe:</span>
            <span class="bold">${order.orderType === 'DINE_IN' ? `DINE IN ${order.tableNumber ? `(Meja ${order.tableNumber})` : ''}` : order.orderType}</span>
          </div>
          <div class="row">
            <span>Pelanggan:</span>
            <span class="bold">${order.customerName}</span>
          </div>

          <div class="divider"></div>

          <div style="margin: 4px 0;">
            ${itemsHtml}
          </div>

          <div class="divider"></div>

          <div class="row">
            <span>Subtotal</span>
            <span>${formatRupiah(summary.grossSubtotal)}</span>
          </div>
          ${summary.totalFlashSaleDiscount > 0 ? `
            <div class="row">
              <span>Diskon Flash Sale</span>
              <span>-${formatRupiah(summary.totalFlashSaleDiscount)}</span>
            </div>
          ` : ''}
          ${summary.voucherDiscount > 0 ? `
            <div class="row">
              <span>${summary.voucherLabel}</span>
              <span>-${formatRupiah(summary.voucherDiscount)}</span>
            </div>
          ` : ''}
          ${summary.tumblerDiscount > 0 ? `
            <div class="row">
              <span>Diskon Bawa Tumbler</span>
              <span>-${formatRupiah(summary.tumblerDiscount)}</span>
            </div>
          ` : ''}
          ${summary.deliveryFee > 0 ? `
            <div class="row">
              <span>Ongkos Kirim</span>
              <span>${formatRupiah(summary.deliveryFee)}</span>
            </div>
          ` : ''}

          <div class="divider-solid"></div>

          <div class="row-total">
            <span>TOTAL</span>
            <span>${formatRupiah(summary.finalTotal)}</span>
          </div>
          <div class="row">
            <span>Metode (${order.paymentMethod})</span>
            <span>${formatRupiah(order.total)}</span>
          </div>
          ${order.cashPaid ? `
            <div class="row">
              <span>Tunai Diterima</span>
              <span>${formatRupiah(order.cashPaid)}</span>
            </div>
            <div class="row">
              <span class="bold">Kembalian</span>
              <span class="bold">${formatRupiah(order.change || 0)}</span>
            </div>
          ` : ''}

          ${order.pointsEarned && order.pointsEarned > 0 ? `
            <div class="divider"></div>
            <div class="center" style="font-size: 9.5px; font-weight: bold;">
              Poin Didapat: +${order.pointsEarned} Poin
              ${order.totalPoints ? `<div style="font-size: 8.5px; font-weight: normal;">Total Poin: ${order.totalPoints} Poin</div>` : ''}
            </div>
          ` : ''}

          ${settings.showWifi && settings.wifiSsid ? `
            <div class="divider"></div>
            <div class="wifi-text">
              Wi-Fi: <b>${settings.wifiSsid}</b><br/>
              ${settings.wifiPassword ? `Pass: <b>${settings.wifiPassword}</b>` : ''}
            </div>
          ` : ''}

          <div class="divider"></div>

          <div class="footer-text">
            ${settings.footerNotes ? `${settings.footerNotes}` : ''}
            ${settings.showSocial && settings.instagram ? `<div style="font-weight: bold; margin-top: 3px;">IG: ${settings.instagram}</div>` : ''}
            <div style="font-size: 8px; color: #666; margin-top: 4px;">*** ${storeName} ***</div>
          </div>
        </body>
      </html>
    `;
  }

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
}
