import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create default user
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      name: 'Default User',
      notificationPrefs: {
        expiring: true,
        available: true,
        deals: true,
        reminderDays: [14, 7, 2, 1]
      }
    }
  })

  // Create cards
  const amexPlatinum = await prisma.card.upsert({
    where: { id: 'amex-platinum' },
    update: {},
    create: {
      id: 'amex-platinum',
      name: 'Amex Platinum',
      issuer: 'American Express',
      annualFee: 895,
      imageUrl: '/cards/amex-platinum.png'
    }
  })

  const amexHiltonAspire = await prisma.card.upsert({
    where: { id: 'amex-hilton-aspire' },
    update: {},
    create: {
      id: 'amex-hilton-aspire',
      name: 'Amex Hilton Aspire',
      issuer: 'American Express',
      annualFee: 550,
      imageUrl: '/cards/amex-hilton-aspire.png'
    }
  })

  const chaseReserve = await prisma.card.upsert({
    where: { id: 'chase-reserve' },
    update: {},
    create: {
      id: 'chase-reserve',
      name: 'Chase Sapphire Reserve',
      issuer: 'Chase',
      annualFee: 795,
      imageUrl: '/cards/chase-reserve.png'
    }
  })

  // Create Amex Platinum perks (complete list)
  const amexPlatinumPerks = [
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
  ]

  for (const perk of amexPlatinumPerks) {
    await prisma.perk.create({
      data: {
        ...perk,
        cardId: amexPlatinum.id
      }
    })
  }

  // Create Amex Hilton Aspire perks (complete list)
  const hiltonAspirePerks = [
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
  ]

  for (const perk of hiltonAspirePerks) {
    await prisma.perk.create({
      data: {
        ...perk,
        cardId: amexHiltonAspire.id
      }
    })
  }

  // Create Chase Sapphire Reserve perks (complete list with 2026 updates)
  const chaseReservePerks = [
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
  ]

  for (const perk of chaseReservePerks) {
    await prisma.perk.create({
      data: {
        ...perk,
        cardId: chaseReserve.id
      }
    })
  }

  // Associate cards with user
  await prisma.userCard.create({
    data: {
      userId: user.id,
      cardId: amexPlatinum.id,
      renewalDate: new Date('2026-10-31T00:00:00.000Z')
    }
  })

  await prisma.userCard.create({
    data: {
      userId: user.id,
      cardId: amexHiltonAspire.id,
      renewalDate: new Date('2026-11-30T00:00:00.000Z')
    }
  })

  await prisma.userCard.create({
    data: {
      userId: user.id,
      cardId: chaseReserve.id,
      renewalDate: new Date('2027-01-31T00:00:00.000Z')
    }
  })

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
