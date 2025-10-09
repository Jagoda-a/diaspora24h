// lib/rss.ts
import Parser from 'rss-parser'

export type RSItem = {
  title: string
  link: string
  contentSnippet?: string
  isoDate?: string
  pubDate?: string
  enclosure?: { url?: string }
  // dodatno:
  content?: string         // plain/text ili HTML iz nekih feedova
  contentHtml?: string     // HTML iz content:encoded ili content
}

export type FeedWithItems = {
  url: string
  items: RSItem[]
}

/**
 * PROVERENI RSS IZVORI (Srbija/region) — svi su stvarni XML feedovi.
 * Po želji možeš dodati još, ali izbegavaj HTML "indeks" stranice.
 */
export const RS_SOURCES_RS: string[] = [
  'https://n1info.rs/feed/',
  'https://nova.rs/feed/',
  'https://www.b92.net/rss/b92/info',
  'https://www.politika.rs/rss',
  'https://www.danas.rs/feed/',
  'https://www.kurir.rs/rss/vesti',
  'https://www.blic.rs/rss/vesti',
  'https://www.vreme.com/feed/',
]

// za DE tržište, ali sadržaj ostaje na srpskom (DW na srpskom/latinici)
export const RS_SOURCES_DE: string[] = [
  'https://www.dw.com/rs/rss',      // DW (ćirilica)
  'https://www.dw.com/sr-Latn/rss', // DW (latinica)
]

// -----------------------------
// Interni helperi
// -----------------------------

/**
 * Neki sajtovi traže normalan User-Agent i Accept header.
 * Ovde radimo "prefetch" uz header-e i timeout, pa zatim parseString().
 */
async function fetchTextWithTimeout(url: string, timeoutMs = 12000): Promise<string> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'diaspora24h-bot/1.0 (+https://example.com)',
        'Accept': 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.7',
      },
      cache: 'no-store',
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(t)
  }
}

/**
 * Parse jedne XML žice u feed pomoću rss-parser-a.
 * Uključili smo customFields da pokupimo content:encoded (HTML).
 */
const parser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded'],
    ],
  },
})

function mapItems(items: any[]): RSItem[] {
  return (items ?? []).map((it: any) => {
    const title = (it.title ?? '').toString().trim()
    const link = (it.link ?? '').toString().trim()

    const contentEncoded = (it as any).contentEncoded as string | undefined
    const content = (it.content as string | undefined) ?? undefined
    const contentHtml = contentEncoded ?? content ?? undefined
    const contentSnippet =
      ((it.contentSnippet ?? it.summary ?? '') as string).toString() || undefined

    return {
      title,
      link,
      contentSnippet,
      isoDate: it.isoDate,
      pubDate: it.pubDate,
      enclosure: it.enclosure,
      content,
      contentHtml,
    }
  })
}

// -----------------------------
// Javna funkcija: dovuci više feedova
// -----------------------------
export async function fetchFeeds(urls: string[]): Promise<FeedWithItems[]> {
  const results: FeedWithItems[] = []

  // Radimo paralelno i tolerantno — jedan loš feed neće srušiti sve
  const jobs = urls.map(async (url) => {
    try {
      const xml = await fetchTextWithTimeout(url, 12000)
      const feed = await parser.parseString(xml)
      results.push({ url, items: mapItems(feed.items ?? []) })
    } catch (e) {
      // Ne ruši proces: samo ispiši grešku i nastavi
      console.error('RSS error:', url, e)
    }
  })

  await Promise.allSettled(jobs)
  return results
}
