import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { id: true, name: true, email: true, phone: true, referralCode: true, points: true },
        });

        return NextResponse.json(user);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name, phone } = body;

        const data: any = {};
        if (name !== undefined) data.name = name;
        if (phone !== undefined) {
            data.phone = phone;
            data.phoneVerified = true;
        }

        const user = await prisma.user.update({
            where: { id: session.user.id },
            data,
        });

        return NextResponse.json({
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
