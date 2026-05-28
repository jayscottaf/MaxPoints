'use client'

import { CreditCard, Calendar } from 'lucide-react'
import { formatCurrency, formatExpirationMonth, getCardBrand, isPastDateOnly } from '@/lib/utils'

interface CardSummaryProps {
  card: any
  onSelect: (card: any) => void
}

export function CardSummary({ card, onSelect }: CardSummaryProps) {
  const totalMaxValue = card.perks?.reduce((sum: number, perk: any) => sum + perk.maxValue, 0) || 0
  const totalUsed = card.perks?.reduce((sum: number, perk: any) => sum + (perk.currentUsage || 0), 0) || 0
  const remainingValue = totalMaxValue - totalUsed
  const netCost = card.annualFee - totalUsed
  const coveragePercent = card.annualFee > 0 ? (totalUsed / card.annualFee) * 100 : 0
  const expirationDate = card.userCards?.[0]?.renewalDate
  const last4 = card.userCards?.[0]?.last4
  const cardExpired = expirationDate ? isPastDateOnly(expirationDate) : false
  const brand = getCardBrand(card)

  return (
    <button
      type="button"
      className="group relative w-full overflow-hidden rounded-xl border border-zinc-800 bg-[#1a1b23] p-6 text-left shadow-lg shadow-black/20 transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-600 hover:shadow-xl hover:shadow-black/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      onClick={() => onSelect(card)}
    >
      {/* Brand accent stripe */}
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${brand.gradient}`} />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${brand.chipBg}`}>
            <CreditCard className={`h-6 w-6 ${brand.accent}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{card.name}</h3>
            <p className="text-sm text-zinc-400">{card.issuer}</p>
            {last4 && <p className="mt-1 text-xs text-zinc-400">Card ending {last4}</p>}
          </div>
        </div>
        {expirationDate && (
          <div className={`flex items-center text-sm ${cardExpired ? 'text-red-400' : 'text-zinc-400'}`}>
            <Calendar className="mr-1 h-4 w-4" />
            <span>
              {cardExpired ? 'Expired' : 'Expires'} {formatExpirationMonth(expirationDate)}
            </span>
          </div>
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-zinc-400">Annual Fee</p>
          <p className="text-xl font-bold text-white">{formatCurrency(card.annualFee)}</p>
        </div>
        <div>
          <p className="text-sm text-zinc-400">Net Cost</p>
          <p className={`text-xl font-bold ${netCost <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(netCost)}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Total Perks Value</span>
          <span className="font-medium text-zinc-200">{formatCurrency(totalMaxValue)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Used to Date</span>
          <span className="font-medium text-zinc-200">{formatCurrency(totalUsed)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Remaining Value</span>
          <span className="font-medium text-blue-400">{formatCurrency(remainingValue)}</span>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-sm">
          <span className="text-zinc-400">Fee Coverage</span>
          <span className="font-medium text-zinc-200">{coveragePercent.toFixed(0)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-zinc-800">
          <div
            className={`h-2 rounded-full transition-all ${
              coveragePercent >= 100 ? 'bg-emerald-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(coveragePercent, 100)}%` }}
          />
        </div>
      </div>
    </button>
  )
}
