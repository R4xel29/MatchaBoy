import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const locations = await prisma.location.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(locations);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { address, lat, lng, isDefault, name, recipient, phone, notes } = body;

        if (!address) {
            return NextResponse.json({ error: "Address is required" }, { status: 400 });
        }

        // If making this default, unset other defaults
        if (isDefault) {
            await prisma.location.updateMany({
                where: { userId: session.user.id, isDefault: true },
                data: { isDefault: false },
            });
        }

        const newLocation = await prisma.location.create({
            data: {
                userId: session.user.id,
                address,
                lat: lat || null,
                lng: lng || null,
                isDefault: isDefault || false,
                name: name || null,
                recipient: recipient || null,
                phone: phone || null,
                notes: notes || null,
            },
        });

        return NextResponse.json(newLocation, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
