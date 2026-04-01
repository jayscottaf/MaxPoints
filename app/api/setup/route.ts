import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// WARNING: This endpoint should be removed after initial setup!
// It's only for initializing the database with seed data

export async function GET(request: NextRequest) {
  try {
    // Check if database is already set up
    let userCount = 0
    try {
      userCount = await prisma.user.count()
      if (userCount > 0) {
        return NextResponse.json({
          message: 'Database already initialized',
          stats: {
            users: await prisma.user.count(),
            cards: await prisma.card.count(),
            perks: await prisma.perk.count()
          }
        })
      }
    } catch (countError) {
      // Tables don't exist yet, continue with setup
      console.log('Tables not found, will create them')
    }

    // Create default user
    const user = await prisma.user.create({
      data: {
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
    const cards = await Promise.all([
      prisma.card.create({
        data: {
          id: 'amex-platinum',
          name: 'Amex Platinum',
          issuer: 'American Express',
          annualFee: 895
        }
      }),
      prisma.card.create({
        data: {
          id: 'amex-hilton-aspire',
          name: 'Amex Hilton Aspire',
          issuer: 'American Express',
          annualFee: 550
        }
      }),
      prisma.card.create({
        data: {
          id: 'chase-reserve',
          name: 'Chase Sapphire Reserve',
          issuer: 'Chase',
          annualFee: 795
        }
      })
    ])

    // Create perks for each card
    const perks = []

    // Amex Platinum perks
    const platinumPerks = [
      { name: 'Resy Dining Credit Q1', maxValue: 100, periodType: 'quarterly', category: 'dining', enrollmentRequired: true },
      { name: 'Resy Dining Credit Q2', maxValue: 100, periodType: 'quarterly', category: 'dining', enrollmentRequired: true },
      { name: 'Resy Dining Credit Q3', maxValue: 100, periodType: 'quarterly', category: 'dining', enrollmentRequired: true },
      { name: 'Resy Dining Credit Q4', maxValue: 100, periodType: 'quarterly', category: 'dining', enrollmentRequired: true },
      { name: 'Lululemon Credit Q1', maxValue: 75, periodType: 'quarterly', category: 'shopping', enrollmentRequired: true },
      { name: 'Lululemon Credit Q2', maxValue: 75, periodType: 'quarterly', category: 'shopping', enrollmentRequired: true },
      { name: 'Lululemon Credit Q3', maxValue: 75, periodType: 'quarterly', category: 'shopping', enrollmentRequired: true },
      { name: 'Lululemon Credit Q4', maxValue: 75, periodType: 'quarterly', category: 'shopping', enrollmentRequired: true },
      { name: 'Saks Fifth Avenue Credit H1', maxValue: 50, periodType: 'semi-annual', category: 'shopping', enrollmentRequired: true },
      { name: 'Saks Fifth Avenue Credit H2', maxValue: 50, periodType: 'semi-annual', category: 'shopping', enrollmentRequired: true },
      { name: 'Hotel Credit (FHR/THC)', maxValue: 600, periodType: 'annual', category: 'travel' },
      { name: 'Digital Entertainment Credit', maxValue: 300, periodType: 'annual', category: 'entertainment', enrollmentRequired: true },
      { name: 'Uber Cash', maxValue: 200, periodType: 'annual', category: 'travel', enrollmentRequired: true },
      { name: 'Uber One Membership', maxValue: 120, periodType: 'annual', category: 'travel', enrollmentRequired: true },
      { name: 'CLEAR Plus Credit', maxValue: 209, periodType: 'annual', category: 'travel' },
      { name: 'Walmart+ Membership', maxValue: 155, periodType: 'annual', category: 'shopping', enrollmentRequired: true },
      { name: 'Airline Incidental Fee Credit', maxValue: 200, periodType: 'annual', category: 'travel', enrollmentRequired: true },
      { name: 'Equinox Credit', maxValue: 300, periodType: 'annual', category: 'wellness' },
      { name: 'Oura Ring Credit', maxValue: 200, periodType: 'annual', category: 'wellness', enrollmentRequired: true },
      { name: 'Global Entry/TSA PreCheck', maxValue: 120, periodType: 'one-time', category: 'travel' }
    ]

    for (const perk of platinumPerks) {
      perks.push(prisma.perk.create({
        data: { ...perk, cardId: 'amex-platinum' }
      }))
    }

    // Hilton Aspire perks
    const hiltonPerks = [
      { name: 'Hilton Resort Credit H1', maxValue: 200, periodType: 'semi-annual', category: 'travel' },
      { name: 'Hilton Resort Credit H2', maxValue: 200, periodType: 'semi-annual', category: 'travel' },
      { name: 'Flight Credit Q1', maxValue: 50, periodType: 'quarterly', category: 'travel' },
      { name: 'Flight Credit Q2', maxValue: 50, periodType: 'quarterly', category: 'travel' },
      { name: 'Flight Credit Q3', maxValue: 50, periodType: 'quarterly', category: 'travel' },
      { name: 'Flight Credit Q4', maxValue: 50, periodType: 'quarterly', category: 'travel' },
      { name: 'Hilton Dining Credit', maxValue: 250, periodType: 'annual', category: 'dining' },
      { name: 'Waldorf/Conrad Credit', maxValue: 100, periodType: 'annual', category: 'travel' },
      { name: 'CLEAR Plus Credit', maxValue: 189, periodType: 'annual', category: 'travel' },
      { name: 'Free Night Award', maxValue: 0, periodType: 'annual', category: 'travel' },
      { name: 'Cell Phone Protection', maxValue: 800, periodType: 'annual', category: 'insurance' }
    ]

    for (const perk of hiltonPerks) {
      perks.push(prisma.perk.create({
        data: { ...perk, cardId: 'amex-hilton-aspire' }
      }))
    }

    // Chase Reserve perks
    const chasePerks = [
      { name: 'Annual Travel Credit', maxValue: 300, periodType: 'annual', category: 'travel' },
      { name: 'The Edit Hotel Credit', maxValue: 500, periodType: 'annual', category: 'travel' },
      { name: '2026 Hotel Credit (One-Time)', maxValue: 250, periodType: 'one-time', category: 'travel' },
      { name: 'Dining Credit H1', maxValue: 150, periodType: 'semi-annual', category: 'dining' },
      { name: 'Dining Credit H2', maxValue: 150, periodType: 'semi-annual', category: 'dining' },
      { name: 'Entertainment Credit H1', maxValue: 150, periodType: 'semi-annual', category: 'entertainment' },
      { name: 'Entertainment Credit H2', maxValue: 150, periodType: 'semi-annual', category: 'entertainment' },
      { name: 'DoorDash DashPass', maxValue: 120, periodType: 'annual', category: 'dining' },
      { name: 'DoorDash Credits', maxValue: 300, periodType: 'annual', category: 'dining' },
      { name: 'Apple TV+ & Music', maxValue: 288, periodType: 'annual', category: 'entertainment' },
      { name: 'Global Entry/TSA PreCheck', maxValue: 120, periodType: 'one-time', category: 'travel' },
      { name: 'Priority Pass Select', maxValue: 469, periodType: 'annual', category: 'travel' }
    ]

    for (const perk of chasePerks) {
      perks.push(prisma.perk.create({
        data: { ...perk, cardId: 'chase-reserve' }
      }))
    }

    await Promise.all(perks)

    // Associate cards with user
    await Promise.all([
      prisma.userCard.create({
        data: {
          userId: user.id,
          cardId: 'amex-platinum',
          renewalDate: new Date('2025-10-20')
        }
      }),
      prisma.userCard.create({
        data: {
          userId: user.id,
          cardId: 'amex-hilton-aspire',
          renewalDate: new Date('2025-11-22')
        }
      }),
      prisma.userCard.create({
        data: {
          userId: user.id,
          cardId: 'chase-reserve',
          renewalDate: new Date('2025-01-01')
        }
      })
    ])

    const stats = {
      users: await prisma.user.count(),
      cards: await prisma.card.count(),
      perks: await prisma.perk.count(),
      userCards: await prisma.userCard.count()
    }

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully!',
      stats
    })

  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({
      error: 'Failed to initialize database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}