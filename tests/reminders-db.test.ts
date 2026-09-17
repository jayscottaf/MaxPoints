import test from 'node:test'
import assert from 'node:assert/strict'
import { loadEnvConfig } from '@next/env'
import { randomUUID } from 'node:crypto'
loadEnvConfig(process.cwd())
test('delivery retries freeze payload and concurrent runs create one notification', { skip: process.env.RUN_DB_TESTS !== '1' }, async () => {
  const { prisma } = await import('../lib/prisma')
  const { deliverOnce } = await import('../lib/reminders')
  const owner = await prisma.user.create({ data: { email: `reminder-${randomUUID()}@example.invalid` } })
  const key = `test:${randomUUID()}`
  const payload = { from: 'test@example.invalid', to: owner.email, subject: 'Fixture', text: 'Original' }
  const accepted = new Map<string, string>()
  try {
    await assert.rejects(deliverOnce(key, owner.id, payload, async () => { throw new Error('Network') }))
    const send = async (data: typeof payload, token: string) => { assert.equal(data.text, 'Original'); accepted.set(token, data.text) }
    await Promise.all([deliverOnce(key, owner.id, { ...payload, text: 'Changed' }, send), deliverOnce(key, owner.id, payload, send)])
    assert.equal(accepted.size, 1)
    assert.equal(await prisma.notification.count({ where: { userId: owner.id } }), 1)
    assert.equal((await prisma.notification.findFirstOrThrow({ where: { userId: owner.id } })).message, 'Original')
    assert.equal((await deliverOnce(key, owner.id, payload, send)).status, 'already-sent')
  } finally {
    await prisma.notification.deleteMany({ where: { userId: owner.id } }); await prisma.emailDelivery.deleteMany({ where: { userId: owner.id } }); await prisma.user.delete({ where: { id: owner.id } }); await prisma.$disconnect()
  }
})
