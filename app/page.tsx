// app/page.tsx
import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import ArticleCard from '@/components/ArticleCard'
import AdSlot from '@/components/AdSlot'
import { Fragment } from 'react'

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

  const topSlot = process.env.NEXT_PUBLIC_ADS_TOP_SLOT || ''
  const layoutKey = process.env.NEXT_PUBLIC_ADS_TOP_LAYOUT_KEY

  return (
    <div className="container" style={{ padding: 16 }}>
      <h1 className="sr-only">Najnovije vesti</h1>

      {/* grid kartica (vesti + ad kartice) */}
      <div className="articles-grid">
        {items.map((a, i) => (
          <Fragment key={a.id}>
            <ArticleCard article={a as any} />

            {/* ubaci oglas posle 4. kartice i zatim na svakih 10 kartica */}
            {(i === 3 || (i > 3 && (i - 3) % 10 === 0)) && topSlot && (
              <div
                key={`ad-${i}`}
                className="ad-card"
                style={{
                  borderRadius: 16,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  overflow: 'hidden',
                  background: 'var(--card-bg, #fff)',
                  padding: 12,
                }}
              >
                {/* format=fluid + layoutKey ako ga koristiš za ovaj slot */}
                <AdSlot
                  slot={topSlot}
                  format="fluid"
                  layoutKey={layoutKey}
                  style={{ display: 'block', width: '100%', minHeight: 120 }}
                />
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  )
}
