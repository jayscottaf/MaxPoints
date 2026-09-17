import { PrismaClient } from '@prisma/client'
import { loadEnvConfig } from '@next/env'
import { catalogPerks } from './catalog'

loadEnvConfig(process.cwd())
const prisma = new PrismaClient()
async function main() {
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(781205)`
    if (await tx.card.count() || await tx.perk.count()) { console.log('Existing catalog preserved; no seed changes made.'); return }
    const email = process.env.OWNER_EMAIL || process.env.PERK_ALERT_EMAIL
    if (!email || !email.includes('@')) throw new Error('Configure the owner email before first-time seeding.')
    const user = await tx.user.upsert({ where: { email }, create: { email }, update: {} })
    for (const card of [
      { id: 'amex-platinum', name: 'Amex Platinum', issuer: 'American Express', annualFee: 895 },
      { id: 'amex-hilton-aspire', name: 'Amex Hilton Aspire', issuer: 'American Express', annualFee: 550 },
      { id: 'chase-reserve', name: 'Chase Sapphire Reserve', issuer: 'Chase', annualFee: 795 },
    ]) {
      await tx.card.create({ data: card })
      await tx.perk.createMany({ data: catalogPerks(card.id) })
      await tx.userCard.create({ data: { cardId: card.id, userId: user.id } })
    }
  }, { timeout: 60000 })
}
main().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => prisma.$disconnect())
