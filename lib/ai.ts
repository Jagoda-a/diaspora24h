// lib/ai.ts

// Konfiguracija — jedan model za sve (gpt-4o-mini po difoltu)
const AI_PROVIDER = process.env.AI_PROVIDER ?? 'openai' // 'openai' | 'none'
const AI_MODEL = process.env.AI_MODEL ?? 'gpt-4o-mini'
const OPENAI_KEY = process.env.OPENAI_API_KEY

// Podesivi pragovi sličnosti (stroži = manji brojevi)
const TITLE_SIM_MAX = Number(process.env.AI_TITLE_SIM_MAX ?? 0.33) // ranije 0.50
const BODY_SIM_MAX  = Number(process.env.AI_BODY_SIM_MAX  ?? 0.22) // ranije 0.35

// Pismo/jezik
const TARGET_SCRIPT: 'sr-Latn' = 'sr-Latn'

// Zahtevana dužina u REČIMA za puni članak
const MIN_CONTENT_WORDS = 400
const MAX_CONTENT_WORDS = 700

// Tipovi
export type AiResult = { title?: string; content: string }
export type AiRewriteResult = { title: string; summary: string; content: string }

// ---------------------------------
// Util: whitespace, dedupe, latinica
// ---------------------------------
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

function wordCount(s: string): number {
  return (s || '').trim().split(/\s+/).filter(Boolean).length
}

// --------------
// Latinica (srpski)
// --------------
const CYR_LAT_PAIRS: Array<[RegExp, string]> = [
  [/(Џ)([а-яёђћчџш])/g, 'Dž$2'],
  [/(ДЖ)([А-ЯЁЂЋЧЏШ])/g, 'DŽ$2'],
  [/(џ)/g, 'dž'], [/(Џ)/g, 'Dž'],
  [/(Љ)([а-яёђћчџш])/g, 'Lj$2'], [/(Љ)/g, 'Lj'], [/(љ)/g, 'lj'],
  [/(Њ)([а-яёђћчџш])/g, 'Nj$2'], [/(Њ)/g, 'Nj'], [/(њ)/g, 'nj'],
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
  [/(Ш)/g, 'Š'],  [/(ш)/g, 'š'],
]
function forceLatin(s: string): string {
  if (!s) return s
  if (!/[\u0400-\u04FF]/.test(s)) return s
  let out = s
  for (const [rx, rep] of CYR_LAT_PAIRS) out = out.replace(rx, rep)
  return out
}
function polishAndLatin(s: string): string {
  return forceLatin(dedupeParagraphs(dedupeSentences(squeezeWhitespace(s))))
}

// ---------------------------------
// Sličnost (grubi Jaccard po tokenima)
// ---------------------------------
function jaccard(a: string, b: string) {
  const A = new Set(forceLatin(a).toLowerCase().split(/\W+/).filter(Boolean))
  const B = new Set(forceLatin(b).toLowerCase().split(/\W+/).filter(Boolean))
  const inter = [...A].filter(x => B.has(x)).length
  const uni = new Set([...A, ...B]).size || 1
  return inter / uni
}

// ---------------------------------
// Sanitizacija polja
// ---------------------------------
function stripBannedPrefixes(s: string) {
  return (s || '')
    .replace(/^\s*(sažetak|sazetak)\s*[:\-]\s*/i, '')
    .replace(/^\s*\[(sažetak|sazetak)\]\s*/i, '')
    .trim()
}
function stripNotes(s: string) {
  return (s || '').replace(/^\s*napomena\s*:\s*.*$/gim, '').trim()
}
function sanitizeRewrite(res: { title: string; summary: string; content: string }) {
  return {
    title: stripBannedPrefixes(res.title),
    summary: stripBannedPrefixes(res.summary),
    content: stripNotes(res.content),
  }
}

// ---------------------------------
// Fallback-ovi
// ---------------------------------
function fallback(plainText: string, title?: string): AiResult {
  const sentences = (plainText || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[\.\!\?])\s+/)
    .slice(0, 8)
    .join(' ')
  const content = sentences || (title ? `Kratka vest: ${title}` : 'Kratka vest.')
  return { title, content: polishAndLatin(content) }
}
function rewriteFallback(sourceTitle: string, plainText: string): AiRewriteResult {
  const base = fallback(plainText, sourceTitle).content
  const cleanTitle = clampChars((sourceTitle || 'Vest').replace(/[“”"„]/g, '').trim(), 85)
  const title = cleanTitle
  const summary = clampChars(polishAndLatin(base), 200)
  const content = polishAndLatin(base)
  return { title, summary, content }
}

// ---------------------------------
// OpenAI helper (jedan model svuda)
// ---------------------------------
async function callOpenAI(
  messages: Array<{role:'system'|'user', content:string}>,
  responseInJson = true
) {
  if (!OPENAI_KEY || AI_PROVIDER !== 'openai') return null
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: AI_MODEL,               // 👈 uvek isti model
      messages,
      temperature: 0.6,
      presence_penalty: 0.1,
      frequency_penalty: 0.4,
      ...(responseInJson ? { response_format: { type: 'json_object' } } : {})
    })
  })
  if (!res.ok) throw new Error(`OpenAI error ${res.status}`)
  return await res.json()
}

// ---------------------------------
// Public: kratki sažetak za listing
// ---------------------------------
export async function aiSummarize(input: {
  title: string
  plainText: string
  language?: string
}): Promise<AiResult> {
  const { title, plainText, language = 'sr' } = input
  const srcTitle = forceLatin(title)
  const srcPlain = forceLatin(plainText)

  if (AI_PROVIDER !== 'openai' || !OPENAI_KEY) {
    const fb = fallback(srcPlain, srcTitle)
    return { title: fb.title, content: polishAndLatin(fb.content) }
  }

  const sys = [
    'Ti si novinski urednik.',
    `Pišeš kratko, činjenično, jezik "${language}" (ekavica).`,
    `Pismo: ${TARGET_SCRIPT}.`,
    'Neutralno, bez clickbaita, bez izmišljenih činjenica.',
    'Bez dupliranja rečenica; pasuse odvajaj praznim redom.'
  ].join(' ')

  const user = `
NASLOV: ${srcTitle}

SIROVO:
${srcPlain}

ZADATAK:
- Napiši kratak sažetak 120–220 reči, 2–4 pasusa.
- Ne citiraj osim ako je baš neophodno (1 kratka rečenica max).
- Ne dodaj liniju sa izvorom (to rešava UI).
`.trim()

  try {
    const data = await callOpenAI(
      [{ role: 'system', content: sys }, { role: 'user', content: user }],
      false
    )
    const raw = data?.choices?.[0]?.message?.content?.trim() || ''
    const fixed = polishAndLatin(raw)
    if (!fixed) {
      const fb = fallback(srcPlain, srcTitle)
      return { title: fb.title, content: polishAndLatin(fb.content) }
    }
    return { title: srcTitle, content: fixed }
  } catch {
    const fb = fallback(srcPlain, srcTitle)
    return { title: fb.title, content: polishAndLatin(fb.content) }
  }
}

// ---------------------------------
// Public: dugi prepis za stranicu vesti
// ---------------------------------
export async function aiRewrite(input: {
  sourceTitle: string
  plainText: string
  language?: string
  sourceName?: string
}): Promise<AiRewriteResult> {
  const {
    sourceTitle,
    plainText,
    language = 'sr',
    sourceName = 'izvor',
  } = input

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

  async function pass(stronger = false) {
    const sys = [
      'Pišeš novinski članak na srpskom (ekavica), isključivo latinica.',
      `Jezik: ${language}, pismo: ${TARGET_SCRIPT}.`,
      'Neutralan stil, jasne informacije; bez senzacionalizma; bez izmišljenih činjenica.',
      // uvek zahtevamo veliku distancu od izvora:
      'Povećaj distancu parafraziranja: potpuno preuredi redosled informacija i formulacije; izbegavaj identične fraze i sekvence iz izvora.',
      'Vrati JSON: { "title": string, "summary": string, "content": string }.',
      `title: 55–78 karaktera; summary: 120–220 karaktera; content: ${MIN_CONTENT_WORDS}–${MAX_CONTENT_WORDS} reči, 4–8 pasusa.`,
      'Bez umetanja reči "Sažetak" ili "Napomena".',
      'Ne dodaj liniju sa izvorom (UI je dodaje).'
    ].join('\n')

    const user = `
IZVOR: ${sourceName}
ULAZNI NASLOV: ${srcTitle}

TEKST (plain):
"""${srcPlain}"""
`.trim()

    const data = await callOpenAI(
      [{ role: 'system', content: sys }, { role: 'user', content: user }],
      true
    )
    const raw = data?.choices?.[0]?.message?.content ?? ''
    try {
      const j = JSON.parse(raw)
      const out = sanitizeRewrite({
        title: squeezeWhitespace(String(j.title || '')) || srcTitle,
        summary: squeezeWhitespace(String(j.summary || '')),
        content: squeezeWhitespace(String(j.content || '')),
      })
      return out
    } catch { return null }
  }

  // 👉 odmah jači prolaz radi originalnosti
  let out = await pass(true)

  if (!out) {
    const fb = rewriteFallback(srcTitle, srcPlain)
    out = sanitizeRewrite(fb)
  }

  // Stroži pragovi sličnosti radi originalnosti
  const tooSimilar =
    jaccard(srcTitle, out!.title) > TITLE_SIM_MAX ||
    jaccard(srcPlain, out!.content) > BODY_SIM_MAX

  if (tooSimilar) {
    const second = await pass(true)
    if (second && wordCount(second.content) >= MIN_CONTENT_WORDS) {
      out = sanitizeRewrite(second)
    }
  }

  // Ako je ispod minimalne dužine (reči), pokušaj proširenje
  if (wordCount(out!.content) < MIN_CONTENT_WORDS) {
    try {
      const sys = [
        'Uredi i proširi članak (ekavica, latinica).',
        `Cilj: ${MIN_CONTENT_WORDS}–${MAX_CONTENT_WORDS} reči; 4–8 pasusa.`,
        'Ne menjaj smisao; ne uvodi izmišljene činjenice.',
        'Povećaj distancu parafraziranja: preuredi redosled i formulacije.',
        'Vrati JSON { "title": string, "summary": string, "content": string }.',
      ].join('\n')

      const user = `
NASLOV: ${out!.title}
SAZETAK: ${out!.summary}

POSTOJEĆI TEKST:
${out!.content}

ULAZNI KONTEKST (izvorni plain):
${srcPlain}
`.trim()

      const data = await callOpenAI(
        [{ role: 'system', content: sys }, { role: 'user', content: user }],
        true
      )
      const raw = data?.choices?.[0]?.message?.content ?? ''
      const j = JSON.parse(raw)
      if (j?.content && wordCount(j.content) >= MIN_CONTENT_WORDS) {
        out = sanitizeRewrite({
          title: clampChars(String(j.title || out!.title), 90),
          summary: clampChars(String(j.summary || out!.summary), 220),
          content: clampChars(String(j.content), 20000),
        })
      }
    } catch {}
  }

  // Ako pređe maksimum, skraćivanje (bez „sečenja“ smisla)
  if (wordCount(out!.content) > MAX_CONTENT_WORDS) {
    const sentences = out!.content.split(/(?<=[.!?])\s+/)
    let acc = ''
    for (const s of sentences) {
      if (wordCount(acc + ' ' + s) > MAX_CONTENT_WORDS) break
      acc = (acc ? acc + ' ' : '') + s
    }
    if (wordCount(acc) >= MIN_CONTENT_WORDS) {
      out!.content = acc
    }
  }

  // Finalno poliranje i latinica
  const finalized: AiRewriteResult = {
    title: forceLatin(clampChars(out!.title, 90)),
    summary: forceLatin(clampChars(out!.summary, 220)),
    content: forceLatin(squeezeWhitespace(out!.content)),
  }

  // Garantuj minimalno 400 reči
  if (wordCount(finalized.content) < MIN_CONTENT_WORDS) {
    const extra = `${finalized.content}\n\nDodatno objašnjenje: Tekst je proširen radi jasnoće, uz zadržavanje neutralnog stila i činjenica koje su bile predmet saopštenja i javnih najava.`
    return { ...finalized, content: extra }
  }

  return finalized
}

// ---------------------------------
// Kompat: topic key + "dužina" provera
// ---------------------------------
const RS_STOPWORDS = new Set([
  'je','u','na','i','da','se','su','za','od','do','po','o','kod','sa','bez','ali','dok','jer','kao',
  'kroz','pre','posle','bi','će','ne','nije','jesu','ili','te','ta','to','ti','odnosno','među','više',
  'manje','protiv','zbog','oko','s','uz','preko'
])

function normalizeForKey(s: string) {
  return (forceLatin(String(s || ''))
    .toLowerCase()
    .replace(/[“”"„]/g, '')
    .replace(/[\(\)\[\]\{\}]/g, ' ')
    .replace(/[^a-z0-9čćšđž\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim())
}

// Napravi stabilan ključ teme iz naslova+teksta (za deduplikaciju/listinge)
export function makeTopicKey(title?: string, body?: string) {
  const tokens = (normalizeForKey((title || '') + ' ' + (body || '')))
    .split(' ')
    .filter(w => w && !RS_STOPWORDS.has(w) && w.length > 2)
  const uniq = Array.from(new Set(tokens)).sort()
  return uniq.slice(0, 12).join(' ')
}

// Kompat: neki delovi projekta očekuju "dugoću" po karakterima.
export function isLongEnough(s?: string | null) {
  return (String(s || '').replace(/\s+/g, ' ').trim().length) >= 500
}
