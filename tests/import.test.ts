import { test } from 'node:test'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import { readUsageWorkbook } from '../lib/import-usage'

test('Excel import parses cents and rejects formulas and missing columns', async () => {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Perks')
  sheet.addRow(['Card', 'Perk / Credit', 'Amount Used (USD)'])
  sheet.addRow(['Card', 'Credit', 12.95])
  const rows = await readUsageWorkbook(await workbook.xlsx.writeBuffer())
  assert.equal(rows[0].amount, 12.95)
  sheet.getCell('C2').value = { formula: 'SUM(1,2)', result: 3 }
  await assert.rejects(readUsageWorkbook(await workbook.xlsx.writeBuffer()), /formulas/)
  sheet.getCell('A1').value = 'Bad header'
  await assert.rejects(readUsageWorkbook(await workbook.xlsx.writeBuffer()), /Missing column/)
})
