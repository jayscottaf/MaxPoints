import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// One-off reconciliation endpoint to bring an already-seeded production
// database in line with the July 2026 benefit updates. Idempotent: additions
// are skipped if a perk with the same name already exists on the card, and
// removals/updates are no-ops once applied. Safe to run more than once.

type NewPerk = {
  name: string
  maxValue: number
  periodType: string
  category: string
  enrollmentRequired?: boolean
  description?: string
}

// Perks to delete (matched by exact name within the card).
const REMOVALS: Record<string, string[]> = {
  'amex-platinum': ['Saks Fifth Avenue Credit H1', 'Saks Fifth Avenue Credit H2'],
}

// Perks whose value/description changed (matched by exact name within the card).
const UPDATES: Record<string, Array<{ name: string; data: { maxValue?: number; description?: string } }>> = {
  'amex-hilton-aspire': [
    { name: 'CLEAR Plus Credit', data: { maxValue: 209 } },
  ],
  'chase-reserve': [
    {
      name: 'The Edit Hotel Credit',
      data: {
        description:
          'Two $250 credits applied to your first two qualifying prepaid 2+ night bookings any time in the calendar year (no fixed half-year windows as of 2026)',
      },
    },
  ],
}

// Perks to add if missing.
const ADDITIONS: Record<string, NewPerk[]> = {
  'amex-platinum': [
    {
      name: 'SoulCycle At-Home Bike Credit',
      maxValue: 300,
      periodType: 'annual',
      category: 'wellness',
      description: '$300 toward an at-home SoulCycle bike; requires active Equinox+ membership',
    },
  ],
  'amex-hilton-aspire': [
    {
      name: 'Stadium/Arena Concessions Credit',
      maxValue: 250,
      periodType: 'annual',
      category: 'entertainment',
      enrollmentRequired: true,
      description: '10% back on qualifying concessions at select stadiums and arenas, up to $250/calendar year',
    },
    {
      name: 'Hilton Honors Diamond Status',
      maxValue: 0,
      periodType: 'annual',
      category: 'status',
      description: 'Info only: complimentary top-tier Hilton elite status (upgrades, lounge access, bonus points)',
    },
    {
      name: 'National Emerald Club Executive Status',
      maxValue: 0,
      periodType: 'annual',
      category: 'status',
      description: 'Info only: complimentary National Car Rental Emerald Club Executive status',
    },
  ],
  'chase-reserve': [
    {
      name: 'Lyft Credit',
      maxValue: 120,
      periodType: 'annual',
      category: 'travel',
      description: '$10/month in Lyft credit (up to $120/year), through 9/30/2027',
    },
    {
      name: 'Peloton Credit',
      maxValue: 120,
      periodType: 'annual',
      category: 'wellness',
      enrollmentRequired: true,
      description: '$10/month in Peloton credit (up to $120/year), through 12/31/2027',
    },
    {
      name: 'IHG One Rewards Platinum Elite Status',
      maxValue: 0,
      periodType: 'annual',
      category: 'status',
      enrollmentRequired: true,
      description: 'Info only: complimentary IHG Platinum Elite status through 12/31/2027',
    },
    {
      name: 'Marriott Bonvoy Gold Elite Status',
      maxValue: 0,
      periodType: 'annual',
      category: 'status',
      enrollmentRequired: true,
      description: 'Info only: complimentary Marriott Gold Elite status (limited-time registration/nights required)',
    },
    {
      name: 'Chase Sapphire Lounge Access',
      maxValue: 0,
      periodType: 'annual',
      category: 'status',
      description: 'Info only: complimentary access to Chase Sapphire Lounges by The Club, plus 2 guests',
    },
    {
      name: '$75K Spend-Tier Perks',
      maxValue: 0,
      periodType: 'annual',
      category: 'status',
      description:
        'Info only: at $75K annual spend — $500 Southwest travel credit, Southwest A-List, $250 Shops at Chase credit, Hyatt Explorist, IHG Diamond',
    },
  ],
}

export async function GET(_request: NextRequest) {
  const result = { removed: [] as string[], updated: [] as string[], added: [] as string[], skipped: [] as string[] }

  try {
    // Removals — delete dependent usage rows first (no cascade in schema).
    for (const [cardId, names] of Object.entries(REMOVALS)) {
      for (const name of names) {
        const perks = await prisma.perk.findMany({ where: { cardId, name } })
        for (const perk of perks) {
          await prisma.usage.deleteMany({ where: { perkId: perk.id } })
          await prisma.perk.delete({ where: { id: perk.id } })
          result.removed.push(`${cardId}: ${name}`)
        }
      }
    }

    // Updates.
    for (const [cardId, updates] of Object.entries(UPDATES)) {
      for (const { name, data } of updates) {
        const { count } = await prisma.perk.updateMany({ where: { cardId, name }, data })
        if (count > 0) result.updated.push(`${cardId}: ${name}`)
      }
    }

    // Additions — skip if a perk with the same name already exists on the card.
    for (const [cardId, perks] of Object.entries(ADDITIONS)) {
      for (const perk of perks) {
        const existing = await prisma.perk.findFirst({ where: { cardId, name: perk.name } })
        if (existing) {
          result.skipped.push(`${cardId}: ${perk.name}`)
          continue
        }
        await prisma.perk.create({ data: { ...perk, cardId } })
        result.added.push(`${cardId}: ${perk.name}`)
      }
    }

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Sync-perks error:', error)
    return NextResponse.json(
      {
        error: 'Failed to sync perks',
        details: error instanceof Error ? error.message : 'Unknown error',
        partial: result,
      },
      { status: 500 }
    )
  }
}
