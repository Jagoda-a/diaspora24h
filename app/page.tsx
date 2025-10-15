// app/page.tsx
import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import ArticleCard from '@/components/ArticleCard'

export const dynamic = 'force-static'
export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Diaspora 24h — najvažnije vesti za naše ljude',
    description: 'Diaspora 24h — najvažnije vesti za naše ljude',
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      url: '/',
      siteName: 'Diaspora 24h',
      title: 'Diaspora 24h — najvažnije vesti za naše ljude',
      description: 'Diaspora 24h — najvažnije vesti za naše ljude',
      images: [{ url: '/og-home.jpg', width: 1200, height: 630, alt: 'Diaspora 24h' }],
      locale: 'sr_RS',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Diaspora 24h — najvažnije vesti za naše ljude',
      description: 'Diaspora 24h — najvažnije vesti za naše ljude',
      images: ['/og-home.jpg'],
    },
  }
}

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
      {/* .articles-grid kao i do sada */}
      <div className="articles-grid">
        {items.map((a) => (
          <ArticleCard key={a.id} article={a as any} />
        ))}
      </div>
    </div>
  )
}
