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
            select: {
                id: true, name: true, email: true, phone: true,
                gender: true, birthDate: true,
                referralCode: true, points: true, role: true,
                image: true,
                tumblerCount: true,
                currentTumblerGoal: true,
                arusLevel: true,
                walletBalance: true,
                subscription: {
                    select: {
                        tier: true,
                        status: true,
                        expiresAt: true
                    }
                },
                accounts: {
                    select: { provider: true }
                },
                driverProfile: {
                    select: {
                        isOnline: true,
                        vehicleType: true,
                        plateNumber: true,
                        driverImageUrl: true,
                        shiftStart: true,
                        shiftEnd: true,
                    }
                }
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const isGoogleConnected = user.accounts.some((acc: any) => acc.provider === 'google');

        return NextResponse.json({
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            gender: user.gender,
            birthDate: user.birthDate,
            referralCode: user.referralCode,
            points: user.points,
            role: user.role,
            tumblerCount: user.tumblerCount,
            currentTumblerGoal: user.currentTumblerGoal,
            arusLevel: user.arusLevel,
            walletBalance: user.walletBalance,
            subscription: user.subscription,
            isGoogleConnected,
            driverProfile: user.driverProfile,
            image: user.image
        });
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
        const { name, email, phone, gender, birthDate, vehicleType, plateNumber, driverImageUrl, image } = body;

        const data: any = {};
        if (name !== undefined) data.name = name;
        if (email !== undefined) data.email = email;
        if (phone !== undefined) {
            data.phone = phone;
            data.phoneVerified = true;
        }
        if (gender !== undefined) data.gender = gender;
        if (birthDate !== undefined) data.birthDate = birthDate ? new Date(birthDate) : null;
        if (image !== undefined) data.image = image;

        // Update driver profile details if the logged in user is a driver
        if (session.user.role === 'DRIVER') {
            const driverData: any = {};
            if (vehicleType !== undefined) driverData.vehicleType = vehicleType;
            if (plateNumber !== undefined) driverData.plateNumber = plateNumber;
            
            // Sync image to driverImageUrl and vice-versa
            const finalImageUrl = driverImageUrl !== undefined ? driverImageUrl : image;
            if (finalImageUrl !== undefined) {
                driverData.driverImageUrl = finalImageUrl;
                data.image = finalImageUrl;
            }

            if (Object.keys(driverData).length > 0) {
                data.driverProfile = {
                    upsert: {
                        create: {
                            vehicleType: vehicleType || 'Motor',
                            plateNumber: plateNumber || '',
                            driverImageUrl: finalImageUrl || null,
                            status: 'APPROVED',
                        },
                        update: driverData
                    }
                };
            }
        }

        const user = await prisma.user.update({
            where: { id: session.user.id },
            data,
            include: {
                driverProfile: true,
                accounts: {
                    select: { provider: true }
                }
            }
        });

        const isGoogleConnected = user.accounts.some((acc: any) => acc.provider === 'google');

        return NextResponse.json({
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            gender: user.gender,
            birthDate: user.birthDate,
            isGoogleConnected,
            driverProfile: user.driverProfile,
            image: user.image
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
