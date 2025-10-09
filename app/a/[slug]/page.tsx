import { prisma } from '@/lib/db'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { srLatn } from 'date-fns/locale'
import AdSlot from '@/components/AdSlot'

function splitParagraphs(text: string) {
  return (text || '')
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n|\n{2,}/)
    .map(s => s.trim())
    .filter(Boolean)
}

function safeJson<T>(raw: unknown, fallback: T): T {
  try {
    if (typeof raw !== 'string' || !raw.trim()) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export const revalidate = 60

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const a = await prisma.article.findUnique({
    where: { slug: params.slug },
    select: {
      id: true, title: true, slug: true,
      summary: true, content: true,
      coverImage: true, publishedAt: true,
      sourcesJson: true, sourceUrl: true, language: true
    }
  })
  if (!a) notFound()

  const sources = safeJson<Array<{ name: string; url: string }>>(a.sourcesJson, [])
  const bodyText = (a.content && a.content.trim().length > 0) ? a.content : (a.summary ?? '')
  const paras = splitParagraphs(bodyText)

  const dt = a.publishedAt ? format(a.publishedAt, 'dd.MM.yyyy HH:mm', { locale: srLatn }) : ''
  const coverSrc = a.coverImage ? `/api/img?url=${encodeURIComponent(a.coverImage)}` : null

  return (
    <article className="card" style={{ padding: 12 }}>
      <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>{a.title}</h1>
      <div className="meta" style={{ color: '#6b7280', fontSize: 12, marginBottom: 8 }}>
        {dt}{a.language ? ` · ${String(a.language).toUpperCase()}` : ''}
      </div>

      {coverSrc && (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', margin: '12px 0' }}>
          <Image
            src={coverSrc}
            alt={a.title}
            fill
            sizes="(max-width: 768px) 100vw, 800px"
            style={{ objectFit: 'cover', borderRadius: 8 }}
            priority={false}
          />
        </div>
      )}

      {/* prvi pasusi */}
      <div>
        {paras.slice(0, 1).map((p, i) => (
          <p key={`p0-${i}`} style={{ margin: '0 0 12px 0', lineHeight: 1.6 }}>{p}</p>
        ))}
      </div>

      {/* oglas unutar teksta */}
      <div style={{ margin: '12px 0' }}>
        <AdSlot slot="IN_ARTICLE_SLOT_ID" format="fluid" />
      </div>

      {/* ostatak teksta */}
      <div>
        {paras.slice(1).map((p, i) => (
          <p key={`p1-${i}`} style={{ margin: '0 0 12px 0', lineHeight: 1.6 }}>{p}</p>
        ))}
      </div>

      {/* izvori – ako ih ima */}
      {sources.length > 0 && (
        <div style={{ marginTop: 12 }} className="source">
          <strong>Izvori:</strong>{' '}
          {sources.map((s, i) => (
            <span key={`${s.url}-${i}`}>
              <Link href={s.url} target="_blank" rel="noopener noreferrer">
                {s.name || s.url}
              </Link>
              {i < sources.length - 1 ? ', ' : ''}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}
