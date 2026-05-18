import { PrismaClient } from "@prisma/client"
import { PRODUCTS, CATEGORIES, ADD_ONS } from "../src/lib/constants"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
    console.log("Seeding database...")

    // Delete all data first
    await prisma.cashierShift.deleteMany()
    await prisma.orderItem.deleteMany()
    await prisma.order.deleteMany()
    await prisma.product.deleteMany()
    await prisma.category.deleteMany()
    await prisma.user.deleteMany()

    // 1. Create Default Users (Admin, Cashier, Customer)
    const password = await bcrypt.hash("password123", 10)

    await prisma.user.create({
        data: {
            name: "Admin User",
            email: "admin@arumseduh.com",
            password,
            role: "ADMIN"
        }
    })

    await prisma.user.create({
        data: {
            name: "Kasir Arum Seduh",
            email: "cashier@arumseduh.com",
            password,
            role: "CASHIER",
            phone: "081234567890"
        }
    })

    // 2. Insert Categories
    for (const c of CATEGORIES) {
        if (c.id === 'all') continue // skip the 'all' virtual category

        await prisma.category.create({
            data: {
                id: c.id,
                slug: c.slug,
                name: c.name
            }
        })
    }

    // 3. Insert Products (with modifiers persisted as JSON)
    for (const p of PRODUCTS) {
        if (!p.category || p.category === 'all') continue

        await prisma.product.create({
            data: {
                id: p.id,
                name: p.name,
                description: p.description,
                price: p.price,
                image: p.image,
                badge: p.badge,
                categoryId: p.category,
                modifiers: p.modifiers ? JSON.stringify(p.modifiers) : null,
            }
        })
    }

    console.log("Seeding finished successfully.")
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
