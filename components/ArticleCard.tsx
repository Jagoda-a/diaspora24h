// components/ArticleCard.tsx
import Link from 'next/link'

function looksLikeImage(u?: string | null) {
  if (!u) return false
  try {
    const { pathname } = new URL(u)
    // odbaci video/stream ekstenzije
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
  country: string
  publishedAt: string | Date | null
  category?: string | null
}

export default function ArticleCard({ article }: { article: Article }) {
  const href = `/vesti/${article.slug}`
  const hasRemoteImage = looksLikeImage(article.coverImage)

  // Proxy kroz naš domen (rešava hotlink/CORS). Ako nema slike -> lokalni fallback.
  const cover = hasRemoteImage
    ? `/api/img?url=${encodeURIComponent(article.coverImage as string)}`
    : '/cats/nepoznato.webp' // jedina izmena (ranije .jpg)

  const date = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('sr-RS', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : ''

  const summaryBase = (article.summary || '').replace(/\s+/g, ' ').trim()
  const summary = summaryBase.slice(0, 220) + (summaryBase.length > 220 ? '…' : '')

  const cat = (article.category || '').toLowerCase()

  return (
    <article className="card">
      <Link href={href} aria-label={article.title}>
        <div
          className="card-cover"
          style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}
        >
          <img
            src={cover}
            alt={article.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      </Link>

      <div className="card-body">
        <div className="card-meta" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {cat && cat !== 'nepoznato' ? (
            <>
              <Link href={`/vesti/k/${encodeURIComponent(cat)}`} className="badge" aria-label={`Kategorija: ${cat}`}>
                {cat}
              </Link>
              <span className="dot" />
            </>
          ) : null}
          <span className="badge">{article.country?.toUpperCase?.() || 'RS'}</span>
          {date ? (
            <>
              <span className="dot" />
              <time>{date}</time>
            </>
          ) : null}
        </div>

        <h3 className="card-title">
          <Link href={href}>{article.title}</Link>
        </h3>

        {summary ? <p className="card-summary">{summary}</p> : null}
      </div>
    </article>
  )
}
