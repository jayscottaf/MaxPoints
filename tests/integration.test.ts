import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { integrationAuthorized, suggestionInput, suggestionId } from '../lib/integration-policy'
const require = createRequire(import.meta.url)
test('machine key is scoped and suggestion input cannot mutate benefits', () => {
  const secret = 'a'.repeat(64)
  assert.equal(integrationAuthorized(`Bearer ${secret}`, secret), true)
  assert.equal(integrationAuthorized('Bearer wrong', secret), false)
  assert.equal(integrationAuthorized('Bearer short', 'short'), false)
  assert.equal(suggestionInput.safeParse({ kind: 'usage', title: 'Usage', message: '$50', eventId: '123', userId: 'another-user' }).success, false)
  assert.equal(suggestionInput.safeParse({ kind: 'deal', title: 'Deal', message: 'Details', eventId: '123', sourceUrl: 'javascript:alert(1)' }).success, false)
  assert.equal(suggestionId('owner', '123'), suggestionId('owner', '123'))
  assert.notEqual(suggestionId('owner', '123'), suggestionId('other', '123'))
})
test('OpenClaw refuses plaintext endpoints and usage without a stable event ID', async () => {
  const client = require('../openclaw-skills/client.js')
  const before = process.env.MAXPOINTS_API_URL
  process.env.MAXPOINTS_API_URL = 'http://example.invalid/api'
  try { assert.throws(() => client.endpoint(), /HTTPS/) } finally { if (before === undefined) delete process.env.MAXPOINTS_API_URL; else process.env.MAXPOINTS_API_URL = before }
  const skill = require('../openclaw-skills/usage-logger/skill.js')
  assert.equal((await skill.handle({}, 'used $50 Saks')).success, false)
})
