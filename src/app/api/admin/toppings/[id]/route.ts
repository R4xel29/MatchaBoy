import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { logAdminAction } from '@/lib/admin-logger';

// PATCH /api/admin/toppings/[id] — Update a topping
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (session?.user?.role !== 'ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { name, price, ingredientId, ingredientQty, isAvailable, image } = body;

        const data: any = {};
        
        if (name !== undefined) data.name = name;
        if (price !== undefined) data.price = parseInt(price);
        if (isAvailable !== undefined) data.isAvailable = isAvailable;
        if (image !== undefined) data.image = image;
        
        if (ingredientId !== undefined) {
            data.ingredientId = ingredientId === '' ? null : ingredientId;
        }
        if (ingredientQty !== undefined) {
            data.ingredientQty = parseFloat(ingredientQty);
        }

        const topping = await prisma.topping.update({
            where: { id },
            data,
            include: {
                ingredient: true
            }
        });

        await logAdminAction({
            userId: session.user.id,
            action: 'UPDATE',
            entity: 'TOPPING',
            entityId: topping.id,
            details: `Mengupdate topping: "${topping.name}"`
        });

        return NextResponse.json(topping);
    } catch (error) {
        console.error('Error updating topping:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

// DELETE /api/admin/toppings/[id] — Delete a topping
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (session?.user?.role !== 'ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { id } = await params;
        const topping = await prisma.topping.delete({
            where: { id },
        });

        await logAdminAction({
            userId: session.user.id,
            action: 'DELETE',
            entity: 'TOPPING',
            entityId: id,
            details: `Menghapus topping: "${topping.name}"`
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting topping:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
