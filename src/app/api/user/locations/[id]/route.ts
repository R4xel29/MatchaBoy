import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();

        const location = await prisma.location.findFirst({
            where: { id, userId: session.user.id }
        });

        if (!location) {
            return NextResponse.json({ error: "Location not found" }, { status: 404 });
        }

        // Unset other defaults if this is set to true
        if (body.isDefault) {
            await prisma.location.updateMany({
                where: { userId: session.user.id, isDefault: true },
                data: { isDefault: false },
            });
        }

        const updatedLocation = await prisma.location.update({
            where: { id },
            data: {
                address: body.address !== undefined ? body.address : location.address,
                lat: body.lat !== undefined ? body.lat : location.lat,
                lng: body.lng !== undefined ? body.lng : location.lng,
                isDefault: body.isDefault !== undefined ? body.isDefault : location.isDefault,
                name: body.name !== undefined ? body.name : location.name,
                recipient: body.recipient !== undefined ? body.recipient : location.recipient,
                phone: body.phone !== undefined ? body.phone : location.phone,
                notes: body.notes !== undefined ? body.notes : location.notes,
            },
        });

        return NextResponse.json(updatedLocation);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const location = await prisma.location.findFirst({
            where: { id, userId: session.user.id }
        });

        if (!location) {
            return NextResponse.json({ error: "Location not found" }, { status: 404 });
        }

        await prisma.location.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
