// lib/auth.ts
import crypto from 'crypto'

type SessionPayload = { u: string; exp: number }

function b64url(input: Buffer | string) {
  const base = (input instanceof Buffer ? input : Buffer.from(input))
    .toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  return base
}
function b64urlDecode(s: string) {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = s.length % 4 === 2 ? '==' : s.length % 4 === 3 ? '=' : ''
  return Buffer.from(s + pad, 'base64').toString('utf8')
}

function sign(data: string, secret: string) {
  return b64url(crypto.createHmac('sha256', secret).update(data).digest())
}

export function createSession(username: string, maxAgeSec = 60 * 60 * 24 * 7) {
  const secret = process.env.AUTH_SECRET || ''
  if (!secret) throw new Error('AUTH_SECRET missing')
  const payload: SessionPayload = { u: username, exp: Math.floor(Date.now() / 1000) + maxAgeSec }
  const body = b64url(JSON.stringify(payload))
  const sig = sign(body, secret)
  return `${body}.${sig}`
}

export function readSession(cookieVal?: string | null): SessionPayload | null {
  try {
    if (!cookieVal) return null
    const [body, sig] = cookieVal.split('.')
    if (!body || !sig) return null
    const secret = process.env.AUTH_SECRET || ''
    if (!secret) return null
    const good = sign(body, secret)
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null
    const payload = JSON.parse(b64urlDecode(body)) as SessionPayload
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export async function verifyCredentials(username: string, password: string) {
  const u = process.env.ADMIN_USER || 'admin'
  const passHash = process.env.ADMIN_PASS_HASH
  const passPlain = process.env.ADMIN_PASS

  if (username !== u) return false

  if (passHash) {
    const { compare } = await import('bcryptjs')
    return await compare(password, passHash)
  }
  if (!passPlain) return false
  return crypto.timingSafeEqual(Buffer.from(password), Buffer.from(passPlain))
}
