import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../lib/prisma'
import { sessionUser, withOwner } from '../lib/auth'
import { newToken, SESSION_COOKIE } from '../lib/auth-policy'

test('private routes reject anonymous, expired, wrong-owner and cross-site requests', async () => {
  const originalSession = prisma.session.findUnique
  const originalUser = prisma.user.findUnique
  const oldEmail = process.env.OWNER_EMAIL
  process.env.OWNER_EMAIL = 'owner@example.com'
  let expired = false
  let email = 'owner@example.com'
  prisma.session.findUnique = (async () => ({ userId: 'owner', expiresAt: new Date(Date.now() + (expired ? -1000 : 100000)) })) as typeof prisma.session.findUnique
  prisma.user.findUnique = (async () => ({ id: 'owner', email })) as typeof prisma.user.findUnique
  const route = withOwner(async () => NextResponse.json({ ok: true }))
  const token = newToken()
  const request = (method: string, origin?: string) => new NextRequest('https://example.com/api/usage', {
    method, headers: { cookie: `${SESSION_COOKIE}=${token}`, ...(origin ? { origin } : {}) },
  })
  try {
    assert.equal(await sessionUser('malformed'), null)
    assert.equal((await route(new NextRequest('https://example.com/api/usage'))).status, 401)
    assert.equal((await route(request('GET'))).status, 200)
    assert.equal((await route(request('POST', 'https://attacker.example'))).status, 403)
    assert.equal((await route(request('POST'))).status, 403)
    assert.equal((await route(request('POST', 'https://example.com'))).status, 200)
    expired = true
    assert.equal((await route(request('GET'))).status, 401)
    expired = false
    email = 'someone-else@example.com'
    assert.equal((await route(request('GET'))).status, 401)
  } finally {
    prisma.session.findUnique = originalSession
    prisma.user.findUnique = originalUser
    if (oldEmail === undefined) delete process.env.OWNER_EMAIL
    else process.env.OWNER_EMAIL = oldEmail
  }
})
