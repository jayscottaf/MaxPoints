import type { Prisma } from '@prisma/client'
import { benefitCorrections, CATALOG_VERSION, valueKind } from '../lib/benefit-catalog'
import { additionalBenefits, verifiedTerms } from '../lib/verified-benefits'

const raw: Record<string, Omit<Prisma.PerkCreateManyInput, 'cardId'>[]> = {
'amex-platinum': [
    // Quarterly Resy Credits
    { name: 'Resy Dining Credit Q1', maxValue: 100, periodType: 'quarterly', category: 'dining',
      startDate: new Date('2026-01-01'), endDate: new Date('2026-03-31'), enrollmentRequired: true },
    { name: 'Resy Dining Credit Q2', maxValue: 100, periodType: 'quarterly', category: 'dining',
      startDate: new Date('2026-04-01'), endDate: new Date('2026-06-30'), enrollmentRequired: true },
    { name: 'Resy Dining Credit Q3', maxValue: 100, periodType: 'quarterly', category: 'dining',
      startDate: new Date('2026-07-01'), endDate: new Date('2026-09-30'), enrollmentRequired: true },
    { name: 'Resy Dining Credit Q4', maxValue: 100, periodType: 'quarterly', category: 'dining',
      startDate: new Date('2026-10-01'), endDate: new Date('2026-12-31'), enrollmentRequired: true },

    // Quarterly Lululemon Credits
    { name: 'Lululemon Credit Q1', maxValue: 75, periodType: 'quarterly', category: 'shopping',
      startDate: new Date('2026-01-01'), endDate: new Date('2026-03-31'), enrollmentRequired: true },
    { name: 'Lululemon Credit Q2', maxValue: 75, periodType: 'quarterly', category: 'shopping',
      startDate: new Date('2026-04-01'), endDate: new Date('2026-06-30'), enrollmentRequired: true },
    { name: 'Lululemon Credit Q3', maxValue: 75, periodType: 'quarterly', category: 'shopping',
      startDate: new Date('2026-07-01'), endDate: new Date('2026-09-30'), enrollmentRequired: true },
    { name: 'Lululemon Credit Q4', maxValue: 75, periodType: 'quarterly', category: 'shopping',
      startDate: new Date('2026-10-01'), endDate: new Date('2026-12-31'), enrollmentRequired: true },

    // Annual Credits
    { name: 'Hotel Credit (FHR/THC)', maxValue: 600, periodType: 'annual', category: 'travel',
      description: 'Up to $300 semi-annually on prepaid Fine Hotels & Resorts or Hotel Collection bookings' },
    { name: 'Digital Entertainment Credit', maxValue: 300, periodType: 'annual', category: 'entertainment',
      description: '$25/month for streaming services', enrollmentRequired: true },
    { name: 'Uber Cash', maxValue: 200, periodType: 'annual', category: 'travel',
      description: '$15/month + $20 bonus in December', enrollmentRequired: true },
    { name: 'Uber One Membership', maxValue: 120, periodType: 'annual', category: 'travel',
      enrollmentRequired: true },
    { name: 'CLEAR Plus Credit', maxValue: 209, periodType: 'annual', category: 'travel' },
    { name: 'Walmart+ Membership', maxValue: 155, periodType: 'annual', category: 'shopping',
      description: '$12.95/month reimbursed', enrollmentRequired: true },
    { name: 'Airline Incidental Fee Credit', maxValue: 200, periodType: 'annual', category: 'travel',
      enrollmentRequired: true },
    { name: 'Oura Ring Credit', maxValue: 200, periodType: 'annual', category: 'wellness',
      enrollmentRequired: true },
    { name: 'Equinox Credit', maxValue: 300, periodType: 'annual', category: 'wellness' },
    { name: 'SoulCycle At-Home Bike Credit', maxValue: 300, periodType: 'annual', category: 'wellness',
      description: '$300 toward an at-home SoulCycle bike; requires active Equinox+ membership' },
    { name: 'Global Entry/TSA PreCheck', maxValue: 120, periodType: 'one-time', category: 'travel',
      notes: 'Every 4 years' }
  ],
'amex-hilton-aspire': [
    { name: 'Hilton Resort Credit H1', maxValue: 200, periodType: 'semi-annual', category: 'travel',
      startDate: new Date('2026-01-01'), endDate: new Date('2026-06-30') },
    { name: 'Hilton Resort Credit H2', maxValue: 200, periodType: 'semi-annual', category: 'travel',
      startDate: new Date('2026-07-01'), endDate: new Date('2026-12-31') },
    { name: 'Flight Credit Q1', maxValue: 50, periodType: 'quarterly', category: 'travel',
      startDate: new Date('2026-01-01'), endDate: new Date('2026-03-31') },
    { name: 'Flight Credit Q2', maxValue: 50, periodType: 'quarterly', category: 'travel',
      startDate: new Date('2026-04-01'), endDate: new Date('2026-06-30') },
    { name: 'Flight Credit Q3', maxValue: 50, periodType: 'quarterly', category: 'travel',
      startDate: new Date('2026-07-01'), endDate: new Date('2026-09-30') },
    { name: 'Flight Credit Q4', maxValue: 50, periodType: 'quarterly', category: 'travel',
      startDate: new Date('2026-10-01'), endDate: new Date('2026-12-31') },
    { name: 'Hilton Dining Credit', maxValue: 250, periodType: 'annual', category: 'dining',
      description: 'Eligible Hilton on-property dining' },
    { name: 'Waldorf/Conrad Credit', maxValue: 100, periodType: 'annual', category: 'travel',
      description: '2-night minimum prepaid stay' },
    { name: 'CLEAR Plus Credit', maxValue: 209, periodType: 'annual', category: 'travel' },
    { name: 'Stadium/Arena Concessions Credit', maxValue: 250, periodType: 'annual', category: 'entertainment',
      enrollmentRequired: true,
      description: '10% back on qualifying concessions at select stadiums and arenas, up to $250/calendar year' },
    { name: 'Free Night Award', maxValue: 0, periodType: 'annual', category: 'travel',
      description: 'Annual free night certificate' },
    { name: 'Cell Phone Protection', maxValue: 800, periodType: 'annual', category: 'insurance',
      description: 'Up to $800 per claim, 2 claims per year' },
    { name: 'Hilton Honors Diamond Status', maxValue: 0, periodType: 'annual', category: 'status',
      description: 'Info only: complimentary top-tier Hilton elite status (upgrades, lounge access, bonus points)' },
    { name: 'National Emerald Club Executive Status', maxValue: 0, periodType: 'annual', category: 'status',
      description: 'Info only: complimentary National Car Rental Emerald Club Executive status' }
  ],
'chase-reserve': [
    { name: 'Annual Travel Credit', maxValue: 300, periodType: 'annual', category: 'travel',
      description: 'Automatic credit for any travel purchases' },
    { name: 'The Edit Hotel Credit', maxValue: 500, periodType: 'annual', category: 'travel',
      description: 'Two $250 credits applied to your first two qualifying prepaid 2+ night bookings any time in the calendar year (no fixed half-year windows as of 2026)' },
    { name: '2026 Hotel Credit (One-Time)', maxValue: 250, periodType: 'one-time', category: 'travel',
      description: 'Special 2026 credit for select partner hotels',
      startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') },
    { name: 'Dining Credit H1', maxValue: 150, periodType: 'semi-annual', category: 'dining',
      description: 'Sapphire Reserve Exclusive Tables program',
      startDate: new Date('2026-01-01'), endDate: new Date('2026-06-30') },
    { name: 'Dining Credit H2', maxValue: 150, periodType: 'semi-annual', category: 'dining',
      description: 'Sapphire Reserve Exclusive Tables program',
      startDate: new Date('2026-07-01'), endDate: new Date('2026-12-31') },
    { name: 'Entertainment Credit H1', maxValue: 150, periodType: 'semi-annual', category: 'entertainment',
      description: 'StubHub and viagogo purchases',
      startDate: new Date('2026-01-01'), endDate: new Date('2026-06-30') },
    { name: 'Entertainment Credit H2', maxValue: 150, periodType: 'semi-annual', category: 'entertainment',
      description: 'StubHub and viagogo purchases',
      startDate: new Date('2026-07-01'), endDate: new Date('2026-12-31') },
    { name: 'DoorDash DashPass', maxValue: 120, periodType: 'annual', category: 'dining',
      description: 'Complimentary DashPass membership' },
    { name: 'DoorDash Credits', maxValue: 300, periodType: 'annual', category: 'dining',
      description: '$25/month in DoorDash credits' },
    { name: 'Lyft Credit', maxValue: 120, periodType: 'annual', category: 'travel',
      description: '$10/month in Lyft credit (up to $120/year), through 9/30/2027' },
    { name: 'Peloton Credit', maxValue: 120, periodType: 'annual', category: 'wellness',
      enrollmentRequired: true,
      description: '$10/month in Peloton credit (up to $120/year), through 12/31/2027' },
    { name: 'Apple TV+ & Music', maxValue: 288, periodType: 'annual', category: 'entertainment',
      description: 'Complimentary subscriptions through June 2027' },
    { name: 'Global Entry/TSA PreCheck', maxValue: 120, periodType: 'one-time', category: 'travel',
      notes: 'Every 4 years' },
    { name: 'Priority Pass Select', maxValue: 469, periodType: 'annual', category: 'travel',
      description: 'Estimated value of membership' },
    { name: 'IHG One Rewards Platinum Elite Status', maxValue: 0, periodType: 'annual', category: 'status',
      enrollmentRequired: true,
      description: 'Info only: complimentary IHG Platinum Elite status through 12/31/2027' },
    { name: 'Marriott Bonvoy Gold Elite Status', maxValue: 0, periodType: 'annual', category: 'status',
      enrollmentRequired: true,
      description: 'Info only: complimentary Marriott Gold Elite status (limited-time registration/nights required)' },
    { name: 'Chase Sapphire Lounge Access', maxValue: 0, periodType: 'annual', category: 'status',
      description: 'Info only: complimentary access to Chase Sapphire Lounges by The Club, plus 2 guests' },
    { name: '$75K Spend-Tier Perks', maxValue: 0, periodType: 'annual', category: 'status',
      description: 'Info only: at $75K annual spend — $500 Southwest travel credit, Southwest A-List, $250 Shops at Chase credit, Hyatt Explorist, IHG Diamond' }
  ],
}

function initialPerks(cardId: string) {
  return (raw[cardId] ?? []).flatMap(perk => {
    if (perk.name === 'Apple TV+ & Music') return [{ ...perk, name: 'Apple TV', maxValue: 156, periodType: 'one-time', requiresConfirmation: true, valueKind: 'membership', cardId }, { ...perk, name: 'Apple Music', maxValue: 143.88, valueKind: 'membership', cardId }]
    const correction = benefitCorrections.find(c => c.cardId === cardId && c.name === perk.name)
    return [{ ...perk, cardId, valueKind: valueKind(perk.name, perk.category), ...(correction ? { periodType: correction.periodType, periodValue: correction.periodValue, sourceUrl: correction.sourceUrl, verifiedAt: new Date(CATALOG_VERSION), ...('maxValue' in correction ? { maxValue: correction.maxValue } : {}), ...('decemberBonus' in correction ? { decemberBonus: correction.decemberBonus } : {}) } : {}) }]
  })
}

export function catalogPerks(cardId: string) {
  const entries: Prisma.PerkCreateManyInput[] = initialPerks(cardId).map(perk => ({ ...perk, ...verifiedTerms(cardId, perk.name) }))
  for (const perk of additionalBenefits.filter(p => p.cardId === cardId)) {
    const index = entries.findIndex(p => p.name === perk.name)
    if (index < 0) entries.push(perk)
    else entries[index] = { ...entries[index], ...perk }
  }
  return entries.filter(perk => !perk.retired)
}
