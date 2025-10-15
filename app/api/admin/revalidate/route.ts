// app/api/admin/revalidate/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { revalidatePath, revalidateTag } from 'next/cache'
import { readSession } from '@/lib/auth'

// Ako želiš da dodam još putanja – dopuni listu
const CAT_PATHS = [
  '/', '/vesti',
  '/vesti/k/politika',
  '/vesti/k/hronika',
  '/vesti/k/sport',
  '/vesti/k/ekonomija',
  '/vesti/k/tehnologija',
  '/vesti/k/kultura',
  '/vesti/k/zdravlje',
  '/vesti/k/lifestyle',
  '/vesti/k/zanimljivosti',
  '/vesti/k/svet',
  '/vesti/k/region',
  '/vesti/k/drustvo',
] as const

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  slug?: string
  paths?: string[]
  tags?: string[]
  all?: boolean          // ako je true → revalidate ALL (CAT_PATHS)
}

function fromJSON<T>(val: unknown, fallback: T): T {
  return (val && typeof val === 'object') || Array.isArray(val) ? (val as T) : fallback
}

// Dodatna opcija: dozvoli header token pored session cookie
function isAuthed(req: Request): boolean {
  const byCookie = (() => {
    const c = cookies().get('admin_session')?.value
    return !!readSession(c || '')
  })()

  if (byCookie) return true

  const hdr = req.headers.get('x-admin-token') || ''
  if (process.env.ADMIN_TOKEN && hdr && hdr === process.env.ADMIN_TOKEN) return true

  return false
}

// Mali helper da umereno “očisti” putanje
function cleanPath(p: string): string | null {
  if (typeof p !== 'string') return null
  let s = p.trim()
  if (!s) return null
  // prihvatamo samo absolute path (nema protokola / host-a)
  try {
    // Ako neko pošalje full URL, izdvajamo pathname (bez query/hash)
    if (/^https?:\/\//i.test(s)) {
      const u = new URL(s)
      s = u.pathname || '/'
    }
  } catch {}
  if (!s.startsWith('/')) s = `/${s}`
  // osnovna normalizacija dup slash-eva
  s = s.replace(/\/{2,}/g, '/')
  return s
}

export async function POST(req: Request) {
  if (!isAuthed(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let payload: Body = {}
  try {
    payload = await req.json()
  } catch {
    // no body is fine
  }

  const slug = typeof payload.slug === 'string' ? payload.slug.trim() : ''
  const tagsIn = Array.isArray(payload.tags) ? payload.tags : []
  const pathsIn = Array.isArray(payload.paths) ? payload.paths : []
  const wantAll = Boolean(payload.all)

  // 1) TAG revalidate (ako koristiš tag-based caching u fetch/route handlers)
  const tags = Array.from(new Set(tagsIn.filter(Boolean)))
  for (const t of tags) {
    try { revalidateTag(t) } catch {}
  }

  // 2) PATH revalidate
  // Započni sa osnovnim (uvek možemo osvežiti početnu)
  const pathSet = new Set<string>(['/'])

  // Ako je prosleđen slug, osveži i single stranicu vesti + listing /vesti
  if (slug) {
    pathSet.add('/vesti')
    pathSet.add(cleanPath(`/vesti/${slug}`)!)
  }

  // Ako “all” → dodaj sve kategorijske putanje
  if (wantAll) {
    for (const p of CAT_PATHS) pathSet.add(p)
  }

  // Dodaj korisnički definisane putanje
  for (const raw of pathsIn) {
    const p = cleanPath(String(raw || ''))
    if (p) pathSet.add(p)
  }

  // Ukloni eventualne null vrednosti (defenzivno)
  pathSet.delete('null' as unknown as string)
  pathSet.delete('undefined' as unknown as string)

  // Limit da neko ne pošalje hiljade path-ova odjednom
  const MAX_PATHS = 200
  const finalPaths = Array.from(pathSet).slice(0, MAX_PATHS)

  // Stvarni revalidate pozivi
  let okCount = 0
  for (const p of finalPaths) {
    try {
      revalidatePath(p, 'page')
      okCount++
    } catch {
      // nastavi; pogrešan path ne treba da sruši sve
    }
  }

  return NextResponse.json({
    ok: true,
    revalidated: {
      tags,
      paths: finalPaths,
      count: okCount,
      all: wantAll,
      slug: slug || undefined,
    },
  })
}
