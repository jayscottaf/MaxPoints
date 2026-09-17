import { formatInTimeZone } from 'date-fns-tz'

export const DEFAULT_TIMEZONE = 'America/New_York'
export function cents(value: number) { return Math.round(value * 100) }
export function sumMoney(values: number[]) { return values.reduce((sum, value) => sum + cents(value), 0) / 100 }
export function calendarDate(now = new Date(), timezone = DEFAULT_TIMEZONE) { return formatInTimeZone(now, timezone, 'yyyy-MM-dd') }
export function calendarYear(now = new Date(), timezone = DEFAULT_TIMEZONE) { return Number(calendarDate(now, timezone).slice(0, 4)) }

export interface PerkTerms {
  periodType: string
  startDate?: Date | string | null
  endDate?: Date | string | null
  maxValue: number
  periodValue?: number | null
  decemberBonus?: number
  valueKind?: string
  validUntil?: Date | string | null
  retired?: boolean
  requiresConfirmation?: boolean
  perUseLimit?: number | null
}
export interface UsageValue { amount: number; date: Date | string; deletedAt?: Date | string | null; needsReview?: boolean }

export function periodRange(perk: Pick<PerkTerms, 'periodType' | 'startDate' | 'endDate'>, year = calendarYear(), now = new Date(), timezone = DEFAULT_TIMEZONE) {
  const month = Number(calendarDate(now, timezone).slice(5, 7)) - 1
  const boundary = (m: number, day: number, end = false) => new Date(Date.UTC(year, m, day, end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, end ? 999 : 0))
  if (perk.startDate && perk.endDate) {
    const start = new Date(perk.startDate), end = new Date(perk.endDate)
    const recurring = ['monthly', 'quarterly', 'semi-annual', 'annual'].includes(perk.periodType) && start.getUTCFullYear() === end.getUTCFullYear()
    return {
      start: recurring ? boundary(start.getUTCMonth(), start.getUTCDate()) : new Date(start.toISOString().slice(0, 10) + 'T00:00:00.000Z'),
      end: recurring ? boundary(end.getUTCMonth(), end.getUTCDate(), true) : new Date(end.toISOString().slice(0, 10) + 'T23:59:59.999Z'),
    }
  }
  if (perk.periodType === 'one-time') return { start: perk.startDate ? new Date(perk.startDate) : new Date(0), end: perk.endDate ? new Date(new Date(perk.endDate).toISOString().slice(0, 10) + 'T23:59:59.999Z') : new Date('9999-12-31T23:59:59.999Z') }
  const length = perk.periodType === 'monthly' ? 1 : perk.periodType === 'quarterly' ? 3 : perk.periodType === 'semi-annual' ? 6 : 12
  const first = Math.floor(month / length) * length
  return { start: boundary(first, 1), end: boundary(first + length, 0, true) }
}

export function periodLimit(perk: PerkTerms, date = new Date()) {
  return (perk.periodValue ?? perk.maxValue) + (perk.periodType === 'monthly' && date.getUTCMonth() === 11 ? (perk.decemberBonus ?? 0) : 0)
}

export function confirmationNeeded(perk: PerkTerms) {
  return !!perk.requiresConfirmation || (['anniversary', 'certificate'].includes(perk.periodType) && (!perk.startDate || !perk.endDate))
}

export function eligibilityRange(perk: PerkTerms, usage: UsageValue[], year = calendarYear(), now = new Date(), timezone = DEFAULT_TIMEZONE) {
  const range = perk.periodType === 'per-booking' ? { start: new Date(0), end: new Date('9999-12-31T23:59:59.999Z') } : periodRange(perk, year, now, timezone)
  if (perk.periodType === 'four-year') {
    const today = calendarDate(now, timezone)
    const last = usage.filter(u => !u.deletedAt && new Date(u.date).toISOString().slice(0, 10) <= today).sort((a, b) => +new Date(b.date) - +new Date(a.date))[0]
    if (last) {
      const start = new Date(new Date(last.date).toISOString().slice(0, 10) + 'T00:00:00Z')
      const next = new Date(start); next.setUTCFullYear(next.getUTCFullYear() + 4)
      if (next.toISOString().slice(0, 10) > today) return { start, end: new Date(+next - 1) }
    }
    return { start: new Date(today + 'T00:00:00Z'), end: new Date('9999-12-31T23:59:59.999Z') }
  }
  if (perk.validUntil) range.end = new Date(Math.min(+range.end, Date.parse(new Date(perk.validUntil).toISOString().slice(0, 10) + 'T23:59:59.999Z')))
  // A lone start date is an offer's absolute launch, not a recurring window.
  if (perk.startDate && !perk.endDate) range.start = new Date(Math.max(+range.start, +new Date(perk.startDate)))
  return range
}

export function summarizePerk<T extends PerkTerms & { usage: UsageValue[] }>(perk: T, year = calendarYear(), timezone = DEFAULT_TIMEZONE, now = new Date()) {
  const range = eligibilityRange(perk, perk.usage, year, now, timezone)
  const active = perk.usage.filter(u => !u.deletedAt)
  const currentUsage = perk.periodType === 'per-booking' ? 0 : sumMoney(active.filter(u => !u.needsReview && new Date(u.date) >= range.start && new Date(u.date) <= range.end).map(u => u.amount))
  const annualUsage = sumMoney(active.filter(u => new Date(u.date).getUTCFullYear() === year).map(u => u.amount))
  const maxValue = periodLimit(perk, range.start)
  const today = new Date(calendarDate(now, timezone) + 'T12:00:00Z')
  const needsConfirmation = confirmationNeeded(perk)
  const fourYearUsed = perk.periodType === 'four-year' && active.some(u => new Date(u.date) >= range.start && new Date(u.date) <= range.end)
  const available = !perk.retired && !needsConfirmation && !fourYearUsed && today >= range.start && today <= range.end
  const annualCapped = ['annual', 'monthly', 'quarterly', 'semi-annual'].includes(perk.periodType)
  const remaining = Math.max(0, Math.min(cents(maxValue) - cents(currentUsage), annualCapped ? cents(perk.maxValue) - cents(annualUsage) : Infinity)) / 100
  const { usage: _usage, ...terms } = perk
  void _usage
  const oneTimeOutsideYear = perk.periodType === 'one-time' && (range.end.getUTCFullYear() < year || range.start.getUTCFullYear() > year || (currentUsage >= perk.maxValue && annualUsage === 0))
  const dateToday = calendarDate(now, timezone)
  const dayDifference = (date: Date) => Math.round((Date.parse(date.toISOString().slice(0, 10)) - Date.parse(dateToday)) / 86400000)
  const noExpiry = range.end.getUTCFullYear() === 9999
  const excluded = ['coverage', 'estimate', 'information'].includes(perk.valueKind ?? '')
  const noAnnualValue = perk.retired || needsConfirmation || excluded || ['per-booking', 'certificate', 'four-year'].includes(perk.periodType) || (perk.validUntil && new Date(perk.validUntil).getUTCFullYear() < year)
  const ending = perk.validUntil ? new Date(perk.validUntil) : null
  const beginning = perk.startDate && !perk.endDate ? new Date(perk.startDate) : null
  const firstMonth = beginning && beginning.getUTCFullYear() >= year ? (beginning.getUTCFullYear() > year ? 12 : beginning.getUTCMonth()) : 0
  const lastMonth = ending && ending.getUTCFullYear() <= year ? (ending.getUTCFullYear() < year ? -1 : ending.getUTCMonth()) : 11
  const annualLimit = perk.periodType === 'monthly' && perk.periodValue != null ? Math.min(perk.maxValue, sumMoney([perk.periodValue * Math.max(0, lastMonth - firstMonth + 1), lastMonth === 11 && firstMonth <= 11 ? perk.decemberBonus ?? 0 : 0])) : perk.maxValue
  return { ...terms, needsConfirmation, today: dateToday, daysRemaining: noExpiry ? null : dayDifference(range.end), daysUntilStart: dayDifference(range.start), faceValue: perk.maxValue, maxValue, annualValue: noAnnualValue || oneTimeOutsideYear ? 0 : annualLimit, currentUsage, annualUsage, periodStart: range.start.toISOString(), periodEnd: noExpiry ? null : range.end.toISOString(), available, availableValue: available && !excluded && perk.periodType !== 'per-booking' ? remaining : 0, claimableValue: available && !excluded ? Math.min(remaining, perk.perUseLimit ?? Infinity) : 0, needsReview: needsConfirmation || active.some(u => u.needsReview), valueKind: perk.valueKind ?? 'credit' }
}

export function validAmount(amount: unknown): amount is number {
  return typeof amount === 'number' && Number.isFinite(amount) && amount > 0 && amount <= 1000000 && Math.abs(amount * 100 - cents(amount)) < 0.000001
}

export function usageDate(value: unknown, timezone = DEFAULT_TIMEZONE) {
  const text = value === undefined ? calendarDate(new Date(), timezone) : value
  if (typeof text !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error('Enter a valid usage date.')
  const date = new Date(text + 'T12:00:00Z')
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== text || text > calendarDate(new Date(), timezone)) throw new Error('Usage date must be a real date, no later than today.')
  return date
}
