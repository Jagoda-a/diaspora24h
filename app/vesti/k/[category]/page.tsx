// app/vesti/k/[category]/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import ArticleCard from '@/components/ArticleCard'
import { CATS, CAT_KEYS, type Cat } from '@/lib/cats'

type Props = { params: { category: Cat } }

export const dynamic = 'force-dynamic'
export const revalidate = 60

export function generateStaticParams() {
  return CAT_KEYS
    .filter((k) => k !== ('nepoznato' as any))
    .map((category) => ({ category }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const catKey = CAT_KEYS.includes(params.category) ? params.category : 'drustvo'
  const label = CATS[catKey]?.label ?? 'Vesti'
  return {
    title: `Vesti – ${label}`,
    description: `Najnovije vesti iz kategorije: ${label}.`,
  }
}

export default async function CatPage({ params }: Props) {
  const catKey: Cat = CAT_KEYS.includes(params.category) ? params.category : 'drustvo'
  const catDef = CATS[catKey]

  if (!catDef) {
    return (
      <main className="container" style={{ padding: '16px 0 32px' }}>
        <h1>Vesti</h1>
        <p>Nepoznata kategorija.</p>
        <p><Link href="/vesti">Nazad na kategorije</Link></p>
      </main>
    )
  }

  const items = await prisma.article.findMany({
    where: { category: catKey },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: 60,
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

  return (
    <main className="container" style={{ padding: '16px 0 32px' }}>
      <h1 style={{ fontSize: '22px', margin: '0 0 12px 0' }}>Vesti – {catDef.label}</h1>

      {items.length === 0 && <p>Nema još vesti u ovoj kategoriji.</p>}

      <div className="cards-grid">
        {items.map((a) => (
          <ArticleCard
            key={a.id}
            article={{
              id: a.id,
              slug: a.slug,
              title: a.title,
              summary: a.summary,
              coverImage: a.coverImage,
              country: a.country,
              publishedAt: a.publishedAt,
              category: (a as any).category ?? null,
            }}
          />
        ))}
      </div>
    </main>
  )
}
