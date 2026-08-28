/**
 * Web Bluetooth ESC/POS Direct Thermal Printer Driver for Arum Seduh
 * Supported Hardware: Algoo AT-5805, 58mm Bluetooth Printers (Panda, Goojprt, MPT, POS-58)
 */

import { formatRupiah } from './utils';
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
let activeCharacteristic: any = null;
let activeDevice: any = null;
let connectionListeners: Array<(connected: boolean, deviceName: string | null) => void> = [];

export function isWebBluetoothSupported(): boolean {
  return typeof window !== 'undefined' && 'bluetooth' in navigator;
}

export function isBluetoothPrinterConnected(): boolean {
  return activeDevice !== null && activeDevice.gatt?.connected === true && activeCharacteristic !== null;
}

export function getConnectedBluetoothDeviceName(): string | null {
  if (isBluetoothPrinterConnected()) {
    return activeDevice.name || 'Algoo AT-5805';
  }
  return null;
}

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
 * Connect to Algoo AT-5805 or any 58mm ESC/POS Bluetooth thermal printer
 */
export async function connectBluetoothPrinter(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
  if (!isWebBluetoothSupported()) {
    return { success: false, error: 'Web Bluetooth tidak didukung pada browser ini. Gunakan Google Chrome atau Microsoft Edge.' };
  }

  try {
    const navBluetooth = (navigator as any).bluetooth;

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

export function disconnectBluetoothPrinter() {
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
 * Build ESC/POS Byte Stream for Customer Receipt in True CGV Cinema Ticket Style
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

  (order.items || []).forEach((item: any) => {
    const itemPrice = (item.totalPrice || item.price) * item.qty;
    const itemTitle = `[ ${item.qty}x ] ${item.name.toUpperCase()}`;
    const priceStr = formatRupiah(itemPrice);

    boldOn();
    if (itemTitle.length + priceStr.length + 1 <= maxCols) {
      writeText(padLine(itemTitle, priceStr, maxCols));
    } else {
      writeText(`${itemTitle}\n`);
      writeText(padLine('', priceStr, maxCols));
    }
    boldOff();

    // Modifiers in Bold with clear indentation
    boldOn();
    if (item.sugarLevel) {
      writeText(`  >> GULA  : ${item.sugarLevel.toUpperCase()}\n`);
    }
    if (item.iceLevel) {
      writeText(`  >> ES    : ${item.iceLevel.toUpperCase()}\n`);
    }
    if (item.matchaLevel !== undefined && item.matchaLevel > 0) {
      writeText(`  >> MATCHA: LEVEL ${item.matchaLevel}\n`);
    }
    if (item.size) {
      writeText(`  >> UKURAN: ${item.size.toUpperCase()}\n`);
    }
    if (item.shotName) {
      writeText(`  >> SHOT  : ${item.shotName.toUpperCase()}\n`);
    }
    if (item.addOns && item.addOns.length > 0) {
      item.addOns.forEach((a: any) => {
        writeText(`  >> TOPPING: +${a.name.toUpperCase()} (${formatRupiah(a.price)})\n`);
      });
    }
    if (item.bundleSelections && item.bundleSelections.length > 0) {
      item.bundleSelections.forEach((b: any) => {
        writeText(`  >> PILIHAN: ${(b.productName || b.groupName || '').toUpperCase()}\n`);
      });
    }
    if (item.modifiersString && !item.sugarLevel && !item.iceLevel) {
      writeText(`  >> VARIAN: ${item.modifiersString.toUpperCase()}\n`);
    }
    boldOff();
    writeText('................................\n');
  });

  // 6. Barcode Graphic
  alignCenter();
  writeText('|||| | ||||| || ||||||||| | |||\n');
  writeText(`${order.id || orderIdShort}\n`);
  alignLeft();

  // 7. Payment Summary
  writeText(padLine('Subtotal:', formatRupiah(order.subtotal || order.total), maxCols));
  if (totalDiscount > 0) {
    writeText(padLine('Diskon / Promo:', `-${formatRupiah(totalDiscount)}`, maxCols));
  }

  // 8. Solid Black TOTAL Banner (Inverted Ribbon)
  alignCenter();
  reverseOn();
  boldOn();
  write([0x1b, 0x21, 0x10]); // Double height
  writeText(padLine(' TOTAL', `${formatRupiah(order.total)} `, maxCols));
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
 * Build ESC/POS Byte Stream for Kitchen / Bar Ticket in CGV Style
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
    if (item.sugarLevel) writeText(`  >> GULA  : ${item.sugarLevel.toUpperCase()}\n`);
    if (item.iceLevel) writeText(`  >> ES    : ${item.iceLevel.toUpperCase()}\n`);
    if (item.matchaLevel !== undefined && item.matchaLevel > 0) writeText(`  >> MATCHA: LEVEL ${item.matchaLevel}\n`);
    if (item.size) writeText(`  >> UKURAN: ${item.size.toUpperCase()}\n`);
    if (item.shotName) writeText(`  >> SHOT  : ${item.shotName.toUpperCase()}\n`);
    if (item.addOns && item.addOns.length > 0) {
      item.addOns.forEach((a: any) => writeText(`  >> +TOPPING: ${a.name.toUpperCase()}\n`));
    }
    if (item.bundleSelections && item.bundleSelections.length > 0) {
      item.bundleSelections.forEach((b: any) => writeText(`  >> PILIHAN: ${(b.productName || b.groupName || '').toUpperCase()}\n`));
    }
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
 * Print directly to connected Bluetooth Printer without browser dialog (Text Mode)
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
 * Print exact HTML DOM element as Monochrome ESC/POS Raster Bitmap (GS v 0)
 * This guarantees 100% visual fidelity matching the on-screen CGV Cinema Ticket
 * with crisp black inverted ribbons, big bold numbers, and zero line-wrapping glitches!
 */
export async function printElementAsRasterBluetooth(
  element: HTMLElement,
  paperWidth: string = '58mm'
): Promise<boolean> {
  if (!isBluetoothPrinterConnected()) {
    return false;
  }

  // 58mm = 384 dots (48 bytes per row), 80mm = 576 dots (72 bytes per row)
  const targetWidth = paperWidth === '80mm' ? 576 : 384;
  const widthBytes = targetWidth / 8;

  try {
    // 1. Capture the DOM element to high-res canvas
    const canvas = await html2canvas(element, {
      scale: 2, // 2x crisp rendering for sharp text edges
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const targetHeight = Math.round((canvas.height / canvas.width) * targetWidth);
    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = targetWidth;
    scaledCanvas.height = targetHeight;

    const ctx = scaledCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;

    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);

    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const pixels = imgData.data;

    const buffer: number[] = [];
    const write = (arr: number[]) => buffer.push(...arr);

    // Initialize printer (ESC @)
    write([0x1b, 0x40]);
    // Set line spacing to 0 for seamless vertical slice joining
    write([0x1b, 0x33, 0x00]);

    // Slice image into vertical chunks (128 dots height) to protect printer RAM buffer
    const SLICE_HEIGHT = 128;
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

            // Luminance formula
            const gray = a === 0 ? 255 : 0.299 * r + 0.587 * g + 0.114 * bVal;
            // Contrast threshold: anything darker than 175 is thermal black dot (1)
            if (gray < 175) {
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
  } catch (err) {
    console.error('Raster direct print error:', err);
    return false;
  }
}
