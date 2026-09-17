import { NextRequest, NextResponse } from 'next/server'
import { sessionUser } from '@/lib/auth'
import { SESSION_COOKIE } from '@/lib/auth-policy'

export async function proxy(request: NextRequest) {
  try {
    if (await sessionUser(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next()
  } catch { /* Fail closed if the session store is unavailable. */ }
  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = { matcher: ['/'] }
