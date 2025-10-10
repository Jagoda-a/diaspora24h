// lib/ai.ts

// Konfiguracija
const AI_PROVIDER = process.env.AI_PROVIDER ?? 'openai' // 'openai' | 'none'
const AI_MODEL = process.env.AI_MODEL ?? 'gpt-4o-mini'
const OPENAI_KEY = process.env.OPENAI_API_KEY
// Pismo: ARTICLE_SCRIPT=cyrl | latn  (default: cyrl)
const ARTICLE_SCRIPT = (process.env.ARTICLE_SCRIPT ?? 'cyrl').toLowerCase() === 'latn' ? 'sr-Latn' : 'sr-Cyrl'

// Tipovi
export type AiResult = { title?: string; content: string }
export type AiRewriteResult = { title: string; summary: string; content: string }

// -----------------------------
// Pomoćne funkcije (post-proc)
// -----------------------------

// Jedinstveno "cedi" beline i pravopisne sitnice
function squeezeWhitespace(s: string): string {
  return (s || '')
    .replace(/\u00A0/g, ' ')                 // nbsp -> space
    .replace(/[ \t]+\n/g, '\n')              // trim end of line
    .replace(/\n[ \t]+/g, '\n')              // trim start of line
    .replace(/[ ]{2,}/g, ' ')                // višestruke razmake
    .replace(/\s+([,.;!?])/g, '$1')          // razmak pre interpunkcije
    .replace(/([„"“])\s+/g, '$1')            // razmak posle otv. navodnika
    .replace(/\s+([”"])/g, '$1')             // razmak pre zatv. navodnika
    .trim()
}

// Deduplikuje rečenice (prosta heuristika)
function dedupeSentences(text: string): string {
  const parts = text
    .split(/([.!?]+)\s+/)
    .reduce<string[]>((acc, cur, idx, arr) => {
      if (idx % 2 === 0) {
        const punct = arr[idx + 1] || ''
        const sent = (cur + punct).trim()
        if (sent) acc.push(sent)
      }
      return acc
    }, [])

  const seen = new Set<string>()
  const out: string[] = []
  for (const s of parts) {
    const key = s.toLowerCase().replace(/\s+/g, ' ').trim()
    if (key && !seen.has(key)) {
      seen.add(key)
      out.push(s)
    }
  }
  return out.join(' ')
}

// Deduplikuje pasuse, čuva redosled
function dedupeParagraphs(text: string): string {
  const paras = (text || '')
    .split(/\n{2,}/)
    .map(p => squeezeWhitespace(p))
    .filter(Boolean)

  const seen = new Set<string>()
  const out: string[] = []
  for (const p of paras) {
    const key = p.toLowerCase().replace(/\s+/g, ' ').trim()
    if (key && !seen.has(key)) {
      seen.add(key)
      out.push(p)
    }
  }
  return out.join('\n\n')
}

function clampChars(s: string, max: number): string {
  const t = (s || '').trim()
  if (t.length <= max) return t
  return t.slice(0, max - 1).trimEnd() + '…'
}

function clampWords(s: string, minW: number, maxW: number): string {
  const words = squeezeWhitespace(s).split(/\s+/)
  const n = Math.max(minW, Math.min(maxW, words.length))
  return words.slice(0, n).join(' ')
}

function isJsonObject(str: string): boolean {
  try {
    const v = JSON.parse(str)
    return v && typeof v === 'object' && !Array.isArray(v)
  } catch { return false }
}

// Bezbedan parse + minimalna validacija
function safeParseRewrite(raw: string): AiRewriteResult | null {
  if (!isJsonObject(raw)) return null
  try {
    const j = JSON.parse(raw)
    const title = squeezeWhitespace(String(j.title || ''))
    const summary = squeezeWhitespace(String(j.summary || ''))
    const content = squeezeWhitespace(String(j.content || ''))
    if (!title || !content) return null
    return { title, summary, content }
  } catch { return null }
}

// Post-proces: finalno čišćenje + duplikati
function polishNewsCopy(copy: string): string {
  const dedup = dedupeSentences(copy)
  const paras = dedupeParagraphs(dedup)
  return squeezeWhitespace(paras)
}

// -----------------------------
// STARO (sumarizacija za UI)
// -----------------------------
export async function aiSummarize(input: {
  title: string
  plainText: string
  language?: string
}): Promise<AiResult> {
  const { title, plainText, language = 'sr' } = input

  if (AI_PROVIDER !== 'openai' || !OPENAI_KEY) {
    return fallback(plainText, title)
  }

  const sys = [
    'Ti si novinski urednik.',
    `Pišeš kratko, činjenično, na jeziku "${language}" (ekavica).`,
    `Pismo: ${ARTICLE_SCRIPT} (isključivo to pismo; ne mešaj pisma).`,
    'Neutralan ton, bez clickbaita i bez izmišljenih činjenica.',
    'Bez šablona tipa: „uticaj na dijasporu“, „naši ljudi u…“ – nemoj to da dodaješ.',
    'Bez dupliranja rečenica i pasusa.',
    'Pasuse odvajaj praznim redom. Ne spajaj ceo tekst u jedan blok.'
  ].join(' ')

  const user = [
    `NASLOV: ${title}`,
    'SIROVI TEKST:',
    plainText,
    '',
    'ZADATAK:',
    '- Napiši kratak članak 2–4 pasusa (ukupno ~120–220 reči).',
    '- Ne ponavljaj iste informacije.',
    '- Bez uvoda koji ne dodaje vrednost (idi direktno u činjenice).',
  ].join('\n')

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      temperature: 0.4,
      presence_penalty: 0.1,
      frequency_penalty: 0.3,
    }),
  })

  if (!r.ok) {
    const txt = await r.text().catch(() => '')
    console.warn('AI summarize error:', r.status, txt)
    return fallback(plainText, title)
  }

  const data = await r.json().catch(() => ({}))
  const raw = data?.choices?.[0]?.message?.content?.trim() || ''
  const content = polishNewsCopy(raw || '')
  if (!content) return fallback(plainText, title)
  return { title, content }
}

// ---------------------------------------
// NOVO: prepis + meta (bez dijaspore, realističan stil, striktno pismo)
// ---------------------------------------
export async function aiRewrite(input: {
  sourceTitle: string
  plainText: string
  language?: string
  country?: string
  sourceName?: string
}): Promise<AiRewriteResult> {
  const {
    sourceTitle,
    plainText,
    language = 'sr',
    sourceName = 'izvor',
  } = input

  if (AI_PROVIDER !== 'openai' || !OPENAI_KEY) {
    return rewriteFallback(sourceTitle, plainText)
  }

  // Sistem: urednik, srpski, striktno jedno pismo, neutralno
  const sys = [
    'Ti si novinski urednik i lektor.',
    `Pišeš novinarski, neutralno, jasno i činjenično. Srpski jezik (${language}), ekavica.`,
    `Pismo: ${ARTICLE_SCRIPT} (isključivo to pismo; ne mešaj ćirilicu i latinicu).`,
    'Bez clickbaita, bez izmišljanja, bez praznih fraza.',
    'Ne spominji „dijasporu“ i slične šablone osim ako izvor to eksplicitno navodi.',
    'Dozvoljena su lična imena/funkcije (ne zamenjuj eufemizmima).',
    'Ne ponavljaj rečenice ili pasuse.',
    'Pasuse odvajaj praznim redom. Ne spajaj ceo tekst u jedan blok.',
  ].join(' ')

  // Korisnik: striktan JSON izlaz + pravila dužine
  const user = `
IZVOR: ${sourceName}
ULAZNI NASLOV: ${sourceTitle}

TEKST (plain):
${plainText}

ZADATAK:
Vrati ISKLJUČIVO JSON sa ključevima: { "title": string, "summary": string, "content": string }

PRAVILA:
- "title": 55–85 karaktera, informativan, bez clickbaita, različit od ulaznog.
- "summary": oko 130–170 karaktera (rečenica ili dve, za meta opis).
- "content": 2–5 pasusa, ukupno ~220–600 reči; prirodan novinski stil.
- Pasuse OBAVEZNO odvoji praznim redom.
- Informacije moraju biti proverljive iz teksta iznad. Ako nešto nije sigurno: označi kao nepotvrđeno.
- Ne dodaj segmente „uticaj na dijasporu“, „posledice za dijasporu“ itd. NEMOJ dodavati takve pasuse.
- Ne kopiraj doslovno ulazni naslov ni duge fraze iz izvora (${sourceName}); preformuliši.
- Izbegavaj duge nabrajajuće rečenice; koristi kratke i jasne.
- Bez dupliranja rečenica; bez pasusa koji ponavljaju prethodni.
  `.trim()

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      temperature: 0.35,
      presence_penalty: 0.1,
      frequency_penalty: 0.4,
      response_format: { type: 'json_object' }, // tražimo striktan JSON
    }),
  })

  if (!r.ok) {
    const txt = await r.text().catch(() => '')
    console.warn('AI rewrite error:', r.status, txt)
    return rewriteFallback(sourceTitle, plainText)
  }

  const data = await r.json().catch(() => ({}))
  const raw = data?.choices?.[0]?.message?.content?.trim() || ''

  const parsed = safeParseRewrite(raw)
  if (!parsed) {
    console.warn('AI rewrite JSON parse error, raw:', raw.slice(0, 300))
    return rewriteFallback(sourceTitle, plainText)
  }

  // Post-proces: poliranje + ograničenja dužine
  const title = clampChars(parsed.title, 90)
  const summary = clampChars(parsed.summary, 180)
  const content = clampChars(polishNewsCopy(parsed.content), 12000)

  // Ako je content baš kratak (dešava se), malo ga „rastegnemo“ iz izvora
  const minWords = 200
  const words = content.split(/\s+/).filter(Boolean).length
  const finalContent =
    words < minWords
      ? polishNewsCopy(clampWords(content + '\n\n' + clampWords(plainText, 50, 200), minWords, 600))
      : content

  return { title, summary, content: finalContent }
}

// -----------------------------
// Fallback-ovi
// -----------------------------
function fallback(plainText: string, title?: string): AiResult {
  const sentences = (plainText || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[\.\!\?])\s+/)
    .slice(0, 6)
    .join(' ')
  const content = sentences || (title ? `Kratka vest: ${title}` : 'Kratka vest.')
  return { title, content: polishNewsCopy(content) }
}

function rewriteFallback(sourceTitle: string, plainText: string): AiRewriteResult {
  const base = fallback(plainText, sourceTitle).content
  const makeTitle = (t: string) =>
    clampChars((t || 'Vest').replace(/\s+/g, ' '), 85)

  const title = makeTitle(`Sažetak: ${sourceTitle}`)
  const summary = clampChars(base.replace(/\s+/g, ' '), 170)

  // Bez dijaspore u fallback-u
  const content = polishNewsCopy(
    [
      base,
      '',
      'Napomena: Podaci su sažeti iz dostupnih informacija. Ako nadležni objave nove detalje, tekst će biti dopunjen.'
    ].join('\n\n')
  )

  return { title, summary, content }
}
