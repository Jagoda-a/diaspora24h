// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Dozvoli login/logout rute bez sesije
  if (
    pathname.startsWith('/admin/login') ||
    pathname.startsWith('/api/admin/login') ||
    pathname.startsWith('/api/admin/logout')
  ) {
    return NextResponse.next()
  }

  // Štiti UI za /admin — pusti dalje ako KOLAČIĆ POSTOJI
  if (pathname === '/admin') {
    const has = !!req.cookies.get('admin_session')?.value
    if (!has) {
      const url = req.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin/login', '/api/admin/:path*'],
}
