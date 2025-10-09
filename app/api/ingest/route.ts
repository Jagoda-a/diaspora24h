// app/api/ingest/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { slugify } from '@/lib/slug'
import { fetchFeeds, RS_SOURCES_RS, resolveBestCover, asProxiedImage } from '@/lib/rss'
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

function normTitleKey(s?: string | null) {
  return (s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/["'«»„”“]/g, '')
    .trim()
}

// nađe jedinstven slug
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

// ukloni duplikate rečenica (prosta heuristika)
function dedupeSentences(text: string): string {
  const parts = text
    .split(/([.!?]+)\s+/)
    .reduce<string[]>((acc, cur, idx, arr) => {
      if (idx % 2 === 0) {
        const punct = arr[idx + 1] || ''
        acc.push((cur + punct).trim())
      }
      return acc
    }, [])
    .filter(Boolean)

  const seen = new Set<string>()
  const out: string[] = []
  for (const s of parts) {
    const key = s.toLowerCase().replace(/\s+/g, ' ').trim()
    if (key && !seen.has(key)) {
      seen.add(key)
      out.push(s)
    }
  }
  return out.join(' ')
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
  ai.content = dedupeSentences(ai.content || '')
  ai.summary = dedupeSentences(ai.summary || '')
  return ai
}

async function handleIngest(req: NextRequest) {
  const headerToken = req.headers.get('x-ingest-token') || ''
  const envToken = process.env.INGEST_TOKEN || ''
  if (!envToken || headerToken !== envToken) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const feeds = await fetchFeeds(RS_SOURCES_RS)

  const allItems: FlatItem[] = []
  for (const f of feeds) {
    const fallbackHost = (() => { try { return new URL(f.url).host } catch { return 'unknown' } })()
    for (const it of f.items as any[]) {
      const host = (() => { try { return new URL(it.link).hostname } catch { return fallbackHost } })()

      const contentHtml: string | undefined =
        it['content:encoded'] || it.contentHtml || it.content || undefined

      let cover: string | null = await resolveBestCover(it)
      if (cover) cover = asProxiedImage(cover) // proxy kroz /api/img

      allItems.push({
        sourceName: host,
        title: it.title || 'Vest',
        link: it.link,
        contentSnippet: it.contentSnippet,
        contentHtml,
        isoDate: it.isoDate,
        pubDate: it.pubDate,
        coverUrl: cover,
      })
    }
  }

  // grupiši po normalizovanom naslovu (isti događaj sa više izvora)
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

    const ai = await summarizeFromItem(first)
    const category = classifyTitle(ai.title, first.link)
    const coverImage = first.coverUrl || null

    const publishedAt =
      (first.isoDate ? new Date(first.isoDate) : (first.pubDate ? new Date(first.pubDate) : new Date()))

    // već postoji po sourceUrl?
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

  return NextResponse.json({ ok: true, created, updated })
}

export async function GET(req: NextRequest) {
  return handleIngest(req)
}
export async function POST(req: NextRequest) {
  return handleIngest(req)
}
