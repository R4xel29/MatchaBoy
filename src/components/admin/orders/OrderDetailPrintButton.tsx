'use client';

import { useState } from 'react';
import { Printer } from 'lucide-react';
import { ThermalReceiptModal, ReceiptData } from '@/components/cashier/ThermalReceiptModal';

interface OrderDetailPrintButtonProps {
  order: {
    id: string;
    queueNumber?: string | null;
    tableNumber?: string | null;
    customerName: string;
    customerPhone: string;
    orderType: string;
    paymentMethod: string;
    createdAt: string | Date;
    subtotal?: number;
    deliveryFee?: number;
    voucherCode?: string | null;
    hasTumbler?: boolean;
    total: number;
    notes?: string | null;
    pointsEarned?: number;
    items: Array<{
      id?: string;
      qty: number;
      price: number;
      modifiers?: string | null;
      product: {
        name: string;
        price?: number;
      };
    }>;
  };
}

export function OrderDetailPrintButton({ order }: OrderDetailPrintButtonProps) {
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const rawSubtotal = order.subtotal || order.total;
  const computedDiscount = Math.max(0, rawSubtotal + (order.deliveryFee || 0) - order.total);

  const receiptData: ReceiptData = {
    id: order.id,
    orderNumber: order.queueNumber ? `A-${order.queueNumber}` : undefined,
    queueNumber: order.queueNumber,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    orderType: order.orderType,
    tableNumber: order.tableNumber,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt,
    items: order.items.map((item) => {
      const origPrice = item.product.price && item.product.price > item.price ? item.product.price : undefined;
      const pDiscount = origPrice ? (origPrice - item.price) : undefined;
      return {
        name: item.product.name,
        qty: item.qty,
        price: item.price,
        originalPrice: origPrice,
        promoDiscount: pDiscount,
        modifiersString: item.modifiers || undefined,
      };
    }),
    subtotal: rawSubtotal,
    deliveryFee: order.deliveryFee || 0,
    voucherDiscount: computedDiscount,
    voucherCode: order.voucherCode || undefined,
    hasTumbler: order.hasTumbler || false,
    total: order.total,
    pointsEarned: order.pointsEarned,
    notes: order.notes || undefined,
  };

  return (
    <>
      <button
        onClick={() => setShowReceiptModal(true)}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200/80 font-bold text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
        title="Cetak Struk Thermal (58mm / 80mm)"
      >
        <Printer className="w-3.5 h-3.5 text-orange-600" />
        <span>Cetak Struk</span>
      </button>

      <ThermalReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        order={receiptData}
      />
    </>
  );
}
