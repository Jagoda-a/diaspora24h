/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production'

const nextConfig = {
  reactStrictMode: true,

  // Remote fotke idu kroz <img> + /api/imgx, pa ne treba Next optimizer
  images: {
    unoptimized: true,
  },

  // Webpack devtool bez eval-a ako želiš stroži dev (možeš isključiti ako hoćeš eval u dev-u)
  webpack: (config, { dev }) => {
    if (dev) {
      // Ova varijanta NE koristi eval → kompatibilno sa strogim CSP i bez 'unsafe-eval'
      // Ako želiš brži sourcemap i dozvolio si 'unsafe-eval' ispod, možeš komentarisati ovu liniju.
      config.devtool = 'cheap-source-map'
    }
    return config
  },

  // Globalni security headers + postojeći cache header za /cats
  async headers() {
    // Content Security Policy — prilagodi ako dodaš nove domene/biblioteke
    // Napomena: u DEV dodajemo 'unsafe-eval' zbog React/Next toolchain-a i HMR-a.
    const scriptSrc = [
      "'self'",
      "'unsafe-inline'", // koristiš (theme-init, GA consent)
      isDev ? "'unsafe-eval'" : null,
      "https://www.googletagmanager.com",
      "https://fundingchoicesmessages.google.com",
      "https://pagead2.googlesyndication.com",
      "https://tpc.googlesyndication.com",
    ].filter(Boolean).join(' ')

    const styleSrc = [
      "'self'",
      "'unsafe-inline'",
      "https://cdn.jsdelivr.net",
    ].join(' ')

    const imgSrc = [
      "'self'",
      "data:",
      "blob:",
      "https:",
    ].join(' ')

    const fontSrc = [
      "'self'",
      "data:",
      "https://cdn.jsdelivr.net",
    ].join(' ')

    const connectSrc = [
      "'self'",
      "https://www.googletagmanager.com",
      "https://pagead2.googlesyndication.com",
      "https://tpc.googlesyndication.com",
      "https://fundingchoicesmessages.google.com",
      // Dev: dozvoli HMR i localhost konekcije
      isDev ? "ws:" : null,
      isDev ? "http://localhost:*" : null,
      isDev ? "https://localhost:*" : null,
    ].filter(Boolean).join(' ')

    const frameSrc = [
      "'self'",
      "https://fundingchoicesmessages.google.com",
      "https://pagead2.googlesyndication.com",
      "https://tpc.googlesyndication.com",
    ].join(' ')

    const csp = [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      `style-src ${styleSrc}`,
      `img-src ${imgSrc}`,
      `font-src ${fontSrc}`,
      `connect-src ${connectSrc}`,
      `frame-src ${frameSrc}`,
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; ')

    return [
      // 1) Globalni security headers
      {
        source: '/:path*',
        headers: [
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' }, // dopunjuje frame-ancestors u CSP
          { key: 'Permissions-Policy', value: "geolocation=(), microphone=(), camera=(), browsing-topics=()" },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },

      // 2) Keširanje statičnih kategorijskih slika iz /public/cats (1 god, immutable)
      {
        source: '/cats/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=31536000, immutable' },
        ],
      },
    ]
  },

  // i18n podešavanja
  i18n: {
    locales: ['sr', 'en', 'de'],
    defaultLocale: 'sr',
    localeDetection: false,
  },
}

export default nextConfig
