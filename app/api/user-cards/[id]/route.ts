import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function parseRenewalDate(value: unknown) {
  if (value === null || value === '') {
    return null
  }

  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Renewal date must use YYYY-MM-DD format')
  }

  return new Date(`${value}T00:00:00.000Z`)
}

function parseLast4(value: unknown) {
  if (value === null || value === '') {
    return null
  }

  if (typeof value !== 'string' || !/^\d{4}$/.test(value)) {
    throw new Error('Last 4 must be exactly 4 digits')
  }

  return value
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const userCard = await prisma.userCard.update({
      where: { id },
      data: {
        renewalDate: parseRenewalDate(body.renewalDate),
        last4: parseLast4(body.last4),
      },
      include: {
        card: true,
      },
    })

    return NextResponse.json(userCard)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update card settings'
    const status = message.includes('Record to update not found') ? 404 : 400

    return NextResponse.json({ error: message }, { status })
  }
}
