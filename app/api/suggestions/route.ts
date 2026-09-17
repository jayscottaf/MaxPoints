import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withOwner, getOwner } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
export const GET = withOwner(async () => {
  const owner = await getOwner()
  return NextResponse.json(await prisma.notification.findMany({ where: { userId: owner.id, type: 'suggestion', readAt: null }, orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, title: true, message: true, metadata: true, createdAt: true } }))
})
export const PATCH = withOwner(async request => {
  const input = z.object({ id: z.string(), dismissed: z.boolean() }).strict().safeParse(await request.json())
  if (!input.success) return NextResponse.json({ error: 'Invalid suggestion.' }, { status: 400 })
  const owner = await getOwner()
  const result = await prisma.notification.updateMany({ where: { id: input.data.id, userId: owner.id, type: 'suggestion' }, data: { readAt: input.data.dismissed ? new Date() : null } })
  return NextResponse.json({ ok: result.count === 1 }, { status: result.count ? 200 : 404 })
})
