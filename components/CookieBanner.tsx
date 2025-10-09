'use client'
import { useState, useEffect } from 'react'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const qs = new URLSearchParams(window.location.search)
      const force = qs.get('showCookies') === '1'

      const stored = localStorage.getItem('cookieConsent')
      const hasValid = stored === 'accepted' || stored === 'rejected'

      if (force || !hasValid) {
        setVisible(true)
      }

      // Omogući ponovno otvaranje banera
      const onReset = () => setVisible(true)
      window.addEventListener('cookie:reset', onReset)
      return () => window.removeEventListener('cookie:reset', onReset)
    } catch {
      // ako nešto pukne, prikaži baner da budeš compliant
      setVisible(true)
    }
  }, [])

  function updateConsent(accepted: boolean) {
    try {
      localStorage.setItem('cookieConsent', accepted ? 'accepted' : 'rejected')
    } catch {}

    // Google Consent Mode v2 update (ne menja dizajn)
    try {
      const push = (...args: any[]) =>
        (window as any).dataLayer && (window as any).dataLayer.push(args)
      push('consent', 'update', {
        ad_storage: accepted ? 'granted' : 'denied',
        ad_user_data: accepted ? 'granted' : 'denied',
        ad_personalization: accepted ? 'granted' : 'denied',
        analytics_storage: accepted ? 'granted' : 'denied',
        functionality_storage: 'granted',
      })
    } catch {}

    setVisible(false)
  }

  const accept = () => updateConsent(true)
  const reject = () => updateConsent(false)

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#111',
        color: 'white',
        padding: '16px 20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 1000,
      }}
    >
      <p style={{ margin: 0, maxWidth: 600, fontSize: 14, lineHeight: 1.4 }}>
        Ovaj sajt koristi tehničke kolačiće neophodne za funkcionisanje i
        analitičke kolačiće za poboljšanje korisničkog iskustva. Više informacija u{' '}
        <a href="/politika-kolacica" style={{ color: '#DBF905' }}>
          Politici kolačića
        </a>.
      </p>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          onClick={accept}
          style={{
            background: '#DBF905',
            color: '#111',
            border: 'none',
            borderRadius: 6,
            padding: '8px 14px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Prihvatam
        </button>
        <button
          onClick={reject}
          style={{
            background: 'transparent',
            color: 'white',
            border: '1px solid #555',
            borderRadius: 6,
            padding: '8px 14px',
            cursor: 'pointer',
          }}
        >
          Odbij
        </button>
      </div>
    </div>
  )
}
