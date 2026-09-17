import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { loadEnvConfig } from '@next/env'
import { prisma } from '../lib/prisma'
import { createUsage, changeUsage } from '../lib/usage-service'

test('ledger serializes concurrent writes, deduplicates retries and restores safely', { skip: process.env.RUN_DB_TESTS !== '1' }, async () => {
  loadEnvConfig(process.cwd())
  const user = await prisma.user.create({ data: { email: `test-${randomUUID()}@example.invalid` } })
  const card = await prisma.card.create({ data: { name: 'Disposable integration test', issuer: 'Test', annualFee: 0 } })
  const perk = await prisma.perk.create({ data: { cardId: card.id, name: 'Test credit', maxValue: 100, periodType: 'annual' } })
  await prisma.userCard.create({ data: { userId: user.id, cardId: card.id } })
  try {
    const a = { perkId: perk.id, amount: 70, idempotencyKey: randomUUID() }
    const b = { ...a, idempotencyKey: randomUUID() }
    const results = await Promise.allSettled([createUsage(user, a), createUsage(user, b)])
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1)
    const successful = results[0].status === 'fulfilled' ? a : b
    const entry = await createUsage(user, successful)
    assert.equal(await prisma.usage.count({ where: { userId: user.id } }), 1)
    await changeUsage(user, entry.id, 'delete')
    assert.ok((await prisma.usage.findUniqueOrThrow({ where: { id: entry.id } })).deletedAt)
    await changeUsage(user, entry.id, 'restore')
    await changeUsage(user, entry.id, 'restore')
    assert.equal((await prisma.usage.findUniqueOrThrow({ where: { id: entry.id } })).deletedAt, null)
    await assert.rejects(createUsage(user, { ...a, amount: 31, idempotencyKey: randomUUID() }))
    await assert.rejects(changeUsage({ ...user, id: 'not-owner' }, entry.id, 'delete'))
  } finally {
    await prisma.$transaction([
      prisma.usage.deleteMany({ where: { userId: user.id } }),
      prisma.userCard.deleteMany({ where: { userId: user.id } }),
      prisma.perk.delete({ where: { id: perk.id } }),
      prisma.card.delete({ where: { id: card.id } }),
      prisma.user.delete({ where: { id: user.id } }),
    ])
    await prisma.$disconnect()
  }
})
