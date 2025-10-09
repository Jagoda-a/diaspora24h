import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const SITE = "https://diaspora24h.com";

export const revalidate = 300;

export async function GET() {
  const since = new Date(Date.now() - 72 * 60 * 60 * 1000); // 72h unazad
  const items = await prisma.article.findMany({
    where: { noindex: false, publishedAt: { gte: since } },
    orderBy: { publishedAt: "desc" },
    take: 1000,
    select: { slug: true, title: true, publishedAt: true },
  });

  const xmlItems = items.map(a => `
    <url>
      <loc>${SITE}/vesti/${a.slug}</loc>
      <news:news>
        <news:publication>
          <news:name>Diaspora24h</news:name>
          <news:language>sr</news:language>
        </news:publication>
        <news:publication_date>${(a.publishedAt ?? new Date()).toISOString()}</news:publication_date>
        <news:title>${a.title.replace(/&/g, "&amp;")}</news:title>
      </news:news>
      <lastmod>${(a.publishedAt ?? new Date()).toISOString()}</lastmod>
    </url>`).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  ${xmlItems}
</urlset>`.trim();

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
