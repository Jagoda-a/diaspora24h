/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Pošto slike služeš kroz /api/imgx i <img>, ne treba whitelist domena
  images: {
    unoptimized: true,
  },

  // i18n podešavanja
  i18n: {
    locales: ['sr', 'en', 'de'],
    defaultLocale: 'sr',
    localeDetection: false,
  },
}

export default nextConfig
