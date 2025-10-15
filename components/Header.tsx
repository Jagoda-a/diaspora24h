'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'

type Suggest = {
  id: string
  slug: string
  title: string
  summary: string | null
  coverImage: string | null
}

export default function Header() {
  const [open, setOpen] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [sugs, setSugs] = useState<Suggest[]>([])
  const [activeIdx, setActiveIdx] = useState(-1)

  const pathname = usePathname()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)

  useEffect(() => {
    setOpen(false)
    setShowSearch(false)
    setQ('')
    setSugs([])
  }, [pathname])

  const toggle = () => setOpen(v => !v)

  useEffect(() => {
    if (showSearch) {
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [showSearch])

  // debounce fetch
  useEffect(() => {
    if (!showSearch) return
    const h = setTimeout(async () => {
      const term = q.trim()
      if (term.length < 2) { setSugs([]); setActiveIdx(-1); return }
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { cache: 'no-store' })
        const data = await res.json()
        if (data?.ok) setSugs(data.items || [])
        else setSugs([])
        setActiveIdx(-1)
      } catch {
        setSugs([])
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => clearTimeout(h)
  }, [q, showSearch])

  function onSubmitSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const term = q.trim()
    if (!term) return
    router.push(`/pretraga?q=${encodeURIComponent(term)}`)
    setShowSearch(false)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!sugs.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => (i + 1) % sugs.length)
      scrollActiveIntoView()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => (i - 1 + sugs.length) % sugs.length)
      scrollActiveIntoView()
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      const it = sugs[activeIdx]
      router.push(`/vesti/${it.slug}`)
      setShowSearch(false)
    }
  }

  function scrollActiveIntoView() {
    requestAnimationFrame(() => {
      const el = listRef.current?.querySelector<HTMLLIElement>('li.is-active')
      el?.scrollIntoView({ block: 'nearest' })
    })
  }

  function toggleTheme() {
    try {
      const root = document.documentElement
      const cur = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
      const next = cur === 'dark' ? 'light' : 'dark'
      root.setAttribute('data-theme', next)
      try { localStorage.setItem('theme', next) } catch {}
    } catch {}
  }

  return (
    <>
      <header className="site-header">
        <div className="container">
          <div className="sh-wrap">
            <Link href="/" className="sh-brand" aria-label="Početna" prefetch={false}>
              {/* light/dark logo switch */}
              <Image
                src="/logo.svg"
                alt="Diaspora 24h"
                width={300}
                height={80}
                priority
                className="logo-img logo-light"
              />
              <Image
                src="/logobeli.svg"
                alt="Diaspora 24h"
                width={300}
                height={80}
                priority
                className="logo-img logo-dark"
              />
            </Link>

            {/* Desktop navigacija */}
            <nav className="sh-nav-desktop" aria-label="Glavna navigacija">
              <Link className="sh-nav-link sh-nav-bold" href="/">Početna</Link>
              <Link className="sh-nav-link sh-nav-bold" href="/vesti">Vesti</Link>
              <Link className="sh-nav-link sh-nav-bold" href="/kontakt">Kontakt</Link>
              <Link className="sh-nav-link sh-nav-bold" href="/o-nama">O nama</Link>

              {/* Pretraga (desktop) */}
              <button
                className="sh-icon-btn hide-on-mobile"
                aria-label="Pretraga"
                onClick={() => setShowSearch(v => !v)}
                title="Pretraga"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              {/* Theme toggle (desktop) */}
              <button
                className="sh-icon-btn hide-on-mobile theme-toggle"
                aria-label="Promeni temu"
                title="Promeni temu"
                onClick={toggleTheme}
              >
                <span className="icon-light">
                  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </span>
                <span className="icon-dark">
                  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </span>
              </button>
            </nav>

            {/* Desni deo: search (mobile) + theme + hamburger */}
            <div className="sh-right">
              <button
                className="sh-icon-btn show-on-mobile"
                aria-label="Pretraga"
                onClick={() => setShowSearch(v => !v)}
                title="Pretraga"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              {/* Theme toggle (mobile) */}
              <button
                className="sh-icon-btn show-on-mobile theme-toggle"
                aria-label="Promeni temu"
                title="Promeni temu"
                onClick={toggleTheme}
              >
                <span className="icon-light">
                  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </span>
                <span className="icon-dark">
                  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </span>
              </button>

              <button
                className={`sh-burger ${open ? 'is-open' : ''}`}
                aria-label="Meni"
                aria-expanded={open}
                aria-controls="mobile-menu"
                onClick={toggle}
              >
                <span className="sh-burger-bar" />
                <span className="sh-burger-bar" />
                <span className="sh-burger-bar" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* SEARCH panel */}
      {showSearch && (
        <div className="sh-search-wrap" role="dialog" aria-modal="true">
          <div className="container">
            <form className="sh-search-form" onSubmit={onSubmitSearch}>
              <div className="sh-search-box">
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  ref={inputRef}
                  name="q"
                  placeholder="Pretraži vesti…"
                  aria-label="Pretraži vesti"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={onKeyDown}
                />
                <button
                  type="button"
                  className="sh-search-close"
                  onClick={() => setShowSearch(false)}
                  aria-label="Zatvori"
                >
                  ✕
                </button>
              </div>
            </form>

            {(q.trim().length >= 2) && (
              <ul ref={listRef} className="sh-search-suggest" role="listbox" aria-label="Predlozi">
                {loading && <li className="muted">Tražim…</li>}
                {!loading && sugs.length === 0 && <li className="muted">Nema rezultata</li>}
                {sugs.map((it, idx) => {
                  const img = it.coverImage ? `/api/img?url=${encodeURIComponent(it.coverImage)}` : null
                  const active = idx === activeIdx
                  return (
                    <li
                      key={it.id}
                      className={active ? 'is-active' : undefined}
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onMouseLeave={() => setActiveIdx(-1)}
                      onClick={() => {
                        router.push(`/vesti/${it.slug}`)
                        setShowSearch(false)
                      }}
                    >
                      {img ? <img src={img} alt="" width={54} height={36} /> : <div className="ph" />}
                      <div className="meta">
                        <div className="t">{it.title}</div>
                        <div className="s">{(it.summary || '').slice(0, 90)}</div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Mobilni meni */}
      <div id="mobile-menu" className={`sh-mobile ${open ? 'open' : ''}`} role="dialog" aria-modal="true">
        <div className="sh-mobile-panel">
          <div className="sh-mobile-head">
            <Link href="/" className="sh-brand" aria-label="Početna" onClick={() => setOpen(false)} prefetch={false}>
              {/* light/dark logo switch (mobile) */}
              <Image src="/logo.svg" alt="Diaspora 24h" width={300} height={80} className="logo-img-mobile logo-light" />
              <Image src="/logobeli.svg" alt="Diaspora 24h" width={300} height={80} className="logo-img-mobile logo-dark" />
            </Link>
            <button className="sh-close" aria-label="Zatvori meni" onClick={() => setOpen(false)}>✕</button>
          </div>

          <nav className="sh-mobile-nav" onClick={() => setOpen(false)}>
            <Link href="/" className="sh-mobile-link">Početna</Link>
            <Link href="/o-nama" className="sh-mobile-link">O nama</Link>
            <Link href="/vesti" className="sh-mobile-link">Vesti</Link>
            <Link href="/kontakt" className="sh-mobile-link">Kontakt</Link>
          </nav>
        </div>

        <button className="sh-backdrop" aria-label="Zatvori" onClick={() => setOpen(false)} />
      </div>

      {/* HARDENING: digni header iznad svega i forsiraj pointer-events u headeru */}
      <style jsx>{`
        :global(.site-header){ position:sticky; top:0; z-index:2147483647; }
        :global(.site-header, .site-header *){
          pointer-events:auto !important;
        }
        :global(.sh-nav-desktop){ position:relative; z-index:2147483646; }
        :global(.sh-right){ position:relative; z-index:2147483646; }
        :global(.sh-icon-btn svg){ pointer-events:none; }

        /* Theme prikaz (fallback ako global ne radi) */
        .theme-toggle { line-height:0; padding:0; margin:0; border:0; background:transparent; }
        :global(.theme-toggle .icon-light){ display:inline-flex !important; }
        :global(.theme-toggle .icon-dark){ display:none !important; }
        :global([data-theme='dark'] .theme-toggle .icon-light){ display:none !important; }
        :global([data-theme='dark'] .theme-toggle .icon-dark){ display:inline-flex !important; }
      `}</style>
    </>
  )
}
