// app/api/admin/articles/search/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') ?? '').trim()
    const category = searchParams.get('category') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const pageSize = Math.min(100, Math.max(10, parseInt(searchParams.get('pageSize') || '24', 10) || 24))

    const where: any = {}
    if (category && category !== 'sve') where.category = category
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { summary: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ]
    }

    const [total, items] = await Promise.all([
      prisma.article.count({ where }),
      prisma.article.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        take: pageSize,
        skip: (page - 1) * pageSize,
        select: {
          id: true,
          title: true,
          slug: true,
          category: true,
          publishedAt: true,
          coverImage: true,
        },
      }),
    ])

    return NextResponse.json({ ok: true, total, page, pageSize, items })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Greška' }, { status: 500 })
  }
}
