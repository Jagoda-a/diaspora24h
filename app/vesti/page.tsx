// app/vesti/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { CATS, CAT_KEYS, type Cat, getCatImage } from '@/lib/cats'

export const dynamic = 'force-dynamic'
export const revalidate = 60

export const metadata: Metadata = {
  title: 'Vesti po kategorijama',
  description: 'Pregled svih kategorija vesti na Diaspora24h.',
}

export default async function VestiIndex() {
  // Napravi mapu brojeva po kategoriji (skipujemo 'nepoznato')
  const keys = CAT_KEYS.filter((k) => k !== ('nepoznato' as any))

  // Jednostavno: po jedan count upit po kategoriji (OK za male sajtove)
  const countsEntries = await Promise.all(
    keys.map(async (k) => {
      const n = await prisma.article.count({ where: { category: k } })
      return [k, n] as const
    })
  )
  const counts: Record<Cat, number> = Object.fromEntries(countsEntries) as any

  return (
    <main className="container" style={{ padding: '16px 0 32px' }}>
      <h1 style={{ fontSize: '22px', margin: '0 0 12px 0' }}>Vesti po kategorijama</h1>

      <div className="cards-grid">
        {keys.map((slug) => {
          const def = CATS[slug]
          const img = getCatImage(slug)
          const count = counts[slug as Cat] ?? 0

          return (
            <Link
              key={slug}
              href={`/vesti/k/${slug}`}
              className="card"
              style={{ textDecoration: 'none' }}
            >
              <div className="card-cover">
                <img src={img} alt={def.label} />
              </div>
              <div className="card-body">
                <div className="card-meta">
                  {count > 0 ? <span>{count} vesti</span> : <span>—</span>}
                </div>
                <h3 className="card-title" style={{ margin: 0 }}>{def.label}</h3>
                <p className="card-summary" style={{ marginTop: 6 }}>
                  {`Najnovije vesti iz kategorije ${def.label.toLowerCase()}.`}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </main>
  )
}
