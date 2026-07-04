import { NextRequest, NextResponse } from 'next/server'
import { differenceInCalendarDays, startOfDay } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { formatCurrency, getPeriodDates, getReminderDaysForPeriodType } from '@/lib/utils'
import { PerkExpirationEmailItem, sendPerkExpirationEmail } from '@/lib/email'

export const runtime = 'nodejs'

const DEFAULT_TO_EMAIL = 'jayscotta@gmail.com'
const DEFAULT_FROM_EMAIL = 'MaxPoints <onboarding@resend.dev>'

type Candidate = PerkExpirationEmailItem & {
  userId: string
  cardId: string
  perkId: string
  reminderKey: string
}

/**
 * Optional `?days=` override (only honored for dryRun/testSend). When set, it
 * forces this cadence across all perks for testing. Returns null otherwise so
 * each perk falls back to its period-type-specific cadence.
 */
function parseReminderDaysOverride(request: NextRequest, allowOverride: boolean): number[] | null {
  const override = request.nextUrl.searchParams.get('days')

  if (!allowOverride || !override) {
    return null
  }

  const parsed = override
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value >= 0)

  return parsed.length > 0 ? parsed : null
}

function getReminderKey(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object') {
    return null
  }

  const value = (metadata as { reminderKey?: unknown }).reminderKey
  return typeof value === 'string' ? value : null
}

function isExpiringEnabled(notificationPrefs: unknown) {
  if (!notificationPrefs || typeof notificationPrefs !== 'object') {
    return true
  }

  return (notificationPrefs as { expiring?: unknown }).expiring !== false
}

function getAppUrl(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
}

function getPeriodRange(perk: { startDate: Date | null; endDate: Date | null; periodType: string }) {
  if (perk.startDate && perk.endDate) {
    return { start: new Date(perk.startDate), end: new Date(perk.endDate) }
  }

  return getPeriodDates(perk.periodType)
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dryRun = request.nextUrl.searchParams.get('dryRun') === '1'
  const testSend = request.nextUrl.searchParams.get('testSend') === '1'
  const reminderDaysOverride = parseReminderDaysOverride(request, dryRun || testSend)
  const today = startOfDay(new Date())
  const userCards = await prisma.userCard.findMany({
    where: { isActive: true },
    include: {
      user: true,
      card: {
        include: {
          perks: {
            include: {
              usage: true,
            },
          },
        },
      },
    },
  })

  const userIds = [...new Set(userCards.map((userCard) => userCard.userId))]
  const existingNotifications =
    userIds.length > 0
      ? await prisma.notification.findMany({
          where: {
            userId: { in: userIds },
            type: 'expiring',
          },
          select: {
            metadata: true,
          },
        })
      : []

  const sentReminderKeys = new Set(
    existingNotifications
      .map((notification) => getReminderKey(notification.metadata))
      .filter((key): key is string => Boolean(key))
  )

  const candidates: Candidate[] = []
  let scannedPerks = 0

  for (const userCard of userCards) {
    if (!isExpiringEnabled(userCard.user.notificationPrefs)) {
      continue
    }

    for (const perk of userCard.card.perks) {
      scannedPerks += 1

      if (perk.maxValue <= 0) {
        continue
      }

      const periodRange = getPeriodRange(perk)
      const periodEnd = new Date(periodRange.end)
      const daysRemaining = differenceInCalendarDays(startOfDay(periodEnd), today)

      // A test override applies one cadence to every perk; otherwise each
      // perk uses the cadence tuned to its renewal cycle.
      const reminderDays = reminderDaysOverride ?? getReminderDaysForPeriodType(perk.periodType)

      if (!reminderDays.includes(daysRemaining)) {
        continue
      }

      const currentUsage = perk.usage
        .filter((usage) => {
          const usageDate = new Date(usage.date)
          return usageDate >= periodRange.start && usageDate <= periodRange.end
        })
        .reduce((sum, usage) => sum + usage.amount, 0)

      const remainingValue = perk.maxValue - currentUsage
      if (remainingValue <= 0) {
        continue
      }

      const reminderKey = [
        'perk-expiring',
        userCard.userId,
        perk.id,
        periodEnd.toISOString(),
        daysRemaining,
      ].join(':')

      if (sentReminderKeys.has(reminderKey)) {
        continue
      }

      candidates.push({
        userId: userCard.userId,
        cardId: userCard.cardId,
        perkId: perk.id,
        cardName: userCard.card.name,
        perkName: perk.name,
        currentUsage,
        maxValue: perk.maxValue,
        remainingValue,
        daysRemaining,
        periodEnd,
        reminderKey,
      })
    }
  }

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      scannedPerks,
      reminderDaysOverride,
      candidateCount: candidates.length,
      candidates: candidates.map((candidate) => ({
        cardName: candidate.cardName,
        perkName: candidate.perkName,
        remainingValue: candidate.remainingValue,
        daysRemaining: candidate.daysRemaining,
        periodEnd: candidate.periodEnd,
      })),
    })
  }

  if (candidates.length === 0) {
    return NextResponse.json({
      ok: true,
      scannedPerks,
      sent: false,
      message: 'No expiring perks matched the reminder schedule.',
    })
  }

  const to = process.env.PERK_ALERT_EMAIL || DEFAULT_TO_EMAIL
  const from = process.env.PERK_ALERT_FROM || DEFAULT_FROM_EMAIL
  const appUrl = getAppUrl(request)
  const emailResult = await sendPerkExpirationEmail({
    to,
    from,
    appUrl,
    items: candidates,
  })

  if (testSend) {
    return NextResponse.json({
      ok: true,
      testSend: true,
      scannedPerks,
      sent: true,
      emailId: emailResult?.id,
      recipient: to,
      candidateCount: candidates.length,
    })
  }

  await prisma.notification.createMany({
    data: candidates.map((candidate) => ({
      userId: candidate.userId,
      type: 'expiring',
      title: `${candidate.perkName} expires in ${candidate.daysRemaining} days`,
      message: `${formatCurrency(candidate.remainingValue)} remains on ${candidate.cardName}.`,
      metadata: {
        reminderKey: candidate.reminderKey,
        perkId: candidate.perkId,
        cardId: candidate.cardId,
        daysRemaining: candidate.daysRemaining,
        periodEnd: candidate.periodEnd.toISOString(),
        remainingValue: candidate.remainingValue,
      },
      sentAt: new Date(),
    })),
  })

  return NextResponse.json({
    ok: true,
    scannedPerks,
    sent: true,
    emailId: emailResult?.id,
    recipient: to,
    notificationCount: candidates.length,
  })
}
