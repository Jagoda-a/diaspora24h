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

  async function deleteRow(row: Row) {
    if (!confirm(`Obrisati vest: "${row.title}"?`)) return
    try {
      setMessage(null)
      const res = await fetch(`/api/admin/article/${encodeURIComponent(row.id)}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'delete_failed')
      setRows(prev => prev.filter(r => r.id !== row.id))

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
      <style jsx>{`
        .wrap {
          max-width: 100%;
          width: 100%;
          margin: 0 auto;
          padding: 0 12px;
        }

        /* FILTERS */
        .filters {
          display: grid;
          grid-template-columns: 1fr 140px 140px 180px auto;
          gap: 8px;
          align-items: center;
          margin-bottom: 12px;
        }
        .filters input, .filters select {
          background: transparent; color: inherit;
          border: 1px solid currentColor; opacity: .9;
          border-radius: 8px; padding: 10px 12px;
          min-height: 40px;
        }
        .filters .actions-bar { display: flex; justify-content: center; }
        .btn {
          height: 40px;
          padding: 0 14px;
          border: 1px solid currentColor;
          border-radius: 8px;
          background: transparent;
          color: inherit;
          cursor: pointer;
          white-space: nowrap;
        }

        /* TABLE */
        .table-wrap { width: 100%; overflow-x: hidden; }
        .table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .table th, .table td { padding: 8px; vertical-align: middle; }
        .table th { border-bottom: 1px solid rgba(127,127,127,0.25); text-align: center; }
        .table td { border-bottom: 1px solid rgba(127,127,127,0.25); }

        /* Desktop: kolone po procentima (suma 100%) – bez h-scrolla */
        @media (min-width: 900px) {
          .col-img       { width: 10%; text-align: center; }
          .col-title     { width: 28%; text-align: left; }
          .col-status    { width: 9%;  text-align: center; }
          .col-country   { width: 7%;  text-align: center; }
          .col-category  { width: 12%; text-align: center; }
          .col-published { width: 14%; text-align: center; }
          .col-actions   { width: 20%; text-align: center; }
        }

        /* Naslov – 2 reda, bold */
        .title {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: normal;
          line-height: 1.25;
          max-height: calc(1.25em * 2);
          font-weight: 600;
        }
        .slug { display: none; }

        /* Akcije – vertikalno i centrirane */
        .col-actions { vertical-align: middle; }
        .actions {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
        }
        .action-btn {
          width: 120px;
          height: 36px;
          border: 1px solid currentColor;
          border-radius: 8px;
          background: transparent;
          color: inherit;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 10px;
          text-decoration: none;
          white-space: nowrap;
        }
        .action-btn--danger { color: #b91c1c; }

        /* ===== MOBILNI: samo ovde menjamo (desktop ostaje netaknut) ===== */
        @media (max-width: 640px) {
          .wrap { padding: 0 8px; }

          .filters {
            grid-template-columns: 1fr;
            gap: 10px;
            margin-bottom: 10px;
          }

          .table-wrap { overflow-x: auto; }
          .table {
            min-width: 560px;            /* uži nego pre (bio 720px) */
            table-layout: fixed;
          }

          /* sakrij: Status(3), Zemlja(4), Objavljeno(6) */
          .table th:nth-child(3), .table td:nth-child(3),
          .table th:nth-child(4), .table td:nth-child(4),
          .table th:nth-child(6), .table td:nth-child(6) { display: none; }

          /* 👇 Mobilne širine kolona koje ostaju: Slika (1), Naslov (2), Kategorija (5), Akcije (7) */
          .col-img       { width: 64px; text-align: center; }   /* tačno koliko thumbnail + padding */
          .col-img img   { width: 56px !important; height: 42px !important; object-fit: cover; }
          .col-title     { width: auto; }                       /* uzima ostatak */
          .col-category  { width: 110px; text-align: center; }  /* uža kategorija i centrirana */
          .col-actions   { width: 130px; text-align: center; }  /* akcije ostaju kako jesu */

          /* Akcione tipke pune širinu kolone na mobilnom */
          .action-btn { width: 100%; height: 34px; }
          .table th, .table td { padding: 6px; }                /* malo kompaktnije redove */
        }
      `}</style>

      <div className="wrap">
        <form onSubmit={applyFilters} className="filters">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Pretraga…" />
          <select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">Status</option>
            <option value="published">Objavljeno</option>
            <option value="draft">Draft</option>
          </select>
          <input value={country} onChange={e => setCountry(e.target.value)} placeholder="Zemlja (npr. RS)" />
          <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Kategorija" />
          <div className="actions-bar">
            <button type="submit" disabled={loading} className="btn">
              {loading ? 'Učitavam…' : 'Primeni'}
            </button>
          </div>
        </form>

        {err && <p style={{ color: '#b00' }}>{err}</p>}
        {message && <p style={{ color: '#070' }}>{message}</p>}

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th className="col-img">Slika</th>
                <th className="col-title">Naslov</th>
                <th className="col-status">Status</th>
                <th className="col-country">Zemlja</th>
                <th className="col-category">Kategorija</th>
                <th className="col-published">Objavljeno</th>
                <th className="col-actions">Akcije</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="col-img">
                    {r.coverImage ? (
                      <img
                        src={`/api/img?url=${encodeURIComponent(r.coverImage)}`}
                        alt=""
                        style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(127,127,127,0.25)' }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.3' }}
                      />
                    ) : <span style={{ opacity: 0.6 }}>—</span>}
                  </td>

                  <td className="col-title">
                    <span className="title">{r.title}</span>
                  </td>

                  <td className="col-status">
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 999,
                      fontSize: 12,
                      border: '1px solid rgba(127,127,127,0.35)',
                      opacity: .9,
                      whiteSpace: 'nowrap'
                    }}>
                      {r.computedStatus}
                    </span>
                  </td>

                  <td className="col-country">{r.country || '—'}</td>
                  <td className="col-category" style={{ whiteSpace: 'nowrap' }}>{r.category || '—'}</td>
                  <td className="col-published" style={{ whiteSpace: 'normal' }}>
                    {r.publishedAt ? (
                      <>
                        <span className="pub-date">{new Date(r.publishedAt).toLocaleDateString()}</span>
                        <span className="pub-time">
                          {new Date(r.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </>
                    ) : '—'}
                  </td>

                  <td className="col-actions">
                    <div className="actions">
                      <a href={`/vesti/${r.slug}`} target="_blank" rel="noreferrer" className="action-btn">Otvori</a>
                      <a href={`/admin/article/${r.id}`} className="action-btn">Izmeni</a>
                      <button onClick={() => deleteRow(r)} className="action-btn action-btn--danger">Obriši</button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !loading && (
                <tr><td colSpan={7} style={{ padding: 20, opacity: 0.7 }}>Nema rezultata.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
          {nextCursor ? (
            <button onClick={loadMore} disabled={loading} className="btn">
              {loading ? 'Učitavam…' : 'Učitaj još'}
            </button>
          ) : (
            <span style={{ opacity: 0.7, fontSize: 12 }}>Nema više stavki.</span>
          )}
        </div>
      </div>
    </section>
  )
}
