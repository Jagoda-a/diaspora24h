// app/api/admin/backfill-categories/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { classifyTitle, isValidCat, CAT_KEYS, CATS, type Cat } from '@/lib/cats'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/* ---------- Auth ---------- */
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
    (/^Bearer\s+(.+)$/i.test(hdrBearer) &&
      hdrBearer.replace(/^Bearer\s+/i, '').trim() === required)

  if (ok) return null
  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
}

function parseLimit(req: Request) {
  const url = new URL(req.url)
  const n = parseInt(url.searchParams.get('limit') || '200', 10)
  return Math.max(1, Math.min(Number.isFinite(n) ? n : 200, 500))
}

/* ---------- Backfill ---------- */
async function backfill(limit: number) {
  // Uzimamo praznu/“nepoznato”/nevalidnu kategoriju.
  // KNOWN mora biti niz stringova — uzmi CAT_KEYS (npr. ['politika','hronika',...]).
  const KNOWN: string[] = CAT_KEYS ? [...CAT_KEYS] : (Object.keys(CATS) as string[])

  const items = await prisma.article.findMany({
    where: {
      OR: [
        { category: { equals: '' } },
        { category: { equals: 'nepoznato' } },
        { NOT: { category: { in: KNOWN } } },
      ],
    },
    orderBy: { publishedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      sourceUrl: true,
      category: true, // string (nenullable u šemi)
    },
  })

  let checked = 0
  let updated = 0

  for (const a of items) {
    checked++

    const current: Cat | null = isValidCat(a.category) ? (a.category as Cat) : null
    const next: Cat = classifyTitle(a.title ?? '', a.sourceUrl ?? undefined)

    if (current !== next) {
      await prisma.article.update({
        where: { id: a.id },
        data: { category: next },
      })
      updated++
    }
  }

  return { checked, updated }
}

/* ---------- Handler ---------- */
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
