// app/vesti/page.tsx
import Link from "next/link"
import { prisma } from "@/lib/db"
import { cache } from "react"

export const dynamic = "force-static"
export const revalidate = 600

// Slug = vrednost u bazi; img = ime fajla u /public/cats
const CATS: { slug: string; title: string; img: string }[] = [
  { slug: "politika",      title: "Politika",      img: "politika.webp" },
  { slug: "sport",         title: "Sport",         img: "sport.webp" },
  { slug: "ekonomija",     title: "Ekonomija",     img: "ekonomija.webp" },
  { slug: "hronika",       title: "Hronika",       img: "hronika.webp" },
  { slug: "svet",          title: "Svet",          img: "svet.webp" },
  { slug: "kultura",       title: "Kultura",       img: "kultura.webp" },
  { slug: "lifestyle",     title: "Lifestyle",     img: "lifestyle.webp" },
  { slug: "zanimljivosti", title: "Zanimljivosti", img: "zanimljivosti.webp" },
  { slug: "zdravlje",      title: "Zdravlje",      img: "zdravlje.webp" },
  { slug: "tehnologija",   title: "Tehnologija",   img: "tech.webp" },
]

// grupni upit: count + last
const loadStats = cache(async () => {
  const rows = await prisma.article.groupBy({
    by: ["category"],
    _count: { _all: true },
    _max: { publishedAt: true },
  })
  const map = new Map<string, { count: number; last?: Date | null }>()
  for (const r of rows) map.set(r.category, { count: r._count._all, last: r._max.publishedAt })
  return map
})

export default async function VestiKategorijePage() {
  const stats = await loadStats()

  return (
    <main
      className="container"
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "16px", // ← traženi 16px margin/padding oko sadržaja
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 600, margin: "0 0 16px 0" }}>Vesti po kategorijama</h1>

      {/* Centrirani grid sa fiksnom širinom kartice 343px i razmacima 16px */}
      <ul
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 16,           // razmak horizontalno i vertikalno
          margin: "16px 0",  // top/bottom
          padding: 0,
          listStyle: "none",
        }}
      >
        {CATS.map((cat) => {
          const s = stats.get(cat.slug) || { count: 0, last: null }
          const href = `/vesti/k/${encodeURIComponent(cat.slug)}`
          const webp = `/cats/${cat.img}`
          const jpg = `/cats/${cat.img.replace(/\.webp$/i, ".jpg")}`
          const fallback = `/cats/_fallback.webp`

          return (
            <li
              key={cat.slug}
              style={{
                width: "min(343px, 100%)", // ≤343px na mobilnom
              }}
            >
              <Link
                href={href}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  display: "block",
                  border: "1px solid #e5e7eb",
                  borderRadius: 16,
                  background: "#fff",
                  overflow: "hidden",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  transition: "box-shadow .2s ease",
                }}
              >
                {/* COVER: fiksna visina 160px (pravougaonik) */}
                <div style={{ width: "100%", height: 160, background: "#f3f4f6", overflow: "hidden" }}>
                  <picture>
                    <source srcSet={webp} type="image/webp" />
                    <source srcSet={jpg} type="image/jpeg" />
                    <img
                      src={fallback}
                      alt={cat.title}
                      loading="lazy"
                      decoding="async"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  </picture>
                </div>

                {/* BODY */}
                <div style={{ padding: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{cat.title}</h2>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>
                      {s.count} {s.count === 1 ? "vest" : "vesti"}
                    </span>
                  </div>
                  {s.last && (
                    <p style={{ fontSize: 12, color: "#6b7280", margin: "6px 0 0 0" }}>
                      Poslednje ažuriranje: {new Date(s.last).toLocaleDateString("sr-RS")}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
