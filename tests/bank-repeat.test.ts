import test from 'node:test'
import assert from 'node:assert/strict'
import { safeRepeatDate, normalizedCredit, repeatBenefit } from '../lib/bank-repeat'

test('repeat policy requires exact approved monthly benefit and unambiguous future current-month posting', () => {
  const enabled = new Date('2026-09-20T12:00:00Z')
  assert.equal(safeRepeatDate('2026-10-11', '2026-09-10', enabled, '2026-10-23'), true)
  for (const date of ['2026-10-01', '2026-10-03', '2026-10-26', '2026-10-31', '2026-10-20', '2026-11-10', '2026-09-10']) assert.equal(safeRepeatDate(date, '2026-09-10', enabled, '2026-10-23'), false)
  assert.equal(safeRepeatDate('2026-10-11', '2026-09-10', new Date('2026-10-12'), '2026-10-23'), false)
  assert.equal(normalizedCredit(' PLATINUM   Digital Credit '), 'platinum digital credit')
  const benefit = { cardId: 'amex-platinum', name: 'Digital Entertainment Credit', periodType: 'monthly', valueKind: 'credit', retired: false, requiresConfirmation: false }
  assert.equal(repeatBenefit(benefit), true)
  assert.equal(repeatBenefit({ ...benefit, cardId: 'chase-reserve' }), false)
  assert.equal(repeatBenefit({ ...benefit, name: 'Entertainment Credit', periodType: 'semi-annual' }), false)
})
