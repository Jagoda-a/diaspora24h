// app/api/ingest/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { slugify } from '@/lib/slug'
import { fetchFeeds, RS_SOURCES_RS, resolveBestCover } from '@/lib/rss'
import { aiRewrite } from '@/lib/ai'
import { classifyTitle } from '@/lib/cats'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type FlatItem = {
  sourceName: string
  title: string
  link: string
  linkCanon?: string | null
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

function sanitizeAbsoluteUrl(url?: string | null, base?: string) {
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

/** Kanonikalizuj link (origin + pathname, bez query/frag) */
function canonicalizeLink(u?: string | null): string | null {
  if (!u) return null
  try {
    const x = new URL(u)
    return `${x.origin}${x.pathname}`
  } catch { return null }
}

/** NEMOJ zahtevati ekstenziju (.jpg); mnogi CDN-ovi je nemaju u path-u */
function isImagePathLike(urlStr: string) {
  try {
    const u = new URL(urlStr)
    return /^https?:$/.test(u.protocol) && !!u.hostname
  } catch { return false }
}

/** REŠI relativne <img src> u odnosu na URL članka */
function extractImageUrl(html?: string | null, baseForRel?: string) {
  if (!html) return null
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  if (!m) return null
  const raw = m[1]
  const abs = sanitizeAbsoluteUrl(raw, baseForRel || undefined)
  return abs && isImagePathLike(abs) ? abs : null
}

/** Prvi “verovatan” image URL; ne odbacuj zbog ekstenzije */
function firstValidCover(urls: (string | null | undefined)[]) {
  for (const u of urls) {
    const abs = sanitizeAbsoluteUrl(u || undefined)
    if (abs && isImagePathLike(abs)) return abs
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

function requireTokenOrPass(req: Request): NextResponse | null {
  const required = (process.env.INGEST_TOKEN ?? '').trim()
  if (!required) return null // dev/test

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
    (/^Bearer\s+(.+)$/i.test(hdrBearer) && hdrBearer.replace(/^Bearer\s+/i, '').trim() === required)

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

      // enclosure (ako je image)
      let fromEnclosure: string | null = null
      if (it.enclosure?.url) {
        const type = String(it.enclosure.type || '').toLowerCase()
        const url = sanitizeAbsoluteUrl(it.enclosure.url, it.link)
        if (url && (type.startsWith('image/') || isImagePathLike(url))) {
          fromEnclosure = url
        }
      }

      // relativni src rešavamo prema it.link
      const fromHtml = extractImageUrl(contentHtml || it.contentSnippet, it.link)

      const linkCanon = canonicalizeLink(it.link)

      allItems.push({
        sourceName: host,
        title: it.title || 'Vest',
        link: it.link,
        linkCanon,
        contentSnippet: it.contentSnippet,
        contentHtml,
        isoDate: it.isoDate,
        pubDate: it.pubDate,
        enclosureUrl: fromEnclosure,
        coverUrl: firstValidCover([fromHtml, fromEnclosure]),
      })
    }
  }

  // Grupisanje po normalizovanom naslovu
  const byTitle = new Map<string, FlatItem[]>()
  for (const it of allItems) {
    const key = normTitleKey(it.title)
    if (!key) continue
    const arr = byTitle.get(key) || []
    arr.push(it)
    byTitle.set(key, arr)
  }

  // Prvih N grupa (najskorije)
  const groups = Array.from(byTitle.values()).slice(0, limit)
  return groups
}

async function resolveCoverHard(first: FlatItem, group: FlatItem[]): Promise<string | null> {
  // 1) pokušaj iz feed-a
  let cover = firstValidCover(group.map(i => i.coverUrl))
  if (cover) return cover

  // 2) poslednja šansa: og:image ili prvi <img> sa stranice članka
  try {
    cover = await resolveBestCover({
      title: first.title,
      link: first.link,
      contentSnippet: first.contentSnippet,
      contentHtml: first.contentHtml,
      enclosure: first.enclosureUrl ? { url: first.enclosureUrl, type: 'image/*' } : undefined,
      isoDate: first.isoDate,
      pubDate: first.pubDate,
      content: first.contentHtml,
    } as any)
    if (cover && isImagePathLike(cover)) return cover
  } catch {}
  return null
}

/** meka deduplikacija po naslovu (poslednja 3 dana) */
async function looksLikeRecentDuplicateByTitle(title: string) {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  const probe = (title || '').slice(0, 48)
  if (!probe) return null
  const maybe = await prisma.article.findFirst({
    where: {
      publishedAt: { gte: threeDaysAgo },
      OR: [
        { title: { contains: probe, mode: 'insensitive' } },
        { slug:  { contains: slugify(probe), mode: 'insensitive' } },
      ],
    },
    orderBy: { publishedAt: 'desc' },
  })
  return maybe
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
      const linkCanon = first.linkCanon || canonicalizeLink(first.link) || first.link

      // 0) meka deduplikacija po naslovu (ako već postoji skoro identično)
      const recentDupe = await looksLikeRecentDuplicateByTitle(first.title || '')
      if (recentDupe) {
        // eventualno dopuni cover/summary/content ako fale
        const updates: Record<string, any> = {}
        if (!recentDupe.coverImage) {
          const coverImage = await resolveCoverHard(first, group)
          if (coverImage) updates.coverImage = coverImage
        }
        if ((!recentDupe.summary || !recentDupe.content)) {
          const ai = await summarizeFromItem(first)
          if (!recentDupe.summary && ai.summary) updates.summary = ai.summary
          if (!recentDupe.content && ai.content) updates.content = ai.content
        }
        if (Object.keys(updates).length > 0) {
          await prisma.article.update({ where: { id: recentDupe.id }, data: updates })
          updated++
        }
        return
      }

      // 1) tvrda deduplikacija po linku (kanonski ili originalni)
      const byLink = await prisma.article.findFirst({
        where: { OR: [{ sourceUrl: first.link }, { sourceUrl: linkCanon }] }
      })
      if (byLink) {
        const updates: Record<string, any> = {}
        if (!byLink.coverImage) {
          const coverImage = await resolveCoverHard(first, group)
          if (coverImage) updates.coverImage = coverImage
        }
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

      // 2) Novi članak
      const ai = await summarizeFromItem(first)
      const category = classifyTitle(ai.title, first.link)
      const coverImage = await resolveCoverHard(first, group)
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
          sourceUrl: linkCanon, // ← uvek kanonski link
          sourcesJson: null,
          language: 'sr',
          publishedAt,
          category,
        },
      })
      created++
    })

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
