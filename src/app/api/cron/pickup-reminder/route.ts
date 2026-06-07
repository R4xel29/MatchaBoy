import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPickupReminder } from "@/lib/whatsapp-service";

export async function GET(req: Request) {
    try {
        // Authorization check
        let token = req.headers.get("Authorization") || new URL(req.url).searchParams.get("token");
        if (token && token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        
        const expectedToken = process.env.WA_BOT_API_KEY;
        if (expectedToken && token !== expectedToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

        // Query all orders where status is 'READY', orderType is 'PICKUP', and updatedAt is <= 2 minutes ago
        const orders = await prisma.order.findMany({
            where: {
                status: 'READY',
                orderType: 'PICKUP',
                updatedAt: {
                    lte: twoMinutesAgo
                }
            },
            select: {
                id: true
            }
        });

        const remindedOrderIds: string[] = [];

        // For each matching order, call sendPickupReminder(orderId) and update updatedAt
        for (const order of orders) {
            try {
                // Call notification helper
                await sendPickupReminder(order.id);

                // Update the order's updatedAt field to the current date/time
                await prisma.order.update({
                    where: { id: order.id },
                    data: { updatedAt: new Date() }
                });

                remindedOrderIds.push(order.id);
            } catch (err: any) {
                console.error(`Error reminding order ${order.id}:`, err);
            }
        }

        return NextResponse.json({
            success: true,
            remindedCount: remindedOrderIds.length,
            remindedOrderIds
        });
    } catch (error: any) {
        console.error("Error running pickup-reminder cron:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
