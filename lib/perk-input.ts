import { z } from 'zod'
const money = z.number().finite().min(0).max(1000000).refine(v => Math.abs(v * 100 - Math.round(v * 100)) < 0.000001)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => { const d = new Date(v); return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v }).nullable()
export const perkInput = z.object({
  id: z.string().min(1).max(200), maxValue: money, periodValue: money.nullable(), decemberBonus: money,
  periodType: z.enum(['monthly', 'quarterly', 'semi-annual', 'annual', 'one-time']),
  valueKind: z.enum(['credit', 'membership', 'coverage', 'estimate']),
  startDate: date, endDate: date, notes: z.string().max(4000), enrollmentRequired: z.boolean(),
}).strict().refine(v => !v.startDate || !v.endDate || v.startDate <= v.endDate, 'Start date must precede end date.')
