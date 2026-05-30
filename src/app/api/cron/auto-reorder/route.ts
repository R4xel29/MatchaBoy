import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateNextTriggeredAt } from "@/lib/auto-reorder-utils";

export async function GET(req: Request) {
    try {
        // Optional security token check
        const authHeader = req.headers.get("Authorization") || new URL(req.url).searchParams.get("token");
        const expectedToken = process.env.WA_BOT_API_KEY;
        if (expectedToken && authHeader !== expectedToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const now = new Date();

        // 1. Fetch due active auto-reorders
        const dueSchedules = await prisma.autoReorder.findMany({
            where: {
                isActive: true,
                nextTriggeredAt: {
                    lte: now
                }
            }
        });

        const processedSchedules = [];

        // 2. Loop through each due schedule and execute it within its own isolated transaction
        for (const schedule of dueSchedules) {
            try {
                await prisma.$transaction(async (tx) => {
                    // Lock the user's row to prevent wallet balance race conditions
                    const user = await tx.user.findUnique({
                        where: { id: schedule.userId },
                        select: { id: true, name: true, phone: true, walletBalance: true }
                    });

                    if (!user) {
                        throw new Error("USER_NOT_FOUND");
                    }

                    const subtotal = schedule.price * schedule.quantity;
                    const total = subtotal; // delivery fee is 0 for scheduled auto-reorder boxes

                    // Verify & deduct e-wallet balance if selected
                    if (schedule.paymentMethod === "WALLET") {
                        if (user.walletBalance < total) {
                            throw new Error("INSUFFICIENT_BALANCE");
                        }

                        // Deduct atomically
                        await tx.user.update({
                            where: { id: schedule.userId },
                            data: {
                                walletBalance: { decrement: total }
                            }
                        });
                    }

                    // Build standard modifiers string for OrderItem
                    let modsArray = [];
                    if (schedule.size && schedule.size !== "Normal") {
                        modsArray.push(`Ukuran: ${schedule.size}`);
                    }
                    if (schedule.iceLevel && schedule.iceLevel !== "Normal") {
                        modsArray.push(`Es: ${schedule.iceLevel}`);
                    }
                    if (schedule.sugarLevel && schedule.sugarLevel !== "Normal") {
                        modsArray.push(`Gula: ${schedule.sugarLevel}`);
                    }
                    if (schedule.addOns) {
                        try {
                            const parsedAddOns = JSON.parse(schedule.addOns);
                            if (Array.isArray(parsedAddOns) && parsedAddOns.length > 0) {
                                const addOnNames = parsedAddOns.map((a: any) => typeof a === "string" ? a : a.name).join(", ");
                                modsArray.push(`Topping: ${addOnNames}`);
                            }
                        } catch {}
                    }
                    const modsString = modsArray.join(" | ") || null;

                    // Generate a standard consecutive queue number for delivery order
                    const startOfDay = new Date();
                    startOfDay.setHours(0, 0, 0, 0);
                    const countToday = await tx.order.count({
                        where: {
                            createdAt: { gte: startOfDay }
                        }
                    });
                    const nextSeq = String(countToday + 1).padStart(3, "0");
                    const queueNumber = `DLV-${nextSeq}`;

                    // Create F&B order with PENDING status
                    const newOrder = await tx.order.create({
                        data: {
                            userId: schedule.userId,
                            orderType: "DELIVERY",
                            source: "APP",
                            customerName: user.name || "Pelanggan Otomatis",
                            customerPhone: user.phone || "",
                            address: schedule.deliveryAddress,
                            notes: `Pemesanan Otomatis (Auto-Reorder Subscription #${schedule.id})`,
                            subtotal,
                            deliveryFee: 0,
                            total,
                            paymentMethod: schedule.paymentMethod,
                            paymentProofUrl: schedule.paymentMethod === "WALLET" ? "/verified-wallet.svg" : null,
                            status: "PENDING",
                            queueNumber,
                            items: {
                                create: [
                                    {
                                        productId: schedule.productId,
                                        qty: schedule.quantity,
                                        price: schedule.price,
                                        modifiers: modsString
                                    }
                                ]
                            }
                        }
                    });

                    // Create Wallet Transaction log if WALLET payment method was used
                    if (schedule.paymentMethod === "WALLET") {
                        await tx.walletTransaction.create({
                            data: {
                                userId: schedule.userId,
                                amount: -total,
                                type: "PAYMENT",
                                description: `Pembayaran pesanan otomatis #${queueNumber}`,
                                referenceId: newOrder.id
                            }
                        });
                    }

                    // Shift nextTriggeredAt ahead based on scheduling frequency
                    const nextTrigger = calculateNextTriggeredAt(
                        schedule.frequency,
                        schedule.dayOfWeek,
                        schedule.dayOfMonth,
                        schedule.timeSlot,
                        now
                    );

                    // Update schedule triggers
                    await tx.autoReorder.update({
                        where: { id: schedule.id },
                        data: {
                            lastTriggeredAt: now,
                            nextTriggeredAt: nextTrigger
                        }
                    });

                    // Send an in-app notification to the user about their successful order
                    try {
                        await tx.notification.create({
                            data: {
                                userId: schedule.userId,
                                type: "order",
                                title: "Pemesanan Otomatis Berhasil! 🍵",
                                message: `Subscription reorder kamu untuk "${schedule.productName}" berhasil dibuat dengan nomor antrean ${queueNumber}.`,
                                linkUrl: `/profile`
                            }
                        });
                    } catch {}

                    processedSchedules.push({
                        id: schedule.id,
                        status: "SUCCESS",
                        orderId: newOrder.id,
                        queueNumber
                    });
                }, {
                    isolationLevel: "Serializable"
                });
            } catch (err: any) {
                // Calculate next trigger time to avoid getting stuck in infinite retries
                const nextTrigger = calculateNextTriggeredAt(
                    schedule.frequency,
                    schedule.dayOfWeek,
                    schedule.dayOfMonth,
                    schedule.timeSlot,
                    now
                );

                if (err.message === "INSUFFICIENT_BALANCE") {
                    // Update schedule to skip the current cycle
                    await prisma.autoReorder.update({
                        where: { id: schedule.id },
                        data: {
                            lastTriggeredAt: now,
                            nextTriggeredAt: nextTrigger
                        }
                    });

                    // Create insufficient balance notification
                    await prisma.notification.create({
                        data: {
                            userId: schedule.userId,
                            type: "system",
                            title: "Pemesanan Otomatis Gagal ⚠️",
                            message: `Saldo e-wallet tidak mencukupi untuk pemesanan otomatis "${schedule.productName}" (Tagihan: Rp${(schedule.price * schedule.quantity).toLocaleString("id-ID")}). Silakan isi saldo Anda.`,
                            linkUrl: "/profile"
                        }
                    });

                    processedSchedules.push({
                        id: schedule.id,
                        status: "FAILED_INSUFFICIENT_BALANCE"
                    });
                } else {
                    // General error: shift to next trigger to avoid infinite retries
                    await prisma.autoReorder.update({
                        where: { id: schedule.id },
                        data: {
                            lastTriggeredAt: now,
                            nextTriggeredAt: nextTrigger
                        }
                    });

                    processedSchedules.push({
                        id: schedule.id,
                        status: "FAILED_ERROR",
                        error: err.message || "Unknown error"
                    });
                }
            }
        }

        return NextResponse.json({
            success: true,
            processedCount: processedSchedules.length,
            results: processedSchedules
        });
    } catch (error: any) {
        console.error("Error running auto-reorder cron:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
