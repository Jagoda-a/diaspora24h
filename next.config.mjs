/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Remote fotke idu kroz <img> + /api/imgx, pa ne treba Next optimizer
  images: {
    unoptimized: true,
  },

  // Globalni security headers + postojeći cache header za /cats
  async headers() {
    // Content Security Policy — prilagodi ako dodaš nove domene/biblioteke
    const csp = [
      "default-src 'self'",
      // inline skripte već koristiš (theme-init, GA consent) → 'unsafe-inline'
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://fundingchoicesmessages.google.com https://pagead2.googlesyndication.com https://tpc.googlesyndication.com",
      // Remixicon CSS sa jsDelivr + inline style iz komponenata
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      // slike mogu dolaziti sa bilo kog HTTPS domena (coveri, favicons, oglasni domeni), plus data: i blob:
      "img-src 'self' data: blob: https:",
      // fontovi (npr. sa jsDelivr) + lokalni
      "font-src 'self' data: https://cdn.jsdelivr.net",
      // mrežni pozivi (GA, AdSense, FundingChoices…) + tvoji API-ji
      "connect-src 'self' https://www.googletagmanager.com https://pagead2.googlesyndication.com https://tpc.googlesyndication.com https://fundingchoicesmessages.google.com",
      // iframe dozvole (CMP i AdSense okviri)
      "frame-src 'self' https://fundingchoicesmessages.google.com https://pagead2.googlesyndication.com https://tpc.googlesyndication.com",
      // ne dozvoli ugradnju sajta u tuđi <iframe>
      "frame-ancestors 'self'",
      // dodatna očvršćavanja
      "base-uri 'self'",
      "form-action 'self'",
      // automatski pređi na https ako bi se povukao http resurs
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
          // max-age za browser = 0 (oslanjamo se na CDN), s-maxage = 1y, immutable
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
