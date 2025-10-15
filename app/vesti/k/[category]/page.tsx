// app/vesti/k/[category]/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import ArticleCard from '@/components/ArticleCard'
import { CAT_KEYS, type Cat } from '@/lib/cats'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const PAGE_SIZE = 24

type Props = {
  params: { category: Cat }
  searchParams?: { page?: string }
}

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const catKey = (CAT_KEYS as string[]).includes(params.category) ? params.category : 'drustvo'
  const label = LABELS[catKey as Cat] ?? 'Vesti'
  return {
    title: `Vesti – ${label}`,
    description: `Najnovije vesti iz kategorije: ${label}.`,
  }
}

export default async function CatPage({ params, searchParams }: Props) {
  const catKey: Cat = (CAT_KEYS as string[]).includes(params.category) ? params.category : 'drustvo'
  const label = LABELS[catKey] ?? 'Vesti'

  const pageParam = String(searchParams?.page ?? '1')
  const page = Math.max(1, parseInt(pageParam, 10) || 1)

  const [total, items] = await Promise.all([
    prisma.article.count({ where: { category: catKey } }),
    prisma.article.findMany({
      where: { category: catKey },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
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
  const catCover = `/cats/${catKey}.webp`

  return (
    <main className="container" style={{ padding: '16px 0 32px' }}>
      <div className="flex items-center justify-between gap-4 mb-3">
        <h1 style={{ fontSize: '22px', margin: 0 }}>Vesti – {label}</h1>
        <span className="text-sm text-neutral-500">
          {total} {total === 1 ? 'vest' : 'vesti'}
        </span>
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
        <nav
          aria-label="Paginacija"
          style={{
            marginTop: 28,
            display: 'grid',
            gap: 10,
            justifyItems: 'center',
          }}
        >
          {/* Desktop/tablet */}
          <div className="show-on-desktop" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CircleLink
              category={catKey}
              page={page - 1}
              disabled={page <= 1}
              ariaLabel="Prethodna strana"
              icon="left"
            />
            <span className="text-sm text-neutral-600">
              Strana <b>{page}</b> / {totalPages}
            </span>
            <CircleLink
              category={catKey}
              page={page + 1}
              disabled={page >= totalPages}
              ariaLabel="Sledeća strana"
              icon="right"
            />
          </div>

          {/* Mobilni: strelice + input +  "trenutna/ukupno" */}
          <form
            className="show-on-mobile"
            action={`/vesti/k/${encodeURIComponent(catKey)}`}
            method="get"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              justifyContent: 'center',
            }}
          >
            <CircleLink
              category={catKey}
              page={page - 1}
              disabled={page <= 1}
              ariaLabel="Prethodna strana"
              icon="left"
            />

            <input
              type="number"
              inputMode="numeric"
              enterKeyHint="go"
              name="page"
              min={1}
              max={totalPages}
              placeholder={String(page)}
              style={{
                width: 84,
                textAlign: 'center',
                border: '1px solid var(--border)',
                borderRadius: 999,
                padding: '8px 10px',
                background: 'var(--card)',
                color: 'var(--fg)',
              }}
              aria-label="Idi na stranu"
            />

            {/* prikaz  "trenutna/ukupno"  */}
            <span
              style={{
                fontSize: 13,
                color: 'var(--muted)',
                minWidth: 48,
                textAlign: 'center',
              }}
              aria-hidden="true"
            >
              {page} / {totalPages}
            </span>

            {/* skriven submit da Enter radi bez posebnog dugmeta */}
            <input type="submit" hidden />

            <CircleLink
              category={catKey}
              page={page + 1}
              disabled={page >= totalPages}
              ariaLabel="Sledeća strana"
              icon="right"
            />
          </form>
        </nav>
      )}
    </main>
  )
}

/** Jednostavan “pill” link sa chevron ikonama — bez event handlera i bez styled-jsx */
function CircleLink({
  category,
  page,
  disabled,
  ariaLabel,
  icon,
}: {
  category: string
  page: number
  disabled?: boolean
  ariaLabel: string
  icon: 'left' | 'right'
}) {
  const href = `/vesti/k/${encodeURIComponent(category)}${page > 1 ? `?page=${page}` : ''}`

  const commonStyle: React.CSSProperties = {
    width: 40,
    height: 40,
    border: '1px solid var(--border)',
    borderRadius: 999,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--card)',
    color: 'var(--fg)',
    textDecoration: 'none',
  }

  const iconSvg =
    icon === 'left' ? (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ) : (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )

  if (disabled || page < 1) {
    return (
      <span
        aria-disabled="true"
        title={ariaLabel}
        style={{ ...commonStyle, opacity: 0.45 }}
      >
        {iconSvg}
      </span>
    )
  }

  return (
    <Link href={href} aria-label={ariaLabel} prefetch={false} style={commonStyle}>
      {iconSvg}
    </Link>
  )
}
