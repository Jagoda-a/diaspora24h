// app/api/admin/logout/route.ts
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.headers.set('Set-Cookie', `admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`)
  return res
}
