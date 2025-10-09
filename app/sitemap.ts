// app/sitemap.ts
import { prisma } from '@/lib/db'

export default async function sitemap() {
  const baseUrl = 'https://diaspora24h.com'

  const articles = await prisma.article.findMany({
    select: { slug: true, updatedAt: true, publishedAt: true, noindex: true },
    orderBy: { updatedAt: 'desc' },
    take: 5000,
  })

  const news = articles
    .filter(a => !a.noindex)
    .map(a => ({
      url: `${baseUrl}/vesti/${a.slug}`,
      lastModified: a.updatedAt || a.publishedAt || new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }))

  const staticPages = [
    '',
    '/vesti',
    '/o-nama',
    '/kontakt',
    '/politika-privatnosti',
    '/uslovi-koriscenja',
    '/politika-kolacica',
  ].map(p => ({
    url: `${baseUrl}${p}`,
    lastModified: new Date(),
  }))

  return [...staticPages, ...news]
}
