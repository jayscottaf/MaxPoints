import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { getRemainderOptions, remainderContext } from '@/lib/remainder-options'
import type { PerkDetail } from '@/lib/dashboard'
import { formatCurrency, formatDateOnly } from '@/lib/utils'
import { calendarDate } from '@/lib/accounting'

export function UseRemainder({ perk, allPerks }: { perk: PerkDetail; allPerks: PerkDetail[] }) {
  const plan = getRemainderOptions({ ...perk, remainingValue: perk.availableValue, today: perk.today || calendarDate() }, remainderContext(allPerks))
  if (!plan) return null
  return (
    <details className="group border-y border-line py-3">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold marker:content-none [&::-webkit-details-marker]:hidden">
        <span>Use the remainder <span className="ml-1 text-accent">{formatCurrency(plan.remainingValue)}</span></span>
        <ChevronDown size={16} className="shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="space-y-3 pt-2 text-sm">
        <p className="text-muted">Use by {formatDateOnly(plan.periodEnd)}. Up to {formatCurrency(plan.remainingValue)} toward eligible purchases; anything above that is out of pocket.</p>
        <p>{plan.rule}</p>
        <ul className="divide-y divide-line">
          {plan.options.map(option => (
            <li key={option.url} className="py-3">
              <a href={option.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 max-w-full items-center gap-2 font-medium text-accent underline decoration-accent/30 underline-offset-4">
                <span className="min-w-0 break-words">{option.title}</span><ArrowUpRight size={15} className="shrink-0" aria-hidden="true" />
              </a>
              <p className="mt-1 text-muted">{option.description}</p>
            </li>
          ))}
        </ul>
        {plan.overlap && <p className="text-muted">{plan.overlap.text} <a href={plan.overlap.url} target="_blank" rel="noopener noreferrer" className="text-accent underline">Included streaming plans</a></p>}
        <p className="text-xs text-muted">Only buy what you need. Check current prices, renewal rates and existing subscriptions.</p>
        <a href={plan.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block min-h-9 text-xs text-accent underline">Eligibility checked {formatDateOnly(plan.verifiedOn)} | Official terms</a>
      </div>
    </details>
  )
}
