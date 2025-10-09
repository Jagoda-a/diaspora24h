import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const SITE = "https://diaspora24h.com";

function esc(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export const revalidate = 300;

export async function GET() {
  const articles = await prisma.article.findMany({
    where: { noindex: false },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 50,
    select: { title: true, slug: true, summary: true, publishedAt: true },
  });

  const items = articles.map(a => {
    const link = `${SITE}/vesti/${a.slug}`;
    const pub = (a.publishedAt ?? new Date()).toUTCString();
    return `
      <item>
        <title>${esc(a.title)}</title>
        <link>${esc(link)}</link>
        <guid>${esc(link)}</guid>
        <pubDate>${pub}</pubDate>
        <description>${esc(a.summary ?? "")}</description>
      </item>`;
  }).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Diaspora24h</title>
    <link>${SITE}</link>
    <description>Vesti iz Srbije i dijaspore</description>
    ${items}
  </channel>
</rss>`.trim();

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
    },
  });
}
