// app/vesti/k/[category]/page.tsx
import Link from 'next/link'
import { prisma } from '@/lib/db'
import ArticleCard from '@/components/ArticleCard'
import { CATS, type Cat } from '@/lib/cats' // ← jedan import je dovoljan

type Props = { params: { category: Cat } }

export function generateStaticParams() {
  return CATS
    .filter(c => c.slug !== 'nepoznato')
    .map(c => ({ category: c.slug }))
}

export async function generateMetadata({ params }: Props) {
  const cat = CATS.find(c => c.slug === params.category)
  return { title: cat ? `Vesti – ${cat.label}` : 'Vesti' }
}

export default async function CatPage({ params }: Props) {
  const cat = CATS.find(c => c.slug === params.category)
  if (!cat) {
    return (
      <main>
        <h1>Vesti</h1>
        <p>Nepoznata kategorija.</p>
        <p><Link href="/vesti">Nazad na kategorije</Link></p>
      </main>
    )
  }

  const items = await prisma.article.findMany({
    where: { country: 'rs', category: params.category },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: 60,
  })

  return (
    <main>
      <h1 style={{fontSize:'22px', margin:'0 0 12px 0'}}>Vesti – {cat.label}</h1>
      {items.length === 0 && <p>Nema još vesti u ovoj kategoriji.</p>}

      <div className="cards-grid">
        {items.map(a => (
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
