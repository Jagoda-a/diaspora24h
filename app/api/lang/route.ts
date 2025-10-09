// app/api/lang/route.ts
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { lang } = await req.json().catch(() => ({}))
  if (!['sr','en','de'].includes(lang)) {
    return NextResponse.json({ ok:false, error:'invalid_lang' }, { status:400 })
  }
  const res = NextResponse.json({ ok:true })
  res.cookies.set('lang', lang, { httpOnly: false, sameSite: 'lax', path: '/', maxAge: 60*60*24*365 })
  return res
}
