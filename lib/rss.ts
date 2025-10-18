// lib/rss.ts
import Parser from 'rss-parser'

/* ------------------------------------------------
   0) Safe-image allow list (za filtriranje u ingest-u)
------------------------------------------------- */

// Domeni sa kojih je bezbedno posluživati cover fotke
export const SAFE_IMAGE_HOSTS = new Set<string>([
  // CC/PD
  'upload.wikimedia.org',
  'commons.wikimedia.org',

  // Royalty-free
  'images.unsplash.com',
  'unsplash.com',
  'images.pexels.com',
  'pexels.com',
  'cdn.pixabay.com',
  'pixabay.com',

  // Tvoj CDN (po potrebi promeni/dodaj)
  'cdn.diaspora24h.com',
])

export function isSafeImageHost(u?: string | null) {
  if (!u) return false
  try {
    const h = new URL(u).hostname
    return SAFE_IMAGE_HOSTS.has(h)
  } catch { return false }
}

/* ------------------------------------------------
   1) Tipovi kompatibilni sa postojećim kodom
------------------------------------------------- */

export type RSItem = {
  title: string
  link: string
  contentSnippet?: string
  isoDate?: string
  pubDate?: string
  enclosure?: { url?: string; type?: string }
  content?: string
  contentHtml?: string
}

export type FeedWithItems = {
  url: string
  items: RSItem[]
}

/* ------------------------------------------------
   2) Novi, bogatiji tip za ingest (koristi ga API)
------------------------------------------------- */

export type FeedItem = {
  title: string
  url: string                 // permalink na original
  sourceName: string          // npr. "N1", "BBC", "DW"
  publishedAt?: string | null
  summary?: string | null
  contentHtml?: string | null
  plainText: string           // očišćen tekst (HTML -> text)
  coverImage?: string | null  // apsolutni URL (ako uspemo da nađemo)
  language?: string | null
  country?: string | null
  categoryGuess?: string | null
}

/* ------------------------------------------------
   3) Izvori feedova
------------------------------------------------- */

export const RS_SOURCES_RS: string[] = [
  // Opšte / Politika
  'https://www.danas.rs/feed/',
  'https://n1info.rs/feed/',
  'https://www.vreme.com/feed/',
  'https://feeds.bbci.co.uk/serbian/lat/rss.xml',
  'https://www.rts.rs/page/stories/sr/rss.html',
  'https://www.dw.com/sr-Latn/rss',

  // Ekonomija
  'https://novaekonomija.rs/feed/',
  'https://biznis.rs/feed/',

  // Sport
  'https://www.rts.rs/page/sport/sr/rss.html',
  'https://mondo.rs/rss/644/Sport',
  'https://mondo.rs/rss/646/Sport/Fudbal',
  'https://mondo.rs/rss/652/Sport/Kosarka',
  'https://mondo.rs/rss/657/Sport/Tenis',

  // Kultura / Lifestyle / Zanimljivosti
  'https://citymagazine.danas.rs/feed/',

  // Tech / IT
  'https://pcpress.rs/feed/',
  'https://startit.rs/feed/',

  // Hronika / Vesti (tabloidi — stabilni RSS endpointi)
  'https://www.kurir.rs/rss/vesti',
  'https://www.kurir.rs/rss/hronika',
]

// Dodatni feedovi (DE tržište na srpskom)
export const RS_SOURCES_DE: string[] = [
  'https://www.dw.com/rs/rss',
  'https://www.dw.com/sr-Latn/rss',
]

/* ------------------------------------------------
   4) Parser i HTTP helpers
------------------------------------------------- */

const parser = new Parser({
  timeout: 15000,
  headers: {
    'user-agent':
      'Mozilla/5.0 (compatible; diaspora24h-bot/1.0; +https://diaspora24h.vercel.app)',
    accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
  },
})

function sanitizeAbsoluteUrl(url?: string | null, base?: string): string | null {
  if (!url) return null
  try {
    const u = base ? new URL(url, base) : new URL(url)
    if (!/^https?:$/.test(u.protocol)) return null
    return u.toString()
  } catch {
    try {
      if (base) return new URL(url, base).toString()
    } catch {}
    return null
  }
}

function isImagePath(pathname: string) {
  return /\.(png|jpe?g|webp|gif|avif)$/i.test(pathname)
}

function extractFirstImg(html?: string | null, base?: string): string | null {
  if (!html) return null
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  if (m) return sanitizeAbsoluteUrl(m[1], base)
  return null
}

async function fetchTextSafe(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (compatible; diaspora24h-bot/1.0; +https://diaspora24h.vercel.app)',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const text = await res.text()
    return text || null
  } catch {
    return null
  }
}

function extractMetaImage(html: string, base?: string): string | null {
  // og:image / twitter:image / itemprop="image"
  const metas = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+itemprop=["']image["'][^>]+content=["']([^"']+)["']/i,
  ]
  for (const rx of metas) {
    const m = html.match(rx)
    if (m && m[1]) {
      const abs = sanitizeAbsoluteUrl(m[1], base)
      if (abs) return abs
    }
  }
  return null
}

async function resolveCoverFromPage(articleUrl: string): Promise<string | null> {
  const html = await fetchTextSafe(articleUrl)
  if (!html) return null
  const base = (() => {
    try {
      return new URL(articleUrl).origin
    } catch {
      return undefined
    }
  })()
  // 1) og:image / twitter:image
  const og = extractMetaImage(html, base)
  if (og) return og
  // 2) prvi <img>
  const img = extractFirstImg(html, base)
  return img
}

// kroz /api/img proxy da izbegnemo hotlink/CORS blokade
export function asProxiedImage(url?: string | null) {
  if (!url) return null
  return `/api/img?url=${encodeURIComponent(url)}`
}

/* ------------------------------------------------
   5) Tekst helpers (HTML -> plain, ime izvora)
------------------------------------------------- */

function stripHtml(html?: string | null): string {
  const h = (html || '').toString()
  if (!h) return ''
  return h
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function domainToName(u: string): string {
  try {
    const { hostname } = new URL(u)
    const h = hostname
      .replace(/^www\./, '')
      .replace(/^m\./, '')
    const base = h.split('.')[0] || h
    return base.charAt(0).toUpperCase() + base.slice(1)
  } catch {
    return 'izvor'
  }
}

/* ------------------------------------------------
   6) URL normalizacija (tracking parametri)
------------------------------------------------- */

function stripTrackingParams(u: string): string {
  try {
    const url = new URL(u)
    const bad = [
      'utm_source','utm_medium','utm_campaign','utm_term','utm_content',
      'fbclid','gclid','igshid','mc_cid','mc_eid'
    ]
    bad.forEach(k => url.searchParams.delete(k))
    url.search = url.searchParams.toString()
    return url.toString()
  } catch {
    return u
  }
}

function normalizeItemLink(link: string): string {
  const abs = sanitizeAbsoluteUrl(link) || link
  return stripTrackingParams(abs)
}

/* ------------------------------------------------
   7) Fetch svih feedova (kompat)
------------------------------------------------- */

export async function fetchFeeds(urls: string[]): Promise<FeedWithItems[]> {
  const results: FeedWithItems[] = []

  for (const url of urls) {
    try {
      const feed = await parser.parseURL(url)

      const items: RSItem[] = (feed.items || []).map((it: any) => {
        const rawTitle = (it.title ?? '').toString().trim()
        const rawLink = (it.link ?? '').toString().trim()
        const link = normalizeItemLink(rawLink)

        const contentEncoded = it['content:encoded'] as string | undefined
        const content = it.content as string | undefined
        const contentHtml = contentEncoded ?? content ?? undefined

        const contentSnippet =
          (it.contentSnippet ?? it.summary ?? '').toString() || undefined

        // enclosure (slika/video)
        let enclosure: { url?: string; type?: string } | undefined
        if (it.enclosure?.url) {
          enclosure = {
            url: sanitizeAbsoluteUrl(it.enclosure.url, link) || undefined,
            type: it.enclosure.type,
          }
        }

        return {
          title: rawTitle,
          link,
          contentSnippet,
          isoDate: it.isoDate,
          pubDate: it.pubDate,
          enclosure,
          content,
          contentHtml,
        }
      })

      results.push({ url, items })
    } catch (e) {
      console.error('RSS error:', url, e)
    }
  }

  return results
}

/* ------------------------------------------------
   8) Heuristika za cover sliku (kompat)
------------------------------------------------- */

export async function resolveBestCover(item: RSItem): Promise<string | null> {
  const base = (() => {
    try { return new URL(item.link).origin } catch { return undefined }
  })()

  // 1) enclosure sa image mimetype ili image ekstenzijom
  if (item.enclosure?.url) {
    try {
      const abs = sanitizeAbsoluteUrl(item.enclosure.url, base)
      if (abs) {
        const type = (item.enclosure.type || '').toLowerCase()
        const pn = new URL(abs).pathname
        if (type.startsWith('image/') || isImagePath(pn)) {
          return abs
        }
      }
    } catch {}
  }

  // 2) <img src> iz content/content:encoded
  const fromHtml = extractFirstImg(item.contentHtml, base)
  if (fromHtml) return fromHtml

  // 3) og:image sa same stranice
  const fromOg = await resolveCoverFromPage(item.link)
  if (fromOg) return fromOg

  return null
}

/* ------------------------------------------------
   9) Novi helper: agreguj i obogati stavke (za ingest)
------------------------------------------------- */

function guessCategoryFromUrl(u: string): string | null {
  try {
    const url = new URL(u)
    const p = url.pathname.toLowerCase()
    if (p.includes('/sport')) return 'sport'
    if (p.includes('/biznis') || p.includes('/ekonom')) return 'ekonomija'
    if (p.includes('/kultura')) return 'kultura'
    if (p.includes('/hronika')) return 'hronika'
    if (p.includes('/tech') || p.includes('/it') || p.includes('/tehnolog')) return 'tehnologija'
    return null
  } catch { return null }
}

/**
 * collectFeedItems: vrati listu FeedItem spremnu za ingest.
 * - Izvlači sourceName iz entry.source.title ili domena
 * - Generiše plainText iz contentHtml/summary
 * - Pokušava da pronađe coverImage (enclosure -> <img> -> og:image)
 */
export async function collectFeedItems(urls: string[]): Promise<FeedItem[]> {
  const packs = await fetchFeeds(urls)
  const out: FeedItem[] = []

  for (const pack of packs) {
    for (const it of pack.items) {
      const url = normalizeItemLink(it.link || '')
      if (!url) continue

      const contentHtml = it.contentHtml ?? it.content ?? null
      const summary = (it.contentSnippet || '').trim() || null
      const plainText = stripHtml(contentHtml || summary || '')

      // Pokušaj cover-a (sirovi rezultat; FILTER radiš u ingest-u pomoću isSafeImageHost)
      let coverImage: string | null = null
      try { coverImage = await resolveBestCover(it) } catch {}

      // Source name: iz rss <source> ili iz domena
      const sourceName = ((): string => {
        const s = (it as any)?.source?.title as string | undefined
        return (s && s.trim()) || domainToName(url)
      })()

      out.push({
        title: (it.title || '').toString().trim() || '(bez naslova)',
        url,
        sourceName,
        publishedAt: it.isoDate || it.pubDate || null,
        summary,
        contentHtml,
        plainText,
        coverImage,
        language: null,
        country: null,
        categoryGuess: guessCategoryFromUrl(url),
      })
    }
  }

  return out
}
