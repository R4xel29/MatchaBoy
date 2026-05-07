"use server"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function registerUser(formData: FormData) {
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const referralCode = formData.get("referralCode") as string | null

    if (!email || !password || !name) {
        return { error: "Semua kolom harus diisi!" }
    }

    const existingUser = await prisma.user.findUnique({
        where: { email }
    })

    if (existingUser) {
        return { error: "Email sudah terdaftar!" }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Cek referral code jika ada
    let referrerId: string | undefined = undefined
    if (referralCode) {
        const referrer = await prisma.user.findUnique({
            where: { referralCode },
            select: { id: true }
        })
        if (referrer) {
            referrerId = referrer.id
        }
    }

    try {
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: "CUSTOMER",
                ...(referrerId ? { referredById: referrerId } : {}),
            }
        })

        return { success: true }
    } catch (error) {
        return { error: "Terjadi kesalahan saat mendaftar" }
    }
}

