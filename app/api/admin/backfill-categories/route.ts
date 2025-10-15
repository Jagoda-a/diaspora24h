// app/api/admin/backfill-categories/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { classifyTitle } from '@/lib/cats'
import { readSession } from '@/lib/auth'
import { revalidatePath, revalidateTag } from 'next/cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** AUTH: dozvoli ili preko admin_session kolačića ili preko BACKFILL_TOKEN query/env */
function isAuthed(req: Request) {
  const c = cookies().get('admin_session')?.value
  if (c && readSession(c || '')) return true
  const url = new URL(req.url)
  const t = url.searchParams.get('token') || ''
  const envT = process.env.BACKFILL_TOKEN || ''
  return !!envT && t === envT
}

/**
 * GET /api/admin/backfill-categories?limit=200&cursor=<id>&force=1&dryRun=1
 * - limit: koliko komada da obradi (default 200)
 * - cursor: nastavi posle ovog ID (cursor-based paging po createdAt,id)
 * - force=1: ignorisi postojecu kategoriju i re-upisi novu ako je drugacija od izračunate
 * - dryRun=1: ne upisuj, samo simuliraj
 */
export async function GET(req: Request) {
  if (!isAuthed(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '200', 10) || 200, 1), 1000)
  const cursorId = url.searchParams.get('cursor') || undefined
  const force = url.searchParams.get('force') === '1'
  const dryRun = url.searchParams.get('dryRun') === '1'

  // Uzimamo batch deterministično: po publishedAt desc, pa createdAt desc, pa id desc.
  // Ako prosleđuješ cursor, nastavi odatle.
  // Cursor ćemo bazirati samo na `id` (pošto je CUID), uz ordering po createdAt desc kao sekundarni.
  // Jednostavnije: koristimo "id" kao cursor i ordering po "id desc".
  const where: any = {} // NEMOJ ograničavati na 'nepoznato': force mod rešava selekciju

  const items = await prisma.article.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit,
    ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
    select: {
      id: true,
      title: true,
      summary: true,
      category: true,
      slug: true,
      publishedAt: true,
      createdAt: true,
    },
  })

  let updated = 0
  let checked = 0

  for (const a of items) {
    checked++
    const newCat = classifyTitle(a.title || '', a.summary || '')
    const shouldUpdate = force ? (newCat !== a.category) : (!a.category || a.category === 'nepoznato' || newCat !== a.category)

    if (!shouldUpdate) continue
    if (dryRun) { updated++; continue }

    await prisma.article.update({
      where: { id: a.id },
      data: { category: newCat },
    })
    updated++
  }

  // Revalidate (list page, home, i tagovi)
  try {
    // Tag-based (ako u listama koristiš fetch(..., { next: { tags: ['articles'] } }))
    revalidateTag('articles')
    // Putanje – home, archive
    revalidatePath('/', 'page')
    revalidatePath('/vesti', 'page')

    // Ako si upravo re-kategorizovao, osveži i aktivne kategorije (pokrivamo sve)
    const catPaths = [
      '/vesti/k/politika','/vesti/k/hronika','/vesti/k/sport','/vesti/k/ekonomija','/vesti/k/tehnologija',
      '/vesti/k/kultura','/vesti/k/zdravlje','/vesti/k/lifestyle','/vesti/k/zanimljivosti','/vesti/k/svet',
      '/vesti/k/region','/vesti/k/drustvo',
    ]
    for (const p of catPaths) revalidatePath(p, 'page')
  } catch {
    // ignoriši u batch endpointu; nije fatalno
  }

  const nextCursor = items.length === limit ? items[items.length - 1].id : null

  return NextResponse.json({
    ok: true,
    checked,
    updated,
    cursor: nextCursor,
    done: !nextCursor,
    force,
    dryRun,
    limit,
  })
}

/** POST istog oblika za klijenta koji šalje body (nije obavezno, ali zgodno) */
export async function POST(req: Request) {
  // preusmeri na GET logiku radi jednostavnosti: iz body-ja formiraj URLSearchParams
  if (!isAuthed(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  const body = await req.json().catch(() => ({} as any))
  const p = new URLSearchParams()
  if (body.limit) p.set('limit', String(body.limit))
  if (body.cursor) p.set('cursor', String(body.cursor))
  if (body.force) p.set('force', body.force ? '1' : '0')
  if (body.dryRun) p.set('dryRun', body.dryRun ? '1' : '0')
  if (body.token) p.set('token', String(body.token))
  const u = new URL(req.url)
  const url = `${u.origin}${u.pathname}?${p.toString()}`
  return GET(new Request(url, { headers: req.headers }))
}
