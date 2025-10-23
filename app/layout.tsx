// app/layout.tsx
import './globals.css'
import Script from 'next/script'
import type { Metadata } from 'next'
import Header from '@/components/Header'
import AdSlot from '@/components/AdSlot'
import Footer from '@/components/Footer'
import CookieBanner from '@/components/CookieBanner'

export const metadata: Metadata = {
  // baza za apsolutne URL-ove u metadata
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://diaspora24h.com'),

  // Kratko i jasno
  title: {
    default: 'Diaspora 24h — najvažnije vesti za naše ljude',
    template: '%s — Diaspora 24h',
  },
  description: 'Diaspora 24h — najvažnije vesti za naše ljude',

  openGraph: {
    type: 'website',
    siteName: 'Diaspora 24h',
    url: '/',
    title: 'Diaspora 24h — najvažnije vesti za naše ljude',
    description: 'Diaspora 24h — najvažnije vesti za naše ljude',
    images: [
      {
        url: '/og-home.jpg', // 1200x630 JPG sa belom pozadinom i celim logoom
        width: 1200,
        height: 630,
        alt: 'Diaspora 24h',
      },
    ],
    locale: 'sr_RS',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Diaspora 24h — najvažnije vesti za naše ljude',
    description: 'Diaspora 24h — najvažnije vesti za naše ljude',
    images: ['/og-home.jpg'],
  },

  alternates: { canonical: '/' },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-video-preview': -1,
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
  const fcSiteCode = process.env.NEXT_PUBLIC_FC_SITE_CODE
  const gaId = process.env.NEXT_PUBLIC_GA_ID // npr. G-XXXXXXXXXX

  return (
    <html lang="sr" suppressHydrationWarning>
      <head>
        {/* RSS feed link */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title="Diaspora24h RSS"
          href="/rss.xml"
        />

        {/* WebSite + SearchAction (site search boks u Google rezultatu) */}
        <script
          type="application/ld+json"
          // target pretrage: /vesti?q=...
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Diaspora 24h',
              url: 'https://diaspora24h.com',
              potentialAction: [{
                '@type': 'SearchAction',
                target: 'https://diaspora24h.com/vesti?q={search_term_string}',
                'query-input': 'required name=search_term_string'
              }]
            }),
          }}
        />

        {/* No-flash theme init */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            (function() {
              try {
                var saved = localStorage.getItem('theme');
                var theme = (saved === 'light' || saved === 'dark')
                  ? saved
                  : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                document.documentElement.setAttribute('data-theme', theme);
              } catch (e) {
                document.documentElement.setAttribute('data-theme', 'light');
              }
            })();
          `}
        </Script>

        {/* Consent Mode v2: default DENIED */}
        <Script id="ga-consent-default" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            gtag('consent', 'default', {
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              analytics_storage: 'denied',
              functionality_storage: 'granted'
            });
          `}
        </Script>

        {/* Preconnect za AdSense */}
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" crossOrigin="" />
        <link rel="preconnect" href="https://tpc.googlesyndication.com" crossOrigin="" />

        {/* (NOVO) AdSense account meta — traži Google */}
        {client ? <meta name="google-adsense-account" content={client} /> : null}

        {/* Funding Choices (CMP / GDPR) */}
        {fcSiteCode ? (
          <>
            <Script
              id="fc-loader"
              async
              strategy="beforeInteractive"
              src={`https://fundingchoicesmessages.google.com/i/${fcSiteCode}`}
            />
            <Script id="fc-signal" strategy="beforeInteractive">
              {`
                (function() {
                  function signalGooglefcPresent() {
                    if (!window.frames['googlefcPresent']) {
                      if (document.body) {
                        var iframe = document.createElement('iframe');
                        iframe.style.cssText = 'width:0;height:0;border:0;display:none';
                        iframe.name = 'googlefcPresent';
                        document.body.appendChild(iframe);
                      } else {
                        setTimeout(signalGooglefcPresent, 50);
                      }
                    }
                  }
                  signalGooglefcPresent();
                })();
              `}
            </Script>
          </>
        ) : null}

        {/* Google Analytics (ne koristi storage dok je consent denied) */}
        {gaId ? (
          <>
            <Script
              id="ga-load"
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){window.dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}', { anonymize_ip: true });
              `}
            </Script>
          </>
        ) : null}

        {/* AdSense init */}
        {client ? (
          <Script
            id="adsense-init"
            async
            strategy="afterInteractive"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
            crossOrigin="anonymous"
          />
        ) : null}
      </head>

      <body>
        {/* Cookie banner – ručno ažurira consent na granted/denied */}
        <CookieBanner />

        {/* Header */}
        <Header />

        {/* Glavni sadržaj */}
        <main className="container">
          {children}
        </main>

        {/* Donji oglas */}
        <div className="container my-6">
          <AdSlot slot="BOTTOM_BANNER_SLOT_ID" />
        </div>

        {/* Footer */}
        <footer className="site-footer">
          <div className="container">
            <Footer />
          </div>
        </footer>

        {/* Tema toggle helper */}
        <Script id="theme-listener" strategy="afterInteractive">
          {`
            window.addEventListener('theme:toggle', function () {
              var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
              var next = cur === 'dark' ? 'light' : 'dark';
              document.documentElement.setAttribute('data-theme', next);
              try { localStorage.setItem('theme', next); } catch(e) {}
            });
            window.addEventListener('theme:set', function (e) {
              var detail = (e && e.detail) || 'light';
              var next = detail === 'dark' ? 'dark' : 'light';
              document.documentElement.setAttribute('data-theme', next);
              try { localStorage.setItem('theme', next); } catch(e) {}
            });
          `}
        </Script>
      </body>
    </html>
  )
}
