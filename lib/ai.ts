// lib/ai.ts

const AI_PROVIDER = process.env.AI_PROVIDER ?? 'openai' // 'openai' | 'none'
const AI_MODEL = process.env.AI_MODEL ?? 'gpt-4o-mini'

type AiResult = { title?: string; content: string }
type AiRewriteResult = { title: string; summary: string; content: string }

// ---------------------------------------
// STARO (ostavljamo ako ti treba negde u UI)
// ---------------------------------------
export async function aiSummarize(input: {
  title: string
  plainText: string
  language?: string
}): Promise<AiResult> {
  const { title, plainText, language = 'sr' } = input

  if (AI_PROVIDER === 'openai' && process.env.OPENAI_API_KEY) {
    const sys =
      `Ti si novinski urednik. Napiši kratak članak na jeziku "${language}" ` +
      `(3–6 pasusa, 120–300 reči), neutralnog tona, bez clickbaita. Ne izmišljaj činjenice.`
    const user =
      `Naslov: ${title}\n\nSirovi tekst/izvodi:\n${plainText}\n\n` +
      `Napiši sažeti članak sa podnaslovima gde ima smisla.`

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: user },
        ],
        temperature: 0.7,
      }),
    })
    if (!r.ok) {
      const txt = await r.text().catch(() => '')
      console.warn('AI summarize error:', r.status, txt)
      return fallback(plainText, title)
    }
    const data = await r.json()
    const content = data?.choices?.[0]?.message?.content?.trim() || ''
    if (!content) return fallback(plainText, title)
    return { title, content }
  }

  return fallback(plainText, title)
}

// ---------------------------------------
// NOVO: prepis sa unikatnim naslovom + meta summary + dodat kontekst
// ---------------------------------------
export async function aiRewrite(input: {
  sourceTitle: string
  plainText: string
  language?: string
  country?: string       // npr. 'de', 'at', 'ch' ili 'rs'
  sourceName?: string    // npr. 'Blic', 'Kurir'...
}): Promise<AiRewriteResult> {
  const {
    sourceTitle,
    plainText,
    language = 'sr',
    country = 'rs',
    sourceName = 'izvor',
  } = input

  if (AI_PROVIDER === 'openai' && process.env.OPENAI_API_KEY) {
    const sys =
      `Ti si urednik portala Diaspora24h. Tvoj zadatak je da kreiraš ORIGINALNE novinske tekstove ` +
      `na jeziku "${language}", bez plagiranja (izbegni nizove od 8+ istih uzastopnih reči), ` +
      `bez clickbaita, tačno i jasno. Uvek dodaj makar jedan pasus sa kontekstom i posledicama ` +
      `za dijasporu (Srbe u inostranstvu).`
    const user =
      `Ulazni naslov: ${sourceTitle}\n` +
      `Sirovi tekst/izvodi (plain):\n${plainText}\n\n` +
      `Napiši odgovor isključivo kao JSON sa poljima: { "title": string, "summary": string, "content": string }.\n` +
      `Pravila:\n` +
      `- "title": 55–70 karaktera, informativan, bez clickbaita, različit od ulaznog naslova.\n` +
      `- "summary": 130–160 karaktera (meta opis) koji sažima ključ.\n` +
      `- "content": 300–600 reči, podeljen u pasuse; koristi podnaslove sa "### " gde ima smisla.\n` +
      `- U "content" obavezno uključi jedan pasus koji objašnjava kontekst i posledice za dijasporu (npr. za Srbe u ${country.toUpperCase()}).\n` +
      `- Ne uvoditi nepostojeće činjenice; ako nešto nije sigurno, označi kao nepotvrđeno.\n` +
      `- Ne citiraj doslovno izvor (${sourceName}); preformuliši.\n` +
      `- Izbegni duge nabrajajuće rečenice; koristi kratke i jasne.\n`

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: user },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    })

    if (!r.ok) {
      const txt = await r.text().catch(() => '')
      console.warn('AI rewrite error:', r.status, txt)
      return rewriteFallback(sourceTitle, plainText)
    }

    const data = await r.json()
    const raw = data?.choices?.[0]?.message?.content?.trim() || ''
    try {
      const parsed = JSON.parse(raw) as AiRewriteResult
      const title = (parsed.title || '').trim()
      const summary = (parsed.summary || '').trim()
      const content = (parsed.content || '').trim()
      if (!title || !summary || !content) throw new Error('bad json')
      return { title, summary, content }
    } catch (e) {
      console.warn('AI rewrite JSON parse error:', e)
      return rewriteFallback(sourceTitle, plainText)
    }
  }

  return rewriteFallback(sourceTitle, plainText)
}

// ---------------------------------------
// Fallback-ovi
// ---------------------------------------
function fallback(plainText: string, title?: string): AiResult {
  const sentences = plainText
    .replace(/\s+/g, ' ')
    .split(/(?<=[\.\!\?])\s+/)
    .slice(0, 6)
    .join(' ')
  const content = sentences || (title ? `Kratka vest: ${title}` : 'Kratka vest.')
  return { title, content }
}

function rewriteFallback(sourceTitle: string, plainText: string): AiRewriteResult {
  const base = fallback(plainText, sourceTitle).content
  const makeTitle = (t: string) =>
    (t || 'Vest').replace(/\s+/g, ' ').slice(0, 68) + (t.length > 68 ? '…' : '')
  const title = makeTitle(`Sažetak: ${sourceTitle}`)
  const summary = (base.replace(/\s+/g, ' ').slice(0, 155) + '…')
  const content =
    `### Sažetak\n${base}\n\n` +
    `### Šta znači za dijasporu\n` +
    `Za čitaoce u inostranstvu: moguć je uticaj na svakodnevne obaveze, administrativne procedure i troškove. ` +
    `Pratite zvanična saopštenja lokalnih institucija i konzulata.`
  return { title, summary, content }
}
