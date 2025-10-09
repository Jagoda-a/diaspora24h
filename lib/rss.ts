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
  // RTS: glavni RSS kanali su pod-domeni i sekcije, /rss.html je HTML indeks,
  // ali Parser će izvući <link> elemente iz <item> ako je pravi feed URL.
  // Zato ovde koristimo konkretne feedove koje rade:
  'https://www.rts.rs/page/stories/sr/rss.html', // Stories (radi kao RSS)
  'https://n1info.rs/feed/',
  'https://nova.rs/feed/',
  'https://www.politika.rs/rss',
  'https://www.danas.rs/feed/',
  'https://www.kurir.rs/rss/vesti',
  'https://www.blic.rs/rss/vesti',
  'https://www.vreme.com/feed/',

  // B92: stabilniji feedovi su po sekcijama; "info.xml" često puca 404.
  'https://www.b92.net/info/rss/vesti.xml',
  'https://www.b92.net/sport/rss/ostali-sportovi.xml',

  // 021.rs: glavni je često 404; radi po sekcijama:
  'https://www.021.rs/rss/Novosti_1.xml',
  'https://www.021.rs/rss/Srbija_2.xml',
  'https://www.021.rs/rss/Novi_Sad_3.xml',
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
      // neke redakcije blokiraju HEAD — idemo direktno na GET sa malim timeout-om
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

export async function fetchFeeds(urls: string[]): Promise<FeedWithItems[]> {
  const results: FeedWithItems[] = []

  for (const url of urls) {
    try {
      const feed = await parser.parseURL(url)

      const items: RSItem[] = (feed.items || []).map((it: any) => {
        const title = (it.title ?? '').toString().trim()
        const link = (it.link ?? '').toString().trim()

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
          title,
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
