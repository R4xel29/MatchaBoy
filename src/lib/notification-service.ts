import { prisma } from './prisma'
import { sendPushNotification } from './webpush'

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
  // Send Web Push Notification asynchronously (fire and forget)
  sendPushNotification(userId, {
    title,
    body: message,
    url: linkUrl || '/',
  }).catch((err) => {
    console.error('Failed to send web push notification:', err)
  })

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
  // Fire and forget push notifications for all users
  Promise.allSettled(
    userIds.map((userId) =>
      sendPushNotification(userId, {
        title,
        body: message,
        url: linkUrl || '/',
      })
    )
  ).catch((err) => console.error('Bulk web push error:', err))

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

// ─── Award points to user (consolidated) ────────────────────────────
// Redirects to processOrderCompletion in loyalty-utils.ts to prevent double point awarding.
export async function awardPointsForOrder(orderId: string) {
  const { processOrderCompletion } = await import('./loyalty-utils')
  const result = await processOrderCompletion(orderId)
  if (!result) return null
  return {
    userId: result.userId,
    pointsEarned: result.pointsToAdd,
    newTotal: result.newPoints
  }
}

