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

function stripHtml(html?: string | null) {
  if (!html) return ''
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function pickFirst(arr: (string | undefined | null)[], maxLen = 2000) {
  for (const s of arr) {
    if (s && s.trim()) return s.trim().slice(0, maxLen)
  }
  return ''
}

function containsCyrillic(s: string) {
  return /[\u0400-\u04FF]/.test(s)
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
  let slug = slugify(base)
  if (!slug) slug = 'vest'
  let i = 1
  while (true) {
    const existing = await prisma.article.findUnique({ where: { slug } })
    if (!existing) return slug
    i++
    slug = `${slug}-${i}`
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

/** AUTH — prihvata i header i query param. Loguje prisustvo tokena radi debug-a. */
function requireTokenOrPass(req: Request): NextResponse | null {
  const required = (process.env.INGEST_TOKEN ?? '').trim()
  const url = new URL(req.url)
  const gotHdr = (req.headers.get('x-ingest-token') ?? '').trim()
  const gotQ = (url.searchParams.get('token') ?? '').trim()

  // privremeni log (bez izbacivanja stvarnog tokena)
  console.log('[INGEST AUTH]', {
    required_len: required ? required.length : 0,
    gotHdr: Boolean(gotHdr),
    gotQ: Boolean(gotQ),
  })

  if (!required) return null // ako nema env-a, pusti zahtev
  if (gotHdr === required || gotQ === required) return null

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

/** Glavna ingest logika */
async function runIngest() {
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

  const byTitle = new Map<string, FlatItem[]>()
  for (const it of allItems) {
    const key = normTitleKey(it.title)
    if (!key) continue
    const arr = byTitle.get(key) || []
    arr.push(it)
    byTitle.set(key, arr)
  }

  let created = 0
  let updated = 0

  for (const [, group] of byTitle) {
    const first = group[0]

    // ako želiš samo latinicu — preskoči ćirilicu:
    // if (containsCyrillic(first.title)) continue

    const ai = await summarizeFromItem(first)
    const category = classifyTitle(ai.title, first.link)
    const coverImage = firstValidCover(group.map(i => i.coverUrl))
    const publishedAt =
      (first.isoDate ? new Date(first.isoDate) : (first.pubDate ? new Date(first.pubDate) : new Date()))

    const byLink = await prisma.article.findFirst({ where: { sourceUrl: first.link } })
    if (byLink) {
      const updates: Record<string, any> = {}
      if (!byLink.coverImage && coverImage) updates.coverImage = coverImage
      if (!byLink.summary) updates.summary = ai.summary
      if (!byLink.content) updates.content = ai.content

      if (Object.keys(updates).length > 0) {
        await prisma.article.update({
          where: { id: byLink.id },
          data: updates,
        })
        updated++
      }
      continue
    }

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
  }

  return { created, updated }
}

/** GET */
export async function GET(req: Request) {
  const authErr = requireTokenOrPass(req)
  if (authErr) return authErr

  try {
    const { created, updated } = await runIngest()
    return NextResponse.json({ ok: true, created, updated })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ ok: false, error: 'Ingest failed' }, { status: 500 })
  }
}

/** POST */
export async function POST(req: Request) {
  const authErr = requireTokenOrPass(req)
  if (authErr) return authErr

  try {
    const { created, updated } = await runIngest()
    return NextResponse.json({ ok: true, created, updated })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ ok: false, error: 'Ingest failed' }, { status: 500 })
  }
}
