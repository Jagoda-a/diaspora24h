// app/api/backfill-covers/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function absUrl(src: string, base: string) {
  try { return new URL(src, base).href } catch { return null }
}

function pickOgImage(html: string, base: string) {
  const m1 = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
  if (m1?.[1]) {
    const u = absUrl(m1[1], base); if (u) return u
  }
  const m2 = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
  if (m2?.[1]) {
    const u = absUrl(m2[1], base); if (u) return u
  }
  const m3 = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  if (m3?.[1]) {
    const u = absUrl(m3[1], base); if (u) return u
  }
  return null
}

export async function GET() {
  const toFix = await prisma.article.findMany({
    where: { coverImage: null, sourceUrl: { not: null } },
    orderBy: { publishedAt: 'desc' },
    take: 25, // batch
  })

  let updated = 0
  for (const a of toFix) {
    const url = a.sourceUrl as string
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
        cache: 'no-store',
      })
      if (!res.ok) continue
      const html = await res.text()
      const img = pickOgImage(html, url)
      if (!img) continue

      await prisma.article.update({
        where: { id: a.id },
        data: { coverImage: img },
      })
      updated++
    } catch {}
  }

  return NextResponse.json({ ok: true, updated })
}
