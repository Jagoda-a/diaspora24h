/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Remote fotke ide kroz <img> + /api/imgx, pa ne treba Next optimizer
  images: {
    unoptimized: true,
  },

  // Keširaj statične kategorijske slike iz /public/cats (1 god, immutable)
  async headers() {
    return [
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
