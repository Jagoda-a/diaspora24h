// lib/stock.ts
export type StockImage = {
  url: string
  width?: number
  height?: number
  source: 'unsplash'|'pexels'|'pixabay'
  author?: string
  authorUrl?: string
  sourcePage?: string
}

const UA = { 'User-Agent': 'diaspora24h-bot/1.0' }

export async function searchUnsplash(q: string, n = 6): Promise<StockImage[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) return []
  const u = new URL('https://api.unsplash.com/search/photos')
  u.searchParams.set('query', q)
  u.searchParams.set('per_page', String(n))
  const r = await fetch(u, { headers: { ...UA, Authorization: `Client-ID ${key}` }, cache: 'no-store' })
  if (!r.ok) return []
  const j = await r.json().catch(()=>null)
  const results = j?.results || []
  return results.map((x: any) => ({
    url: x.urls?.regular || x.urls?.full || x.urls?.small,
    width: x.width, height: x.height,
    source: 'unsplash' as const,
    author: x.user?.name, authorUrl: x.user?.links?.html,
    sourcePage: x.links?.html,
  })).filter((z: StockImage)=>!!z.url)
}

export async function searchPexels(q: string, n = 6): Promise<StockImage[]> {
  const key = process.env.PEXELS_API_KEY
  if (!key) return []
  const u = new URL('https://api.pexels.com/v1/search')
  u.searchParams.set('query', q)
  u.searchParams.set('per_page', String(n))
  const r = await fetch(u, { headers: { ...UA, Authorization: key }, cache: 'no-store' })
  if (!r.ok) return []
  const j = await r.json().catch(()=>null)
  const results = j?.photos || []
  return results.map((x: any) => ({
    url: x.src?.large || x.src?.large2x || x.src?.medium,
    width: x.width, height: x.height,
    source: 'pexels' as const,
    author: x.photographer, authorUrl: x.photographer_url,
    sourcePage: x.url,
  })).filter((z: StockImage)=>!!z.url)
}

export async function searchPixabay(q: string, n = 6): Promise<StockImage[]> {
  const key = process.env.PIXABAY_KEY
  if (!key) return []
  const u = new URL('https://pixabay.com/api/')
  u.searchParams.set('key', key)
  u.searchParams.set('q', q)
  u.searchParams.set('per_page', String(n))
  u.searchParams.set('image_type', 'photo')
  const r = await fetch(u, { headers: UA, cache: 'no-store' })
  if (!r.ok) return []
  const j = await r.json().catch(()=>null)
  const hits = j?.hits || []
  return hits.map((x: any) => ({
    url: x.webformatURL || x.largeImageURL,
    width: x.imageWidth, height: x.imageHeight,
    source: 'pixabay' as const,
    author: x.user, authorUrl: `https://pixabay.com/users/${x.user}-${x.user_id}/`,
    sourcePage: x.pageURL,
  })).filter((z: StockImage)=>!!z.url)
}

/** Spojeno: Unsplash -> Pexels -> Pixabay; vrati prvu sliku ako postoji ključ */
export async function findRoyaltyFree(queries: string[]): Promise<StockImage | null> {
  const fns = [searchUnsplash, searchPexels, searchPixabay]
  for (const q of queries) {
    for (const fn of fns) {
      const res = await fn(q, 6)
      if (res.length) return res[0]
    }
  }
  return null
}
