// app/api/admin/articles/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { readSession } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAuthed() {
  const c = cookies().get('admin_session')?.value
  return !!readSession(c || '')
}

export async function GET(req: Request) {
  if (!isAuthed()) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('query') || '').trim()
  const status = (searchParams.get('status') || '').trim() // 'published' | 'draft' | ''
  const country = (searchParams.get('country') || '').trim()
  const category = (searchParams.get('category') || '').trim()
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
  const cursor = searchParams.get('cursor') || undefined

  // filteri
  const where: any = {}
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { slug: { contains: q, mode: 'insensitive' } },
    ]
  }
  if (country) where.country = country
  if (category) where.category = category

  // status deriviramo iz publishedAt (nema potrebe za migracijom)
  if (status === 'published') {
    where.publishedAt = { not: null, lte: new Date() }
  } else if (status === 'draft') {
    where.OR = [
      ...(where.OR || []),
      { publishedAt: null },
      { publishedAt: { gt: new Date() } }, // scheduled future -> draft-ish
    ]
  }

  const items = await prisma.article.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    select: {
      id: true, title: true, slug: true, summary: true, country: true, category: true,
      coverImage: true, language: true, publishedAt: true, updatedAt: true, sourceUrl: true,
    },
  })

  let nextCursor: string | null = null
  if (items.length > limit) {
    const last = items.pop()
    nextCursor = last?.id || null
  }

  const now = Date.now()
  const mapped = items.map(it => ({
    ...it,
    computedStatus: it.publishedAt && new Date(it.publishedAt).getTime() <= now ? 'published' : 'draft',
  }))

  return NextResponse.json({ ok: true, items: mapped, nextCursor })
}
