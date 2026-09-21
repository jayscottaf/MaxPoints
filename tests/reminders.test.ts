import test from 'node:test'
import assert from 'node:assert/strict'
import { planReminders, preferencesInput, canRetryDelivery } from '../lib/reminder-policy'
import { summarizePerk } from '../lib/accounting'

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

test('unused four-year credits do not become newly available every morning', () => {
  const globalEntry = { id: 'ge', name: 'Global Entry/TSA PreCheck', periodType: 'four-year', maxValue: 120, usage: [] }
  const cards = [{ name: 'Amex Platinum', perks: [globalEntry] }, { name: 'Chase Sapphire Reserve', perks: [{ ...globalEntry, id: 'ge-chase' }] }]
  for (let day = 18; day <= 30; day++) {
    const now = new Date(`2026-09-${day}T13:46:37Z`)
    assert.deepEqual(planReminders(cards, 'America/New_York', {}, now), [])
    const summary = summarizePerk(globalEntry, 2026, 'America/New_York', now)
    assert.equal(summary.availableValue, 120)
    assert.equal(summary.periodStart, '1970-01-01T00:00:00.000Z')
    assert.equal(summary.periodEnd, null)
  }
})

test('four-year renewal is announced only on its real reset date in the owner timezone', () => {
  const globalEntry = { id: 'ge', name: 'Global Entry/TSA PreCheck', periodType: 'four-year', maxValue: 120, usage: [{ amount: 85, date: '2022-09-21T12:00:00Z' }] }
  const cards = [{ name: 'Card', perks: [globalEntry] }]
  assert.deepEqual(planReminders(cards, 'America/New_York', {}, new Date('2026-09-21T02:00:00Z')), [])
  const reset = planReminders(cards, 'America/New_York', {}, new Date('2026-09-21T13:00:00Z'))
  assert.equal(reset.length, 1)
  assert.equal(reset[0].kind, 'available')
  assert.equal(reset[0].remainingValue, 120)
  for (const date of ['2026-09-22', '2026-10-01', '2027-01-01']) {
    const now = new Date(date + 'T13:00:00Z')
    assert.deepEqual(planReminders(cards, 'America/New_York', {}, now), [])
    const summary = summarizePerk(globalEntry, Number(date.slice(0, 4)), 'America/New_York', now)
    assert.equal(summary.availableValue, 120)
    assert.equal(summary.periodStart, '2026-09-21T00:00:00.000Z')
  }
})

test('known initial eligibility gets one availability date and respects preferences', () => {
  const cards = [{ name: 'Card', perks: [{ id: 'ge', name: 'Application credit', periodType: 'four-year', maxValue: 120, startDate: '2026-09-21', usage: [] }] }]
  assert.equal(planReminders(cards, 'America/New_York', {}, new Date('2026-09-21T13:00:00Z')).length, 1)
  assert.equal(planReminders(cards, 'America/New_York', { available: false }, new Date('2026-09-21T13:00:00Z')).length, 0)
  assert.equal(planReminders(cards, 'America/New_York', {}, new Date('2026-09-22T13:00:00Z')).length, 0)
})

test('suppressing unchanged application credits preserves legitimate expiration reminders', () => {
  const cards = [{ name: 'Card', perks: [
    { id: 'ge', name: 'Application credit', periodType: 'four-year', maxValue: 120, usage: [] },
    { ...perk, usage: [] },
  ] }]
  const items = planReminders(cards, 'America/New_York', {}, new Date('2026-09-23T13:00:00Z'))
  assert.equal(items.length, 1)
  assert.equal(items[0].perkId, 'p')
  assert.equal(items[0].kind, 'expiring')
})
test('availability begins on the owner calendar boundary and uncertain sends expire safely', () => {
  const cards = [{ name: 'Card', perks: [{ ...perk, usage: [] }] }]
  assert.equal(planReminders(cards, 'America/New_York', {}, new Date('2026-10-01T13:00:00Z'))[0].kind, 'available')
  assert.equal(planReminders(cards, 'America/New_York', { available: false }, new Date('2026-10-01T13:00:00Z')).length, 0)
  assert.equal(canRetryDelivery(new Date('2026-09-01T00:00:00Z'), new Date('2026-09-02T00:00:00Z')), false)
  assert.equal(preferencesInput.safeParse({ timezone: 'Not/AZone', expiring: true, available: true, reminderDays: null }).success, false)
})
