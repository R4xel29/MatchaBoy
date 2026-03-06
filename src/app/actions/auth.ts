"use server"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function registerUser(formData: FormData) {
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string

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

    try {
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: "CUSTOMER"
            }
        })

        return { success: true }
    } catch (error) {
        return { error: "Terjadi kesalahan saat mendaftar" }
    }
}
