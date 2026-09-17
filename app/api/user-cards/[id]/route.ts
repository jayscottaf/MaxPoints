import { withOwner, getOwner } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function lastDayOfExpirationMonth(value: string) {
  const [yearValue, monthValue] = value.split('-')
  const year = Number(yearValue)
  const month = Number(monthValue)

  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Expiration month must use YYYY-MM format')
  }

  return new Date(Date.UTC(year, month, 0))
}

function parseCardExpirationDate(value: unknown) {
  if (value === null || value === '') {
    return null
  }

  if (typeof value === 'string' && /^\d{4}-\d{2}$/.test(value)) {
    return lastDayOfExpirationMonth(value)
  }

  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Expiration month must use YYYY-MM format')
  }

  return lastDayOfExpirationMonth(value.slice(0, 7))
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

async function handlePATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    let renewalDate: Date | null | undefined
    if (body.renewalDate === null || body.renewalDate === '') renewalDate = null
    else if (body.renewalDate !== undefined) {
      if (typeof body.renewalDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.renewalDate)) throw new Error('Invalid renewal date')
      renewalDate = new Date(body.renewalDate + 'T00:00:00Z')
      if (!Number.isFinite(renewalDate.getTime()) || renewalDate.toISOString().slice(0, 10) !== body.renewalDate) throw new Error('Invalid renewal date')
    }

    const owner = await getOwner()
    if (!await prisma.userCard.findFirst({ where: { id, userId: owner.id } })) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    const userCard = await prisma.userCard.update({
      where: { id },
      data: {
        expirationDate: body.expirationMonth === undefined ? undefined : parseCardExpirationDate(body.expirationMonth),
        renewalDate,
        last4: body.last4 === undefined ? undefined : parseLast4(body.last4),
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

export const PATCH = withOwner(handlePATCH)
