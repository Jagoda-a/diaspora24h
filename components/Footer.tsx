// components/Footer.tsx
import Image from 'next/image'
import Link from 'next/link'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer-inner">
        {/* LOGO */}
        <Link href="/" className="footer-logo" aria-label="Početna">
          <Image src="/logo.svg" alt="Diaspora24h" width={160} height={44} className="logo-light" />
          <Image src="/logobeli.svg" alt="Diaspora24h" width={160} height={44} className="logo-dark" />
        </Link>

        {/* Linija */}
        <div className="footer-line" />

        {/* LINKOVI — OVO JE NEDOSTAJALO */}
        <nav className="footer-links">
          <Link href="/">Početna</Link>
          <Link href="/vesti">Vesti</Link>
          <Link href="/o-nama">O nama</Link>
          <Link href="/kontakt">Kontakt</Link>
          <Link href="/politika-privatnosti">Politika privatnosti</Link>
          <Link href="/uslovi-koriscenja">Uslovi korišćenja</Link>
          <Link href="/cookies">Politika kolačića</Link>
        </nav>

        {/* Društvene mreže */}
        <div className="footer-social">
          <a href="https://x.com" target="_blank" rel="noopener" aria-label="X">
            <i className="ri-twitter-x-line"></i>
          </a>
          <a href="https://facebook.com" target="_blank" rel="noopener" aria-label="Facebook">
            <i className="ri-facebook-fill"></i>
          </a>
          <a href="https://instagram.com" target="_blank" rel="noopener" aria-label="Instagram">
            <i className="ri-instagram-line"></i>
          </a>
        </div>

        {/* Linija */}
        <div className="footer-line" />

        {/* Copyright */}
        <p className="footer-copy">© {year} diaspora24h.com. Sva prava zadržana.</p>
      </div>
    </footer>
  )
}
