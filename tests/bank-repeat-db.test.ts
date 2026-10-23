import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { loadEnvConfig } from '@next/env'
import type { Transaction } from 'plaid'
loadEnvConfig(process.cwd())

test('repeat approval: exact matches, capacity, duplicates, ownership, tax, undo and replay', { skip: process.env.RUN_DB_TESTS !== '1' }, async () => {
  const { prisma } = await import('../lib/prisma')
  const { syncBankConnection, setRepeatApproval, undoBankApproval, approveBankCredit } = await import('../lib/bank-service')
  const { encryptBankToken } = await import('../lib/plaid-client')
  const { calendarDate } = await import('../lib/accounting')
  const oldKey = process.env.PLAID_TOKEN_ENCRYPTION_KEY, oldEnv = process.env.PLAID_ENV
  process.env.PLAID_TOKEN_ENCRYPTION_KEY = 'a'.repeat(64)
  process.env.PLAID_ENV = 'sandbox'
  const user = await prisma.user.create({ data: { email: `repeat-${randomUUID()}@example.invalid` } })
  const owner = { id: user.id, timezone: 'America/New_York' }
  const perks = await prisma.perk.findMany({ where: { cardId: 'amex-platinum', name: { in: ['Digital Entertainment Credit', 'Walmart+ Membership'] } } })
  assert.equal(perks.length, 2)
  await prisma.userCard.create({ data: { userId: owner.id, cardId: 'amex-platinum' } })
  const conn = await prisma.bankConnection.create({ data: { userId: owner.id, itemId: randomUUID(), institutionId: 'test', name: 'American Express', environment: 'sandbox', encryptedToken: encryptBankToken('fixture'), accounts: { create: { accountId: randomUUID(), name: 'Fixture Platinum', cardId: 'amex-platinum' } } }, include: { accounts: true } })
  const account = conn.accounts[0]
  const today = calendarDate(new Date(), owner.timezone)
  const date = today.slice(0, 7) + '-10'
  const previous = new Date(date + 'T12:00:00Z'); previous.setUTCMonth(previous.getUTCMonth() - 1)
  const baseDate = previous.toISOString().slice(0, 10)
  let cursor = 0
  const transaction = (description: string, amount: number, overrides: Partial<Transaction> = {}) => ({ transaction_id: randomUUID(), account_id: account.accountId, name: description, amount: -amount, date, iso_currency_code: 'USD', pending: false, ...overrides }) as Transaction
  const sync = async (added: Transaction[], removed: { transaction_id: string }[] = []) => syncBankConnection(owner, conn.id, { transactionsSync: async () => ({ data: { added, modified: [], removed, has_more: false, next_cursor: String(++cursor) } }) } as unknown as Parameters<typeof syncBankConnection>[2])
  const clear = async () => { await prisma.bankTransaction.deleteMany({ where: { connectionId: conn.id } }); await prisma.usage.deleteMany({ where: { userId: owner.id } }) }
  async function baseline(name = 'Digital Entertainment Credit', amount = 18.99, description = 'Platinum Digital Entertainment Credit') {
    const perk = perks.find(p => p.name === name)!
    const usage = await prisma.usage.create({ data: { userId: owner.id, perkId: perk.id, amount, date: new Date(baseDate + 'T12:00:00Z') } })
    const bank = await prisma.bankTransaction.create({ data: { connectionId: conn.id, accountId: account.id, transactionId: randomUUID(), description, amountCents: -Math.round(amount * 100), date: baseDate, pending: false, currency: 'USD', status: 'approved', usageId: usage.id, candidatePerkIds: [perk.id] } })
    await setRepeatApproval(owner, bank.id, true)
    await prisma.bankTransaction.update({ where: { id: bank.id }, data: { repeatEnabledAt: new Date(baseDate + 'T12:00:00Z') } })
    return { bank, perk, usage }
  }
  try {
    const { bank } = await baseline()
    await assert.rejects(setRepeatApproval({ ...owner, id: 'stranger' }, bank.id, true), /not found/)
    const repeat = transaction('Platinum Digital Entertainment Credit', 18.99)
    const concurrent = await Promise.allSettled([sync([repeat]), sync([repeat])])
    assert.ok(concurrent.some(result => result.status === 'fulfilled'))
    const approved = await prisma.bankTransaction.findUniqueOrThrow({ where: { transactionId: repeat.transaction_id } })
    assert.equal(approved.autoApproved, true)
    assert.equal(approved.status, 'approved')
    await sync([repeat])
    assert.equal(await prisma.usage.count({ where: { userId: owner.id } }), 2)
    await syncBankConnection(owner, conn.id, { transactionsSync: async (input: { cursor?: string }) => {
      assert.equal(input.cursor, undefined)
      return { data: { added: [repeat], modified: [], removed: [], has_more: false, next_cursor: String(++cursor) } }
    } } as unknown as Parameters<typeof syncBankConnection>[2], true)
    assert.equal(await prisma.usage.count({ where: { userId: owner.id } }), 2)
    await assert.rejects(undoBankApproval({ ...owner, id: 'stranger' }, approved.id), /not found/)
    await Promise.all([undoBankApproval(owner, approved.id), undoBankApproval(owner, approved.id)])
    await sync([repeat])
    assert.equal((await prisma.bankTransaction.findUniqueOrThrow({ where: { id: approved.id } })).status, 'undone')
    assert.equal((await prisma.bankTransaction.findUniqueOrThrow({ where: { id: bank.id } })).repeatEnabledAt, null)
    assert.equal(await prisma.usage.count({ where: { userId: owner.id, deletedAt: null } }), 1)

    for (const scenario of ['amount', 'description', 'boundary', 'duplicate-batch', 'usage', 'unverified', 'disabled', 'capacity', 'removed', 'baseline-edited', 'baseline-removed', 'baseline-deleted', 'pending', 'currency', 'historical']) {
      await clear()
      const b = await baseline()
      const credit = transaction(scenario === 'description' ? 'Other Digital Entertainment Credit' : 'Platinum Digital Entertainment Credit', scenario === 'amount' ? 19.99 : 18.99,
        scenario === 'boundary' ? { date: today.slice(0, 7) + '-01' } : scenario === 'pending' ? { pending: true } : scenario === 'currency' ? { iso_currency_code: 'CAD' } : scenario === 'historical' ? { date: baseDate } : {})
      if (['usage', 'unverified', 'capacity'].includes(scenario)) await prisma.usage.create({ data: { userId: owner.id, perkId: b.perk.id, amount: scenario === 'capacity' ? 10 : 18.99, date: new Date(date + 'T12:00:00Z'), needsReview: scenario === 'unverified' } })
      if (scenario === 'disabled') await setRepeatApproval(owner, b.bank.id, false)
      if (scenario === 'baseline-edited') await prisma.usage.update({ where: { id: b.usage.id }, data: { amount: 1 } })
      if (scenario === 'baseline-deleted') await prisma.usage.update({ where: { id: b.usage.id }, data: { deletedAt: new Date() } })
      if (scenario === 'baseline-removed') await prisma.bankTransaction.update({ where: { id: b.bank.id }, data: { removed: true, status: 'review' } })
      await sync(scenario === 'duplicate-batch' ? [credit, transaction(credit.name, 18.99)] : [credit], scenario === 'removed' ? [{ transaction_id: credit.transaction_id }] : [])
      assert.equal(await prisma.bankTransaction.count({ where: { connectionId: conn.id, autoApproved: true } }), 0, scenario)
    }

    await clear()
    const walmart = await baseline('Walmart+ Membership', 13.86, 'Platinum Walmart+ Credit')
    const credit = transaction('Platinum Walmart+ Credit', 13.86)
    await sync([credit])
    const approvedWalmart = await prisma.bankTransaction.findUniqueOrThrow({ where: { transactionId: credit.transaction_id } })
    assert.equal(approvedWalmart.autoApproved, true)
    assert.equal((await prisma.usage.findUniqueOrThrow({ where: { id: approvedWalmart.usageId! } })).amount, 13.86)
    await sync([transaction('Platinum Walmart+ Credit', 13.86)])
    assert.equal(await prisma.usage.count({ where: { userId: owner.id, perkId: walmart.perk.id } }), 2)

    // An existing logged credit can become a baseline without inserting usage.
    await clear()
    const b = await baseline()
    await prisma.bankTransaction.update({ where: { id: b.bank.id }, data: { status: 'pending', usageId: null, repeatEnabledAt: null } })
    await setRepeatApproval(owner, b.bank.id, true)
    assert.equal(await prisma.usage.count({ where: { userId: owner.id } }), 1)
    assert.equal((await prisma.bankTransaction.findUniqueOrThrow({ where: { id: b.bank.id } })).usageId, b.usage.id)

    // First tax-inclusive Walmart credit can still be approved manually.
    await clear()
    await sync([credit])
    const first = await prisma.bankTransaction.findUniqueOrThrow({ where: { transactionId: credit.transaction_id } })
    await approveBankCredit(owner, first.id, walmart.perk.id, date, 13.86)
    assert.equal(await prisma.usage.count({ where: { userId: owner.id } }), 1)
  } finally {
    await clear()
    await prisma.bankAccount.deleteMany({ where: { connectionId: conn.id } })
    await prisma.bankConnection.delete({ where: { id: conn.id } })
    await prisma.userCard.deleteMany({ where: { userId: owner.id } })
    await prisma.user.delete({ where: { id: owner.id } })
    await prisma.$disconnect()
    if (oldKey === undefined) delete process.env.PLAID_TOKEN_ENCRYPTION_KEY; else process.env.PLAID_TOKEN_ENCRYPTION_KEY = oldKey
    if (oldEnv === undefined) delete process.env.PLAID_ENV; else process.env.PLAID_ENV = oldEnv
  }
})
