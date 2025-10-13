import { prisma } from '@/lib/db'
import { CATS, CAT_KEYS } from '@/lib/cats'
import CategoryTile from '@/components/CategoryTile'

export const dynamic = 'force-static'
export const revalidate = 300

export default async function VestiHome() {
  // Grupisani brojači po kategoriji
  const counts = await prisma.article.groupBy({
    by: ['category'],
    _count: { category: true },
  })

  const countMap = new Map<string, number>()
  for (const row of counts) {
    const key = row.category as string | null
    if (!key) continue // VAŽNO: ne mapiramo null u "drustvo" — samo preskoči
    countMap.set(key, (countMap.get(key) || 0) + row._count.category)
  }

  return (
    <main className="container" style={{ padding: '16px 0 32px' }}>
      <h1 style={{ fontSize: 22, margin: '0 0 12px' }}>Vesti po kategorijama</h1>
      <div className="cards-grid">
        {CAT_KEYS.map((slug) => {
          const label = CATS[slug]?.label ?? slug
          const count = countMap.get(slug) ?? 0
          return <CategoryTile key={slug} slug={slug} label={label} count={count} />
        })}
      </div>
    </main>
  )
}
