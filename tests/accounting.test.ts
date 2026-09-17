import { test } from 'node:test'
import assert from 'node:assert/strict'
import { periodRange, summarizePerk, sumMoney, validAmount, usageDate } from '../lib/accounting'

test('one-time usage remains counted indefinitely', () => {
  const p = summarizePerk({ periodType: 'one-time', maxValue: 120, usage: [{ amount: 120, date: '2025-04-01T12:00:00Z' }] }, 2026)
  assert.equal(p.currentUsage, 120)
  assert.equal(p.periodEnd, null)
})
test('recurring explicit periods roll forward and include the full last day', () => {
  const range = periodRange({ periodType: 'quarterly', startDate: '2026-01-01', endDate: '2026-03-31' }, 2027)
  assert.equal(range.start.toISOString(), '2027-01-01T00:00:00.000Z')
  assert.equal(range.end.toISOString(), '2027-03-31T23:59:59.999Z')
})
test('one-time explicit validity does not roll forward', () => {
  assert.equal(periodRange({ periodType: 'one-time', startDate: '2026-01-01', endDate: '2026-12-31' }, 2027).end.getUTCFullYear(), 2026)
})
test('money retains cents and rejects invalid precision', () => {
  assert.equal(sumMoney([0.1, 0.2]), 0.3)
  assert.equal(validAmount(1.001), false)
  assert.equal(validAmount(-1), false)
  assert.equal(validAmount(12.95), true)
})
test('deleted and unallocated usage do not consume a current period', () => {
  const p = summarizePerk({ periodType: 'annual', maxValue: 100, usage: [{ amount: 10, date: '2026-01-01', deletedAt: '2026-02-01' }, { amount: 20, date: '2026-01-01', needsReview: true }] }, 2026)
  assert.equal(p.currentUsage, 0)
  assert.equal(p.annualUsage, 20)
  assert.equal(p.needsReview, true)
})
test('usage dates reject impossible and future calendar dates', () => {
  assert.throws(() => usageDate('2026-02-30'))
  assert.throws(() => usageDate('2999-01-01'))
  assert.equal(usageDate('2026-01-02').toISOString(), '2026-01-02T12:00:00.000Z')
})
