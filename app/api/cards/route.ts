import { withOwner, getOwner } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calendarYear, summarizePerk } from '@/lib/accounting'

async function handleGET(request: NextRequest) {
  try {
    const user = await getOwner()
    const year = Number(request.nextUrl.searchParams.get('year') || calendarYear(new Date(), user.timezone))
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return NextResponse.json({ error: 'Invalid year.' }, { status: 400 })

    const cards = await prisma.card.findMany({
      where: { userCards: { some: { userId: user.id, isActive: true } } },
      include: {
        perks: {
          include: {
            usage: user ? {
              where: { userId: user.id }
            } : false
          }
        },
        userCards: { where: { userId: user.id } }
      }
    })

    // Attach current-period usage to each perk so dashboard totals match the perk modal.
    const cardsWithUsage = cards.map(card => ({
      ...card,
      perks: card.perks.map(perk => {
        return { ...summarizePerk(perk, year, user.timezone), card: { id: card.id, name: card.name, issuer: card.issuer } }
      })
    }))

    return NextResponse.json(cardsWithUsage)
  } catch (error) {
    console.error('Error fetching cards:', error)
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 })
  }
}

async function handlePOST(request: NextRequest) {
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

export const GET = withOwner(handleGET)
export const POST = withOwner(handlePOST)
