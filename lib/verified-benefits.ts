import type { Prisma } from '@prisma/client'

export const VERIFIED_DATE = '2026-09-17'
export const sources = {
  platinum: 'https://global.americanexpress.com/card-benefits/terms/platinum',
  aspire: 'https://global.americanexpress.com/card-benefits/terms/hilton-aspire',
  chase: 'https://creditcards.chase.com/rewards-credit-cards/sapphire/reserve',
}
type Terms = Partial<Prisma.PerkCreateManyInput>
const date = (value: string) => new Date(value)
const end2027 = date('2027-12-31')
const anniversarySource = 'https://www.chase.com/sapphire-cards/reserve-tenth-anniversary'

// Only issuer-wide terms belong here. Activation and certificate dates are personal.
export function verifiedTerms(cardId: string, name: string): Terms | null {
  const base = name.replace(/\s+(Q[1-4]|H[12])$/, '')
  let patch: Terms | undefined
  const sourceUrl = cardId === 'amex-platinum' ? sources.platinum : cardId === 'amex-hilton-aspire' ? sources.aspire : sources.chase
  if (cardId === 'amex-platinum') {
    const entries: Record<string, Terms> = {
      'Resy Dining Credit': { maxValue: 100, enrollmentRequired: true, description: '$100 each calendar quarter at eligible U.S. Resy restaurants; enroll before purchase.' },
      'Lululemon Credit': { maxValue: 75, enrollmentRequired: true, description: '$75 each calendar quarter at eligible U.S. lululemon stores or lululemon.com. Outlets and gift cards excluded.' },
      'Saks Fifth Avenue Credit': { periodType: 'one-time', validUntil: date('2026-06-30'), retired: name.endsWith('H2'), description: 'Benefit ended July 1, 2026. Historical usage is retained; no recurring credit remains.' },
      'Hotel Credit (FHR/THC)': { maxValue: 600, periodType: 'semi-annual', periodValue: 300, description: '$300 each calendar half on prepaid FHR/THC bookings through Amex Travel. THC requires at least two nights.' },
      'Digital Entertainment Credit': { maxValue: 300, periodType: 'monthly', periodValue: 25, enrollmentRequired: true, description: '$25/month after enrollment for eligible direct-billed Disney+, Hulu, ESPN, NYT, WSJ, Paramount+, Peacock and YouTube subscriptions. Not all streaming services qualify.' },
      'Uber Cash': { maxValue: 200, periodType: 'monthly', periodValue: 15, decemberBonus: 20, description: '$15 monthly plus $20 extra in December for U.S. Uber rides/orders. Link the Platinum card and select an Amex card for payment.' },
      'Uber One Membership': { maxValue: 120, enrollmentRequired: false, description: 'Up to $120/calendar year in statement credits for eligible auto-renewing Uber One membership charges paid with Platinum.' },
      'CLEAR Plus Credit': { maxValue: 209, description: 'Up to $209/calendar year for CLEAR+ membership charges; taxes and fees excluded.' },
      'Walmart+ Membership': { maxValue: 155.40, periodType: 'monthly', periodValue: 12.95, enrollmentRequired: false, description: 'Monthly Walmart+ plan only: $12.95 plus applicable taxes; Plus Ups excluded. Tracker uses the pretax base value.' },
      'Airline Incidental Fee Credit': { maxValue: 200, enrollmentRequired: true, description: 'Up to $200/calendar year for eligible incidental fees at one selected airline. Airfare, upgrades, award tickets and gift cards excluded.' },
      'Oura Ring Credit': { maxValue: 200, enrollmentRequired: true, description: 'Up to $200/calendar year after enrollment for eligible rings purchased at the U.S. ouraring.com site. Memberships/accessories excluded.' },
      'Equinox Credit': { maxValue: 300, enrollmentRequired: true, description: 'Up to $300/calendar year for eligible Equinox or Equinox+ membership charges; enroll through platinum.equinox.com.' },
      'Global Entry/TSA PreCheck': { maxValue: 120, periodType: 'four-year', description: 'One application credit every four years: Global Entry $120 or TSA PreCheck up to $85. Record the actual fee; these are alternatives, not separate allowances.' },
      'SoulCycle At-Home Bike Credit': { valueKind: 'information', requiresConfirmation: true, verifiedAt: null, description: 'Confirm current account eligibility before purchase. Not included in available or annual cash totals.' },
    }
    patch = entries[base]
  }
  if (cardId === 'amex-hilton-aspire') {
    const entries: Record<string, Terms> = {
      'Hilton Resort Credit': { maxValue: 200, description: '$200 each calendar half at participating Hilton Resorts. Advance Purchase/Non-Refundable rates excluded. Eligible incidentals must be charged to the room and paid with Aspire.' },
      'Flight Credit': { maxValue: 50, description: '$50 each calendar quarter on eligible airfare directly from airlines or Amex Travel. Do not assume baggage fees or upgrades qualify.' },
      'Hilton Dining Credit': { retired: true, description: 'Retired: no standard $250 annual Aspire dining credit is supported by current issuer terms. Not included in available value.' },
      'Waldorf/Conrad Credit': { maxValue: 100, periodType: 'per-booking', perUseLimit: 100, description: 'Up to $100 on the hotel bill per eligible 2+ night booking using the Aspire benefit rate at HiltonHonorsAspireCard.com. Not an annual allowance or statement credit. Record one entry per booking.' },
      'CLEAR Plus Credit': { maxValue: 209, description: 'Up to $209/calendar year for eligible CLEAR+ membership charges paid with Aspire.' },
      'Free Night Award': { periodType: 'certificate', requiresConfirmation: true, description: 'Annual certificate issued after renewal; confirm the actual certificate dates and redemption value. Additional certificates may be earned at $30,000 and $60,000 calendar-year spending.' },
      'Cell Phone Protection': { valueKind: 'coverage', description: 'Up to $800 per approved claim; two claims per 12 months, $50 deductible. Prior month wireless bill must be paid with an eligible card; policy terms apply.' },
      'Stadium/Arena Concessions Credit': { maxValue: 250, validUntil: date('2026-12-31'), requiresConfirmation: true, enrollmentRequired: true, description: 'Optional Amex offer: 10% back on qualifying venue concessions, up to $250 through December 31, 2026. One enrolled card per member; confirm this is your enrolled card.' },
    }
    patch = entries[base]
  }
  if (cardId === 'chase-reserve') {
    const entries: Record<string, Terms> = {
      'Annual Travel Credit': { maxValue: 300, periodType: 'anniversary', description: '$300 per account anniversary/billing-cycle year. Enter the current start and end dates shown by Chase; January 1 is not assumed.' },
      'The Edit Hotel Credit': { maxValue: 500, perUseLimit: 250, description: 'Up to $500/calendar year, capped at $250 per qualifying prepaid 2+ night booking through The Edit. Record each booking separately.' },
      '2026 Hotel Credit (One-Time)': { maxValue: 250, periodType: 'one-time', validUntil: date('2026-12-31'), description: '$250 total in 2026 on qualifying prepaid 2+ night Chase Travel bookings at IHG, Montage, Pendry, Omni, Virgin, Minor or Pan Pacific brands.' },
      'Dining Credit': { maxValue: 150, description: '$150 each calendar half at select Sapphire Reserve Exclusive Tables restaurants; not every OpenTable restaurant qualifies.' },
      'Entertainment Credit': { maxValue: 150, enrollmentRequired: true, validUntil: end2027, description: '$150 each calendar half for eligible StubHub/viagogo purchases after activation, through December 31, 2027.' },
      'DoorDash Credits': { retired: true, description: 'Historical combined DoorDash allowance. New usage belongs in the separate monthly promo entries for the applicable date. Existing usage has not been redistributed.' },
      'DoorDash DashPass': { maxValue: 120, periodType: 'one-time', requiresConfirmation: true, enrollmentRequired: true, sourceUrl: anniversarySource, description: 'Complimentary DashPass; Chase announced extension through 2029 effective October 1, 2026. Confirm activation and actual membership dates. $120 is nominal annual membership value, not cash.' },
      'Lyft Credit': { maxValue: 120, periodType: 'monthly', periodValue: 10, validUntil: date('2027-09-30'), description: '$10 monthly in-app credit on eligible rides through September 30, 2027; link the card in Lyft. Unused credit does not carry over.' },
      'Peloton Credit': { maxValue: 120, periodType: 'monthly', periodValue: 10, enrollmentRequired: true, validUntil: end2027, description: '$10 monthly statement credit on eligible Peloton memberships after activation, through December 31, 2027. Equipment points bonuses are separate.' },
      'Apple Music': { maxValue: 143.88, periodType: 'one-time', valueKind: 'membership', requiresConfirmation: true, enrollmentRequired: true, sourceUrl: 'https://www.apple.com/apple-music/', description: 'Activate through Chase by June 22, 2027 for at least 12 months. Confirm subscription expiry. Value uses $11.99 x 12; Apple One discount differs.' },
      'Apple TV': { maxValue: 156, valueKind: 'membership', enrollmentRequired: true, description: 'Complimentary subscription activated through Chase. Preserve your actual activation/expiry and previously recorded value; Apple One discount differs.' },
      'Global Entry/TSA PreCheck': { maxValue: 120, periodType: 'four-year', description: 'One application-fee credit up to $120 every four years for Global Entry, TSA PreCheck OR NEXUS. Record the actual fee.' },
      'Priority Pass Select': { valueKind: 'estimate', description: 'Lounge membership, not cash credit. $469 is a personal estimate and excluded from available/annual cash totals; check membership activation in Chase.' },
      'Marriott Bonvoy Gold Elite Status': { valueKind: 'information', validUntil: date('2026-09-30'), description: 'Limited-time registration July 1-September 30, 2026; qualifying paid stays may extend status. Do not double-count status already provided by Platinum.' },
      'IHG One Rewards Platinum Elite Status': { valueKind: 'information', validUntil: end2027, enrollmentRequired: true, description: 'Link your IHG account through Chase for complimentary Platinum Elite status through December 31, 2027.' },
      '$75K Spend-Tier Perks': { valueKind: 'information', description: 'Conditional on $75,000 calendar-year spending: Hyatt Explorist, IHG Diamond, Southwest A-List, $500 Southwest Chase Travel credit and $250 Shops at Chase credit. No automatic cash value assumed.' },
    }
    patch = entries[base]
  }
  return patch ? { sourceUrl, verifiedAt: date(VERIFIED_DATE), ...patch } : null
}

export const additionalBenefits: Prisma.PerkCreateManyInput[] = [
  ...(['amex-platinum', 'amex-hilton-aspire', 'chase-reserve'] as const).flatMap(cardId => {
    const names = cardId === 'amex-platinum'
      ? ['Global Lounge Collection', 'Hilton Honors Gold Status', 'Marriott Bonvoy Gold Elite Status', 'Leaders Club Sterling Status', 'Car Rental Status', 'Travel and Purchase Protections']
      : cardId === 'amex-hilton-aspire'
        ? ['Hilton Honors Diamond Status', 'National Emerald Club Executive Status', 'Travel and Purchase Protections']
        : ['IHG One Rewards Platinum Elite Status', 'Marriott Bonvoy Gold Elite Status', 'Chase Sapphire Lounge Access', '$75K Spend-Tier Perks', 'Travel and Purchase Protections']
    return names.map(name => ({ cardId, name, maxValue: 0, periodType: 'annual', valueKind: 'information', category: 'status', enrollmentRequired: !name.includes('Protections'), description: 'Informational benefit. Eligibility, enrollment, access and policy conditions apply; no cash value is assumed.', sourceUrl: cardId === 'amex-platinum' ? sources.platinum : cardId === 'amex-hilton-aspire' ? sources.aspire : sources.chase, verifiedAt: date(VERIFIED_DATE), ...verifiedTerms(cardId, name) }))
  }),
  ...[{ name: 'DoorDash Restaurant Promo', amount: 5 }, { name: 'DoorDash Grocery/Retail Promo 1', amount: 10 }, { name: 'DoorDash Grocery/Retail Promo 2', amount: 10 }, { name: 'DoorDash Any-Order Promo', amount: 15 }].map(({ name, amount }) => ({
    cardId: 'chase-reserve', name, maxValue: amount * 12, periodValue: amount, perUseLimit: amount, periodType: 'monthly', valueKind: 'credit', category: 'dining', enrollmentRequired: true, ...(amount === 15 ? { startDate: date('2026-10-01') } : {}), validUntil: date(amount === 5 ? '2026-09-30' : '2029-12-31'), sourceUrl: anniversarySource, verifiedAt: date(VERIFIED_DATE), description: `One $${amount} monthly promo on ${amount === 5 ? 'an eligible restaurant' : amount === 15 ? 'any qualifying DoorDash' : 'an eligible grocery/retail'} order with activated DashPass. No rollover. ${amount === 5 ? 'Replaced by the $15 any-order promo October 1, 2026.' : amount === 15 ? 'Starts October 1, 2026; replaces the $5 restaurant promo.' : 'Separate from the other monthly promos.'}`,
  })),
  { cardId: 'chase-reserve', name: '10th Anniversary Chase Offers', maxValue: 0, periodType: 'one-time', valueKind: 'information', category: 'travel', requiresConfirmation: true, enrollmentRequired: true, validUntil: date('2026-12-14'), sourceUrl: anniversarySource, verifiedAt: date(VERIFIED_DATE), description: 'Targeted offers, not guaranteed benefits: Miraval/Alila $250 back on $1,000; JSX $200 on $200; SIXT $125 on $500; Wander $350 on $1,500, paid by December 14, 2026. IHG $125 on $500 expires October 16. Activate your specific Chase Offer and check its terms before purchasing.' },
]
