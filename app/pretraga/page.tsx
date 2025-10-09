// app/pretraga/page.tsx
import { prisma } from '@/lib/db'
import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import { srLatn } from 'date-fns/locale'

export const dynamic = 'force-dynamic' // da ne kešira upit

type Props = {
  searchParams?: { q?: string }
}

export default async function SearchPage({ searchParams }: Props) {
  const q = (searchParams?.q || '').trim()

  let results: {
    id: string
    slug: string
    title: string
    summary: string | null
    coverImage: string | null
    publishedAt: Date | null
  }[] = []

  if (q) {
    // jednostavna “contains” pretraga po naslovu i summary-ju
    results = await prisma.article.findMany({
        where: {
            publishedAt: { not: null },
            OR: [
            { title: { contains: q } },   // ⬅ nema mode
            { summary: { contains: q } }, // ⬅ nema mode
            ],
        },
        orderBy: { publishedAt: 'desc' },
        take: 40,
        select: { id: true, slug: true, title: true, summary: true, coverImage: true, publishedAt: true },
        })
  }

  return (
    <main className="container" style={{ paddingTop: 24, paddingBottom: 32 }}>
      <h1 style={{ marginBottom: 12 }}>Pretraga</h1>

      <form action="/pretraga" method="GET" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Ukucaj pojam…"
          style={{ flex: 1, padding: '10px 12px', border: '1px solid #ccc', borderRadius: 8 }}
        />
        <button type="submit" style={{ padding: '10px 14px', borderRadius: 8 }}>
          Traži
        </button>
      </form>

      {!q && <p>Unesite pojam za pretragu.</p>}
      {q && results.length === 0 && <p>Nema rezultata za: <strong>{q}</strong></p>}

      {results.length > 0 && (
        <ul style={{ display: 'grid', gap: 12, listStyle: 'none', padding: 0 }}>
          {results.map(r => {
            const dt = r.publishedAt ? format(r.publishedAt, 'dd.MM.yyyy HH:mm', { locale: srLatn }) : ''
            const img = r.coverImage ? `/api/img?url=${encodeURIComponent(r.coverImage)}` : null
            return (
              <li key={r.id} style={{ border: '1px solid #eee', borderRadius: 12, padding: 12, display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, alignItems: 'start' }}>
                <div style={{ width: 120, height: 80, borderRadius: 8, overflow: 'hidden', background: '#f3f3f3' }}>
                  {img ? (
                    <Image src={img} alt={r.title} width={120} height={80} style={{ objectFit: 'cover' }} />
                  ) : null}
                </div>
                <div>
                  <Link href={`/vesti/${r.slug}`} style={{ fontWeight: 600, fontSize: 18, display: 'inline-block', marginBottom: 6 }}>
                    {r.title}
                  </Link>
                  <div style={{ color: '#666', fontSize: 12, marginBottom: 6 }}>{dt}</div>
                  <p style={{ margin: 0, color: '#333' }}>
                    {(r.summary || '').slice(0, 180)}
                    {(r.summary || '').length > 180 ? '…' : ''}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
