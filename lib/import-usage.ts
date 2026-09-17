import ExcelJS from 'exceljs'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { prisma } from './prisma'
import { cents, sumMoney, calendarYear, usageDate } from './accounting'

const rowSchema = z.object({ card: z.string().trim().min(1).max(200), perk: z.string().trim().min(1).max(200), amount: z.number().finite().min(0).max(1000000), date: z.string().optional() })
export type ImportRow = z.infer<typeof rowSchema>
const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ')

export async function readUsageWorkbook(buffer: ArrayBuffer): Promise<ImportRow[]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.getWorksheet('Perks')
  if (!sheet || sheet.rowCount > 1001) throw new Error('Use a Perks sheet with at most 1,000 rows.')
  const columns = new Map<string, number>()
  sheet.getRow(1).eachCell((cell, index) => columns.set(cell.text.trim(), index))
  for (const header of ['Card', 'Perk / Credit', 'Amount Used (USD)']) if (!columns.has(header)) throw new Error(`Missing column: ${header}`)
  const rows: ImportRow[] = []
  sheet.eachRow((row, number) => {
    if (number === 1) return
    const text = (header: string) => columns.has(header) ? row.getCell(columns.get(header)!).text.trim() : ''
    const raw = row.getCell(columns.get('Amount Used (USD)')!).value
    if (raw && typeof raw === 'object') throw new Error(`Row ${number}: amounts must be numbers, not formulas.`)
    const amount = Number(String(raw ?? 0).replace(/[$,]/g, ''))
    const parsed = rowSchema.safeParse({ card: text('Card'), perk: text('Perk / Credit'), amount, ...(text('Usage Date') ? { date: text('Usage Date') } : {}) })
    if (!parsed.success || Math.abs(amount * 100 - cents(amount)) > 0.000001) throw new Error(`Row ${number}: invalid card, perk, or amount.`)
    rows.push(parsed.data)
  })
  return rows
}

export async function importUsage(user: { id: string; timezone: string }, rows: ImportRow[], commit: boolean) {
  const parsed = z.array(rowSchema).max(1000).parse(rows)
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${user.id + ':import'}, 0))`
    const cards = await tx.card.findMany({ where: { userCards: { some: { userId: user.id, isActive: true } } }, include: { perks: true } })
    const plans: { perkId: string; perk: string; card: string; amount: number; date: string; needsReview: boolean }[] = []
    const seen = new Set<string>()
    for (const row of parsed) {
      if (row.amount === 0) continue
      const matches = cards.flatMap(card => card.perks.filter(perk => normalize(card.name) === normalize(row.card) && normalize(perk.name) === normalize(row.perk)).map(perk => ({ card, perk })))
      if (matches.length !== 1) throw new Error(`Match exactly one existing card and perk for ${row.card}: ${row.perk}.`)
      const { card, perk } = matches[0]
      if (seen.has(perk.id)) throw new Error(`Duplicate total for ${perk.name}. Use one total per perk.`)
      seen.add(perk.id)
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${user.id + ':' + perk.id}, 0))`
      const date = usageDate(row.date, user.timezone)
      const year = calendarYear(date, user.timezone)
      const previous = await tx.usage.findMany({ where: { userId: user.id, perkId: perk.id, deletedAt: null, ...(perk.periodType === 'one-time' ? {} : { date: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } }) } })
      const amount = (cents(row.amount) - cents(sumMoney(previous.map(u => u.amount)))) / 100
      if (row.amount > perk.maxValue) throw new Error(`${perk.name}: total exceeds its annual value.`)
      if (amount <= 0) continue
      plans.push({ perkId: perk.id, perk: perk.name, card: card.name, amount, date: date.toISOString(), needsReview: perk.periodType !== 'one-time' })
    }
    const previewHash = createHash('sha256').update(JSON.stringify(plans)).digest('hex')
    if (commit) for (const plan of plans) {
      await tx.usage.create({ data: { userId: user.id, perkId: plan.perkId, amount: plan.amount, date: new Date(plan.date), needsReview: plan.needsReview, notes: plan.needsReview ? 'Imported annual total; period allocation needs review.' : 'Imported one-time benefit usage.', idempotencyKey: `import:${previewHash}:${plan.perkId}` } })
    }
    return { committed: commit, plans, previewHash }
  }, { timeout: 30000 })
}
