import { prisma } from './prisma'

// ─── Core send function ─────────────────────────────────────────────
export async function sendNotification({
  userId,
  type,
  title,
  message,
  linkUrl,
  senderId,
  data,
}: {
  userId: string
  type: string
  title: string
  message: string
  linkUrl?: string
  senderId?: string
  data?: Record<string, any>
}) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      linkUrl: linkUrl ?? null,
      senderId: senderId ?? null,
      data: data ? JSON.stringify(data) : null,
    },
  })
}

// ─── Bulk send (to multiple users) ──────────────────────────────────
export async function sendBulkNotification({
  userIds,
  type,
  title,
  message,
  linkUrl,
  senderId,
}: {
  userIds: string[]
  type: string
  title: string
  message: string
  linkUrl?: string
  senderId?: string
}) {
  return prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type,
      title,
      message,
      linkUrl: linkUrl ?? null,
      senderId: senderId ?? null,
    })),
  })
}

// ─── Templated notification ─────────────────────────────────────────
// Resolves {{name}}, {{points}}, {{orderNo}}, {{pickupTime}} etc.
export async function sendTemplatedNotification({
  userId,
  trigger,
  variables,
  linkUrl,
}: {
  userId: string
  trigger: string // e.g. ORDER_COMPLETED, POINTS_EARNED
  variables: Record<string, string | number>
  linkUrl?: string
}) {
  const template = await prisma.notificationTemplate.findUnique({
    where: { trigger },
  })

  if (!template || !template.isActive) return null

  let title = template.title
  let message = template.message

  // Replace placeholders
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`
    title = title.replaceAll(placeholder, String(value))
    message = message.replaceAll(placeholder, String(value))
  }

  return sendNotification({
    userId,
    type: trigger.toLowerCase().includes('order') ? 'order' : 
          trigger.toLowerCase().includes('point') ? 'points' : 'system',
    title,
    message,
    linkUrl,
  })
}

// ─── Calculate points for an order ──────────────────────────────────
export async function calculateOrderPoints(orderTotal: number, hasTumbler: boolean) {
  const settings = await prisma.loyaltySettings.findFirst()
  if (!settings) return { basePoints: 1, tumblerBonus: 0, total: 1 }

  let basePoints = 0
  if (settings.pointMode === 'PER_TRANSACTION') {
    basePoints = settings.pointPerTransaction
  } else {
    // PER_AMOUNT — e.g. 1 point per Rp 10,000
    basePoints = Math.floor(orderTotal / settings.pointPerAmount)
  }

  const tumblerBonus = (hasTumbler && settings.tumblerBonusEnabled) 
    ? settings.tumblerBonusPoints 
    : 0

  return {
    basePoints,
    tumblerBonus,
    total: basePoints + tumblerBonus,
  }
}

// ─── Award points to user (with milestone check) ────────────────────
export async function awardPointsForOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true },
  })

  if (!order || !order.userId || order.pointsAwarded) return null

  const { basePoints, tumblerBonus, total } = await calculateOrderPoints(
    order.total,
    order.hasTumbler
  )

  if (total <= 0) return null

  // Transaction: update user points + create history + mark order
  const result = await prisma.$transaction(async (tx) => {
    // 1. Update user points
    const updatedUser = await tx.user.update({
      where: { id: order.userId! },
      data: { points: { increment: total } },
    })

    // 2. Create point history
    await tx.pointHistory.create({
      data: {
        userId: order.userId!,
        amount: total,
        type: 'EARN_ORDER',
        description: `Order ${order.id.slice(0, 8).toUpperCase()} (+${basePoints} poin${tumblerBonus > 0 ? ` +${tumblerBonus} tumbler bonus` : ''})`,
        orderId: order.id,
      },
    })

    // 3. Mark order as awarded
    await tx.order.update({
      where: { id: orderId },
      data: { pointsAwarded: true, pointsEarned: total },
    })

    // 4. Check milestones
    const settings = await tx.loyaltySettings.findFirst()
    if (settings) {
      const newPoints = updatedUser.points
      await checkAndAwardMilestones(tx, order.userId!, newPoints, settings)
    }

    return { userId: order.userId!, pointsEarned: total, newTotal: updatedUser.points }
  })

  // 5. Send notification
  await sendTemplatedNotification({
    userId: result.userId,
    trigger: 'POINTS_EARNED',
    variables: {
      name: order.customerName,
      points: result.pointsEarned.toString(),
      orderNo: order.id.slice(0, 8).toUpperCase(),
    },
    linkUrl: '/profile',
  })

  return result
}

// ─── Milestone checker ──────────────────────────────────────────────
async function checkAndAwardMilestones(
  tx: any,
  userId: string,
  currentPoints: number,
  settings: any
) {
  const milestones = [
    { enabled: settings.milestone1Enabled, target: settings.milestone1Points, reward: settings.milestone1Reward, desc: settings.milestone1Desc },
    { enabled: settings.milestone2Enabled, target: settings.milestone2Points, reward: settings.milestone2Reward, desc: settings.milestone2Desc },
    { enabled: settings.milestone3Enabled, target: settings.milestone3Points, reward: settings.milestone3Reward, desc: settings.milestone3Desc },
  ]

  for (const m of milestones) {
    if (!m.enabled || m.target <= 0) continue
    // Check if user just crossed this milestone (previous was below, now at or above)
    if (currentPoints >= m.target && (currentPoints - 1) < m.target) {
      // Award voucher
      await tx.voucher.create({
        data: {
          userId,
          type: m.reward,
          description: m.desc,
        },
      })

      // Send notification
      // (done outside transaction to avoid complexity)
    }
  }

  // Milestone 3 reset
  if (settings.milestone3ResetPoints && currentPoints >= settings.milestone3Points) {
    await tx.user.update({
      where: { id: userId },
      data: { points: { decrement: settings.milestone3Points } },
    })
  }
}
