// app/api/search/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()

  if (!q || q.length < 2) {
    return NextResponse.json({ ok: true, items: [] })
  }

  try {
    const items = await prisma.article.findMany({
      where: {
        publishedAt: { not: null },
        OR: [
          { title: { contains: q } },
          { summary: { contains: q } },
        ],
      },
      orderBy: { publishedAt: 'desc' },
      take: 8,
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        coverImage: true,
        publishedAt: true,
      },
    })

    return NextResponse.json({ ok: true, items })
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'search_failed' }, { status: 500 })
  }
}
