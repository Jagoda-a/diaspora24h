// lib/i18n.ts
import { cookies } from 'next/headers'

export type Lang = 'sr' | 'en' | 'de'

export function getLangFromCookie(): Lang {
  const c = cookies().get('lang')?.value as Lang | undefined
  return c === 'en' || c === 'de' ? c : 'sr'
}

export function pickTranslated<T extends { translationsJson?: string | null; title: string; summary?: string | null; content?: string | null }>(a: T, lang: Lang) {
  if (lang === 'sr') return { title: a.title, summary: a.summary || '', content: a.content || a.summary || '' }
  try {
    const obj = a.translationsJson ? JSON.parse(a.translationsJson) : {}
    const t = obj?.[lang]
    if (t) {
      return {
        title: t.title || a.title,
        summary: t.summary || a.summary || '',
        content: t.content || t.summary || a.content || a.summary || ''
      }
    }
  } catch {}
  return { title: a.title, summary: a.summary || '', content: a.content || a.summary || '' }
}
