import { test } from 'node:test'
import assert from 'node:assert/strict'
import { catalogPerks } from '../prisma/catalog'
import { periodLimit, summarizePerk } from '../lib/accounting'
import { perkInput } from '../lib/perk-input'

test('catalog models monthly limits, December bonus and coverage separately', () => {
  const perks = catalogPerks('amex-platinum')
  const uber = perks.find(p => p.name === 'Uber Cash')!
  assert.equal(uber.periodType, 'monthly')
  assert.equal(periodLimit(uber, new Date('2026-12-01')), 35)
  assert.equal(periodLimit(uber, new Date('2026-09-01')), 15)
  assert.equal(perks.find(p => p.name === 'Hotel Credit (FHR/THC)')!.periodValue, 300)
  const coverage = catalogPerks('amex-hilton-aspire').find(p => p.name === 'Cell Phone Protection')!
  assert.equal(summarizePerk({ ...coverage, usage: [] }).availableValue, 0)
})
test('benefit edits reject invalid dates and fractional cents', () => {
  const input = { id: 'p', maxValue: 300, periodValue: 25, decemberBonus: 0, periodType: 'monthly', valueKind: 'credit', startDate: null, endDate: null, notes: '', enrollmentRequired: false }
  assert.equal(perkInput.safeParse(input).success, true)
  assert.equal(perkInput.safeParse({ ...input, periodValue: 0.001 }).success, false)
  assert.equal(perkInput.safeParse({ ...input, startDate: '2026-02-30' }).success, false)
})
