// app/kontakt/page.tsx
export default function KontaktPage() {
  return (
    <div className="container" style={{ padding: 16 }}>
      <header style={{ margin: '8px 0 18px' }}>
        <h1 style={{ margin: 0, lineHeight: 1.2 }}>Kontakt</h1>
        <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 16 }}>
          Ako imaš vest, priču ili predlog teme — piši nam direktno na e-mail.
        </p>
      </header>

      <section
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 16,
          marginTop: 12,
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Kontakt podaci</h2>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
          <li>
            E-mail:{' '}
            <a href="mailto:redakcija@diaspora24h.com">
              redakcija@diaspora24h.com
            </a>
          </li>
          <li>
            Instagram:{' '}
            <a
              href="https://instagram.com/diaspora24h"
              target="_blank"
              rel="noopener"
            >
              instagram.com/diaspora24h
            </a>
          </li>
          <li>
            Facebook:{' '}
            <a
              href="https://facebook.com/diaspora24h"
              target="_blank"
              rel="noopener"
            >
              facebook.com/diaspora24h
            </a>
          </li>
          <li>
            X (Twitter):{' '}
            <a
              href="https://x.com/diaspora24h"
              target="_blank"
              rel="noopener"
            >
              x.com/diaspora24h
            </a>
          </li>
          <li>Adresa: Novi Sad 21000, Srbija</li>
        </ul>
      </section>
    </div>
  )
}
