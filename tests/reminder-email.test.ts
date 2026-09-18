import test from 'node:test'
import assert from 'node:assert/strict'
import { renderReminderEmail, type ReminderEmailItem } from '../lib/reminder-email'
import { planReminders } from '../lib/reminder-policy'

const item: ReminderEmailItem = { cardName: 'Amex Hilton Aspire', perkName: 'Flight Credit Q3', remainingValue: 30.25, maxValue: 50, currentUsage: 19.75, daysRemaining: 1, periodEnd: '2026-09-30T23:59:59.999Z', tip: 'Eligible airfare only.', sourceUrl: 'https://example.com/terms', kind: 'expiring' }
test('rich reminders include balances, partial use, deadlines, tips and a plain-text equivalent', () => {
  const result = renderReminderEmail([item], 'https://mxpoints.vercel.app')
  for (const value of ['$30.25', '$50', '$19.75', 'Sep 30, 2026', '1 day left', 'Flight Credit Q3', 'Eligible airfare only.']) {
    assert.ok(result.html.includes(value), value)
    assert.ok(result.text.includes(value), value)
  }
  assert.match(result.html, /name="viewport"/)
  assert.match(result.html, /role="presentation"/)
  assert.match(result.html, /Open MaxPoints/)
  assert.match(result.subject, /\$30.25.*ending soon/)
  assert.match(result.preview, /1 benefit\./)
  assert.match(result.html, /https:\/\/example.com\/terms/)
})
test('expiry and availability sections are distinct, ordered and handle same-day deadlines', () => {
  const result = renderReminderEmail([{ ...item, kind: 'available', perkName: 'New monthly credit', daysRemaining: null, periodEnd: null }, item, { ...item, perkName: 'Urgent credit', daysRemaining: 0 }], 'https://mxpoints.vercel.app')
  assert.ok(result.html.indexOf('Ending soon</h2>') < result.html.indexOf('Newly available</h2>'))
  assert.ok(result.html.indexOf('Urgent credit</h3>') < result.html.indexOf('Flight Credit Q3</h3>'))
  assert.match(result.text, /Ends today/)
  assert.match(result.text, /No fixed expiry/)
  assert.doesNotMatch(result.html, /null days|0 days left/)
  const available = renderReminderEmail([{ ...item, kind: 'available' }], 'https://mxpoints.vercel.app')
  assert.match(available.subject, /newly available/)
  assert.doesNotMatch(available.html, /Ending soon<\/h2>/)
})
test('reminders escape dynamic text and reject unsafe links', () => {
  const result = renderReminderEmail([{ ...item, perkName: '<img src=x onerror="alert(1)">', cardName: 'Card & Co', tip: '<script>bad()</script>', sourceUrl: 'javascript:alert(1)' }], 'javascript:alert(1)')
  assert.doesNotMatch(result.html, /<script>|<img|href="javascript:/)
  assert.match(result.html, /&lt;img/)
  assert.match(result.html, /Card &amp; Co/)
  assert.match(result.html, /href="https:\/\/mxpoints.vercel.app\/"/)
  assert.doesNotMatch(result.text, /Terms:/)
})
test('planner supplies current terms and period limits to the renderer, not stale tips or annual caps', () => {
  const cards = [{ id: 'amex-platinum', name: 'Amex Platinum', perks: [{ id: 'p', name: 'Walmart+ Membership', periodType: 'monthly', maxValue: 155.4, periodValue: 12.95, usage: [], description: 'Current monthly plan terms.', sourceUrl: 'https://example.com/current' }] }]
  const planned = planReminders(cards, 'America/New_York', { reminderDays: [12] }, new Date('2026-09-18T12:00:00Z'))
  assert.equal(planned[0].maxValue, 12.95)
  assert.equal(planned[0].tip, 'Current monthly plan terms.')
  const result = renderReminderEmail(planned, 'https://mxpoints.vercel.app')
  assert.match(result.html, /of \$12.95 this period/)
  assert.doesNotMatch(result.html, /155.40/)
})
