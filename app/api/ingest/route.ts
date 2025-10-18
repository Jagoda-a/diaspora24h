// app/api/ingest/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { slugify } from '@/lib/slug'
import { fetchFeeds, RS_SOURCES_RS, resolveBestCover, isSafeImageHost } from '@/lib/rss'
import { aiRewrite, isLongEnough, makeTopicKey } from '@/lib/ai'
import { classifyTitle } from '@/lib/cats'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/* -------------------------
   Tipovi
------------------------- */

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

// ✅ FIX: izbacio sam parametar `country`, jer ga aiRewrite ne prima
async function summarizeFromItem(item: FlatItem) {
  const plainText = pickFirst([stripHtml(item.contentHtml) || item.contentSnippet || ''], 6000)
  const ai = await aiRewrite({
    sourceTitle: item.title || 'Vest',
    plainText,
    language: 'sr',
    sourceName: item.sourceName || 'izvor',
  })
  return ai
}

// Fisher–Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Quiet hours 01–05 Europe/Belgrade
function isQuietHoursBelgrade(): boolean {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Belgrade',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const hourStr = parts.find(p => p.type === 'hour')?.value || '00'
  const hour = Number(hourStr)
  return hour >= 1 && hour < 5
}

/* -------------------------
   SEO helpers
------------------------- */

function trimTo(s: string, n: number) {
  const x = s.trim().replace(/\s+/g, ' ')
  return x.length <= n ? x : x.slice(0, n - 1).trimEnd() + '…'
}

function siteOrigin() {
  // PUBLIC_SITE_ORIGIN npr. https://diaspora24h.com
  return (process.env.PUBLIC_SITE_ORIGIN || 'https://diaspora24h.vercel.app').replace(/\/$/, '')
}

function buildSeoTitle(title: string, siteName = 'Diaspora24h') {
  // primer: "Naslov vesti — Diaspora24h"
  const base = title?.trim() || 'Vest'
  return trimTo(`${base} — ${siteName}`, 60)
}

function buildSeoDescription(summary?: string, fallbackFromContent?: string) {
  const txt = (summary || fallbackFromContent || '').trim()
  return trimTo(txt, 160) // ~160 znakova
}

function buildCanonical(slug: string) {
  return `${siteOrigin()}/vesti/${slug}`
}

function pickOgImage(coverImage?: string | null, contentImage?: string | null) {
  return coverImage || contentImage || null
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
  // default 12 (svakih 12 min), cap 25
  const limit = Math.max(1, Math.min(+(url.searchParams.get('limit') ?? 12), 25))
  const dryRun = url.searchParams.get('dryRun') === '1'
  return { limit, dryRun }
}

/* -------------------------
   Ingest
------------------------- */

// Randomizovan izbor: max 2 po izvoru, ukupno do `limit`.
// Grupisanje po canonical linku (ili čistom linku) da spojimo duplikate.
async function gatherItems(limit: number): Promise<FlatItem[][]> {
  const feeds = await fetchFeeds(RS_SOURCES_RS)
  shuffle(feeds)

  const PER_SOURCE_MAX = 2
  const perSourceCount = new Map<string, number>()
  const selected: FlatItem[] = []
  let picked = 0

  // prvi prolaz — do 2 po izvoru (nasumičan redosled izvora i stavki)
  for (const f of feeds) {
    if (picked >= limit) break
    const fallbackHost = (() => { try { return new URL(f.url).host } catch { return 'unknown' } })()
    const items = Array.isArray(f.items) ? [...(f.items as any[])] : []
    shuffle(items)

    for (const it of items) {
      if (picked >= limit) break
      const host = (() => {
        try { return new URL(it.link).hostname } catch { return fallbackHost }
      })()

      const used = perSourceCount.get(host) || 0
      if (used >= PER_SOURCE_MAX) continue

      const contentHtml: string | undefined =
        it['content:encoded'] || it.contentHtml || it.content || undefined

      let fromEnclosure: string | null = null
      if (it.enclosure?.url) {
        const type = String(it.enclosure.type || '').toLowerCase()
        const url = sanitizeAbsoluteUrl(it.enclosure.url, it.link)
        if (url && (type.startsWith('image/') || isImagePathLike(url))) {
          fromEnclosure = url
        }
      }
      const fromHtml = extractImageUrl(contentHtml || it.contentSnippet, it.link)

      const linkCanon = canonicalizeLink(it.link)

      selected.push({
        sourceName: host || fallbackHost,
        title: String(it.title || 'Vest').trim(),
        link: it.link,
        linkCanon,
        contentSnippet: it.contentSnippet,
        contentHtml,
        isoDate: it.isoDate,
        pubDate: it.pubDate,
        enclosureUrl: fromEnclosure,
        coverUrl: firstValidCover([fromHtml, fromEnclosure]),
      })
      perSourceCount.set(host, used + 1)
      picked++
    }
  }

  // drugi prolaz (round-robin) – ako ima slobodnog prostora do limita
  if (picked < limit) {
    const pools = feeds.map(f => {
      const host = (() => { try { return new URL(f.url).host } catch { return 'unknown' } })()
      const items = Array.isArray(f.items) ? [...(f.items as any[])] : []
      shuffle(items)
      return { host, items }
    })

    let changed = true
    while (picked < limit && changed) {
      changed = false
      for (const p of pools) {
        if (picked >= limit) break
        while (p.items.length && picked < limit) {
          const it = p.items.shift()
          const title = String(it?.title || '').trim()
          if (!title) continue

          const contentHtml: string | undefined =
            it['content:encoded'] || it.contentHtml || it.content || undefined

          let fromEnclosure: string | null = null
          if (it.enclosure?.url) {
            const type = String(it.enclosure.type || '').toLowerCase()
            const url = sanitizeAbsoluteUrl(it.enclosure.url, it.link)
            if (url && (type.startsWith('image/') || isImagePathLike(url))) {
              fromEnclosure = url
            }
          }
          const fromHtml = extractImageUrl(contentHtml || it.contentSnippet, it.link)

          selected.push({
            sourceName: p.host,
            title,
            link: it.link,
            linkCanon: canonicalizeLink(it.link),
            contentSnippet: it.contentSnippet,
            contentHtml,
            isoDate: it.isoDate,
            pubDate: it.pubDate,
            enclosureUrl: fromEnclosure,
            coverUrl: firstValidCover([fromHtml, fromEnclosure]),
          })
          picked++
          changed = true
          break
        }
      }
    }
  }

  // grupisanje po canonical linku (ili čistom linku)
  const byKey = new Map<string, FlatItem[]>()
  for (const it of selected.slice(0, limit)) {
    const key = it.linkCanon || canonicalizeLink(it.link) || it.link
    const arr = byKey.get(key) || []
    arr.push(it)
    byKey.set(key, arr)
  }

  const groups = Array.from(byKey.values())
  return groups
}

async function resolveCoverHard(first: FlatItem, group: FlatItem[]): Promise<string | null> {
  // 1) pokušaj iz feed-a
  let cover = firstValidCover(group.map(i => i.coverUrl))
  if (cover && isSafeImageHost(cover)) return cover

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
    if (cover && isImagePathLike(cover) && isSafeImageHost(cover)) return cover
  } catch {}
  return null
}

/** meka deduplikacija po naslovu (poslednja 3 dana) — koristi se za izvorni i AI naslov */
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

      // 0) meka deduplikacija po izvornom naslovu (ako već postoji skoro identično)
      const recentDupe = await looksLikeRecentDuplicateByTitle(first.title || '')
      if (recentDupe) {
        const updates: Record<string, any> = {}
        if (!recentDupe.coverImage) {
          let coverImageResolved = await resolveCoverHard(first, group)
          const catForFallback = recentDupe.category || 'drustvo'
          const coverImage = coverImageResolved || `/cats/${catForFallback}.webp`
          if (coverImage) updates.coverImage = coverImage
        }
        if ((!recentDupe.summary || !recentDupe.content)) {
          const ai = await summarizeFromItem(first)
          if (!recentDupe.summary && ai.summary) updates.summary = ai.summary
          if (!recentDupe.content && isLongEnough(ai.content)) updates.content = ai.content
          // dopuni SEO ako fali
          if (!recentDupe.seoTitle && ai.title) updates.seoTitle = buildSeoTitle(ai.title)
          if (!recentDupe.seoDescription) updates.seoDescription = buildSeoDescription(ai.summary, ai.content)
          if (!recentDupe.ogImage) updates.ogImage = pickOgImage(updates.coverImage || recentDupe.coverImage, null)
          if (!recentDupe.canonicalUrl) updates.canonicalUrl = buildCanonical(recentDupe.slug)
          if (typeof recentDupe.noindex !== 'boolean') updates.noindex = false
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
          let coverImageResolved = await resolveCoverHard(first, group)
          const catForFallback = byLink.category || 'drustvo'
          const coverImage = coverImageResolved || `/cats/${catForFallback}.webp`
          if (coverImage) updates.coverImage = coverImage
        }
        if (!byLink.summary || !byLink.content) {
          const ai = await summarizeFromItem(first)
          if (!byLink.summary && ai.summary) updates.summary = ai.summary
          if (!byLink.content && isLongEnough(ai.content)) updates.content = ai.content
          // dopuni SEO ako fali
          if (!byLink.seoTitle && ai.title) updates.seoTitle = buildSeoTitle(ai.title)
          if (!byLink.seoDescription) updates.seoDescription = buildSeoDescription(ai.summary, ai.content)
          if (!byLink.ogImage) updates.ogImage = pickOgImage(updates.coverImage || byLink.coverImage, null)
          if (!byLink.canonicalUrl) updates.canonicalUrl = buildCanonical(byLink.slug)
          if (typeof byLink.noindex !== 'boolean') updates.noindex = false
        }
        if (Object.keys(updates).length > 0) {
          await prisma.article.update({ where: { id: byLink.id }, data: updates })
          updated++
        }
        return
      }

      // 2) Priprema novog članka preko AI
      const ai = await summarizeFromItem(first)

      // 2a) preskoči ako je sadržaj prekratak (< 500 karaktera)
      if (!isLongEnough(ai.content)) return

      // 2b) meka deduplikacija po AI naslovu (isti raspon od 3 dana)
      const aiRecentDupe = await looksLikeRecentDuplicateByTitle(ai.title)
      if (aiRecentDupe) {
        const updates: Record<string, any> = {}
        if (!aiRecentDupe.coverImage) {
          let coverImageResolved = await resolveCoverHard(first, group)
          const catForFallback = aiRecentDupe.category || 'drustvo'
          const coverImage = coverImageResolved || `/cats/${catForFallback}.webp`
          if (coverImage) updates.coverImage = coverImage
        }
        if (!aiRecentDupe.summary && ai.summary) updates.summary = ai.summary
        if (!aiRecentDupe.content && isLongEnough(ai.content)) updates.content = ai.content
        // dopuni SEO ako fali
        if (!aiRecentDupe.seoTitle && ai.title) updates.seoTitle = buildSeoTitle(ai.title)
        if (!aiRecentDupe.seoDescription) updates.seoDescription = buildSeoDescription(ai.summary, ai.content)
        if (!aiRecentDupe.ogImage) updates.ogImage = pickOgImage(updates.coverImage || aiRecentDupe.coverImage, null)
        if (!aiRecentDupe.canonicalUrl) updates.canonicalUrl = buildCanonical(aiRecentDupe.slug)
        if (typeof aiRecentDupe.noindex !== 'boolean') updates.noindex = false

        if (Object.keys(updates).length > 0) {
          await prisma.article.update({ where: { id: aiRecentDupe.id }, data: updates })
          updated++
        }
        return
      }

      // 2c) topicKey (informativno)
      const topicKey = makeTopicKey(ai.title, ai.content)

      // 3) Novi članak
      const category = classifyTitle(ai.title, ai.summary || ai.content)

      // Pokušaj da nađeš cover; ako nema – kategorijski fallback
      let coverImageResolved = await resolveCoverHard(first, group)
      const coverImage = coverImageResolved || `/cats/${category}.webp`

      const publishedAt =
        (first.isoDate ? new Date(first.isoDate) :
         first.pubDate ? new Date(first.pubDate) : new Date())

      const uniqueSlug = await findUniqueSlug(ai.title)

      // SEO vrednosti prilikom kreiranja
      const seoTitle = buildSeoTitle(ai.title)
      const seoDescription = buildSeoDescription(ai.summary, ai.content)
      const ogImage = pickOgImage(coverImage, null)
      const canonicalUrl = buildCanonical(uniqueSlug)

      await prisma.article.create({
        data: {
          country: 'rs',
          title: ai.title,
          slug: uniqueSlug,
          summary: ai.summary,
          content: ai.content,
          coverImage,
          sourceUrl: linkCanon, // čuvamo kanonski link
          sourcesJson: JSON.stringify({
            items: group.map(g => ({ source: g.sourceName, link: g.link })),
            topicKey,
          }),
          topicKey,
          language: 'sr',
          publishedAt,
          category,

          // SEO polja
          seoTitle,
          seoDescription,
          ogImage,
          canonicalUrl,
          noindex: false,
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

  // pauza 01–05 Europe/Belgrade
  if (isQuietHoursBelgrade()) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'quiet-hours' })
  }

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

  // pauza 01–05 Europe/Belgrade
  if (isQuietHoursBelgrade()) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'quiet-hours' })
  }

  const { limit } = parseQuery(req)
  try {
    const { created, updated } = await runIngest(limit)
    return NextResponse.json({ ok: true, created, updated })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ ok: false, error: 'Ingest failed' }, { status: 500 })
  }
}
