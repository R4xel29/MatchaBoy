import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// POST /api/admin/products — Create a new product
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (session?.user?.role !== 'ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await request.json();
        const { name, description, price, categoryId, badge, image, modifiers } = body;

        if (!name || !description || !price || !categoryId) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const product = await prisma.product.create({
            data: {
                name,
                description,
                price: Number(price),
                categoryId,
                badge: badge || null,
                image: image || null,
                modifiers: modifiers ? JSON.stringify(modifiers) : null,
            },
            include: { category: true },
        });

        return NextResponse.json(product, { status: 201 });
    } catch (error) {
        console.error('Error creating product:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
