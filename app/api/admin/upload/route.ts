// app/api/admin/upload/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readSession } from '@/lib/auth'
import { put } from '@vercel/blob'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAuthed() {
  const c = cookies().get('admin_session')?.value
  return !!readSession(c || '')
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
    if (!file) {
      return NextResponse.json({ ok: false, error: 'file_missing' }, { status: 400 })
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ ok: false, error: 'not_image' }, { status: 400 })
    }

    const key = `covers/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`

    const blob = await put(key, file.stream(), {
      access: 'public',
      contentType: file.type,
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    return NextResponse.json({ ok: true, url: blob.url })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'upload_failed' }, { status: 500 })
  }
}
