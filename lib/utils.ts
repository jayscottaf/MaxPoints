import { format, differenceInDays, startOfDay, endOfDay } from 'date-fns'

export function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), 'MMM d, yyyy')
}

function getDateOnlyParts(date: Date | string) {
  if (typeof date === 'string') {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      return {
        year: Number(match[1]),
        month: Number(match[2]) - 1,
        day: Number(match[3]),
      }
    }
  }

  const parsed = new Date(date)
  return {
    year: parsed.getUTCFullYear(),
    month: parsed.getUTCMonth(),
    day: parsed.getUTCDate(),
  }
}

export function formatDateOnly(date: Date | string): string {
  const { year, month, day } = getDateOnlyParts(date)
  return format(new Date(year, month, day), 'MMM d, yyyy')
}

export function daysUntilDateOnly(date: Date | string): number {
  const { year, month, day } = getDateOnlyParts(date)
  const today = new Date()
  const targetDay = new Date(year, month, day)
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  return differenceInDays(targetDay, todayOnly)
}

export function formatExpirationMonth(date: Date | string): string {
  const { year, month } = getDateOnlyParts(date)
  return `${String(month + 1).padStart(2, '0')}/${String(year).slice(-2)}`
}

export function isPastDateOnly(date: Date | string): boolean {
  const { year, month, day } = getDateOnlyParts(date)
  const today = new Date()
  const targetDay = new Date(year, month, day)
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  return targetDay < todayOnly
}

export function daysUntil(date: Date | string): number {
  return differenceInDays(new Date(date), new Date())
}

export function getPercentageUsed(used: number, max: number): number {
  if (max === 0) return 0
  return Math.round((used / max) * 100)
}

export function getPeriodDates(periodType: string, year = new Date().getFullYear()) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const currentQuarter = Math.floor(currentMonth / 3) + 1

  switch (periodType) {
    case 'quarterly':
      const quarterStart = new Date(currentYear, (currentQuarter - 1) * 3, 1)
      const quarterEnd = endOfDay(new Date(currentYear, currentQuarter * 3, 0))
      return { start: quarterStart, end: quarterEnd }

    case 'semi-annual':
      const isFirstHalf = currentMonth < 6
      const halfStart = new Date(currentYear, isFirstHalf ? 0 : 6, 1)
      const halfEnd = endOfDay(new Date(currentYear, isFirstHalf ? 5 : 11, isFirstHalf ? 30 : 31))
      return { start: halfStart, end: halfEnd }

    case 'annual':
      return {
        start: new Date(year, 0, 1),
        end: endOfDay(new Date(year, 11, 31))
      }

    case 'monthly':
      return {
        start: new Date(currentYear, currentMonth, 1),
        end: endOfDay(new Date(currentYear, currentMonth + 1, 0))
      }

    default:
      return { start: now, end: now }
  }
}

export function shouldNotifyForPerk(perk: any, usage: number, reminderDays: number[]): boolean {
  if (!perk.endDate) return false
  if (usage >= perk.maxValue) return false

  const daysRemaining = daysUntil(perk.endDate)
  return reminderDays.includes(daysRemaining)
}

export interface CardBrand {
  /** Tailwind gradient classes for the accent stripe / icon chip */
  gradient: string
  /** Solid accent used for borders / icon tint */
  accent: string
  /** Soft tinted background for the icon chip */
  chipBg: string
}

const DEFAULT_BRAND: CardBrand = {
  gradient: 'from-blue-500 to-indigo-500',
  accent: 'text-blue-400',
  chipBg: 'bg-blue-500/15',
}

/**
 * Map a card to its issuer/product brand colors so each tile is
 * recognizable at a glance instead of an identical gray box.
 */
export function getCardBrand(card: { name?: string; issuer?: string }): CardBrand {
  const name = (card?.name || '').toLowerCase()
  const issuer = (card?.issuer || '').toLowerCase()

  if (name.includes('platinum')) {
    return { gradient: 'from-zinc-300 to-zinc-500', accent: 'text-zinc-200', chipBg: 'bg-zinc-400/15' }
  }
  if (name.includes('hilton') || name.includes('aspire')) {
    return { gradient: 'from-amber-400 to-yellow-600', accent: 'text-amber-300', chipBg: 'bg-amber-500/15' }
  }
  if (name.includes('sapphire') || name.includes('reserve')) {
    return { gradient: 'from-blue-600 to-cyan-500', accent: 'text-blue-300', chipBg: 'bg-blue-500/15' }
  }
  if (issuer.includes('american express') || issuer.includes('amex')) {
    return { gradient: 'from-sky-500 to-blue-700', accent: 'text-sky-300', chipBg: 'bg-sky-500/15' }
  }
  if (issuer.includes('chase')) {
    return { gradient: 'from-blue-600 to-indigo-700', accent: 'text-blue-300', chipBg: 'bg-blue-500/15' }
  }

  return DEFAULT_BRAND
}

export function getPerkStatus(perk: any, usage: number): string {
  const percentUsed = getPercentageUsed(usage, perk.maxValue)

  if (percentUsed === 100) return 'completed'
  if (perk.endDate && daysUntil(perk.endDate) < 7) return 'expiring'
  if (percentUsed > 0) return 'in-progress'
  return 'available'
}
