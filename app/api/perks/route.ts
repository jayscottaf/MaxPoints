import { withOwner, getOwner } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPeriodDates } from '@/lib/utils'

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cardId = searchParams.get('cardId')

    const user = await getOwner()
    const userId = user?.id

    const where: import('@prisma/client').Prisma.PerkWhereInput = { card: { userCards: { some: { userId, isActive: true } } } }
    if (cardId) {
      where.cardId = cardId
    }

    const perks = await prisma.perk.findMany({
      where,
      include: {
        card: true,
        usage: userId ? {
          where: {
            userId: userId
          }
        } : true
      }
    })

    // Calculate current period usage for each perk
    const perksWithUsage = perks.map(perk => {
      const periodDates = perk.startDate && perk.endDate ?
        { start: new Date(perk.startDate), end: new Date(perk.endDate) } :
        getPeriodDates(perk.periodType)

      const currentPeriodUsage = perk.usage
        .filter(u => {
          const usageDate = new Date(u.date)
          return usageDate >= periodDates.start && usageDate <= periodDates.end
        })
        .reduce((sum, u) => sum + u.amount, 0)

      return {
        ...perk,
        currentUsage: currentPeriodUsage,
        periodStart: periodDates.start,
        periodEnd: periodDates.end
      }
    })

    return NextResponse.json(perksWithUsage)
  } catch (error) {
    console.error('Error fetching perks:', error)
    return NextResponse.json({ error: 'Failed to fetch perks' }, { status: 500 })
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json()
    const perk = await prisma.perk.create({
      data: body
    })
    return NextResponse.json(perk)
  } catch (error) {
    console.error('Error creating perk:', error)
    return NextResponse.json({ error: 'Failed to create perk' }, { status: 500 })
  }
}
export const GET = withOwner(handleGET)
export const POST = withOwner(handlePOST)
