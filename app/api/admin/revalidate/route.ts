// app/api/admin/revalidate/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readSession } from '@/lib/auth'
import { revalidatePath, revalidateTag } from 'next/cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAuthed() {
  const c = cookies().get('admin_session')?.value
  return !!readSession(c || '')
}

type Body = {
  slug?: string
  paths?: string[]   // dodatni path-ovi za revalidate (npr. ['/vesti'])
  tags?: string[]    // npr. ['articles', `article:${slug}`]
}

export async function POST(req: Request) {
  if (!isAuthed()) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const { slug, paths = [], tags = [] } = (await req.json().catch(() => ({}))) as Body

  try {
    // Tag-based (preporuka: stranice koje čitaju listu označi sa fetch(..., { next: { tags: ['articles'] } }))
    for (const t of new Set(tags)) {
      if (t) revalidateTag(t)
    }

    // Path-based
    const basePaths = new Set<string>(['/'])
    if (slug) {
      basePaths.add(`/vesti/${slug}`)
      basePaths.add('/vesti')
    }
    for (const p of paths) basePaths.add(p)

    for (const p of basePaths) {
      revalidatePath(p, 'page')
    }

    return NextResponse.json({ ok: true, revalidated: { tags: Array.from(new Set(tags)), paths: Array.from(basePaths) } })
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'revalidate_failed' }, { status: 500 })
  }
}
