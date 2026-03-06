import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { formatRupiah } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, MapPin, Clock, Package, User, Phone, CreditCard } from 'lucide-react';

export const revalidate = 0;

const STATUS_COLORS: Record<string, string> = {
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ON_DELIVERY: 'bg-blue-50 text-blue-700 border-blue-200',
  PICKED_UP: 'bg-purple-50 text-purple-700 border-purple-200',
  TO_STORE: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  ASSIGNED: 'bg-amber-50 text-amber-700 border-amber-200',
  PENDING_PAYMENT: 'bg-rose-50 text-rose-700 border-rose-200',
};

const STATUS_STEPS = ['ASSIGNED', 'TO_STORE', 'PICKED_UP', 'ON_DELIVERY', 'DELIVERED'];

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      user: true,
    },
  });

  if (!order) notFound();

  const currentStepIndex = STATUS_STEPS.indexOf(order.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/orders" className="p-2 hover:bg-muted rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-heading flex items-center gap-3">
            Order #{order.id.slice(0, 8).toUpperCase()}
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${STATUS_COLORS[order.status] || 'bg-muted'}`}>
              {order.status.replace('_', ' ')}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {new Date(order.createdAt).toLocaleString('id-ID', {
              day: 'numeric', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })}
          </p>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="bg-white rounded-2xl border border-border/50 p-6 shadow-sm">
        <h2 className="text-sm font-bold uppercase text-muted-foreground tracking-wider mb-4">Order Progress</h2>
        <div className="flex items-center gap-1">
          {STATUS_STEPS.map((step, i) => {
            const isCompleted = i <= currentStepIndex;
            const isCurrent = i === currentStepIndex;
            return (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                    ${isCompleted ? 'bg-matcha-600 border-matcha-600 text-white' : 'bg-muted border-border text-muted-foreground'}
                    ${isCurrent ? 'ring-4 ring-matcha-200' : ''}`}>
                    {i + 1}
                  </div>
                  <p className={`text-[10px] mt-1.5 text-center font-medium ${isCompleted ? 'text-matcha-700' : 'text-muted-foreground'}`}>
                    {step.replace('_', ' ')}
                  </p>
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 -mt-4 ${i < currentStepIndex ? 'bg-matcha-500' : 'bg-border'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Info */}
        <div className="bg-white rounded-2xl border border-border/50 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase text-muted-foreground tracking-wider">Customer</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-matcha-50 flex items-center justify-center">
                <User className="w-5 h-5 text-matcha-600" />
              </div>
              <div>
                <p className="font-semibold">{order.customerName}</p>
                {order.user && <p className="text-xs text-muted-foreground">{order.user.email}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-4 h-4" /> {order.customerPhone}
            </div>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" /> {order.address}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="w-4 h-4" /> {order.paymentMethod}
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-2xl border border-border/50 p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase text-muted-foreground tracking-wider mb-4">Items ({order.items.length})</h2>
          <div className="space-y-3">
            {order.items.map((item: any) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  {item.product.image
                    ? <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full gradient-matcha opacity-20" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">{item.qty}x @ {formatRupiah(item.price)}</p>
                </div>
                <p className="text-sm font-bold">{formatRupiah(item.price * item.qty)}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatRupiah(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Delivery Fee</span>
              <span>{formatRupiah(order.deliveryFee)}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-border/50">
              <span>Total</span>
              <span className="text-matcha-700">{formatRupiah(order.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
