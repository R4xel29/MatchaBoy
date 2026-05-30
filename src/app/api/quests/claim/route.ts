import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getSafeErrorResponse, logError, ValidationError } from '@/lib/errors'
import { awardPoints, createVoucherForUser } from '@/lib/loyalty-utils'

export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { questId } = body

        if (!questId) {
            throw new ValidationError('Quest ID wajib dikirimkan')
        }

        const result = await prisma.$transaction(async (tx) => {
            // Find UserQuest
            const userQuest = await tx.userQuest.findUnique({
                where: {
                    userId_questId: {
                        userId: session.user.id,
                        questId: questId,
                    }
                },
                include: {
                    quest: true
                }
            })

            if (!userQuest) {
                throw new ValidationError('Misi tidak ditemukan atau Anda belum memulai misi ini')
            }

            if (!userQuest.isCompleted) {
                throw new ValidationError('Misi belum selesai. Silakan selesaikan target misi terlebih dahulu')
            }

            if (userQuest.isClaimed) {
                throw new ValidationError('Hadiah untuk misi ini sudah diklaim sebelumnya')
            }

            // Mark as claimed
            const updatedUserQuest = await tx.userQuest.update({
                where: {
                    id: userQuest.id
                },
                data: {
                    isClaimed: true,
                    updatedAt: new Date()
                }
            })

            const quest = userQuest.quest
            let pointsAwarded = 0
            let voucherCode = null
            let voucherDesc = null

            // Award points
            if (quest.rewardPoints > 0) {
                pointsAwarded = quest.rewardPoints
                await awardPoints({
                    userId: session.user.id,
                    pointsToAdd: quest.rewardPoints,
                    type: 'ADMIN_ADJUST', // fallback for history, represents quest reward
                    description: `Hadiah misi selesai: ${quest.title}`,
                }, tx)
            }

            // Award voucher
            if (quest.rewardVoucher) {
                const voucher = await createVoucherForUser(
                    session.user.id,
                    quest.rewardVoucher,
                    `Hadiah Misi: ${quest.title}`,
                    30,
                    {},
                    tx
                )
                voucherCode = voucher.code
                voucherDesc = voucher.description
            }

            // Create activity log
            await tx.activityLog.create({
                data: {
                    userId: session.user.id,
                    action: 'CLAIM_QUEST',
                    entity: 'QUEST',
                    entityId: questId,
                    details: `Klaim reward misi: ${quest.title}. Mendapatkan ${pointsAwarded} Poin${quest.rewardVoucher ? ` dan voucher ${quest.rewardVoucher}` : ''}.`
                }
            })

            return {
                pointsAwarded,
                voucherCode,
                voucherDesc,
                questTitle: quest.title
            }
        })

        return NextResponse.json({
            success: true,
            message: `Berhasil mengklaim hadiah untuk misi: ${result.questTitle}`,
            rewards: {
                points: result.pointsAwarded,
                voucherCode: result.voucherCode,
                voucherDesc: result.voucherDesc
            }
        })
    } catch (error) {
        logError(error, { route: 'quests-claim' })
        const safeError = getSafeErrorResponse(error)
        return NextResponse.json(
            { error: safeError.message, code: safeError.code },
            { status: safeError.statusCode }
        )
    }
}
