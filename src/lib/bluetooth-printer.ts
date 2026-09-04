/**
 * Web Bluetooth ESC/POS Direct Thermal Printer Driver for Arum Seduh
 * Supported Hardware: Algoo AT-5805, 58mm Bluetooth Printers (Panda, Goojprt, MPT, POS-58)
 */

import { formatRupiah } from './utils';
import { parseItemModifiers, getReceiptModifierLines, calculateGrossReceiptSummary } from './receipt-modifiers';
import html2canvas from 'html2canvas';

export interface BluetoothPrinterDevice {
  id: string;
  name: string;
  connected: boolean;
}

// Common GATT Services used by Thermal POS Bluetooth Printers
const COMMON_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000fee7-0000-1000-8000-00805f9b34fb',
  '0000ae30-0000-1000-8000-00805f9b34fb',
  '0000ae00-0000-1000-8000-00805f9b34fb',
  0x18f0,
  0xff00,
  0xfee7,
  0xae30,
  0xae00,
];

// Singleton active Bluetooth characteristic
let activeCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
let activeDevice: BluetoothDevice | null = null;
let connectionListeners: Array<(connected: boolean, deviceName: string | null) => void> = [];

/**
 * Memeriksa apakah browser saat ini mendukung API Web Bluetooth standar.
 *
 * @returns True jika browser mendukung Web Bluetooth (Chrome/Edge/Android WebView)
 */
export function isWebBluetoothSupported(): boolean {
  return typeof window !== 'undefined' && 'bluetooth' in navigator;
}

/**
 * Memeriksa status konektivitas printer thermal Bluetooth aktif.
 *
 * @returns True jika ada perangkat Bluetooth yang terhubung dan siap menerima data ESC/POS
 */
export function isBluetoothPrinterConnected(): boolean {
  return activeDevice !== null && activeDevice.gatt?.connected === true && activeCharacteristic !== null;
}

/**
 * Mengambil nama perangkat printer Bluetooth yang sedang terhubung.
 *
 * @returns Nama printer (contoh: "Algoo AT-5805" atau "POS-58") atau null jika terputus
 */
export function getConnectedBluetoothDeviceName(): string | null {
  if (isBluetoothPrinterConnected() && activeDevice) {
    return activeDevice.name || 'Algoo AT-5805';
  }
  return null;
}

/**
 * Berlangganan (subscribe) terhadap perubahan status koneksi printer Bluetooth.
 * Mengembalikan fungsi unsubscribe untuk pembersihan listener saat unmount komponen React.
 *
 * @param listener - Callback yang dipanggil setiap kali koneksi Bluetooth berubah
 * @returns Fungsi unsubscribe
 */
export function subscribeBluetoothStatus(listener: (connected: boolean, deviceName: string | null) => void) {
  connectionListeners.push(listener);
  listener(isBluetoothPrinterConnected(), getConnectedBluetoothDeviceName());
  return () => {
    connectionListeners = connectionListeners.filter((l) => l !== listener);
  };
}

function notifyStatusChange() {
  const connected = isBluetoothPrinterConnected();
  const name = getConnectedBluetoothDeviceName();
  connectionListeners.forEach((l) => l(connected, name));
}

/**
 * Membuka dialog pemindaian Bluetooth perangkat keras dan menyambungkan
 * koneksi GATT ke printer thermal ESC/POS 58mm/80mm (misalnya Algoo AT-5805).
 *
 * @returns Status keberhasilan koneksi beserta nama perangkat atau pesan error
 */
export async function connectBluetoothPrinter(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
  if (!isWebBluetoothSupported()) {
    return { success: false, error: 'Web Bluetooth tidak didukung pada browser ini. Gunakan Google Chrome atau Microsoft Edge.' };
  }

  try {
    const navBluetooth = (navigator as unknown as { bluetooth: Bluetooth }).bluetooth;

    // Request Bluetooth device pairing dialog
    const device = await navBluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: COMMON_PRINTER_SERVICES,
    });

    if (!device) {
      return { success: false, error: 'Tidak ada perangkat yang dipilih' };
    }

    const server = await device.gatt.connect();

    // Search for writable characteristic across available services
    let targetChar: any = null;
    const services = await server.getPrimaryServices();

    for (const service of services) {
      try {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            targetChar = char;
            break;
          }
        }
        if (targetChar) break;
      } catch {}
    }

    if (!targetChar) {
      return { success: false, error: 'Tidak dapat menemukan channel data cetak pada printer ini.' };
    }

    activeDevice = device;
    activeCharacteristic = targetChar;

    device.addEventListener('gattserverdisconnected', () => {
      activeCharacteristic = null;
      activeDevice = null;
      notifyStatusChange();
    });

    notifyStatusChange();
    return { success: true, deviceName: device.name || 'Algoo AT-5805' };
  } catch (err: any) {
    if (err.name === 'NotFoundError') {
      return { success: false, error: 'Pencarian Bluetooth dibatalkan' };
    }
    return { success: false, error: err.message || 'Gagal menyambungkan Bluetooth printer' };
  }
}

/**
 * Memutus koneksi GATT Web Bluetooth yang sedang aktif secara aman dan mereset status internal.
 */
export function disconnectBluetoothPrinter(): void {
  if (activeDevice && activeDevice.gatt?.connected) {
    activeDevice.gatt.disconnect();
  }
  activeDevice = null;
  activeCharacteristic = null;
  notifyStatusChange();
}

/**
 * Send raw binary data chunks to Bluetooth printer safely
 */
async function sendRawBytes(bytes: Uint8Array): Promise<boolean> {
  if (!activeCharacteristic) return false;

  const CHUNK_SIZE = 64; // Safe BLE MTU chunk size
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.slice(i, i + CHUNK_SIZE);
    try {
      if (activeCharacteristic.writeValueWithoutResponse) {
        await activeCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await activeCharacteristic.writeValue(chunk);
      }
    } catch {
      await activeCharacteristic.writeValue(chunk);
    }
    // Small delay between chunks to let printer buffer process
    await new Promise((r) => setTimeout(r, 20));
  }
  return true;
}

// Helper: Format 2 columns to fit 32 chars width (58mm thermal paper)
function padLine(left: string, right: string, maxLen = 32): string {
  const l = left.trim();
  const r = right.trim();
  const spaces = maxLen - l.length - r.length;
  if (spaces > 0) {
    return l + ' '.repeat(spaces) + r + '\n';
  }
  if (spaces === 0) {
    return l + r + '\n';
  }
  const truncatedLeft = l.slice(0, Math.max(1, maxLen - r.length - 1));
  return truncatedLeft + ' ' + r + '\n';
}

function centerText(text: string, maxLen = 32): string {
  const t = text.trim();
  if (t.length >= maxLen) return t.slice(0, maxLen) + '\n';
  const pad = Math.floor((maxLen - t.length) / 2);
  return ' '.repeat(pad) + t + '\n';
}

function cleanAscii(str: string): string {
  return str
    .replace(/[\u00A0\u202F\u2007\u200B]/g, ' ')
    .replace(/[»›]/g, '>>')
    .replace(/[«‹]/g, '<<')
    .replace(/[•●·]/g, '*')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

function wrapText(text: string, maxLen = 32): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/);
    let currentLine = '';
    for (const word of words) {
      if (!word) continue;
      if (!currentLine) {
        currentLine = word;
      } else if (currentLine.length + 1 + word.length <= maxLen) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  }
  return lines;
}

/**
 * Menyusun byte stream biner ESC/POS untuk struk pelanggan dengan tata letak tiket bioskop CGV (CGV Cinema Ticket Style).
 * Dilengkapi border tabel rapi, rincian diskon transparan (Rule 8), format modifier konsisten (Rule 7),
 * dan perintah feed/tear-off kertas.
 *
 * @param order - Objek data pesanan lengkap
 * @param settings - Konfigurasi cetak kasir (nama outlet, kontak, lebar kertas 58mm/80mm)
 * @returns Uint8Array berisi urutan command ESC/POS mentah yang siap dikirim ke printer
 */
export function buildCustomerReceiptEscPos(order: any, settings: any): Uint8Array {
  const encoder = new TextEncoder();
  const buffer: number[] = [];

  const write = (arr: number[]) => buffer.push(...arr);
  const writeText = (str: string) => buffer.push(...Array.from(encoder.encode(cleanAscii(str))));

  const storeName = settings.storeName || 'ARUM SEDUH';
  const orderIdShort = (order.id || '').slice(0, 8).toUpperCase();
  const totalDiscount = (order.discount || 0) + (order.tumblerDiscount || 0) + (order.voucherDiscount || 0);

  const orderDate = new Date(order.createdAt || Date.now());
  const formattedDate = orderDate.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const formattedTime = orderDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const maxCols = settings.paperWidth === '80mm' ? 48 : 32;

  // ESC/POS Formatting Helpers
  const reverseOn = () => write([0x1d, 0x42, 0x01]);  // GS B 1 (White text on black background)
  const reverseOff = () => write([0x1d, 0x42, 0x00]); // GS B 0 (Normal)
  const boldOn = () => write([0x1b, 0x45, 0x01]);     // ESC E 1
  const boldOff = () => write([0x1b, 0x45, 0x00]);    // ESC E 0
  const alignCenter = () => write([0x1b, 0x61, 0x01]);
  const alignLeft = () => write([0x1b, 0x61, 0x00]);

  // 1. Initialize Printer (ESC @)
  write([0x1b, 0x40]);

  // 2. Header
  alignCenter();
  write([0x1b, 0x21, 0x30]); // Double width & height
  writeText(`${storeName.toUpperCase()}\n`);
  write([0x1b, 0x21, 0x00]); // Normal text

  if (settings.tagline) {
    wrapText(settings.tagline, maxCols).forEach((l) => writeText(`${l}\n`));
  }
  if (settings.address) {
    wrapText(settings.address, maxCols).forEach((l) => writeText(`${l}\n`));
  }
  if (settings.phone) writeText(`WA: ${settings.phone}\n`);
  if (settings.headerNotes) {
    wrapText(settings.headerNotes, maxCols).forEach((l) => writeText(`${l}\n`));
  }

  writeText('================================\n');

  // 3. Section 1: Inverted Black Ribbon [ PESANAN ] + Customer Name
  alignLeft();
  reverseOn();
  boldOn();
  writeText(' PESANAN ');
  reverseOff();
  boldOff();
  writeText('\n');

  boldOn();
  write([0x1b, 0x21, 0x20]); // Double width
  writeText(`${(order.customerName || 'PELANGGAN').toUpperCase()}\n`);
  write([0x1b, 0x21, 0x00]); // Normal size
  boldOff();
  writeText(`No. Order : #${orderIdShort}\n`);

  writeText('--------------------------------\n');

  // 4. Section 2: CGV 2-Column Split Box (WAKTU & NOMOR MEJA)
  const tableDisplay = order.tableNumber 
    ? `MEJA ${order.tableNumber}` 
    : (order.queueNumber ? `ANTRIAN A-${order.queueNumber}` : (order.orderType || 'PICKUP'));

  writeText('+--------------------+---------+\n');
  writeText('| WAKTU & TANGGAL    | LOKASI  |\n');
  writeText(`| ${formattedDate} ${formattedTime} | `);
  boldOn();
  writeText(`${tableDisplay.slice(0, 7).padEnd(7)} |\n`);
  boldOff();
  writeText('+--------------------+---------+\n');

  // 5. Section 3: Inverted Black Ribbon [ DETAIL PESANAN ]
  reverseOn();
  boldOn();
  writeText(' DETAIL PESANAN ');
  reverseOff();
  boldOff();
  writeText('\n');

  const summary = calculateGrossReceiptSummary(order);

  (summary.items || []).forEach((pItem: any) => {
    const itemTitle = `[ ${pItem.qty}x ] ${pItem.name.toUpperCase()}`;
    const priceStr = pItem.hasDiscount
      ? `${formatRupiah(pItem.totalOriginalPrice)}->${formatRupiah(pItem.totalFinalPrice)}`
      : formatRupiah(pItem.totalFinalPrice);

    boldOn();
    if (itemTitle.length + priceStr.length + 1 <= maxCols) {
      writeText(padLine(itemTitle, priceStr, maxCols));
    } else {
      writeText(`${itemTitle}\n`);
      writeText(padLine('', priceStr, maxCols));
    }
    boldOff();

    // Modifiers in Bold with clear vertical line indicator
    boldOn();
    const parsed = parseItemModifiers({
      ...pItem.rawItem,
      originalPrice: pItem.unitOriginalPrice,
      promoDiscount: pItem.unitDiscount,
      price: pItem.unitFinalPrice,
      modifiersString: pItem.modifiersString,
    });
    const modLines = getReceiptModifierLines(parsed, true);
    modLines.forEach((m) => {
      writeText(`  | >> ${m.label.padEnd(7)}: ${m.value}\n`);
    });
    boldOff();
    writeText('--------------------------------\n');
  });

  // 6. Barcode Graphic
  alignCenter();
  writeText('|||| | ||||| || ||||||||| | |||\n');
  writeText(`${order.id || orderIdShort}\n`);
  alignLeft();

  // 7. Payment Summary
  writeText(padLine('Subtotal:', formatRupiah(summary.grossSubtotal), maxCols));
  if (summary.totalFlashSaleDiscount > 0) {
    writeText(padLine('Diskon Flash Sale:', `-${formatRupiah(summary.totalFlashSaleDiscount)}`, maxCols));
  }
  if (summary.voucherDiscount > 0) {
    const vLabel = summary.voucherLabel.length > 17 ? summary.voucherLabel.slice(0, 16) + '…:' : `${summary.voucherLabel}:`;
    writeText(padLine(vLabel, `-${formatRupiah(summary.voucherDiscount)}`, maxCols));
  }
  if (summary.tumblerDiscount > 0) {
    writeText(padLine('Diskon Bawa Tumbler:', `-${formatRupiah(summary.tumblerDiscount)}`, maxCols));
  }
  if (summary.deliveryFee > 0) {
    writeText(padLine('Ongkos Kirim:', formatRupiah(summary.deliveryFee), maxCols));
  }

  // 8. Solid Black TOTAL Banner (Inverted Ribbon)
  alignCenter();
  reverseOn();
  boldOn();
  write([0x1b, 0x21, 0x10]); // Double height
  writeText(padLine(' TOTAL', `${formatRupiah(summary.finalTotal)} `, maxCols));
  write([0x1b, 0x21, 0x00]); // Normal text
  boldOff();
  reverseOff();
  alignLeft();

  writeText(`Metode Pembayaran: ${order.paymentMethod || 'TUNAI'} (LUNAS)\n`);
  if (order.cashPaid) {
    writeText(padLine('Tunai Diterima:', formatRupiah(order.cashPaid), maxCols));
    boldOn();
    writeText(padLine('Kembalian:', formatRupiah(order.change || 0), maxCols));
    boldOff();
  }

  // 9. Loyalty Points Info
  if (order.pointsEarned && order.pointsEarned > 0) {
    writeText('--------------------------------\n');
    alignCenter();
    boldOn();
    writeText(`POIN DIPEROLEH: +${order.pointsEarned} POIN\n`);
    boldOff();
    if (order.totalPoints) writeText(`TOTAL POIN MEMBER: ${order.totalPoints} POIN\n`);
    alignLeft();
  }

  // 10. CGV Style Member Voucher Box
  writeText('+==============================+\n');
  alignCenter();
  reverseOn();
  boldOn();
  writeText('  GRATIS VOUCHER & CASHBACK   \n');
  reverseOff();
  writeText(' DENGAN JOIN MEMBER ARUM SEDUH \n');
  writeText(' Kumpulkan Poin Tiap Belanja  \n');
  boldOff();
  alignLeft();
  writeText('+==============================+\n');

  if (settings.showWifi && settings.wifiSsid) {
    writeText(`Wi-Fi: ${settings.wifiSsid} | Pass: ${settings.wifiPassword || '-'}\n`);
    writeText('--------------------------------\n');
  }

  // 11. Footer Greetings
  alignCenter();
  if (settings.footerNotes) {
    wrapText(settings.footerNotes, maxCols).forEach((l) => writeText(`${l}\n`));
  }
  if (settings.showSocial && settings.instagram) {
    boldOn();
    writeText(`IG: ${settings.instagram}\n`);
    boldOff();
  }
  if (settings.showSocial && settings.tiktok) {
    boldOn();
    writeText(`TikTok: ${settings.tiktok}\n`);
    boldOff();
  }
  writeText('*** TERIMA KASIH • SELAMAT MENIKMATI ***\n');

  // Feed 4 lines for paper tearing
  write([0x1b, 0x64, 0x04]);

  return new Uint8Array(buffer);
}

/**
 * Menyusun byte stream biner ESC/POS untuk tiket pesanan dapur/barista (CGV Barista Ticket).
 * Berisi nomor meja/antrean berukuran besar, nama pelanggan, waktu masuk pesanan,
 * dan daftar produk beserta modifier (es, gula, shot, topping) berukuran double-height.
 *
 * @param order - Objek data pesanan
 * @param settings - Konfigurasi printer (opsional)
 * @returns Uint8Array stream ESC/POS
 */
export function buildKitchenTicketEscPos(order: any, settings?: any): Uint8Array {
  const encoder = new TextEncoder();
  const buffer: number[] = [];

  const write = (arr: number[]) => buffer.push(...arr);
  const writeText = (str: string) => buffer.push(...Array.from(encoder.encode(cleanAscii(str))));

  const orderIdShort = (order.id || '').slice(0, 8).toUpperCase();
  const orderDate = new Date(order.createdAt || Date.now());
  const formattedTime = orderDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const maxCols = settings?.paperWidth === '80mm' ? 48 : 32;

  const reverseOn = () => write([0x1d, 0x42, 0x01]);
  const reverseOff = () => write([0x1d, 0x42, 0x00]);
  const boldOn = () => write([0x1b, 0x45, 0x01]);
  const boldOff = () => write([0x1b, 0x45, 0x00]);
  const alignCenter = () => write([0x1b, 0x61, 0x01]);
  const alignLeft = () => write([0x1b, 0x61, 0x00]);

  // 1. Initialize
  write([0x1b, 0x40]);

  // 2. Title Inverted Ribbon
  alignCenter();
  reverseOn();
  boldOn();
  writeText(' KITCHEN / BARISTA TICKET \n');
  reverseOff();
  boldOff();
  writeText('\n');

  const tableDisplay = order.tableNumber 
    ? `MEJA ${order.tableNumber}` 
    : (order.queueNumber ? `ANTRIAN A-${order.queueNumber}` : (order.orderType || 'PICKUP'));

  alignLeft();
  writeText('+--------------------+---------+\n');
  writeText('| PELANGGAN / ORDER  | LOKASI  |\n');
  writeText(`| ${(order.customerName || 'PELANGGAN').slice(0, 18).padEnd(18)} | `);
  boldOn();
  writeText(`${tableDisplay.slice(0, 7).padEnd(7)} |\n`);
  boldOff();
  writeText(`| #${orderIdShort.padEnd(17)} | ${formattedTime} |\n`);
  writeText('+--------------------+---------+\n');

  // Items for Barista
  (order.items || []).forEach((item: any) => {
    boldOn();
    write([0x1b, 0x21, 0x10]); // Double height
    writeText(`[ ${item.qty}x ] ${item.name.toUpperCase()}\n`);
    write([0x1b, 0x21, 0x00]); // Normal size
    boldOff();

    // Modifiers
    boldOn();
    const parsed = parseItemModifiers(item);
    const modLines = getReceiptModifierLines(parsed, false);
    modLines.forEach((m) => {
      writeText(`  >> ${m.label.padEnd(7)}: ${m.value}\n`);
    });
    boldOff();
    writeText('--------------------------------\n');
  });

  if (order.notes) {
    reverseOn();
    boldOn();
    writeText(' CATATAN KHUSUS: \n');
    reverseOff();
    boldOff();
    writeText(`${order.notes}\n`);
    writeText('--------------------------------\n');
  }

  alignCenter();
  writeText('--- SELESAIKAN & SAJIKAN ---\n');

  // Feed 4 lines
  write([0x1b, 0x64, 0x04]);

  return new Uint8Array(buffer);
}

/**
 * Mencetak struk secara langsung ke printer Web Bluetooth tanpa memunculkan dialog cetak browser (ESC/POS Text Mode).
 *
 * @param order - Objek data pesanan
 * @param settings - Konfigurasi cetak
 * @param isKitchen - True jika mencetak tiket dapur barista
 * @returns True jika pengiriman byte stream berhasil
 */
export async function printDirectBluetooth(order: any, settings: any, isKitchen = false): Promise<boolean> {
  if (!isBluetoothPrinterConnected()) {
    return false;
  }

  const bytes = isKitchen
    ? buildKitchenTicketEscPos(order, settings)
    : buildCustomerReceiptEscPos(order, settings);

  return await sendRawBytes(bytes);
}

/**
 * Merender struk gaya tiket bioskop CGV ke elemen HTML5 Canvas secara presisi (384px untuk 58mm, 576px untuk 80mm).
 * Memberikan kesetiaan visual 100% dengan banner hitam solid, divider tebal, dan tipografi monospaced.
 *
 * @param order - Objek data pesanan
 * @param settings - Konfigurasi tampilan struk
 * @param isKitchen - True jika tiket dapur
 * @returns HTMLCanvasElement hasil rendering grafik monokrom
 */
export function renderCgvTicketCanvas(
  order: any,
  settings: any,
  isKitchen = false
): HTMLCanvasElement {
  const width = settings?.paperWidth === '80mm' ? 576 : 384;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  
  // Calculate dynamic height
  const summary = calculateGrossReceiptSummary(order);
  const items = isKitchen ? (order.items || []) : summary.items;
  let modifierLinesCount = 0;
  items.forEach((pItem: any) => {
    const parsed = parseItemModifiers({
      ...(pItem.rawItem || pItem),
      originalPrice: pItem.unitOriginalPrice,
      promoDiscount: pItem.unitDiscount,
      price: pItem.unitFinalPrice || pItem.price,
      modifiersString: pItem.modifiersString || pItem.modifiers,
    });
    const lines = getReceiptModifierLines(parsed, !isKitchen);
    modifierLinesCount += lines.length;
  });

  const extraDiscountRows = (summary.totalFlashSaleDiscount > 0 ? 1 : 0) +
    (summary.voucherDiscount > 0 ? 1 : 0) +
    (summary.tumblerDiscount > 0 ? 1 : 0) +
    (summary.deliveryFee > 0 ? 1 : 0);

  const estimatedHeight = 680 + (items.length * 48) + (modifierLinesCount * 24) + (extraDiscountRows * 20);
  canvas.height = estimatedHeight;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, estimatedHeight);

  let y = 14;
  const paddingX = 14;
  const contentWidth = width - (paddingX * 2);

  // Helper: Draw Solid Black Badge with White Text
  const drawBadge = (text: string, x: number, currentY: number, fontSize = 11, fontBold = true): { width: number; height: number } => {
    ctx.font = `${fontBold ? '900' : 'bold'} ${fontSize}px monospace, sans-serif`;
    const textMetrics = ctx.measureText(text);
    const badgeW = Math.round(textMetrics.width + 10);
    const badgeH = fontSize + 8;
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, currentY, badgeW, badgeH);

    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + 5, currentY + (badgeH / 2));
    ctx.textBaseline = 'alphabetic';
    return { width: badgeW, height: badgeH };
  };

  // Helper: Draw Horizontal Divider Line
  const drawDivider = (currentY: number, lineStyle: 'solid' | 'dashed' | 'double' = 'solid') => {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = lineStyle === 'double' ? 2 : 1;
    if (lineStyle === 'dashed') {
      ctx.setLineDash([4, 3]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.beginPath();
    ctx.moveTo(paddingX, currentY);
    ctx.lineTo(width - paddingX, currentY);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  if (!isKitchen) {
    // ================= CUSTOMER CGV CINEMA TICKET =================
    // 1. Header (Store Name & Info)
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    
    ctx.font = '900 17px monospace, sans-serif';
    ctx.fillText((settings?.storeName || 'ARUM SEDUH').toUpperCase(), width / 2, y + 16);
    y += 24;

    if (settings?.tagline) {
      ctx.font = 'bold 11px monospace, sans-serif';
      ctx.fillText(settings.tagline, width / 2, y + 10);
      y += 16;
    }
    if (settings?.address) {
      ctx.font = 'normal 10px monospace, sans-serif';
      ctx.fillText(settings.address, width / 2, y + 10);
      y += 15;
    }
    if (settings?.phone) {
      ctx.font = 'normal 10px monospace, sans-serif';
      ctx.fillText(`WA: ${settings.phone}`, width / 2, y + 10);
      y += 15;
    }
    if (settings?.headerNotes) {
      ctx.font = 'italic 9.5px monospace, sans-serif';
      ctx.fillText(settings.headerNotes, width / 2, y + 10);
      y += 15;
    }

    y += 8;
    drawDivider(y, 'double');
    y += 12;

    // 2. Section 1: Inverted Black Ribbon [ PESANAN ] + Customer Name
    ctx.textAlign = 'left';
    const badge1 = drawBadge('PESANAN', paddingX, y, 11, true);
    y += badge1.height + 6;

    ctx.fillStyle = '#000000';
    ctx.font = '900 16px monospace, sans-serif';
    ctx.fillText((order.customerName || 'PELANGGAN').toUpperCase(), paddingX, y + 14);
    y += 20;

    ctx.font = 'bold 11px monospace, sans-serif';
    ctx.fillStyle = '#333333';
    const orderIdShort = (order.id || '').slice(0, 8).toUpperCase();
    ctx.fillText(`ORDER: #${orderIdShort}`, paddingX, y + 10);
    y += 18;

    // 3. Section 2: CGV 2-Column Split Box (WAKTU & NOMOR MEJA)
    const boxY = y;
    const boxH = 58;
    const col1W = Math.round(contentWidth * 0.58);
    const col2W = contentWidth - col1W;

    // Outer Border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(paddingX, boxY, contentWidth, boxH);
    // Column Splitter
    ctx.beginPath();
    ctx.moveTo(paddingX + col1W, boxY);
    ctx.lineTo(paddingX + col1W, boxY + boxH);
    ctx.stroke();

    // Column 1: Waktu & Tanggal
    drawBadge('WAKTU & TANGGAL', paddingX + 6, boxY + 6, 9.5, true);
    const orderDate = new Date(order.createdAt || Date.now());
    const formattedDate = orderDate.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const formattedTime = orderDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    
    ctx.fillStyle = '#000000';
    ctx.font = '900 12px monospace, sans-serif';
    ctx.fillText(formattedDate, paddingX + 8, boxY + 36);
    ctx.fillText(`${formattedTime} WIB`, paddingX + 8, boxY + 50);

    // Column 2: Meja / Antrian
    const tableDisplay = order.tableNumber 
      ? `MEJA ${order.tableNumber}` 
      : (order.queueNumber ? `A-${order.queueNumber}` : (order.orderType || 'PICKUP'));

    drawBadge(order.tableNumber ? 'NOMOR MEJA' : 'ANTRIAN', paddingX + col1W + 6, boxY + 6, 9.5, true);
    ctx.fillStyle = '#000000';
    ctx.font = '900 16px monospace, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(tableDisplay, paddingX + col1W + (col2W / 2), boxY + 44);
    ctx.textAlign = 'left';

    y = boxY + boxH + 14;

    // 4. Section 3: Inverted Black Ribbon [ DETAIL PESANAN ]
    const badge2 = drawBadge('DETAIL PESANAN', paddingX, y, 11, true);
    y += badge2.height + 10;

    // Items List
    summary.items.forEach((pItem: any) => {
      ctx.fillStyle = '#000000';
      ctx.font = '900 13px monospace, sans-serif';
      
      ctx.fillText(`[ ${pItem.qty}X ] ${pItem.name.toUpperCase()}`, paddingX, y + 12);
      ctx.textAlign = 'right';

      if (pItem.hasDiscount) {
        ctx.font = 'bold 10px monospace, sans-serif';
        ctx.fillStyle = '#777777';
        const origStr = formatRupiah(pItem.totalOriginalPrice);
        const finalStr = formatRupiah(pItem.totalFinalPrice);
        const finalW = ctx.measureText(finalStr).width;
        ctx.fillText(origStr, width - paddingX - finalW - 8, y + 12);

        // Strike through original price
        const origW = ctx.measureText(origStr).width;
        ctx.strokeStyle = '#777777';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(width - paddingX - finalW - 8 - origW, y + 8);
        ctx.lineTo(width - paddingX - finalW - 8, y + 8);
        ctx.stroke();

        ctx.font = '900 13px monospace, sans-serif';
        ctx.fillStyle = '#000000';
        ctx.fillText(finalStr, width - paddingX, y + 12);
      } else {
        ctx.fillText(formatRupiah(pItem.totalFinalPrice), width - paddingX, y + 12);
      }
      ctx.textAlign = 'left';
      y += 18;

      // Modifiers Box
      const modStartX = paddingX + 8;
      const modStartY = y;
      
      const parsed = parseItemModifiers({
        ...pItem.rawItem,
        originalPrice: pItem.unitOriginalPrice,
        promoDiscount: pItem.unitDiscount,
        price: pItem.unitFinalPrice,
        modifiersString: pItem.modifiersString,
      });
      const modLines = getReceiptModifierLines(parsed, true);
      const modifierLines = modLines.map((m) => `${m.label}: ${m.value}`);

      if (modifierLines.length > 0) {
        ctx.font = 'bold 10.5px monospace, sans-serif';
        modifierLines.forEach((mod) => {
          ctx.fillStyle = '#000000';
          ctx.fillText(`» ${mod}`, modStartX + 6, y + 11);
          y += 16;
        });

        // Vertical line
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(modStartX, modStartY);
        ctx.lineTo(modStartX, y - 2);
        ctx.stroke();
      }

      y += 6;
      drawDivider(y, 'dashed');
      y += 10;
    });

    // 5. Barcode Graphic
    y += 4;
    ctx.textAlign = 'center';
    ctx.font = '900 16px monospace';
    ctx.fillText('|||| | ||||| || ||||||||| | |||', width / 2, y + 14);
    y += 18;
    ctx.font = 'bold 9.5px monospace';
    ctx.fillStyle = '#555555';
    ctx.fillText(order.id || orderIdShort, width / 2, y + 8);
    ctx.fillStyle = '#000000';
    y += 16;

    // 6. Pricing Summary
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px monospace, sans-serif';
    ctx.fillText('Subtotal:', paddingX, y + 11);
    ctx.textAlign = 'right';
    ctx.fillText(formatRupiah(summary.grossSubtotal), width - paddingX, y + 11);
    y += 16;

    if (summary.totalFlashSaleDiscount > 0) {
      ctx.textAlign = 'left';
      ctx.fillText('Diskon Flash Sale:', paddingX, y + 11);
      ctx.textAlign = 'right';
      ctx.fillText(`-${formatRupiah(summary.totalFlashSaleDiscount)}`, width - paddingX, y + 11);
      y += 16;
    }

    if (summary.voucherDiscount > 0) {
      ctx.textAlign = 'left';
      ctx.fillText(`${summary.voucherLabel}:`, paddingX, y + 11);
      ctx.textAlign = 'right';
      ctx.fillText(`-${formatRupiah(summary.voucherDiscount)}`, width - paddingX, y + 11);
      y += 16;
    }

    if (summary.tumblerDiscount > 0) {
      ctx.textAlign = 'left';
      ctx.fillText('Diskon Bawa Tumbler:', paddingX, y + 11);
      ctx.textAlign = 'right';
      ctx.fillText(`-${formatRupiah(summary.tumblerDiscount)}`, width - paddingX, y + 11);
      y += 16;
    }

    if (summary.deliveryFee > 0) {
      ctx.textAlign = 'left';
      ctx.fillText('Ongkos Kirim:', paddingX, y + 11);
      ctx.textAlign = 'right';
      ctx.fillText(formatRupiah(summary.deliveryFee), width - paddingX, y + 11);
      y += 16;
    }

    // 7. Solid Black TOTAL Banner
    y += 4;
    const bannerH = 26;
    ctx.fillStyle = '#000000';
    ctx.fillRect(paddingX, y, contentWidth, bannerH);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 14px monospace, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('TOTAL', paddingX + 8, y + (bannerH / 2));
    
    ctx.textAlign = 'right';
    ctx.fillText(formatRupiah(summary.finalTotal), width - paddingX - 8, y + (bannerH / 2));
    ctx.textBaseline = 'alphabetic';
    y += bannerH + 12;

    // Payment method
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.font = 'bold 10.5px monospace, sans-serif';
    ctx.fillText('Metode Pembayaran:', paddingX, y + 10);
    ctx.textAlign = 'right';
    ctx.fillText(`${order.paymentMethod || 'TUNAI'} (LUNAS)`, width - paddingX, y + 10);
    y += 16;

    if (order.cashPaid) {
      ctx.textAlign = 'left';
      ctx.fillText('Tunai Diterima:', paddingX, y + 10);
      ctx.textAlign = 'right';
      ctx.fillText(formatRupiah(order.cashPaid), width - paddingX, y + 10);
      y += 15;

      ctx.textAlign = 'left';
      ctx.font = '900 11px monospace, sans-serif';
      ctx.fillText('Kembalian:', paddingX, y + 10);
      ctx.textAlign = 'right';
      ctx.fillText(formatRupiah(order.change || 0), width - paddingX, y + 10);
      y += 16;
    }

    // 8. Loyalty Points
    if (order.pointsEarned && order.pointsEarned > 0) {
      y += 4;
      drawDivider(y, 'dashed');
      y += 10;
      ctx.textAlign = 'center';
      ctx.font = '900 11px monospace, sans-serif';
      ctx.fillText(`POIN DIPEROLEH: +${order.pointsEarned} POIN`, width / 2, y + 10);
      y += 16;
      if (order.totalPoints) {
        ctx.font = 'normal 9.5px monospace, sans-serif';
        ctx.fillText(`TOTAL POIN MEMBER: ${order.totalPoints} POIN`, width / 2, y + 9);
        y += 14;
      }
    }

    // 9. Member Promo Card
    y += 6;
    const promoBoxH = 50;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(paddingX, y, contentWidth, promoBoxH);
    
    ctx.textAlign = 'center';
    ctx.font = '900 11px monospace, sans-serif';
    ctx.fillText('GRATIS VOUCHER & CASHBACK', width / 2, y + 16);
    ctx.font = 'bold 9.5px monospace, sans-serif';
    ctx.fillText('DENGAN JOIN MEMBER ARUM SEDUH', width / 2, y + 30);
    ctx.font = 'normal 8.5px monospace, sans-serif';
    ctx.fillText('KUMPULKAN POIN DI SETIAP KUNJUNGAN', width / 2, y + 43);
    y += promoBoxH + 12;

    // 10. Wi-Fi Info
    if (settings?.showWifi && settings.wifiSsid) {
      drawDivider(y, 'dashed');
      y += 10;
      ctx.textAlign = 'center';
      ctx.font = 'bold 10px monospace, sans-serif';
      ctx.fillText(`Wi-Fi: ${settings.wifiSsid} | Pass: ${settings.wifiPassword || '-'}`, width / 2, y + 9);
      y += 16;
    }

    // 11. Footer Notes
    ctx.textAlign = 'center';
    if (settings?.footerNotes) {
      ctx.font = 'normal 9.5px monospace, sans-serif';
      ctx.fillText(settings.footerNotes, width / 2, y + 9);
      y += 14;
    }
    if (settings?.showSocial && settings.instagram) {
      ctx.font = '900 10px monospace, sans-serif';
      ctx.fillText(`IG: ${settings.instagram}`, width / 2, y + 10);
      y += 14;
    }
    if (settings?.showSocial && settings.tiktok) {
      ctx.font = '900 9.5px monospace, sans-serif';
      ctx.fillText(`TikTok: ${settings.tiktok}`, width / 2, y + 9);
      y += 14;
    }

    ctx.font = 'normal 8.5px monospace, sans-serif';
    ctx.fillStyle = '#666666';
    ctx.fillText('*** TERIMA KASIH • SELAMAT MENIKMATI ***', width / 2, y + 10);
    y += 25;
  } else {
    // ================= KITCHEN / BARISTA TICKET =================
    ctx.textAlign = 'center';
    drawBadge('KITCHEN / BARISTA TICKET', (width - 180) / 2, y, 11, true);
    y += 26;

    const tableDisplay = order.tableNumber 
      ? `MEJA ${order.tableNumber}` 
      : (order.queueNumber ? `A-${order.queueNumber}` : (order.orderType || 'PICKUP'));

    ctx.textAlign = 'left';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(paddingX, y, contentWidth, 42);

    ctx.font = '900 14px monospace, sans-serif';
    ctx.fillText(`CUST: ${(order.customerName || 'PELANGGAN').toUpperCase()}`, paddingX + 8, y + 18);
    ctx.fillText(tableDisplay, width - paddingX - 70, y + 18);

    ctx.font = 'bold 10.5px monospace, sans-serif';
    const orderIdShort = (order.id || '').slice(0, 8).toUpperCase();
    ctx.fillText(`ORDER: #${orderIdShort}`, paddingX + 8, y + 34);
    y += 50;

    items.forEach((item: any) => {
      ctx.fillStyle = '#000000';
      ctx.font = '900 14px monospace, sans-serif';
      ctx.fillText(`[ ${item.qty}X ] ${item.name.toUpperCase()}`, paddingX, y + 14);
      y += 20;

      const modStartX = paddingX + 8;
      const modStartY = y;
      
      const parsed = parseItemModifiers(item);
      const modLines = getReceiptModifierLines(parsed, false);
      const modifierLines = modLines.map((m) => `${m.label}: ${m.value}`);

      if (modifierLines.length > 0) {
        ctx.font = 'bold 11px monospace, sans-serif';
        modifierLines.forEach((mod) => {
          ctx.fillText(`» ${mod}`, modStartX + 6, y + 12);
          y += 16;
        });

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(modStartX, modStartY);
        ctx.lineTo(modStartX, y - 2);
        ctx.stroke();
      }

      y += 6;
      drawDivider(y, 'solid');
      y += 10;
    });

    if (order.notes) {
      drawBadge('CATATAN KHUSUS', paddingX, y, 10, true);
      y += 20;
      ctx.font = 'bold 11px monospace, sans-serif';
      ctx.fillText(order.notes, paddingX, y + 10);
      y += 20;
      drawDivider(y, 'solid');
      y += 10;
    }

    ctx.textAlign = 'center';
    ctx.font = '900 11px monospace, sans-serif';
    ctx.fillText('--- SELESAIKAN & SAJIKAN ---', width / 2, y + 12);
    y += 25;
  }

  // Crop canvas to actual content height
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = width;
  finalCanvas.height = y;
  const finalCtx = finalCanvas.getContext('2d');
  if (finalCtx) {
    finalCtx.drawImage(canvas, 0, 0, width, y, 0, 0, width, y);
    return finalCanvas;
  }
  return canvas;
}

/**
 * Mencetak objek HTMLCanvasElement sebagai gambar bitmap raster monokrom ESC/POS (GS v 0).
 * Menggunakan algoritma kuantisasi luminansi greyscale dengan slicing vertikal 64-dot
 * untuk pengiriman data cepat tanpa meluapkan buffer RAM printer.
 *
 * @param canvas - Elemen kanvas yang akan dicetak
 * @param paperWidth - Ukuran kertas ('58mm' atau '80mm')
 * @returns True jika pencetakan berhasil
 */
export async function printCanvasAsRasterBluetooth(
  canvas: HTMLCanvasElement,
  paperWidth: string = '58mm'
): Promise<boolean> {
  if (!isBluetoothPrinterConnected()) {
    return false;
  }

  const targetWidth = paperWidth === '80mm' ? 576 : 384;
  const widthBytes = targetWidth / 8;
  const targetHeight = canvas.height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;

  const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const pixels = imgData.data;

  const buffer: number[] = [];
  const write = (arr: number[]) => buffer.push(...arr);

  // Initialize printer (ESC @)
  write([0x1b, 0x40]);
  // Set line spacing to 0 for seamless vertical slice joining
  write([0x1b, 0x33, 0x00]);

  // Slice image into vertical chunks (64 dots height for fast, safe buffer transfer)
  const SLICE_HEIGHT = 64;
  for (let yOffset = 0; yOffset < targetHeight; yOffset += SLICE_HEIGHT) {
    const currentSliceHeight = Math.min(SLICE_HEIGHT, targetHeight - yOffset);

    // GS v 0 0 xL xH yL yH
    write([
      0x1d, 0x76, 0x30, 0x00,
      widthBytes % 256,
      Math.floor(widthBytes / 256),
      currentSliceHeight % 256,
      Math.floor(currentSliceHeight / 256),
    ]);

    for (let y = 0; y < currentSliceHeight; y++) {
      const row = yOffset + y;
      for (let xByte = 0; xByte < widthBytes; xByte++) {
        let byteVal = 0;
        for (let b = 0; b < 8; b++) {
          const x = xByte * 8 + b;
          const pixelIndex = (row * targetWidth + x) * 4;
          const r = pixels[pixelIndex];
          const g = pixels[pixelIndex + 1];
          const bVal = pixels[pixelIndex + 2];
          const a = pixels[pixelIndex + 3];

          // Luminance formula (0 = black, 255 = white)
          const gray = a === 0 ? 255 : 0.299 * r + 0.587 * g + 0.114 * bVal;
          // Threshold at 170
          if (gray < 170) {
            byteVal |= (1 << (7 - b));
          }
        }
        buffer.push(byteVal);
      }
    }
  }

  // Restore normal line spacing (ESC 2) and feed 4 lines for tear-off
  write([0x1b, 0x32]);
  write([0x1b, 0x64, 0x04]);

  return await sendRawBytes(new Uint8Array(buffer));
}

/**
 * Merender struk gaya CGV Cinema ke Canvas lalu mencetaknya langsung ke printer Bluetooth sebagai grafis resolusi tinggi.
 *
 * @param order - Objek pesanan
 * @param settings - Konfigurasi printer
 * @param isKitchen - True jika tiket dapur
 * @returns True jika cetak raster berhasil
 */
export async function printCgvTicketRasterBluetooth(
  order: any,
  settings: any,
  isKitchen = false
): Promise<boolean> {
  if (!isBluetoothPrinterConnected()) {
    return false;
  }

  try {
    const canvas = renderCgvTicketCanvas(order, settings, isKitchen);
    return await printCanvasAsRasterBluetooth(canvas, settings?.paperWidth);
  } catch (err) {
    console.error('printCgvTicketRasterBluetooth error:', err);
    return false;
  }
}

/**
 * Mengonversi elemen HTML DOM (misal preview struk kasir) menjadi bitmap grafik raster dan mencetaknya via Web Bluetooth.
 *
 * @param element - Elemen DOM yang akan di-capture via html2canvas
 * @param paperWidth - Ukuran kertas ('58mm' atau '80mm')
 * @returns True jika pencetakan grafis DOM berhasil
 */
export async function printElementAsRasterBluetooth(
  element: HTMLElement,
  paperWidth: string = '58mm'
): Promise<boolean> {
  if (!isBluetoothPrinterConnected()) {
    return false;
  }

  const targetWidth = paperWidth === '80mm' ? 576 : 384;

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const targetHeight = Math.round((canvas.height / canvas.width) * targetWidth);
    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = targetWidth;
    scaledCanvas.height = targetHeight;

    const ctx = scaledCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);

    return await printCanvasAsRasterBluetooth(scaledCanvas, paperWidth);
  } catch (err) {
    console.error('Raster direct print error:', err);
    return false;
  }
}
