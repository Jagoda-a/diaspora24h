// app/api/reclassify/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { classifyTitle } from '@/lib/cats'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const limit = Number(url.searchParams.get('take') || 200) // batch size
  const onlySportToKultura = url.searchParams.get('pinkfix') === '1' // samo specifičan “Pink/Grand” fix

  // Uzmi najskorije, pa ispravljaj
  const items = await prisma.article.findMany({
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: limit,
    select: { id: true, title: true, sourceUrl: true, category: true },
  })

  let updated = 0
  for (const a of items) {
    const nextCat = classifyTitle(a.title, a.sourceUrl || undefined)

    if (onlySportToKultura) {
      // Popravi samo slučajeve kad je ostao u sportu, a nova heuristika kaže kultura
      if (a.category === 'sport' && nextCat === 'kultura') {
        await prisma.article.update({ where: { id: a.id }, data: { category: nextCat } })
        updated++
      }
      continue
    }

    // Full reclass: upiši novu kategoriju ako se razlikuje
    if (nextCat && nextCat !== a.category) {
      await prisma.article.update({ where: { id: a.id }, data: { category: nextCat } })
      updated++
    }
  }

  return NextResponse.json({ ok: true, scanned: items.length, updated })
}
