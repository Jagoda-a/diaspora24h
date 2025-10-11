// app/vesti/k/[category]/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import ArticleCard from '@/components/ArticleCard'
import { CATS, CAT_KEYS, type Cat } from '@/lib/cats'

type Props = {
  params: { category: Cat }
  searchParams?: { page?: string }
}

// ISR + statički render (mnogo brže od force-dynamic)
export const dynamic = 'force-static'
export const revalidate = 300

// Koliko kartica po strani
const PAGE_SIZE = 24

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

export default async function CatPage({ params, searchParams }: Props) {
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

  const page = Math.max(1, parseInt(String(searchParams?.page ?? '1'), 10) || 1)
  const [total, items] = await Promise.all([
    prisma.article.count({ where: { category: catKey } }),
    prisma.article.findMany({
      where: { category: catKey },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
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
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const catCover = `/cats/${catKey}.webp` // fallback slika iz public/cats

  return (
    <main className="container" style={{ padding: '16px 0 32px' }}>
      <div className="flex items-center justify-between gap-4 mb-3">
        <h1 style={{ fontSize: '22px', margin: 0 }}>Vesti – {catDef.label}</h1>
        <span className="text-sm text-neutral-500">{total} {total === 1 ? 'vest' : 'vesti'}</span>
      </div>

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
              // Fallback na kategorijsku sliku ako vest nema cover
              coverImage: a.coverImage ?? catCover,
              country: a.country,
              publishedAt: a.publishedAt,
              category: (a as any).category ?? null,
            }}
          />
        ))}
      </div>

      {/* Paginacija */}
      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2 mt-6">
          <PageLink category={catKey} page={page - 1} disabled={page <= 1}>
            ← Prethodna
          </PageLink>
          <span className="text-sm text-neutral-600">
            Strana {page} / {totalPages}
          </span>
          <PageLink category={catKey} page={page + 1} disabled={page >= totalPages}>
            Sledeća →
          </PageLink>
        </nav>
      )}
    </main>
  )
}

function PageLink({
  category,
  page,
  disabled,
  children,
}: {
  category: string
  page: number
  disabled?: boolean
  children: React.ReactNode
}) {
  const href = `/vesti/k/${encodeURIComponent(category)}${page > 1 ? `?page=${page}` : ''}`
  if (disabled) {
    return (
      <span className="px-3 py-1 text-sm text-neutral-400 border border-neutral-200 rounded-md">
        {children}
      </span>
    )
  }
  return (
    <Link
      href={href}
      className="px-3 py-1 text-sm border border-neutral-300 rounded-md hover:bg-neutral-50"
      prefetch
    >
      {children}
    </Link>
  )
}
