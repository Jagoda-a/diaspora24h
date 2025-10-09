// app/api/admin/article/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { readSession } from '@/lib/auth'
import { slugify } from '@/lib/slug'
import { aiSummarize } from '@/lib/ai'
import { fetchFeeds, RS_SOURCES_RS } from '@/lib/rss'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAuthed() {
  const c = cookies().get('admin_session')?.value
  return !!readSession(c || '')
}

type Body = {
  link: string
  country?: string
  category?: string
  language?: string
}

function normalizeUrl(u: string) {
  try {
    const url = new URL(u)
    url.hash = ''
    return url.toString()
  } catch {
    return u.trim()
  }
}

function stripHtml(html: string) {
  return html
    .replace(/<\/(script|style)>/gi, '\n')
    .replace(/<(script|style)[^>]*>.*?<\/\1>/gsi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchPagePlainText(url: string): Promise<{ title?: string; text?: string }> {
  try {
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) return {}
    const html = await res.text()
    const mTitle =
      html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1] ||
      html.match(/<title>([^<]+)<\/title>/i)?.[1]
    const text = stripHtml(html)
    return { title: mTitle?.trim(), text }
  } catch {
    return {}
  }
}

export async function POST(req: Request) {
  if (!isAuthed()) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const { link, country = 'rs', category = 'nepoznato', language = 'sr' } =
    (await req.json().catch(() => ({}))) as Body
  if (!link) return NextResponse.json({ ok: false, error: 'missing_link' }, { status: 400 })

  const url = normalizeUrl(link)

  // 0) Duplikat po sourceUrl?
  const exists = await prisma.article.findFirst({ where: { sourceUrl: url } })
  if (exists) return NextResponse.json({ ok: true, duplicate: true, id: exists.id })

  // 1) Probaj da nađeš item u RSS izvorima
  let title: string | undefined
  let contentHtml: string | undefined
  let plainText: string | undefined

  try {
    const feeds = await fetchFeeds(RS_SOURCES_RS)
    const all = feeds.flatMap(f => f.items ?? [])
    const item = all.find(it => {
      const L = (it.link || '').replace(/#.*$/, '')
      return L === url || L.includes(url) || url.includes(L)
    })
    if (item) {
      title = item.title?.trim()
      contentHtml = (item as any).contentHtml || (item as any).content || ''
      plainText = stripHtml(contentHtml || item.contentSnippet || '')
    }
  } catch {
    // ignoriši, ima fallback ispod
  }

  // 2) Ako nema iz RSS-a, skrejpuj stranicu
  if (!plainText) {
    const page = await fetchPagePlainText(url)
    title = title || page.title
    plainText = page.text
  }

  if (!title || !plainText) {
    return NextResponse.json({ ok: false, error: 'unreadable_source' }, { status: 422 })
  }

  // 3) AI rezime
  const ai = await aiSummarize({ title, plainText, language })
  const finalTitle = (ai.title || title).trim()
  const slug = slugify(finalTitle)

  // 4) Izbegni sudar sluga
  let finalSlug = slug
  for (let i = 2; i < 100; i++) {
    const clash = await prisma.article.findUnique({ where: { slug: finalSlug } })
    if (!clash) break
    finalSlug = `${slug}-${i}`
  }

  // 5) Upis
  const now = new Date()
  const created = await prisma.article.create({
    data: {
      country,
      title: finalTitle,
      slug: finalSlug,
      summary: ai.content.trim(),
      coverImage: null,
      sourceUrl: url,
      sourcesJson: null,
      language,
      publishedAt: now,
      content: null,
      category,
    },
    select: { id: true, slug: true, title: true }
  })

  return NextResponse.json({ ok: true, created })
}
