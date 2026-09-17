import { withOwner, getOwner } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calendarYear, summarizePerk } from '@/lib/accounting'

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cardId = searchParams.get('cardId')

    const user = await getOwner()
    const userId = user?.id
    const year = Number(searchParams.get('year') || calendarYear(new Date(), user.timezone))
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return NextResponse.json({ error: 'Invalid year.' }, { status: 400 })

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
    const perksWithUsage = perks.map(perk => summarizePerk(perk, year, user.timezone))

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
