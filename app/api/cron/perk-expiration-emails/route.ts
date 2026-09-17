import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { runReminders } from '@/lib/reminders'

export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET || ''}`)
  const supplied = Buffer.from(request.headers.get('authorization') || '')
  if (!process.env.CRON_SECRET || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json(await runReminders(request.nextUrl.searchParams.get('dryRun') === '1'), { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Reminder delivery failed. Check notification settings.' }, { status: 503 })
  }
}
