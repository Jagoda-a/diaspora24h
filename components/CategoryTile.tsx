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
  const cover = `/cats/${encodeURIComponent(slug)}.webp` // statična slika iz /public/cats

  return (
    <article
      className="cat-tile"
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      <Link href={`/vesti/k/${encodeURIComponent(slug)}`} aria-label={label}>
        <div
          className="cat-tile-media"
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '3 / 2', // manji, kompaktniji format
            overflow: 'hidden',
            background: '#f3f4f6',
          }}
        >
          {/* Bez onError na serveru! */}
          <img
            src={cover}
            alt={label}
            loading="lazy"
            decoding="async"
            width={600}
            height={400}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 70%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 12,
              right: 12,
              bottom: 10,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>
              {label}
            </h3>
            <span
              style={{
                fontSize: 12,
                padding: '4px 8px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.35)',
                backdropFilter: 'blur(2px)',
              }}
            >
              {count} {count === 1 ? 'vest' : 'vesti'}
            </span>
          </div>
        </div>
      </Link>
    </article>
  )
}
