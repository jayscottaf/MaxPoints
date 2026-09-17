import { loadEnvConfig } from '@next/env'
import { PrismaClient, Prisma } from '@prisma/client'
import { createHash } from 'node:crypto'
import { catalogPerks } from '../prisma/catalog'
import { verifiedTerms, VERIFIED_DATE } from '../lib/verified-benefits'

loadEnvConfig(process.cwd())
const db = new PrismaClient()
const apply = process.argv.includes('--apply')
const ownerId = process.env.OWNER_USER_ID
const version = `benefit-audit-${VERIFIED_DATE}`
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')

async function main() {
  if (!ownerId) throw new Error('OWNER_USER_ID is required. No account is selected implicitly.')
  await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(781205)`
    const beforeLedger = await tx.usage.findMany({ where: { userId: ownerId }, orderBy: { id: 'asc' } })
    const cards = await tx.card.findMany({ where: { userCards: { some: { userId: ownerId, isActive: true } } }, include: { perks: true } })
    let changed = 0
    for (const card of cards) {
      const desired = catalogPerks(card.id)
      for (const perk of card.perks) {
        const done = await tx.perkRevision.findFirst({ where: { perkId: perk.id, data: { path: ['version'], equals: version } } })
        if (done) continue
        const correction = verifiedTerms(card.id, perk.name)
        if (!correction) continue
        console.log(`${apply ? 'Correct' : 'Preview'} ${card.name}: ${perk.name}`)
        changed++
        if (!apply) continue
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${ownerId + ':' + perk.id}, 0))`
        const current = await tx.perk.findUniqueOrThrow({ where: { id: perk.id } })
        await tx.perkRevision.create({ data: { perkId: perk.id, userId: ownerId, data: JSON.parse(JSON.stringify({ version, before: current, patch: correction })) } })
        await tx.perk.update({ where: { id: perk.id }, data: correction as Prisma.PerkUpdateInput })
      }
      for (const benefit of desired) {
        if (card.perks.some(p => p.name === benefit.name)) continue
        const legacyDoorDash = card.perks.find(p => p.name === 'DoorDash Credits')
        const migratedPromo = benefit.name.startsWith('DoorDash ') && benefit.periodType === 'monthly' && legacyDoorDash && beforeLedger.some(u => u.perkId === legacyDoorDash.id && !u.deletedAt)
        const data = { ...benefit, ...(migratedPromo ? { requiresConfirmation: true, notes: 'Confirm current-month promo balances before enabling. Historical combined DoorDash usage is retained separately and has not been allocated to these offers.' } : {}) }
        console.log(`${apply ? 'Add' : 'Preview add'} ${card.name}: ${benefit.name}`)
        changed++
        if (!apply) continue
        const created = await tx.perk.create({ data })
        await tx.perkRevision.create({ data: { perkId: created.id, userId: ownerId, data: JSON.parse(JSON.stringify({ version, created: true, after: created })) } })
      }
    }
    const afterLedger = await tx.usage.findMany({ where: { userId: ownerId }, orderBy: { id: 'asc' } })
    if (digest(beforeLedger) !== digest(afterLedger)) throw new Error('Ledger changed during correction; rolling back.')
    console.log(`${changed} benefit changes; ${afterLedger.length} usage records unchanged. ${apply ? 'Applied with revision history.' : 'Dry run only.'}`)
  }, { timeout: 120000, isolationLevel: 'Serializable' })
}
main().catch(error => { console.error(error.message); process.exitCode = 1 }).finally(() => db.$disconnect())
