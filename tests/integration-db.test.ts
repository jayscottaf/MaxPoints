import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { loadEnvConfig } from '@next/env'
import { NextRequest } from 'next/server'
loadEnvConfig(process.cwd())
test('OpenClaw ingestion queues once without writing the usage ledger', { skip: process.env.RUN_DB_TESTS !== '1' }, async () => {
  const { prisma } = await import('../lib/prisma')
  const { POST } = await import('../app/api/integrations/openclaw/route')
  const owner = await prisma.user.create({ data: { email: `ingest-${randomUUID()}@example.invalid` } })
  const saved = { OWNER_USER_ID: process.env.OWNER_USER_ID, OWNER_EMAIL: process.env.OWNER_EMAIL, OPENCLAW_INGEST_SECRET: process.env.OPENCLAW_INGEST_SECRET }
  process.env.OWNER_USER_ID = owner.id; process.env.OWNER_EMAIL = owner.email; process.env.OPENCLAW_INGEST_SECRET = 'a'.repeat(64)
  const body = { kind: 'usage', title: 'Usage', message: 'Used $50 Saks', eventId: randomUUID() }
  const request = (authorization: string, data: unknown = body) => new NextRequest('https://example.invalid/api/integrations/openclaw', { method: 'POST', headers: { authorization, 'content-type': 'application/json' }, body: JSON.stringify(data) })
  try {
    assert.equal((await POST(request('Bearer invalid'))).status, 401)
    assert.equal((await POST(request(`Bearer ${process.env.OPENCLAW_INGEST_SECRET}`, { ...body, amount: 50 }))).status, 400)
    const responses = await Promise.all([POST(request(`Bearer ${process.env.OPENCLAW_INGEST_SECRET}`)), POST(request(`Bearer ${process.env.OPENCLAW_INGEST_SECRET}`))])
    assert.deepEqual(responses.map(value => value.status).sort(), [200, 202])
    assert.equal(await prisma.notification.count({ where: { userId: owner.id } }), 1)
    assert.equal(await prisma.usage.count({ where: { userId: owner.id } }), 0)
  } finally {
    for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value }
    await prisma.notification.deleteMany({ where: { userId: owner.id } }); await prisma.user.delete({ where: { id: owner.id } }); await prisma.$disconnect()
  }
})
