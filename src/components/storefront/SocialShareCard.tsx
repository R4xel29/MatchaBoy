'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Share2, MessageCircle, Download, Check, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface SocialShareCardProps {
  customerName: string;
  orderId: string;
  total: number;
  items: Array<{ name: string; qty: number; price: number }>;
}

export function SocialShareCard({ customerName, orderId, total, items }: SocialShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { showToast } = useToast();
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [qrLoaded, setQrLoaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(true);

  // Fetch user referral code on mount
  useEffect(() => {
    fetch('/api/user/loyalty')
      .then((res) => res.json())
      .then((data) => {
        if (data?.referralCode) {
          setReferralCode(data.referralCode);
        }
      })
      .catch((err) => console.error('Error fetching referral code:', err));
  }, []);

  const getReferralLink = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/register?ref=${referralCode || 'matchaboy'}`;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsGenerating(true);

    // Dimensions
    canvas.width = 800;
    canvas.height = 800;

    // 1. Draw Background Gradient (Rich forest green & matcha green)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 800);
    bgGrad.addColorStop(0, '#19341D'); // Super dark forest green
    bgGrad.addColorStop(1, '#2E5A44'); // Smooth Matcha Green
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 800, 800);

    // 2. Draw Organic Leaf Shapes in the background (Bezier Curves)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.beginPath();
    ctx.ellipse(710, 130, 110, 210, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(90, 670, 130, 240, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    // 3. Draw Stylized Inner Gold Frame Borders
    ctx.strokeStyle = '#FEF08A'; // Gold yellow
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, 740, 740);

    ctx.strokeStyle = 'rgba(254, 240, 138, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(42, 42, 716, 716);

    // 4. Header Titles
    ctx.fillStyle = '#FEF08A';
    ctx.font = 'bold 36px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('🍵 MATCHABOY MOMENTS', 400, 100);

    ctx.fillStyle = '#FAF8F5';
    ctx.font = '900 13px system-ui, sans-serif';
    ctx.fillText('🌿 ARTISANAL PREMIUM MATCHA & ECO-BAKERY 🌿', 400, 135);

    // 5. Create the cream inner card overlay
    ctx.fillStyle = '#FAF8F5';
    ctx.beginPath();
    ctx.roundRect(80, 175, 640, 480, 40);
    ctx.fill();

    ctx.strokeStyle = '#D4A574'; // Gold brown border
    ctx.lineWidth = 4;
    ctx.stroke();

    // 6. Draw Content inside the Cream Card
    // Greeting
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1E3F20';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(`Nikmat Matcha Kamu, ${customerName}!`, 400, 235);

    ctx.fillStyle = '#6B7280';
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillText('Pesanan premium kamu disiapkan dengan ramah lingkungan ✨', 400, 265);

    // Split Layout inside the card: Order Summary on Left, Referral QR on Right
    // Divider line
    ctx.strokeStyle = 'rgba(212, 165, 116, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(400, 300);
    ctx.lineTo(400, 600);
    ctx.stroke();

    // --- LEFT COLUMN: Order Details ---
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1A3F20';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('RINGKASAN MENU:', 120, 320);

    ctx.fillStyle = '#1F2937';
    ctx.font = '500 16px system-ui, sans-serif';
    let itemY = 355;
    items.slice(0, 3).forEach((item) => {
      ctx.fillText(`•  ${item.qty}x ${item.name}`, 120, itemY);
      itemY += 30;
    });

    if (items.length > 3) {
      ctx.fillStyle = '#8C6239';
      ctx.font = 'bold italic 14px system-ui, sans-serif';
      ctx.fillText(`...dan ${items.length - 3} item lainnya`, 120, itemY);
    }

    // Draw Price Total
    ctx.fillStyle = '#8C6239';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(`Total: Rp ${total.toLocaleString('id-ID')}`, 120, 485);

    ctx.fillStyle = '#9CA3AF';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText(`ORDER: #${orderId.slice(0, 10).toUpperCase()}`, 120, 520);

    // --- RIGHT COLUMN: QR Code & Referral Info ---
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1A3F20';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('DAPATKAN DRINK GRATIS!', 600, 320);

    ctx.fillStyle = '#6B7280';
    ctx.font = '500 12px system-ui, sans-serif';
    ctx.fillText('Scan QR untuk daftar & dapatkan', 600, 342);
    ctx.fillText('diskon langsung Rp3.000 belanja!', 600, 360);

    // Draw QR code border box
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(500, 385, 200, 200, 16);
    ctx.fill();
    ctx.strokeStyle = '#EADFC9';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 7. Load and Draw the QR code Image
    const qrImg = new window.Image();
    qrImg.crossOrigin = 'anonymous';
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=1a3f20&data=${encodeURIComponent(getReferralLink())}`;
    
    qrImg.onload = () => {
      ctx.drawImage(qrImg, 510, 395, 180, 180);
      setQrLoaded(true);
      setIsGenerating(false);
    };

    qrImg.onerror = () => {
      // Draw fallback text inside the box if QR API fails
      ctx.fillStyle = '#1A3F20';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText('QR CODE', 600, 470);
      ctx.fillText('SCAN LINK', 600, 490);
      setIsGenerating(false);
    };

    // 8. Footer Note
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText('Matchaboy 🍵 - Bawa Tumblermu & Kurangi Sampah Plastik 🌍', 400, 715);

  }, [customerName, orderId, total, items, referralCode, qrLoaded]);

  const handleShareNative = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast('Gagal memproses gambar share.', 'error');
          return;
        }

        const file = new File([blob], `matchaboy-order-${orderId.slice(0, 8)}.png`, { type: 'image/png' });
        
        const shareData = {
          title: 'Matchaboy Moments',
          text: `Cobain Matchaboy! Daftar pakai link referral saya dan dapatkan diskon langsung Rp3.000:\n${getReferralLink()}`,
          files: [file],
        };

        if (navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData);
          showToast('Berhasil membagikan moments! 🍵', 'success');
        } else {
          // Fallback to clipboard and download
          handleDownload();
          showToast('Browser tidak mendukung native sharing. Gambar telah diunduh, silakan bagikan secara manual!', 'info');
        }
      }, 'image/png');
    } catch (err) {
      console.error('Share error:', err);
      // Fallback
      handleDownload();
    }
  };

  const handleShareWA = () => {
    const text = encodeURIComponent(
      `Saya baru saja memesan matcha premium di Matchaboy! 🍵 Beli juga yuk! Daftar menggunakan link referral saya untuk diskon Rp3.000 langsung:\n${getReferralLink()}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `matchaboy-moments-${orderId.slice(0, 8)}.png`;
    link.href = dataUrl;
    link.click();
    showToast('Gambar moments berhasil diunduh! 📲', 'success');
  };

  return (
    <div className="w-full bg-white border border-gray-100 rounded-[2rem] p-5 md:p-6 shadow-sm space-y-5 text-center mt-6">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1 bg-[#2E5A44]/10 text-[#2E5A44] px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-[#2E5A44]/15">
          <Sparkles className="w-3.5 h-3.5 fill-[#2E5A44] stroke-none animate-pulse" /> Matcha Moments Card
        </div>
        <h3 className="font-serif text-lg font-black text-gray-900 mt-2">Bagikan Momen Matchamu</h3>
        <p className="text-xs text-gray-500 font-semibold max-w-[320px] mx-auto leading-relaxed">
          Unduh atau bagikan kartu moments pesananmu beserta QR code referral pribadimu untuk mendapatkan reward minuman gratis!
        </p>
      </div>

      {/* HTML5 Canvas Render */}
      <div className="relative max-w-[320px] sm:max-w-[360px] mx-auto aspect-square overflow-hidden rounded-[2rem] border-2 border-[#D4A574]/40 shadow-md">
        <canvas ref={canvasRef} className="w-full h-full object-contain bg-[#1E3F20]" />
        {isGenerating && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-2">
            <div className="w-8 h-8 border-4 border-yellow-300 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-wider">Menyiapkan Moments Card...</span>
          </div>
        )}
      </div>

      {/* Sharing and Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 max-w-[420px] mx-auto">
        <button
          onClick={handleShareNative}
          disabled={isGenerating}
          className="py-3 px-4.5 bg-[#2E5A44] hover:bg-[#1E3F20] text-white text-xs font-bold rounded-2xl shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
        >
          <Share2 className="w-4 h-4 shrink-0" />
          <span>Bagikan</span>
        </button>

        <button
          onClick={handleShareWA}
          disabled={isGenerating}
          className="py-3 px-4.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
        >
          <MessageCircle className="w-4 h-4 shrink-0" />
          <span>WhatsApp</span>
        </button>

        <button
          onClick={handleDownload}
          disabled={isGenerating}
          className="py-3 px-4.5 border-2 border-[#D4A574]/60 hover:bg-[#FAF8F5] text-[#8C6239] text-xs font-black rounded-2xl shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>Unduh PNG</span>
        </button>
      </div>
    </div>
  );
}
