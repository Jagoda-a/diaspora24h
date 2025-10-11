// lib/ai.ts

// Konfiguracija
const AI_PROVIDER = process.env.AI_PROVIDER ?? 'openai' // 'openai' | 'none'
const AI_MODEL = process.env.AI_MODEL ?? 'gpt-4o-mini'
const OPENAI_KEY = process.env.OPENAI_API_KEY

// UVEK LATINICA
const TARGET_SCRIPT: 'sr-Latn' = 'sr-Latn'

// Prag minimalne dužine za “potpune” vesti
const MIN_CONTENT_CHARS = 500

// Tipovi
export type AiResult = { title?: string; content: string }
export type AiRewriteResult = { title: string; summary: string; content: string }

// -----------------------------
// Pomoćne funkcije (post-proc)
// -----------------------------

function squeezeWhitespace(s: string): string {
  return (s || '')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/([„"“])\s+/g, '$1')
    .replace(/\s+([”"])/g, '$1')
    .trim()
}

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
    if (key && !seen.has(key)) { seen.add(key); out.push(s) }
  }
  return out.join(' ')
}

function dedupeParagraphs(text: string): string {
  const paras = (text || '')
    .split(/\n{2,}/)
    .map(p => squeezeWhitespace(p))
    .filter(Boolean)
  const seen = new Set<string>()
  const out: string[] = []
  for (const p of paras) {
    const key = p.toLowerCase().replace(/\s+/g, ' ').trim()
    if (key && !seen.has(key)) { seen.add(key); out.push(p) }
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

function polishNewsCopy(copy: string): string {
  const dedup = dedupeSentences(copy)
  const paras = dedupeParagraphs(dedup)
  return squeezeWhitespace(paras)
}

// -----------------------------
// Robusno: ćirilica → latinica
// -----------------------------

// Potpuni srpski mapping (uklj. digrafi)
const CYR_LAT_PAIRS: Array<[RegExp, string]> = [
  // Dž / dž (pre Lj/Nj da se ne preklapa)
  [/(Џ)([а-яёђћчџш])/g, 'Dž$2'],
  [/(ДЖ)([А-ЯЁЂЋЧЏШ])/g, 'DŽ$2'],
  [/(џ)/g, 'dž'], [/(Џ)/g, 'Dž'],

  // Lj / Nj
  [/(Љ)([а-яёђћчџш])/g, 'Lj$2'],
  [/(Љ)/g, 'Lj'],
  [/(љ)/g, 'lj'],
  [/(Њ)([а-яёђћчџш])/g, 'Nj$2'],
  [/(Њ)/g, 'Nj'],
  [/(њ)/g, 'nj'],

  // Osnovna slova
  [/(А)/g, 'A'],  [/(а)/g, 'a'],
  [/(Б)/g, 'B'],  [/(б)/g, 'b'],
  [/(В)/g, 'V'],  [/(в)/g, 'v'],
  [/(Г)/g, 'G'],  [/(г)/g, 'g'],
  [/(Д)/g, 'D'],  [/(д)/g, 'd'],
  [/(Ђ)/g, 'Đ'],  [/(ђ)/g, 'đ'],
  [/(Е)/g, 'E'],  [/(е)/g, 'e'],
  [/(Ж)/g, 'Ž'],  [/(ж)/g, 'ž'],
  [/(З)/g, 'Z'],  [/(з)/g, 'z'],
  [/(И)/g, 'I'],  [/(и)/g, 'i'],
  [/(Ј)/g, 'J'],  [/(ј)/g, 'j'],
  [/(К)/g, 'K'],  [/(к)/g, 'k'],
  [/(Л)/g, 'L'],  [/(л)/g, 'l'],
  [/(М)/g, 'M'],  [/(м)/g, 'm'],
  [/(Н)/g, 'N'],  [/(н)/g, 'n'],
  [/(О)/g, 'O'],  [/(о)/g, 'o'],
  [/(П)/g, 'P'],  [/(п)/g, 'p'],
  [/(Р)/g, 'R'],  [/(р)/g, 'r'],
  [/(С)/g, 'S'],  [/(с)/g, 's'],
  [/(Т)/g, 'T'],  [/(т)/g, 't'],
  [/(Ћ)/g, 'Ć'],  [/(ћ)/g, 'ć'],
  [/(У)/g, 'U'],  [/(у)/g, 'u'],
  [/(Ф)/g, 'F'],  [/(ф)/g, 'f'],
  [/(Х)/g, 'H'],  [/(х)/g, 'h'],
  [/(Ц)/g, 'C'],  [/(ц)/g, 'c'],
  [/(Ч)/g, 'Č'],  [/(ч)/g, 'č'],
  // џ/Џ već iznad
  [/(Ш)/g, 'Š'],  [/(ш)/g, 'š'],

  // Van-srpska ćirilica (često upadne iz copy/paste) — aproksimacije:
  [/(Й)/g, 'J'],  [/(й)/g, 'j'],
  [/(Ы)/g, 'Y'],  [/(ы)/g, 'y'],
  [/(Э)/g, 'E'],  [/(э)/g, 'e'],
  [/(Ё)/g, 'Jo'], [/(ё)/g, 'jo'],
  [/(Ю)/g, 'Ju'], [/(ю)/g, 'ju'],
  [/(Я)/g, 'Ja'], [/(я)/g, 'ja'],
  [/(Ї)/g, 'Ji'], [/(ї)/g, 'ji'],
  [/(І)/g, 'I'],  [/(і)/g, 'i'],
]

// Dodatno: homoglifovi (retko ali desi se)
const CYR_HOMO_TO_LAT: Record<string,string> = {
  'Ӏ':'I', '№':'No',
}

function forceLatin(s: string): string {
  if (!s) return s
  if (!/[\u0400-\u04FF]/.test(s)) return s
  let out = s
  for (const [rx, rep] of CYR_LAT_PAIRS) out = out.replace(rx, rep)
  out = out.replace(/[\u0400-\u04FF]/g, ch => CYR_HOMO_TO_LAT[ch] ?? ch)
  return out
}

function polishAndLatin(s: string): string {
  return forceLatin(polishNewsCopy(s))
}

// -----------------------------
// Anti-dupe helpers
// -----------------------------

const RS_STOPWORDS = new Set([
  'je','u','na','i','da','se','su','za','od','do','po','o','kod','sa','bez','ali','dok','jer','kao',
  'kroz','pre','posle','bi','će','ne','nije','jesu','ili','te','ta','to','ti','odnosno','među','više',
  'manje','protiv','zbog','oko','s','uz','preko'
])

function normalizeForKey(s: string) {
  return forceLatin(String(s || ''))
    .toLowerCase()
    .replace(/[“”"„]/g, '')
    .replace(/[\(\)\[\]\{\}]/g, ' ')
    .replace(/[^a-z0-9čćšđž\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Napravi stabilan ključ teme iz naslova+teksta (koristi se za deduplikaciju u ingest-u)
export function makeTopicKey(title?: string, body?: string) {
  const tokens = (normalizeForKey((title || '') + ' ' + (body || '')))
    .split(' ')
    .filter(w => w && !RS_STOPWORDS.has(w) && w.length > 2)
  const uniq = Array.from(new Set(tokens)).sort()
  return uniq.slice(0, 12).join(' ')
}

// Jednostavna provera dužine sadržaja (karakteri, ne reči)
export function isLongEnough(s?: string | null) {
  return (String(s || '').replace(/\s+/g, ' ').trim().length) >= MIN_CONTENT_CHARS
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

  // Normalizuj ulaz (da i model radi nad latinicom)
  const srcTitle = forceLatin(title)
  const srcPlain = forceLatin(plainText)

  if (AI_PROVIDER !== 'openai' || !OPENAI_KEY) {
    const fb = fallback(srcPlain, srcTitle)
    return { title: fb.title, content: polishAndLatin(fb.content) }
  }

  const sys = [
    'Ti si novinski urednik.',
    `Pišeš kratko, činjenično, na jeziku "${language}" (ekavica).`,
    `Pismo: ${TARGET_SCRIPT} (isključivo latinica; ne mešaj pisma).`,
    'Neutralan ton, bez clickbaita i bez izmišljenih činjenica.',
    'Bez šablona tipa: „uticaj na dijasporu“, „naši ljudi u…“ – nemoj to da dodaješ.',
    'Bez dupliranja rečenica i pasusa.',
    'Pasuse odvajaj praznim redom. Ne spajaj ceo tekst u jedan blok.'
  ].join(' ')

  const user = [
    `NASLOV: ${srcTitle}`,
    'SIROVI TEKST:',
    srcPlain,
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
    const fb = fallback(srcPlain, srcTitle)
    return { title: fb.title, content: polishAndLatin(fb.content) }
  }

  const data = await r.json().catch(() => ({}))
  const raw = data?.choices?.[0]?.message?.content?.trim() || ''
  const fixed = polishAndLatin(raw || '')
  if (!fixed) {
    const fb = fallback(srcPlain, srcTitle)
    return { title: fb.title, content: polishAndLatin(fb.content) }
  }
  return { title: srcTitle, content: fixed }
}

// ---------------------------------------
// NOVO: prepis + meta (strogo LATINICA)
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

  // Normalizuj ulaz pre slanja modelu
  const srcTitle = forceLatin(sourceTitle)
  const srcPlain = forceLatin(plainText)

  if (AI_PROVIDER !== 'openai' || !OPENAI_KEY) {
    const fb = rewriteFallback(srcTitle, srcPlain)
    return {
      title: polishAndLatin(fb.title),
      summary: polishAndLatin(fb.summary),
      content: polishAndLatin(fb.content),
    }
  }

  const sys = [
    'Ti si novinski urednik i lektor.',
    `Pišeš novinarski, neutralno, jasno i činjenično. Srpski jezik (${language}), ekavica.`,
    `Pismo: ${TARGET_SCRIPT} (isključivo latinica; ne mešaj ćirilicu i latinicu).`,
    'Bez clickbaita, bez izmišljanja, bez praznih fraza.',
    'Ne spominji „dijasporu“ osim ako izvor to eksplicitno navodi.',
    'Dozvoljena su lična imena/funkcije.',
    'Ne ponavljaj rečenice/pasuse; pasuse odvajaj praznim redom.',
  ].join(' ')

  const user = `
IZVOR: ${sourceName}
ULAZNI NASLOV: ${srcTitle}

TEKST (plain):
${srcPlain}

ZADATAK:
Vrati ISKLJUČIVO JSON sa ključevima: { "title": string, "summary": string, "content": string }

PRAVILA:
- "title": 55–85 karaktera, informativan, drugačiji od ulaznog (bez clickbaita).
- "summary": ~130–170 karaktera (1–2 rečenice).
- "content": 3–6 pasusa, ukupno ~220–600 reči, prirodan novinski stil.
- Pasuse OBAVEZNO odvoji praznim redom.
- Ne kopiraj fraze iz izvora; menjaj redosled informacija, sintaksu i vokabular.
- Ukloni robotske šablone i izbegni tri tačke "..." kao popunu.
- Ako nešto nije potvrđeno u izvoru, označi kao nepotvrđeno ili izostavi.
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
      response_format: { type: 'json_object' },
    }),
  })

  if (!r.ok) {
    const txt = await r.text().catch(() => '')
    console.warn('AI rewrite error:', r.status, txt)
    const fb = rewriteFallback(srcTitle, srcPlain)
    return {
      title: polishAndLatin(fb.title),
      summary: polishAndLatin(fb.summary),
      content: polishAndLatin(fb.content),
    }
  }

  const data = await r.json().catch(() => ({}))
  const raw = data?.choices?.[0]?.message?.content?.trim() || ''
  const parsed = safeParseRewrite(raw)
  if (!parsed) {
    console.warn('AI rewrite JSON parse error, raw:', raw.slice(0, 300))
    const fb = rewriteFallback(srcTitle, srcPlain)
    return {
      title: polishAndLatin(fb.title),
      summary: polishAndLatin(fb.summary),
      content: polishAndLatin(fb.content),
    }
  }

  // Post-proces
  let title = clampChars(parsed.title, 90)
  let summary = clampChars(parsed.summary, 180)
  let content = clampChars(polishNewsCopy(parsed.content), 12000)

  // Ako je i dalje prekratko, pokušaj jednom da proširiš sadržaj
  if (!isLongEnough(content)) {
    try {
      const expandPrompt = `
Prepravi i PROŠIRI sledeći tekst vesti na srpskom (latinica), novinarski i prirodno.
Minimum ${MIN_CONTENT_CHARS} karaktera glavnog teksta. Ne uvoditi izmišljene činjenice.

NASLOV: ${title}
SAŽETAK: ${summary}
TEKST:
${content}

ULAZNI TEKST ZA KONTEXT:
${srcPlain}

Vrati SAMO JSON: { "title": string, "summary": string, "content": string }
`.trim()

      const rr = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            { role: 'system', content: sys },
            { role: 'user', content: expandPrompt },
          ],
          temperature: 0.35,
          presence_penalty: 0.1,
          frequency_penalty: 0.4,
          response_format: { type: 'json_object' },
        }),
      })

      if (rr.ok) {
        const dj = await rr.json().catch(() => ({}))
        const raw2 = dj?.choices?.[0]?.message?.content?.trim() || ''
        const p2 = safeParseRewrite(raw2)
        if (p2?.content) {
          title = clampChars(p2.title || title, 90)
          summary = clampChars(p2.summary || summary, 180)
          content = clampChars(polishNewsCopy(p2.content), 12000)
        }
      }
    } catch {}
  }

  // FINAL: garantuj latinicu i vrati
  return {
    title: forceLatin(title),
    summary: forceLatin(summary),
    content: forceLatin(content),
  }
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
  return { title, content: polishAndLatin(content) }
}

function rewriteFallback(sourceTitle: string, plainText: string): AiRewriteResult {
  const base = fallback(plainText, sourceTitle).content
  const makeTitle = (t: string) => clampChars((t || 'Vest').replace(/\s+/g, ' '), 85)
  const title = makeTitle(`Sažetak: ${sourceTitle}`)
  const summary = clampChars(base.replace(/\s+/g, ' '), 170)
  const content = polishAndLatin(
    [base, '', 'Napomena: Tekst je sažet iz dostupnih informacija; biće dopunjen po potrebi.'].join('\n\n')
  )
  return { title, summary, content }
}
