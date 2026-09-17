import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NextRequest } from 'next/server'
import type { LoginChallenge, Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { POST } from '../app/api/auth/route'
import { digest, matchesCode } from '../lib/auth-policy'

test('email code flow enforces cooldown, browser binding, attempt limit and single use', async () => {
  const original = { transaction: prisma.$transaction, user: prisma.user.findUniqueOrThrow, fetch: global.fetch }
  const env = { ...process.env }
  process.env.OWNER_EMAIL = 'owner@example.com'
  process.env.RESEND_API_KEY = 're_test_only'
  process.env.PERK_ALERT_FROM = 'test@example.com'
  let challenge: LoginChallenge | null = null
  let code = ''
  let sessions = 0
  const tx = {
    $executeRaw: async () => 1,
    loginChallenge: {
      findUnique: async () => challenge,
      upsert: async ({ create }: { create: LoginChallenge }) => { challenge = { ...create }; return challenge },
      update: async ({ data }: { data: { attempts?: { increment: number }; expiresAt?: Date; codeHash?: string } }) => {
        if (!challenge) throw new Error('No challenge')
        if (data.attempts) challenge.attempts += data.attempts.increment
        if (data.expiresAt) challenge.expiresAt = data.expiresAt
        if (data.codeHash !== undefined) challenge.codeHash = data.codeHash
      },
    },
    session: { deleteMany: async () => ({}), create: async () => { sessions++; return {} } },
  }
  prisma.$transaction = (async (fn: (client: Prisma.TransactionClient) => Promise<unknown>) => fn(tx as unknown as Prisma.TransactionClient)) as typeof prisma.$transaction
  prisma.user.findUniqueOrThrow = (async () => ({ id: 'owner' })) as unknown as typeof prisma.user.findUniqueOrThrow
  global.fetch = async (_url, options) => {
    const email = JSON.parse(String(options?.body)) as { text: string }
    code = email.text.match(/\b\d{8}\b/)![0]
    return Response.json({ id: 'test-email' })
  }
  const request = (body: object, cookie = '') => new NextRequest('https://app.example/api/auth', {
    method: 'POST', headers: { origin: 'https://app.example', 'content-type': 'application/json', cookie }, body: JSON.stringify(body),
  })
  try {
    assert.equal((await POST(request({ email: 'stranger@example.com' }))).status, 403)
    const sent = await POST(request({ email: 'owner@example.com' }))
    assert.equal(sent.status, 200)
    const cookie = sent.headers.get('set-cookie')!.split(';')[0]
    assert.ok(sent.headers.get('set-cookie')!.includes('HttpOnly'))
    const stored = challenge as LoginChallenge | null
    assert.ok(stored)
    assert.ok(matchesCode(code, stored.nonce, stored.codeHash))
    assert.notEqual(stored.codeHash, code)
    assert.notEqual(stored.codeHash, digest(code))
    assert.equal((await POST(request({ email: 'owner@example.com' }))).status, 429)
    assert.equal((await POST(request({ email: 'owner@example.com', code }))).status, 401)
    assert.equal((await POST(request({ email: 'owner@example.com', code: '00000000' }, cookie))).status, 401)
    const verified = await POST(request({ email: 'owner@example.com', code }, cookie))
    assert.equal(verified.status, 200)
    assert.equal(sessions, 1)
    assert.ok(verified.headers.get('set-cookie')!.includes('maxpoints_session='))
    assert.equal((await POST(request({ email: 'owner@example.com', code }, cookie))).status, 401)
    stored.expiresAt = new Date(Date.now() + 10000)
    stored.attempts = 5
    assert.equal((await POST(request({ email: 'owner@example.com', code }, cookie))).status, 401)
    assert.equal(sessions, 1)
  } finally {
    prisma.$transaction = original.transaction
    prisma.user.findUniqueOrThrow = original.user
    global.fetch = original.fetch
    for (const key of ['OWNER_EMAIL', 'RESEND_API_KEY', 'PERK_ALERT_FROM']) {
      if (env[key] === undefined) delete process.env[key]
      else process.env[key] = env[key]
    }
  }
})
