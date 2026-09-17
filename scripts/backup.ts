import { loadEnvConfig } from '@next/env'
import { PrismaClient } from '@prisma/client'
import { mkdir, writeFile } from 'node:fs/promises'

loadEnvConfig(process.cwd())
const prisma = new PrismaClient()
async function main() {
  const data = await prisma.$transaction(async tx => ({ users: await tx.user.findMany(), cards: await tx.card.findMany(), userCards: await tx.userCard.findMany(), perks: await tx.perk.findMany(), usage: await tx.usage.findMany(), notifications: await tx.notification.findMany() }), { isolationLevel: 'RepeatableRead' })
  await mkdir('.backups', { recursive: true, mode: 0o700 })
  const path = `.backups/ledger-${new Date().toISOString().replace(/:/g, '-')}.json`
  await writeFile(path, JSON.stringify(data, null, 2), { mode: 0o600, flag: 'wx' })
  console.log(`Private backup written to ${path}`)
}
main().finally(() => prisma.$disconnect())
