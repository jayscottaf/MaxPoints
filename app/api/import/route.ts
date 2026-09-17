import { NextRequest, NextResponse } from 'next/server'
import { withOwner, getOwner } from '@/lib/auth'
import { importUsage, readUsageWorkbook } from '@/lib/import-usage'

export const POST = withOwner(async (request: NextRequest) => {
  try {
    if (Number(request.headers.get('content-length') || 0) > 2200000) return NextResponse.json({ error: 'File limit is 2 MB.' }, { status: 413 })
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File) || file.size > 2000000 || !file.name.toLowerCase().endsWith('.xlsx')) return NextResponse.json({ error: 'Choose an .xlsx file under 2 MB.' }, { status: 400 })
    const rows = await readUsageWorkbook(await file.arrayBuffer())
    const result = await importUsage(await getOwner(), rows, form.get('confirm') === 'true')
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid workbook.' }, { status: 400 })
  }
})
