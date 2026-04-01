'use client'

import { useEffect, useState } from 'react'
import { CardSummary } from '@/components/card-summary'
import { PerkItem } from '@/components/perk-item'
import { formatCurrency } from '@/lib/utils'
import { CreditCard, TrendingUp, Calendar, Bell, X } from 'lucide-react'
import { Toaster } from 'react-hot-toast'

export default function Dashboard() {
  const [cards, setCards] = useState<any[]>([])
  const [selectedCard, setSelectedCard] = useState<any>(null)
  const [perks, setPerks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showPerkModal, setShowPerkModal] = useState(false)

  useEffect(() => {
    fetchCards()
  }, [])

  useEffect(() => {
    if (selectedCard) {
      fetchPerks(selectedCard.id)
    }
  }, [selectedCard])

  const fetchCards = async () => {
    try {
      const response = await fetch('/api/cards')
      const data = await response.json()
      setCards(data)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch cards:', error)
      setLoading(false)
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
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map(card => (
            <CardSummary key={card.id} card={card} onSelect={setSelectedCard} />
          ))}
        </div>
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
    </div>
  )
}
