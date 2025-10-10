// lib/rss.ts
import Parser from 'rss-parser'

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

/* -------------------------
   Dodatne male pomoćne
------------------------- */

// Skidanje uobičajenih tracking query parametara (utm_*, fbclid, gclid...)
function stripTrackingParams(u: string): string {
  try {
    const url = new URL(u)
    const bad = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'igshid', 'mc_cid', 'mc_eid'
    ]
    bad.forEach(k => url.searchParams.delete(k))
    // Ako ništa nije ostalo u query-ju, vrati čist link bez upitnika
    url.search = url.searchParams.toString()
    return url.toString()
  } catch {
    return u
  }
}

// Normalizacija linka stavke (apsolutni + strip tracking)
function normalizeItemLink(link: string): string {
  const abs = sanitizeAbsoluteUrl(link) || link
  return stripTrackingParams(abs)
}

/* -------------------------
   Fetch svih feedova
------------------------- */

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

// Heuristika za cover sliku (enclosure -> content <img> -> og:image stranice)
export async function resolveBestCover(
  item: RSItem
): Promise<string | null> {
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
