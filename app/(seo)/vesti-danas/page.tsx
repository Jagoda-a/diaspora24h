// app/(seo)/vesti-danas/page.tsx
import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import ArticleCard from '@/components/ArticleCard'

export const dynamic = 'force-static'
export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  const title = 'Vesti danas | Diaspora24h'
  const description = 'Vesti dana iz Srbije — pregled najvažnijih dešavanja danas.'
  const canonical = '/vesti-danas'
  return {
    title, description, alternates: { canonical },
    openGraph: { type: 'website', url: canonical, siteName: 'Diaspora24h', title, description, images: [{ url: '/og-home.jpg', width: 1200, height: 630, alt: 'Diaspora 24h' }], locale: 'sr_RS' },
    twitter: { card: 'summary_large_image', title, description, images: ['/og-home.jpg'] },
    robots: { index: true, follow: true },
  }
}

export default async function Page() {
  const since = new Date(); since.setHours(0,0,0,0)
  const items = await prisma.article.findMany({
    where: { noindex: { not: true }, country: 'rs', publishedAt: { gte: since } },
    orderBy: { publishedAt: 'desc' },
    take: 36,
    select: { id:true, slug:true, title:true, summary:true, coverImage:true, country:true, publishedAt:true, category:true },
  })

  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://diaspora24h.com'
  const listJsonLd = {
    '@context':'https://schema.org','@type':'ItemList',name:'Vesti danas',
    itemListElement: items.slice(0,10).map((a,i)=>({ '@type':'ListItem', position:i+1, url:`${site}/vesti/${a.slug}`, name:a.title })),
  }

  return (
    <div className="container" style={{ padding:16 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listJsonLd) }} />
      <h1 style={{ margin: 0 }}>Vesti danas</h1>
      <div className="articles-grid">
        {items.map((a)=> <ArticleCard key={a.id} article={a as any} />)}
      </div>
    </div>
  )
}
