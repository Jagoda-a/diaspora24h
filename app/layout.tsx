// app/layout.tsx
import './globals.css'
import Script from 'next/script'
import type { Metadata } from 'next'
import Header from '@/components/Header'
import AdSlot from '@/components/AdSlot'
import Footer from '@/components/Footer'
import CookieBanner from '@/components/CookieBanner'

export const metadata: Metadata = {
  metadataBase: new URL('https://diaspora24h.com'),
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

        {/* Gornji oglas */}
        <div className="container my-3">
          <AdSlot slot="TOP_BANNER_SLOT_ID" />
        </div>

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

        {/* Tema toggle helper (čist JS, bez TS castova u stringu) */}
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
