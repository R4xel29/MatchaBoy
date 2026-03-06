import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// PATCH /api/admin/products/[id] — Update product fields
export async function PATCH(
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
        const { name, description, price, categoryId, badge, image } = body;

        const data: Record<string, any> = {};
        if (name !== undefined) data.name = name;
        if (description !== undefined) data.description = description;
        if (price !== undefined) data.price = Number(price);
        if (categoryId !== undefined) data.categoryId = categoryId;
        if (badge !== undefined) data.badge = badge;
        if (image !== undefined) data.image = image;

        const product = await prisma.product.update({
            where: { id },
            data,
            include: { category: true },
        });

        return NextResponse.json(product);
    } catch (error) {
        console.error('Error updating product:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

// DELETE /api/admin/products/[id] — Delete a product
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

        await prisma.product.delete({ where: { id } });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting product:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
