// app/sitemap.ts
import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/db'
import { CAT_KEYS } from '@/lib/cats'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://diaspora24h.com'
  const now = new Date()

  // Statične strane (uvek tu)
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`,                     lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${base}/vesti`,                lastModified: now, changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${base}/o-nama`,               lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/kontakt`,              lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/politika-privatnosti`, lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${base}/uslovi-koriscenja`,    lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${base}/politika-kolacica`,    lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
  ]

  // SEO landing rute (orphan, indeksabilne)
  const SEO_ROUTES = [
    '/najnovije-vesti',
    '/danasnje-vesti',
    '/vesti-u-srbiji',
    '/srbija-vesti',
    '/balkan-vesti',
    '/dijaspora-vesti',
    '/vesti-iz-srbije-za-dijasporu-u-nemackoj',
    '/vesti-iz-srbije-za-dijasporu-u-austriji',
    '/vesti-iz-srbije-za-dijasporu-u-svajcarskoj',
  ]
  const seoPages: MetadataRoute.Sitemap = SEO_ROUTES.map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: 'hourly',
    priority: 0.9,
  }))

  // Kategorije
  const categoryPages: MetadataRoute.Sitemap = CAT_KEYS.map((cat) => ({
    url: `${base}/vesti/k/${cat}`,
    lastModified: now,
    changeFrequency: 'hourly',
    priority: 0.8,
  }))

  // Poslednji objavljeni članci (bez noindex i bez neobjavljenih)
  const articles = await prisma.article.findMany({
    where: {
      noindex: { not: true },
      publishedAt: { not: null },
    },
    select: { slug: true, updatedAt: true, publishedAt: true },
    orderBy: { publishedAt: 'desc' },
    take: 5000, // drži sitemap “laganim”
  })

  const news: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${base}/vesti/${a.slug}`,
    lastModified: a.updatedAt ?? a.publishedAt ?? now,
    changeFrequency: 'hourly',
    priority: 0.7,
  }))

  return [...staticPages, ...seoPages, ...categoryPages, ...news]
}
