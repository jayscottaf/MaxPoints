export const CATALOG_VERSION = '2026-09-16'
const amex = 'https://global.americanexpress.com/card-benefits/view-all/platinum'
const chase = 'https://www.chase.com/sapphire-cards/personal/reserve'

export const benefitCorrections = [
  { cardId: 'amex-platinum', name: 'Hotel Credit (FHR/THC)', expectedValue: 600, periodType: 'semi-annual', periodValue: 300, sourceUrl: amex },
  { cardId: 'amex-platinum', name: 'Digital Entertainment Credit', expectedValue: 300, periodType: 'monthly', periodValue: 25, sourceUrl: amex },
  { cardId: 'amex-platinum', name: 'Uber Cash', expectedValue: 200, periodType: 'monthly', periodValue: 15, decemberBonus: 20, sourceUrl: amex },
  { cardId: 'amex-platinum', name: 'Walmart+ Membership', expectedValue: 155, maxValue: 155.40, periodType: 'monthly', periodValue: 12.95, sourceUrl: amex },
  { cardId: 'chase-reserve', name: 'DoorDash Credits', expectedValue: 300, periodType: 'monthly', periodValue: 25, sourceUrl: chase },
] as const

export function valueKind(name: string, category?: string | null) {
  if (category === 'insurance' || name === 'Cell Phone Protection') return 'coverage'
  if (name === 'Priority Pass Select') return 'estimate'
  if (/Membership|DashPass|Apple TV|Apple Music/.test(name)) return 'membership'
  return 'credit'
}
