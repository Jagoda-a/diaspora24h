// app/api/admin/bulk-category/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CAT_KEYS, type Cat } from '@/lib/cats'

export const dynamic = 'force-dynamic'

// Type guard: string -> Cat
function isCat(x: unknown): x is Cat {
  return typeof x === 'string' && (CAT_KEYS as readonly string[]).includes(x)
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as { ids?: unknown; category?: unknown }

    // ids validacija
    if (!Array.isArray(body.ids) || body.ids.length === 0 || body.ids.some(id => typeof id !== 'string')) {
      return NextResponse.json({ ok: false, error: 'Prazna ili nevažeća lista ID-jeva' }, { status: 400 })
    }

    // category validacija + narrowing na Cat
    if (!isCat(body.category)) {
      return NextResponse.json({ ok: false, error: 'Nepoznata kategorija' }, { status: 400 })
    }
    const cat: Cat = body.category

    const res = await prisma.article.updateMany({
      where: { id: { in: body.ids as string[] } },
      data: { category: cat },
    })

    return NextResponse.json({ ok: true, count: res.count })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Greška' }, { status: 500 })
  }
}
