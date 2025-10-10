// app/api/ingest/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { slugify } from '@/lib/slug'
import { fetchFeeds, RS_SOURCES_RS } from '@/lib/rss'
import { aiRewrite } from '@/lib/ai'
import { classifyTitle } from '@/lib/cats'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type FlatItem = {
  sourceName: string
  title: string
  link: string
  contentSnippet?: string
  contentHtml?: string
  isoDate?: string
  pubDate?: string
  enclosureUrl?: string | null
  coverUrl?: string | null
}

/* -------------------------
   Utility
------------------------- */

function stripHtml(html?: string | null) {
  if (!html) return ''
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function pickFirst(arr: (string | undefined | null)[], maxLen = 6000) {
  for (const s of arr) {
    if (s && s.trim()) return s.trim().slice(0, maxLen)
  }
  return ''
}

function sanitizeAbsoluteUrl(url?: string | null) {
  if (!url) return null
  try {
    const u = new URL(url)
    if (!/^https?:$/.test(u.protocol)) return null
    return u.toString()
  } catch { return null }
}

function isImagePath(pathname: string) {
  return /\.(png|jpe?g|webp|gif|avif)$/i.test(pathname)
}

function extractImageUrl(html?: string | null) {
  if (!html) return null
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  if (m) {
    try { return new URL(m[1], 'https://dummy.base').toString() }
    catch { return sanitizeAbsoluteUrl(m[1]) }
  }
  return null
}

function firstValidCover(urls: (string | null | undefined)[]) {
  for (const u of urls) {
    const abs = sanitizeAbsoluteUrl(u || undefined)
    if (!abs) continue
    try {
      const p = new URL(abs).pathname
      if (isImagePath(p)) return abs
    } catch {}
  }
  return null
}

function normTitleKey(s?: string | null) {
  return (s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/["'«»„”“]/g, '')
    .trim()
}

async function findUniqueSlug(base: string) {
  const root = slugify(base) || 'vest'
  let slug = root
  let i = 2
  // pokušaj dok ne nađemo slobodan slug
  // (slug-2, slug-3, ...)
  while (true) {
    const existing = await prisma.article.findUnique({ where: { slug } })
    if (!existing) return slug
    slug = `${root}-${i++}`
  }
}

async function summarizeFromItem(item: FlatItem) {
  const plainText = pickFirst([stripHtml(item.contentHtml) || item.contentSnippet || ''], 6000)
  const ai = await aiRewrite({
    sourceTitle: item.title || 'Vest',
    plainText,
    language: 'sr',
    country: 'rs',
    sourceName: item.sourceName || 'izvor',
  })
  return ai
}

/* -------------------------
   Auth + query params
------------------------- */

/** Prihvata: ?token=... ili ?secret=... ili ?pass=... ili header Authorization: Bearer <token> / x-ingest-token: <token> */
function requireTokenOrPass(req: Request): NextResponse | null {
  const required = (process.env.INGEST_TOKEN ?? '').trim()
  if (!required) return null // ako nije setovan, dozvoli (dev/test)

  const url = new URL(req.url)
  const q =
    (url.searchParams.get('token') ?? '') ||
    (url.searchParams.get('secret') ?? '') ||
    (url.searchParams.get('pass') ?? '')
  const hdrBearer = req.headers.get('authorization') || ''
  const hdrSimple = req.headers.get('x-ingest-token') || ''

  const ok =
    q.trim() === required ||
    hdrSimple.trim() === required ||
    /^Bearer\s+(.+)$/.test(hdrBearer) && hdrBearer.replace(/^Bearer\s+/i, '').trim() === required

  if (ok) return null
  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
}

function parseQuery(req: Request) {
  const url = new URL(req.url)
  const limit = Math.max(1, Math.min(+(url.searchParams.get('limit') ?? 10), 25))
  const dryRun = url.searchParams.get('dryRun') === '1'
  return { limit, dryRun }
}

/* -------------------------
   Ingest
------------------------- */

async function gatherItems(limit: number) {
  const feeds = await fetchFeeds(RS_SOURCES_RS)

  const allItems: FlatItem[] = []
  for (const f of feeds) {
    const fallbackHost = (() => { try { return new URL(f.url).host } catch { return 'unknown' } })()
    for (const it of f.items as any[]) {
      const host = (() => {
        try { return new URL(it.link).hostname } catch { return fallbackHost }
      })()

      const contentHtml: string | undefined =
        it['content:encoded'] || it.contentHtml || it.content || undefined

      // enclosure kao cover (ako je image)
      let fromEnclosure: string | null = null
      if (it.enclosure?.url) {
        const type = String(it.enclosure.type || '').toLowerCase()
        const url = sanitizeAbsoluteUrl(it.enclosure.url)
        if (url && (type.startsWith('image/') || isImagePath(new URL(url).pathname))) {
          fromEnclosure = url
        }
      }

      const fromHtml = extractImageUrl(contentHtml || it.contentSnippet)

      allItems.push({
        sourceName: host,
        title: it.title || 'Vest',
        link: it.link,
        contentSnippet: it.contentSnippet,
        contentHtml,
        isoDate: it.isoDate,
        pubDate: it.pubDate,
        enclosureUrl: fromEnclosure,
        coverUrl: firstValidCover([fromHtml, fromEnclosure]),
      })
    }
  }

  // Dedup po “normalizovanom” naslovu (grupisanje varijanti iste vesti)
  const byTitle = new Map<string, FlatItem[]>()
  for (const it of allItems) {
    const key = normTitleKey(it.title)
    if (!key) continue
    const arr = byTitle.get(key) || []
    arr.push(it)
    byTitle.set(key, arr)
  }

  // Uzmi prvih N grupa (limit), pošto su feedovi već u “skorije” redosledu
  const groups = Array.from(byTitle.values()).slice(0, limit)
  return groups
}

async function runIngest(limit: number) {
  const groups = await gatherItems(limit)

  let created = 0
  let updated = 0

  // mini konkurentnost: batch po 3 grupe
  const CHUNK = 3
  for (let i = 0; i < groups.length; i += CHUNK) {
    const batch = groups.slice(i, i + CHUNK)
    const tasks = batch.map(async (group) => {
      const first = group[0]

      // Deduplikacija po sourceUrl (ako već postoji – samo dopuni prazna polja)
      const byLink = await prisma.article.findFirst({ where: { sourceUrl: first.link } })
      if (byLink) {
        // eventualno osveži cover/summary/content ako nedostaju
        const coverImage = firstValidCover(group.map(i => i.coverUrl))
        const updates: Record<string, any> = {}

        if (!byLink.coverImage && coverImage) updates.coverImage = coverImage
        if (!byLink.summary || !byLink.content) {
          const ai = await summarizeFromItem(first)
          if (!byLink.summary && ai.summary) updates.summary = ai.summary
          if (!byLink.content && ai.content) updates.content = ai.content
        }

        if (Object.keys(updates).length > 0) {
          await prisma.article.update({ where: { id: byLink.id }, data: updates })
          updated++
        }
        return
      }

      // Nema po linku? Radi AI rewrite i kreiraj
      const ai = await summarizeFromItem(first)
      const category = classifyTitle(ai.title, first.link)
      const coverImage = firstValidCover(group.map(i => i.coverUrl))
      const publishedAt =
        (first.isoDate ? new Date(first.isoDate) :
         first.pubDate ? new Date(first.pubDate) : new Date())

      const uniqueSlug = await findUniqueSlug(ai.title)

      await prisma.article.create({
        data: {
          country: 'rs',
          title: ai.title,
          slug: uniqueSlug,
          summary: ai.summary,
          content: ai.content,
          coverImage,
          sourceUrl: first.link,
          sourcesJson: null,
          language: 'sr',
          publishedAt,
          category,
        },
      })
      created++
    })

    // ne ruši batch ako jedna padne
    await Promise.allSettled(tasks)
  }

  return { created, updated }
}

/* -------------------------
   Handleri
------------------------- */

export async function GET(req: Request) {
  const authErr = requireTokenOrPass(req)
  if (authErr) return authErr

  const { limit, dryRun } = parseQuery(req)

  if (dryRun) {
    const groups = await gatherItems(limit)
    const sample = groups.slice(0, 10).map(g => g[0]?.title || 'Vest')
    return NextResponse.json({ ok: true, dryRun: true, groups: groups.length, sample })
  }

  try {
    const { created, updated } = await runIngest(limit)
    return NextResponse.json({ ok: true, created, updated })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ ok: false, error: 'Ingest failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const authErr = requireTokenOrPass(req)
  if (authErr) return authErr

  const { limit } = parseQuery(req)
  try {
    const { created, updated } = await runIngest(limit)
    return NextResponse.json({ ok: true, created, updated })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ ok: false, error: 'Ingest failed' }, { status: 500 })
  }
}
