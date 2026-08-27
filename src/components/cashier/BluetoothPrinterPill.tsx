'use client';

import { useState, useEffect } from 'react';
import { Bluetooth, BluetoothConnected, BluetoothOff, Loader2, Check, RefreshCw } from 'lucide-react';
import {
  isWebBluetoothSupported,
  isBluetoothPrinterConnected,
  getConnectedBluetoothDeviceName,
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  subscribeBluetoothStatus,
} from '@/lib/bluetooth-printer';
import { useToast } from '@/components/ui/Toast';

export function BluetoothPrinterPill() {
  const { showToast } = useToast();
  const [connected, setConnected] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(isWebBluetoothSupported());
    const unsubscribe = subscribeBluetoothStatus((isConnected, name) => {
      setConnected(isConnected);
      setDeviceName(name);
    });
    return () => unsubscribe();
  }, []);

  const handleConnect = async () => {
    if (!supported) {
      showToast('Browser ini belum mendukung Web Bluetooth. Gunakan Chrome atau Edge.', 'error');
      return;
    }

    setConnecting(true);
    const res = await connectBluetoothPrinter();
    setConnecting(false);

    if (res.success) {
      showToast(`Printer Bluetooth ${res.deviceName || 'Algoo AT-5805'} berhasil terhubung!`, 'success');
    } else if (res.error && !res.error.includes('dibatalkan')) {
      showToast(res.error, 'error');
    }
  };

  const handleDisconnect = () => {
    disconnectBluetoothPrinter();
    showToast('Koneksi Bluetooth printer diputus', 'info');
  };

  if (!supported) return null;

  return (
    <div className="flex items-center">
      {connected ? (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <BluetoothConnected className="w-3.5 h-3.5 text-emerald-600" />
          <span className="truncate max-w-[120px] font-mono">{deviceName || 'Algoo AT-5805'}</span>
          <button
            onClick={handleDisconnect}
            title="Putus Sambungan Bluetooth"
            className="ml-1 p-0.5 hover:bg-emerald-200/60 rounded text-emerald-700 transition-colors"
          >
            <BluetoothOff className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100/80 border border-orange-200 text-orange-700 text-xs font-semibold shadow-xs transition-all active:scale-95 disabled:opacity-60"
        >
          {connecting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-600" />
          ) : (
            <Bluetooth className="w-3.5 h-3.5 text-orange-600" />
          )}
          <span>{connecting ? 'Menghubungkan...' : 'Sambung Algoo (Bluetooth)'}</span>
        </button>
      )}
    </div>
  );
}
