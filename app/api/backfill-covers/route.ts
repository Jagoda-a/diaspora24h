// app/api/backfill-covers/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/* --------------------------------
   Auth (isti princip kao /api/ingest)
-----------------------------------*/
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

function parseLimit(req: Request) {
  const url = new URL(req.url)
  const n = parseInt(url.searchParams.get('limit') || '40', 10)
  return Math.max(1, Math.min(Number.isFinite(n) ? n : 40, 100))
}

/* --------------------------------
   Helpers
-----------------------------------*/
const TIMEOUT_MS = 15_000

function absUrl(src: string, base?: string | null) {
  try { return new URL(src, base || undefined).toString() } catch { return null }
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
        'User-Agent':
          'Mozilla/5.0 (compatible; diaspora24h-bot/1.1; +https://diaspora24h.vercel.app)',
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
  // Brzi HEAD/GET da proverimo content-type
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), 8000)
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: ac.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; diaspora24h-bot/1.1; +https://diaspora24h.vercel.app)',
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

/* --------------------------------
   Backfill logika
-----------------------------------*/
async function backfill(limit: number) {
  // Uzmemo najskorije artikle BEZ coverImage
  const articles = await prisma.article.findMany({
    where: { OR: [{ coverImage: null }, { coverImage: '' }] },
    orderBy: { publishedAt: 'desc' },
    take: limit,
    select: { id: true, sourceUrl: true },
  })

  let updated = 0
  let checked = 0

  const CHUNK = 5
  for (let i = 0; i < articles.length; i += CHUNK) {
    const batch = articles.slice(i, i + CHUNK)
    await Promise.allSettled(batch.map(async (a) => {
      checked++
      if (!a.sourceUrl) return

      const img = await resolveCoverFromPage(a.sourceUrl)
      if (!img) return

      // Validiraj da je realno slika (content-type ili ekstenzija)
      const ok = await looksLikeImage(img)
      if (!ok) return

      await prisma.article.update({
        where: { id: a.id },
        data: { coverImage: img },
      })
      updated++
    }))
  }

  return { checked, updated }
}

/* --------------------------------
   Handler
-----------------------------------*/
export async function GET(req: Request) {
  const authErr = requireTokenOrPass(req)
  if (authErr) return authErr

  try {
    const limit = parseLimit(req)
    const { checked, updated } = await backfill(limit)
    return NextResponse.json({ ok: true, checked, updated })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ ok: false, error: 'backfill failed' }, { status: 500 })
  }
}
