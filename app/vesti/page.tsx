// app/vesti/page.tsx
import { prisma } from '@/lib/db'
import { CAT_KEYS, type Cat } from '@/lib/cats'
import CategoryTile from '@/components/CategoryTile'

export const dynamic = 'force-static'
export const revalidate = 300

// Prikazni nazivi kategorija (ne oslanjamo se na CATS.label)
const LABELS: Record<Cat, string> = {
  politika: 'Politika',
  hronika: 'Hronika',
  sport: 'Sport',
  ekonomija: 'Ekonomija',
  tehnologija: 'Tehnologija',
  kultura: 'Kultura',
  zdravlje: 'Zdravlje',
  lifestyle: 'Lifestyle',
  zanimljivosti: 'Zanimljivosti',
  svet: 'Svet',
  region: 'Region',
  drustvo: 'Društvo',
}

export default async function VestiHome() {
  // Grupisani brojači po kategoriji
  const counts = await prisma.article.groupBy({
    by: ['category'],
    _count: { category: true },
  })

  const countMap = new Map<string, number>()
  for (const row of counts) {
    const key = row.category as string | null
    if (!key) continue // važno: nemoj mapirati null u "drustvo"
    countMap.set(key, (countMap.get(key) || 0) + row._count.category)
  }

  return (
    <main className="container" style={{ padding: '16px 0 32px' }}>
      <h1 style={{ fontSize: 22, margin: '0 0 12px' }}>Vesti po kategorijama</h1>
      <div className="cards-grid">
        {CAT_KEYS.map((slug) => {
          const label = LABELS[slug as Cat] ?? slug
          const count = countMap.get(slug) ?? 0
          return <CategoryTile key={slug} slug={slug} label={label} count={count} />
        })}
      </div>
    </main>
  )
}
