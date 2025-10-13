// app/admin/ui/AdminList.tsx
'use client'

import { useEffect, useState } from 'react'

type Row = {
  id: string
  title: string
  slug: string
  summary: string
  country: string | null
  category: string | null
  coverImage: string | null
  language: string | null
  publishedAt: string | null
  updatedAt: string
  sourceUrl: string | null
  computedStatus: 'draft' | 'published'
}

export default function AdminList() {
  const [rows, setRows] = useState<Row[]>([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [country, setCountry] = useState('')
  const [category, setCategory] = useState('')
  const [cursor, setCursor] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function fetchPage(reset = false) {
    setLoading(true); setErr(null); setMessage(null)
    try {
      const params = new URLSearchParams()
      if (q) params.set('query', q)
      if (status) params.set('status', status)
      if (country) params.set('country', country)
      if (category) params.set('category', category)
      if (!reset && cursor) params.set('cursor', cursor)
      params.set('limit', '20')

      const res = await fetch(`/api/admin/articles?${params.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'fetch_failed')

      const items: Row[] = data.items || []
      setRows(prev => reset ? items : [...prev, ...items])
      setNextCursor(data.nextCursor || null)
      if (!reset) setCursor(data.nextCursor || null)
    } catch (e: any) {
      setErr(e?.message || 'Greška pri učitavanju')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPage(true) }, [])

  function applyFilters(e: React.FormEvent) {
    e.preventDefault()
    setCursor(null)
    fetchPage(true)
  }

  async function togglePublish(row: Row) {
    try {
      setMessage(null)
      const newPublishedAt =
        row.computedStatus === 'published' ? null : new Date().toISOString()

      const res = await fetch(`/api/admin/article/${encodeURIComponent(row.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishedAt: newPublishedAt })
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'update_failed')

      setRows(prev => prev.map(r => r.id === row.id ? {
        ...r,
        publishedAt: newPublishedAt,
        computedStatus: newPublishedAt ? 'published' : 'draft',
      } : r))

      await fetch('/api/admin/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: row.slug, tags: ['articles', `article:${row.slug}`] })
      }).catch(() => {})

      setMessage('Status ažuriran.')
    } catch (e: any) {
      setErr(e?.message || 'Greška pri ažuriranju')
    }
  }

  async function revalidateRow(row: Row) {
    try {
      setMessage(null)
      await fetch('/api/admin/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: row.slug, tags: ['articles', `article:${row.slug}`] })
      })
      setMessage('Revalidacija poslata.')
    } catch {
      setErr('Greška pri revalidaciji')
    }
  }

  async function deleteRow(row: Row) {
    if (!confirm(`Obrisati vest: "${row.title}"?`)) return
    try {
      setMessage(null)
      const res = await fetch(`/api/admin/article/${encodeURIComponent(row.id)}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'delete_failed')

      setRows(prev => prev.filter(r => r.id !== row.id))

      // pokušaj revalidacije stranice vesti i listinga
      await fetch('/api/admin/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: row.slug, tags: ['articles', `article:${row.slug}`] })
      }).catch(() => {})

      setMessage('Vest obrisana.')
    } catch (e: any) {
      setErr(e?.message || 'Greška pri brisanju')
    }
  }

  async function loadMore() {
    if (!nextCursor || loading) return
    setCursor(nextCursor)
    await fetchPage(false)
  }

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Poslednje vesti</h2>
        <a href="/admin/new" style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #d1d5db', textDecoration: 'none' }}>
          + Nova vest
        </a>
      </div>

      <form onSubmit={applyFilters} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Pretraga…" />
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Status</option>
          <option value="published">Objavljeno</option>
          <option value="draft">Draft</option>
        </select>
        <input value={country} onChange={e => setCountry(e.target.value)} placeholder="Zemlja (npr. RS)" style={{ width: 120 }} />
        <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Kategorija" style={{ width: 180 }} />
        <button type="submit" disabled={loading}>Primeni</button>
      </form>

      {err && <p style={{ color: '#b00' }}>{err}</p>}
      {message && <p style={{ color: '#070' }}>{message}</p>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th style={{ borderBottom: '1px solid #eee', padding: 8 }}>Slika</th>
              <th style={{ borderBottom: '1px solid #eee', padding: 8 }}>Naslov</th>
              <th style={{ borderBottom: '1px solid #eee', padding: 8 }}>Status</th>
              <th style={{ borderBottom: '1px solid #eee', padding: 8 }}>Zemlja</th>
              <th style={{ borderBottom: '1px solid #eee', padding: 8 }}>Kategorija</th>
              <th style={{ borderBottom: '1px solid #eee', padding: 8 }}>Objavljeno</th>
              <th style={{ borderBottom: '1px solid #eee', padding: 8 }}>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td style={{ borderBottom: '1px solid #f2f2f2', padding: 8 }}>
                  {r.coverImage ? (
                    <img
                      src={`/api/img?url=${encodeURIComponent(r.coverImage)}`}
                      alt=""
                      style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.3' }}
                    />
                  ) : <span style={{ color: '#999' }}>—</span>}
                </td>
                <td style={{ borderBottom: '1px solid #f2f2f2', padding: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{r.title}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>{r.slug}</div>
                </td>
                <td style={{ borderBottom: '1px solid #f2f2f2', padding: 8 }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontSize: 12,
                    background: r.computedStatus === 'published' ? '#E8F5E9' : '#FFF3E0',
                    color: r.computedStatus === 'published' ? '#2E7D32' : '#EF6C00',
                    border: '1px solid #eee'
                  }}>
                    {r.computedStatus}
                  </span>
                </td>
                <td style={{ borderBottom: '1px solid #f2f2f2', padding: 8 }}>{r.country || '—'}</td>
                <td style={{ borderBottom: '1px solid #f2f2f2', padding: 8 }}>{r.category || '—'}</td>
                <td style={{ borderBottom: '1px solid #f2f2f2', padding: 8 }}>
                  {r.publishedAt ? new Date(r.publishedAt).toLocaleString() : '—'}
                </td>
                <td style={{ borderBottom: '1px solid #f2f2f2', padding: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => togglePublish(r)} style={{ padding: '6px 10px' }}>
                    {r.computedStatus === 'published' ? 'Unpublish' : 'Publish'}
                  </button>
                  <a href={`/vesti/${r.slug}`} target="_blank" rel="noreferrer" style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 8 }}>
                    Otvori
                  </a>
                  <a href={`/admin/article/${r.id}`} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 8 }}>
                    Izmeni
                  </a>
                  <button onClick={() => revalidateRow(r)} style={{ padding: '6px 10px' }}>
                    Revalidate
                  </button>
                  <button onClick={() => deleteRow(r)} style={{ padding: '6px 10px', color: '#b00', border: '1px solid #f1c5c5', borderRadius: 8, background: '#fff5f5' }}>
                    Obriši
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr><td colSpan={7} style={{ padding: 20, color: '#777' }}>Nema rezultata.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12 }}>
        {nextCursor ? (
          <button onClick={loadMore} disabled={loading} style={{ padding: '8px 14px' }}>
            {loading ? 'Učitavam…' : 'Učitaj još'}
          </button>
        ) : (
          <span style={{ color: '#777', fontSize: 12 }}>Nema više stavki.</span>
        )}
      </div>
    </section>
  )
}
