import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    const currentUsage = perk.usage.reduce((sum, u) => sum + u.amount, 0)
    if (currentUsage + amount > perk.maxValue) {
      return NextResponse.json({
        error: 'Usage would exceed maximum value',
        currentUsage,
        maxValue: perk.maxValue,
        attemptedAmount: amount
      }, { status: 400 })
    }

    const usage = await prisma.usage.create({
      data: {
        userId,
        perkId,
        amount,
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