// app/admin/ui/AdminClient.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SeoPreview from './SeoPreview'
import AdminList from './AdminList'

type Article = {
  id: string
  title: string
  slug: string
  summary: string
  coverImage?: string | null
  category?: string | null
  publishedAt?: string | null // ISO string
  language?: string | null
  // SEO
  seoTitle?: string | null
  seoDescription?: string | null
  ogImage?: string | null
  canonicalUrl?: string | null
  noindex?: boolean | null
}

export default function AdminClient() {
  const router = useRouter()

  // 1) Kreiranje nove vesti iz linka
  const [newLink, setNewLink] = useState('')
  const [country, setCountry] = useState('rs')
  const [category, setCategory] = useState('nepoznato')
  const [language, setLanguage] = useState('sr')
  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState<string | null>(null)
  const [createOk, setCreateOk] = useState<string | null>(null)

  async function createFromLink(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true); setCreateErr(null); setCreateOk(null)
    try {
      const res = await fetch('/api/admin/article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link: newLink, country, category, language })
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data?.error || 'create_failed')

      setCreateOk(data.duplicate ? 'Vest već postoji.' : 'Nova vest je kreirana.')
      setNewLink('')
      router.refresh()
    } catch (err: any) {
      setCreateErr(err?.message || 'Greška pri kreiranju')
    } finally {
      setCreating(false)
    }
  }

  // 2) Uređivanje po ID
  const [editId, setEditId] = useState('')
  const [a, setA] = useState<Article | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [regening, setRegening] = useState(false)
  const [editErr, setEditErr] = useState<string | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  async function loadArticle(e: React.FormEvent) {
    e.preventDefault()
    const id = editId.trim()
    if (!id) return
    setLoading(true); setEditErr(null); setSaveMsg(null)
    try {
      const res = await fetch(`/api/admin/article/${encodeURIComponent(id)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'not_found')
      setA({
        id: data.id,
        title: data.title ?? '',
        slug: data.slug ?? '',
        summary: data.summary ?? '',
        coverImage: data.coverImage ?? null,
        category: data.category ?? null,
        publishedAt: data.publishedAt ?? null,
        language: data.language ?? 'sr',
        // SEO
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
        ogImage: data.ogImage ?? null,
        canonicalUrl: data.canonicalUrl ?? null,
        noindex: typeof data.noindex === 'boolean' ? data.noindex : null,
      })
    } catch (err: any) {
      setA(null)
      setEditErr(err?.message || 'Greška pri učitavanju')
    } finally {
      setLoading(false)
    }
  }

  async function saveArticle() {
    const curr = a
    if (!curr) return
    setSaving(true); setEditErr(null); setSaveMsg(null)
    try {
      const res = await fetch(`/api/admin/article/${encodeURIComponent(curr.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: curr.title,
          summary: curr.summary,
          coverImage: curr.coverImage ?? null,
          category: curr.category ?? null,
          publishedAt: curr.publishedAt ?? null,
          language: curr.language ?? 'sr',
          // SEO
          seoTitle: curr.seoTitle ?? null,
          seoDescription: curr.seoDescription ?? null,
          ogImage: curr.ogImage ?? null,
          canonicalUrl: curr.canonicalUrl ?? null,
          noindex: !!curr.noindex,
        })
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'update_failed')

      // odmah revalidate da javni sajt vidi izmene
      if (curr.slug) {
        await fetch('/api/admin/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: curr.slug,
            tags: ['articles', `article:${curr.slug}`],
          })
        }).catch(() => {})
      }

      setSaveMsg('Sačuvano.')
      router.refresh()
    } catch (err: any) {
      setEditErr(err?.message || 'Greška pri čuvanju')
    } finally {
      setSaving(false)
    }
  }

  async function deleteArticle() {
    const curr = a
    if (!curr) return
    if (!confirm('Obrisati ovaj članak?')) return
    setRemoving(true); setEditErr(null); setSaveMsg(null)
    try {
      const res = await fetch(`/api/admin/article/${encodeURIComponent(curr.id)}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'delete_failed')

      // revalidate liste
      if (curr.slug) {
        await fetch('/api/admin/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tags: ['articles'],
            paths: ['/vesti'],
          })
        }).catch(() => {})
      }

      setSaveMsg('Obrisano.')
      setA(null)
      setEditId('')
      router.refresh()
    } catch (err: any) {
      setEditErr(err?.message || 'Greška pri brisanju')
    } finally {
      setRemoving(false)
    }
  }

  async function regenerateSummary() {
    const curr = a
    if (!curr) return
    setRegening(true); setEditErr(null); setSaveMsg(null)
    try {
      const res = await fetch(`/api/admin/article/${encodeURIComponent(curr.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateSummary: true, language: curr.language || 'sr' })
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'regen_failed')
      setSaveMsg('Summary regenerisan.')
      // osveži trenutno učitani članak
      const refreshed = await fetch(`/api/admin/article/${encodeURIComponent(curr.id)}`).then(r => r.json())
      setA(prev => prev ? {
        ...prev,
        title: refreshed.title ?? prev.title,
        summary: refreshed.summary ?? prev.summary,
      } : prev)

      // revalidate detalja
      if (curr.slug) {
        await fetch('/api/admin/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: curr.slug,
            tags: ['articles', `article:${curr.slug}`],
          })
        }).catch(() => {})
      }

      router.refresh()
    } catch (err: any) {
      setEditErr(err?.message || 'Greška pri regenerisanju')
    } finally {
      setRegening(false)
    }
  }

  async function handleDeleteAll() {
  if (!confirm('Da li sigurno želiš da obrišeš SVE vesti iz baze?')) return
  const res = await fetch('/api/admin/delete-all', { method: 'DELETE' })
  const data = await res.json()
  if (data.ok) {
    alert(`Obrisano je ${data.deleted} vesti.`)
    window.location.reload()
  } else {
    alert('Greška pri brisanju vesti.')
  }
}

  return (
    <main style={{ maxWidth: 1100, margin: '24px auto', padding: 16, display: 'grid', gap: 24 }}>
      {/* Kreiranje nove vesti iz linka */}
      <section style={{ padding: 16, border: '1px solid #ddd', borderRadius: 12 }}>
        <h2 style={{ margin: 0, marginBottom: 12, fontSize: 18 }}>Dodaj novu vest iz linka</h2>
        <form onSubmit={createFromLink} style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr auto' }}>
          <input
            value={newLink}
            onChange={e => setNewLink(e.target.value)}
            placeholder="Nalepi link originalnog članka"
            required
            style={{ padding: 8, border: '1px solid #ccc', borderRadius: 8 }}
          />
          <button type="submit" disabled={creating} style={{ padding: '8px 14px' }}>
            {creating ? 'Kreiram…' : 'Kreiraj'}
          </button>
        </form>

        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Country
            <input value={country} onChange={e => setCountry(e.target.value)} style={{ padding: 6, border: '1px solid #ccc', borderRadius: 8, width: 90 }} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Category
            <input value={category} onChange={e => setCategory(e.target.value)} style={{ padding: 6, border: '1px solid #ccc', borderRadius: 8, width: 140 }} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Language
            <input value={language} onChange={e => setLanguage(e.target.value)} style={{ padding: 6, border: '1px solid #ccc', borderRadius: 8, width: 80 }} />
          </label>
        </div>

        {createErr && <p style={{ color: '#b00', marginTop: 8 }}>{createErr}</p>}
        {createOk && <p style={{ color: '#070', marginTop: 8 }}>{createOk}</p>}
        <p style={{ marginTop: 8, fontSize: 12, color: '#555' }}>
          Prvo tražim u RSS izvorima; ako nema, skrejpujem stranicu i pravim sažetak.
        </p>
      </section>

      {/* Uredi po ID */}
      <section style={{ padding: 16, border: '1px solid #ddd', borderRadius: 12 }}>
        <h2 style={{ margin: 0, marginBottom: 12, fontSize: 18 }}>Uredi vest po ID</h2>
        <form onSubmit={loadArticle} style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr auto' }}>
          <input
            value={editId}
            onChange={e => setEditId(e.target.value)}
            placeholder="Nalepi Article ID"
            required
            style={{ padding: 8, border: '1px solid #ccc', borderRadius: 8 }}
          />
          <button type="submit" disabled={loading} style={{ padding: '8px 14px' }}>
            {loading ? 'Učitavam…' : 'Učitaj'}
          </button>
        </form>

        {editErr && <p style={{ color: '#b00' }}>{editErr}</p>}
        {saveMsg && <p style={{ color: '#070' }}>{saveMsg}</p>}

        {a && (
          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <label>Naslov</label>
              <input
                value={a?.title ?? ''}
                onChange={e => setA(prev => prev ? { ...prev, title: e.target.value } : prev)}
                style={{ padding: 8, border: '1px solid #ccc', borderRadius: 8 }}
              />
            </div>

            <div style={{ display: 'grid', gap: 6 }}>
              <label>Kratak sadržaj / summary</label>
              <textarea
                value={a?.summary ?? ''}
                onChange={e => setA(prev => prev ? { ...prev, summary: e.target.value } : prev)}
                rows={6}
                style={{ padding: 8, border: '1px solid #ccc', borderRadius: 8 }}
              />
            </div>

            <div style={{ display: 'grid', gap: 6 }}>
              <label>Cover slika (URL)</label>
              <input
                value={a?.coverImage ?? ''}
                onChange={e => setA(prev => prev ? { ...prev, coverImage: e.target.value || null } : prev)}
                style={{ padding: 8, border: '1px solid #ccc', borderRadius: 8 }}
              />
              {(a?.coverImage ?? '').trim() ? (
                <div style={{ marginTop: 6 }}>
                  <img
                    src={`/api/img?url=${encodeURIComponent(a!.coverImage as string)}`}
                    alt="cover preview"
                    style={{ maxWidth: 480, height: 'auto', display: 'block', borderRadius: 8, border: '1px solid #eee' }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.3' }}
                  />
                  <small style={{ color: '#777' }}>
                    Prikaz preko /api/img proxy rute.
                  </small>
                </div>
              ) : null}
            </div>

            <div style={{ display: 'grid', gap: 6 }}>
              <label>Kategorija</label>
              <input
                value={a?.category ?? ''}
                onChange={e => setA(prev => prev ? { ...prev, category: e.target.value || null } : prev)}
                style={{ padding: 8, border: '1px solid #ccc', borderRadius: 8 }}
              />
            </div>

            <div style={{ display: 'grid', gap: 6 }}>
              <label>Datum objave (ISO)</label>
              <input
                value={a?.publishedAt ?? ''}
                onChange={e => setA(prev => prev ? { ...prev, publishedAt: e.target.value || null } : prev)}
                placeholder="2025-10-06T15:12:00.000Z"
                style={{ padding: 8, border: '1px solid #ccc', borderRadius: 8 }}
              />
            </div>

            <div style={{ display: 'grid', gap: 6 }}>
              <label>Jezik</label>
              <input
                value={a?.language ?? 'sr'}
                onChange={e => setA(prev => prev ? { ...prev, language: e.target.value || 'sr' } : prev)}
                style={{ padding: 8, border: '1px solid #ccc', borderRadius: 8, width: 100 }}
              />
            </div>

            {/* === SEO sekcija === */}
            <div style={{ marginTop: 8, padding: 12, border: '1px dashed #ddd', borderRadius: 10 }}>
              <h3 style={{ margin: '0 0 8px 0' }}>SEO</h3>

              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'grid', gap: 6 }}>
                  <label>SEO Title (override)</label>
                  <input
                    value={a?.seoTitle ?? ''}
                    onChange={e => setA(prev => prev ? { ...prev, seoTitle: e.target.value || null } : prev)}
                    placeholder="Ako ostaviš prazno, koristi se naslov vesti"
                    style={{ padding: 8, border: '1px solid #ccc', borderRadius: 8 }}
                  />
                  <small style={{ color: (a?.seoTitle ?? '').length > 65 ? '#c00' : '#777' }}>
                    {(a?.seoTitle ?? '').length}/65 preporučeno
                  </small>
                </div>

                <div style={{ display: 'grid', gap: 6 }}>
                  <label>SEO Description (meta description)</label>
                  <textarea
                    value={a?.seoDescription ?? ''}
                    onChange={e => setA(prev => prev ? { ...prev, seoDescription: e.target.value || null } : prev)}
                    rows={3}
                    placeholder="Ako ostaviš prazno, koristi se summary (skraćen na ~160 karaktera)"
                    style={{ padding: 8, border: '1px solid #ccc', borderRadius: 8 }}
                  />
                  <small style={{ color: (a?.seoDescription ?? '').length > 170 ? '#c00' : '#777' }}>
                    {(a?.seoDescription ?? '').length}/160–170 preporučeno
                  </small>
                </div>

                <div style={{ display: 'grid', gap: 6 }}>
                  <label>OG Image (og:image) — opcionalno</label>
                  <input
                    value={a?.ogImage ?? ''}
                    onChange={e => setA(prev => prev ? { ...prev, ogImage: e.target.value || null } : prev)}
                    placeholder="Ako ostaviš prazno, koristi se coverImage"
                    style={{ padding: 8, border: '1px solid #ccc', borderRadius: 8 }}
                  />
                  {(a?.ogImage ?? '').trim() ? (
                    <img
                      src={`/api/img?url=${encodeURIComponent(a!.ogImage as string)}`}
                      alt="og preview"
                      style={{ maxWidth: 480, borderRadius: 8, border: '1px solid #eee' }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.3' }}
                    />
                  ) : null}
                </div>

                <div style={{ display: 'grid', gap: 6 }}>
                  <label>Canonical URL</label>
                  <input
                    value={a?.canonicalUrl ?? ''}
                    onChange={e => setA(prev => prev ? { ...prev, canonicalUrl: e.target.value || null } : prev)}
                    placeholder="https://www.diaspora24h.com/vesti/..."
                    style={{ padding: 8, border: '1px solid #ccc', borderRadius: 8 }}
                  />
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={!!a?.noindex}
                    onChange={e => setA(prev => prev ? { ...prev, noindex: e.target.checked } : prev)}
                  />
                  Noindex (ne dozvoli indeksiranje na pretraživačima)
                </label>
              </div>
            </div>

            {/* SEO preview – efektivne vrednosti (uz override) */}
            <SeoPreview
              title={a?.seoTitle || a?.title || ''}
              description={a?.seoDescription || a?.summary || ''}
              image={(a?.ogImage || a?.coverImage) ?? null}
              slug={a?.slug ?? undefined}
            />

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={saveArticle} disabled={saving} style={{ padding: '8px 14px' }}>
                {saving ? 'Čuvam…' : 'Sačuvaj'}
              </button>
              <button onClick={regenerateSummary} disabled={regening} style={{ padding: '8px 14px' }}>
                {regening ? 'Regenerišem…' : 'Regeneriši summary'}
              </button>
              <button onClick={deleteArticle} disabled={removing} style={{ padding: '8px 14px', color: '#b00' }}>
                {removing ? 'Brišem…' : 'Obriši'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Lista sa statusom + revalidate */}
      <AdminList />

      <hr style={{ margin: '20px 0' }} />
        <button
          onClick={handleDeleteAll}
          style={{
            background: '#b91c1c',
            color: 'white',
            padding: '10px 18px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          OBRIŠI SVE VESTI
        </button>

    </main>
  )
}
