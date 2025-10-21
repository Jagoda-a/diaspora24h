// app/(seo)/najnovije-vesti/page.tsx
import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 180 // 3 min

export const metadata: Metadata = {
  title: 'Najnovije vesti – danas i sada | Diaspora24h',
  description: 'Najnovije vesti danas: politika, ekonomija, društvo, sport – brz pregled za dijasporu.',
  alternates: { canonical: '/najnovije-vesti', languages: { 'sr-RS': '/najnovije-vesti' } },
  openGraph: { title: 'Najnovije vesti – Diaspora24h', description: 'Brz pregled najnovijih vesti danas.', url: '/najnovije-vesti', type: 'website' },
}

export default async function Page() {
  const items = await prisma.article.findMany({
    where: { noindex: { not: true }, publishedAt: { not: null } },
    orderBy: { publishedAt: 'desc' },
    take: 36,
    select: { id:true, slug:true, title:true, summary:true }
  })

  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://diaspora24h.com'
  const listJsonLd = {
    '@context':'https://schema.org','@type':'ItemList', name:'Najnovije vesti',
    itemListElement: items.slice(0,10).map((a,i)=>({ '@type':'ListItem', position:i+1, url:`${site}/vesti/${a.slug}`, name:a.title }))
  }

  return (
    <main className="container" style={{ padding:'16px 0 32px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listJsonLd) }} />
      <h1 style={{ margin:0 }}>Najnovije vesti</h1>
      <ul style={{ listStyle:'none', padding:0, marginTop:12, display:'grid', gap:12 }}>
        {items.map(a=>(
          <li key={a.id} className="card" style={{ padding:12 }}>
            <Link href={`/vesti/${a.slug}`} style={{ textDecoration:'none', fontWeight:600 }}>{a.title}</Link>
            {a.summary && <p style={{ margin:'6px 0 0' }}>{a.summary}</p>}
          </li>
        ))}
      </ul>
    </main>
  )
}
