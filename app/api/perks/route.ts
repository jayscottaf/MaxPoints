import { withOwner, getOwner } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calendarYear, summarizePerk } from '@/lib/accounting'
import { perkInput } from '@/lib/perk-input'
import { z } from 'zod'

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
    const parsed = z.object({ cardId: z.string().min(1), name: z.string().trim().min(1).max(200), maxValue: z.number().finite().min(0).max(1000000), periodType: z.enum(['monthly', 'quarterly', 'semi-annual', 'annual', 'one-time']), description: z.string().max(4000).optional(), notes: z.string().max(4000).optional(), enrollmentRequired: z.boolean().optional() }).strict().safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Invalid perk details.' }, { status: 400 })
    const owner = await getOwner()
    if (!await prisma.userCard.findFirst({ where: { userId: owner.id, cardId: parsed.data.cardId } })) return NextResponse.json({ error: 'Card not found.' }, { status: 404 })
    const perk = await prisma.perk.create({
      data: parsed.data
    })
    return NextResponse.json(perk)
  } catch (error) {
    console.error('Error creating perk:', error)
    return NextResponse.json({ error: 'Failed to create perk' }, { status: 500 })
  }
}
export const GET = withOwner(handleGET)
export const POST = withOwner(handlePOST)
export const PATCH = withOwner(async (request: NextRequest) => {
  const parsed = perkInput.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Check benefit amounts, dates and period.' }, { status: 400 })
  const user = await getOwner()
  const { id, ...input } = parsed.data
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${user.id + ':' + id}, 0))`
    const before = await tx.perk.findFirst({ where: { id, card: { userCards: { some: { userId: user.id } } } } })
    if (!before) return NextResponse.json({ error: 'Perk not found.' }, { status: 404 })
    await tx.perkRevision.create({ data: { userId: user.id, perkId: id, data: JSON.parse(JSON.stringify(before)) } })
    const perk = await tx.perk.update({ where: { id }, data: { ...input, startDate: input.startDate ? new Date(input.startDate) : null, endDate: input.endDate ? new Date(input.endDate) : null, verifiedAt: null } })
    if (before.periodType !== input.periodType || before.periodValue !== input.periodValue) await tx.usage.updateMany({ where: { perkId: id, userId: user.id, deletedAt: null }, data: { needsReview: true } })
    return NextResponse.json(perk)
  })
})
