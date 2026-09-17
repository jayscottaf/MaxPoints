import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizePerk } from '../lib/accounting'
import { catalogPerks } from '../prisma/catalog'
import { verifiedTerms } from '../lib/verified-benefits'
const now = new Date('2026-09-17T12:00:00Z')
const summary = (overrides: Record<string, unknown> = {}, year = 2026) => summarizePerk({ maxValue: 100, periodType: 'annual', usage: [], ...overrides }, year, 'UTC', now)

test('ended benefits never roll into another year; retired history remains', () => {
  const saks = { ...verifiedTerms('amex-platinum', 'Saks Fifth Avenue Credit H1'), maxValue: 50, startDate: '2026-01-01', endDate: '2026-06-30', usage: [{ amount: 50, date: '2026-05-01' }] }
  assert.equal(summary(saks).availableValue, 0)
  assert.equal(summary(saks).annualUsage, 50)
  assert.equal(summary(saks, 2027).annualValue, 0)
  assert.equal(summary({ retired: true }).availableValue, 0)
  assert.equal(summary({ retired: true }).annualValue, 0)
})
test('anniversary periods require dates and retain cross-year capacity', () => {
  assert.equal(summary({ periodType: 'anniversary' }).needsConfirmation, true)
  assert.equal(summary({ periodType: 'anniversary' }).availableValue, 0)
  const perk = summary({ periodType: 'anniversary', maxValue: 300, startDate: '2025-11-01', endDate: '2026-10-31', usage: [{ amount: 200, date: '2025-12-01' }] })
  assert.equal(perk.availableValue, 100)
  assert.equal(perk.periodStart.slice(0, 10), '2025-11-01')
})
test('per-booking benefits have no invented annual allowance', () => {
  const perk = summary({ periodType: 'per-booking', perUseLimit: 100, usage: [{ amount: 100, date: '2026-08-01' }] })
  assert.equal(perk.annualValue, 0)
  assert.equal(perk.availableValue, 0)
  assert.equal(perk.claimableValue, 100)
  assert.equal(perk.annualUsage, 100)
  assert.equal(perk.periodEnd, null)
})
test('application credit has no leftover balance after a lower-cost claim', () => {
  const perk = summary({ periodType: 'four-year', maxValue: 120, usage: [{ amount: 85, date: '2024-09-01' }] })
  assert.equal(perk.availableValue, 0)
  assert.equal(perk.annualValue, 0)
  assert.equal(perk.periodEnd?.slice(0, 10), '2028-08-31')
  assert.equal(summary({ periodType: 'four-year', maxValue: 120, usage: [{ amount: 85, date: '2022-09-17' }] }).availableValue, 120)
})
test('catalog includes correct Aspire value and separate capped monthly promos', () => {
  const aspire = catalogPerks('amex-hilton-aspire')
  assert.equal(aspire.find(p => p.name === 'CLEAR Plus Credit')?.maxValue, 209)
  assert.equal(aspire.some(p => p.name === 'Hilton Dining Credit'), false)
  const chase = catalogPerks('chase-reserve')
  assert.equal(chase.find(p => p.name === 'Lyft Credit')?.periodValue, 10)
  assert.equal(chase.find(p => p.name === 'Peloton Credit')?.periodValue, 10)
  assert.equal(chase.find(p => p.name === 'The Edit Hotel Credit')?.perUseLimit, 250)
  assert.equal(chase.find(p => p.name === 'Apple Music')?.maxValue, 143.88)
  const promos = chase.filter(p => p.name.startsWith('DoorDash ') && p.periodType === 'monthly')
  assert.equal(promos.reduce((sum, p) => sum + summary(p).availableValue, 0), 25)
  assert.equal(promos.reduce((sum, p) => sum + summarizePerk({ ...p, usage: [] }, 2026, 'UTC', new Date('2026-10-01T12:00:00Z')).availableValue, 0), 35)
  assert.equal(promos.reduce((sum, p) => sum + summary(p).annualValue, 0), 330)
  assert.equal(summary(chase.find(p => p.name === 'DoorDash Any-Order Promo')).available, false)
  assert.equal(summary({ requiresConfirmation: true }).availableValue, 0)
  assert.equal(summary({ valueKind: 'information' }).annualValue, 0)
  assert.equal(summary({ maxValue: 120, periodValue: 10, periodType: 'monthly', validUntil: '2027-09-30' }, 2027).annualValue, 90)
})
