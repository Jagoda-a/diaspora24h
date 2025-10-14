// app/admin/ui/AdminClient.tsx
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminList from './AdminList'

type NavId = 'new' | 'edit' | 'backfill' | 'list'

/** Jednostavne monochrome ikonice (SVG, currentColor) */
const IconPlus: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2" {...props}>
    <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const IconEdit: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2" {...props}>
    <path d="M12 20h9" strokeLinecap="round" />
    <path d="M16.5 3.5l4 4L8 20H4v-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const IconPuzzle: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2" {...props}>
    <path d="M8 4h3a2 2 0 012 2v0a2 2 0 104 0h3v4a2 2 0 01-2 2h-1a2 2 0 100 4h1a2 2 0 012 2v4h-4a2 2 0 01-2-2v-1a2 2 0 10-4 0v1a2 2 0 01-2 2H4v-4a2 2 0 012-2h1a2 2 0 100-4H6a2 2 0 01-2-2V4h4z" strokeLinejoin="round"/>
  </svg>
)
const IconList: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2" {...props}>
    <path d="M8 6h13M8 12h13M8 18h13" strokeLinecap="round" />
    <circle cx="4" cy="6" r="1.5" />
    <circle cx="4" cy="12" r="1.5" />
    <circle cx="4" cy="18" r="1.5" />
  </svg>
)

type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>

const NAV: Array<{ id: NavId; title: string; Icon: IconType }> = [
  { id: 'new',      title: 'Dodaj vest',  Icon: IconPlus },
  { id: 'edit',     title: 'Uredi vest',  Icon: IconEdit },
  { id: 'backfill', title: 'Backfill',    Icon: IconPuzzle },
  { id: 'list',     title: 'Lista vesti', Icon: IconList },
]

export default function AdminClient() {
  const router = useRouter()
  const [active, setActive] = useState<NavId>('new')

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

  // ====== DELETE ALL ======
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
      setToast({ kind: 'ok', text: `Kategorije: checked ${data.checked ?? 0}, updated ${data.updated ?? 0}` })
    } catch (e: any) {
      setToast({ kind: 'err', text: e?.message || 'Greška u backfill kategorijama' })
    } finally {
      setBusyCat(false)
    }
  }

  // ====== UI (neutralno; global.css vodi dark/light) ======
  const styles = useMemo(() => ({
    shell: {
      display: 'grid',
      gridTemplateColumns: '260px 1fr', // desktop: širi sidebar sa tekstom
      minHeight: '100vh',
      maxWidth: '100%',                 // širina puštena na ceo viewport
      margin: '0 auto',
    } as React.CSSProperties,
    sidebar: {
      padding: 18,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    } as React.CSSProperties,
    brand: { fontWeight: 700, letterSpacing: 0.3, fontSize: 18 } as React.CSSProperties,
    navBtn: (isActive: boolean) => ({
      textAlign: 'left',
      padding: '8px 10px',
      borderRadius: 10,
      border: '1px solid rgba(127,127,127,0.25)',
      background: isActive ? 'rgba(127,127,127,0.15)' : 'transparent',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontSize: 15,
      whiteSpace: 'nowrap',
      color: 'inherit',                 // 🔥 ikonice i tekst prate temu
    }) as React.CSSProperties,
    main: {
      padding: 24,
      minHeight: 0,
      overflow: 'auto',
    } as React.CSSProperties,
    card: {
      border: '1px solid rgba(127,127,127,0.25)',
      borderRadius: 12,
      padding: 16,
      background: 'transparent',
    } as React.CSSProperties,
    h2: { margin: 0, marginBottom: 10, fontSize: 18 } as React.CSSProperties,
    grid2: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 } as React.CSSProperties,
    input: { padding: 10, border: '1px solid rgba(127,127,127,0.35)', borderRadius: 10, background: 'transparent' } as React.CSSProperties,
    btn: { padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(127,127,127,0.35)', background: 'transparent' } as React.CSSProperties,
    btnPrimary: { padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(127,127,127,0.35)' } as React.CSSProperties,
    btnDangerSolid: {
      padding: '10px 18px',
      borderRadius: 10,
      border: 'none',
      background: '#b91c1c',
      color: '#fff',
      fontWeight: 600,
      cursor: 'pointer',
    } as React.CSSProperties,
    toast: (kind: 'ok'|'err') => ({
      position: 'fixed', right: 20, bottom: 20, zIndex: 50,
      background: kind === 'ok' ? '#16a34a' : '#dc2626',
      color: '#fff', padding: '10px 14px', borderRadius: 10, boxShadow: '0 6px 16px rgba(0,0,0,0.2)'
    }) as React.CSSProperties
  }), [])

  return (
    <div style={styles.shell} data-admin-shell>
      {/* Global za ikonice: uvek se boje po currentColor (dark/light) */}
      <style jsx>{`
        .nav-btn svg { stroke: currentColor !important; fill: none !important; }

        /* MOBILNI: sidebar 30px, bez brenda i teksta; više prostora za main */
        @media (max-width: 900px) {
          [data-admin-shell] {
            grid-template-columns: 30px 1fr !important;
          }
          aside[data-admin-sidebar] {
            padding: 6px 4px !important;
            position: sticky;
            top: 0;
            z-index: 20;
          }
          .brand, .nav-text, .sidebar-note {
            display: none !important;
          }
          .nav-btn {
            justify-content: center !important;
            padding: 6px 0 !important;
            border-radius: 8px !important;
          }
          .nav-icon {
            width: 18px;
            height: 18px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }
          main[data-admin-main] {
            padding: 12px !important;   /* više mesta za sadržaj */
          }
          main[data-admin-main] .container {
            margin: 0 4px;              /* blage margine */
          }
        }
      `}</style>

      {/* SIDEBAR */}
      <aside style={styles.sidebar} data-admin-sidebar>
        <div className="brand" style={styles.brand}>Diaspora24h · Admin</div>

        <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
          {NAV.map(({ id, title, Icon }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              style={styles.navBtn(active === id)}
              className="nav-btn"
              title={title}
              aria-label={title}
            >
              <span className="nav-icon" style={{ display: 'inline-flex' }}><Icon /></span>
              <span className="nav-text">{title}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-note" style={{ marginTop: 'auto', fontSize: 12, opacity: 0.8 }}>
          Savet: u “Listi vesti” imaš Izmeni/Obriši za svaku vest.
        </div>
      </aside>

      {/* MAIN */}
      <main style={styles.main} data-admin-main>
        <div className="container">
          {/* NOVA VEST */}
          {active === 'new' && (
            <section style={{ display: 'grid', gap: 18 }}>
              <div style={styles.card}>
                <h2 style={styles.h2}>Dodaj novu vest</h2>
                <div className="actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={() => goNew('url')} style={styles.btnPrimary}>Dodaj preko URL-a</button>
                  <button onClick={() => goNew('manual')} style={styles.btn}>Dodaj ručno</button>
                </div>
                <p style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                  Stranica “Nova vest” omogućava i URL i ručni unos (naslov, opis, tekst, slika).
                </p>
              </div>

              <div style={{ ...styles.card, borderStyle: 'dashed' }}>
                <h3 style={{ margin: '0 0 8px 0' }}>Opasno</h3>
                <p style={{ margin: '6px 0 12px 0', opacity: 0.7 }}>
                  Obrisati sve vesti iz baze (nepovratno).
                </p>
                <button onClick={handleDeleteAll} style={styles.btnDangerSolid}>
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
                  <button type="submit" style={styles.btnPrimary}>Otvori editor</button>
                </form>
                <p style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                  Editor se otvara na /admin/article/[id]. U “Listi vesti” klikni “Izmeni” za brži pristup.
                </p>
              </div>

              {/* Backfill prečica */}
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
                    <button onClick={() => setActive('backfill')} style={styles.btn}>Otvori ceo Backfill panel</button>
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
                    <button onClick={runBackfillCovers} disabled={busyBF} style={styles.btnPrimary}>
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
                    <button onClick={runBackfillCategories} disabled={busyCat} style={styles.btnPrimary}>
                      {busyCat ? 'Pokrećem…' : 'Pokreni backfill kategorija'}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ ...styles.card, borderStyle: 'dashed' }}>
                <h3 style={{ margin: '0 0 8px 0' }}>Opasno</h3>
                <p style={{ margin: '6px 0 12px 0', opacity: 0.7 }}>
                  Obrisati sve vesti iz baze (nepovratno).
                </p>
                <button onClick={handleDeleteAll} style={styles.btnDangerSolid}>
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
        </div>
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
