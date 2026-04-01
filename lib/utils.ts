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

export function getPerkStatus(perk: any, usage: number): string {
  const percentUsed = getPercentageUsed(usage, perk.maxValue)

  if (percentUsed === 100) return 'completed'
  if (perk.endDate && daysUntil(perk.endDate) < 7) return 'expiring'
  if (percentUsed > 0) return 'in-progress'
  return 'available'
}