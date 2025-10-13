// app/admin/ui/AdminClient.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminList from './AdminList'

const navItems = [
  { id: 'new', label: 'Dodaj vest' },
  { id: 'edit', label: 'Uredi vest' },
  { id: 'backfill', label: 'Backfill (covers & kat.)' },
  { id: 'list', label: 'Lista vesti' },
]

export default function AdminClient() {
  const router = useRouter()
  const [active, setActive] = useState<string>('new')

  // ====== GLOBALNI TOAST ======
  const [toast, setToast] = useState<{ kind: 'ok'|'err', text: string } | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  // ====== “DODAJ VEST” (samo linkovi) ======
  function goNew(tab: 'url'|'manual') {
    const u = new URL('/admin/new', window.location.origin)
    u.searchParams.set('t', tab)
    router.push(u.toString())
  }

  // ====== “UREDI VEST” (brzi skok po ID) ======
  const [editId, setEditId] = useState('')
  function openEdit(e: React.FormEvent) {
    e.preventDefault()
    const id = editId.trim()
    if (!id) return setToast({ kind: 'err', text: 'Unesi ID vesti.' })
    router.push(`/admin/article/${encodeURIComponent(id)}`)
  }

  // ====== DELETE ALL (postojeće) ======
  async function handleDeleteAll() {
    if (!confirm('Da li sigurno želiš da obrišeš SVE vesti iz baze?')) return
    try {
      const res = await fetch('/api/admin/delete-all', { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'delete_all_failed')
      setToast({ kind: 'ok', text: `Obrisano: ${data.deleted}` })
      router.refresh()
    } catch (e: any) {
      setToast({ kind: 'err', text: e?.message || 'Greška pri brisanju' })
    }
  }

  // ====== BACKFILL ======
  const [adminToken, setAdminToken] = useState('')
  // covers
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

  // categories
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
      setToast({ kind: 'ok', text: `Kategorije: checked ${data.checked ?? 0}, updated ${data.updated ?? 0}` })
    } catch (e: any) {
      setToast({ kind: 'err', text: e?.message || 'Greška u backfill kategorijama' })
    } finally {
      setBusyCat(false)
    }
  }

  // ====== UI ======
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
    input: { padding: 10, border: '1px solid #d1d5db', borderRadius: 10 } as React.CSSProperties,
    btn: { padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db', background: '#111827', color: '#fff' } as React.CSSProperties,
    btnGhost: { padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db', background: '#fff' } as React.CSSProperties,
    inputsRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 } as React.CSSProperties,
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
          Savet: u “Listi vesti” imaš Izmeni/Obriši za svaku vest.
        </div>
      </aside>

      {/* MAIN */}
      <main style={styles.main}>
        {/* NOVA VEST */}
        {active === 'new' && (
          <section style={{ display: 'grid', gap: 18 }}>
            <div style={styles.card}>
              <h2 style={styles.h2}>Dodaj novu vest</h2>
              <div className="actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={() => goNew('url')} style={styles.btn}>Dodaj preko URL-a</button>
                <button onClick={() => goNew('manual')} style={styles.btnGhost}>Dodaj ručno</button>
              </div>
              <p style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
                Stranica “Nova vest” omogućava i URL i ručni unos (naslov, opis, tekst, slika).
              </p>
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

        {/* UREDI VEST */}
        {active === 'edit' && (
          <section style={{ display: 'grid', gap: 18 }}>
            <div style={styles.card}>
              <h2 style={styles.h2}>Uredi vest</h2>
              <form onSubmit={openEdit} style={styles.grid2}>
                <input
                  value={editId}
                  onChange={e => setEditId(e.target.value)}
                  placeholder="Nalepi Article ID"
                  required
                  style={styles.input}
                />
                <button type="submit" style={styles.btn}>Otvori editor</button>
              </form>
              <p style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
                Editor se otvara na /admin/article/[id]. U “Listi vesti” klikni “Izmeni” za brži pristup.
              </p>
            </div>

            {/* BACKFILL PANEL — dostupno i ovde i u posebnom tabu ispod */}
            <div style={styles.card}>
              <h2 style={styles.h2}>Backfill brzi alati</h2>
              <div style={{ display: 'grid', gap: 10, maxWidth: 720 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <input
                    placeholder="BACKFILL_TOKEN (opciono)"
                    value={adminToken}
                    onChange={e => setAdminToken(e.target.value)}
                    style={{ ...styles.input, flex: 1, minWidth: 260 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button onClick={() => setActive('backfill')} style={styles.btnGhost}>Otvori ceo Backfill panel</button>
                </div>
              </div>
            </div>
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

        {/* LISTA VESTI */}
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
