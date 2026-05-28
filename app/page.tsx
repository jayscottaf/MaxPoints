'use client'

import { useEffect, useState } from 'react'
import { CardSummary } from '@/components/card-summary'
import { CardSettingsModal } from '@/components/card-settings-modal'
import { PerkItem } from '@/components/perk-item'
import { daysUntilDateOnly, formatCurrency, formatDateOnly } from '@/lib/utils'
import { CreditCard, TrendingUp, Calendar, Bell, X, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Toaster } from 'react-hot-toast'

const DUE_PERKS_COLLAPSED_COUNT = 6

function getUpcomingUnusedPerks(perks: any[]) {
  return perks
    .map((perk) => ({
      ...perk,
      isOneTime: perk.periodType === 'one-time',
      daysLeft: perk.periodEnd ? daysUntilDateOnly(perk.periodEnd) : null,
    }))
    .filter((perk) =>
      perk.maxValue > 0 &&
      (perk.currentUsage || 0) === 0 &&
      perk.periodEnd &&
      perk.daysLeft !== null &&
      perk.daysLeft >= 0
    )
    .sort((a, b) => {
      if (a.isOneTime !== b.isOneTime) {
        return a.isOneTime ? 1 : -1
      }

      if (a.daysLeft !== b.daysLeft) {
        return a.daysLeft - b.daysLeft
      }

      const cardCompare = (a.card?.name || '').localeCompare(b.card?.name || '')
      if (cardCompare !== 0) {
        return cardCompare
      }

      return a.name.localeCompare(b.name)
    })
}

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
  const [cards, setCards] = useState<any[]>([])
  const [selectedCard, setSelectedCard] = useState<any>(null)
  const [perks, setPerks] = useState<any[]>([])
  const [allPerks, setAllPerks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showPerkModal, setShowPerkModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showAllDuePerks, setShowAllDuePerks] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  useEffect(() => {
    if (selectedCard) {
      fetchPerks(selectedCard.id)
    }
  }, [selectedCard])

  const fetchDashboardData = async () => {
    try {
      const [cardsResponse, perksResponse] = await Promise.all([
        fetch('/api/cards'),
        fetch('/api/perks'),
      ])
      const [cardsData, perksData] = await Promise.all([
        cardsResponse.json(),
        perksResponse.json(),
      ])
      setCards(cardsData)
      setAllPerks(perksData)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      setLoading(false)
    }
  }

  const fetchCards = async () => {
    try {
      const response = await fetch('/api/cards')
      const data = await response.json()
      setCards(data)
    } catch (error) {
      console.error('Failed to fetch cards:', error)
    }
  }

  const fetchPerks = async (cardId: string) => {
    try {
      const response = await fetch(`/api/perks?cardId=${cardId}`)
      const data = await response.json()
      setPerks(data)
      setShowPerkModal(true)
    } catch (error) {
      console.error('Failed to fetch perks:', error)
    }
  }

  const handleUsageUpdate = (perkId: string, amount: number) => {
    setPerks(prevPerks =>
      prevPerks.map(perk =>
        perk.id === perkId
          ? { ...perk, currentUsage: (perk.currentUsage || 0) + amount }
          : perk
      )
    )
    setAllPerks(prevPerks =>
      prevPerks.map(perk =>
        perk.id === perkId
          ? { ...perk, currentUsage: (perk.currentUsage || 0) + amount }
          : perk
      )
    )
    fetchCards()
  }

  const totalAnnualFees = cards.reduce((sum, card) => sum + card.annualFee, 0)
  const totalPerksValue = cards.reduce(
    (sum, card) => sum + (card.perks?.reduce((s: number, p: any) => s + p.maxValue, 0) || 0),
    0
  )
  const totalUsed = cards.reduce(
    (sum, card) => sum + (card.perks?.reduce((s: number, p: any) => s + (p.currentUsage || 0), 0) || 0),
    0
  )
  const netCost = totalAnnualFees - totalUsed
  const upcomingUnusedPerks = getUpcomingUnusedPerks(allPerks)
  const visibleDuePerks = showAllDuePerks
    ? upcomingUnusedPerks
    : upcomingUnusedPerks.slice(0, DUE_PERKS_COLLAPSED_COUNT)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-lg text-zinc-300">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-[#1a1b23] border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CreditCard className="h-8 w-8 text-blue-500" />
              <h1 className="text-2xl font-bold text-white">MaxPoints</h1>
            </div>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Bell className="h-5 w-5" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </header>

      {/* Summary Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#1a1b23] rounded-lg border border-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Total Annual Fees</p>
                <p className="text-2xl font-bold mt-1 text-white">{formatCurrency(totalAnnualFees)}</p>
              </div>
              <CreditCard className="h-8 w-8 text-zinc-600" />
            </div>
          </div>

          <div className="bg-[#1a1b23] rounded-lg border border-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Total Perks Value</p>
                <p className="text-2xl font-bold mt-1 text-blue-400">{formatCurrency(totalPerksValue)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-[#1a1b23] rounded-lg border border-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Used to Date</p>
                <p className="text-2xl font-bold mt-1 text-emerald-400">{formatCurrency(totalUsed)}</p>
              </div>
              <Calendar className="h-8 w-8 text-emerald-500" />
            </div>
          </div>

          <div className="bg-[#1a1b23] rounded-lg border border-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Net Cost</p>
                <p className={`text-2xl font-bold mt-1 ${netCost <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(netCost)}
                </p>
              </div>
              <div className={`h-8 w-8 rounded-full ${netCost <= 0 ? 'bg-emerald-900/50' : 'bg-red-900/50'} flex items-center justify-center`}>
                <span className={`text-sm font-bold ${netCost <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {netCost <= 0 ? '+' : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        <h2 className="text-xl font-semibold mb-4 text-white">Your Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {cards.map(card => (
            <CardSummary key={card.id} card={card} onSelect={setSelectedCard} />
          ))}
        </div>

        <section>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Unused Perks Coming Due</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Unused recurring credits first, with one-time perks kept below them.
              </p>
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
                    onClick={() => setSelectedCard(perk.card)}
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
                        <p className="text-lg font-bold text-blue-300">{formatCurrency(perk.maxValue)}</p>
                        <p className="text-xs text-zinc-500">unused</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
                      <Calendar className="h-4 w-4 text-zinc-500" />
                      <span>{perk.isOneTime ? 'Track by benefit cycle' : `Due ${formatDateOnly(perk.periodEnd)}`}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* Perks Modal */}
      {showPerkModal && selectedCard && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1b23] border border-zinc-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">{selectedCard.name} Perks</h2>
              <button
                onClick={() => setShowPerkModal(false)}
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              <div className="grid grid-cols-1 gap-4">
                {perks.map(perk => (
                  <PerkItem
                    key={perk.id}
                    perk={perk}
                    onUsageUpdate={handleUsageUpdate}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <CardSettingsModal
          cards={cards}
          onClose={() => setShowSettingsModal(false)}
          onSaved={fetchCards}
        />
      )}
    </div>
  )
}
