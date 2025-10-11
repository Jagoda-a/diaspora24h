// app/vesti/page.tsx
import Link from "next/link"
import { prisma } from "@/lib/db"
import { cache } from "react"

export const revalidate = 600
export const dynamic = "force-static"

// Usaglasi sa svojom listom kategorija (slug = ime .webp/.jpg u public/cats)
const CATEGORIES: { slug: string; title: string }[] = [
  { slug: "politika",    title: "Politika" },
  { slug: "sport",       title: "Sport" },
  { slug: "ekonomija",   title: "Ekonomija" },
  { slug: "hronika",     title: "Hronika" },
  { slug: "svet",        title: "Svet" },
  { slug: "kultura",     title: "Kultura" },
  { slug: "zabava",      title: "Zabava" },
  { slug: "tehnologija", title: "Tehnologija" },
]

const loadStats = cache(async () => {
  const rows = await prisma.article.groupBy({
    by: ["category"],
    _count: { _all: true },
    _max: { publishedAt: true },
  })
  const map = new Map<string, { count: number; last?: Date | null }>()
  for (const r of rows) {
    map.set(r.category, { count: r._count._all, last: r._max.publishedAt })
  }
  return map
})

export default async function VestiKategorijePage() {
  const stats = await loadStats()

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-3xl font-semibold mb-6">Vesti po kategorijama</h1>

      <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
        {CATEGORIES.map(cat => {
          const s = stats.get(cat.slug) || { count: 0, last: null }
          const href = `/vesti/${encodeURIComponent(cat.slug)}`
          const webp = `/cats/${cat.slug}.webp`
          const jpg  = `/cats/${cat.slug}.jpg`
          const fallback = `/cats/_fallback.webp`

          return (
            <li key={cat.slug} className="group rounded-2xl overflow-hidden border border-neutral-200 bg-white shadow-sm hover:shadow-md transition">
              <Link href={href} className="block">
                <div className="relative w-full aspect-[4/3] bg-neutral-100 overflow-hidden">
                  {/* Bez event handlera: webp → jpg → fallback */}
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
                <div className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base md:text-lg font-medium">{cat.title}</h2>
                    <span className="text-xs md:text-sm text-neutral-500">
                      {s.count} {s.count === 1 ? "vest" : "vesti"}
                    </span>
                  </div>
                  {s.last && (
                    <p className="text-xs text-neutral-500 mt-1">
                      Poslednje ažuriranje: {new Date(s.last).toLocaleDateString("sr-RS")}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          )
        })}
      </ul>

      <p className="text-xs text-neutral-500 mt-6">
        Slike su iz <code>/public/cats</code>. Pregled prvo pokušava <code>.webp</code>, zatim <code>.jpg</code>, pa zatim <code>_fallback.webp</code>.
      </p>
    </main>
  )
}
