// app/api/admin/article/manual/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { readSession } from '@/lib/auth'
import { slugify } from '@/lib/slug'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAuthed() {
  const c = cookies().get('admin_session')?.value
  return !!readSession(c || '')
}

export async function POST(req: Request) {
  if (!isAuthed()) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({} as any))

  const title = String(body.title || '').trim()
  if (!title) {
    return NextResponse.json({ ok: false, error: 'title_required' }, { status: 400 })
  }

  // Polja iz forme (dozvoli prazno: fallback na prazan string)
  const summary: string = (body.summary ?? '').toString()
  const content: string = (body.content ?? '').toString()

  // Ova polja mogu biti prazna; ako su prazna šalji undefined (Prisma: opcionalna/nullable polja)
  const coverImage: string | undefined =
    body.coverImage && String(body.coverImage).trim() ? String(body.coverImage).trim() : undefined

  const category: string = (body.category ?? 'nepoznato').toString()
  const language: string = (body.language ?? 'sr').toString()
  const country: string = (body.country ?? 'rs').toString().toUpperCase()

  const publishedAt: Date | undefined =
    body.publishedAt ? new Date(String(body.publishedAt)) : undefined

  // Jedinstven slug
  const baseSlug = slugify(title) || 'vest'
  let slug = baseSlug
  for (let n = 2; await prisma.article.findUnique({ where: { slug } }); n++) {
    slug = `${baseSlug}-${n}`
  }

  const created = await prisma.article.create({
    data: {
      title,
      slug,
      summary,                 // ⟵ uvek string (nema više string|null)
      content,                 // ⟵ uvek string (nema više string|null)
      coverImage,              // ⟵ undefined ako nije dato (umesto null)
      category,                // ⟵ obavezno string
      language,
      country,
      publishedAt,             // ⟵ undefined = pusti default/null u bazi
      sourceUrl: undefined,    // ⟵ nema izvornog linka za ručno dodate
      sourcesJson: undefined,  // ⟵ opciono
    },
    select: { id: true, slug: true, title: true },
  })

  return NextResponse.json({ ok: true, created })
}
