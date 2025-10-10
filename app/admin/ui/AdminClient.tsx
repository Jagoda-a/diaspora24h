'use client'

import { useEffect, useMemo, useState } from 'react'
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
  publishedAt?: string | null
  language?: string | null
  // SEO
  seoTitle?: string | null
  seoDescription?: string | null
  ogImage?: string | null
  canonicalUrl?: string | null
  noindex?: boolean | null
}

const navItems = [
  { id: 'create', label: 'Dodaj vest' },
  { id: 'edit', label: 'Uredi vest' },
  { id: 'backfill', label: 'Backfill (covers & kat.)' },
  { id: 'list', label: 'Lista vesti' },
]

export default function AdminClient() {
  const router = useRouter()
  const [active, setActive] = useState<string>('create')

  // ====== GLOBALNE PORUKE ======
  const [toast, setToast] = useState<{ kind: 'ok'|'err', text: string } | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  // ====== DODAJ NOVU VEST ======
  const [newLink, setNewLink] = useState('')
  const [country, setCountry] = useState('rs')
  const [category, setCategory] = useState('nepoznato')
  const [language, setLanguage] = useState('sr')
  const [creating, setCreating] = useState(false)

  async function createFromLink(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await fetch('/api/admin/article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link: newLink, country, category, language })
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data?.error || 'create_failed')

      setToast({ kind: 'ok', text: data.duplicate ? 'Vest već postoji.' : 'Nova vest je kreirana.' })
      setNewLink('')
      router.refresh()
    } catch (err: any) {
      setToast({ kind: 'err', text: err?.message || 'Greška pri kreiranju' })
    } finally {
      setCreating(false)
    }
  }

  // ====== UREDI PO ID ======
  const [editId, setEditId] = useState('')
  const [a, setA] = useState<Article | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [regening, setRegening] = useState(false)

  async function loadArticle(e: React.FormEvent) {
    e.preventDefault()
    const id = editId.trim()
    if (!id) return
    setLoading(true)
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
      setToast({ kind: 'ok', text: 'Vest učitana.' })
    } catch (err: any) {
      setA(null)
      setToast({ kind: 'err', text: err?.message || 'Greška pri učitavanju' })
    } finally {
      setLoading(false)
    }
  }

  async function saveArticle() {
    const curr = a
    if (!curr) return
    setSaving(true)
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

      if (curr.slug) {
        await fetch('/api/admin/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: curr.slug, tags: ['articles', `article:${curr.slug}`] })
        }).catch(() => {})
      }

      setToast({ kind: 'ok', text: 'Sačuvano.' })
      router.refresh()
    } catch (err: any) {
      setToast({ kind: 'err', text: err?.message || 'Greška pri čuvanju' })
    } finally {
      setSaving(false)
    }
  }

  async function deleteArticle() {
    const curr = a
    if (!curr) return
    if (!confirm('Obrisati ovaj članak?')) return
    setRemoving(true)
    try {
      const res = await fetch(`/api/admin/article/${encodeURIComponent(curr.id)}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'delete_failed')

      if (curr.slug) {
        await fetch('/api/admin/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: ['articles'], paths: ['/vesti'] })
        }).catch(() => {})
      }

      setToast({ kind: 'ok', text: 'Obrisano.' })
      setA(null)
      setEditId('')
      router.refresh()
    } catch (err: any) {
      setToast({ kind: 'err', text: err?.message || 'Greška pri brisanju' })
    } finally {
      setRemoving(false)
    }
  }

  async function regenerateSummary() {
    const curr = a
    if (!curr) return
    setRegening(true)
    try {
      const res = await fetch(`/api/admin/article/${encodeURIComponent(curr.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateSummary: true, language: curr.language || 'sr' })
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'regen_failed')

      // refresh loaded
      const refreshed = await fetch(`/api/admin/article/${encodeURIComponent(curr.id)}`).then(r => r.json())
      setA(prev => prev ? { ...prev, title: refreshed.title ?? prev.title, summary: refreshed.summary ?? prev.summary } : prev)

      if (curr.slug) {
        await fetch('/api/admin/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: curr.slug, tags: ['articles', `article:${curr.slug}`] })
        }).catch(() => {})
      }

      setToast({ kind: 'ok', text: 'Summary regenerisan.' })
      router.refresh()
    } catch (err: any) {
      setToast({ kind: 'err', text: err?.message || 'Greška pri regenerisanju' })
    } finally {
      setRegening(false)
    }
  }

  // ====== DELETE ALL (već imao) ======
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

  // ====== BACKFILL PANEL ======
  const [adminToken, setAdminToken] = useState('')
  const [bfLimit, setBfLimit] = useState(200)
  const [bfOnlyMissing, setBfOnlyMissing] = useState(true)
  const [bfForce, setBfForce] = useState(false)
  const [bfDry, setBfDry] = useState(false)
  const [busyBF, setBusyBF] = useState(false)

  async function runBackfillCovers() {
    setBusyBF(true)
    try {
      const p = new URLSearchParams()
      p.set('limit', String(bfLimit))
      if (bfDry) p.set('dryRun', '1')
      if (!bfOnlyMissing) p.set('onlyMissing', '0')
      if (bfForce) p.set('force', '1')
      if (adminToken) p.set('token', adminToken)

      const res = await fetch(`/api/admin/backfill-covers?${p.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'backfill_failed')
      setToast({ kind: 'ok', text: `Covers: checked ${data.checked ?? data.total ?? 0}, updated ${data.updated ?? 0}` })
    } catch (e: any) {
      setToast({ kind: 'err', text: e?.message || 'Greška u backfill covers' })
    } finally {
      setBusyBF(false)
    }
  }

  const [busyCat, setBusyCat] = useState(false)
  const [catLimit, setCatLimit] = useState(300)
  const [catDry, setCatDry] = useState(false)

  async function runBackfillCategories() {
    setBusyCat(true)
    try {
      const p = new URLSearchParams()
      p.set('limit', String(catLimit))
      if (catDry) p.set('dryRun', '1')
      if (adminToken) p.set('token', adminToken)

      const res = await fetch(`/api/admin/backfill-categories?${p.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'backfill_failed')
      const msg = `Kategorije: checked ${data.checked ?? 0}, updated ${data.updated ?? 0}`
      setToast({ kind: 'ok', text: msg })
    } catch (e: any) {
      setToast({ kind: 'err', text: e?.message || 'Greška u backfill kategorijama' })
    } finally {
      setBusyCat(false)
    }
  }

  // ====== UI LAYOUT ======
  const styles = useMemo(() => ({
    shell: {
      display: 'grid',
      gridTemplateColumns: '260px 1fr',
      gap: 0,
      minHeight: 'calc(100vh - 40px)',
      maxWidth: 1400,
      margin: '20px auto',
      borderRadius: 14,
      overflow: 'hidden',
      border: '1px solid #e5e7eb',
      boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
      background: '#fff'
    } as React.CSSProperties,
    sidebar: {
      background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)',
      color: '#e5e7eb',
      padding: 18,
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    } as React.CSSProperties,
    brand: { fontWeight: 700, letterSpacing: 0.3, fontSize: 18 } as React.CSSProperties,
    navBtn: (isActive: boolean) => ({
      textAlign: 'left',
      padding: '10px 12px',
      borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.08)',
      background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
      color: '#e5e7eb',
      cursor: 'pointer'
    }) as React.CSSProperties,
    main: { padding: 24, background: '#fafafa' } as React.CSSProperties,
    card: {
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: 16
    } as React.CSSProperties,
    h2: { margin: 0, marginBottom: 10, fontSize: 18 } as React.CSSProperties,
    grid2: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 } as React.CSSProperties,
    inputsRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 } as React.CSSProperties,
    input: { padding: 10, border: '1px solid #d1d5db', borderRadius: 10 } as React.CSSProperties,
    btn: { padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db', background: '#111827', color: '#fff' } as React.CSSProperties,
    btnGhost: { padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db', background: '#fff' } as React.CSSProperties,
    toast: (kind: 'ok'|'err') => ({
      position: 'fixed', right: 20, bottom: 20,
      background: kind === 'ok' ? '#16a34a' : '#dc2626',
      color: '#fff', padding: '10px 14px', borderRadius: 10, boxShadow: '0 6px 16px rgba(0,0,0,0.2)'
    }) as React.CSSProperties
  }), [])

  return (
    <div style={styles.shell}>
      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        <div style={styles.brand}>Diaspora24h · Admin</div>
        <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
          {navItems.map(n => (
            <button
              key={n.id}
              onClick={() => setActive(n.id)}
              style={styles.navBtn(active === n.id)}
            >
              {n.label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 'auto', fontSize: 12, opacity: 0.8 }}>
          Savet: posle izmena klikni “Revalidate” u listi da keš odmah povuče novo.
        </div>
      </aside>

      {/* MAIN */}
      <main style={styles.main}>
        {/* CREATE */}
        {active === 'create' && (
          <section style={{ ...styles.card, marginBottom: 18 }}>
            <h2 style={styles.h2}>Dodaj novu vest iz linka</h2>

            <form onSubmit={createFromLink} style={styles.grid2}>
              <input
                value={newLink}
                onChange={e => setNewLink(e.target.value)}
                placeholder="Nalepi link originalnog članka"
                required
                style={styles.input}
              />
              <button type="submit" disabled={creating} style={styles.btn}>
                {creating ? 'Kreiram…' : 'Kreiraj'}
              </button>
            </form>

            <div style={styles.inputsRow}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Country
                <input value={country} onChange={e => setCountry(e.target.value)} style={{ ...styles.input, width: 90 }} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Category
                <input value={category} onChange={e => setCategory(e.target.value)} style={{ ...styles.input, width: 140 }} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Language
                <input value={language} onChange={e => setLanguage(e.target.value)} style={{ ...styles.input, width: 80 }} />
              </label>
            </div>

            <p style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
              Prvo tražim u RSS izvorima; ako nema, skrejpujem stranicu i pravim sažetak.
            </p>
          </section>
        )}

        {/* EDIT */}
        {active === 'edit' && (
          <section style={{ display: 'grid', gap: 18 }}>
            <div style={styles.card}>
              <h2 style={styles.h2}>Uredi vest po ID</h2>
              <form onSubmit={loadArticle} style={styles.grid2}>
                <input
                  value={editId}
                  onChange={e => setEditId(e.target.value)}
                  placeholder="Nalepi Article ID"
                  required
                  style={styles.input}
                />
                <button type="submit" disabled={loading} style={styles.btn}>
                  {loading ? 'Učitavam…' : 'Učitaj'}
                </button>
              </form>
            </div>

            {a && (
              <div style={{ display: 'grid', gap: 18 }}>
                <div style={styles.card}>
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ display: 'grid', gap: 6 }}>
                      <label>Naslov</label>
                      <input
                        value={a?.title ?? ''}
                        onChange={e => setA(prev => prev ? { ...prev, title: e.target.value } : prev)}
                        style={styles.input}
                      />
                    </div>

                    <div style={{ display: 'grid', gap: 6 }}>
                      <label>Kratak sadržaj / summary</label>
                      <textarea
                        value={a?.summary ?? ''}
                        onChange={e => setA(prev => prev ? { ...prev, summary: e.target.value } : prev)}
                        rows={6}
                        style={{ ...styles.input, resize: 'vertical' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gap: 6 }}>
                      <label>Cover slika (URL)</label>
                      <input
                        value={a?.coverImage ?? ''}
                        onChange={e => setA(prev => prev ? { ...prev, coverImage: e.target.value || null } : prev)}
                        style={styles.input}
                      />
                      {(a?.coverImage ?? '').trim() ? (
                        <div style={{ marginTop: 6 }}>
                          <img
                            src={`/api/img?url=${encodeURIComponent(a!.coverImage as string)}`}
                            alt="cover preview"
                            style={{ maxWidth: 520, height: 'auto', display: 'block', borderRadius: 10, border: '1px solid #eee' }}
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.3' }}
                          />
                          <small style={{ color: '#6b7280' }}>
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
                        style={styles.input}
                      />
                    </div>

                    <div style={{ display: 'grid', gap: 6 }}>
                      <label>Datum objave (ISO)</label>
                      <input
                        value={a?.publishedAt ?? ''}
                        onChange={e => setA(prev => prev ? { ...prev, publishedAt: e.target.value || null } : prev)}
                        placeholder="2025-10-06T15:12:00.000Z"
                        style={styles.input}
                      />
                    </div>

                    <div style={{ display: 'grid', gap: 6 }}>
                      <label>Jezik</label>
                      <input
                        value={a?.language ?? 'sr'}
                        onChange={e => setA(prev => prev ? { ...prev, language: e.target.value || 'sr' } : prev)}
                        style={{ ...styles.input, width: 110 }}
                      />
                    </div>
                  </div>
                </div>

                {/* SEO kartica */}
                <div style={styles.card}>
                  <h3 style={{ margin: '0 0 8px 0' }}>SEO</h3>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ display: 'grid', gap: 6 }}>
                      <label>SEO Title (override)</label>
                      <input
                        value={a?.seoTitle ?? ''}
                        onChange={e => setA(prev => prev ? { ...prev, seoTitle: e.target.value || null } : prev)}
                        placeholder="Ako ostaviš prazno, koristi se naslov vesti"
                        style={styles.input}
                      />
                      <small style={{ color: (a?.seoTitle ?? '').length > 65 ? '#c00' : '#6b7280' }}>
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
                        style={{ ...styles.input, resize: 'vertical' }}
                      />
                      <small style={{ color: (a?.seoDescription ?? '').length > 170 ? '#c00' : '#6b7280' }}>
                        {(a?.seoDescription ?? '').length}/160–170 preporučeno
                      </small>
                    </div>

                    <div style={{ display: 'grid', gap: 6 }}>
                      <label>OG Image (og:image) — opcionalno</label>
                      <input
                        value={a?.ogImage ?? ''}
                        onChange={e => setA(prev => prev ? { ...prev, ogImage: e.target.value || null } : prev)}
                        placeholder="Ako ostaviš prazno, koristi se coverImage"
                        style={styles.input}
                      />
                      {(a?.ogImage ?? '').trim() ? (
                        <img
                          src={`/api/img?url=${encodeURIComponent(a!.ogImage as string)}`}
                          alt="og preview"
                          style={{ maxWidth: 520, borderRadius: 10, border: '1px solid #eee' }}
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
                        style={styles.input}
                      />
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={!!a?.noindex}
                        onChange={e => setA(prev => prev ? { ...prev, noindex: e.target.checked } : prev)}
                      />
                      Noindex (ne dozvoli indeksiranje)
                    </label>
                  </div>

                  <SeoPreview
                    title={a?.seoTitle || a?.title || ''}
                    description={a?.seoDescription || a?.summary || ''}
                    image={(a?.ogImage || a?.coverImage) ?? null}
                    slug={a?.slug ?? undefined}
                  />

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                    <button onClick={saveArticle} disabled={saving} style={styles.btn}>
                      {saving ? 'Čuvam…' : 'Sačuvaj'}
                    </button>
                    <button onClick={regenerateSummary} disabled={regening} style={styles.btnGhost}>
                      {regening ? 'Regenerišem…' : 'Regeneriši summary'}
                    </button>
                    <button onClick={deleteArticle} disabled={removing} style={{ ...styles.btnGhost, color: '#b91c1c', borderColor: '#ef4444' }}>
                      {removing ? 'Brišem…' : 'Obriši'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* BACKFILL */}
        {active === 'backfill' && (
          <section style={{ display: 'grid', gap: 18 }}>
            <div style={styles.card}>
              <h2 style={styles.h2}>Backfill Covers</h2>
              <div style={{ display: 'grid', gap: 10, maxWidth: 720 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <input
                    placeholder="BACKFILL_TOKEN (opciono ovde, ili postavi u env)"
                    value={adminToken}
                    onChange={e => setAdminToken(e.target.value)}
                    style={{ ...styles.input, flex: 1, minWidth: 260 }}
                  />
                  <input
                    type="number"
                    value={bfLimit}
                    min={1}
                    onChange={e => setBfLimit(parseInt(e.target.value || '1', 10))}
                    style={{ ...styles.input, width: 110 }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label><input type="checkbox" checked={bfOnlyMissing} onChange={e => setBfOnlyMissing(e.target.checked)} /> Samo gde fali</label>
                  <label><input type="checkbox" checked={bfForce} onChange={e => setBfForce(e.target.checked)} /> Force (prepiši postojeće)</label>
                  <label><input type="checkbox" checked={bfDry} onChange={e => setBfDry(e.target.checked)} /> Dry run</label>
                </div>

                <div>
                  <button onClick={runBackfillCovers} disabled={busyBF} style={styles.btn}>
                    {busyBF ? 'Pokrećem…' : 'Pokreni backfill covers'}
                  </button>
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <h2 style={styles.h2}>Backfill Kategorije</h2>
              <div style={{ display: 'grid', gap: 10, maxWidth: 720 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <input
                    type="number"
                    value={catLimit}
                    min={1}
                    onChange={e => setCatLimit(parseInt(e.target.value || '1', 10))}
                    style={{ ...styles.input, width: 110 }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={catDry} onChange={e => setCatDry(e.target.checked)} />
                    Dry run
                  </label>
                </div>

                <div>
                  <button onClick={runBackfillCategories} disabled={busyCat} style={styles.btn}>
                    {busyCat ? 'Pokrećem…' : 'Pokreni backfill kategorija'}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ ...styles.card, borderStyle: 'dashed' }}>
              <h3 style={{ margin: '0 0 8px 0' }}>Opasno</h3>
              <p style={{ margin: '6px 0 12px 0', color: '#6b7280' }}>
                Obrisati sve vesti iz baze (nepovratno).
              </p>
              <button
                onClick={handleDeleteAll}
                style={{
                  background: '#b91c1c',
                  color: 'white',
                  padding: '10px 18px',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                OBRIŠI SVE VESTI
              </button>
            </div>
          </section>
        )}

        {/* LISTA */}
        {active === 'list' && (
          <section style={styles.card}>
            <h2 style={styles.h2}>Poslednje vesti</h2>
            <AdminList />
          </section>
        )}
      </main>

      {/* TOAST */}
      {toast && (
        <div style={styles.toast(toast.kind)}>
          {toast.text}
        </div>
      )}
    </div>
  )
}
