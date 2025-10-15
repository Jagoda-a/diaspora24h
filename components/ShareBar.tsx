// app/components/ShareBar.tsx
'use client'

import { useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'

type Props = {
  /** Ako proslediš pun URL, koristi se taj; inače se uzima window.location.origin + pathname */
  url?: string
  /** Naslov članka (ulazi u poruku/tvit gde ima smisla) */
  title?: string
  /** Dodatne klase na wrapper (da stilizuješ iz spolja) */
  className?: string
}

export default function ShareBar({ url, title, className }: Props) {
  const pathname = usePathname()
  const [msg, setMsg] = useState<string | null>(null)

  // Stabilan URL i tekst
  const shareUrl = useMemo(() => {
    if (url) return url
    if (typeof window !== 'undefined') {
      const origin = window.location.origin
      return origin + (pathname || '')
    }
    return ''
  }, [url, pathname])

  const shareText = title ? `${title} — ${shareUrl}` : shareUrl

  // Popup za web deljenje linkova (FB/Twitter/WhatsApp web)
  function openPopup(href: string) {
    if (!href) return
    const w = 720
    const h = 600
    const y = window.top?.outerHeight ? Math.max(0, (window.top.outerHeight - h) / 2) : 0
    const x = window.top?.outerWidth ? Math.max(0, (window.top.outerWidth - w) / 2) : 0
    window.open(href, '_blank', `width=${w},height=${h},left=${x},top=${y},noopener,noreferrer`)
  }

  // Web Share API (telefoni — otvara sistemski sheet: Instagram Chats, SMS, itd.)
  async function tryWebShare() {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: title || document.title,
          text: title || undefined,
          url: shareUrl,
        })
        return
      } catch {
        // korisnik odustao → ignoriši
      }
    }
    await copyLink()
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setMsg('Link kopiran ✅')
      setTimeout(() => setMsg(null), 1500)
    } catch {
      setMsg('Nije uspelo kopiranje')
      setTimeout(() => setMsg(null), 1500)
    }
  }

  // Link šabloni
  const links = {
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`,
    viber: `viber://forward?text=${encodeURIComponent(shareText)}`, // deep-link (radi kad je app prisutan)
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title || '')}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    messengerApp: `fb-messenger://share?link=${encodeURIComponent(shareUrl)}`, // app link
  }

  // Favicon ikone (Google S2) za brendirane servise — u boji
  const fav = (domain: string, sz = 64) =>
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${sz}`

  const icons = {
    whatsapp: fav('whatsapp.com'),
    viber: fav('viber.com'),
    facebook: fav('facebook.com'),
    twitter: fav('x.com'),          // X (twitter) favicon
    messenger: fav('messenger.com') // Messenger favicon
  }

  // Minimalni stil (ne remeti layout)
  const styles = {
    wrap: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } as React.CSSProperties,
    btn: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 10px',
      borderRadius: 999,
      border: '1px solid #e5e7eb',
      background: '#fff',
      cursor: 'pointer',
      fontSize: 14,
      textDecoration: 'none',
      lineHeight: 1
    } as React.CSSProperties,
    iconImg: { width: 16, height: 16, display: 'inline-block', verticalAlign: '-2px', borderRadius: 4 } as React.CSSProperties,
    icon: { fontSize: 16, lineHeight: 1 } as React.CSSProperties, // za share/copy (remixicon)
    msg: { fontSize: 12, color: '#16a34a' } as React.CSSProperties,
  }

  return (
    <div className={className ?? ''}>
      <div style={styles.wrap}>
        {/* WhatsApp (web+app) */}
        <button
          type="button"
          onClick={() => openPopup(links.whatsapp)}
          style={styles.btn}
          aria-label="Podeli na WhatsApp"
          title="Podeli na WhatsApp"
        >
          <img src={icons.whatsapp} alt="" style={styles.iconImg} />
          WhatsApp
        </button>

        {/* Viber (deep-link) */}
        <a
          href={links.viber}
          style={styles.btn}
          aria-label="Podeli na Viber"
          title="Podeli na Viber"
        >
          <img src={icons.viber} alt="" style={styles.iconImg} />
          Viber
        </a>

        {/* Facebook share */}
        <button
          type="button"
          onClick={() => openPopup(links.facebook)}
          style={styles.btn}
          aria-label="Podeli na Facebook"
          title="Podeli na Facebook"
        >
          <img src={icons.facebook} alt="" style={styles.iconImg} />
          Facebook
        </button>

        {/* X / Twitter */}
        <button
          type="button"
          onClick={() => openPopup(links.twitter)}
          style={styles.btn}
          aria-label="Objavi na X"
          title="Objavi na X"
        >
          <img src={icons.twitter} alt="" style={styles.iconImg} />
          X
        </button>

        {/* Messenger (app link) */}
        <a
          href={links.messengerApp}
          style={styles.btn}
          aria-label="Podeli na Messenger"
          title="Podeli na Messenger"
        >
          <img src={icons.messenger} alt="" style={styles.iconImg} />
          Messenger
        </a>

        {/* Sistem share (Instagram Chats i ostalo na telefonu) */}
        <button
          type="button"
          onClick={tryWebShare}
          style={styles.btn}
          aria-label="Sistemsko deljenje"
          title="Sistemsko deljenje (Instagram, Messages, …)"
        >
          <i className="ri-share-forward-line" style={styles.icon} aria-hidden />
          Share
        </button>

        {/* Copy link fallback */}
        <button
          type="button"
          onClick={copyLink}
          style={styles.btn}
          aria-label="Kopiraj link"
          title="Kopiraj link"
        >
          <i className="ri-links-line" style={styles.icon} aria-hidden />
          Copy
        </button>
      </div>

      {msg && <div style={styles.msg}>{msg}</div>}
    </div>
  )
}
