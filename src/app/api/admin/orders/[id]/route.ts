import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { logAdminAction } from '@/lib/admin-logger';
import { processOrderCompletion } from '@/lib/loyalty-utils';

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

        const validStatuses = ['PENDING', 'PENDING_PAYMENT', 'PREPARING', 'READY', 'COMPLETED', 'ASSIGNED', 'TO_STORE', 'PICKED_UP', 'ON_DELIVERY', 'DELIVERED', 'CANCELLED'];
        if (!validStatuses.includes(status)) {
            return new NextResponse('Invalid status', { status: 400 });
        }

        const { id } = await params;
        const existingOrder = await prisma.order.findUnique({
            where: { id },
            select: { id: true, status: true, customerName: true }
        });

        if (!existingOrder) {
            return new NextResponse('Order not found', { status: 404 });
        }

        const order = await prisma.order.update({
            where: {
                id,
            },
            data: {
                status,
            },
        });

        await logAdminAction({
            userId: session.user.id,
            action: 'UPDATE',
            entity: 'ORDER',
            entityId: id,
            details: `Mengubah status pesanan #${id.slice(-6).toUpperCase()} (${existingOrder.customerName}) dari ${existingOrder.status} menjadi ${status}`
        });

        // Otomatis tambah poin jika status COMPLETED atau DELIVERED
        if (status === 'COMPLETED' || status === 'DELIVERED') {
            try {
                const completionResult = await processOrderCompletion(id);
                
                // Send in-app notification to user
                if (order.userId) {
                    try {
                        const { sendTemplatedNotification, sendNotification } = await import('@/lib/notification-service');
                        
                        // Try templated first, fallback to direct
                        const sent = await sendTemplatedNotification({
                            userId: order.userId,
                            trigger: 'ORDER_COMPLETED',
                            variables: {
                                name: existingOrder.customerName,
                                orderNo: id.slice(0, 8).toUpperCase(),
                                points: String(completionResult?.cups || 0),
                            },
                            linkUrl: `/orders/${id}`,
                        });
                        
                        if (!sent) {
                            await sendNotification({
                                userId: order.userId,
                                type: 'order',
                                title: 'Pesanan Selesai! 🎉',
                                message: `Pesanan #${id.slice(0, 8).toUpperCase()} telah selesai. Kamu mendapat ${completionResult?.cups || 0} poin!`,
                                linkUrl: `/orders/${id}`,
                            });
                        }
                    } catch (notifErr) {
                        console.error('Notification error (non-blocking):', notifErr);
                    }
                }
            } catch (err) {
                console.error('Loyalty processing error (non-blocking):', err);
            }
        }

        return NextResponse.json(order);
    } catch (error) {
        console.error('Error updating order:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
