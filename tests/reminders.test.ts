import test from 'node:test'
import assert from 'node:assert/strict'
import { planReminders, preferencesInput, canRetryDelivery } from '../lib/reminder-policy'

const perk = { id: 'p', name: 'Monthly credit', maxValue: 300, periodValue: 25, periodType: 'monthly', usage: [{ amount: 10, date: '2026-09-01T12:00:00Z' }] }
test('reminders respect owner calendar, preferences, partial usage and review flags', () => {
  const cards = [{ name: 'Card', perks: [perk] }]
  const now = new Date('2026-09-24T02:00:00Z') // Still September 23 in New York.
  const items = planReminders(cards, 'America/New_York', {}, now)
  assert.equal(items.length, 1); assert.equal(items[0].daysRemaining, 7); assert.equal(items[0].remainingValue, 15)
  assert.equal(planReminders(cards, 'UTC', {}, now).length, 0)
  assert.equal(planReminders(cards, 'America/New_York', { expiring: false }, now).length, 0)
  assert.equal(planReminders(cards, 'America/New_York', { reminderDays: [6] }, now).length, 0)
  for (const valueKind of ['coverage', 'estimate']) assert.equal(planReminders([{ name: 'Card', perks: [{ ...perk, valueKind }] }], 'America/New_York', {}, now).length, 0)
  assert.equal(planReminders([{ name: 'Card', perks: [{ ...perk, usage: [{ amount: 10, date: '2026-09-01', needsReview: true }] }] }], 'America/New_York', {}, now).length, 0)
})
test('availability begins on the owner calendar boundary and uncertain sends expire safely', () => {
  const cards = [{ name: 'Card', perks: [{ ...perk, usage: [] }] }]
  assert.equal(planReminders(cards, 'America/New_York', {}, new Date('2026-10-01T13:00:00Z'))[0].kind, 'available')
  assert.equal(planReminders(cards, 'America/New_York', { available: false }, new Date('2026-10-01T13:00:00Z')).length, 0)
  assert.equal(canRetryDelivery(new Date('2026-09-01T00:00:00Z'), new Date('2026-09-02T00:00:00Z')), false)
  assert.equal(preferencesInput.safeParse({ timezone: 'Not/AZone', expiring: true, available: true, reminderDays: null }).success, false)
})
