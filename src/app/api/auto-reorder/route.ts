import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calculateNextTriggeredAt } from "@/lib/auto-reorder-utils";

// 1. GET: Retrieve all active/inactive schedules for the logged-in user
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const schedules = await prisma.autoReorder.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json(schedules);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

// 2. POST: Create a new auto-reorder schedule
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const {
            productId,
            quantity = 1,
            size = "Normal",
            iceLevel = "Normal",
            sugarLevel = "Normal",
            addOns, // Array of add-on objects or strings, or JSON string
            frequency, // DAILY, WEEKLY, MONTHLY
            dayOfWeek, // 0-6
            dayOfMonth, // 1-31
            timeSlot, // HH:mm
            deliveryAddress,
            paymentMethod = "WALLET",
            isActive = true
        } = body;

        // Basic inputs validation
        if (!productId || !frequency || !timeSlot || !deliveryAddress) {
            return NextResponse.json({ error: "Missing required fields (productId, frequency, timeSlot, deliveryAddress)" }, { status: 400 });
        }

        if (quantity < 1) {
            return NextResponse.json({ error: "Quantity must be at least 1" }, { status: 400 });
        }

        if (!["DAILY", "WEEKLY", "MONTHLY"].includes(frequency)) {
            return NextResponse.json({ error: "Invalid frequency (must be DAILY, WEEKLY, or MONTHLY)" }, { status: 400 });
        }

        if (frequency === "WEEKLY" && (dayOfWeek === undefined || dayOfWeek === null || dayOfWeek < 0 || dayOfWeek > 6)) {
            return NextResponse.json({ error: "Invalid dayOfWeek for WEEKLY (must be 0-6)" }, { status: 400 });
        }

        if (frequency === "MONTHLY" && (dayOfMonth === undefined || dayOfMonth === null || dayOfMonth < 1 || dayOfMonth > 31)) {
            return NextResponse.json({ error: "Invalid dayOfMonth for MONTHLY (must be 1-31)" }, { status: 400 });
        }

        if (!["WALLET", "COD"].includes(paymentMethod.toUpperCase())) {
            return NextResponse.json({ error: "Invalid paymentMethod (must be WALLET or COD)" }, { status: 400 });
        }

        // Fetch product to calculate server-side price and store productName
        const dbProduct = await prisma.product.findUnique({
            where: { id: productId }
        });

        if (!dbProduct) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        let secureItemPrice = dbProduct.price;
        let dbModifiers: any = {};
        if (dbProduct.modifiers) {
            try {
                dbModifiers = JSON.parse(dbProduct.modifiers);
            } catch {}
        }

        // Calculate size adjustment
        if (size && size !== "Normal" && dbModifiers.sizes && Array.isArray(dbModifiers.sizes)) {
            const validSize = dbModifiers.sizes.find((s: any) => s.name === size);
            if (validSize) {
                secureItemPrice += validSize.price;
            }
        }

        // Calculate add-ons adjustment and format addOns string for database
        let parsedAddOns: any[] = [];
        let totalAddOnsPrice = 0;
        if (addOns) {
            if (typeof addOns === "string") {
                try {
                    parsedAddOns = JSON.parse(addOns);
                } catch {
                    // Try to split by comma or other logic if simple list
                }
            } else if (Array.isArray(addOns)) {
                parsedAddOns = addOns;
            }
        }

        const storedAddOns: any[] = [];
        if (Array.isArray(parsedAddOns) && dbModifiers.addOns) {
            for (const item of parsedAddOns) {
                const addOnId = typeof item === "string" ? item : (item.id || item.name);
                const validAddOn = dbModifiers.addOns.find((a: any) => a.id === addOnId);
                if (validAddOn) {
                    totalAddOnsPrice += validAddOn.price;
                    storedAddOns.push({
                        id: validAddOn.id,
                        name: validAddOn.name,
                        price: validAddOn.price
                    });
                }
            }
        }
        secureItemPrice += totalAddOnsPrice;

        // Calculate initial nextTriggeredAt
        const now = new Date();
        const nextTriggeredAt = isActive
            ? calculateNextTriggeredAt(frequency, dayOfWeek ?? null, dayOfMonth ?? null, timeSlot, now)
            : null;

        // Create the AutoReorder schedule
        const newSchedule = await prisma.autoReorder.create({
            data: {
                userId: session.user.id,
                productId,
                productName: dbProduct.name,
                price: secureItemPrice,
                quantity,
                size,
                iceLevel,
                sugarLevel,
                addOns: storedAddOns.length > 0 ? JSON.stringify(storedAddOns) : null,
                frequency,
                dayOfWeek: dayOfWeek !== undefined ? Number(dayOfWeek) : null,
                dayOfMonth: dayOfMonth !== undefined ? Number(dayOfMonth) : null,
                timeSlot,
                deliveryAddress,
                paymentMethod: paymentMethod.toUpperCase(),
                isActive,
                nextTriggeredAt
            }
        });

        return NextResponse.json(newSchedule, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

// 3. PATCH: Modify an existing auto-reorder schedule
export async function PATCH(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id") || body.id;

        if (!id) {
            return NextResponse.json({ error: "Missing auto-reorder ID" }, { status: 400 });
        }

        const existingSchedule = await prisma.autoReorder.findUnique({
            where: { id }
        });

        if (!existingSchedule) {
            return NextResponse.json({ error: "Auto-reorder schedule not found" }, { status: 404 });
        }

        if (existingSchedule.userId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden: You do not own this schedule" }, { status: 403 });
        }

        // Prepare update data
        const updateData: any = {};
        let shouldRecalculatePrice = false;
        let shouldRecalculateNextTrigger = false;

        const {
            productId,
            quantity,
            size,
            iceLevel,
            sugarLevel,
            addOns,
            frequency,
            dayOfWeek,
            dayOfMonth,
            timeSlot,
            deliveryAddress,
            paymentMethod,
            isActive
        } = body;

        if (productId !== undefined) {
            updateData.productId = productId;
            shouldRecalculatePrice = true;
        }

        if (quantity !== undefined) {
            if (quantity < 1) {
                return NextResponse.json({ error: "Quantity must be at least 1" }, { status: 400 });
            }
            updateData.quantity = Number(quantity);
        }

        if (size !== undefined) {
            updateData.size = size;
            shouldRecalculatePrice = true;
        }

        if (iceLevel !== undefined) updateData.iceLevel = iceLevel;
        if (sugarLevel !== undefined) updateData.sugarLevel = sugarLevel;

        if (addOns !== undefined) {
            shouldRecalculatePrice = true;
        }

        if (frequency !== undefined) {
            if (!["DAILY", "WEEKLY", "MONTHLY"].includes(frequency)) {
                return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
            }
            updateData.frequency = frequency;
            shouldRecalculateNextTrigger = true;
        }

        if (dayOfWeek !== undefined) {
            if (dayOfWeek !== null && (dayOfWeek < 0 || dayOfWeek > 6)) {
                return NextResponse.json({ error: "Invalid dayOfWeek for WEEKLY (must be 0-6)" }, { status: 400 });
            }
            updateData.dayOfWeek = dayOfWeek !== null ? Number(dayOfWeek) : null;
            shouldRecalculateNextTrigger = true;
        }

        if (dayOfMonth !== undefined) {
            if (dayOfMonth !== null && (dayOfMonth < 1 || dayOfMonth > 31)) {
                return NextResponse.json({ error: "Invalid dayOfMonth for MONTHLY (must be 1-31)" }, { status: 400 });
            }
            updateData.dayOfMonth = dayOfMonth !== null ? Number(dayOfMonth) : null;
            shouldRecalculateNextTrigger = true;
        }

        if (timeSlot !== undefined) {
            updateData.timeSlot = timeSlot;
            shouldRecalculateNextTrigger = true;
        }

        if (deliveryAddress !== undefined) updateData.deliveryAddress = deliveryAddress;

        if (paymentMethod !== undefined) {
            if (!["WALLET", "COD"].includes(paymentMethod.toUpperCase())) {
                return NextResponse.json({ error: "Invalid paymentMethod (must be WALLET or COD)" }, { status: 400 });
            }
            updateData.paymentMethod = paymentMethod.toUpperCase();
        }

        if (isActive !== undefined) {
            updateData.isActive = Boolean(isActive);
            shouldRecalculateNextTrigger = true;
        }

        // Recalculate price if product, size, or add-ons changed
        const finalProductId = productId || existingSchedule.productId;
        const finalSize = size !== undefined ? size : existingSchedule.size;
        const finalAddOns = addOns !== undefined ? addOns : existingSchedule.addOns;

        if (shouldRecalculatePrice) {
            const dbProduct = await prisma.product.findUnique({
                where: { id: finalProductId }
            });

            if (!dbProduct) {
                return NextResponse.json({ error: "Product not found" }, { status: 404 });
            }

            updateData.productName = dbProduct.name;
            let secureItemPrice = dbProduct.price;
            let dbModifiers: any = {};
            if (dbProduct.modifiers) {
                try {
                    dbModifiers = JSON.parse(dbProduct.modifiers);
                } catch {}
            }

            // Size adjustment
            if (finalSize && finalSize !== "Normal" && dbModifiers.sizes && Array.isArray(dbModifiers.sizes)) {
                const validSize = dbModifiers.sizes.find((s: any) => s.name === finalSize);
                if (validSize) {
                    secureItemPrice += validSize.price;
                }
            }

            // Add-ons adjustment
            let parsedAddOns: any[] = [];
            let totalAddOnsPrice = 0;
            if (finalAddOns) {
                if (typeof finalAddOns === "string") {
                    try {
                        parsedAddOns = JSON.parse(finalAddOns);
                    } catch {}
                } else if (Array.isArray(finalAddOns)) {
                    parsedAddOns = finalAddOns;
                }
            }

            const storedAddOns: any[] = [];
            if (Array.isArray(parsedAddOns) && dbModifiers.addOns) {
                for (const item of parsedAddOns) {
                    const addOnId = typeof item === "string" ? item : (item.id || item.name);
                    const validAddOn = dbModifiers.addOns.find((a: any) => a.id === addOnId);
                    if (validAddOn) {
                        totalAddOnsPrice += validAddOn.price;
                        storedAddOns.push({
                            id: validAddOn.id,
                            name: validAddOn.name,
                            price: validAddOn.price
                        });
                    }
                }
            }
            secureItemPrice += totalAddOnsPrice;
            updateData.price = secureItemPrice;
            updateData.addOns = storedAddOns.length > 0 ? JSON.stringify(storedAddOns) : null;
        }

        // Recalculate nextTriggeredAt if scheduling details or active status changed
        if (shouldRecalculateNextTrigger) {
            const finalIsActive = isActive !== undefined ? Boolean(isActive) : existingSchedule.isActive;
            if (!finalIsActive) {
                updateData.nextTriggeredAt = null;
            } else {
                const finalFrequency = frequency || existingSchedule.frequency;
                const finalDayOfWeek = dayOfWeek !== undefined ? (dayOfWeek !== null ? Number(dayOfWeek) : null) : existingSchedule.dayOfWeek;
                const finalDayOfMonth = dayOfMonth !== undefined ? (dayOfMonth !== null ? Number(dayOfMonth) : null) : existingSchedule.dayOfMonth;
                const finalTimeSlot = timeSlot || existingSchedule.timeSlot;

                updateData.nextTriggeredAt = calculateNextTriggeredAt(
                    finalFrequency,
                    finalDayOfWeek,
                    finalDayOfMonth,
                    finalTimeSlot,
                    new Date()
                );
            }
        }

        // Update database record
        const updatedSchedule = await prisma.autoReorder.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json(updatedSchedule);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

// 4. DELETE: Cancel/delete an existing auto-reorder schedule
export async function DELETE(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            const body = await req.json().catch(() => ({}));
            if (!body.id) {
                return NextResponse.json({ error: "Missing auto-reorder ID" }, { status: 400 });
            }
        }

        const targetId = id || (await req.json().catch(() => ({}))).id;

        const existingSchedule = await prisma.autoReorder.findUnique({
            where: { id: targetId }
        });

        if (!existingSchedule) {
            return NextResponse.json({ error: "Auto-reorder schedule not found" }, { status: 404 });
        }

        if (existingSchedule.userId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden: You do not own this schedule" }, { status: 403 });
        }

        await prisma.autoReorder.delete({
            where: { id: targetId }
        });

        return NextResponse.json({ success: true, message: "Auto-reorder schedule successfully canceled and deleted." });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
