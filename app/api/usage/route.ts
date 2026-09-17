import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withOwner, getOwner } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createUsage, changeUsage, editUsage, UsageError } from '@/lib/usage-service'

const inputSchema = z.object({ perkId: z.string().min(1).max(200), amount: z.number(), date: z.string().optional(), notes: z.string().max(2000).optional(), idempotencyKey: z.uuid() }).strict()
function failure(error: unknown) {
  const expected = error instanceof UsageError || error instanceof z.ZodError || error instanceof SyntaxError || (error instanceof Error && error.message.startsWith('Usage date'))
  return NextResponse.json({ error: expected && error instanceof Error ? error.message : 'Unable to save usage. Please retry.' }, { status: error instanceof UsageError ? error.status : expected ? 400 : 503 })
}
export const GET = withOwner(async (request: NextRequest) => {
  const user = await getOwner()
  const perkId = request.nextUrl.searchParams.get('perkId')
  return NextResponse.json(await prisma.usage.findMany({
    where: { userId: user.id, ...(perkId ? { perkId } : {}), ...(request.nextUrl.searchParams.get('includeDeleted') === '1' ? {} : { deletedAt: null }) },
    include: { perk: { select: { name: true, cardId: true } } }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], take: 200,
  }))
})
export const POST = withOwner(async (request: NextRequest) => {
  try {
    const parsed = inputSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Invalid usage details.' }, { status: 400 })
    return NextResponse.json(await createUsage(await getOwner(), parsed.data))
  } catch (error) { return failure(error) }
})
export const DELETE = withOwner(async (request: NextRequest) => {
  try {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) throw new UsageError('Usage ID required.')
    return NextResponse.json(await changeUsage(await getOwner(), id, 'delete'))
  } catch (error) { return failure(error) }
})
export const PATCH = withOwner(async (request: NextRequest) => {
  try {
    const body = z.discriminatedUnion('action', [z.object({ id: z.string().min(1), action: z.literal('restore') }).strict(), z.object({ id: z.string().min(1), action: z.literal('edit'), amount: z.number(), date: z.string(), notes: z.string().max(2000).optional() }).strict()]).parse(await request.json())
    if (body.action === 'edit') return NextResponse.json(await editUsage(await getOwner(), body))
    return NextResponse.json(await changeUsage(await getOwner(), body.id, body.action))
  } catch (error) { return failure(error) }
})
