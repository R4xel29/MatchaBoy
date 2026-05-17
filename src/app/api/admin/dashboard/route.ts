import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id || !['ADMIN', 'CASHIER'].includes(session.user.role || '')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const range = req.nextUrl.searchParams.get('range') || 'all'

        let dateFilter: any = {}
        const now = new Date()

        if (range === 'today') {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            dateFilter = { createdAt: { gte: start } }
        } else if (range === 'week') {
            const start = new Date(now)
            start.setDate(start.getDate() - 7)
            dateFilter = { createdAt: { gte: start } }
        } else if (range === 'month') {
            const start = new Date(now.getFullYear(), now.getMonth(), 1)
            dateFilter = { createdAt: { gte: start } }
        }

        const [totalOrders, revenue, totalCustomers, recentOrders] = await Promise.all([
            prisma.order.count({ where: dateFilter }),
            prisma.order.aggregate({
                _sum: { total: true },
                where: {
                    ...dateFilter,
                    status: { in: ['DELIVERED', 'ON_DELIVERY', 'COMPLETED'] }
                }
            }),
            prisma.user.count({ where: { role: 'CUSTOMER', ...dateFilter } }),
            prisma.order.findMany({
                take: 5,
                where: dateFilter,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    customerName: true,
                    customerPhone: true,
                    total: true,
                    status: true,
                    createdAt: true,
                }
            })
        ])

        return NextResponse.json({
            totalOrders,
            totalRevenue: revenue._sum.total || 0,
            totalCustomers,
            recentOrders,
        })
    } catch (error) {
        console.error('Dashboard API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
