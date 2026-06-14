import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET() {
    try {
        const tables = await prisma.diningTable.findMany({
            orderBy: { number: 'asc' }
        })
        return NextResponse.json(tables)
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to fetch tables' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth()
        if (session?.user?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { number, capacity, shape, x, y } = body

        if (!number) {
            return NextResponse.json({ error: 'Table number is required' }, { status: 400 })
        }

        const existing = await prisma.diningTable.findUnique({
            where: { number }
        })
        if (existing) {
            return NextResponse.json({ error: 'Table number already exists' }, { status: 400 })
        }

        const table = await prisma.diningTable.create({
            data: {
                number,
                capacity: capacity ? parseInt(capacity) : 2,
                shape: shape || 'RECTANGLE',
                x: x !== undefined ? parseInt(x) : 0,
                y: y !== undefined ? parseInt(y) : 0,
                status: 'AVAILABLE'
            }
        })

        return NextResponse.json(table)
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to create table' }, { status: 500 })
    }
}
