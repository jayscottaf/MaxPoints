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
      const response = await fetch(`/api/perks?cardId=${cardId}&userId=user-default`)
      const data = await response.json()
      setPerks(data)
      setShowPerkModal(true)
    } catch (error) {
      console.error('Failed to fetch perks:', error)
    }
  }

  const handleUsageUpdate = (perkId: string, amount: number) => {
    // Update local state
    setPerks(prevPerks =>
      prevPerks.map(perk =>
        perk.id === perkId
          ? { ...perk, currentUsage: (perk.currentUsage || 0) + amount }
          : perk
      )
    )

    // Refresh cards data
    fetchCards()
  }

  // Calculate totals
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CreditCard className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">MaxPoints</h1>
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
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Annual Fees</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(totalAnnualFees)}</p>
              </div>
              <CreditCard className="h-8 w-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Perks Value</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(totalPerksValue)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Used to Date</p>
                <p className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(totalUsed)}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Net Cost</p>
                <p className={`text-2xl font-bold mt-1 ${netCost <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(netCost)}
                </p>
              </div>
              <div className={`h-8 w-8 rounded-full ${netCost <= 0 ? 'bg-green-100' : 'bg-red-100'} flex items-center justify-center`}>
                <span className={`text-sm font-bold ${netCost <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {netCost <= 0 ? '+' : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        <h2 className="text-xl font-semibold mb-4">Your Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map(card => (
            <CardSummary key={card.id} card={card} onSelect={setSelectedCard} />
          ))}
        </div>
      </div>

      {/* Perks Modal */}
      {showPerkModal && selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">{selectedCard.name} Perks</h2>
              <button
                onClick={() => setShowPerkModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
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
