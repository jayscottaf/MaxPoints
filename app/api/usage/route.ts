import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPeriodDates } from '@/lib/utils'

function getPeriodRange(perk: { startDate: Date | null; endDate: Date | null; periodType: string }) {
  if (perk.startDate && perk.endDate) {
    return { start: new Date(perk.startDate), end: new Date(perk.endDate) }
  }

  return getPeriodDates(perk.periodType)
}

function getUsageDateForPeriod(periodRange: { start: Date; end: Date }) {
  const now = new Date()

  if (now < periodRange.start) {
    return periodRange.start
  }

  if (now > periodRange.end) {
    return periodRange.end
  }

  return now
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const perkId = searchParams.get('perkId')

    const user = await prisma.user.findFirst()
    if (!user) {
      return NextResponse.json({ error: 'No user found' }, { status: 404 })
    }

    let where: any = { userId: user.id }
    if (perkId) {
      where.perkId = perkId
    }

    const usage = await prisma.usage.findMany({
      where,
      include: {
        perk: {
          include: {
            card: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    return NextResponse.json(usage)
  } catch (error) {
    console.error('Error fetching usage:', error)
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { perkId, amount, notes } = body
    const usageAmount = Number(amount)

    if (!perkId || !Number.isFinite(usageAmount) || usageAmount <= 0) {
      return NextResponse.json({ error: 'Valid perk and amount are required' }, { status: 400 })
    }

    // Resolve the default user
    const user = await prisma.user.findFirst()
    if (!user) {
      return NextResponse.json({ error: 'No user found' }, { status: 404 })
    }
    const userId = user.id

    // Check if this would exceed the perk's max value
    const perk = await prisma.perk.findUnique({
      where: { id: perkId },
      include: {
        usage: {
          where: { userId }
        }
      }
    })

    if (!perk) {
      return NextResponse.json({ error: 'Perk not found' }, { status: 404 })
    }

    const periodRange = getPeriodRange(perk)
    const currentUsage = perk.usage
      .filter((usage) => {
        const usageDate = new Date(usage.date)
        return usageDate >= periodRange.start && usageDate <= periodRange.end
      })
      .reduce((sum, usage) => sum + usage.amount, 0)

    if (currentUsage + usageAmount > perk.maxValue) {
      return NextResponse.json({
        error: 'Usage would exceed maximum value',
        currentUsage,
        maxValue: perk.maxValue,
        attemptedAmount: usageAmount
      }, { status: 400 })
    }

    const usage = await prisma.usage.create({
      data: {
        userId,
        perkId,
        amount: usageAmount,
        date: getUsageDateForPeriod(periodRange),
        notes
      },
      include: {
        perk: {
          include: {
            card: true
          }
        }
      }
    })

    return NextResponse.json(usage)
  } catch (error) {
    console.error('Error creating usage:', error)
    return NextResponse.json({ error: 'Failed to create usage' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Usage ID required' }, { status: 400 })
    }

    await prisma.usage.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting usage:', error)
    return NextResponse.json({ error: 'Failed to delete usage' }, { status: 500 })
  }
}
