import { z } from 'zod'
import { calendarDate, calendarYear, summarizePerk, type PerkTerms, type UsageValue } from './accounting'
import { getReminderDaysForPeriodType } from './utils'
import { getPerkTip } from './perk-tips'

export const preferencesInput = z.object({
  timezone: z.string().max(100).refine(value => { try { new Intl.DateTimeFormat('en', { timeZone: value }); return true } catch { return false } }),
  expiring: z.boolean(), available: z.boolean(),
  reminderDays: z.array(z.number().int().min(0).max(90)).max(12).nullable(),
}).strict()

export function notificationPreferences(value: unknown) {
  const parsed = z.object({ expiring: z.boolean().default(true), available: z.boolean().default(true), reminderDays: z.array(z.number().int().min(0).max(90)).max(12).nullable().default(null) }).safeParse(value)
  return parsed.success ? parsed.data : { expiring: true, available: true, reminderDays: null }
}

type ReminderPerk = PerkTerms & { id: string; name: string; usage: UsageValue[]; description?: string | null; sourceUrl?: string | null }
export function planReminders(cards: { id?: string; name: string; perks: ReminderPerk[] }[], timezone: string, preferences: unknown, now = new Date()) {
  const prefs = notificationPreferences(preferences)
  const today = calendarDate(now, timezone)
  const year = calendarYear(now, timezone)
  return cards.flatMap(card => card.perks.flatMap(perk => {
    const summary = summarizePerk(perk, year, timezone, now)
    if (!summary.available || summary.availableValue <= 0 || summary.needsReview) return []
    const daysRemaining = summary.periodEnd ? Math.round((Date.parse(summary.periodEnd.slice(0, 10)) - Date.parse(today)) / 86400000) : null
    const cadence = prefs.reminderDays ?? getReminderDaysForPeriodType(perk.periodType === 'one-time' ? 'annual' : perk.periodType)
    const kind: 'expiring' | 'available' | null = prefs.expiring && daysRemaining !== null && cadence.includes(daysRemaining) ? 'expiring' : prefs.available && summary.periodStart.slice(0, 10) === today ? 'available' : null
    // Prefer maintained account terms over older generic advice.
    return kind ? [{ perkId: perk.id, cardName: card.name, perkName: perk.name, remainingValue: summary.availableValue, maxValue: summary.maxValue, currentUsage: summary.currentUsage, periodEnd: summary.periodEnd, daysRemaining, kind, tip: perk.description?.trim() || getPerkTip(card.id ?? '', perk.name), sourceUrl: perk.sourceUrl ?? null }] : []
  }))
}

export function canRetryDelivery(createdAt: Date, now = new Date()) { return now.getTime() - createdAt.getTime() < 23 * 60 * 60 * 1000 }
