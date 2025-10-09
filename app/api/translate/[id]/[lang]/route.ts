// app/api/translate/[id]/[lang]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { aiRewrite } from '@/lib/ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: { id: string; lang: string } }
) {
  const id = params.id
  const langParam = (params.lang || '').toLowerCase()

  // Dozvoljeni jezici
  if (!['en', 'de'].includes(langParam)) {
    return NextResponse.json({ ok: false, error: 'lang_not_supported' }, { status: 400 })
  }
  const lang = langParam as 'en' | 'de'

  // Učitaj članak
  const a = await prisma.article.findUnique({
    where: { id },
    select: { id: true, title: true, summary: true, content: true, country: true, language: true },
  })
  if (!a) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }

  // Pozovi aiRewrite sa strukturisanim objektom
  const translated = await aiRewrite({
    sourceTitle: a.title || '',
    plainText: `
${a.summary || ''}

${a.content || ''}
`,
    language: lang,
    country: a.country || undefined,
    sourceName: 'Diaspora24h',
  })

  return NextResponse.json({
    ok: true,
    id: a.id,
    lang,
    data: translated, // { title, summary, content }
  })
}
