import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { classifyTitle } from '@/lib/cats'

/**
 * BEZBEDNOST:
 *  - Postavi ADMIN_TOKEN u .env (npr. random string).
 *  - UI šalje header: x-admin-token: <ADMIN_TOKEN>
 */
function authOk(req: Request) {
  const hdr = req.headers.get('x-admin-token') || ''
  const okay = process.env.ADMIN_TOKEN && hdr === process.env.ADMIN_TOKEN
  return !!okay
}

export const dynamic = 'force-dynamic' // ne keširaj
export const maxDuration = 60 // Vercel limit hint (ako deployuješ tamo)

export async function POST(req: Request) {
  if (!authOk(req)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { cursor, take = 250 } = await req.json().catch(() => ({ cursor: null, take: 250 as number }))
  const pageSize = Math.min(Math.max(Number(take) || 250, 50), 1000) // 50–1000

  // Uzmemo batch članaka (po datumu) — id koristimo kao "cursor"
  const items = await prisma.article.findMany({
    where: {},
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    take: pageSize,
    ...(cursor ? { skip: 1, cursor: { id: cursor as string } } : {}),
    select: {
      id: true,
      title: true,
      summary: true,
      content: true,
      category: true,
    },
  })

  if (items.length === 0) {
    return NextResponse.json({ ok: true, batch: 0, updated: 0, done: true })
  }

  let updated = 0
  for (const a of items) {
    const hint = a.summary || a.content || ''
    const next = classifyTitle(a.title ?? '', hint)
    if (next && next !== a.category) {
      await prisma.article.update({
        where: { id: a.id },
        data: { category: next },
      })
      updated++
    }
  }

  const nextCursor = items[items.length - 1]?.id
  const done = items.length < pageSize

  return NextResponse.json({
    ok: true,
    batch: items.length,
    updated,
    cursor: nextCursor,
    done,
  })
}
