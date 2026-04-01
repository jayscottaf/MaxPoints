'use client'

import { Card } from '@prisma/client'
import { CreditCard, Calendar, TrendingUp } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

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

  return (
    <div
      className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => onSelect(card)}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <CreditCard className="h-8 w-8 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold">{card.name}</h3>
            <p className="text-sm text-gray-600">{card.issuer}</p>
          </div>
        </div>
        {card.userCards?.[0]?.renewalDate && (
          <div className="flex items-center text-sm text-gray-500">
            <Calendar className="h-4 w-4 mr-1" />
            <span>Renews {formatDate(card.userCards[0].renewalDate)}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Annual Fee</p>
          <p className="text-xl font-bold">{formatCurrency(card.annualFee)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Net Cost</p>
          <p className={`text-xl font-bold ${netCost <= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(netCost)}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Total Perks Value</span>
          <span className="font-medium">{formatCurrency(totalMaxValue)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Used to Date</span>
          <span className="font-medium">{formatCurrency(totalUsed)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Remaining Value</span>
          <span className="font-medium text-blue-600">{formatCurrency(remainingValue)}</span>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-sm mb-1">
          <span>Fee Coverage</span>
          <span className="font-medium">{coveragePercent.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              coveragePercent >= 100 ? 'bg-green-600' : 'bg-blue-600'
            }`}
            style={{ width: `${Math.min(coveragePercent, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}