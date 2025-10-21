// app/(seo)/vesti-iz-srbije-za-dijasporu-u-[loc]/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 300
export const dynamicParams = false

const MAP = {
  nemackoj: {
    title: 'Vesti iz Srbije za dijasporu u Nemačkoj | Diaspora24h',
    h1: 'Vesti iz Srbije za dijasporu u Nemačkoj',
    desc: 'Kratak, jasan pregled najvažnijih vesti iz Srbije — kurirano za naše ljude u Nemačkoj.',
    canonical: '/vesti-iz-srbije-za-dijasporu-u-nemackoj',
  },
  austriji: {
    title: 'Vesti iz Srbije za dijasporu u Austriji | Diaspora24h',
    h1: 'Vesti iz Srbije za dijasporu u Austriji',
    desc: 'Najbitnije vesti iz Srbije — pregled za dijasporu u Austriji.',
    canonical: '/vesti-iz-srbije-za-dijasporu-u-austriji',
  },
  svajcarskoj: {
    title: 'Vesti iz Srbije za dijasporu u Švajcarskoj | Diaspora24h',
    h1: 'Vesti iz Srbije za dijasporu u Švajcarskoj',
    desc: 'Sažet izbor vesti iz Srbije — za naše ljude u Švajcarskoj.',
    canonical: '/vesti-iz-srbije-za-dijasporu-u-svajcarskoj',
  },
} as const

type LocKey = keyof typeof MAP

export async function generateMetadata({ params }: { params: { loc: LocKey } }): Promise<Metadata> {
  const m = MAP[params.loc]
  if (!m) return { robots: { index: false, follow: false } }
  const title = m.title
  const description = m.desc
  const canonical = m.canonical
  return {
    title,
    description,
    alternates: { canonical, languages: { 'sr-RS': canonical } },
    openGraph: { title, description, url: canonical, type: 'website', siteName: 'Diaspora24h', locale: 'sr_RS' },
    twitter: { card: 'summary_large_image', title, description },
    robots: { index: true, follow: true },
  }
}

export function generateStaticParams() {
  return [{ loc: 'nemackoj' }, { loc: 'austriji' }, { loc: 'svajcarskoj' }]
}

export default async function Page({ params }: { params: { loc: LocKey } }) {
  const m = MAP[params.loc]
  if (!m) return notFound()

  const items = await prisma.article.findMany({
    where: { noindex: { not: true }, publishedAt: { not: null } },
    orderBy: { publishedAt: 'desc' },
    take: 30,
    select: { id: true, slug: true, title: true, summary: true },
  })

  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://diaspora24h.com'
  const listJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: m.h1,
    itemListElement: items.slice(0, 10).map((a, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${site}/vesti/${a.slug}`,
      name: a.title,
    })),
  }

  return (
    <main className="container" style={{ padding: '16px 0 32px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listJsonLd) }} />
      <h1 style={{ margin: 0 }}>{m.h1}</h1>
      <p style={{ color: 'var(--muted)', marginTop: 6 }}>{m.desc}</p>

      <nav style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '8px 0 16px' }}>
        <Link href="/dijaspora-vesti">Dijaspora vesti</Link>
        <Link href="/najnovije-vesti">Najnovije vesti</Link>
        <Link href="/vesti-u-srbiji">Vesti u Srbiji</Link>
        <Link href="/vesti/k/politika">Politika</Link>
        <Link href="/vesti/k/ekonomija">Ekonomija</Link>
      </nav>

      <ul style={{ listStyle: 'none', padding: 0, marginTop: 6, display: 'grid', gap: 12 }}>
        {items.map((a) => (
          <li key={a.id} className="card" style={{ padding: 12 }}>
            <Link href={`/vesti/${a.slug}`} style={{ textDecoration: 'none', fontWeight: 600 }}>
              {a.title}
            </Link>
            {a.summary && <p style={{ margin: '6px 0 0' }}>{a.summary}</p>}
          </li>
        ))}
      </ul>
    </main>
  )
}
