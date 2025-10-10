// app/api/admin/backfill-covers/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/* =========================
   AUTH (ADMIN/BACKFILL token)
========================= */
function requireAdmin(req: Request): NextResponse | null {
  const need =
    (process.env.BACKFILL_TOKEN ?? '').trim() ||
    (process.env.ADMIN_TOKEN ?? '').trim()

  if (!need) return null // dev/test

  const url = new URL(req.url)
  const q = (url.searchParams.get('token') ?? '').trim()
  const hdr = (req.headers.get('authorization') ?? '').trim()
  const simple = (req.headers.get('x-admin-token') ?? '').trim()

  const ok =
    q === need ||
    simple === need ||
    (/^Bearer\s+(.+)$/i.test(hdr) && hdr.replace(/^Bearer\s+/i, '') === need)

  if (ok) return null
  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
}

function parseQuery(req: Request) {
  const u = new URL(req.url)
  const limit = Math.max(1, Math.min(parseInt(u.searchParams.get('limit') ?? '200', 10) || 200, 1000))
  const dryRun = u.searchParams.get('dryRun') === '1'
  // onlyMissing=1 (default) → hvataj samo one bez cover-a
  const onlyMissing = u.searchParams.get('onlyMissing') !== '0'
  // force=1 → prepiši i postojeće cover-e
  const force = u.searchParams.get('force') === '1'
  return { limit, dryRun, onlyMissing, force }
}

/* =========================
   Helpers (fetch & parse)
========================= */
const TIMEOUT_MS = 15_000

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

function isImagePath(pathname: string) {
  return /\.(png|jpe?g|webp|gif|avif)$/i.test(pathname)
}

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
  } catch { return u }
}

async function fetchTextSafe(url: string): Promise<string | null> {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; diaspora24h-bot/1.1; +https://diaspora24h.vercel.app)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'sr,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': new URL(url).origin,
      },
      redirect: 'follow',
      cache: 'no-store',
    })
    if (!res.ok) return null
    const html = await res.text()
    return html || null
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

function extractOgImage(html: string, base?: string): string | null {
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

function extractFirstImg(html?: string | null, base?: string): string | null {
  if (!html) return null
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  if (m) return sanitizeAbsoluteUrl(m[1], base)
  return null
}

async function looksLikeImage(url: string): Promise<boolean> {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), 8000)
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: ac.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; diaspora24h-bot/1.1; +https://diaspora24h.vercel.app)',
        'Accept': 'image/avif,image/webp,image/*;q=0.8,*/*;q=0.5',
        'Referer': new URL(url).origin,
      },
      redirect: 'follow',
      cache: 'no-store',
    })
    if (!res.ok) return isImagePath(new URL(url).pathname)
    const ct = (res.headers.get('content-type') || '').toLowerCase()
    if (ct.startsWith('image/')) return true
    return isImagePath(new URL(url).pathname)
  } catch {
    try { return isImagePath(new URL(url).pathname) } catch { return false }
  } finally {
    clearTimeout(t)
  }
}

async function resolveCoverFromPage(articleUrl: string): Promise<string | null> {
  const base = (() => { try { return new URL(articleUrl).origin } catch { return undefined } })()
  const html = await fetchTextSafe(articleUrl)
  if (!html) return null

  const og = extractOgImage(html, base)
  if (og) return stripTrackingParams(og)

  const img = extractFirstImg(html, base)
  if (img) return stripTrackingParams(img)

  return null
}

/* =========================
   Backfill logika
========================= */
type Counters = Record<string, number>

async function backfill({ limit, onlyMissing, force, dryRun }: {
  limit: number
  onlyMissing: boolean
  force: boolean
  dryRun: boolean
}) {
  const where = onlyMissing && !force
    ? { OR: [{ coverImage: null as any }, { coverImage: '' }] }
    : {} // force ili onlyMissing=0 → uzmi sve

  const articles = await prisma.article.findMany({
    where,
    orderBy: { publishedAt: 'desc' },
    take: limit,
    select: { id: true, sourceUrl: true, coverImage: true, slug: true },
  })

  let updated = 0
  let skipped = 0
  let checked = 0
  const reasons: Counters = {}

  const CHUNK = 10
  for (let i = 0; i < articles.length; i += CHUNK) {
    const batch = articles.slice(i, i + CHUNK)

    const tasks = batch.map(async (a) => {
      checked++

      const hasCover = !!(a.coverImage && a.coverImage.trim())
      if (hasCover && !force) {
        skipped++; reasons['already_has_cover'] = (reasons['already_has_cover'] || 0) + 1
        return
      }

      const link = a.sourceUrl ?? undefined
      if (!link) {
        skipped++; reasons['no_source_url'] = (reasons['no_source_url'] || 0) + 1
        return
      }

      const img = await resolveCoverFromPage(link)
      if (!img) {
        skipped++; reasons['not_found_on_page'] = (reasons['not_found_on_page'] || 0) + 1
        return
      }

      const ok = await looksLikeImage(img)
      if (!ok) {
        skipped++; reasons['not_image_like'] = (reasons['not_image_like'] || 0) + 1
        return
      }

      if (!dryRun) {
        await prisma.article.update({
          where: { id: a.id },
          data: { coverImage: img },
        })
      }
      updated++
    })

    await Promise.allSettled(tasks)
  }

  return { total: articles.length, checked, updated, skipped, reasons }
}

/* =========================
   Handler
========================= */
export async function GET(req: Request) {
  const auth = requireAdmin(req)
  if (auth) return auth

  const params = parseQuery(req)

  try {
    const result = await backfill(params)
    return NextResponse.json({ ok: true, ...params, ...result })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ ok: false, error: 'backfill failed' }, { status: 500 })
  }
}
