import { randomInt } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'
import { digest, isOwnerEmail, matchesCode, newToken, ownerEmail, sameOrigin, SESSION_COOKIE, SESSION_SECONDS } from '@/lib/auth-policy'
import { getOwner, sessionUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await sessionUser(request.cookies.get(SESSION_COOKIE)?.value)
  return NextResponse.json({ signedIn: !!user }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email : ''
    if (!isOwnerEmail(email)) return NextResponse.json({ error: 'Sign-in is restricted to the owner.' }, { status: 403 })
    const now = new Date()
    if (body.code === undefined) {
      if (!process.env.RESEND_API_KEY || !process.env.PERK_ALERT_FROM) {
        return NextResponse.json({ error: 'Email sign-in is not configured.' }, { status: 503 })
      }
      const code = String(randomInt(10000000, 100000000))
      const nonce = newToken()
      const allowed = await prisma.$transaction(async tx => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(781204)`
        const old = await tx.loginChallenge.findUnique({ where: { email: ownerEmail() } })
        const sameWindow = old && now.getTime() - old.windowStart.getTime() < 3600000
        if (old && (now.getTime() - old.requestedAt.getTime() < 60000 || (sameWindow && old.requests >= 5))) return false
        const data = { codeHash: digest(`${nonce}:${code}`), nonce, expiresAt: new Date(now.getTime() + 600000), attempts: 0, requestedAt: now, windowStart: sameWindow ? old.windowStart : now, requests: sameWindow ? old.requests + 1 : 1 }
        await tx.loginChallenge.upsert({ where: { email: ownerEmail() }, create: { email: ownerEmail(), ...data }, update: data })
        return true
      })
      if (!allowed) return NextResponse.json({ error: 'Please wait before requesting another code. Maximum 5 per hour.' }, { status: 429 })
      const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: process.env.PERK_ALERT_FROM, to: ownerEmail(), subject: 'Your MaxPoints sign-in code', text: `Your MaxPoints sign-in code is ${code}. It expires in 10 minutes. If you did not request this code, ignore this email.` })
      if (error) throw new Error('Email delivery failed')
      const response = NextResponse.json({ sent: true })
      response.cookies.set('maxpoints_challenge', nonce, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 600 })
      return response
    }
    const token = newToken()
    const user = await getOwner()
    const verified = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(781204)`
      const challenge = await tx.loginChallenge.findUnique({ where: { email: ownerEmail() } })
      if (!challenge || challenge.expiresAt <= now || challenge.attempts >= 5) return false
      if (request.cookies.get('maxpoints_challenge')?.value !== challenge.nonce) return false
      await tx.loginChallenge.update({ where: { email: ownerEmail() }, data: { attempts: { increment: 1 } } })
      if (typeof body.code !== 'string' || !matchesCode(body.code, challenge.nonce, challenge.codeHash)) return false
      await tx.loginChallenge.update({ where: { email: ownerEmail() }, data: { expiresAt: now, codeHash: '' } })
      await tx.session.deleteMany({ where: { expiresAt: { lte: now } } })
      await tx.session.create({ data: { tokenHash: digest(token), userId: user.id, expiresAt: new Date(now.getTime() + SESSION_SECONDS * 1000) } })
      return true
    })
    if (!verified) return NextResponse.json({ error: 'Invalid or expired code. Please request a new code if needed.' }, { status: 401 })
    const response = NextResponse.json({ signedIn: true })
    response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: SESSION_SECONDS })
    response.cookies.delete('maxpoints_challenge')
    return response
  } catch {
    return NextResponse.json({ error: 'Sign-in is temporarily unavailable. Please retry.' }, { status: 503 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (token) await prisma.session.deleteMany({ where: { tokenHash: digest(token) } })
  const response = NextResponse.json({ signedIn: false })
  response.cookies.delete(SESSION_COOKIE)
  return response
}
