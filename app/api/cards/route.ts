import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    // Attach currentUsage to each perk
    const cardsWithUsage = cards.map(card => ({
      ...card,
      perks: card.perks.map(perk => {
        const currentUsage = perk.usage.reduce((sum, u) => sum + u.amount, 0)
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