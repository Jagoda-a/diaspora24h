// app/news-sitemap.ts
import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/db'

export default async function newsSitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://diaspora24h.com'
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000)

  const articles = await prisma.article.findMany({
    where: { noindex: { not: true }, publishedAt: { gte: since } },
    orderBy: { publishedAt: 'desc' },
    take: 1000,
    select: { slug:true, updatedAt:true, publishedAt:true },
  })

  return articles.map(a => ({
    url: `${base}/vesti/${a.slug}`,
    lastModified: a.updatedAt ?? a.publishedAt ?? new Date(),
    changeFrequency: 'hourly',
    priority: 0.9,
  }))
}
