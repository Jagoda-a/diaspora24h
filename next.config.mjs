/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Uklonjeno: experimental.serverActions (nije više potrebno)

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'www.rts.rs' },
      { protocol: 'https', hostname: 'n1info.rs' },
      { protocol: 'https', hostname: 'nova.rs' },
      { protocol: 'https', hostname: 'www.b92.net' },
      { protocol: 'https', hostname: '*.b92.net' },
      { protocol: 'https', hostname: 'www.politika.rs' },
      { protocol: 'https', hostname: 'www.danas.rs' },
      { protocol: 'https', hostname: 'www.kurir.rs' },
      { protocol: 'https', hostname: 'www.blic.rs' },
      { protocol: 'https', hostname: 'static.blic.rs' },
      { protocol: 'https', hostname: 'www.021.rs' },
      { protocol: 'https', hostname: 'www.vreme.com' },
      { protocol: 'https', hostname: 'www.dw.com' },
      { protocol: 'https', hostname: 's.dw.com' },
      { protocol: 'https', hostname: '*.wp.com' },
      { protocol: 'https', hostname: 'i0.wp.com' },
      { protocol: 'https', hostname: 'i1.wp.com' },
      { protocol: 'https', hostname: 'i2.wp.com' },
      { protocol: 'https', hostname: '*.cloudfront.net' },
      { protocol: 'https', hostname: '*.akamaized.net' },
      { protocol: 'https', hostname: '*.cdn*.*' },
    ],
  },

  // i18n podešavanja – obavezno localeDetection: false
  i18n: {
    locales: ['sr', 'en', 'de'],
    defaultLocale: 'sr',
    localeDetection: false,
  },

}

export default nextConfig
