// app/admin/ui/AdminBulkCategoryClient.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { CAT_KEYS } from '@/lib/cats'

type Row = {
  id: string
  title: string
  slug: string
  category: string | null
  publishedAt: string | null
  coverImage: string | null
}

type SearchResp = {
  ok: boolean
  total: number
  page: number
  pageSize: number
  items: Row[]
  error?: string
}

export default function AdminBulkCategoryClient() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)

  // filteri
  const [q, setQ] = useState('')
  const [filterCat, setFilterCat] = useState<'sve' | string>('sve')
  const [targetCat, setTargetCat] = useState<string>('sport')

  // paginacija
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 30
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // selekcija
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected])

  const categories = useMemo(() => ['sve', ...CAT_KEYS], [])

  // fetch liste
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (q.trim()) params.set('q', q.trim())
        if (filterCat) params.set('category', filterCat)
        params.set('page', String(page))
        params.set('pageSize', String(pageSize))

        const res = await fetch(`/api/admin/articles/search?${params.toString()}`, { cache: 'no-store' })
        const data: SearchResp = await res.json()
        if (!cancelled) {
          if (data.ok) {
            setRows(data.items)
            setTotal(data.total)
            setSelected({})
          } else {
            console.error(data.error)
            setRows([])
            setTotal(0)
          }
        }
      } catch (e) {
        console.error(e)
        if (!cancelled) {
          setRows([])
          setTotal(0)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [q, filterCat, page])

  // select helpers
  const allOnPageChecked = rows.length > 0 && rows.every(r => selected[r.id])
  const someOnPageChecked = rows.some(r => selected[r.id])

  const toggleAllOnPage = (checked: boolean) => {
    const next = { ...selected }
    rows.forEach(r => { next[r.id] = checked })
    setSelected(next)
  }

  const toggleOne = (id: string, checked: boolean) => {
    setSelected(prev => ({ ...prev, [id]: checked }))
  }

  // bulk action
  const doBulk = async () => {
    if (!targetCat) return alert('Izaberi ciljnu kategoriju.')
    if (selectedIds.length === 0) return alert('Nema čekiranih vesti.')
    if (!CAT_KEYS.includes(targetCat as any)) return alert('Pogrešna ciljna kategorija.')
    if (!confirm(`Prebaciti ${selectedIds.length} vesti u kategoriju: ${targetCat}?`)) return

    try {
      const res = await fetch('/api/admin/bulk-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, category: targetCat }),
      })
      const data = await res.json()
      if (!data.ok) {
        alert(`Greška: ${data.error || 'nepoznato'}`)
        return
      }
      alert(`Prebačeno: ${data.count}`)

      // osveži listu
      const params = new URLSearchParams()
      if (q.trim()) params.set('q', q.trim())
      if (filterCat) params.set('category', filterCat)
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))
      const ref = await fetch(`/api/admin/articles/search?${params.toString()}`, { cache: 'no-store' })
      const d: SearchResp = await ref.json()
      if (d.ok) {
        setRows(d.items)
        setTotal(d.total)
        setSelected({})
      }
    } catch (e: any) {
      alert(`Greška: ${e?.message ?? 'nepoznato'}`)
    }
  }

  // stil
  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
    fontSize: 14,
  }
  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: '1px solid var(--border)',
    position: 'sticky' as any,
    top: 0,
    background: 'var(--card)',
    zIndex: 1,
  }
  const tdStyle: React.CSSProperties = {
    padding: '10px 12px',
    borderBottom: '1px solid var(--border)',
    verticalAlign: 'middle',
  }

  return (
    <section style={{ marginTop: 16 }}>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
        <input
          value={q}
          onChange={(e) => { setPage(1); setQ(e.target.value) }}
          placeholder="Pretraga po naslovu/sažetku/slug-u…"
          style={{ flex: '1 1 260px', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', background: 'var(--card)', color: 'var(--fg)' }}
        />
        <select
          value={filterCat}
          onChange={(e) => { setPage(1); setFilterCat(e.target.value) }}
          style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', background: 'var(--card)', color: 'var(--fg)' }}
          aria-label="Filter kategorija"
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <span style={{ width: 10 }} />

        <span style={{ fontSize: 13, color: 'var(--muted)' }}>Ciljna kategorija:</span>
        <select
          value={targetCat}
          onChange={(e) => setTargetCat(e.target.value)}
          style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', background: 'var(--card)', color: 'var(--fg)' }}
          aria-label="Ciljna kategorija"
        >
          {CAT_KEYS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <button
          onClick={doBulk}
          disabled={loading || selectedIds.length === 0}
          style={{
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '8px 14px',
            background: 'var(--card)',
            color: 'var(--fg)',
            opacity: loading || selectedIds.length === 0 ? 0.6 : 1,
            cursor: loading || selectedIds.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          Prebaci u kategoriju
        </button>
      </div>

      {/* Status bar */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={allOnPageChecked}
            ref={el => { if (el) el.indeterminate = !allOnPageChecked && someOnPageChecked }}
            onChange={(e) => toggleAllOnPage(e.currentTarget.checked)}
          />
          Označi sve na ovoj stranici
        </label>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          Izabrano: {selectedIds.length} / {total} ukupno
        </div>
      </div>

      {/* TABELA — kolone: checkbox, slika, naslov, kategorija */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 36 }}>
                <input
                  type="checkbox"
                  checked={allOnPageChecked}
                  ref={el => { if (el) el.indeterminate = !allOnPageChecked && someOnPageChecked }}
                  onChange={(e) => toggleAllOnPage(e.currentTarget.checked)}
                  aria-label="Označi sve"
                />
              </th>
              <th style={{ ...thStyle, width: 110 }}>Slika</th>
              <th style={{ ...thStyle }}>Naslov</th>
              <th style={{ ...thStyle, width: 180 }}>Kategorija</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: 'var(--muted)' }}>
                  {loading ? 'Učitavam…' : 'Nema rezultata.'}
                </td>
              </tr>
            )}

            {rows.map((r) => (
              <tr key={r.id}>
                <td style={tdStyle}>
                  <input
                    type="checkbox"
                    checked={!!selected[r.id]}
                    onChange={(e) => toggleOne(r.id, e.currentTarget.checked)}
                    aria-label={`Označi ${r.title}`}
                  />
                </td>

                <td style={{ ...tdStyle }}>
                  <div style={{ position: 'relative', width: 96, height: 64, borderRadius: 8, overflow: 'hidden', background: 'var(--muted2,#eee)' }}>
                    {r.coverImage ? (
                      <Image src={r.coverImage} alt={r.title} fill style={{ objectFit: 'cover' }} />
                    ) : null}
                  </div>
                </td>

                <td style={tdStyle}>
                  <div style={{ display: 'grid', gap: 4 }}>
                    <Link href={`/vesti/${r.slug}`} target="_blank" className="hover:underline">
                      {r.title}
                    </Link>
                    <code style={{ fontSize: 12, opacity: 0.7 }}>{r.id}</code>
                  </div>
                </td>

                <td style={tdStyle}>{r.category || 'nepoznato'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginacija */}
      {totalPages > 1 && (
        <nav style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            aria-label="Prethodna"
            style={{ border: '1px solid var(--border)', borderRadius: 999, padding: '6px 12px', opacity: page <= 1 ? 0.5 : 1 }}
          >
            ←
          </button>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            Strana {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            aria-label="Sledeća"
            style={{ border: '1px solid var(--border)', borderRadius: 999, padding: '6px 12px', opacity: page >= totalPages ? 0.5 : 1 }}
          >
            →
          </button>
        </nav>
      )}
    </section>
  )
}
