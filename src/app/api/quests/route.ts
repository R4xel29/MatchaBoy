import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getSafeErrorResponse, logError } from '@/lib/errors'

export async function GET(req: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const quests = await prisma.quest.findMany({
            where: { isActive: true },
            include: {
                userQuests: {
                    where: { userId: session.user.id }
                }
            }
        })

        const formattedQuests = quests.map(quest => {
            const userQuest = quest.userQuests[0] || null
            return {
                id: quest.id,
                title: quest.title,
                description: quest.description,
                type: quest.type, // DAILY, WEEKLY, SPECIAL
                targetType: quest.targetType,
                targetValue: quest.targetValue,
                rewardPoints: quest.rewardPoints,
                rewardVoucher: quest.rewardVoucher,
                progress: userQuest ? userQuest.progress : 0,
                isCompleted: userQuest ? userQuest.isCompleted : false,
                isClaimed: userQuest ? userQuest.isClaimed : false,
                completedAt: userQuest ? userQuest.completedAt : null,
            }
        })

        return NextResponse.json({ quests: formattedQuests })
    } catch (error) {
        logError(error, { route: 'quests-get' })
        const safeError = getSafeErrorResponse(error)
        return NextResponse.json(
            { error: safeError.message, code: safeError.code },
            { status: safeError.statusCode }
        )
    }
}
