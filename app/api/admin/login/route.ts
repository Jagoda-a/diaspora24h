// app/api/admin/login/route.ts
import { NextResponse } from 'next/server'
import { createSession, verifyCredentials } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}))
  if (!username || !password) {
    return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 })
  }
  const ok = await verifyCredentials(username, password)
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'invalid_credentials' }, { status: 401 })
  }

  const token = createSession(username)
  const res = NextResponse.json({ ok: true })
  res.headers.set('Set-Cookie',
    `admin_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`
  )
  return res
}
