import { NextResponse } from 'next/server'
import { withOwner, getOwner } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notificationPreferences, preferencesInput } from '@/lib/reminder-policy'
import { reminderPreview } from '@/lib/reminders'
import { ownerEmail } from '@/lib/auth-policy'

export const GET = withOwner(async () => {
  const { owner, items } = await reminderPreview()
  const delivery = await prisma.emailDelivery.findFirst({ where: { userId: owner.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true, sentAt: true, lastError: true } })
  return NextResponse.json({ timezone: owner.timezone, ...notificationPreferences(owner.notificationPrefs), emailConfigured: Boolean(ownerEmail() && process.env.RESEND_API_KEY && process.env.PERK_ALERT_FROM && process.env.CRON_SECRET), automationConfigured: Boolean(process.env.OPENCLAW_INGEST_SECRET), delivery, reminders: items })
})
export const PATCH = withOwner(async request => {
  const input = preferencesInput.safeParse(await request.json())
  if (!input.success) return NextResponse.json({ error: 'Check timezone and reminder days (0-90).' }, { status: 400 })
  const owner = await getOwner()
  const { timezone, ...notificationPrefs } = input.data
  await prisma.user.update({ where: { id: owner.id }, data: { timezone, notificationPrefs } })
  return NextResponse.json({ ok: true })
})
