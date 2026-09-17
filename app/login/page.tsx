'use client'

import { useState } from 'react'
import { CreditCard } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, ...(sent ? { code } : {}) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      if (data.signedIn) window.location.assign('/')
      else setSent(true)
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not sign in.') }
    finally { setBusy(false) }
  }
  return <main className="min-h-screen bg-[#0f1117] px-6 py-20 text-white">
    <form onSubmit={submit} className="mx-auto max-w-sm space-y-6">
      <CreditCard className="h-10 w-10 text-blue-400" />
      <h1 className="text-3xl font-semibold">MaxPoints</h1>
      <label className="block">Email<input type="email" autoComplete="email" required value={email} disabled={sent || busy} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded border border-zinc-700 bg-zinc-900 p-3" /></label>
      {sent && <label className="block">Sign-in code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" maxLength={8} required autoFocus value={code} onChange={e => setCode(e.target.value)} className="mt-2 w-full rounded border border-zinc-700 bg-zinc-900 p-3" /></label>}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <button disabled={busy} className="w-full rounded bg-blue-600 p-3 font-medium disabled:opacity-50">{busy ? 'Please wait...' : sent ? 'Sign in' : 'Email me a code'}</button>
      {sent && <button type="button" disabled={busy} onClick={() => { setSent(false); setCode(''); setError('') }} className="text-sm text-zinc-400">Request another code</button>}
    </form>
  </main>
}
