// components/CategoryTile.tsx
import Link from 'next/link'

export default function CategoryTile({
  slug,
  label,
  count,
}: {
  slug: string
  label: string
  count: number
}) {
  const cover = `/cats/${slug}.webp` // statičan fallback iz /public/cats

  return (
    <article className="cat-card">
      <Link href={`/vesti/k/${encodeURIComponent(slug)}`} aria-label={label}>
        <div
          className="cat-cover"
          style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}
        >
          {/* Bez onError u server komponenti */}
          <img
            src={cover}
            alt={label}
            loading="lazy"
            decoding="async"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
        <div className="cat-body">
          <h3 className="cat-title">{label}</h3>
          <p className="cat-count">{count} {count === 1 ? 'vest' : 'vesti'}</p>
        </div>
      </Link>
    </article>
  )
}
