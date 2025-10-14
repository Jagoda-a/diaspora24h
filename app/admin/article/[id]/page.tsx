// app/admin/article/[id]/page.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CAT_KEYS, CAT_LABELS } from '@/lib/cats'

type Article = {
  id: string
  title: string
  slug: string
  summary: string
  coverImage?: string | null
  category?: string | null
  publishedAt?: string | null
  language?: string | null
  // SEO
  seoTitle?: string | null
  seoDescription?: string | null
  ogImage?: string | null
  canonicalUrl?: string | null
  noindex?: boolean | null
}

export default function AdminEditArticlePage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()

  const [a, setA] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [toast, setToast] = useState<{ kind: 'ok'|'err', text: string } | null>(null)

  // pamtimo prethodnu kategoriju da bismo revalidirali i staru i novu listu
  const prevCatRef = useRef<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/article/${encodeURIComponent(id)}`, { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'not_found')
        const loaded: Article = {
          id: data.id,
          title: data.title ?? '',
          slug: data.slug ?? '',
          summary: data.summary ?? '',
          coverImage: data.coverImage ?? null,
          category: data.category ?? null,
          publishedAt: data.publishedAt ?? null,
          language: data.language ?? 'sr',
          seoTitle: data.seoTitle ?? null,
          seoDescription: data.seoDescription ?? null,
          ogImage: data.ogImage ?? null,
          canonicalUrl: data.canonicalUrl ?? null,
          noindex: !!data.noindex,
        }
        setA(loaded)
        prevCatRef.current = loaded.category ?? null
      } catch (e: any) {
        setToast({ kind: 'err', text: e?.message || 'Greška pri učitavanju' })
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  async function save() {
    if (!a) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/article/${encodeURIComponent(a.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: a.title,
          summary: a.summary,
          coverImage: a.coverImage ?? null,
          category: a.category ?? null,
          publishedAt: a.publishedAt ?? null,
          language: a.language ?? 'sr',
          seoTitle: a.seoTitle ?? null,
          seoDescription: a.seoDescription ?? null,
          ogImage: a.ogImage ?? null,
          canonicalUrl: a.canonicalUrl ?? null,
          noindex: !!a.noindex,
        })
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'update_failed')

      // posle uspeha revalidiramo: samu vest, listu vesti, i obe kategorije (staru i novu)
      const slug = a.slug
      const prevCat = prevCatRef.current
      const newCat  = a.category ?? null

      const extraPaths: string[] = ['/vesti', `/vesti/${slug}`]
      if (prevCat) extraPaths.push(`/vesti/k/${prevCat}`)
      if (newCat && newCat !== prevCat) extraPaths.push(`/vesti/k/${newCat}`)

      await fetch('/api/admin/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          tags: ['articles', `article:${slug}`],
          paths: extraPaths,
        })
      }).catch(() => {})

      // ažuriramo "prethodnu" kategoriju za sledeći save
      prevCatRef.current = newCat

      setToast({ kind: 'ok', text: 'Sačuvano.' })
    } catch (e: any) {
      setToast({ kind: 'err', text: e?.message || 'Greška pri čuvanju' })
    } finally {
      setSaving(false)
    }
  }

  async function removeOne() {
    if (!a || !confirm('Obrisati ovu vest?')) return
    setRemoving(true)
    try {
      const res = await fetch(`/api/admin/article/${encodeURIComponent(a.id)}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'delete_failed')
      setToast({ kind: 'ok', text: 'Obrisano.' })
      router.push('/admin')
    } catch (e: any) {
      setToast({ kind: 'err', text: e?.message || 'Greška pri brisanju' })
    } finally {
      setRemoving(false)
    }
  }

  const styles = useMemo(() => ({
    input: { padding: 10, border: '1px solid #d1d5db', borderRadius: 10 } as React.CSSProperties,
    btn: { padding: '10px 14px', borderRadius: 10, border: '1px solid #111827', background: '#111827', color: '#fff' } as React.CSSProperties,
    btnGhost: { padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db', background: '#fff' } as React.CSSProperties,
  }), [])

  if (loading) return <main style={{ maxWidth: 900, margin: '40px auto', padding: 16 }}>Učitavam…</main>
  if (!a) return <main style={{ maxWidth: 900, margin: '40px auto', padding: 16 }}>Nema stavke.</main>

  return (
    <main style={{ maxWidth: 900, margin: '40px auto', padding: 16, display: 'grid', gap: 16 }}>
      <h1 style={{ margin: 0 }}>Izmena vesti</h1>

      <div style={{ display: 'grid', gap: 12 }}>
        <label>Naslov</label>
        <input value={a.title} onChange={e => setA({ ...a, title: e.target.value })} style={styles.input} />
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <label>Kratak opis / summary</label>
        <textarea value={a.summary} onChange={e => setA({ ...a, summary: e.target.value })} style={{ ...styles.input, minHeight: 120 }} />
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <label>Cover slika (URL)</label>
        <input value={a.coverImage ?? ''} onChange={e => setA({ ...a, coverImage: e.target.value || null })} style={styles.input} />
        {a.coverImage ? (
          <img src={`/api/img?url=${encodeURIComponent(a.coverImage)}`} alt="" style={{ maxWidth: 520, height: 'auto', borderRadius: 10, border: '1px solid #eee' }} />
        ) : null}
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <label>Kategorija</label>
        <select
          value={a?.category ?? ''}
          onChange={e => setA(prev => prev ? { ...prev, category: e.target.value || null } : prev)}
          style={styles.input}
        >
          <option value=''>— bez kategorije —</option>
          {CAT_KEYS.map(k => (
            <option key={k} value={k}>{CAT_LABELS[k]}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <label>Jezik</label>
        <input value={a.language ?? 'sr'} onChange={e => setA({ ...a, language: e.target.value || 'sr' })} style={{ ...styles.input, width: 120 }} />
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <label>Published At</label>
        <input
          type="datetime-local"
          value={a.publishedAt ? new Date(a.publishedAt).toISOString().slice(0, 16) : ''}
          onChange={e => setA({ ...a, publishedAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
          style={styles.input}
        />
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        <h3 style={{ margin: 0 }}>SEO</h3>
        <label>SEO Title</label>
        <input value={a.seoTitle ?? ''} onChange={e => setA({ ...a, seoTitle: e.target.value || null })} style={styles.input} />
        <label>SEO Description</label>
        <input value={a.seoDescription ?? ''} onChange={e => setA({ ...a, seoDescription: e.target.value || null })} style={styles.input} />
        <label>OG Image</label>
        <input value={a.ogImage ?? ''} onChange={e => setA({ ...a, ogImage: e.target.value || null })} style={styles.input} />
        <label>Canonical URL</label>
        <input value={a.canonicalUrl ?? ''} onChange={e => setA({ ...a, canonicalUrl: e.target.value || null })} style={styles.input} />
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={!!a.noindex} onChange={e => setA({ ...a, noindex: e.target.checked })} /> Noindex (ne dozvoli indeksiranje)
        </label>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={save} disabled={saving} style={styles.btn}>{saving ? 'Čuvam…' : 'Sačuvaj'}</button>
        <button onClick={removeOne} disabled={removing} style={{ ...styles.btnGhost, color: '#b00', borderColor: '#f1c5c5' }}>
          {removing ? 'Brišem…' : 'Obriši'}
        </button>
        <a href="/admin" style={{ ...styles.btnGhost, textDecoration: 'none' }}>↩ Nazad</a>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', right: 20, bottom: 20,
          background: toast.kind === 'ok' ? '#16a34a' : '#dc2626',
          color: '#fff', padding: '10px 14px', borderRadius: 10, boxShadow: '0 6px 16px rgba(0,0,0,0.2)'
        }}>{toast.text}</div>
      )}
    </main>
  )
}
