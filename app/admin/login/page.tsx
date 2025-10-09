// app/admin/login/page.tsx
'use client'
import { useState } from 'react'

export default function AdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErr(null)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'login_failed')

      // ⬇⬇⬇ HARD REDIRECT — garantuje prelazak na /admin
      window.location.href = '/admin'
    } catch (e) {
      setErr('Pogrešno korisničko ime ili lozinka.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '48px auto', padding: 16 }}>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Admin login</h1>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Korisničko ime" required />
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Lozinka" required />
        <button type="submit" disabled={loading}>Uloguj se</button>
        {err && <p style={{ color: '#b00' }}>{err}</p>}
      </form>
    </main>
  )
}
