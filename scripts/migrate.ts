import { loadEnvConfig } from '@next/env'
import { PrismaClient } from '@prisma/client'
import { readdir, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

loadEnvConfig(process.cwd())
const db = new PrismaClient()
async function main() {
  await db.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "_MaxPointsMigration" ("name" TEXT PRIMARY KEY, "checksum" TEXT NOT NULL, "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT now())')
  for (const name of (await readdir('prisma/migrations')).filter(n => n.endsWith('.sql')).sort()) {
    const sql = await readFile(`prisma/migrations/${name}`, 'utf8')
    const checksum = createHash('sha256').update(sql).digest('hex')
    await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(781205)`
      const rows = await tx.$queryRaw<{ checksum: string }[]>`SELECT checksum FROM "_MaxPointsMigration" WHERE name = ${name}`
      if (rows.length) {
        if (rows[0].checksum !== checksum) throw new Error(`Migration changed: ${name}`)
        return
      }
      // Each migration uses explicit statement separators, not SQL-semicolon parsing.
      for (const statement of sql.split('-- statement-break')) if (statement.trim()) await tx.$executeRawUnsafe(statement)
      await tx.$executeRaw`INSERT INTO "_MaxPointsMigration" (name, checksum) VALUES (${name}, ${checksum})`
      console.log(`Applied ${name}`)
    }, { timeout: 30000 })
  }
}
main().finally(() => db.$disconnect())
