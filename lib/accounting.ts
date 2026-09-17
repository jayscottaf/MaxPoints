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
}
export interface UsageValue { amount: number; date: Date | string; deletedAt?: Date | string | null; needsReview?: boolean }

export function periodRange(perk: Pick<PerkTerms, 'periodType' | 'startDate' | 'endDate'>, year = calendarYear(), now = new Date(), timezone = DEFAULT_TIMEZONE) {
  const month = Number(calendarDate(now, timezone).slice(5, 7)) - 1
  const boundary = (m: number, day: number, end = false) => new Date(Date.UTC(year, m, day, end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, end ? 999 : 0))
  if (perk.startDate && perk.endDate) {
    const start = new Date(perk.startDate), end = new Date(perk.endDate)
    const recurring = perk.periodType !== 'one-time' && start.getUTCFullYear() === end.getUTCFullYear()
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

export function summarizePerk<T extends PerkTerms & { usage: UsageValue[] }>(perk: T, year = calendarYear(), timezone = DEFAULT_TIMEZONE) {
  const range = periodRange(perk, year, new Date(), timezone)
  const active = perk.usage.filter(u => !u.deletedAt)
  const currentUsage = sumMoney(active.filter(u => !u.needsReview && new Date(u.date) >= range.start && new Date(u.date) <= range.end).map(u => u.amount))
  const annualUsage = sumMoney(active.filter(u => new Date(u.date).getUTCFullYear() === year).map(u => u.amount))
  const maxValue = periodLimit(perk, range.start)
  const today = new Date(calendarDate(new Date(), timezone) + 'T12:00:00Z')
  const available = today >= range.start && today <= range.end
  const remaining = Math.max(0, Math.min(cents(maxValue) - cents(currentUsage), cents(perk.maxValue) - cents(annualUsage))) / 100
  const { usage: _usage, ...terms } = perk
  void _usage
  return { ...terms, maxValue, annualValue: perk.maxValue, currentUsage, annualUsage, periodStart: range.start.toISOString(), periodEnd: perk.periodType === 'one-time' && !perk.endDate ? null : range.end.toISOString(), available, availableValue: available && perk.valueKind !== 'coverage' && perk.valueKind !== 'estimate' ? remaining : 0, needsReview: active.some(u => u.needsReview), valueKind: perk.valueKind ?? 'credit' }
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
