'use client'

import { useRef, useState } from 'react'

export default function AdminReclassifyPage() {
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [totalUpdated, setTotalUpdated] = useState(0)
  const [batches, setBatches] = useState(0)
  const [lastBatch, setLastBatch] = useState(0)
  const cursorRef = useRef<string | null>(null)

  // ! Bitno: token drži u runtime varijabli, ili traži u input polju
  const [token, setToken] = useState('') // ručno nalepi ADMIN_TOKEN prilikom pokretanja

  async function runOnce() {
    const res = await fetch('/api/admin/reclassify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': token || '',
      },
      body: JSON.stringify({
        cursor: cursorRef.current,
        take: 250, // batch size: 50–1000, slobodno menjaj
      }),
    })

    if (!res.ok) {
      const txt = await res.text().catch(() => `${res.status}`)
      throw new Error(`API error: ${txt}`)
    }

    const data = await res.json()
    if (!data?.ok) throw new Error('API response not ok')

    cursorRef.current = data.done ? null : data.cursor ?? null
    setTotalUpdated(u => u + (data.updated || 0))
    setBatches(b => b + 1)
    setLastBatch(data.updated || 0)
    setLog(l => [
      `#${String(batches + 1).padStart(3, '0')}  batch=${data.batch}  updated=${data.updated}  cursor=${data.cursor ?? '∅'}  done=${data.done ? '✓' : '…'}`,
      ...l,
    ])

    return !!data.done
  }

  async function runAll() {
    if (!token) {
      alert('Unesi ADMIN_TOKEN pa pokreni.')
      return
    }
    setRunning(true)
    setLog([])
    setTotalUpdated(0)
    setBatches(0)
    setLastBatch(0)
    cursorRef.current = null

    try {
      // vrtimo dok API ne vrati done = true
      // (štitimo se od beskonačnosti i grešaka)
      for (let i = 0; i < 10000; i++) {
        const done = await runOnce()
        if (done) break
        // kratka pauza da ne dogori server
        await new Promise(r => setTimeout(r, 100))
      }
      setLog(l => ['💾 Gotovo — re-klasifikacija završena.', ...l])
    } catch (e: any) {
      setLog(l => [`⚠️ Greška: ${e?.message || e}`, ...l])
    } finally {
      setRunning(false)
    }
  }

  return (
    <main className="container" style={{ padding: '24px 0 32px', maxWidth: 880 }}>
      <h1 style={{ margin: '0 0 12px 0' }}>Re-klasifikacija vesti</h1>
      <p style={{ marginTop: 0, color: 'var(--muted)' }}>
        Na klik prolazi sve vesti u batch-evima i smešta u pravu kategoriju prema <code>lib/cats.ts</code>.
      </p>

      <div style={{ display: 'grid', gap: 10, maxWidth: 520, margin: '12px 0 18px' }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span className="text-sm" style={{ opacity: .8 }}>ADMIN_TOKEN</span>
          <input
            type="password"
            placeholder="Nalepi ADMIN_TOKEN"
            value={token}
            onChange={e => setToken(e.target.value)}
            style={{
              border: '1px solid var(--border)',
              background: 'var(--card)',
              color: 'var(--fg)',
              padding: '8px 10px',
              borderRadius: 10,
            }}
          />
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={runAll}
            disabled={running}
            className="sh-btn"
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: running ? 'var(--surface)' : 'var(--card)',
              cursor: running ? 'not-allowed' : 'pointer'
            }}
          >
            {running ? 'Radim…' : 'Re-klasifikuj sve'}
          </button>

          <button
            onClick={runOnce}
            disabled={running || !token}
            className="sh-btn"
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--card)',
              cursor: running ? 'not-allowed' : 'pointer'
            }}
            title="Pokreni samo jedan batch"
          >
            Jedan batch
          </button>
        </div>

        <div
          style={{
            padding: '10px 12px',
            border: '1px solid var(--border)',
            borderRadius: 10,
            background: 'var(--surface)',
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap'
          }}
        >
          <div>Ukupno ažurirano: <b>{totalUpdated}</b></div>
          <div>Batch-eva: <b>{batches}</b></div>
          <div>Zadnji batch (updated): <b>{lastBatch}</b></div>
        </div>
      </div>

      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: 10,
          background: 'var(--card)',
          padding: 12,
          minHeight: 160,
          maxHeight: 420,
          overflow: 'auto',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        {log.length === 0 ? (
          <div style={{ opacity: .6 }}>Log će se pojavljivati ovde…</div>
        ) : (
          log.map((l, i) => <div key={i}>{l}</div>)
        )}
      </div>

      <style jsx>{`
        .sh-btn:hover { background: var(--surface-weak); }
      `}</style>
    </main>
  )
}
