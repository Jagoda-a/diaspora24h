// app/vesti/page.tsx
import Link from "next/link"
import Image from "next/image"
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
  { slug: "zdravlje",      title: "Zdravlje",      img: "zdravlje.webp" },
  { slug: "lifestyle",     title: "Lifestyle",     img: "lifestyle.webp" },
  { slug: "tech",          title: "Tech",          img: "tech.webp" },
  { slug: "zanimljivosti", title: "Zanimljivosti", img: "zanimljivosti.webp" },
  { slug: "nepoznato",     title: "Nepoznato",     img: "nepoznato.webp" },
]

// grupna statistika po kategoriji (broj i poslednja izmena)
const getStats = cache(async () => {
  // koristimo updatedAt kao poslednje ažuriranje
  const rows = await prisma.article.groupBy({
    by: ["category"],
    _count: { _all: true },
    _max: { updatedAt: true },
  })

  const m = new Map<string, { count: number; last: Date | null }>()
  for (const r of rows) {
    const key = (r.category || "").toLowerCase()
    m.set(key, {
      count: r._count._all,
      last: r._max.updatedAt ?? null,
    })
  }
  return m
})

export default async function VestiPoKategorijama() {
  const stats = await getStats()

  return (
    <main
      className="container"
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        // padding više NE stavljamo ovde; rešava ga .container u globals.css na 16px
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 600, margin: "0 0 16px 0" }}>
        Vesti po kategorijama
      </h1>

      {/* Centrirani fleks-grid sa fiksnom maksimalnom širinom kartice 343px i gap 16px */}
      <ul
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 16,
          margin: "16px 0",
          padding: 0,
          listStyle: "none",
        }}
      >
        {CATS.map((cat, i) => {
          const s = stats.get(cat.slug) || { count: 0, last: null }
          const href = `/vesti/k/${encodeURIComponent(cat.slug)}`
          const src = `/cats/${cat.img}`

          return (
            <li
              key={cat.slug}
              style={{
                width: "min(343px, 100%)", // ≤343px na mobilnom, 100% širina kolone
              }}
            >
              <Link
                href={href}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  display: "block",
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  overflow: "hidden",
                  boxShadow: "0 3px 10px var(--card-shadow)",
                }}
              >
                {/* COVER 16:9 sa next/image optimizacijom */}
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "16/9",
                    overflow: "hidden",
                    background: "var(--surface-weak)",
                  }}
                >
                  <Image
                    src={src}
                    alt={cat.title}
                    fill
                    sizes="(max-width: 640px) 100vw, 343px"
                    priority={i < 4}            // prve 4 kartice prioritetno
                    placeholder="blur"
                    blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII="
                    style={{ objectFit: "cover", display: "block" }}
                  />
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
