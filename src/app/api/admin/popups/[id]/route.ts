import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { logAdminAction } from '@/lib/admin-logger';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await req.json();
    
    // Valid fields that can be updated
    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.image !== undefined) updateData.image = body.image;
    if (body.linkUrl !== undefined) updateData.linkUrl = body.linkUrl || null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const popup = await prisma.promoPopup.update({
      where: { id },
      data: updateData,
    });

    await logAdminAction({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'PROMO_POPUP',
      entityId: id,
      details: `Mengedit informasi Promo Popup: "${popup.title}"`,
    });

    return NextResponse.json(popup);
  } catch (error) {
    console.error('Error updating popup:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const popup = await prisma.promoPopup.delete({
      where: { id },
    });

    await logAdminAction({
      userId: session.user.id,
      action: 'DELETE',
      entity: 'PROMO_POPUP',
      entityId: id,
      details: `Menghapus Promo Popup: "${popup.title}"`,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting popup:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
