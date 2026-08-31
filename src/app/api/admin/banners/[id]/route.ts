import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { logAdminAction } from '@/lib/admin-logger';
import { invalidateBannerCache } from '@/lib/redis-cache';

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
    if (body.image !== undefined) updateData.image = body.image;
    if (body.headline !== undefined) updateData.headline = body.headline;
    if (body.subheadline !== undefined) updateData.subheadline = body.subheadline;
    if (body.alt !== undefined) updateData.alt = body.alt;
    if (body.order !== undefined) updateData.order = body.order;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.isCover !== undefined) updateData.isCover = body.isCover;

    const banner = await prisma.heroBanner.update({
      where: { id },
      data: updateData,
    });

    await logAdminAction({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'BANNER',
      entityId: id,
      details: `Mengedit informasi Banner Promo: "${banner.headline.replace(/\n/g, ' ')}"`,
    });

    await invalidateBannerCache();

    return NextResponse.json(banner);
  } catch (error) {
    console.error('Error updating banner:', error);
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

    const banner = await prisma.heroBanner.delete({
      where: { id },
    });

    await logAdminAction({
      userId: session.user.id,
      action: 'DELETE',
      entity: 'BANNER',
      entityId: id,
      details: `Menghapus Banner Promo: "${banner.headline.replace(/\n/g, ' ')}"`,
    });

    await invalidateBannerCache();

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting banner:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
