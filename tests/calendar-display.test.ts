import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizePerk } from '../lib/accounting'
import { getPerkStatus } from '../lib/utils'
test('display countdown and status use the owner calendar, not browser timezone', () => {
  const now = new Date('2026-10-01T02:00:00Z')
  const value = summarizePerk({ maxValue: 120, periodValue: 10, periodType: 'monthly', usage: [] }, 2026, 'America/New_York', now)
  assert.equal(value.today, '2026-09-30'); assert.equal(value.daysRemaining, 0)
  assert.equal(getPerkStatus(value, 0), 'expiring')
  const utc = summarizePerk({ maxValue: 120, periodValue: 10, periodType: 'monthly', usage: [] }, 2026, 'UTC', now)
  assert.equal(utc.today, '2026-10-01'); assert.equal(utc.daysRemaining, 30)
})
