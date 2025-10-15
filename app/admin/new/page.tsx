// app/admin/new/page.tsx
'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import CoverUpload from '@/app/admin/ui/CoverUpload' // [DODATO] komponenta za upload

export default function AdminNewArticlePage() {
  const router = useRouter()
  const [tab, setTab] = useState<'url'|'manual'>('url')

  // URL
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
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'create_failed')
      alert('Nova vest je kreirana.')
      router.push('/admin')
    } catch (e: any) {
      alert(e?.message || 'Greška pri kreiranju')
    } finally {
      setCreating(false)
    }
  }

  // MANUAL
  const [mTitle, setMTitle] = useState('')
  const [mSummary, setMSummary] = useState('')
  const [mContent, setMContent] = useState('')
  const [mCover, setMCover] = useState('')
  const [mCategory, setMCategory] = useState('nepoznato')
  const [mCountry, setMCountry] = useState('rs')
  const [mLang, setMLang] = useState('sr')
  const [mPublishedAt, setMPublishedAt] = useState<string>('')

  const [savingM, setSavingM] = useState(false)

  async function createManual(e: React.FormEvent) {
    e.preventDefault()
    setSavingM(true)
    try {
      const res = await fetch('/api/admin/article/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: mTitle,
          summary: mSummary || null,
          content: mContent || null,
          coverImage: mCover || null,
          category: mCategory || null,
          country: mCountry || 'rs',
          language: mLang || 'sr',
          publishedAt: mPublishedAt ? new Date(mPublishedAt).toISOString() : null,
        })
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'create_failed')
      alert('Nova vest je dodata.')
      router.push(`/admin/article/${encodeURIComponent(data.created.id)}`)
    } catch (e: any) {
      alert(e?.message || 'Greška pri čuvanju')
    } finally {
      setSavingM(false)
    }
  }

  const styles = useMemo(() => ({
    input: { padding: 10, border: '1px solid #d1d5db', borderRadius: 10 } as React.CSSProperties,
    btn: { padding: '10px 14px', borderRadius: 10, border: '1px solid #111827', background: '#111827', color: '#fff' } as React.CSSProperties,
    btnGhost: { padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db', background: '#fff' } as React.CSSProperties,
    tabBtn: (active: boolean) => ({
      padding: '8px 12px', borderRadius: 999, border: '1px solid #d1d5db',
      background: active ? '#111827' : '#fff',
      color: active ? '#fff' : '#111827',
    }) as React.CSSProperties,
  }), [])

  return (
    <main style={{ maxWidth: 900, margin: '40px auto', padding: 16, display: 'grid', gap: 18 }}>
      <h1 style={{ margin: 0 }}>Nova vest</h1>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setTab('url')} style={styles.tabBtn(tab === 'url')}>Preko URL</button>
        <button onClick={() => setTab('manual')} style={styles.tabBtn(tab === 'manual')}>Ručno</button>
        <a href="/admin" style={{ marginLeft: 'auto', ...styles.btnGhost, textDecoration: 'none' }}>↩ Nazad</a>
      </div>

      {tab === 'url' && (
        <form onSubmit={createFromLink} style={{ display: 'grid', gap: 12 }}>
          <label>URL vesti</label>
          <input value={newLink} onChange={e => setNewLink(e.target.value)} placeholder="https://…" style={styles.input} required />

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input value={country} onChange={e => setCountry(e.target.value)} placeholder="Zemlja (rs…)" style={{ ...styles.input, width: 130 }} />
            <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Kategorija" style={{ ...styles.input, width: 200 }} />
            <input value={language} onChange={e => setLanguage(e.target.value)} placeholder="Jezik (sr…)" style={{ ...styles.input, width: 130 }} />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="submit" disabled={creating} style={styles.btn}>{creating ? 'Kreiram…' : 'Kreiraj iz URL-a'}</button>
          </div>
        </form>
      )}

      {tab === 'manual' && (
        <form onSubmit={createManual} style={{ display: 'grid', gap: 12 }}>
          <label>Naslov *</label>
          <input value={mTitle} onChange={e => setMTitle(e.target.value)} style={styles.input} required />

          <label>Kratak opis (summary)</label>
          <textarea value={mSummary} onChange={e => setMSummary(e.target.value)} style={{ ...styles.input, minHeight: 100 }} />

          <label>Tekst (content)</label>
          <textarea value={mContent} onChange={e => setMContent(e.target.value)} style={{ ...styles.input, minHeight: 220 }} />

          <label>Cover slika (URL)</label>
          <input value={mCover} onChange={e => setMCover(e.target.value)} style={styles.input} />

          {/* [DODATO] Upload sa uređaja – jedna slika služi i kao cover i kao glavna slika vesti */}
          <div style={{ display: 'grid', gap: 6 }}>
            <label>Upload sa uređaja</label>
            <CoverUpload
              onUploaded={(u) => {
                setMCover(u) // postavi cover
                // ubaci sliku u sadržaj samo ako već nema <img>
                setMContent(prev => (prev.includes('<img ')
                  ? prev
                  : `<p><img src="${u}" alt="" style="max-width:100%;height:auto;border-radius:8px" /></p>\n${prev}`
                ))
              }}
            />
            {mCover && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src={mCover} alt="" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                <code style={{ fontSize: 12, color: '#64748b', wordBreak: 'break-all' }}>{mCover}</code>
              </div>
            )}
          </div>
          {/* [KRAJ DODATKA] */}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input value={mCategory} onChange={e => setMCategory(e.target.value)} placeholder="Kategorija" style={{ ...styles.input, width: 200 }} />
            <input value={mCountry} onChange={e => setMCountry(e.target.value)} placeholder="Zemlja (rs…)" style={{ ...styles.input, width: 130 }} />
            <input value={mLang} onChange={e => setMLang(e.target.value)} placeholder="Jezik (sr…)" style={{ ...styles.input, width: 130 }} />
            <div style={{ display: 'grid' }}>
              <label style={{ fontSize: 12, color: '#666' }}>Published at</label>
              <input type="datetime-local" value={mPublishedAt} onChange={e => setMPublishedAt(e.target.value)} style={{ ...styles.input, width: 220 }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="submit" disabled={savingM} style={styles.btn}>{savingM ? 'Čuvam…' : 'Dodaj ručno'}</button>
          </div>
        </form>
      )}
    </main>
  )
}
