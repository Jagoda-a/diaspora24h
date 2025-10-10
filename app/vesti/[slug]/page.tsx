// app/vesti/[slug]/page.tsx
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { srLatn } from 'date-fns/locale';
import { headers } from 'next/headers';

type Props = { params: { slug: string } };

// Dimenzije za crop heroa (desktop layout kolona 600px; mobilni koristi aspect-ratio u CSS-u)
const HERO_W = 600;
const HERO_H = 350; // 12:7

// Thumb za "Pročitaj još"
const TH_W = 320;
const TH_H = 180; // 16:9

function getBaseUrl() {
  const h = headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}

function brandFromHost(host: string): string {
  const h = host.replace(/^www\./i, '').toLowerCase();
  if (h.endsWith('blic.rs')) return 'Blic';
  if (h.endsWith('kurir.rs')) return 'Kurir';
  if (h.endsWith('nova.rs')) return 'Nova.rs';
  if (h.endsWith('telegraf.rs')) return 'Telegraf';
  if (h.endsWith('b92.net')) return 'B92';
  if (h.endsWith('n1info.rs')) return 'N1';
  if (h.endsWith('rts.rs')) return 'RTS';
  if (h.endsWith('danas.rs')) return 'Danas';
  if (h.endsWith('informer.rs')) return 'Informer';
  if (h.endsWith('alo.rs')) return 'Alo';
  if (h.endsWith('mondo.rs')) return 'Mondo';
  if (h.endsWith('politika.rs')) return 'Politika';
  if (h.endsWith('nedeljnik.rs')) return 'Nedeljnik';
  if (h.endsWith('novaekonomija.rs')) return 'Nova ekonomija';
  if (h.endsWith('nova-s.tv') || h.endsWith('novas.tv')) return 'Nova S';
  return h;
}

function cleanUrl(u: string): string {
  try {
    const x = new URL(u);
    return `${x.origin}${x.pathname}`;
  } catch {
    return u;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await prisma.article.findUnique({
    where: { slug: params.slug },
    select: {
      title: true,
      summary: true,
      coverImage: true,
      slug: true,
      seoTitle: true,
      seoDescription: true,
      ogImage: true,
      canonicalUrl: true,
      noindex: true,
      publishedAt: true,
      updatedAt: true,
      category: true,
    },
  });

  if (!a) return { title: 'Vest nije pronađena' };

  const site = getBaseUrl();
  const url = `${site}/vesti/${a.slug}`;

  const title = a.seoTitle?.trim() || a.title;
  const description = (a.seoDescription?.trim() || a.summary || '').slice(0, 160);

  const rawImg = a.ogImage?.trim() || a.coverImage || undefined;
  const ogImageAbs = rawImg
    ? `${site}/api/imgx?url=${encodeURIComponent(rawImg)}&w=1200&h=630&fit=cover&pos=attention&format=webp&q=90`
    : undefined;

  const publishedIso = (a.publishedAt ?? new Date()).toISOString();
  const allowIndex = !a.noindex;

  const meta: Metadata = {
    title,
    description,
    alternates: { canonical: a.canonicalUrl || url },
    openGraph: {
      title,
      description,
      type: 'article',
      url,
      images: ogImageAbs ? [{ url: ogImageAbs }] : undefined,
      siteName: 'Diaspora24h',
      locale: 'sr_RS',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImageAbs ? [ogImageAbs] : undefined,
    },
    other: {
      news_keywords: 'Srbija, dijaspora, Nemacka, Svajcarska, Austrija, vesti, Diaspora24h',
      'article:author': 'Redakcija Diaspora24h',
      'article:published_time': publishedIso,
    },
    robots: {
      index: allowIndex,
      follow: allowIndex,
      googleBot: {
        index: allowIndex,
        follow: allowIndex,
        'max-snippet': -1,
        'max-image-preview': 'large',
        'max-video-preview': -1,
      },
    },
  };

  return meta;
}

export const revalidate = 60;

export default async function ArticlePage({ params }: Props) {
  const article = await prisma.article.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      content: true,
      coverImage: true,
      sourceUrl: true,
      language: true,
      category: true,
      publishedAt: true,
      updatedAt: true,
    },
  });

  if (!article) notFound();

  const site = getBaseUrl();
  const pageUrl = `${site}/vesti/${article.slug}`;

  const dt = article.publishedAt
    ? format(article.publishedAt, 'dd.MM.yyyy HH:mm', { locale: srLatn })
    : '';

  const hasBody = !!(article.content && article.content.trim().length > 0);
  const content = hasBody ? article.content! : (article.summary || '');

  // Hero image URL sa crop-om (attention) i kvalitetom
  const heroSrc = article.coverImage
    ? `${site}/api/imgx?url=${encodeURIComponent(
        article.coverImage
      )}&w=${HERO_W}&h=${HERO_H}&fit=cover&pos=attention&format=webp&q=90`
    : null;

  // JSON-LD image (može 1200x675 16:9)
  const jsonLdImage = article.coverImage
    ? `${site}/api/imgx?url=${encodeURIComponent(
        article.coverImage
      )}&w=1200&h=675&fit=cover&pos=attention&format=webp&q=90`
    : undefined;

  const jsonLdLogo = `${site}/logo.png`;
  const publishedIso = (article.publishedAt ?? new Date()).toISOString();
  const updatedIso = (article.updatedAt ?? article.publishedAt ?? new Date()).toISOString();

  // Lead (dek) samo ako postoji pravo telo, da se ne duplira sa summary
  const dek = hasBody ? (article.summary?.slice(0, 220) || '') : '';

  let sourceAnchor: ReactNode = null;
  if (article.sourceUrl) {
    try {
      const u = new URL(article.sourceUrl);
      const brand = brandFromHost(u.host);
      const href = cleanUrl(article.sourceUrl);
      sourceAnchor = (
        <>
          Izvor{' '}
          <a href={href} target="_blank" rel="noopener noreferrer nofollow">
            {brand}
          </a>
        </>
      );
    } catch {
      const safeText = article.sourceUrl.replace(/^https?:\/\//i, '');
      sourceAnchor = (
        <>
          Izvor{' '}
          <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">
            {safeText}
          </a>
        </>
      );
    }
  }

  // PROČITAJ JOŠ (po kategoriji; fallback po jeziku)
  let related: any[] = [];

  if (article.category && article.category !== 'nepoznato') {
    related = await prisma.article.findMany({
      where: {
        id: { not: article.id },
        category: article.category,
      },
      orderBy: { publishedAt: 'desc' },
      take: 12,
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        coverImage: true,
        publishedAt: true,
        category: true,
      },
    });
  }

  if (related.length < 4) {
    const more = await prisma.article.findMany({
      where: {
        id: { notIn: [article.id, ...related.map(r => r.id)] },
        language: article.language,
      },
      orderBy: { publishedAt: 'desc' },
      take: 12 - related.length,
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        coverImage: true,
        publishedAt: true,
        category: true,
      },
    });

    related = [...related, ...more];
  }

  return (
    <main className="container" style={{ paddingTop: 16, paddingBottom: 32 }}>
      <article className="card">
        {/* JSON-LD: NewsArticle */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'NewsArticle',
              headline: article.title,
              image: jsonLdImage ? [jsonLdImage] : [],
              datePublished: publishedIso,
              dateModified: updatedIso,
              author: { '@type': 'Organization', name: 'Redakcija Diaspora24h' },
              publisher: {
                '@type': 'Organization',
                name: 'Diaspora24h',
                logo: { '@type': 'ImageObject', url: jsonLdLogo },
              },
              description: dek || (hasBody ? '' : (article.summary || '')),
              mainEntityOfPage: pageUrl,
              articleSection: article.category || 'nepoznato',
              keywords: article.category
                ? [article.category, 'dijaspora', 'vesti', 'srbi u inostranstvu']
                : ['vesti', 'dijaspora'],
            }),
          }}
        />

        {/* JSON-LD: Breadcrumbs */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Početna', item: site },
                { '@type': 'ListItem', position: 2, name: 'Vesti', item: `${site}/vesti` },
                article.category
                  ? {
                      '@type': 'ListItem',
                      position: 3,
                      name: article.category,
                      item: `${site}/kategorija/${encodeURIComponent(article.category)}`
                    }
                  : null,
                { '@type': 'ListItem', position: 4, name: article.title, item: pageUrl },
              ].filter(Boolean),
            }),
          }}
        />

        {/* HERO blok */}
        <div className="card-body">
          <div className="article-hero">
            {heroSrc ? (
              <div className="media-wrap">
                <img
                  src={heroSrc}
                  alt={article.title}
                  loading="eager"
                  decoding="async"
                />
              </div>
            ) : null}

            <div className="text">
              <h1 className="title">{article.title}</h1>
              {dek ? <p className="dek">{dek}</p> : null}
              <div className="meta">
                {dt}
                {article.language ? ` · ${String(article.language).toUpperCase()}` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Telo članka — FULL WIDTH */}
        <div
          className="card-body"
          style={{
            // Ako parent .card koristi grid za hero (2 kolone), ovim garantujemo da
            // telo zauzme celu širinu (od početka slike do kraja naslova)
            gridColumn: '1 / -1',
          }}
        >
          <div
            className="prose prose-full"
            style={{
              // ukloni bilo kakav max-width iz globalne .prose stilizacije
              maxWidth: 'none',
              width: '100%',
              lineHeight: 1.7,
              fontSize: 18,
            }}
            dangerouslySetInnerHTML={{ __html: toHtml(content) }}
          />
          {sourceAnchor ? <p style={{ marginTop: 16 }}>{sourceAnchor}</p> : null}
        </div>

        <hr style={{ margin: '8px 0 0 0', border: 0, borderTop: '1px solid var(--border)' }} />
        <div className="card-body" style={{ paddingTop: 8 }}>
          <p style={{ fontSize: 12, color: '#666', margin: 0 }}>
            <strong>Article ID:</strong> <code>{article.id}</code>
          </p>
        </div>
      </article>

      {/* PROČITAJ JOŠ — HORIZONTALNI SCROLLER */}
      {related.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18, margin: '0 0 10px 0' }}>Pročitaj još</h2>

          <div className="rel-scroll" role="region" aria-label="Pročitaj još">
            <div className="rel-row">
              {related.map((it) => {
                const date = it.publishedAt
                  ? format(it.publishedAt, 'dd.MM.yyyy', { locale: srLatn })
                  : '';

                const thumb = it.coverImage
                  ? `${site}/api/imgx?url=${encodeURIComponent(
                      it.coverImage
                    )}&w=${TH_W}&h=${TH_H}&fit=cover&pos=attention&format=webp&q=85`
                  : null;

                return (
                  <a key={it.id} href={`/vesti/${it.slug}`} className="rel-card card" style={{ textDecoration: 'none' }}>
                    {thumb ? (
                      <div className="card-cover">
                        <img src={thumb} alt={it.title} />
                      </div>
                    ) : (
                      <div className="card-cover" />
                    )}
                    <div className="card-body">
                      <div className="card-meta">
                        {date ? <span>{date}</span> : null}
                      </div>
                      <h3 className="card-title" style={{ margin: 0 }}>{it.title}</h3>
                      {it.summary ? (
                        <p className="card-summary" style={{ marginTop: 6 }}>
                          {it.summary.slice(0, 140)}
                        </p>
                      ) : null}
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

/**
 * Heuristike za formatiranje sadržaja
 * - smartParagraphs: ako AI vrati jedan dugačak blok, razbij ga na pasuse po 2–3 rečenice
 * - toHtml: ### → <h3>, ## → <h2>, dupli novi red → <p>, jedan novi red → <br/>
 */

function smartParagraphs(plain: string) {
  const hasBlankLines = /\n{2,}/.test(plain);
  if (hasBlankLines) return plain;

  // Razbij po rečenicama i grupiši po 2–3 da dobiješ pasuse
  const sentences = plain.split(/(?<=[\.\?!])\s+(?=[A-ZČĆŽŠĐ])/u);
  const chunks: string[] = [];
  for (let i = 0; i < sentences.length; i += 3) {
    chunks.push(sentences.slice(i, i + 3).join(' '));
  }
  return chunks.join('\n\n');
}

function toHtml(input: string) {
  // normalizuj pasuse ako su "zbijeni"
  const normalized = smartParagraphs(input);

  const safe = normalized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const withHeads = safe
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>');

  const paras = withHeads
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((block) => {
      if (block.startsWith('<h3>') || block.startsWith('<h2>')) return block;
      return `<p>${block.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('\n');

  return paras;
}
