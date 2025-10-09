// components/ThemeToggle.tsx
'use client'

import { useEffect, useState } from 'react'

type TTheme = 'light' | 'dark'

function getInitialTheme(): TTheme {
  if (typeof window === 'undefined') return 'light'
  try {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') return saved as TTheme
  } catch {}
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

// Ikonica-only; nije <button>, nema frame/outline, fiksne dimenzije (sprečava pomeranje)
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<TTheme>(getInitialTheme)

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    try { localStorage.setItem('theme', theme) } catch {}
  }, [theme])

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  const IconMoon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
  const IconSun = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )

  return (
    <span
      role="button"
      aria-label="Promeni temu"
      title="Promeni temu"
      onClick={toggle}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggle() }}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36, height: 36,          // fiksno → nema “skoka”
        padding: 0, margin: 0,
        background: 'transparent',
        border: 'none',
        outline: 'none',
        lineHeight: 0,
        cursor: 'pointer',
        userSelect: 'none'
      }}
    >
      {theme === 'light' ? <IconMoon /> : <IconSun />}
    </span>
  )
}
