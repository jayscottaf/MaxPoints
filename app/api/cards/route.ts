import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPeriodDates } from '@/lib/utils'

function getPeriodRange(perk: { startDate: Date | null; endDate: Date | null; periodType: string }) {
  if (perk.startDate && perk.endDate) {
    return { start: new Date(perk.startDate), end: new Date(perk.endDate) }
  }

  return getPeriodDates(perk.periodType)
}

export async function GET() {
  try {
    const user = await prisma.user.findFirst()

    const cards = await prisma.card.findMany({
      include: {
        perks: {
          include: {
            usage: user ? {
              where: { userId: user.id }
            } : false
          }
        },
        userCards: true
      }
    })

    // Attach current-period usage to each perk so dashboard totals match the perk modal.
    const cardsWithUsage = cards.map(card => ({
      ...card,
      perks: card.perks.map(perk => {
        const periodRange = getPeriodRange(perk)
        const currentUsage = perk.usage
          .filter((usage) => {
            const usageDate = new Date(usage.date)
            return usageDate >= periodRange.start && usageDate <= periodRange.end
          })
          .reduce((sum, usage) => sum + usage.amount, 0)

        return { ...perk, currentUsage }
      })
    }))

    return NextResponse.json(cardsWithUsage)
  } catch (error) {
    console.error('Error fetching cards:', error)
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const card = await prisma.card.create({
      data: body
    })
    return NextResponse.json(card)
  } catch (error) {
    console.error('Error creating card:', error)
    return NextResponse.json({ error: 'Failed to create card' }, { status: 500 })
  }
}
