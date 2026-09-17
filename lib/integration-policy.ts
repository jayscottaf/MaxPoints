import { z } from 'zod'
import { createHash, timingSafeEqual } from 'node:crypto'

export function integrationAuthorized(header: string | null, secret = process.env.OPENCLAW_INGEST_SECRET) {
  if (!secret || secret.length < 32) return false
  const expected = Buffer.from(`Bearer ${secret}`), supplied = Buffer.from(header || '')
  return expected.length === supplied.length && timingSafeEqual(expected, supplied)
}
export const suggestionInput = z.object({
  kind: z.enum(['deal', 'benefit-change', 'usage']),
  title: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(4000),
  sourceUrl: z.url().max(2000).refine(url => new URL(url).protocol === 'https:').optional(),
  eventId: z.string().min(1).max(200),
}).strict()
export const suggestionId = (userId: string, eventId: string) => 'suggestion:' + createHash('sha256').update(`${userId}:${eventId}`).digest('hex')
