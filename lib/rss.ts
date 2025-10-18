// lib/rss.ts
import Parser from 'rss-parser'

/* ------------------------------------------------
   0) Safe-image allow list (za filt/validaciju)
------------------------------------------------- */

export const SAFE_IMAGE_HOSTS = new Set<string>([
  // CC/PD (Wikimedia)
  'upload.wikimedia.org',
  'commons.wikimedia.org',

  // Royalty-free
  'images.unsplash.com',
  'unsplash.com',
  'images.pexels.com',
  'pexels.com',
  'cdn.pixabay.com',
  'pixabay.com',

  // Tvoj CDN (po potrebi dodaj/menjaj)
  'cdn.diaspora24h.com',
])

export function isSafeImageHost(u?: string | null) {
  if (!u) return false
  try { return SAFE_IMAGE_HOSTS.has(new URL(u).hostname) } catch { return false }
}

/* ------------------------------------------------
   1) Tipovi (kompatibilno sa postojećim kodom)
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
   2) Bogatiji tip (ako ti zatreba u ingest-u)
------------------------------------------------- */

export type FeedItem = {
  title: string
  url: string                 // permalink na original
  sourceName: string
  publishedAt?: string | null
  summary?: string | null
  contentHtml?: string | null
  plainText: string
  coverImage?: string | null  // rezultat iz open-source pretrage
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

  // Hronika / Vesti
  'https://www.kurir.rs/rss/vesti',
  'https://www.kurir.rs/rss/hronika',
]

// Dodatni feedovi (DE tržište na srpskom)
export const RS_SOURCES_DE: string[] = [
  'https://www.dw.com/rs/rss',
  'https://www.dw.com/sr-Latn/rss',
]

/* ------------------------------------------------
   4) Parser i osnovni HTTP helpers
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
    try { if (base) return new URL(url, base).toString() } catch {}
    return null
  }
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

// kroz /api/img proxy da izbegnemo hotlink/CORS blokade (ako koristiš)
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
    const h = hostname.replace(/^www\./, '').replace(/^m\./, '')
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

        return {
          title: rawTitle,
          link,
          contentSnippet,
          isoDate: it.isoDate,
          pubDate: it.pubDate,
          // enclosure/og/img iz RSS-a IGNORIŠEMO za slike (ne koristimo više)
          enclosure: undefined,
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
   8) Pametna izgradnja upita za slike (iz naslova i teksta)
------------------------------------------------- */

function cleanQuery(s: string): string {
  return (s || '').replace(/[„“"”'’]+/g, '').replace(/\s+/g, ' ').trim()
}

function extractCapitalPhrases(text: string, cap = 6): string[] {
  const words = (text || '').split(/\s+/)
  const phrases: string[] = []
  let buf: string[] = []
  for (const w of words) {
    const ww = w.replace(/^[("'\-]+|[)"'\-.,;:!?]+$/g, '')
    const isCap = /^[A-ZŠĐČĆŽ]/.test(ww)
    if (isCap && ww.length > 1) buf.push(ww)
    else {
      if (buf.length) { phrases.push(buf.join(' ')); buf = [] }
    }
  }
  if (buf.length) phrases.push(buf.join(' '))
  const stop = new Set(['U','Na','Sa','O','I','Za','Do','Od','Po','Kod'])
  return phrases.map(cleanQuery).filter(p => p && p.length >= 3 && !stop.has(p)).slice(0, cap)
}

const STOPWORDS = new Set([
  'je','u','na','i','da','se','su','za','od','do','po','o','kod','sa','bez','ali','dok','jer','kao',
  'kroz','pre','posle','bi','će','ne','nije','jesu','ili','te','ta','to','ti','odnosno','među','više',
  'manje','protiv','zbog','oko','s','uz','preko','ovu','ove','ovaj','ovo','takođe','koji','koja','koje',
  'što','nije','biti','bila','bilo','bili','bile','smo','ste','sam','si','će','ćeš','ćemo','ćete',
  'u','srbiji','srbije','beogradu','beograd'
])
function topKeywordsFromText(text: string, max = 6): string[] {
  const freq = new Map<string, number>()
  const words = (text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)

  for (const w of words) {
    if (w.length < 4) continue
    if (STOPWORDS.has(w)) continue
    if (/^\d+$/.test(w)) continue
    freq.set(w, (freq.get(w) || 0) + 1)
  }

  return [...freq.entries()]
    .sort((a,b) => b[1]-a[1])
    .slice(0, max)
    .map(([w]) => w)
}

export function makeImageQueriesFromNews(title: string, plainText?: string): string[] {
  const baseTitle = cleanQuery(title)
  const baseText  = cleanQuery((plainText || '').slice(0, 1000))

  const capsTitle = extractCapitalPhrases(baseTitle, 5)
  const capsText  = extractCapitalPhrases(baseText, 5)
  const keywords  = topKeywordsFromText(baseText, 6)

  const boosters = ['portret', 'press', 'konferencija', 'zvanična fotografija', 'ilustracija']

  const queries: string[] = []
  for (const p of capsTitle) { queries.push(p); queries.push(`${p} ${boosters[0]}`) }
  for (const p of capsText) { if (!queries.includes(p)) queries.push(p) }
  for (const k of keywords) queries.push(k)
  if (baseTitle) queries.push(baseTitle)

  const uniq = Array.from(new Set(queries.map(q => q.trim()).filter(Boolean)))
  return uniq.slice(0, 10)
}

/* ------------------------------------------------
   9) Pretraga slika: Wikimedia (bez ključa) + RF servisi (opciono)
------------------------------------------------- */

// ENV ključevi za royalty-free servise (opciono)
const UNSPLASH_KEY = process.env.UNSPLASH_KEY || ''
const PEXELS_KEY   = process.env.PEXELS_KEY || ''
const PIXABAY_KEY  = process.env.PIXABAY_KEY || ''

export async function searchWikimediaImage(query: string): Promise<string | null> {
  if (!query) return null
  const endpoint = 'https://commons.wikimedia.org/w/api.php'
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrlimit: '8',
    gsrnamespace: '6', // File:
    gsrsearch: query,
    prop: 'imageinfo|pageimages',
    iiprop: 'url|extmetadata',
    iiurlwidth: '1600',
    iiurlheight: '1200',
    pithumbsize: '1200',
  })

  try {
    const res = await fetch(`${endpoint}?${params.toString()}`, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (compatible; diaspora24h-bot/1.0; +https://diaspora24h.vercel.app)',
        accept: 'application/json',
      },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    const pages = data?.query?.pages
    if (!pages) return null

    const candidates: string[] = []
    for (const k of Object.keys(pages)) {
      const p = pages[k]
      const ii = Array.isArray(p?.imageinfo) ? p.imageinfo[0] : null
      if (ii?.thumburl) candidates.push(ii.thumburl)
      if (ii?.url) candidates.push(ii.url)
      const thumb = p?.thumbnail?.source
      if (thumb) candidates.push(thumb)
    }
    const first = candidates.find(Boolean) || null
    const url = first ? sanitizeAbsoluteUrl(first) : null
    return url && isSafeImageHost(url) ? url : null
  } catch {
    return null
  }
}

export async function searchRoyaltyFreeImage(query: string): Promise<string | null> {
  if (!query) return null

  // Unsplash
  if (UNSPLASH_KEY) {
    try {
      const u = new URL('https://api.unsplash.com/search/photos')
      u.searchParams.set('query', query)
      u.searchParams.set('per_page', '3')
      u.searchParams.set('content_filter', 'high')
      const res = await fetch(u.toString(), {
        headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
        cache: 'no-store',
      })
      if (res.ok) {
        const j = await res.json()
        const url = j?.results?.[0]?.urls?.regular || j?.results?.[0]?.urls?.full
        if (url && isSafeImageHost(url)) return url
      }
    } catch {}
  }

  // Pexels
  if (PEXELS_KEY) {
    try {
      const u = new URL('https://api.pexels.com/v1/search')
      u.searchParams.set('query', query)
      u.searchParams.set('per_page', '3')
      u.searchParams.set('orientation', 'landscape')
      const res = await fetch(u.toString(), {
        headers: { Authorization: PEXELS_KEY },
        cache: 'no-store',
      })
      if (res.ok) {
        const j = await res.json()
        const url = j?.photos?.[0]?.src?.large2x || j?.photos?.[0]?.src?.large
        if (url && isSafeImageHost(url)) return url
      }
    } catch {}
  }

  // Pixabay
  if (PIXABAY_KEY) {
    try {
      const u = new URL('https://pixabay.com/api/')
      u.searchParams.set('key', PIXABAY_KEY)
      u.searchParams.set('q', query)
      u.searchParams.set('image_type', 'photo')
      u.searchParams.set('order', 'popular')
      u.searchParams.set('per_page', '3')
      u.searchParams.set('safesearch', 'true')
      const res = await fetch(u.toString(), { cache: 'no-store' })
      if (res.ok) {
        const j = await res.json()
        const url = j?.hits?.[0]?.largeImageURL || j?.hits?.[0]?.webformatURL
        if (url && isSafeImageHost(url)) return url
      }
    } catch {}
  }

  return null
}

/* ------------------------------------------------
   10) — KLJUČNO — Cover iz OPEN izvora (bez RSS-a)
------------------------------------------------- */

/**
 * resolveBestCover:
 *  - Ne koristi RSS enclosure / og:image iz izvora.
 *  - Gradi upite iz naslova i plain teksta i traži:
 *      1) Wikimedia Commons (CC/PD, bez ključa)
 *      2) Unsplash / Pexels / Pixabay (ako su postavljeni API ključevi)
 *  - Ako ništa ne nađe, vrati null (ingest koristi kategorijsku sliku)
 */
export async function resolveBestCover(item: RSItem): Promise<string | null> {
  const title = (item.title || '').toString().trim()
  const plain = stripHtml(item.contentHtml || item.contentSnippet || '')

  const queries = makeImageQueriesFromNews(title, plain)

  // 1) probaj Wikimedia za svaku varijantu
  for (const q of queries) {
    const url = await searchWikimediaImage(q)
    if (url && isSafeImageHost(url)) return url
  }

  // 2) ako imaš ključeve, probaj royalty-free servise (Unsplash/Pexels/Pixabay)
  for (const q of queries) {
    const url = await searchRoyaltyFreeImage(q)
    if (url && isSafeImageHost(url)) return url
  }

  // 3) ništa – ingest će postaviti kategorijsku sliku
  return null
}

/* ------------------------------------------------
   11) Pomoćni „collectFeedItems“ (ako želiš da ga koristiš)
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

      // NEW: umesto RSS slike, pokušaj open-source cover preko resolveBestCover
      let coverImage: string | null = null
      try { coverImage = await resolveBestCover(it) } catch {}

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
        coverImage, // već filtrirano kroz whitelist
        language: null,
        country: null,
        categoryGuess: guessCategoryFromUrl(url),
      })
    }
  }
  return out
}
