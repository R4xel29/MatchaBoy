import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { logAdminAction } from '@/lib/admin-logger';

// GET /api/admin/toppings — List all toppings
export async function GET() {
    try {
        const session = await auth();
        if (session?.user?.role !== 'ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const toppings = await prisma.topping.findMany({
            orderBy: { name: 'asc' },
            include: { 
                ingredient: true,
                productToppings: true
            },
        });

        return NextResponse.json(toppings);
    } catch (error) {
        console.error('Error fetching toppings:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

// POST /api/admin/toppings — Create a new topping
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (session?.user?.role !== 'ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await request.json();
        const { name, price, ingredientId, ingredientQty, isAvailable, image } = body;

        if (!name) {
            return new NextResponse('Name is required', { status: 400 });
        }

        const data: any = {
            name,
            price: price ? parseInt(price) : 0,
            isAvailable: isAvailable ?? true,
        };

        if (image !== undefined) {
            data.image = image;
        }

        if (ingredientId) {
            data.ingredientId = ingredientId;
            data.ingredientQty = ingredientQty ? parseFloat(ingredientQty) : 1;
        }

        const topping = await prisma.topping.create({
            data,
            include: {
                ingredient: true
            }
        });

        await logAdminAction({
            userId: session.user.id,
            action: 'CREATE',
            entity: 'TOPPING',
            entityId: topping.id,
            details: `Membuat topping baru: "${name}"`
        });

        return NextResponse.json(topping, { status: 201 });
    } catch (error) {
        console.error('Error creating topping:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
