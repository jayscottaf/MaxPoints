import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cardsSchema, upcomingPerks, type PerkDetail } from '../lib/dashboard'
import { getPercentageUsed, getPerkStatus, formatCurrency } from '../lib/utils'

test('dashboard rejects error payloads and malformed nested data', () => {
  assert.equal(cardsSchema.safeParse({ error: 'Unavailable' }).success, false)
  assert.equal(cardsSchema.safeParse([{ id: 'x', perks: {} }]).success, false)
  assert.equal(cardsSchema.safeParse([]).success, true)
})
test('partially used credits stay on the due list; expired ones do not', () => {
  const perk: PerkDetail = { id: 'p', cardId: 'c', card: { id: 'c', name: 'Card', issuer: 'Issuer' }, name: 'Credit', periodType: 'annual', maxValue: 100, annualValue: 100, currentUsage: 20, annualUsage: 20, periodStart: '2026-01-01', periodEnd: '2099-12-31', available: true, availableValue: 80, needsReview: false, valueKind: 'credit', enrollmentRequired: false }
  assert.equal(upcomingPerks([perk]).length, 1)
  assert.equal(upcomingPerks([{ ...perk, availableValue: 0 }]).length, 0)
  assert.equal(upcomingPerks([{ ...perk, periodEnd: '2020-01-01' }]).length, 0)
})
test('rounding does not mark partially used credits completed', () => {
  assert.equal(getPercentageUsed(99.6, 100), 99)
  assert.equal(getPerkStatus({ maxValue: 100 }, 99.6), 'in-progress')
  assert.equal(formatCurrency(12.95), '$12.95')
})
