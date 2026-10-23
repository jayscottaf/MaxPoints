import type { Perk } from '@prisma/client'

export function repeatBenefit(perk: Pick<Perk, 'cardId' | 'name' | 'periodType' | 'retired' | 'requiresConfirmation' | 'valueKind'>) {
  return perk.cardId === 'amex-platinum' && perk.periodType === 'monthly' && !perk.retired && !perk.requiresConfirmation &&
    ((perk.name === 'Digital Entertainment Credit' && perk.valueKind === 'credit') ||
      (perk.name === 'Walmart+ Membership' && perk.valueKind === 'membership'))
}

export function normalizedCredit(description: string) {
  return description.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function safeRepeatDate(date: string, baseline: string, enabled: Date, today: string) {
  const day = Number(date.slice(8, 10)), baseDay = Number(baseline.slice(8, 10))
  // Boundary postings can reimburse the previous month; leave those for review.
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && day >= 4 && day <= 25 &&
    Math.abs(day - baseDay) <= 5 && date <= today && date.slice(0, 7) === today.slice(0, 7) &&
    date > enabled.toISOString().slice(0, 10) && date.slice(0, 7) > baseline.slice(0, 7)
}
