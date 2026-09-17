import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { loadEnvConfig } from '@next/env'
import { prisma } from '../lib/prisma'
import { createUsage, changeUsage } from '../lib/usage-service'
import { importUsage } from '../lib/import-usage'

test('benefit lifecycle and purchase limits are enforced by the ledger', { skip: process.env.RUN_DB_TESTS !== '1' }, async () => {
  loadEnvConfig(process.cwd())
  const user = await prisma.user.create({ data: { email: `limits-${randomUUID()}@example.invalid` } })
  const card = await prisma.card.create({ data: { name: 'Disposable limits', issuer: 'Test', annualFee: 0, userCards: { create: { userId: user.id } } } })
  const perk = await prisma.perk.create({ data: { cardId: card.id, name: 'Limit test', maxValue: 500, perUseLimit: 250, periodType: 'annual' } })
  const log = (amount: number, date = '2026-08-01') => createUsage(user, { perkId: perk.id, amount, date, idempotencyKey: randomUUID() })
  try {
    await assert.rejects(log(251), /per-purchase/)
    await log(250)
    await log(250)
    await assert.rejects(log(1), /remaining credit/)
    await assert.rejects(importUsage(user, [{ card: card.name, perk: perk.name, amount: 500 }], true), /individual usage/)
    await prisma.usage.deleteMany({ where: { userId: user.id } })
    await prisma.perk.update({ where: { id: perk.id }, data: { periodType: 'per-booking', maxValue: 100, perUseLimit: 100 } })
    await log(100); await log(100)
    await assert.rejects(log(101), /per-purchase/)
    await prisma.perk.update({ where: { id: perk.id }, data: { retired: true } })
    await assert.rejects(log(10), /retired/)
    const old = await prisma.usage.findFirstOrThrow({ where: { userId: user.id } })
    await changeUsage(user, old.id, 'delete'); await changeUsage(user, old.id, 'restore')
    await prisma.usage.deleteMany({ where: { userId: user.id } })
    await prisma.perk.update({ where: { id: perk.id }, data: { retired: false, periodType: 'four-year', maxValue: 120, perUseLimit: null } })
    await log(85, '2024-05-01')
    await assert.rejects(log(35), /four years/)
    await assert.rejects(log(35, '2023-05-01'), /four years/)
    await prisma.usage.deleteMany({ where: { userId: user.id } })
    await prisma.perk.update({ where: { id: perk.id }, data: { periodType: 'anniversary', maxValue: 300 } })
    await assert.rejects(log(10), /Confirm/)
    await prisma.perk.update({ where: { id: perk.id }, data: { startDate: new Date('2025-11-01'), endDate: new Date('2026-10-31') } })
    await log(250, '2025-12-01')
    await assert.rejects(log(51), /remaining credit/)
    await log(50)
    await prisma.perk.update({ where: { id: perk.id }, data: { periodType: 'monthly', startDate: null, endDate: null, maxValue: 120, periodValue: 10, validUntil: new Date('2026-06-30') } })
    await assert.rejects(log(1), /within this perk period/)
  } finally {
    await prisma.usage.deleteMany({ where: { userId: user.id } })
    await prisma.perk.deleteMany({ where: { cardId: card.id } })
    await prisma.userCard.deleteMany({ where: { userId: user.id } })
    await prisma.card.delete({ where: { id: card.id } })
    await prisma.user.delete({ where: { id: user.id } })
    await prisma.$disconnect()
  }
})
