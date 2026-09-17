import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE = 'maxpoints_session'
export const SESSION_SECONDS = 30 * 24 * 60 * 60
export const digest = (value: string) => createHash('sha256').update(value).digest('hex')
export const newToken = () => randomBytes(32).toString('hex')
export const ownerEmail = () => (process.env.OWNER_EMAIL || process.env.PERK_ALERT_EMAIL || '').trim().toLowerCase()

export function isOwnerEmail(value: string) {
  return Boolean(ownerEmail()) && value.trim().toLowerCase() === ownerEmail()
}

export function matchesCode(code: string, nonce: string, hash: string) {
  if (!/^\d{8}$/.test(code) || !/^[a-f0-9]{64}$/.test(hash)) return false
  return timingSafeEqual(Buffer.from(digest(`${nonce}:${code}`), 'hex'), Buffer.from(hash, 'hex'))
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return origin === new URL(request.url).origin
}
