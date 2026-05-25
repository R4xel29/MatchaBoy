import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { formatRupiah } from '@/lib/utils';
import { expireOrder } from '@/lib/order-utils';
import Link from 'next/link';
import { ArrowLeft, MapPin, Clock, Package, User, Phone, CreditCard, CheckCircle2, ImageIcon, MessageCircle } from 'lucide-react';

export const revalidate = 0;

const STATUS_STEPS = ['ASSIGNED', 'TO_STORE', 'PICKED_UP', 'ON_DELIVERY', 'DELIVERED'];
const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: 'Assigned', TO_STORE: 'To Store', PICKED_UP: 'Picked Up', ON_DELIVERY: 'On Delivery', DELIVERED: 'Delivered',
};

function formatWhatsAppNumber(phone: string) {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('08')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

function getWhatsAppTemplate(order: any) {
  const orderIdShort = order.id.slice(0, 8).toUpperCase();
  const totalAmount = formatRupiah(order.total);
  const itemsText = order.items
    .map((item: any) => `- ${item.qty}x ${item.product.name}`)
    .join('\n');
    
  return `Halo ${order.customerName},

Kami dari *Matchaboy* ingin mengonfirmasi pesanan Anda dengan detail sebagai berikut:

*ID Pesanan:* #${orderIdShort}
*Status:* ${order.status}
*Metode Pembayaran:* ${order.paymentMethod}
*Tipe Pesanan:* ${order.orderType === 'PICKUP' ? 'Ambil Sendiri' : 'Pengiriman'}

*Rincian Pesanan:*
${itemsText}

*Total:* ${totalAmount}

Jika ada pertanyaan atau perubahan, silakan kabari kami ya. Terima kasih! 🍵`;
}

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Auto-expire order if past payment deadline
  await expireOrder(id);

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } }, user: true },
  });

  if (!order) notFound();

  const currentStepIndex = STATUS_STEPS.indexOf(order.status);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/orders" className="p-2 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-border/40">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold font-heading">#{order.id.slice(0, 8).toUpperCase()}</h1>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider
              ${order.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700' :
                order.status === 'ON_DELIVERY' ? 'bg-blue-50 text-blue-700' :
                order.status === 'ASSIGNED' ? 'bg-amber-50 text-amber-700' :
                'bg-slate-100 text-slate-600'}`}>
              {order.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-[12px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" />
            {new Date(order.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {order.status === 'CANCELLED' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-red-700 font-semibold space-y-1">
          <div className="flex items-center gap-1.5 font-bold uppercase">
            🚫 Pesanan Dibatalkan
          </div>
          <p className="text-red-650">
            Alasan: {order.cancelReason || 'Tidak ada alasan khusus'}
          </p>
        </div>
      )}

      {/* Status Timeline */}
      <div className="bg-white rounded-2xl border border-border/40 p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-4">Progress</p>

        {/* Desktop timeline */}
        <div className="hidden sm:flex items-center gap-0">
          {STATUS_STEPS.map((step, i) => {
            const done = i <= currentStepIndex;
            const current = i === currentStepIndex;
            return (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all
                    ${done ? 'bg-brand-600 border-brand-600 text-white' : 'bg-muted/50 border-border text-muted-foreground'}
                    ${current ? 'ring-[3px] ring-brand-200 scale-110' : ''}`}>
                    {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <p className={`text-[9px] mt-1.5 text-center font-semibold uppercase tracking-wider ${done ? 'text-brand-700' : 'text-muted-foreground/50'}`}>
                    {STATUS_LABELS[step] || step}
                  </p>
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div className={`h-0.5 w-full -mt-5 mx-1 rounded-full ${i < currentStepIndex ? 'bg-brand-500' : 'bg-border/50'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile timeline (vertical) */}
        <div className="sm:hidden space-y-2">
          {STATUS_STEPS.map((step, i) => {
            const done = i <= currentStepIndex;
            return (
              <div key={step} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0
                  ${done ? 'bg-brand-600 text-white' : 'bg-muted/50 text-muted-foreground border border-border'}`}>
                  {done ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
                </div>
                <span className={`text-[11px] font-semibold ${done ? 'text-foreground' : 'text-muted-foreground/50'}`}>{STATUS_LABELS[step]}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Customer Card */}
        <div className="bg-white rounded-2xl border border-border/40 p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">Customer</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                {order.customerName[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-[13px]">{order.customerName}</p>
                {order.user && <p className="text-[11px] text-muted-foreground">{order.user.email}</p>}
              </div>
            </div>
            <div className="flex items-center justify-between text-[12px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{order.customerPhone}</span>
              </div>
              <a
                href={`https://wa.me/${formatWhatsAppNumber(order.customerPhone)}?text=${encodeURIComponent(getWhatsAppTemplate(order))}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors text-[10px] font-bold uppercase tracking-wider shadow-sm border border-emerald-100"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Chat WA</span>
              </a>
            </div>
            <div className="flex items-start gap-2 text-[12px] text-muted-foreground"><MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {order.address}</div>
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground"><CreditCard className="w-3.5 h-3.5 flex-shrink-0" /> {order.paymentMethod}</div>
            
            {order.paymentProofUrl && (
              <div className="mt-4 pt-4 border-t border-dashed border-gray-150">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#B48A5E]" /> {order.paymentProofUrl === '/verified-cashier.svg' ? 'Status Pembayaran' : 'Bukti Pembayaran (Sudah Diunggah)'}
                </p>
                <div className="relative w-full max-w-[200px] aspect-[4/3] rounded-xl overflow-hidden border border-border bg-slate-50 group shadow-sm">
                  <img 
                    src={order.paymentProofUrl} 
                    alt="Bukti Pembayaran" 
                    className={`w-full h-full ${order.paymentProofUrl === '/verified-cashier.svg' ? 'object-contain p-2' : 'object-cover group-hover:scale-105'} transition-all duration-300`}
                  />
                  {order.paymentProofUrl !== '/verified-cashier.svg' && (
                    <a 
                      href={order.paymentProofUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold transition-opacity gap-1"
                    >
                      <ImageIcon className="w-4 h-4 text-white" />
                      <span>Buka Ukuran Penuh</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Items Card */}
        <div className="bg-white rounded-2xl border border-border/40 p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">Items ({order.items.length})</p>
          <div className="space-y-2.5">
            {order.items.map((item: any) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted/50 overflow-hidden flex-shrink-0 border border-border/20">
                  {item.product.image
                    ? <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-3.5 h-3.5 text-muted-foreground/30" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium truncate">{item.product.name}</p>
                  <p className="text-[10px] text-muted-foreground">{item.qty}× @ {formatRupiah(item.price)}</p>
                </div>
                <p className="text-[12px] font-bold shrink-0">{formatRupiah(item.price * item.qty)}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-border/30 space-y-1.5">
            <div className="flex justify-between text-[12px]">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatRupiah(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-muted-foreground">Delivery</span>
              <span>{formatRupiah(order.deliveryFee)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-border/30">
              <span>Total</span>
              <span className="text-brand-700">{formatRupiah(order.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
