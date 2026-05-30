import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Login diperlukan untuk membuat group cart' }, { status: 401 })
        }

        const groupCart = await prisma.groupCart.create({
            data: {
                creatorId: session.user.id,
                status: 'ACTIVE'
            }
        })

        return NextResponse.json({ id: groupCart.id })
    } catch (error: any) {
        console.error('Error creating group cart:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

export async function GET(req: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const activeCart = await prisma.groupCart.findFirst({
            where: {
                creatorId: session.user.id,
                status: 'ACTIVE'
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json({ activeCart })
    } catch (error: any) {
        console.error('Error fetching active group cart:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
