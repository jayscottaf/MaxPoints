import { loadEnvConfig } from '@next/env'
import { PrismaClient, Prisma } from '@prisma/client'
import { benefitCorrections, CATALOG_VERSION, valueKind } from '../lib/benefit-catalog'

loadEnvConfig(process.cwd())
const prisma = new PrismaClient()
async function main() {
  const commit = process.argv.includes('--apply')
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(781205)`
    const perks = await tx.perk.findMany({ include: { card: { include: { userCards: true } } } })
    for (const perk of perks) {
      const correction = benefitCorrections.find(c => c.cardId === perk.cardId && c.name === perk.name && c.expectedValue === perk.maxValue && perk.periodType === 'annual' && perk.periodValue === null)
      const classification = valueKind(perk.name, perk.category)
      if (!correction && (classification === perk.valueKind || perk.valueKind !== 'credit')) continue
      const patch: Prisma.PerkUpdateInput = { valueKind: classification }
      if (correction) {
        patch.periodType = correction.periodType
        patch.periodValue = correction.periodValue
        patch.sourceUrl = correction.sourceUrl
        patch.verifiedAt = new Date(CATALOG_VERSION)
        if ('maxValue' in correction) patch.maxValue = correction.maxValue
        if ('decemberBonus' in correction) patch.decemberBonus = correction.decemberBonus
      }
      console.log(`${commit ? 'Apply' : 'Preview'} ${perk.name}: ${JSON.stringify(patch)}`)
      if (commit) {
        const { card, ...before } = perk
        await tx.perkRevision.create({ data: { perkId: perk.id, userId: card.userCards[0]?.userId ?? 'catalog', data: JSON.parse(JSON.stringify({ version: CATALOG_VERSION, before, patch })) } })
        if (correction) await tx.usage.updateMany({ where: { perkId: perk.id, deletedAt: null }, data: { needsReview: true } })
        await tx.perk.update({ where: { id: perk.id }, data: patch })
      }
    }
  }, { timeout: 30000 })
}
main().finally(() => prisma.$disconnect())
