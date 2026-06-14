import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    console.log("Seeding tables...")
    const tablesData = [
        { number: "1", capacity: 2, shape: "ROUND", x: 20, y: 30 },
        { number: "2", capacity: 4, shape: "RECTANGLE", x: 40, y: 30 },
        { number: "3", capacity: 2, shape: "ROUND", x: 20, y: 60 },
        { number: "4", capacity: 4, shape: "RECTANGLE", x: 40, y: 60 },
        { number: "5", capacity: 6, shape: "RECTANGLE", x: 75, y: 45 },
    ]

    for (const t of tablesData) {
        await prisma.diningTable.upsert({
            where: { number: t.number },
            update: {
                capacity: t.capacity,
                shape: t.shape,
                x: t.x,
                y: t.y,
                status: "AVAILABLE",
            },
            create: {
                number: t.number,
                capacity: t.capacity,
                shape: t.shape,
                x: t.x,
                y: t.y,
                status: "AVAILABLE",
            }
        })
    }
    console.log("Tables seeded successfully.")
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
