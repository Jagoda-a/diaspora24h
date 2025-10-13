// app/vesti/page.tsx
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { CAT_KEYS, type Cat } from '@/lib/cats'

// statički render + revalidate
export const dynamic = 'force-static'
export const revalidate = 300

// lepo ime kategorije za naslov na kartici
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

export default async function VestiIndexPage() {
  // 1) prikupi brojke po kategoriji jednim upitom
  const grouped = await prisma.article.groupBy({
    by: ['category'],
    where: {
      // ako želiš brojati samo objavljene, zadrži ovaj filter:
      // publishedAt: { not: null },
      // ako želiš brojati sve (draft + objavljene), ukloni ga
    },
    _count: { _all: true },
  })

  // 2) mapiraj u { [cat]: count }
  const counts = Object.fromEntries(
    grouped
      .filter(g => typeof g.category === 'string' && g.category) // odbaci null
      .map(g => [g.category as Cat, g._count._all] as const)
  ) as Partial<Record<Cat, number>>

  return (
    <main className="container" style={{ padding: '16px 0 32px' }}>
      <h1 style={{ margin: '0 0 12px 0' }}>Vesti po kategorijama</h1>
      <p className="text-sm text-neutral-600" style={{ marginBottom: 16 }}>
        Izaberi kategoriju i pregledaj najnovije članke.
      </p>

      <div
        className="cards-grid"
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        }}
      >
        {CAT_KEYS.map((cat) => {
          const label = LABELS[cat]
          const count = counts[cat] ?? 0
          const href = `/vesti/k/${cat}`
          const cover = `/cats/${cat}.webp` // fallback slika u /public/cats

          return (
            <Link
              key={cat}
              href={href}
              className="cat-card"
              prefetch
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                overflow: 'hidden',
                display: 'grid',
                gridTemplateRows: '140px auto',
                textDecoration: 'none',
                background: '#fff'
              }}
            >
              <div style={{ position: 'relative', width: '100%', height: 140, overflow: 'hidden' }}>
                <img
                  src={cover}
                  alt={label}
                  loading="lazy"
                  decoding="async"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.4' }}
                />
              </div>
              <div style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ color: '#111827' }}>{label}</strong>
                <span
                  style={{
                    fontSize: 12,
                    padding: '2px 8px',
                    borderRadius: 999,
                    border: '1px solid #e5e7eb',
                    color: '#374151',
                    background: '#f9fafb',
                  }}
                >
                  {count} {count === 1 ? 'vest' : 'vesti'}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </main>
  )
}
