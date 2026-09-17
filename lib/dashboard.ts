import { z } from 'zod'
import { daysUntilDateOnly } from './utils'

const cardIdentity = z.object({ id: z.string(), name: z.string(), issuer: z.string() })
export const perkSchema = z.object({
  id: z.string(), cardId: z.string(), name: z.string(), description: z.string().nullable().optional(), notes: z.string().nullable().optional(),
  maxValue: z.number().finite(), annualValue: z.number().finite(), currentUsage: z.number().finite(), annualUsage: z.number().finite(),
  periodType: z.string(), periodStart: z.string(), periodEnd: z.string().nullable(), startDate: z.string().nullable().optional(), endDate: z.string().nullable().optional(),
  available: z.boolean(), availableValue: z.number().finite(), needsReview: z.boolean(), valueKind: z.string(),
  enrollmentRequired: z.boolean(), category: z.string().nullable().optional(), card: cardIdentity,
  periodValue: z.number().nullable().optional(), decemberBonus: z.number().optional(), sourceUrl: z.string().nullable().optional(), verifiedAt: z.string().nullable().optional(),
  faceValue: z.number().optional(),
  today: z.string().optional(), daysRemaining: z.number().nullable().optional(), daysUntilStart: z.number().optional(),
})
export const cardsSchema = z.array(cardIdentity.extend({
  annualFee: z.number().finite(), perks: z.array(perkSchema),
  userCards: z.array(z.object({ id: z.string(), renewalDate: z.string().nullable(), expirationDate: z.string().nullable().optional(), last4: z.string().nullable() })),
}))
export type PerkDetail = z.infer<typeof perkSchema>
export type CardDetail = z.infer<typeof cardsSchema>[number]
export function upcomingPerks(perks: PerkDetail[]) {
  return perks.map(perk => ({ ...perk, isOneTime: perk.periodType === 'one-time', daysLeft: perk.daysRemaining ?? (perk.periodEnd ? daysUntilDateOnly(perk.periodEnd) : -1) }))
    .filter(perk => perk.availableValue > 0 && perk.daysLeft >= 0)
    .sort((a, b) => Number(a.isOneTime) - Number(b.isOneTime) || a.daysLeft - b.daysLeft || a.card.name.localeCompare(b.card.name) || a.name.localeCompare(b.name))
}
