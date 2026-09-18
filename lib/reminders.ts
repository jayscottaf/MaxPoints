import { Resend } from 'resend'
import { prisma } from './prisma'
import { getOwner } from './auth'
import { ownerEmail } from './auth-policy'
import { calendarDate } from './accounting'
import { canRetryDelivery, planReminders } from './reminder-policy'
import { renderReminderEmail } from './reminder-email'

export async function reminderPreview(now = new Date()) {
  const owner = await getOwner()
  const cards = await prisma.card.findMany({ where: { userCards: { some: { userId: owner.id, isActive: true } } }, include: { perks: { include: { usage: { where: { userId: owner.id, deletedAt: null } } } } } })
  return { owner, items: planReminders(cards, owner.timezone, owner.notificationPrefs, now) }
}

type DeliveryPayload = { from: string; to: string; subject: string; text: string; html?: string }
export async function deliverOnce(key: string, userId: string, payload: DeliveryPayload, send: (payload: DeliveryPayload, key: string) => Promise<void>) {
  // Persist the exact payload before contacting the provider so retries are identical.
  const delivery = await prisma.emailDelivery.upsert({ where: { key }, create: { key, userId, payload }, update: {} })
  if (delivery.sentAt) return { sent: false, status: 'already-sent' }
  if (!canRetryDelivery(delivery.createdAt)) {
    await prisma.emailDelivery.update({ where: { key }, data: { lastError: 'Provider status needs review; automatic retry window expired.' } })
    return { sent: false, status: 'needs-review' }
  }
  try {
    const frozen = delivery.payload as DeliveryPayload
    await send(frozen, key)
    await prisma.$transaction(async tx => {
      const claimed = await tx.emailDelivery.updateMany({ where: { key, sentAt: null }, data: { sentAt: new Date(), lastError: null } })
      if (claimed.count) await tx.notification.create({ data: { userId, type: 'reminder', title: frozen.subject, message: frozen.text, metadata: { deliveryKey: key }, sentAt: new Date() } })
    })
    return { sent: true, status: 'accepted-by-provider' }
  } catch {
    await prisma.emailDelivery.updateMany({ where: { key, sentAt: null }, data: { lastError: 'Email provider request failed; retry pending.' } })
    throw new Error('Email delivery failed.')
  }
}

export async function runReminders(dryRun = false) {
  const now = new Date()
  const { owner, items } = await reminderPreview(now)
  if (!dryRun) await prisma.emailDelivery.updateMany({ where: { userId: owner.id, sentAt: null, createdAt: { lt: new Date(now.getTime() - 23 * 3600000) } }, data: { lastError: 'Provider status needs review; automatic retry window expired.' } })
  if (dryRun || !items.length) return { sent: false, dryRun, items }
  if (!process.env.RESEND_API_KEY || !process.env.PERK_ALERT_FROM || !ownerEmail()) throw new Error('Email configuration incomplete.')
  const key = `reminders:${owner.id}:${calendarDate(now, owner.timezone)}`
  const { html, text, subject } = renderReminderEmail(items, process.env.NEXT_PUBLIC_APP_URL || 'https://mxpoints.vercel.app')
  return deliverOnce(key, owner.id, { from: process.env.PERK_ALERT_FROM, to: ownerEmail(), subject, text, html }, async (payload, idempotencyKey) => {
    const result = await new Resend(process.env.RESEND_API_KEY).emails.send(payload, { idempotencyKey })
    if (result.error || !result.data?.id) throw new Error('Email not accepted.')
  })
}
