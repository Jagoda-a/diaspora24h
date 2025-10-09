// app/api/admin/article/[id]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { readSession } from '@/lib/auth'
import { aiSummarize } from '@/lib/ai'
import { fetchFeeds, RS_SOURCES_RS } from '@/lib/rss'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAuthed() {
  const c = cookies().get('admin_session')?.value
  return !!readSession(c || '')
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

async function fetchPagePlainText(url: string): Promise<{ title?: string; text?: string; image?: string }> {
  try {
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) return {}
    const html = await res.text()

    const meta = (name: string) =>
      html.match(new RegExp(`<meta[^>]+(?:property|name)="${name}"[^>]+content="([^"]+)"`, 'i'))?.[1]

    const mTitle =
      meta('og:title') ||
      html.match(/<title>([^<]+)<\/title>/i)?.[1]

    // pokušaji za sliku
    let ogImg = meta('og:image') || meta('twitter:image') || meta('twitter:image:src')

    // normalizuj putanju slike (//cdn…, /img…, bez protokola…)
    try {
      if (ogImg?.startsWith('//')) ogImg = 'https:' + ogImg
      else if (ogImg?.startsWith('/')) ogImg = new URL(ogImg, url).toString()
      else if (ogImg && !/^https?:\/\//i.test(ogImg)) ogImg = new URL(ogImg, url).toString()
    } catch {}

    const text = html
      .replace(/<\/(script|style)>/gi, '\n')
      .replace(/<(script|style)[^>]*>.*?<\/\1>/gsi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    return { title: mTitle?.trim(), text, image: ogImg }
  } catch {
    return {}
  }
}

// GET /api/admin/article/[id]  → vrati ceo zapis
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const a = await prisma.article.findUnique({
    where: { id: params.id },
  })
  if (!a) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }
  return NextResponse.json(a)
}

// PUT /api/admin/article/[id]  → update polja; opcionalno regeneriši summary; uključuje SEO polja
type PutBody = {
  title?: string
  summary?: string
  coverImage?: string | null
  category?: string | null
  publishedAt?: string | null
  language?: string
  regenerateSummary?: boolean

  // SEO polja:
  seoTitle?: string | null
  seoDescription?: string | null
  ogImage?: string | null
  canonicalUrl?: string | null
  noindex?: boolean
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as PutBody
  const a = await prisma.article.findUnique({ where: { id: params.id } })
  if (!a) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })

  let nextSummary = body.summary ?? a.summary
  let nextTitle = body.title ?? a.title

  if (body.regenerateSummary) {
    // pokušaj rezime iz izvora: prvo RSS match, pa fallback na skrejp
    let plainText: string | undefined
    try {
      if (a.sourceUrl) {
        const feeds = await fetchFeeds(RS_SOURCES_RS)
        const all = feeds.flatMap(f => f.items ?? [])
        const item = all.find(it => {
          const L = (it.link || '').replace(/#.*$/, '')
          const U = a.sourceUrl!.replace(/#.*$/, '')
          return L === U || L.includes(U) || U.includes(L)
        })
        if (item) {
          const raw = (item as any).contentHtml ?? (item as any).content ?? item.contentSnippet ?? ''
          plainText = stripHtml(raw)
          if (!nextTitle) nextTitle = (item.title || a.title).trim()
        }
      }
    } catch {
      // ignore i idi na page fetch
    }
    if (!plainText && a.sourceUrl) {
      const page = await fetchPagePlainText(a.sourceUrl)
      nextTitle = nextTitle || page.title || a.title
      plainText = page.text
    }

    if (plainText) {
      const ai = await aiSummarize({
        title: nextTitle || a.title,
        plainText,
        language: body.language || a.language || 'sr',
      })
      nextSummary = ai.content?.trim() || nextSummary
      // ako AI vrati naslov i nemaš custom title u body, možeš prihvatiti
      if (!body.title && ai.title) {
        nextTitle = ai.title.trim()
      }
    }
  }

  const data: any = {
    title: nextTitle,
    summary: nextSummary,
    coverImage: body.coverImage === '' ? null : body.coverImage ?? a.coverImage,
    category: body.category === '' ? null : body.category ?? a.category,
  }

  if (body.publishedAt !== undefined) {
    data.publishedAt = body.publishedAt ? new Date(body.publishedAt) : null
  }

  if (body.language) {
    data.language = body.language
  }

  // --- SEO polja ---
  if (body.seoTitle !== undefined) data.seoTitle = body.seoTitle || null
  if (body.seoDescription !== undefined) data.seoDescription = body.seoDescription || null
  if (body.ogImage !== undefined) data.ogImage = body.ogImage || null
  if (body.canonicalUrl !== undefined) data.canonicalUrl = body.canonicalUrl || null
  if (typeof body.noindex === 'boolean') data.noindex = body.noindex

  try {
    await prisma.article.update({
      where: { id: params.id },
      data,
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'update_failed' }, { status: 400 })
  }
}

// DELETE /api/admin/article/[id]  → obriši vest
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  try {
    await prisma.article.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'delete_failed' }, { status: 400 })
  }
}
