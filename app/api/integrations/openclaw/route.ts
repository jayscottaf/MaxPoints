import { NextRequest, NextResponse } from 'next/server'
import { getOwner } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { integrationAuthorized, suggestionId, suggestionInput } from '@/lib/integration-policy'

export async function POST(request: NextRequest) {
  if (!integrationAuthorized(request.headers.get('authorization'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (Number(request.headers.get('content-length')) > 16000) return NextResponse.json({ error: 'Payload too large.' }, { status: 413 })
  try {
    const reader = request.body?.getReader()
    if (!reader) return NextResponse.json({ error: 'Missing payload.' }, { status: 400 })
    const chunks: Uint8Array[] = []; let size = 0
    while (true) {
      const { done, value } = await reader.read(); if (done) break
      size += value.length
      if (size > 16000) { await reader.cancel(); return NextResponse.json({ error: 'Payload too large.' }, { status: 413 }) }
      chunks.push(value)
    }
    const input = suggestionInput.safeParse(JSON.parse(Buffer.concat(chunks).toString('utf8')))
    if (!input.success) return NextResponse.json({ error: 'Invalid suggestion.' }, { status: 400 })
    const owner = await getOwner()
    const id = suggestionId(owner.id, input.data.eventId)
    return prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`openclaw:${owner.id}`}, 0))`
      if (await tx.notification.findUnique({ where: { id } })) return NextResponse.json({ queued: true, duplicate: true })
      if (await tx.notification.count({ where: { userId: owner.id, type: 'suggestion', createdAt: { gte: new Date(Date.now() - 3600000) } } }) >= 100) return NextResponse.json({ error: 'Hourly suggestion limit reached.' }, { status: 429 })
      await tx.notification.create({ data: { id, userId: owner.id, type: 'suggestion', title: input.data.title, message: input.data.message, metadata: { kind: input.data.kind, sourceUrl: input.data.sourceUrl || null } } })
      return NextResponse.json({ queued: true }, { status: 202 })
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof SyntaxError ? 'Invalid JSON.' : 'Suggestion could not be queued.' }, { status: error instanceof SyntaxError ? 400 : 503 })
  }
}
