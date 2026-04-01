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
        return <Check className="h-5 w-5 text-green-600" />
      case 'expiring':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'in-progress':
        return <Clock className="h-5 w-5 text-blue-600" />
      default:
        return <DollarSign className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'expiring':
        return 'bg-yellow-100 text-yellow-800'
      case 'in-progress':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3">
          {getStatusIcon()}
          <div className="flex-1">
            <h4 className="font-medium">{perk.name}</h4>
            {perk.description && (
              <p className="text-sm text-gray-600 mt-1">{perk.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor()}`}>
                {status.replace('-', ' ')}
              </span>
              {perk.enrollmentRequired && (
                <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                  Enrollment Required
                </span>
              )}
              {perk.category && (
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  {perk.category}
                </span>
              )}
              {daysRemaining !== null && daysRemaining <= 30 && (
                <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-800">
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
            <span className="text-gray-600">
              {formatCurrency(currentUsage)} / {formatCurrency(perk.maxValue)}
            </span>
            <span className="font-medium">{percentUsed}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                percentUsed === 100 ? 'bg-green-600' :
                percentUsed > 75 ? 'bg-yellow-600' :
                'bg-blue-600'
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
                className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
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
                  className="px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
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