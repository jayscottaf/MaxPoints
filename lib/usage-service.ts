import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { cents, sumMoney, periodLimit, periodRange, usageDate, validAmount } from './accounting'

export class UsageError extends Error {
  constructor(message: string, public status: number = 400) { super(message) }
}

async function lock(tx: Prisma.TransactionClient, userId: string, perkId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId + ':' + perkId}, 0))`
}

async function validateCapacity(tx: Prisma.TransactionClient, userId: string, perkId: string, amount: number, date: Date, timezone: string, excludeId?: string) {
  const perk = await tx.perk.findFirst({ where: { id: perkId, card: { userCards: { some: { userId, isActive: true } } } } })
  if (!perk) throw new UsageError('Perk not found.', 404)
  // Ledger dates are date-only values normalized to UTC noon, already validated in the owner's timezone.
  const range = periodRange(perk, date.getUTCFullYear(), date, 'UTC')
  void timezone
  if (date < range.start || date > range.end) throw new UsageError('Usage date must fall within this perk period.')
  const rows = await tx.usage.findMany({ where: { userId, perkId, deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}) } })
  const used = sumMoney(rows.filter(u => !u.needsReview && u.date >= range.start && u.date <= range.end).map(u => u.amount))
  const annualUsed = sumMoney(rows.filter(u => u.date.getUTCFullYear() === date.getUTCFullYear()).map(u => u.amount))
  if (cents(used) + cents(amount) > cents(periodLimit(perk, date)) || (perk.periodType !== 'one-time' && cents(annualUsed) + cents(amount) > cents(perk.maxValue))) throw new UsageError('Usage would exceed the remaining credit.')
}

export async function createUsage(user: { id: string; timezone: string }, input: { perkId: string; amount: number; date?: string; notes?: string; idempotencyKey: string }) {
  if (!validAmount(input.amount)) throw new UsageError('Amount must be positive with at most two decimal places.')
  const date = usageDate(input.date, user.timezone)
  return prisma.$transaction(async tx => {
    await lock(tx, user.id, input.perkId)
    const existing = await tx.usage.findUnique({ where: { userId_idempotencyKey: { userId: user.id, idempotencyKey: input.idempotencyKey } } })
    if (existing) {
      if (existing.perkId !== input.perkId || cents(existing.amount) !== cents(input.amount) || existing.date.getTime() !== date.getTime() || (existing.notes ?? '') !== (input.notes ?? '')) throw new UsageError('This request key has already been used.', 409)
      return existing
    }
    await validateCapacity(tx, user.id, input.perkId, input.amount, date, user.timezone)
    return tx.usage.create({ data: { ...input, userId: user.id, date } })
  }, { timeout: 15000 })
}

export async function changeUsage(user: { id: string; timezone: string }, id: string, action: 'delete' | 'restore') {
  return prisma.$transaction(async tx => {
    const entry = await tx.usage.findFirst({ where: { id, userId: user.id } })
    if (!entry) throw new UsageError('Usage not found.', 404)
    await lock(tx, user.id, entry.perkId)
    const current = await tx.usage.findUniqueOrThrow({ where: { id: entry.id } })
    if (action === 'restore') await validateCapacity(tx, user.id, current.perkId, current.amount, current.date, user.timezone, current.id)
    return tx.usage.update({ where: { id }, data: { deletedAt: action === 'delete' ? new Date() : null } })
  }, { timeout: 15000 })
}

export async function editUsage(user: { id: string; timezone: string }, input: { id: string; date: string; amount: number; notes?: string }) {
  if (!validAmount(input.amount)) throw new UsageError('Enter a positive amount with at most two decimal places.')
  const date = usageDate(input.date, user.timezone)
  return prisma.$transaction(async tx => {
    const entry = await tx.usage.findFirst({ where: { id: input.id, userId: user.id, deletedAt: null } })
    if (!entry) throw new UsageError('Usage not found.', 404)
    await lock(tx, user.id, entry.perkId)
    if (!await tx.usage.findFirst({ where: { id: entry.id, deletedAt: null } })) throw new UsageError('This usage was removed. Restore it before editing.', 409)
    await validateCapacity(tx, user.id, entry.perkId, input.amount, date, user.timezone, entry.id)
    return tx.usage.update({ where: { id: entry.id }, data: { amount: input.amount, date, notes: input.notes, needsReview: false } })
  })
}
