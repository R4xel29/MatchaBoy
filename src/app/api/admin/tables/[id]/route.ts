import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (session?.user?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await req.json()
        const { number, capacity, shape, status, x, y, occupiedSeats } = body

        // Check if table exists
        const existingTable = await prisma.diningTable.findUnique({
            where: { id }
        })
        if (!existingTable) {
            return NextResponse.json({ error: 'Table not found' }, { status: 404 })
        }

        // Check if number is updated and is unique
        if (number && number !== existingTable.number) {
            const numConflict = await prisma.diningTable.findUnique({
                where: { number }
            })
            if (numConflict) {
                return NextResponse.json({ error: 'Table number already exists' }, { status: 400 })
            }
        }

        // Build update data
        const updateData: any = {}
        if (number !== undefined) updateData.number = number
        if (capacity !== undefined) updateData.capacity = parseInt(capacity)
        if (shape !== undefined) updateData.shape = shape
        if (x !== undefined) updateData.x = parseInt(x)
        if (y !== undefined) updateData.y = parseInt(y)
        if (body.chairsJson !== undefined) updateData.chairsJson = body.chairsJson

        // Handle occupiedSeats and status synchronization
        if (occupiedSeats !== undefined) {
            const newOccupied = parseInt(occupiedSeats)
            updateData.occupiedSeats = newOccupied
            
            // Auto-adjust status based on occupied seats if it's not explicitly passed
            if (status === undefined) {
                if (newOccupied === 0 && existingTable.status === 'OCCUPIED') {
                    updateData.status = 'AVAILABLE'
                } else if (newOccupied > 0 && existingTable.status === 'AVAILABLE') {
                    updateData.status = 'OCCUPIED'
                }
            }
        }

        if (status !== undefined) {
            updateData.status = status
            // Auto-adjust occupiedSeats based on status if occupiedSeats is not explicitly passed
            if (status === 'AVAILABLE' && occupiedSeats === undefined) {
                updateData.occupiedSeats = 0
            } else if (status === 'OCCUPIED' && occupiedSeats === undefined && existingTable.occupiedSeats === 0) {
                updateData.occupiedSeats = 1
            }
        }

        const updated = await prisma.diningTable.update({
            where: { id },
            data: updateData
        })

        return NextResponse.json(updated)
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to update table' }, { status: 500 })
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (session?.user?.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        await prisma.diningTable.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to delete table' }, { status: 500 })
    }
}
