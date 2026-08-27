/**
 * Web Bluetooth ESC/POS Direct Thermal Printer Driver for Arum Seduh
 * Supported Hardware: Algoo AT-5805, 58mm Bluetooth Printers (Panda, Goojprt, MPT, POS-58)
 */

import { formatRupiah } from './utils';

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

/**
 * Build ESC/POS Byte Stream for Customer Receipt
 */
export function buildCustomerReceiptEscPos(order: any, settings: any): Uint8Array {
  const encoder = new TextEncoder();
  const buffer: number[] = [];

  const write = (arr: number[]) => buffer.push(...arr);
  const writeText = (str: string) => buffer.push(...Array.from(encoder.encode(str)));

  const storeName = settings.storeName || 'ARUM SEDUH';
  const orderIdShort = (order.id || '').slice(0, 8).toUpperCase();
  const totalDiscount = (order.discount || 0) + (order.tumblerDiscount || 0) + (order.voucherDiscount || 0);

  const orderDate = new Date(order.createdAt || Date.now());
  const formattedDate = orderDate.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const formattedTime = orderDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  // 1. Initialize Printer (ESC @)
  write([0x1b, 0x40]);

  // 2. Header (Center, Bold, Double Size Store Name)
  write([0x1b, 0x61, 0x01]); // Align Center
  write([0x1b, 0x21, 0x30]); // Double width & height
  writeText(`${storeName.toUpperCase()}\n`);
  write([0x1b, 0x21, 0x00]); // Normal text

  if (settings.tagline) writeText(`${settings.tagline}\n`);
  if (settings.address) writeText(`${settings.address}\n`);
  if (settings.phone) writeText(`WA: ${settings.phone}\n`);
  if (settings.headerNotes) writeText(`${settings.headerNotes}\n`);

  writeText('--------------------------------\n');

  // 3. Metadata
  write([0x1b, 0x61, 0x00]); // Align Left
  writeText(padLine('No. Order:', `#${orderIdShort}`));
  if (order.queueNumber) {
    writeText(padLine('No. Antrian:', `A-${order.queueNumber}`));
  }
  writeText(padLine('Waktu:', `${formattedDate} ${formattedTime}`));
  writeText(padLine('Tipe:', order.orderType === 'DINE_IN' ? `DINE IN (Meja ${order.tableNumber || '?'})` : order.orderType));
  writeText(padLine('Pelanggan:', order.customerName || 'Pelanggan'));

  writeText('--------------------------------\n');

  // 4. Items
  (order.items || []).forEach((item: any) => {
    const itemPrice = (item.totalPrice || item.price) * item.qty;
    write([0x1b, 0x45, 0x01]); // Bold on
    writeText(padLine(`${item.qty}x ${item.name}`, formatRupiah(itemPrice)));
    write([0x1b, 0x45, 0x00]); // Bold off

    // Modifiers
    if (item.sugarLevel) writeText(`   - Gula: ${item.sugarLevel}\n`);
    if (item.iceLevel) writeText(`   - Es: ${item.iceLevel}\n`);
    if (item.matchaLevel !== undefined && item.matchaLevel > 0) writeText(`   - Matcha: Level ${item.matchaLevel}\n`);
    if (item.size) writeText(`   - Ukuran: ${item.size}\n`);
    if (item.shotName) writeText(`   - Shot: ${item.shotName}\n`);
    if (item.addOns && item.addOns.length > 0) {
      item.addOns.forEach((a: any) => writeText(`   - +${a.name} (${formatRupiah(a.price)})\n`));
    }
    if (item.bundleSelections && item.bundleSelections.length > 0) {
      item.bundleSelections.forEach((b: any) => writeText(`   - ${b.productName || b.groupName}\n`));
    }
    if (item.modifiersString && !item.sugarLevel && !item.iceLevel) {
      writeText(`   - ${item.modifiersString}\n`);
    }
  });

  writeText('--------------------------------\n');

  // 5. Pricing Summary
  writeText(padLine('Subtotal', formatRupiah(order.subtotal || order.total)));
  if (totalDiscount > 0) {
    writeText(padLine('Diskon / Promo', `-${formatRupiah(totalDiscount)}`));
  }

  write([0x1b, 0x45, 0x01]); // Bold on
  writeText(padLine('TOTAL', formatRupiah(order.total)));
  write([0x1b, 0x45, 0x00]); // Bold off

  writeText(padLine(`Metode (${order.paymentMethod || 'TUNAI'})`, formatRupiah(order.total)));
  if (order.cashPaid) {
    writeText(padLine('Tunai Diterima', formatRupiah(order.cashPaid)));
    write([0x1b, 0x45, 0x01]);
    writeText(padLine('Kembalian', formatRupiah(order.change || 0)));
    write([0x1b, 0x45, 0x00]);
  }

  // 6. Loyalty Points & Wi-Fi
  if (order.pointsEarned && order.pointsEarned > 0) {
    writeText('--------------------------------\n');
    write([0x1b, 0x61, 0x01]);
    writeText(`Poin Didapat: +${order.pointsEarned} Poin\n`);
    if (order.totalPoints) writeText(`Total Poin Akun: ${order.totalPoints} Poin\n`);
  }

  if (settings.showWifi && settings.wifiSsid) {
    writeText('--------------------------------\n');
    write([0x1b, 0x61, 0x01]);
    writeText(`Wi-Fi: ${settings.wifiSsid}\n`);
    if (settings.wifiPassword) writeText(`Pass: ${settings.wifiPassword}\n`);
  }

  // 7. Footer Greetings
  writeText('--------------------------------\n');
  write([0x1b, 0x61, 0x01]);
  if (settings.footerNotes) writeText(`${settings.footerNotes}\n`);
  if (settings.showSocial && settings.instagram) writeText(`IG: ${settings.instagram}\n`);
  writeText(`*** ${storeName} ***\n`);

  // Feed 4 lines for paper tearing
  write([0x1b, 0x64, 0x04]);

  return new Uint8Array(buffer);
}

/**
 * Build ESC/POS Byte Stream for Kitchen / Bar Ticket
 */
export function buildKitchenTicketEscPos(order: any): Uint8Array {
  const encoder = new TextEncoder();
  const buffer: number[] = [];

  const write = (arr: number[]) => buffer.push(...arr);
  const writeText = (str: string) => buffer.push(...Array.from(encoder.encode(str)));

  const orderIdShort = (order.id || '').slice(0, 8).toUpperCase();
  const orderDate = new Date(order.createdAt || Date.now());
  const formattedTime = orderDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  // Initialize
  write([0x1b, 0x40]);

  // Title
  write([0x1b, 0x61, 0x01]); // Center
  write([0x1b, 0x21, 0x30]); // Double size
  writeText('KITCHEN TICKET\n');
  write([0x1b, 0x21, 0x00]); // Normal size

  const typeStr = order.orderType === 'DINE_IN' ? `DINE IN (Meja ${order.tableNumber || '?'})` : order.orderType;
  write([0x1b, 0x45, 0x01]);
  writeText(`${typeStr}\n`);
  write([0x1b, 0x45, 0x00]);

  writeText('================================\n');
  write([0x1b, 0x61, 0x00]); // Left
  writeText(padLine(`Order: #${orderIdShort}`, order.queueNumber ? `Antrian: A-${order.queueNumber}` : formattedTime));
  writeText(padLine(`Cust: ${order.customerName}`, formattedTime));
  writeText('================================\n');

  // Items for Barista
  (order.items || []).forEach((item: any) => {
    write([0x1b, 0x45, 0x01]); // Bold
    write([0x1b, 0x21, 0x10]); // Double height
    writeText(`[ ${item.qty}x ] ${item.name.toUpperCase()}\n`);
    write([0x1b, 0x21, 0x00]); // Normal
    write([0x1b, 0x45, 0x00]); // Bold off

    if (item.sugarLevel) writeText(`  * Gula: ${item.sugarLevel}\n`);
    if (item.iceLevel) writeText(`  * Es: ${item.iceLevel}\n`);
    if (item.matchaLevel !== undefined && item.matchaLevel > 0) writeText(`  * Matcha: Level ${item.matchaLevel}\n`);
    if (item.size) writeText(`  * Size: ${item.size}\n`);
    if (item.shotName) writeText(`  * Shot: ${item.shotName}\n`);
    if (item.addOns && item.addOns.length > 0) {
      item.addOns.forEach((a: any) => writeText(`  * +${a.name}\n`));
    }
    if (item.bundleSelections && item.bundleSelections.length > 0) {
      item.bundleSelections.forEach((b: any) => writeText(`  * ${b.productName || b.groupName}\n`));
    }
    writeText('--------------------------------\n');
  });

  if (order.notes) {
    write([0x1b, 0x45, 0x01]);
    writeText(`CATATAN:\n${order.notes}\n`);
    write([0x1b, 0x45, 0x00]);
    writeText('--------------------------------\n');
  }

  write([0x1b, 0x61, 0x01]);
  writeText('--- SELESAIKAN & SAJIKAN ---\n');

  // Feed 4 lines
  write([0x1b, 0x64, 0x04]);

  return new Uint8Array(buffer);
}

/**
 * Print directly to connected Bluetooth Printer without browser dialog
 */
export async function printDirectBluetooth(order: any, settings: any, isKitchen = false): Promise<boolean> {
  if (!isBluetoothPrinterConnected()) {
    return false;
  }

  const bytes = isKitchen
    ? buildKitchenTicketEscPos(order)
    : buildCustomerReceiptEscPos(order, settings);

  return await sendRawBytes(bytes);
}
