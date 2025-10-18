// lib/wikimedia.ts
export type WikiImage = {
  url: string
  width?: number
  height?: number
  title?: string
  author?: string
  license?: string
  licenseUrl?: string
  sourcePage?: string
}

const WIKI_API = 'https://commons.wikimedia.org/w/api.php'

async function fetchJSON(u: string) {
  const r = await fetch(u, {
    headers: { 'User-Agent': 'diaspora24h-bot/1.0' },
    cache: 'no-store',
  })
  if (!r.ok) return null
  return r.json()
}

export async function searchWikimediaImages(query: string, limit = 6): Promise<WikiImage[]> {
  const u = new URL(WIKI_API)
  u.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrlimit: String(limit),
    // malo “editorial” filtera — pojmovi + bitmap
    gsrsearch: `${query} filetype:bitmap`,
    prop: 'imageinfo|info',
    inprop: 'url',
    iiprop: 'url|extmetadata|size',
    iiurlwidth: '1600',
  }).toString()

  const data = await fetchJSON(u.toString())
  if (!data?.query?.pages) return []

  const out: WikiImage[] = []
  for (const k of Object.keys(data.query.pages)) {
    const p = data.query.pages[k]
    const info = Array.isArray(p?.imageinfo) ? p.imageinfo[0] : null
    const meta = info?.extmetadata || {}
    const bestUrl = info?.thumburl || info?.url
    if (!bestUrl) continue
    out.push({
      url: bestUrl,
      width: info?.thumbwidth || info?.width,
      height: info?.thumbheight || info?.height,
      title: meta?.ObjectName?.value || p?.title,
      author: meta?.Artist?.value?.replace(/<[^>]+>/g, '') || undefined,
      license: meta?.LicenseShortName?.value || meta?.License?.value || undefined,
      licenseUrl: meta?.LicenseUrl?.value || undefined,
      sourcePage: p?.fullurl || undefined,
    })
  }
  return out
}

export async function findEditorialImageWikimedia(queries: string[]): Promise<WikiImage | null> {
  for (const q of queries) {
    const res = await searchWikimediaImages(q, 8)
    const best = res.find(i => !!i.url)
    if (best) return best
  }
  return null
}
