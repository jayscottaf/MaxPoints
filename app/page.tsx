'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CardSummary } from '@/components/card-summary'
import { CardSettingsModal } from '@/components/card-settings-modal'
import { PerkItem } from '@/components/perk-item'
import { SummaryOverview } from '@/components/summary-overview'
import { DashboardSkeleton } from '@/components/dashboard-skeleton'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { formatCurrency, formatDateOnly } from '@/lib/utils'
import { calendarYear, sumMoney } from '@/lib/accounting'
import { cardsSchema, upcomingPerks, type CardDetail } from '@/lib/dashboard'
import { CreditCard, Calendar, Bell, AlertTriangle, CheckCircle2, LogOut, RefreshCw } from 'lucide-react'
import { Toaster } from 'react-hot-toast'

const DUE_PERKS_COLLAPSED_COUNT = 6

function getDueUrgency(daysLeft: number, isOneTime: boolean) {
  if (isOneTime) {
    return {
      badge: 'bg-purple-900/50 text-purple-200 border-purple-700/50',
      accent: 'border-l-purple-500',
      label: 'one-time',
      showAlert: false,
    }
  }

  if (daysLeft === 0) {
    return {
      badge: 'bg-red-900/60 text-red-200 border-red-700/60',
      accent: 'border-l-red-500',
      label: 'Due today',
      showAlert: true,
    }
  }

  if (daysLeft <= 14) {
    return {
      badge: 'bg-orange-900/50 text-orange-200 border-orange-700/60',
      accent: 'border-l-orange-500',
      label: `${daysLeft} days left`,
      showAlert: true,
    }
  }

  if (daysLeft <= 30) {
    return {
      badge: 'bg-yellow-900/50 text-yellow-200 border-yellow-700/60',
      accent: 'border-l-yellow-500',
      label: `${daysLeft} days left`,
      showAlert: true,
    }
  }

  return {
    badge: 'bg-blue-900/40 text-blue-200 border-blue-700/50',
    accent: 'border-l-blue-500',
    label: `${daysLeft} days left`,
    showAlert: false,
  }
}

export default function Dashboard() {
  const [cards, setCards] = useState<CardDetail[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [year, setYear] = useState(calendarYear)
  const [error, setError] = useState('')
  const requestController = useRef<AbortController | null>(null)
  const selectedCard = cards.find(card => card.id === selectedId)
  const perks = selectedCard?.perks ?? []
  const allPerks = cards.flatMap(card => card.perks)
  const [loading, setLoading] = useState(true)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showAllDuePerks, setShowAllDuePerks] = useState(false)

  const fetchDashboardData = useCallback(async () => {
    requestController.current?.abort()
    const controller = new AbortController()
    requestController.current = controller
    try {
      const response = await fetch(`/api/cards?year=${year}`, { signal: controller.signal, cache: 'no-store' })
      if (response.status === 401) { window.location.assign('/login'); return }
      if (!response.ok) throw new Error('Could not load your cards. Please retry.')
      const data = cardsSchema.safeParse(await response.json())
      if (!data.success) throw new Error('The server returned incomplete card data. Please retry.')
      if (!controller.signal.aborted) { setCards(data.data); setError('') }
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Could not load your cards.')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [year])
  useEffect(() => { void fetchDashboardData(); return () => requestController.current?.abort() }, [fetchDashboardData])
  const handleUsageUpdate = () => { void fetchDashboardData() }

  const totalAnnualFees = cards.reduce((sum, card) => sum + card.annualFee, 0)
  const valuedPerks = allPerks.filter(perk => !['coverage', 'estimate'].includes(perk.valueKind))
  const totalPerksValue = sumMoney(valuedPerks.map(perk => perk.annualValue))
  const totalUsed = sumMoney(valuedPerks.map(perk => perk.annualUsage))
  const upcomingUnusedPerks = upcomingPerks(allPerks)
  const visibleDuePerks = showAllDuePerks
    ? upcomingUnusedPerks
    : upcomingUnusedPerks.slice(0, DUE_PERKS_COLLAPSED_COUNT)

  const header = (
    <header className="bg-[#1a1b23] border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <CreditCard className="h-8 w-8 text-blue-500" />
            <h1 className="text-2xl font-bold text-white">MaxPoints</h1>
          </div>
          <div className="flex items-center gap-2">
          <select aria-label="Reporting year" value={year} onChange={e => { setLoading(true); setYear(Number(e.target.value)); setSelectedId(null) }} className="rounded border border-zinc-700 bg-zinc-900 p-2 text-white">
            {Array.from({ length: 8 }, (_, i) => calendarYear() + 1 - i).map(value => <option key={value} value={value}>{value}</option>)}
          </select>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <Bell className="h-5 w-5" />
            <span>Settings</span>
          </button>
          <button title="Sign out" aria-label="Sign out" onClick={async () => { const response = await fetch('/api/auth', { method: 'DELETE' }); if (response.ok) window.location.assign('/login'); else setError('Could not sign out. Please retry.') }} className="rounded p-2 text-zinc-300 hover:bg-zinc-800"><LogOut className="h-5 w-5" /></button>
          </div>
        </div>
      </div>
    </header>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117]">
        {header}
        <DashboardSkeleton />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <Toaster position="top-right" />

      {header}

      {/* Summary Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 border-l-2 border-red-400 p-3 text-red-300"><span>{error}{cards.length > 0 ? ' Showing last loaded data.' : ''}</span><button onClick={fetchDashboardData} className="flex items-center gap-2 rounded border border-red-400 px-3 py-1"><RefreshCw className="h-4 w-4" />Retry</button></div>}
        <SummaryOverview
          totalAnnualFees={totalAnnualFees}
          totalPerksValue={totalPerksValue}
          totalUsed={totalUsed}
        />

        {/* Cards Grid */}
        <h2 className="text-xl font-semibold mb-4 text-white">Your Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {cards.map(card => (
            <CardSummary key={card.id} card={card} onSelect={card => setSelectedId(card.id)} />
          ))}
        </div>

        <section>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Credits Coming Due</h2>
            </div>
            {upcomingUnusedPerks.length > DUE_PERKS_COLLAPSED_COUNT && (
              <button
                onClick={() => setShowAllDuePerks((value) => !value)}
                className="self-start sm:self-auto px-3 py-2 text-sm rounded border border-zinc-700 text-zinc-200 hover:bg-zinc-800"
              >
                {showAllDuePerks ? 'Show less' : `Show all ${upcomingUnusedPerks.length}`}
              </button>
            )}
          </div>

          {upcomingUnusedPerks.length === 0 ? (
            <div className="border border-zinc-800 rounded-lg bg-[#1a1b23] p-6 flex items-center gap-3 text-zinc-300">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span>No unused perks with upcoming due dates right now.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {visibleDuePerks.map((perk) => {
                const urgency = getDueUrgency(perk.daysLeft, perk.isOneTime)

                return (
                  <button
                    key={perk.id}
                    onClick={() => setSelectedId(perk.cardId)}
                    className={`text-left bg-[#1a1b23] border border-zinc-800 border-l-4 ${urgency.accent} rounded-lg p-4 hover:border-zinc-600 transition-colors`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${urgency.badge}`}>
                            {urgency.showAlert && <AlertTriangle className="h-3 w-3" />}
                            {urgency.label}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-400">{perk.card?.name}</p>
                        <h3 className="font-semibold text-white truncate">{perk.name}</h3>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-blue-300">{formatCurrency(perk.availableValue)}</p>
                        <p className="text-xs text-zinc-400">unused</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
                      <Calendar className="h-4 w-4 text-zinc-500" />
                      <span>{perk.isOneTime ? 'Track by benefit cycle' : perk.periodEnd ? `Due ${formatDateOnly(perk.periodEnd)}` : ''}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* Perks Modal */}
      <Dialog open={!!selectedCard} onOpenChange={(open) => !open && setSelectedId(null)}>
        {selectedCard && (
          <DialogContent
            title={`${selectedCard.name} Perks`}
            description={selectedCard.issuer}
            onClose={() => setSelectedId(null)}
            className="max-w-4xl"
          >
            <div className="grid grid-cols-1 gap-4">
              {perks.map((perk) => (
                <PerkItem key={perk.id} perk={perk} onUsageUpdate={handleUsageUpdate} />
              ))}
            </div>
          </DialogContent>
        )}
      </Dialog>

      {showSettingsModal && (
        <CardSettingsModal
          cards={cards}
          onClose={() => setShowSettingsModal(false)}
          onSaved={fetchDashboardData}
        />
      )}
    </div>
  )
}
