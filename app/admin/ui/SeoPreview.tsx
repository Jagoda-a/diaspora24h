'use client'

import { useEffect, useState } from 'react'

type Props = {
  title: string
  description: string
  image?: string | null
  slug?: string
}

export default function SeoPreview({ title, description, image, slug }: Props) {
  const [host, setHost] = useState('https://www.diaspora24h.com') // promeni domen

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const h = window.location.origin
      setHost(h)
    }
  }, [])

  const pageUrl = slug ? `${host}/vesti/${slug}` : host
  const imgSrc = image ? `/api/img?url=${encodeURIComponent(image)}` : '/default-og.jpg'

  return (
    <div style={{ marginTop: 24, border: '1px solid #ddd', borderRadius: 12, padding: 16 }}>
      <h3 style={{ marginBottom: 8 }}>SEO pregled</h3>

      <div style={{ display: 'grid', gap: 16 }}>
        {/* Google preview */}
        <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: 580 }}>
          <div style={{ color: '#202124', fontSize: 20, lineHeight: '26px', fontWeight: 400 }}>{title || 'Naslov vesti'}</div>
          <div style={{ color: '#006621', fontSize: 14 }}>{pageUrl}</div>
          <div style={{ color: '#545454', fontSize: 13, marginTop: 4 }}>
            {description?.slice(0, 155) || 'Ovde će stajati opis koji se prikazuje na Google-u...'}
          </div>
        </div>

        {/* Facebook / Twitter preview */}
        <div
          style={{
            width: 500,
            border: '1px solid #ccc',
            borderRadius: 8,
            overflow: 'hidden',
            fontFamily: 'Helvetica, Arial, sans-serif',
          }}
        >
          <img
            src={imgSrc}
            alt="Preview slika"
            style={{ width: '100%', height: 260, objectFit: 'cover', background: '#eee' }}
          />
          <div style={{ padding: 12 }}>
            <div style={{ fontSize: 14, color: '#606770', textTransform: 'uppercase', marginBottom: 4 }}>
              diaspora24h.com
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#1d2129', lineHeight: '22px' }}>
              {title || 'Naslov vesti'}
            </div>
            <div style={{ fontSize: 14, color: '#606770', marginTop: 4 }}>
              {description?.slice(0, 120) || 'Kratak opis sadržaja koji se prikazuje pri deljenju.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
