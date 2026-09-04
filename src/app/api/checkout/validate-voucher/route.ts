import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { validateAndCalculateDiscount } from '@/lib/discount-utils';

export async function POST(req: Request) {
  try {
    const session = await auth();
    const body = await req.json();

    const { code, items, subtotal, customerPhone, userId } = body;
    if (!code || !code.trim()) {
      return NextResponse.json({ error: 'Kode voucher atau promo wajib diisi' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    // Priority for userId: explicitly provided in body (e.g. from cashier looking up member), or active session
    const effectiveUserId = userId || (session?.user?.role !== 'CASHIER' ? session?.user?.id : null);

    // Calculate subtotal if not provided from items
    let effectiveSubtotal = Number(subtotal) || 0;
    if (effectiveSubtotal <= 0 && Array.isArray(items) && items.length > 0) {
      effectiveSubtotal = items.reduce((sum: number, item: any) => {
        const itemPrice = Number(item.price || item.basePrice || 0) + Number(item.sizePrice || 0);
        return sum + itemPrice * Number(item.quantity || item.qty || 1);
      }, 0);
    }

    // Call unified discount calculator
    const result = await validateAndCalculateDiscount({
      code: cleanCode,
      items: items || [],
      subtotal: effectiveSubtotal,
      userId: effectiveUserId,
      customerPhone: customerPhone || null,
    });

    if (!result.valid) {
      return NextResponse.json({ error: result.error || 'Voucher atau kode promo tidak valid' }, { status: 400 });
    }

    // Resolve eligible product names if validProductIds exist
    let validProductIds: string[] = [];
    let validProductNames: string[] = [];
    if (result.templateId) {
      const tmpl = await prisma.voucherTemplate.findUnique({
        where: { id: result.templateId },
        select: { validProductIds: true },
      });
      if (tmpl?.validProductIds) {
        try {
          const parsed = JSON.parse(tmpl.validProductIds);
          if (Array.isArray(parsed) && parsed.length > 0) {
            validProductIds = parsed;
            const prods = await prisma.product.findMany({
              where: { id: { in: validProductIds } },
              select: { name: true },
            });
            validProductNames = prods.map((p) => p.name);
          }
        } catch {}
      }
    }

    return NextResponse.json({
      success: true,
      voucher: {
        id: result.voucherId || result.templateId || result.code,
        code: result.code,
        type: result.type,
        description: result.description,
        discountAmount: result.discountAmount,
        minPurchase: result.minPurchase || 0,
        maxDiscount: result.maxDiscount || null,
        validProductIds,
        validProductNames,
        template: {
          discountValue: result.discountAmount,
          minPurchase: result.minPurchase || 0,
          maxDiscount: result.maxDiscount || null,
          validProductIds: validProductIds.length > 0 ? JSON.stringify(validProductIds) : null,
        },
      },
    });
  } catch (error: any) {
    console.error('Validate voucher error:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memvalidasi kode voucher' },
      { status: 500 }
    );
  }
}
