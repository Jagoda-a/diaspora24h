// lib/cats.ts

export type Cat =
  | 'politika'
  | 'hronika'
  | 'sport'
  | 'ekonomija'
  | 'tehnologija'
  | 'kultura'
  | 'zdravlje'
  | 'lifestyle'
  | 'zanimljivosti'
  | 'svet'
  | 'region'
  | 'drustvo'

// Normalizacija: mala slova, bez dijakritika, skidamo navodnike
function normalize(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'"]/g, '')
}

function hasPhrase(text: string, phrase: string): boolean {
  const t = normalize(text)
  const p = normalize(phrase)
  const rx = new RegExp(`(^|\\b)${p.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}(\\b|$)`)
  return rx.test(t)
}

// Ponderi
const W = {
  token: 1,
  phrase: 2,
  priority: 3,
  negative: -2,
}

// Hijerarhija za razrešavanje egala i fallback
const TIE_BREAK: Cat[] = [
  'politika', 'sport', 'hronika', 'kultura', 'ekonomija',
  'svet', 'region', 'drustvo', 'zdravlje', 'lifestyle', 'zanimljivosti', 'tehnologija'
]

// ------------------------
// Definicije kategorija
// ------------------------

type CatDef = {
  label: string
  keywords: string[]
  phrases?: string[]
  priority?: string[]
  negatives?: string[]
  minScore?: number
}

export const CATS: Record<Cat, CatDef> = {
  politika: {
    label: 'Politika',
    keywords: [
      'izbor','izbore','izbori','glas','glasao','glasanje','kampanja','koalicija','opozicija',
      'parlament','skupstina','ustav','vlada','ministar','ministri','premijer','premijerski',
      'predsednik','kabinet','amandman','rezolucija','sankcije','zastava','demokratski',
      'referendum','mandat','kancelar','premijera','opstina','opština','odbornik','odbornici',
      'institucije','decentralizacija','poglavlje','evropske integracije','brisel'
    ],
    phrases: [
      'lokalni izbori','parlamentarni izbori','predsednicki izbori','predsednički izbori',
      'srbi se vracaju u institucije','srbi na kosovu','formiranje vlade','izborna lista',
      'politička kriza','politička kampanja'
    ],
    priority: [
      'kurti','kosovo','pristina','priština','srpska lista','brisel','sankcije','rezolucija',
      'vlada','predsednik','premijer','izbori','skupstina'
    ],
    negatives: [
      'mundijal','liga','utakmica','gol','reprezentacija','transfer',
      'android','iphone','aplikacija','ai','chip','gpu',
      'holivud','glumac','glumica','film','serija'
    ],
    minScore: 3,
  },

  sport: {
    label: 'Sport',
    keywords: [
      'sport','utakmica','rezultat','tabella','tabela','liga','kolo','derbi','turnir','kup','pobjeda','pobeda','poraz',
      'reprezentacija','selektor','trener','igrac','igrač','gol','asistencija','penal','sudija',
      'stadion','navijaci','navijači','transfer','ugovor','rekord','rang lista'
    ],
    phrases: [
      'sans(e|a|i) za mundijal','kvalifikacije za mundijal','lig(a|e) sampiona','liga šampiona',
      'evropsko prvenstvo','svetsko prvenstvo','finalna serija'
    ],
    priority: [
      'mundijal','kvalifikacije','utakmica','gol','pobeda','poraz',
      'zvezda','partizan','uefa','fifa','evroliga','premijer liga','serie a','bundesliga','laliga','super liga',
      'albanija','srbija'
    ],
    negatives: [
      'izbori','vlada','ministar','skupstina','kurti','kosovo',
      'ai','android','iphone','aplikacija','holivud','glumac','glumica','film'
    ],
    minScore: 3,
  },

  hronika: {
    label: 'Hronika',
    keywords: [
      'uhapsen','uhapšen','hapsenje','hapšenje','istraga','potera','potjera',
      'nesreca','nesreća','saobracajka','saobraćajka','ud(es|ar)','krv','razbojnik','pljacka','pljačka','krađa','kradja',
      'ubistvo','silovanje','pretnja','nasilje','napad','ranjen','povredjen','povređen',
      'tuzilastvo','tužilaštvo','sud','presuda','pritvor','preminuo','preminula','poginuo','tragedija'
    ],
    phrases: [
      'tragična nesreća','tragično preminuo','smrtni ishod','krivično delo'
    ],
    priority: [
      'ubistvo','uhapsen','uhapšen','preminuo','preminula','poginuo','silovanje','razbojništvo','pljacka','pljačka'
    ],
    negatives: [
      'premijera','glumac','glumica','film','serija','festival',
      'mundijal','utakmica','gol',
      'izbori','vlada','ministar'
    ],
    minScore: 3,
  },

  ekonomija: {
    label: 'Ekonomija',
    keywords: [
      'ekonomija','privreda','berza','trziste','tržište','akcije','obveznice','kamata','kamatna stopa','kurs',
      'inflacija','deflacija','bnp','bpd','bnp-a','bpd-a','rast','pad','recesija','budzet','budžet','deficit',
      'investicija','investicije','izvoz','uvoz','bilans','plate','minimalac','penzije','porez','pdv','gdp'
    ],
    phrases: [
      'ekonomski rast','ekonomska kriza','monetarna politika','fiskalna politika','javne finansije'
    ],
    priority: [
      'inflacija','kamatna stopa','kamatne stope','berza','kurs','budzet','budžet','gdp','bnp','bpd'
    ],
    negatives: [
      'izbori','vlada','ministar',
      'utakmica','gol','mundijal',
      'glumica','glumac','film','serija',
      'android','iphone','aplikacija','ai'
    ],
    minScore: 3,
  },

  tehnologija: {
    label: 'Tehnologija',
    keywords: [
      'tehnologija','tehnolo','tech','it','ai','vestacka inteligencija','ml','nlp','gpu','cpu','ram','ssd','chip','cip','nvidia',
      'aplikacija','app','android','ios','iphone','ipad','mac','windows','linux','kernel',
      'update','apdejt','beta','release','open source','git','github','cloud','server','database','sql','postgres','mysql',
      'vr','ar','xr','robot','dron','iot','smart','gadget','telefon','kamera','senzor','algoritam','model'
    ],
    phrases: [
      'nova aplikacija','objavljen update','stabilna verzija','veliki jezik model','generativni model','deploy na vercel',
      'mobilna aplikacija','hardversko ubrzanje','driver update'
    ],
    priority: [
      'ai','gpt','nvidia','gpu','cuda','android','ios','iphone','google','meta','microsoft','openai','apple','tesla','samsung',
      'snapdragon','ryzen','intel','windows','linux','cloud'
    ],
    negatives: [
      'izbori','vlada','ministar','kurti','kosovo',
      'mundijal','utakmica','gol','reprezentacija',
      'glumica','glumac','film','serija','festival',
    ],
    minScore: 4,
  },

  kultura: {
    label: 'Kultura',
    keywords: [
      'kultura','film','serija','glumac','glumica','režija','rezija','kinematografija','premijera','festival',
      'teatar','pozoriste','pozorište','opera','balet','knjiga','književnost','knjizevnost','pesnik','roman','kritika',
      'holivud','hollywood','oscars','kan','cannes','berlinale','venecija','repertoar','kinosala','bioskop','umetnost','galerija'
    ],
    phrases: [
      'legendarna glumica','legendarni glumac','ikona stila','filmska ikona','nagrađen za ulogu','nagrađena za ulogu'
    ],
    priority: [
      'glumica','glumac','film','serija','holivud','oscars','premijera','festival','režiser','reziser'
    ],
    negatives: [
      'utakmica','gol','mundijal',
      'izbori','vlada','ministar',
      'android','iphone','aplikacija','ai'
    ],
    minScore: 3,
  },

  zdravlje: {
    label: 'Zdravlje',
    keywords: [
      'zdravlje','klinika','bolnica','ambulanta','doktori','lekar','doktor','zdravstveni','pacijent','terapija',
      'vakcina','epidemija','pandemija','virus','bakterija','simptomi','lecenje','lečenje','prevencija','ishrana'
    ],
    phrases: [
      'javna zdravlja','kampanja vakcinacije','mer(e|a) prevencije'
    ],
    priority: [
      'vakcina','epidemija','pandemija','terapija','klinika','bolnica'
    ],
    negatives: [
      'izbori','vlada','ministar',
      'utakmica','gol',
      'glumica','glumac','film','serija',
      'android','iphone','aplikacija','ai'
    ],
    minScore: 3,
  },

  lifestyle: {
    label: 'Lifestyle',
    keywords: [
      'lifestyle','moda','stil','trend','saveti','zivotni stil','putovanja','putovanje','ishrana','fitnes','trening',
      'enterijer','dekor','uređenje doma','beauty','wellness','savjet','influencer'
    ],
    phrases: [
      'ikona stila','modni trendovi','uređenje enterijera','saveti za putovanje'
    ],
    priority: [
      'moda','stil','beauty','wellness'
    ],
    negatives: [
      'izbori','vlada','ministar','kurti','kosovo',
      'mundijal','utakmica','gol',
      'glumica','glumac','film','serija',
      'android','iphone','aplikacija','ai'
    ],
    minScore: 3,
  },

  zanimljivosti: {
    label: 'Zanimljivosti',
    keywords: [
      'zanimljivosti','neobicno','neobično','bizarno','rekord','viralno','kuriozitet','neobican','neobičan','neverovatno'
    ],
    phrases: [
      'verovali ili ne','dosad nezabelezeno','neobična pojava'
    ],
    priority: ['rekord','viralno','kuriozitet'],
    negatives: [
      'izbori','vlada','ministar',
      'utakmica','gol','mundijal',
      'glumica','glumac','film','serija',
      'android','iphone','aplikacija','ai'
    ],
    minScore: 3,
  },

  svet: {
    label: 'Svet',
    keywords: [
      'svet','globalno','medjunarodno','međunarodno','diplomatija','geopolitika','un','nato','eu','sad','usa',
      'kina','rusija','ukrajina','bliski istok','bliski istoku','bliski istoka','gaza','izra( e)?l','palestina'
    ],
    phrases: [
      'medjunarodna zajednica','spoljna politika','globalna kriza'
    ],
    priority: ['un','nato','eu','sad','kina','rusija','ukrajina','gaza','izrael','palestina'],
    negatives: [
      'android','iphone','aplikacija','ai',
      'glumica','glumac','film','serija',
      'mundijal','utakmica','gol'
    ],
    minScore: 3,
  },

  region: {
    label: 'Region',
    keywords: [
      'region','balkan','srbija','hrvatska','bosna','bih','crna gora','cg','slovenija','makedonija','severna makedonija','albanija','kosovo','pristina','priština','banja luka','banjaluka',
      'novi sad','nis','niš','kragujevac','subotica','novi pazar'
    ],
    phrases: [
      'u regionu','zapadni balkan','srbi na kosovu'
    ],
    priority: ['balkan','srbija','kosovo','hrvatska','bih','cg','slovenija','makedonija','albanija'],
    negatives: [
      'android','iphone','aplikacija','ai',
      'glumica','glumac','film','serija',
      'mundijal','utakmica','gol'
    ],
    minScore: 3,
  },

  drustvo: {
    label: 'Društvo',
    keywords: [
      'drustvo','društvo','obrazovanje','skola','škola','ucenik','učenik','fakultet','univerzitet','socijalno',
      'zdravstvo','penzija','penzije','demografija','porodica','lokalno','komunalno','saobracaj','saobraćaj'
    ],
    phrases: [
      'javna rasprava','lokalna zajednica','obrazovna reforma','reforma obrazovanja','socijalna politika'
    ],
    priority: ['obrazovanje','zdravstvo','porodica','socijalno'],
    negatives: [
      'izbori','vlada','ministar',
      'mundijal','utakmica','gol',
      'glumica','glumac','film','serija',
      'android','iphone','aplikacija','ai'
    ],
    minScore: 2,
  },
}

// Dodatni eksporti za UI i validacije
export const CAT_KEYS = Object.keys(CATS) as Cat[]
export const CAT_LABELS: Record<Cat, string> = Object.fromEntries(
  (Object.keys(CATS) as Cat[]).map((k) => [k, CATS[k].label])
) as Record<Cat, string>

// Validacija kategorije
export function isValidCat(x: string | null | undefined): x is Cat {
  return !!x && (CAT_KEYS as string[]).includes(x)
}

// ------------------------
// Klasifikator
// ------------------------
export function classifyTitle(title: string, hint?: string | null): Cat {
  const textRaw = `${title || ''} ${hint || ''}`
  const t = normalize(textRaw)

  let best: { cat: Cat; score: number } | null = null
  const scores: Record<Cat, number> = {
    politika: 0, hronika: 0, sport: 0, ekonomija: 0, tehnologija: 0,
    kultura: 0, zdravlje: 0, lifestyle: 0, zanimljivosti: 0, svet: 0, region: 0, drustvo: 0
  }

  for (const cat of Object.keys(CATS) as Cat[]) {
    const cfg = CATS[cat]
    let score = 0

    // Negativni signali
    if (cfg.negatives) for (const neg of cfg.negatives) if (hasPhrase(textRaw, neg)) score += W.negative

    // Prioritetne reči
    if (cfg.priority) for (const p of cfg.priority) if (hasPhrase(textRaw, p)) score += W.priority

    // Fraze
    if (cfg.phrases) for (const ph of cfg.phrases) if (hasPhrase(textRaw, ph)) score += W.phrase

    // Obične ključne reči (granice reči)
    for (const kw of cfg.keywords) {
      const rx = new RegExp(`(^|\\b)${normalize(kw).replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}(\\b|$)`)
      if (rx.test(t)) score += W.token
    }

    scores[cat] = score
    if (!best || score > best.score) best = { cat, score }
  }

  // Jak preusmerivač ka kulturi (glumac/glumica/film/serija/holivud)
  const strongKultura = /(glumic|glumac|film|serij|holivud|hollywood|oscars)/.test(t)
  if (strongKultura) return 'kultura'

  // Minimalni prag po kategoriji
  if (best) {
    const min = CATS[best.cat].minScore ?? 1
    if (best.score < min) {
      for (const c of TIE_BREAK) {
        const need = CATS[c].minScore ?? 1
        if (scores[c] >= need) return c
      }
      return 'drustvo'
    }
  }

  // Egal: zadrži samo one sa max score, pa primeni TIE_BREAK
  if (best) {
    const max = Math.max(...(Object.values(scores)))
    const tied = (Object.keys(scores) as Cat[]).filter(c => scores[c] === max)
    if (tied.length > 1) {
      for (const c of TIE_BREAK) if (tied.includes(c)) return c
    }
    return best.cat
  }

  return 'drustvo'
}
