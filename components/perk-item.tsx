'use client'

import { useState } from 'react'
import { Check, Clock, DollarSign, AlertTriangle, Plus } from 'lucide-react'
import { formatCurrency, daysUntil, getPercentageUsed, getPerkStatus } from '@/lib/utils'
import { toast } from 'react-hot-toast'

interface PerkItemProps {
  perk: any
  onUsageUpdate: (perkId: string, amount: number) => void
}

export function PerkItem({ perk, onUsageUpdate }: PerkItemProps) {
  const [isLogging, setIsLogging] = useState(false)
  const [amount, setAmount] = useState('')

  const currentUsage = perk.currentUsage || 0
  const percentUsed = getPercentageUsed(currentUsage, perk.maxValue)
  const status = getPerkStatus(perk, currentUsage)
  const daysRemaining = perk.periodEnd ? daysUntil(perk.periodEnd) : null

  const handleLogUsage = async () => {
    const usageAmount = parseFloat(amount)
    if (!usageAmount || usageAmount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (currentUsage + usageAmount > perk.maxValue) {
      toast.error(`Amount exceeds maximum value of ${formatCurrency(perk.maxValue)}`)
      return
    }

    try {
      const response = await fetch('/api/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perkId: perk.id,
          amount: usageAmount,
          userId: 'user-default'
        })
      })

      if (response.ok) {
        toast.success('Usage logged successfully')
        onUsageUpdate(perk.id, usageAmount)
        setAmount('')
        setIsLogging(false)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to log usage')
      }
    } catch (error) {
      toast.error('Failed to log usage')
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <Check className="h-5 w-5 text-emerald-400" />
      case 'expiring':
        return <AlertTriangle className="h-5 w-5 text-yellow-400" />
      case 'in-progress':
        return <Clock className="h-5 w-5 text-blue-400" />
      default:
        return <DollarSign className="h-5 w-5 text-zinc-500" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-900/50 text-emerald-300'
      case 'expiring':
        return 'bg-yellow-900/50 text-yellow-300'
      case 'in-progress':
        return 'bg-blue-900/50 text-blue-300'
      default:
        return 'bg-zinc-800 text-zinc-300'
    }
  }

  return (
    <div className="border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3">
          {getStatusIcon()}
          <div className="flex-1">
            <h4 className="font-medium text-white">{perk.name}</h4>
            {perk.description && (
              <p className="text-sm text-zinc-400 mt-1">{perk.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor()}`}>
                {status.replace('-', ' ')}
              </span>
              {perk.enrollmentRequired && (
                <span className="text-xs px-2 py-1 rounded-full bg-purple-900/50 text-purple-300">
                  Enrollment Required
                </span>
              )}
              {perk.category && (
                <span className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400">
                  {perk.category}
                </span>
              )}
              {daysRemaining !== null && daysRemaining <= 30 && (
                <span className="text-xs px-2 py-1 rounded-full bg-orange-900/50 text-orange-300">
                  {daysRemaining} days left
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-zinc-400">
              {formatCurrency(currentUsage)} / {formatCurrency(perk.maxValue)}
            </span>
            <span className="font-medium text-zinc-200">{percentUsed}%</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                percentUsed === 100 ? 'bg-emerald-500' :
                percentUsed > 75 ? 'bg-yellow-500' :
                'bg-blue-500'
              }`}
              style={{ width: `${percentUsed}%` }}
            />
          </div>
        </div>

        {status !== 'completed' && (
          <div>
            {!isLogging ? (
              <button
                onClick={() => setIsLogging(true)}
                className="flex items-center space-x-1 text-sm text-blue-400 hover:text-blue-300"
              >
                <Plus className="h-4 w-4" />
                <span>Log Usage</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount"
                  className="px-2 py-1 text-sm bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                  min="0"
                  max={perk.maxValue - currentUsage}
                />
                <button
                  onClick={handleLogUsage}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsLogging(false)
                    setAmount('')
                  }}
                  className="px-3 py-1 text-sm text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
