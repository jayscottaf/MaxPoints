'use client'
import { useEffect, useState } from 'react'
import { Save, RefreshCw } from 'lucide-react'

type Settings = { timezone: string; expiring: boolean; available: boolean; reminderDays: number[] | null; emailConfigured: boolean; automationConfigured: boolean; delivery: { sentAt: string | null; lastError: string | null } | null; reminders: { perkId: string; perkName: string; kind: string }[] }
export function NotificationSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  async function load() {
    setError('')
    try { const response = await fetch('/api/settings'); if (!response.ok) throw new Error('Settings unavailable.'); setSettings(await response.json()) } catch { setError('Settings unavailable. Please retry.') }
  }
  useEffect(() => { const controller = new AbortController(); fetch('/api/settings', { signal: controller.signal }).then(async response => { if (!response.ok) throw new Error(); setSettings(await response.json()) }).catch(() => { if (!controller.signal.aborted) setError('Settings unavailable. Please retry.') }); return () => controller.abort() }, [])
  return <section className="border-t border-zinc-800 pt-4 space-y-3">
    <h3 className="font-semibold">Notifications</h3>
    {error && <p role="alert" className="text-red-400">{error}</p>}
    {!settings ? <button type="button" onClick={load} title="Retry settings" aria-label="Retry settings"><RefreshCw className="h-4 w-4" /></button> : <>
      <p className="text-sm text-zinc-400">Email: {settings.emailConfigured ? 'Configured' : 'Configuration incomplete'} | Automation: {settings.automationConfigured ? 'Key configured' : 'Not connected'}</p>
      <p className="text-sm text-zinc-400">Last email accepted: {settings.delivery?.sentAt ? new Date(settings.delivery.sentAt).toLocaleString() : 'None recorded'}</p>
      {settings.delivery?.lastError && <p className="text-amber-400 text-sm">{settings.delivery.lastError}</p>}
      <form className="space-y-3" onSubmit={async event => {
        event.preventDefault(); setSaving(true); setSaved(false); setError('')
        const data = new FormData(event.currentTarget)
        const days = String(data.get('days') || '').trim()
        try {
          const response = await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timezone: data.get('timezone'), expiring: data.has('expiring'), available: data.has('available'), reminderDays: days ? days.split(',').map(value => value.trim() ? Number(value) : NaN) : null }) })
          const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Save failed.')
          setSaved(true); await load()
        } catch (error) { setError(error instanceof Error ? error.message : 'Save failed.') } finally { setSaving(false) }
      }}>
        <div className="flex flex-wrap gap-4"><label className="flex gap-2 items-center"><input name="expiring" type="checkbox" defaultChecked={settings.expiring} /> Expiring benefits</label><label className="flex gap-2 items-center"><input name="available" type="checkbox" defaultChecked={settings.available} /> Newly available benefits</label></div>
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Timezone<input name="timezone" defaultValue={settings.timezone} required className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded p-2" /></label><label className="text-sm">Reminder days before expiry<input name="days" defaultValue={settings.reminderDays?.join(', ') || ''} placeholder="Automatic" className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded p-2" /></label></div>
        <button disabled={saving} className="flex items-center gap-2 bg-blue-600 rounded px-3 py-2 disabled:opacity-50"><Save className="w-4 h-4" />{saving ? 'Saving' : 'Save preferences'}</button>{saved && <p role="status" className="text-emerald-400 text-sm">Saved</p>}
      </form>
      <details className="text-sm"><summary>Today&apos;s reminders ({settings.reminders.length})</summary><ul className="mt-2 space-y-1">{settings.reminders.map(item => <li key={item.perkId}>{item.perkName}: {item.kind}</li>)}</ul></details>
    </>}
  </section>
}
