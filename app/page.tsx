// app/page.tsx
import { prisma } from '@/lib/db'
import ArticleCard from '@/components/ArticleCard'

export const dynamic = 'force-static'
export const revalidate = 60

export default async function Home() {
  const items = await prisma.article.findMany({
    where: { country: 'rs' },
    orderBy: { publishedAt: 'desc' },
    take: 36,
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      coverImage: true,
      country: true,
      publishedAt: true,
      category: true,
    },
  })

  if (items.length === 0) {
    return (
      <div className="container" style={{ padding: 16 }}>
        <h1 className="sr-only">Najnovije vesti</h1>
        <p>Još nema članaka. Pokreni ingest: <code>/api/ingest</code></p>
      </div>
    )
  }

  return (
    <div className="container" style={{ padding: 16 }}>
      <h1 className="sr-only">Najnovije vesti</h1>
      {/* ključna promena: .articles-grid umesto .cards-grid */}
      <div className="articles-grid">
        {items.map((a) => (
          <ArticleCard key={a.id} article={a as any} />
        ))}
      </div>
    </div>
  )
}
