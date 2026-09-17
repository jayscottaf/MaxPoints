import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { digest, SESSION_COOKIE, sameOrigin, isOwnerEmail } from '@/lib/auth-policy'

export async function sessionUser(token?: string) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null
  const session = await prisma.session.findUnique({ where: { tokenHash: digest(token) } })
  if (!session || session.expiresAt <= new Date()) return null
  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  const isOwner = user && (process.env.OWNER_USER_ID ? user.id === process.env.OWNER_USER_ID : isOwnerEmail(user.email))
  return isOwner ? user : null
}

export function withOwner<A extends unknown[]>(handler: (request: NextRequest, ...args: A) => Promise<Response>) {
  return async (request: NextRequest, ...args: A) => {
    try {
      const user = await sessionUser(request.cookies.get(SESSION_COOKIE)?.value)
      if (!user) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
      if (!['GET', 'HEAD'].includes(request.method) && !sameOrigin(request)) {
        return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
      }
      const response = await handler(request, ...args)
      response.headers.set('Cache-Control', 'private, no-store')
      return response
    } catch (error) {
      console.error('Request failed:', error instanceof Error ? error.name : 'Unknown error')
      return NextResponse.json({ error: 'Temporarily unavailable. Please retry.' }, { status: 503 })
    }
  }
}

export async function getOwner() {
  const email = (process.env.OWNER_EMAIL || process.env.PERK_ALERT_EMAIL || '').trim().toLowerCase()
  if (!email) throw new Error('OWNER_EMAIL is required')
  return prisma.user.findUniqueOrThrow({ where: process.env.OWNER_USER_ID ? { id: process.env.OWNER_USER_ID } : { email } })
}
