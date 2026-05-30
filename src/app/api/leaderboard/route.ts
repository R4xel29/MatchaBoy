import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSafeErrorResponse, logError } from '@/lib/errors'

export async function GET(req: Request) {
    try {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

        // 1. Top Spenders (Sum of completed orders this month)
        const topSpendersRaw = await prisma.order.groupBy({
            by: ['userId'],
            where: {
                status: 'COMPLETED',
                userId: { not: null },
                createdAt: { gte: startOfMonth },
            },
            _sum: {
                total: true,
            },
            orderBy: {
                _sum: {
                    total: 'desc',
                },
            },
            take: 10,
        })

        // 2. Most Loyal (Count of completed orders this month)
        const mostLoyalRaw = await prisma.order.groupBy({
            by: ['userId'],
            where: {
                status: 'COMPLETED',
                userId: { not: null },
                createdAt: { gte: startOfMonth },
            },
            _count: {
                id: true,
            },
            orderBy: {
                _count: {
                    id: 'desc',
                },
            },
            take: 10,
        })

        // 3. Top Referrers (Referred count)
        const topReferrersRaw = await prisma.user.groupBy({
            by: ['referredById'],
            where: {
                referredById: { not: null },
            },
            _count: {
                id: true,
            },
            orderBy: {
                _count: {
                    id: 'desc',
                },
            },
            take: 10,
        })

        // Gather all user IDs that we need to look up
        const spendIds = topSpendersRaw.map(r => r.userId).filter(Boolean) as string[]
        const loyalIds = mostLoyalRaw.map(r => r.userId).filter(Boolean) as string[]
        const referrerIds = topReferrersRaw.map(r => r.referredById).filter(Boolean) as string[]
        
        const allUserIds = Array.from(new Set([...spendIds, ...loyalIds, ...referrerIds]))

        const users = await prisma.user.findMany({
            where: {
                id: { in: allUserIds }
            },
            select: {
                id: true,
                name: true,
                image: true
            }
        })

        const userMap = new Map(users.map(u => [u.id, u]))

        // Format Top Spenders
        const topSpenders = topSpendersRaw
            .map(r => {
                const user = userMap.get(r.userId || '')
                return {
                    id: r.userId,
                    name: user?.name || 'Teman Matchaboy',
                    image: user?.image || null,
                    value: r._sum.total || 0
                }
            })
            .filter(item => item.id !== null)

        // Format Most Loyal
        const mostLoyal = mostLoyalRaw
            .map(r => {
                const user = userMap.get(r.userId || '')
                return {
                    id: r.userId,
                    name: user?.name || 'Teman Matchaboy',
                    image: user?.image || null,
                    value: r._count.id || 0
                }
            })
            .filter(item => item.id !== null)

        // Format Top Referrers
        const topReferrers = topReferrersRaw
            .map(r => {
                const user = userMap.get(r.referredById || '')
                return {
                    id: r.referredById,
                    name: user?.name || 'Teman Matchaboy',
                    image: user?.image || null,
                    value: r._count.id || 0
                }
            })
            .filter(item => item.id !== null)

        // 4. Eco Champions (tumblerCount sum in User model)
        const ecoChampionsRaw = await prisma.user.findMany({
            where: {
                tumblerCount: { gt: 0 }
            },
            select: {
                id: true,
                name: true,
                image: true,
                tumblerCount: true
            },
            orderBy: {
                tumblerCount: 'desc'
            },
            take: 10
        })

        const ecoChampions = ecoChampionsRaw.map(u => ({
            id: u.id,
            name: u.name || 'Teman Matchaboy',
            image: u.image || null,
            value: u.tumblerCount
        }))

        return NextResponse.json({
            topSpenders,
            mostLoyal,
            topReferrers,
            ecoChampions
        })
    } catch (error) {
        logError(error, { route: 'leaderboard-get' })
        const safeError = getSafeErrorResponse(error)
        return NextResponse.json(
            { error: safeError.message, code: safeError.code },
            { status: safeError.statusCode }
        )
    }
}
