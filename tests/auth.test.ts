import { test } from 'node:test'
import assert from 'node:assert/strict'
import { digest, isOwnerEmail, matchesCode, newToken, sameOrigin } from '../lib/auth-policy'

test('only the configured owner can request sign-in', () => {
  process.env.OWNER_EMAIL = 'owner@example.com'
  assert.equal(isOwnerEmail(' OWNER@example.com '), true)
  assert.equal(isOwnerEmail('other@example.com'), false)
  delete process.env.OWNER_EMAIL
})
test('code verifier rejects wrong, malformed and differently bound codes', () => {
  const nonce = newToken(), hash = digest(`${nonce}:12345678`)
  assert.ok(matchesCode('12345678', nonce, hash))
  assert.equal(matchesCode('12345679', nonce, hash), false)
  assert.equal(matchesCode('12345678', newToken(), hash), false)
  assert.equal(matchesCode('123', nonce, hash), false)
})
test('state changes require same origin', () => {
  assert.ok(sameOrigin(new Request('https://app.example/api/usage', { headers: { origin: 'https://app.example' } })))
  assert.equal(sameOrigin(new Request('https://app.example/api/usage', { headers: { origin: 'https://evil.example' } })), false)
  assert.equal(sameOrigin(new Request('https://app.example/api/usage')), false)
})
