import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { logAdminAction } from '@/lib/admin-logger';

// POST /api/admin/products/[id]/flash-sale — Set/Update active promo (flash sale) inside modifiers
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { promoPrice, startDate, endDate } = body;

    if (!promoPrice || !startDate || !endDate) {
      return new NextResponse('Missing required fields: promoPrice, startDate, endDate', { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id }
    });

    if (!product) {
      return new NextResponse('Product not found', { status: 404 });
    }

    let modifiersObj: any = {};
    if (product.modifiers) {
      try {
        modifiersObj = JSON.parse(product.modifiers);
      } catch {
        modifiersObj = {};
      }
    }

    // Set or update the promo block
    modifiersObj.promo = {
      isActive: true,
      promoPrice: Number(promoPrice),
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString()
    };

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        modifiers: JSON.stringify(modifiersObj)
      }
    });

    await logAdminAction({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'PRODUCT',
      entityId: id,
      details: `Mengaktifkan Flash Sale untuk "${product.name}" (Harga Promo: Rp${Number(promoPrice).toLocaleString('id-ID')}, berakhir pada ${new Date(endDate).toLocaleString('id-ID')})`
    });

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (error: any) {
    console.error('Error setting flash sale:', error);
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
  }
}

// DELETE /api/admin/products/[id]/flash-sale — Disable or remove active promo
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (session?.user?.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const product = await prisma.product.findUnique({
      where: { id }
    });

    if (!product) {
      return new NextResponse('Product not found', { status: 404 });
    }

    if (!product.modifiers) {
      return NextResponse.json({ success: true, message: 'No promo was set.' });
    }

    let modifiersObj: any = {};
    try {
      modifiersObj = JSON.parse(product.modifiers);
    } catch {
      modifiersObj = {};
    }

    if (modifiersObj.promo) {
      modifiersObj.promo.isActive = false;
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        modifiers: JSON.stringify(modifiersObj)
      }
    });

    await logAdminAction({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'PRODUCT',
      entityId: id,
      details: `Menonaktifkan Flash Sale untuk "${product.name}"`
    });

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (error: any) {
    console.error('Error removing flash sale:', error);
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
  }
}
