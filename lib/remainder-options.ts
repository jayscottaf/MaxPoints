import { cents } from './accounting'

export const REMAINDER_VERIFIED_ON = '2026-10-18'
export const REMAINDER_REVIEW_BY = '2027-01-16'
const PLATINUM_TERMS = 'https://global.americanexpress.com/card-benefits/terms/platinum'
const DIGITAL_TERMS = 'https://global.americanexpress.com/card-benefits/detail/digital-entertainment/platinum/'
const DINING_TERMS = 'https://www.chase.com/personal/credit-cards/education/basics/how-to-use-dining-credit-chase-sapphire-reserve-exclusive-tables'
const WALMART_TERMS = 'https://www.walmart.com/help/article/walmart-benefits-streaming-services/35624ec8e133496ab647a398a90cf779'

export type RemainderInput = {
  cardId: string; name: string; currentUsage: number; remainingValue: number
  periodEnd: string | null; today: string; available: boolean
  needsReview?: boolean; needsConfirmation?: boolean; requiresConfirmation?: boolean
  retired?: boolean; valueKind?: string; periodType?: string
}
export type RemainderPlan = {
  remainingValue: number; periodEnd: string; rule: string; sourceUrl: string
  verifiedOn: string; options: { title: string; description: string; url: string }[]
  overlap?: { text: string; url: string }
}
export function remainderContext(perks: { name: string; currentUsage: number; annualUsage?: number; retired?: boolean }[]) {
  return { hasWalmartPlus: perks.some(perk => !perk.retired && perk.name === 'Walmart+ Membership' && (perk.currentUsage > 0 || (perk.annualUsage ?? 0) > 0)) }
}

export function getRemainderOptions(input: RemainderInput, context = { hasWalmartPlus: false }): RemainderPlan | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.today) || !Number.isFinite(Date.parse(input.today)) ||
    input.today < REMAINDER_VERIFIED_ON || input.today > REMAINDER_REVIEW_BY ||
    !input.periodEnd || !Number.isFinite(Date.parse(input.periodEnd)) || input.periodEnd.slice(0, 10) < input.today ||
    !input.available || input.retired || input.needsReview || input.needsConfirmation || input.requiresConfirmation ||
    !Number.isFinite(input.currentUsage) || !Number.isFinite(input.remainingValue) ||
    cents(input.currentUsage) <= 0 || cents(input.remainingValue) <= 0 ||
    ['information', 'coverage', 'estimate'].includes(input.valueKind ?? '') ||
    ['four-year', 'per-booking', 'certificate'].includes(input.periodType ?? '')) return null

  const base = { remainingValue: cents(input.remainingValue) / 100, periodEnd: input.periodEnd, verifiedOn: REMAINDER_VERIFIED_ON }
  const name = input.name.replace(/\s+(Q[1-4]|H[12])$/, '')
  if (input.cardId === 'amex-platinum' && name === 'Digital Entertainment Credit') {
    return {
      ...base, sourceUrl: DIGITAL_TERMS,
      rule: 'One shared monthly allowance across eligible providers. Enroll first and pay the provider directly with Platinum, not through an app store or another company. Audible is not eligible. Unused credit does not roll over.',
      options: [
        { title: 'The New York Times', description: 'An eligible monthly subscription billed directly by The Times.', url: 'https://www.nytimes.com/subscription' },
        { title: 'The Wall Street Journal', description: 'An eligible monthly subscription billed directly by WSJ.', url: 'https://www.wsj.com/' },
        { title: 'YouTube Premium', description: 'An eligible subscription purchased directly from YouTube.', url: 'https://www.youtube.com/premium' },
        ...(!context.hasWalmartPlus ? [
          { title: 'Peacock', description: 'An eligible monthly plan billed directly by Peacock.', url: 'https://www.peacocktv.com/' },
          { title: 'Paramount+', description: 'An eligible monthly plan billed directly by Paramount+.', url: 'https://www.paramountplus.com/' },
        ] : []),
      ],
      ...(context.hasWalmartPlus ? { overlap: { text: 'Your recorded Walmart+ membership may already include a choice of Paramount+ Essential or Peacock Premium. Check that benefit before paying for either separately; Walmart-billed upgrades do not meet direct-provider billing rules.', url: WALMART_TERMS } } : {}),
    }
  }
  if (input.cardId === 'chase-reserve' && name === 'Dining Credit') return {
    ...base, sourceUrl: DINING_TERMS,
    rule: 'The remainder can be used at another participating Sapphire Reserve Exclusive Tables restaurant in the same half-year. Link your card through OpenTable and pay the restaurant with Sapphire Reserve. Not every OpenTable restaurant qualifies.',
    options: [{ title: 'Sapphire Reserve Exclusive Tables', description: 'Use Chase\'s current restaurant finder to choose an eligible meal.', url: DINING_TERMS }],
  }
  if (input.cardId === 'amex-platinum' && name === 'Resy Dining Credit') return {
    ...base, sourceUrl: PLATINUM_TERMS,
    rule: 'Enroll first. Pay with Platinum at a qualifying U.S. Resy restaurant; the remainder can cover another eligible meal this quarter. Gift cards and merchandise are excluded.',
    options: [{ title: 'Find a qualifying Resy restaurant', description: 'Check restaurant participation before paying with the enrolled Platinum card.', url: 'https://resy.com/amex' }],
  }
  if (input.cardId === 'amex-platinum' && name === 'Lululemon Credit') return {
    ...base, sourceUrl: PLATINUM_TERMS,
    rule: 'Enroll first and buy eligible merchandise directly from U.S. lululemon stores or lululemon.com. Gift cards, outlets and Like New purchases are excluded. Unused quarterly credit does not roll over.',
    options: [{ title: 'Shop lululemon', description: 'Choose merchandise you need, such as socks or accessories; check the final price and shipping.', url: 'https://shop.lululemon.com/' }],
  }
  if (input.cardId === 'amex-platinum' && name === 'Airline Incidental Fee Credit') return {
    ...base, sourceUrl: PLATINUM_TERMS,
    rule: 'Only qualifying incidental fees charged separately by your selected airline count. Airfare, upgrades and airline gift cards are excluded. Check the selected airline before paying.',
    options: [{ title: 'Eligible baggage or onboard charges', description: 'Use only for fees you actually need, charged by the selected airline. Third-party charges may not qualify.', url: 'https://global.americanexpress.com/card-benefits/enroll/airline-fee-credit/platinum' }],
  }
  if (input.cardId === 'amex-platinum' && name === 'Uber One Membership') return {
    ...base, sourceUrl: PLATINUM_TERMS,
    rule: 'Only eligible Uber One membership charges paid with Platinum use this allowance; it cannot be moved to rides or food orders. Do not start a second membership simply to exhaust the remainder.',
    options: [{ title: 'Check existing Uber One billing', description: 'If another eligible membership charge is due this year, use Platinum as its payment method.', url: 'https://www.uber.com/us/en/uber-one/' }],
  }
  return null
}
