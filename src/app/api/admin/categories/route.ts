import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// GET /api/admin/categories — List all categories
export async function GET() {
    try {
        const session = await auth();
        if (session?.user?.role !== 'ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const categories = await prisma.category.findMany({
            orderBy: { name: 'asc' },
            include: { _count: { select: { products: true } } },
        });

        return NextResponse.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

// POST /api/admin/categories — Create a new category
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (session?.user?.role !== 'ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await request.json();
        const { name } = body;

        if (!name) {
            return new NextResponse('Name is required', { status: 400 });
        }

        const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

        const category = await prisma.category.create({
            data: { name, slug },
        });

        return NextResponse.json(category, { status: 201 });
    } catch (error) {
        console.error('Error creating category:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
