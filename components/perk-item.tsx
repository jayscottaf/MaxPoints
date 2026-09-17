'use client'

import { useRef, useState } from 'react'
import { Check, Clock, DollarSign, AlertTriangle, Plus, History, Trash2, Undo2 } from 'lucide-react'
import { formatCurrency, daysUntilDateOnly, getPercentageUsed, getPerkStatus } from '@/lib/utils'
import { calendarDate, cents } from '@/lib/accounting'
import { getPerkTip } from '@/lib/perk-tips'
import { toast } from 'react-hot-toast'

interface PerkItemProps {
  perk: any
  onUsageUpdate: (perkId: string, amount: number) => void
}

interface UsageEntry {
  id: string
  amount: number
  date: string
  deletedAt?: string | null
  needsReview?: boolean
}

export function PerkItem({ perk, onUsageUpdate }: PerkItemProps) {
  const [isLogging, setIsLogging] = useState(false)
  const [amount, setAmount] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [history, setHistory] = useState<UsageEntry[] | null>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [date, setDate] = useState(calendarDate)
  const pending = useRef(false)
  const submission = useRef<{ body: string; key: string } | null>(null)

  const toggleHistory = async () => {
    if (history !== null) {
      setHistory(null)
      return
    }
    setIsLoadingHistory(true)
    try {
      const response = await fetch(`/api/usage?perkId=${encodeURIComponent(perk.id)}&includeDeleted=1`)
      if (!response.ok) throw new Error('Failed to load usage')
      setHistory(await response.json())
    } catch {
      toast.error('Could not load usage history. Please try again.')
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const deleteUsage = async (entry: UsageEntry) => {
    if (!entry.deletedAt && !window.confirm(`Remove ${formatCurrency(entry.amount)} of usage for ${perk.name}? You can restore it from history.`)) return
    setIsSaving(true)
    try {
      const response = await fetch(`/api/usage?id=${encodeURIComponent(entry.id)}`, entry.deletedAt ? { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: entry.id, action: 'restore' }) } : { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete usage')
      const updated = await response.json()
      setHistory(entries => entries?.map(item => item.id === entry.id ? updated : item) ?? null)
      const date = new Date(entry.date)
      const inPeriod = date >= new Date(perk.periodStart) && date <= new Date(perk.periodEnd)
      onUsageUpdate(perk.id, inPeriod ? (entry.deletedAt ? entry.amount : -entry.amount) : 0)
      toast.success(entry.deletedAt ? 'Usage restored' : 'Usage removed. Restore it from history.')
    } catch {
      toast.error('Could not delete usage. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const currentUsage = perk.currentUsage || 0
  const percentUsed = getPercentageUsed(currentUsage, perk.maxValue)
  const status = getPerkStatus(perk, currentUsage)
  const daysRemaining = perk.periodEnd ? daysUntilDateOnly(perk.periodEnd) : null
  const remainingValue = Math.max(0, cents(perk.maxValue) - cents(currentUsage)) / 100
  const tip = status !== 'completed' ? getPerkTip(perk.cardId, perk.name) : null

  // Core submit shared by the one-tap "Used it" button and the manual entry.
  const submitUsage = async (usageAmount: number) => {
    if (pending.current) return
    if (!Number.isFinite(usageAmount) || usageAmount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (currentUsage + usageAmount > perk.maxValue) {
      toast.error(`Amount exceeds maximum value of ${formatCurrency(perk.maxValue)}`)
      return
    }

    pending.current = true
    setIsSaving(true)
    try {
      const body = JSON.stringify({ perkId: perk.id, amount: usageAmount, date })
      if (submission.current?.body !== body) submission.current = { body, key: crypto.randomUUID() }
      const response = await fetch('/api/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perkId: perk.id,
          amount: usageAmount,
          date,
          idempotencyKey: submission.current.key,
        })
      })

      if (response.ok) {
        toast.success('Usage logged')
        onUsageUpdate(perk.id, usageAmount)
        setAmount('')
        setIsLogging(false)
        setHistory(null)
        submission.current = null
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to log usage')
      }
    } catch {
      toast.error('Failed to log usage')
    } finally {
      pending.current = false
      setIsSaving(false)
    }
  }

  const handleLogUsage = () => submitUsage(parseFloat(amount))
  const handleMarkFullyUsed = () => submitUsage(remainingValue)

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
            {tip && (
              <p className="text-sm text-zinc-500 mt-1">💡 {tip}</p>
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
              {daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 30 && (
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

        <button
          onClick={toggleHistory}
          disabled={isLoadingHistory || isSaving}
          aria-expanded={history !== null}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white disabled:opacity-60"
        >
          <History className="h-4 w-4" />
          {isLoadingHistory ? 'Loading...' : history !== null ? 'Hide usage history' : 'Usage history'}
        </button>
        {history !== null && (
          <ul className="divide-y divide-zinc-800 text-sm">
            {history.length === 0 && <li className="py-2 text-zinc-400">No usage recorded.</li>}
            {history.map(entry => (
              <li key={entry.id} className="flex items-center justify-between gap-2 py-2">
                <span className="text-zinc-300">
                  <span className={entry.deletedAt ? 'line-through' : ''}>{formatCurrency(entry.amount)}</span> <span className="text-zinc-500">{new Date(entry.date).toLocaleDateString(undefined, { timeZone: 'UTC' })}{entry.deletedAt ? ' (removed)' : entry.needsReview ? ' (period needs review)' : ''}</span>
                </span>
                <button
                  onClick={() => deleteUsage(entry)}
                  disabled={isSaving}
                  title={entry.deletedAt ? 'Restore usage' : 'Remove usage'}
                  aria-label={`${entry.deletedAt ? 'Restore' : 'Remove'} ${formatCurrency(entry.amount)} usage`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-zinc-400 hover:bg-red-950 hover:text-red-300 disabled:opacity-60"
                >
                  {entry.deletedAt ? <Undo2 className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </li>
            ))}
          </ul>
        )}

        {perk.needsReview && <p className="text-sm text-amber-300">Historical usage needs period review.</p>}
        {status !== 'completed' && status !== 'upcoming' && (
          <div>
            {!isLogging ? (
              <div className="flex flex-wrap items-center gap-2">
                {/* One-tap: most credits are all-or-nothing, so log the full remainder. */}
                {status !== 'expired' && <button
                  onClick={handleMarkFullyUsed}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Check className="h-4 w-4" />
                  <span>Used it{remainingValue > 0 ? ` (${formatCurrency(remainingValue)})` : ''}</span>
                </button>}
                <button
                  onClick={() => setIsLogging(true)}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-400 hover:text-blue-300 disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  <span>{status === 'expired' ? 'Log past usage' : 'Log partial'}</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <input type="date" aria-label="Usage date" value={date} max={calendarDate()} onChange={e => setDate(e.target.value)} className="min-w-0 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-white" />
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isSaving && handleLogUsage()}
                  placeholder="Amount"
                  autoFocus
                  aria-label="Usage amount"
                  className="w-28 min-w-0 px-2 py-1 text-sm bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                  min="0"
                  max={remainingValue}
                />
                <button
                  onClick={handleLogUsage}
                  disabled={isSaving}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setIsLogging(false)
                    setAmount('')
                  }}
                  disabled={isSaving}
                  className="px-3 py-1 text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-60"
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
