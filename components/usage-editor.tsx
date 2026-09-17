'use client'
import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { calendarDate } from '@/lib/accounting'

export function UsageEditor({ entry, onSaved, today = calendarDate() }: { entry: { id: string; date: string; amount: number }; onSaved: () => void; today?: string }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!open) return <button title="Edit usage" aria-label={`Edit ${entry.amount} usage`} onClick={() => setOpen(true)} className="rounded p-2 text-zinc-400"><Pencil className="h-4 w-4" /></button>
  return <form className="flex w-full flex-wrap items-center gap-2" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError('')
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/usage', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: entry.id, action: 'edit', amount: Number(form.get('amount')), date: form.get('date') }) })
      if (!response.ok) throw new Error((await response.json()).error)
      onSaved(); setOpen(false)
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save.') }
    finally { setBusy(false) }
  }}>
    <input name="amount" aria-label="Corrected amount" type="number" step="0.01" min="0.01" required defaultValue={entry.amount} className="w-24 rounded border border-zinc-600 bg-zinc-900 p-2" />
    <input name="date" aria-label="Corrected date" type="date" max={today} required defaultValue={entry.date.slice(0, 10)} className="min-w-0 rounded border border-zinc-600 bg-zinc-900 p-2" />
    <button disabled={busy} className="rounded bg-blue-600 px-3 py-2 text-white">Save</button><button type="button" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
    {error && <p role="alert" className="w-full text-red-300">{error}</p>}
  </form>
}
