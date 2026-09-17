'use client'
import { useEffect, useState } from 'react'
import { X, Undo2, RefreshCw, ExternalLink } from 'lucide-react'
type Suggestion = { id: string; title: string; message: string; metadata: { kind?: string; sourceUrl?: string | null } | null }
export function Suggestions() {
  const [items, setItems] = useState<Suggestion[]>([])
  const [removed, setRemoved] = useState<Suggestion | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { const controller = new AbortController(); fetch('/api/suggestions', { signal: controller.signal }).then(async response => { if (!response.ok) throw new Error(); setItems(await response.json()) }).catch(() => { if (!controller.signal.aborted) setError('Suggestions unavailable.') }); return () => controller.abort() }, [])
  async function change(item: Suggestion, dismissed: boolean) {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/suggestions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, dismissed }) }); if (!response.ok) throw new Error()
      setItems(current => dismissed ? current.filter(value => value.id !== item.id) : [item, ...current]); setRemoved(dismissed ? item : null)
    } catch { setError('Could not update suggestion.') } finally { setBusy(false) }
  }
  return <section className="border-t border-zinc-800 pt-4 space-y-3"><h3 className="font-semibold">Automation inbox ({items.length})</h3>
    {error && <div role="alert" className="flex gap-2 text-red-400">{error}<button title="Retry suggestions" onClick={async () => { try { const response = await fetch('/api/suggestions'); if (!response.ok) throw new Error(); setItems(await response.json()); setError('') } catch { setError('Suggestions unavailable.') } }}><RefreshCw className="h-4 w-4" /></button></div>}
    {removed && <button disabled={busy} onClick={() => change(removed, false)} className="flex gap-2 items-center text-sm"><Undo2 className="h-4 w-4" />Undo dismiss</button>}
    {items.map(item => <article key={item.id} className="border-b border-zinc-800 pb-3"><div className="flex justify-between gap-2"><h4 className="font-medium break-words min-w-0">{item.title}</h4><button disabled={busy} title="Dismiss suggestion" aria-label={`Dismiss ${item.title}`} onClick={() => change(item, true)}><X className="h-4 w-4" /></button></div><p className="text-sm text-zinc-400 whitespace-pre-wrap break-words">{item.message}</p>{item.metadata?.sourceUrl?.startsWith('https://') && <a href={item.metadata.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex gap-1 items-center text-sm text-blue-400">Source<ExternalLink className="h-3 w-3" /></a>}</article>)}
  </section>
}
