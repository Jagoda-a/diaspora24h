// app/api/translate/[id]/[lang]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { aiTranslateStructured } from '@/lib/ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: { id: string; lang: string } }
) {
  const id = params.id
  const langParam = (params.lang || '').toLowerCase()
  if (langParam !== 'en' && langParam !== 'de') {
    return NextResponse.json({ ok: false, error: 'lang_not_supported' }, { status: 400 })
  }
  const lang = langParam as 'en' | 'de'

  const a = await prisma.article.findUnique({
    where: { id },
    select: { id: true, title: true, summary: true, content: true },
  })
  if (!a) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }

  // prevodimo strukturisano (vrati title/summary/content)
  const translated = await aiTranslateStructured(
    { title: a.title || '', summary: a.summary || '', content: a.content || '' },
    lang
  )

  // Ako želiš i upis u bazu kad dodaš TEXT kolone (npr. translatedEn / translatedDe),
  // odkomentariši i prilagodi ovde:
  //
  // try {
  //   const field = lang === 'en' ? 'translatedEn' : 'translatedDe' // kolone tipa TEXT
  //   await prisma.article.update({
  //     where: { id: a.id },
  //     data: { [field]: JSON.stringify(translated) as any },
  //   })
  // } catch (e) {
  //   console.warn('Skip DB write (no column present):', e)
  // }

  return NextResponse.json({
    ok: true,
    id: a.id,
    lang,
    data: translated, // { title, summary, content }
  })
}
