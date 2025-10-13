// components/ArticleCard.tsx
import Link from 'next/link'

function looksLikeImage(u?: string | null) {
  if (!u) return false
  try {
    const { pathname } = new URL(u)
    // odbaci očigledne video/stream ekstenzije
    return !/\.(mp4|m3u8|webm|mov|avi)$/i.test(pathname)
  } catch {
    return false
  }
}

type Article = {
  id: string
  slug: string
  title: string
  summary: string | null
  coverImage: string | null
  country: string | null
  publishedAt: string | Date | null
  category?: string | null
}

export default function ArticleCard({ article }: { article: Article }) {
  const href = `/vesti/${article.slug}`
  const hasRemoteImage = looksLikeImage(article.coverImage)

  const catKey = (article.category || 'nepoznato').toLowerCase()
  const fallbackByCat = `/cats/${catKey}.webp`
  const genericFallback = '/cats/nepoznato.webp'

  // Proxy kroz naš domen (rešava hotlink/CORS). Ako nema slike -> kategorijski pa generički fallback.
  const cover = hasRemoteImage
    ? `/api/img?url=${encodeURIComponent(article.coverImage as string)}`
    : fallbackByCat

  const date = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('sr-RS', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : ''

  const summaryBase = (article.summary || '').replace(/\s+/g, ' ').trim()
  const summary =
    summaryBase.length > 0
      ? summaryBase.length > 220
        ? summaryBase.slice(0, 220).trimEnd() + '…'
        : summaryBase
      : ''

  return (
    <article className="card">
      <Link href={href} aria-label={article.title} prefetch>
        <div
          className="card-cover"
          style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}
        >
          <img
            src={cover}
            // ako iz nekog razloga /cats/${cat}.webp ne postoji u public, browser će pasti na broken img —
            // pa kao krajnji fallback CSS-om možeš dati background ili ovde promeniti na genericFallback
            alt={article.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            // nema event handlera (onError/onLoad), da ne crashuje prerender
          />
        </div>
      </Link>

      <div className="card-body">
        <div className="card-meta" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {catKey && catKey !== 'nepoznato' ? (
            <>
              <Link
                href={`/vesti/k/${encodeURIComponent(catKey)}`}
                className="badge"
                aria-label={`Kategorija: ${catKey}`}
                prefetch
              >
                {catKey}
              </Link>
              <span className="dot" />
            </>
          ) : null}
          <span className="badge">{(article.country || 'RS').toUpperCase()}</span>
          {date ? (
            <>
              <span className="dot" />
              <time>{date}</time>
            </>
          ) : null}
        </div>

        <h3 className="card-title">
          <Link href={href} prefetch>
            {article.title}
          </Link>
        </h3>

        {summary ? <p className="card-summary">{summary}</p> : null}
      </div>
    </article>
  )
}
