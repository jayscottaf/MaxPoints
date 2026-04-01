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

    // Semi-annual Saks Credits
    { name: 'Saks Fifth Avenue Credit H1', maxValue: 50, periodType: 'semi-annual', category: 'shopping',
      startDate: new Date('2026-01-01'), endDate: new Date('2026-06-30'), enrollmentRequired: true },
    { name: 'Saks Fifth Avenue Credit H2', maxValue: 50, periodType: 'semi-annual', category: 'shopping',
      startDate: new Date('2026-07-01'), endDate: new Date('2026-12-31'), enrollmentRequired: true },

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
    { name: 'CLEAR Plus Credit', maxValue: 189, periodType: 'annual', category: 'travel' },
    { name: 'Free Night Award', maxValue: 0, periodType: 'annual', category: 'travel',
      description: 'Annual free night certificate' },
    { name: 'Cell Phone Protection', maxValue: 800, periodType: 'annual', category: 'insurance',
      description: 'Up to $800 per claim, 2 claims per year' }
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
      description: 'Two $250 credits for 2+ night prepaid bookings' },
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
    { name: 'Apple TV+ & Music', maxValue: 288, periodType: 'annual', category: 'entertainment',
      description: 'Complimentary subscriptions through June 2027' },
    { name: 'Global Entry/TSA PreCheck', maxValue: 120, periodType: 'one-time', category: 'travel',
      notes: 'Every 4 years' },
    { name: 'Priority Pass Select', maxValue: 469, periodType: 'annual', category: 'travel',
      description: 'Estimated value of membership' }
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
      renewalDate: new Date('2025-10-20')
    }
  })

  await prisma.userCard.create({
    data: {
      userId: user.id,
      cardId: amexHiltonAspire.id,
      renewalDate: new Date('2025-11-22')
    }
  })

  await prisma.userCard.create({
    data: {
      userId: user.id,
      cardId: chaseReserve.id,
      renewalDate: new Date('2025-01-01')
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