// app/api/admin/upload/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readSession } from '@/lib/auth'
import { put } from '@vercel/blob'
import sharp from 'sharp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ciljevi/limiti (slobodno izmeni)
const DEFAULT_TARGET_KB = 180      // ciljna veličina (≈ 180 KB)
const MIN_QUALITY = 35             // donja granica kvaliteta
const MAX_QUALITY = 90             // gornja granica
const START_MAX_WIDTH = 1600       // početna max širina
const MIN_WIDTH = 640              // najmanja dozvoljena širina
const WIDTH_STEP = 0.85            // koliko smanjujemo širinu po step-u

function isAuthed() {
  const c = cookies().get('admin_session')?.value
  return !!readSession(c || '')
}

async function encodeWebp(buf: Buffer, width: number, quality: number) {
  return sharp(buf)
    .rotate() // EXIF auto-orient
    .resize({ width, withoutEnlargement: true })
    .webp({ quality })
    .toBuffer()
}

async function compressToTarget(buf: Buffer, targetKB: number, startWidth = START_MAX_WIDTH) {
  let width = startWidth
  const targetBytes = targetKB * 1024

  // petlja: pokušaj sa binarnom pretragom kvaliteta; ako je i dalje veliko, smanji širinu i ponovi
  while (width >= MIN_WIDTH) {
    let lo = MIN_QUALITY
    let hi = MAX_QUALITY
    let best: { out: Buffer; q: number } | null = null

    // probni encode na srednjem kvalitetu da vidimo da li smo blizu
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2)
      const out = await encodeWebp(buf, width, mid)

      if (!best || out.length < best.out.length) best = { out, q: mid }

      if (out.length > targetBytes) {
        // preveliko → smanji kvalitet
        hi = mid - 1
      } else {
        // dovoljno malo → probaj veći kvalitet
        lo = mid + 1
      }
    }

    // posle binarne pretrage imamo best (najmanji fajl viđen u ovoj iteraciji)
    if (best && best.out.length <= targetBytes) {
      return { buffer: best.out, width, quality: best.q }
    }

    // i dalje preveliko → smanji širinu i probaj ponovo
    width = Math.max(MIN_WIDTH, Math.floor(width * WIDTH_STEP))
  }

  // ako nismo pogodili target, vrati najagresivniji encode (min width, min quality)
  const fallback = await encodeWebp(buf, MIN_WIDTH, MIN_QUALITY)
  return { buffer: fallback, width: MIN_WIDTH, quality: MIN_QUALITY }
}

export async function POST(req: Request) {
  if (!isAuthed()) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const ct = req.headers.get('content-type') || ''
  if (!ct.includes('multipart/form-data')) {
    return NextResponse.json({ ok: false, error: 'expected_multipart' }, { status: 400 })
  }

  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ ok: false, error: 'file_missing' }, { status: 400 })
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ ok: false, error: 'not_image' }, { status: 400 })
    }

    // opcioni query param: /api/admin/upload?targetKb=120
    const url = new URL(req.url)
    const targetKB = Math.max(40, Math.min(600, Number(url.searchParams.get('targetKb')) || DEFAULT_TARGET_KB))

    const inputBuf = Buffer.from(await file.arrayBuffer())
    const metaIn = await sharp(inputBuf).metadata()

    // ako je ulaz baš mali, preskoči resize/kompresiju
    let result = await compressToTarget(inputBuf, targetKB, START_MAX_WIDTH)

    const safeName = (file.name || 'image')
      .replace(/[^\w\.\-]+/g, '_')
      .replace(/\.[^.]+$/, '')

    const key = `covers/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}.webp`

    const blob = await put(key, result.buffer, {
      access: 'public',
      contentType: 'image/webp',
      addRandomSuffix: false,
    })

    const metaOut = await sharp(result.buffer).metadata()

    return NextResponse.json({
      ok: true,
      url: blob.url,
      in: { w: metaIn.width, h: metaIn.height, bytes: file.size, type: file.type },
      out: { w: metaOut.width, h: metaOut.height, bytes: result.buffer.length, type: 'image/webp', q: result.quality },
      targetKB,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'upload_failed' }, { status: 500 })
  }
}
