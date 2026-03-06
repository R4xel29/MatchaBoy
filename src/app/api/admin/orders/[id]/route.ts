import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        // RBAC: Only ADMIN or DRIVER could theoretically update orders, but let's stick to ADMIN for Phase 10
        if (session?.user?.role !== 'ADMIN') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await request.json();
        const { status } = body;

        const validStatuses = ['PENDING_PAYMENT', 'ASSIGNED', 'TO_STORE', 'PICKED_UP', 'ON_DELIVERY', 'DELIVERED'];
        if (!validStatuses.includes(status)) {
            return new NextResponse('Invalid status', { status: 400 });
        }

        const { id } = await params;
        const order = await prisma.order.update({
            where: {
                id,
            },
            data: {
                status,
            },
        });

        return NextResponse.json(order);
    } catch (error) {
        console.error('Error updating order:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
