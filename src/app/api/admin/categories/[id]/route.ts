import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// PATCH /api/admin/categories/[id] — Update a category
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
        const { name } = body;

        const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

        const category = await prisma.category.update({
            where: { id },
            data: { name, slug },
        });

        return NextResponse.json(category);
    } catch (error) {
        console.error('Error updating category:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

// DELETE /api/admin/categories/[id] — Delete a category
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

        // Check if category has products
        const productCount = await prisma.product.count({ where: { categoryId: id } });
        if (productCount > 0) {
            return NextResponse.json(
                { error: `Cannot delete: ${productCount} products still use this category.` },
                { status: 409 }
            );
        }

        await prisma.category.delete({ where: { id } });
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error deleting category:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
