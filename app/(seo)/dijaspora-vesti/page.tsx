// app/(seo)/dijaspora-vesti/page.tsx
import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 300

export const metadata: Metadata = {
  title: 'Dijaspora vesti – Srbija i Balkan | Diaspora24h',
  description: 'Dijaspora vesti: najbitnije iz Srbije i regiona – jasno, kratko i ažurno.',
  alternates: { canonical: '/dijaspora-vesti', languages: { 'sr-RS': '/dijaspora-vesti' } },
  openGraph: {
    title: 'Dijaspora vesti – Diaspora24h',
    description: 'Srbija i Balkan – pregled za dijasporu.',
    url: '/dijaspora-vesti',
    type: 'website',
  },
}

export default async function Page() {
  const items = await prisma.article.findMany({
    where: { noindex: { not: true }, category: { in: ['politika','ekonomija','drustvo','region','svet'] } },
    orderBy: { publishedAt: 'desc' },
    take: 30,
    select: { id:true, slug:true, title:true, summary:true },
  })

  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://diaspora24h.com'
  const listJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Dijaspora vesti',
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
      <h1 style={{ margin: 0 }}>Dijaspora vesti</h1>
      <ul style={{ listStyle: 'none', padding: 0, marginTop: 12, display: 'grid', gap: 12 }}>
        {items.map(a => (
          <li key={a.id} className="card" style={{ padding: 12 }}>
            <Link href={`/vesti/${a.slug}`} style={{ textDecoration: 'none', fontWeight: 600 }}>{a.title}</Link>
            {a.summary && <p style={{ margin: '6px 0 0' }}>{a.summary}</p>}
          </li>
        ))}
      </ul>
    </main>
  )
}
