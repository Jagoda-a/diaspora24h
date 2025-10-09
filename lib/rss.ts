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

export const RS_SOURCES_RS: string[] = [
  'https://www.rts.rs/rss.html',
  'https://n1info.rs/feed/',
  'https://nova.rs/feed/',
  'https://www.b92.net/info/rss/info.xml',
  'https://www.politika.rs/rss',
  'https://www.danas.rs/feed/',
  'https://www.kurir.rs/rss/vesti',
  'https://www.blic.rs/rss/vesti',
  'https://www.021.rs/rss.php',
  'https://www.vreme.com/feed/'
]

// za DE tržište, ali sadržaj ostaje na srpskom (ti biraš koje koristiš):
export const RS_SOURCES_DE: string[] = [
  'https://www.dw.com/rs/rss',      // DW na srpskom
  'https://www.dw.com/sr-Latn/rss', // DW latinično
]

const parser = new Parser()

export async function fetchFeeds(urls: string[]): Promise<FeedWithItems[]> {
  const results: FeedWithItems[] = []

  for (const url of urls) {
    try {
      const feed = await parser.parseURL(url)
      const items: RSItem[] = (feed.items || []).map((it: any) => {
        const title = (it.title ?? '').toString().trim()
        const link = (it.link ?? '').toString().trim()

        // Neki feedovi vraćaju content:encoded, neki content, neki samo snippet
        const contentEncoded = it['content:encoded'] as string | undefined
        const content = it.content as string | undefined
        const contentHtml = contentEncoded ?? content ?? undefined
        const contentSnippet = (it.contentSnippet ?? it.summary ?? '').toString() || undefined

        return {
          title,
          link,
          contentSnippet,
          isoDate: it.isoDate,
          pubDate: it.pubDate,
          enclosure: it.enclosure,
          content,       // plain ili HTML kako ga feed da
          contentHtml,   // prioritetno content:encoded
        }
      })

      results.push({ url, items })
    } catch (e) {
      console.error('RSS error:', url, e)
    }
  }

  return results
}
