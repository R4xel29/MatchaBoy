'use client';

import { useState } from 'react';
import {
  QrCode, Search, User, Coffee, Leaf, Loader2,
  CheckCircle2, AlertCircle, Plus, Minus, Gift, Camera
} from 'lucide-react';
import QRCameraScanner from '@/components/cashier/QRCameraScanner';


type SearchMode = 'qr' | 'phone' | 'email';

interface PointResult {
  success: boolean;
  customer: { name: string; email: string; phone: string };
  pointsAdded: number;
  tumblerBonus: boolean;
  newTotalPoints: number;
  vouchersEarned: { type: string; description: string }[];
}

export default function AddPointsClient() {
  const [mode, setMode] = useState<SearchMode>('phone');
  const [input, setInput] = useState('');
  const [cups, setCups] = useState(1);
  const [hasTumbler, setHasTumbler] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PointResult | null>(null);
  const [error, setError] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const body: any = { cups, hasTumbler };
      if (mode === 'qr') body.referralCode = input;
      else if (mode === 'phone') body.phone = input;
      else body.email = input;

      const res = await fetch('/api/admin/loyalty/add-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal menambah poin');
      } else {
        setResult(data);
      }
    } catch {
      setError('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setInput('');
    setCups(1);
    setHasTumbler(false);
    setResult(null);
    setError('');
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground flex items-center gap-2">
          <Gift className="w-6 h-6 text-amber-600" />
          Tambah Poin Pelanggan
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Scan QR atau input manual untuk menambah poin.
        </p>
      </div>

      {/* Mode Tabs */}
      <div className="flex bg-muted/30 rounded-xl p-1 border border-border/40">
        {[
          { id: 'phone' as SearchMode, label: 'No. HP', icon: User },
          { id: 'email' as SearchMode, label: 'Email', icon: Search },
          { id: 'qr' as SearchMode, label: 'Kode QR', icon: QrCode },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setMode(tab.id); setInput(''); setResult(null); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              mode === tab.id
                ? 'bg-white shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Input Form */}
      {!result && (
        <div className="bg-white rounded-2xl border border-border/40 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-4">
          {/* Search Input */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              {mode === 'phone' ? 'Nomor HP Pelanggan' : mode === 'email' ? 'Email Pelanggan' : 'Kode QR / Referral Code'}
            </label>
            {mode === 'qr' ? (
              <div className="space-y-3">
                {showScanner ? (
                  <div className="border border-border/40 rounded-2xl p-4 bg-muted/10">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-amber-600 animate-pulse" /> Scanner Aktif
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setShowScanner(false)} 
                        className="text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors"
                      >
                        Batal Scan
                      </button>
                    </div>
                    <QRCameraScanner
                      onScan={(result) => {
                        setInput(result);
                        setShowScanner(false);
                      }}
                      placeholder="Masukkan kode referral..."
                    />
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Masukkan kode QR atau klik Scan"
                      className="flex-1 px-4 py-3 text-sm bg-muted/20 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowScanner(true)}
                      className="px-4 py-3 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl border border-amber-200/50 flex items-center justify-center gap-1.5 font-bold text-sm transition-colors shadow-sm active:scale-95"
                    >
                      <Camera className="w-4 h-4" /> Scan
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <input
                type={mode === 'email' ? 'email' : 'text'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={mode === 'phone' ? '08xxxxxxxxxx' : 'pelanggan@email.com'}
                className="w-full px-4 py-3 text-sm bg-muted/20 border border-border/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
              />
            )}
          </div>

          {/* Cups */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Jumlah Cup
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCups(Math.max(1, cups - 1))}
                className="w-10 h-10 rounded-xl bg-muted/30 border border-border/40 flex items-center justify-center hover:bg-muted/50 active:scale-95 transition-all"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-2xl font-bold text-foreground w-12 text-center">{cups}</span>
              <button
                onClick={() => setCups(cups + 1)}
                className="w-10 h-10 rounded-xl bg-muted/30 border border-border/40 flex items-center justify-center hover:bg-muted/50 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
              <div className="flex-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Coffee className="w-4 h-4" />
                = {cups} poin
              </div>
            </div>
          </div>

          {/* Tumbler Toggle */}
          <label className="flex items-center gap-3 p-3 rounded-xl bg-teal-50/50 border border-teal-200/50 cursor-pointer hover:bg-teal-50 transition-colors">
            <input
              type="checkbox"
              checked={hasTumbler}
              onChange={(e) => setHasTumbler(e.target.checked)}
              className="w-5 h-5 rounded border-teal-300 text-teal-600 focus:ring-teal-500"
            />
            <Leaf className="w-5 h-5 text-teal-600" />
            <div>
              <p className="text-sm font-semibold text-teal-800">Bawa Tumbler / Wadah Sendiri</p>
              <p className="text-[10px] text-teal-600">Extra poin & bantu kurangi plastik 🌿</p>
            </div>
          </label>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading || !input.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50 shadow-sm active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {loading ? 'Memproses...' : 'Tambah Poin'}
          </button>
        </div>
      )}

      {/* Success Result */}
      {result && (
        <div className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-4 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Poin Berhasil Ditambahkan!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {result.customer.name} ({result.customer.phone || result.customer.email})
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/20 rounded-xl">
              <p className="text-2xl font-bold text-amber-600">+{result.pointsAdded}</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Poin Ditambah</p>
            </div>
            <div className="p-3 bg-muted/20 rounded-xl">
              <p className="text-2xl font-bold text-foreground">{result.newTotalPoints}</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Total Poin</p>
            </div>
          </div>

          {result.tumblerBonus && (
            <div className="p-2 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-700 font-medium flex items-center justify-center gap-1">
              <Leaf className="w-3.5 h-3.5" /> Bonus tumbler diberikan!
            </div>
          )}

          {result.vouchersEarned.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">🎁 Voucher Didapat:</p>
              {result.vouchersEarned.map((v, i) => (
                <div key={i} className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium">
                  {v.description}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={reset}
            className="w-full py-3 rounded-xl bg-muted/30 border border-border/40 text-foreground font-semibold text-sm hover:bg-muted/50 transition-all active:scale-[0.98]"
          >
            Transaksi Baru
          </button>
        </div>
      )}
    </div>
  );
}
