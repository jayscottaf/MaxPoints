'use client'

import { useEffect, useState } from 'react'
import { CreditCard, Save, X } from 'lucide-react'

type CardSettingsValues = {
  expirationMonth: string
  last4: string
  error: string | null
  saved: boolean
  saving: boolean
}

interface CardSettingsModalProps {
  cards: any[]
  onClose: () => void
  onSaved: () => Promise<void>
}

function toMonthInputValue(value: string | Date | null | undefined) {
  if (!value) {
    return ''
  }

  if (typeof value === 'string') {
    return value.slice(0, 7)
  }

  return value.toISOString().slice(0, 7)
}

function createInitialValues(cards: any[]) {
  return cards.reduce<Record<string, CardSettingsValues>>((values, card) => {
    const userCard = card.userCards?.[0]
    if (!userCard) {
      return values
    }

    values[userCard.id] = {
      expirationMonth: toMonthInputValue(userCard.renewalDate),
      last4: userCard.last4 || '',
      error: null,
      saved: false,
      saving: false,
    }

    return values
  }, {})
}

export function CardSettingsModal({ cards, onClose, onSaved }: CardSettingsModalProps) {
  const [values, setValues] = useState<Record<string, CardSettingsValues>>(() => createInitialValues(cards))

  useEffect(() => {
    setValues(createInitialValues(cards))
  }, [cards])

  const updateValue = (userCardId: string, field: 'expirationMonth' | 'last4', value: string) => {
    setValues((current) => ({
      ...current,
      [userCardId]: {
        ...current[userCardId],
        [field]: value,
        error: null,
        saved: false,
      },
    }))
  }

  const saveCard = async (userCardId: string) => {
    const current = values[userCardId]
    if (!current) {
      return
    }

    if (current.last4 && !/^\d{4}$/.test(current.last4)) {
      setValues((state) => ({
        ...state,
        [userCardId]: {
          ...state[userCardId],
          error: 'Last 4 must be exactly 4 digits.',
        },
      }))
      return
    }

    setValues((state) => ({
      ...state,
      [userCardId]: {
        ...state[userCardId],
        error: null,
        saved: false,
        saving: true,
      },
    }))

    try {
      const response = await fetch(`/api/user-cards/${userCardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expirationMonth: current.expirationMonth || null,
          last4: current.last4 || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save card settings')
      }

      await onSaved()
      setValues((state) => ({
        ...state,
        [userCardId]: {
          ...state[userCardId],
          error: null,
          saved: true,
          saving: false,
        },
      }))
    } catch (error) {
      setValues((state) => ({
        ...state,
        [userCardId]: {
          ...state[userCardId],
          error: error instanceof Error ? error.message : 'Failed to save card settings',
          saved: false,
          saving: false,
        },
      }))
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-[#1a1b23] border border-zinc-800 rounded-lg max-w-3xl w-full max-h-[85vh] overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Card Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"
            aria-label="Close card settings"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(85vh-96px)] space-y-4">
          {cards.map((card) => {
            const userCard = card.userCards?.[0]
            if (!userCard) {
              return null
            }

            const cardValues = values[userCard.id] || {
              expirationMonth: '',
              last4: '',
              error: null,
              saved: false,
              saving: false,
            }

            return (
              <section key={userCard.id} className="border border-zinc-800 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-6 w-6 text-blue-500 mt-1" />
                    <div>
                      <h3 className="font-semibold text-white">{card.name}</h3>
                      <p className="text-sm text-zinc-400">{card.issuer}</p>
                    </div>
                  </div>
                  {cardValues.saved && (
                    <span className="text-xs text-emerald-400">Saved</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px_auto] gap-3 items-end">
                  <label className="block">
                    <span className="text-sm text-zinc-400">Expiration month</span>
                    <input
                      type="month"
                      value={cardValues.expirationMonth}
                      onChange={(event) => updateValue(userCard.id, 'expirationMonth', event.target.value)}
                      className="mt-1 w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm text-zinc-400">Last 4</span>
                    <input
                      inputMode="numeric"
                      pattern="[0-9]{4}"
                      value={cardValues.last4}
                      onChange={(event) => updateValue(userCard.id, 'last4', event.target.value)}
                      placeholder="1234"
                      className="mt-1 w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>

                  <button
                    onClick={() => saveCard(userCard.id)}
                    disabled={cardValues.saving}
                    className="h-10 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>{cardValues.saving ? 'Saving' : 'Save'}</span>
                  </button>
                </div>

                {cardValues.error && (
                  <p className="mt-3 text-sm text-red-400">{cardValues.error}</p>
                )}
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
