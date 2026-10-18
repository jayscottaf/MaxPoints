import test from 'node:test'
import assert from 'node:assert/strict'
import { getRemainderOptions, remainderContext, REMAINDER_REVIEW_BY, type RemainderInput } from '../lib/remainder-options'
import { planReminders, notificationPreferences, preferencesInput } from '../lib/reminder-policy'
import { renderReminderEmail, type ReminderEmailItem } from '../lib/reminder-email'

const base: RemainderInput = { cardId: 'amex-platinum', name: 'Digital Entertainment Credit', currentUsage: 18.99, remainingValue: 6.01, periodEnd: '2026-10-31T23:59:59.999Z', today: '2026-10-18', available: true, valueKind: 'credit', periodType: 'monthly' }
test('remainder options use the exact active balance and direct-provider rules without invented prices', () => {
  const plan = getRemainderOptions(base)!
  assert.equal(plan.remainingValue, 6.01)
  assert.equal(plan.periodEnd, base.periodEnd)
  assert.match(plan.rule, /one shared monthly allowance/i)
  assert.match(plan.rule, /pay the provider directly/i)
  assert.match(plan.rule, /Audible is not eligible/)
  assert.ok(plan.options.some(option => option.title === 'The New York Times'))
  for (const option of plan.options) { assert.equal(new URL(option.url).protocol, 'https:'); assert.doesNotMatch(option.description, /\$|free|guaranteed/i) }
})
test('no purchase ideas for unused, exhausted, expired, stale, uncertain or non-cash benefits', () => {
  const invalid: Partial<RemainderInput>[] = [
    { currentUsage: 0 }, { currentUsage: -1 }, { remainingValue: 0 }, { remainingValue: NaN }, { available: false },
    { periodEnd: '2026-09-30' }, { periodEnd: 'bad' }, { periodEnd: null }, { today: 'invalid' },
    { today: '2027-01-17', periodEnd: '2027-01-31' }, { retired: true }, { needsReview: true },
    { needsConfirmation: true }, { requiresConfirmation: true }, { valueKind: 'information' },
    { valueKind: 'coverage' }, { valueKind: 'estimate' }, { periodType: 'four-year' }, { periodType: 'per-booking' },
    { cardId: 'unknown' }, { name: 'Custom entertainment credit' },
  ]
  for (const change of invalid) assert.equal(getRemainderOptions({ ...base, ...change }), null, JSON.stringify(change))
  assert.ok(getRemainderOptions({ ...base, today: '2026-10-31' }))
  assert.ok(getRemainderOptions({ ...base, today: REMAINDER_REVIEW_BY, periodEnd: '2027-01-31' }))
})
test('Walmart+ overlap suppresses separate Paramount+ and Peacock purchases', () => {
  const context = remainderContext([{ name: 'Walmart+ Membership', currentUsage: 13.86 }])
  const plan = getRemainderOptions(base, context)!
  assert.deepEqual(plan.options.map(o => o.title), ['The New York Times', 'The Wall Street Journal', 'YouTube Premium'])
  assert.match(plan.overlap!.text, /choice of Paramount\+ Essential or Peacock Premium/)
  assert.match(plan.overlap!.text, /Walmart-billed upgrades/)
  assert.equal(remainderContext([{ name: 'Walmart+ Membership', currentUsage: 0, annualUsage: 0 }]).hasWalmartPlus, false)
})
test('dining, shopping and restricted credits keep issuer-specific merchant rules', () => {
  const dining = getRemainderOptions({ ...base, cardId: 'chase-reserve', name: 'Dining Credit H2', remainingValue: 52.38 })!
  assert.match(dining.rule, /another participating Sapphire Reserve Exclusive Tables restaurant/)
  const lulu = getRemainderOptions({ ...base, name: 'Lululemon Credit Q4' })!
  assert.match(lulu.rule, /Gift cards, outlets and Like New purchases are excluded/)
  assert.match(getRemainderOptions({ ...base, name: 'Resy Dining Credit Q4' })!.rule, /qualifying U.S. Resy/)
  assert.match(getRemainderOptions({ ...base, name: 'Airline Incidental Fee Credit' })!.rule, /selected airline/)
  assert.match(getRemainderOptions({ ...base, name: 'Uber One Membership' })!.rule, /Do not start a second membership/)
})
function reminderCards() {
  return [{ id: 'amex-platinum', name: 'Amex Platinum', perks: [
    { id: 'ent', name: base.name, maxValue: 300, periodValue: 25, periodType: 'monthly', valueKind: 'credit', usage: [{ amount: 18.99, date: '2026-10-10T12:00:00Z' }] },
    { id: 'wm', name: 'Walmart+ Membership', maxValue: 155.4, periodValue: 12.95, periodType: 'monthly', valueKind: 'membership', usage: [{ amount: 13.86, date: '2026-10-07T12:00:00Z' }] },
  ] }]
}
test('reminder planner shares eligibility and wallet overlap, and honors optional preference', () => {
  const now = new Date('2026-10-18T16:00:00Z')
  const items = planReminders(reminderCards(), 'America/New_York', { reminderDays: [13] }, now)
  assert.equal(items.length, 1)
  assert.deepEqual(items[0].remainderOptions, getRemainderOptions(base, { hasWalmartPlus: true }))
  const disabled = planReminders(reminderCards(), 'America/New_York', { reminderDays: [13], purchaseIdeas: false }, now)
  assert.equal(disabled.length, 1)
  assert.equal(disabled[0].remainderOptions, null)
  assert.equal(notificationPreferences({}).purchaseIdeas, true)
  assert.equal(notificationPreferences({ purchaseIdeas: false }).purchaseIdeas, false)
  assert.ok(preferencesInput.safeParse({ timezone: 'UTC', expiring: true, available: true, reminderDays: null, purchaseIdeas: false }).success)
})
test('HTML and plain-text emails contain optional ideas, exact balance, links and safety notes', () => {
  const items = planReminders(reminderCards(), 'America/New_York', { reminderDays: [13] }, new Date('2026-10-18T16:00:00Z'))
  const email = renderReminderEmail(items, 'https://mxpoints.vercel.app')
  for (const text of ['Use the remainder', '$6.01', 'The New York Times', 'Walmart+', 'Oct 31, 2026', 'out of pocket']) { assert.ok(email.html.includes(text)); assert.ok(email.text.includes(text)) }
  assert.match(email.html, /https:\/\/www.nytimes.com\/subscription/)
  assert.doesNotMatch(email.html, /href="https:\/\/www.paramountplus.com/)
  const disabled = renderReminderEmail(items.map(item => ({ ...item, remainderOptions: null })), 'https://mxpoints.vercel.app')
  assert.doesNotMatch(disabled.html, /Use the remainder/)
  assert.doesNotMatch(disabled.text, /Use the remainder/)
})
test('email option text is escaped and unsafe merchant URLs never render', () => {
  const plan = getRemainderOptions(base)!
  plan.options = [{ title: '<script>bad</script>', description: '<img src=x>', url: 'https://example.com/?a=1&b=2' }, { title: 'Unsafe', description: 'bad', url: 'javascript:alert(1)' }]
  const item: ReminderEmailItem = { cardName: 'Amex Platinum', perkName: base.name, remainingValue: 6.01, currentUsage: 18.99, maxValue: 25, daysRemaining: 13, periodEnd: base.periodEnd, tip: null, kind: 'expiring', remainderOptions: plan }
  const email = renderReminderEmail([item], 'https://mxpoints.vercel.app')
  assert.doesNotMatch(email.html, /<script>|<img|href="javascript:|Unsafe/)
  assert.match(email.html, /&lt;script&gt;/)
  assert.match(email.html, /a=1&amp;b=2/)
  assert.doesNotMatch(renderReminderEmail([{ ...item, currentUsage: 0 }], 'https://mxpoints.vercel.app').html, /Use the remainder/)
})
