// lib/cats.ts

// -------------------------------------------------------------
// Profi heuristički klasifikator kategorija za naslove/sažetke
// -------------------------------------------------------------

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

// ------------------------
// Normalizacija teksta
// ------------------------
function normalize(s: string): string {
  return (s || '')
    .toLowerCase()
    // ukloni dijakritike
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // navodnici, “pametni” apostrofi
    .replace(/[’'"]/g, '')
    // duga crtice → obicne crtice/whitespace
    .replace(/[–—]/g, '-')
    // spajaj whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

// Ukloni bučne prefikse tipa “UŽIVO:”, “VIDEO:”, “FOTO:”, “SAŽETAK:”
function stripNoisyPrefixes(s: string): string {
  const rx = /^\s*(sazetak|sažetak|uzivo|uživo|video|foto|podcast|intervju|kolumna|blog)\s*[:\-–]\s*/i
  let t = s
  for (let i = 0; i < 2; i++) t = t.replace(rx, '')
  return t
}

// Da li je fraza prisutna (sa granicama reči, posle normalize)
function hasPhrase(text: string, phrase: string): boolean {
  const t = normalize(text)
  const p = normalize(phrase)
  const rx = new RegExp(`(^|\\b)${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\b|$)`)
  return rx.test(t)
}

// Koliko puta se javlja fraza (score = count)
function countPhrase(text: string, phrase: string): number {
  const t = normalize(text)
  const p = normalize(phrase).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const rx = new RegExp(`(^|\\b)${p}(\\b|$)`, 'g')
  return (t.match(rx) || []).length
}

// Dedup + trim helper
function dedupe(list: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const w of list.map(w => w.trim()).filter(Boolean)) {
    const key = normalize(w)
    if (!seen.has(key)) { seen.add(key); out.push(w) }
  }
  return out
}

// ------------------------
// Ponderi i strategija
// ------------------------
const W = {
  token: 1,        // obicna rec
  phrase: 2,       // fraza od vise reci
  priority: 3,     // jaki triggeri
  negative: -3,    // jake negativne
}

type CatDef = {
  label: string
  keywords: string[]
  phrases?: string[]
  priority?: string[]
  negatives?: string[]
  minScore?: number // minimalni prag da bi kategorija “prosla”
}

// Hijerarhija pri egalu (ako vise kategorija ima isti max score)
const TIE_BREAK: Cat[] = [
  'sport',
  'hronika',
  'politika',
  'ekonomija',
  'tehnologija',
  'kultura',
  'svet',
  'region',
  'zdravlje',
  'lifestyle',
  'zanimljivosti',
  'drustvo',
]

// ------------------------
// Definicije kategorija — PROŠIRENO
// ------------------------
export const CATS: Record<Cat, CatDef> = {
  politika: {
    label: 'Politika',
    keywords: dedupe([
      'politika','izbor','izbore','izbori','glas','glasanje','kampanja','koalicija','opozicija',
      'parlament','skupstina','ustav','vlada','ministar','ministarka','premijer','premijerka','predsednik','predsednica','kabinet',
      'amandman','rezolucija','sankcije','mandat','referendum','kancelar','odbornik','institucije','funkcioner',
      'brisel','pregovori','dijalog','deklaracija','inicijativa','savjet bezbednosti','saveta bezbednosti',
      'ambasador','ambasada','diplomata','memorandum','koalicioni sporazum','zakon','zakonodavstvo','propisi','uredba','naredba',
      'opstina','opština','gradonacelnik','gradonačelnik','konstitutivna sednica','budzet','budžet','javna nabavka',
      'izvrsna vlast','sudska vlast','zakonodavna vlast','institucionalni okvir'
    ]),
    phrases: dedupe([
      'parlamentarni izbori','predsednicki izbori','predsednički izbori','lokalni izbori',
      'formiranje vlade','politička kriza','politička kampanja','evropske integracije',
      'sporazum iz brisela','pregovori u briselu','mandatar za sastav vlade','tehnicka vlada','tehnička vlada',
      'javna rasprava o zakonu','izmene i dopune zakona','politička platforma','vlada u ostavci'
    ]),
    priority: dedupe([
      'izbori','vlada','ministar','predsednik','premijer','skupstina','rezolucija','sankcije',
      'kosovo','pristina','priština','kurti','brisel','mandatar','koalicija','opozicija','rebalans budžeta','rebalans budzeta'
    ]),
    negatives: dedupe([
      'mundijal','liga','utakmica','gol','reprezentacija','transfer','rekord',
      'android','iphone','aplikacija','ai','gpt','nvidia','gpu','driver','firmware',
      'holivud','glumac','glumica','film','serija','festival','premijera',
      'klinika','bolnica','terapija','vakcina','pandemija','dron','robot','kvantni','kvantno'
    ]),
    minScore: 3,
  },

  sport: {
    label: 'Sport',
    keywords: dedupe([
      'sport','utakmica','rezultat','tabela','liga','kolo','derbi','turnir','kup','pobeda','poraz','remi',
      'reprezentacija','selektor','trener','igrac','igrač','kapiten','asistencija','penal','sudija',
      'stadion','navijaci','navijači','transfer','ugovor','rekord','rang lista','plasman',
      'fudbal','fudbaler','kosarka','košarka','tenis','rukomet','odbojka','atletika','vaterpolo','hokej','formula','motosport',
      'maraton','sparring','turneja','pripreme','kup nacija','kup evrope','superkup','kvalifikacije','play-off','playoff'
    ]),
    phrases: dedupe([
      'liga sampiona','liga šampiona','evropsko prvenstvo','svetsko prvenstvo',
      'finalna serija','kvalifikacije za mundijal','kup srbije','kup evrope','masters turnir','grand slam'
    ]),
    priority: dedupe([
      'mundijal','kvalifikacije','utakmica','gol','pobeda','poraz',
      'zvezda','partizan','uefa','fifa','evroliga','premijer liga','serie a','bundesliga','laliga','super liga',
      'novak djokovic','novak đoković','djokovic','đoković','wimbledon','roland garros','us open','australian open'
    ]),
    negatives: dedupe([
      'izbori','vlada','ministar','skupstina','kurti','kosovo',
      'ai','android','iphone','aplikacija','holivud','glumac','glumica','film','serija',
      'vakcina','klinika','bolnica','terapija','inflacija','berza','budžet'
    ]),
    minScore: 2,
  },

  hronika: {
    label: 'Hronika',
    keywords: dedupe([
      'uhapsen','uhapšen','hapsenje','hapšenje','istraga','potera','potjera',
      'nesreca','nesreća','saobracajka','saobraćajka','udes','krv','razbojnik','pljacka','pljačka','kradja','krađa',
      'ubistvo','silovanje','pretnja','nasilje','napad','ranjen','povredjen','povređen',
      'tuzilastvo','tužilaštvo','sud','presuda','pritvor','preminuo','preminula','poginuo','tragedija',
      'noz','nož','pistolj','pištolj','oruzje','oružje','eksploziv','bomba','eksplozija',
      'droga','narkotici','zaplenjeno','kriminal','razbojništvo','pljackas','siledzija','zlostavljanje'
    ]),
    phrases: dedupe([
      'tragična nesreća','smrtni ishod','krivično delo','ubistvo iz nehata',
      'oružani napad','saobraćajna nesreća','zaplenjena droga','organizovani kriminal'
    ]),
    priority: dedupe([
      'ubistvo','uhapsen','uhapšen','preminuo','preminula','poginuo','silovanje','razbojništvo','pljacka','pljačka','noz','nož','pistolj','pištolj'
    ]),
    negatives: dedupe([
      'premijera','glumac','glumica','film','serija','festival',
      'mundijal','utakmica','gol',
      'izbori','vlada','ministar','aplikacija','android','iphone','ai','gpt'
    ]),
    minScore: 3,
  },

  ekonomija: {
    label: 'Ekonomija',
    keywords: dedupe([
      'ekonomija','privreda','berza','trziste','tržište','akcije','obveznice','kamata','kamatna stopa','kurs',
      'inflacija','deflacija','rast','pad','recesija','budzet','budžet','deficit',
      'investicija','investicije','izvoz','uvoz','bilans','plata','plate','minimalac','penzije','porez','pdv','gdp','bnp','bpd',
      'energetika','nafta','gas','cena','cene','poskupljenje','jeftinije','nezaposlenost','zaposlenost','produktivnost',
      'subvencija','grant','kredit','hipoteka','devizni kurs','referentna stopa','narodna banka','centralna banka',
      'tender','javna nabavka','ekonomski pokazatelji','stope rasta','potrošnja','štednja','savings','dug','zaduživanje'
    ]),
    phrases: dedupe([
      'ekonomski rast','ekonomska kriza','monetarna politika','fiskalna politika','javne finansije',
      'budžetska rezerva','tržišna kapitalizacija','industrijska proizvodnja','bruto domaći proizvod'
    ]),
    priority: dedupe([
      'inflacija','kamatna stopa','kamatne stope','berza','kurs','budzet','budžet','gdp','bnp','bpd',
      'nafta','gas','energetika','narodna banka','centralna banka','evro','dolar'
    ]),
    negatives: dedupe([
      'utakmica','gol','mundijal','glumica','glumac','film','serija',
      'android','iphone','aplikacija','ai','gpt','klinika','bolnica','vakcina'
    ]),
    minScore: 3,
  },

  tehnologija: {
    label: 'Tehnologija',
    keywords: dedupe([
      'tehnologija','tech','it','ai','vestacka inteligencija','veštačka inteligencija','ml','nlp','gpu','cpu','ram','ssd','chip','cip','nvidia','amd','intel',
      'aplikacija','android','ios','iphone','ipad','mac','windows','linux','kernel','driver','firmware','patch',
      'update','beta','release','open source','git','github','cloud','server','database','baza podataka','sql','postgres','mysql','mongodb',
      'vr','ar','xr','robot','dron','iot','smart','gadget','telefon','kamera','senzor','algoritam','model','llm','gpt','chatgpt',
      'kvantni','kvantno racunarstvo','kvantno računarstvo','edge computing','saas','paas','iaas','kubernetes','docker','container',
      'prompt','fine-tuning','embedding','vector db','weaviate','pgvector','milvus'
    ]),
    phrases: dedupe([
      'nova aplikacija','objavljen update','stabilna verzija','veliki jezik model','large language model',
      'generativna ai','generativna vestacka inteligencija','hardversko ubrzanje','driver update',
      'deploy na vercel','serverless funkcije','optimizacija performansi'
    ]),
    priority: dedupe([
      'ai','gpt','chatgpt','openai','nvidia','gpu','cuda','android','ios','iphone','google','meta','microsoft','apple','tesla','samsung',
      'snapdragon','ryzen','intel','windows','linux','cloud','azure','aws','anthropic','stability','huggingface'
    ]),
    negatives: dedupe([
      'izbori','vlada','ministar','kurti','kosovo',
      'mundijal','utakmica','gol','reprezentacija',
      'glumica','glumac','film','serija','festival',
      'klinika','bolnica','vakcina','inflacija','berza'
    ]),
    minScore: 3,
  },

  kultura: {
    label: 'Kultura',
    keywords: dedupe([
      'kultura','film','serija','glumac','glumica','rezija','režija','kinematografija','premijera','festival',
      'teatar','pozoriste','pozorište','opera','balet','knjiga','knjizevnost','književnost','pesnik','roman','kritika',
      'holivud','hollywood','oscars','kan','cannes','berlinale','venecija','repertoar','bioskop','umetnost','galerija','izlozba','izložba',
      'predstava','ansambl','repertoar','koncert','dirigent','orkestar','muzej','retrospektiva','monografija'
    ]),
    phrases: dedupe([
      'premijere u beogradskim pozorištima','nova predstava','na repertoaru','premijera predstave',
      'legendarna glumica','legendarni glumac','nagraden za ulogu','nagrađen za ulogu','nagrađena za ulogu',
      'otvaranje izložbe','kulturna manifestacija'
    ]),
    priority: dedupe([
      'pozoriste','pozorište','teatar','premijera','repertoar','glumica','glumac','film','serija','holivud','oscars','festival','reziser','režiser','koncert'
    ]),
    negatives: dedupe([
      'utakmica','gol','mundijal',
      'izbori','vlada','ministar',
      'android','iphone','aplikacija','ai','gpt','klinika','bolnica'
    ]),
    minScore: 3,
  },

  zdravlje: {
    label: 'Zdravlje',
    keywords: dedupe([
      'zdravlje','klinika','bolnica','ambulanta','lekar','doktor','zdravstveni','pacijent','terapija',
      'vakcina','epidemija','pandemija','virus','bakterija','simptomi','lecenje','lečenje','prevencija','ishrana',
      'onkologija','kardiologija','psihologija','psihijatrija','depresija','dijabetes','holesterol','hipertenzija',
      'higijena','zaraza','imunitet','alergija','astma','operaсija','operacija','pregled','magnetna rezonanca','rendgen'
    ]),
    phrases: dedupe([
      'javna zdravlja','kampanja vakcinacije','mere prevencije','mera prevencije','hitna pomoc','hitna pomoć',
      'listе cekanja','liste čekanja','reforma zdravstva'
    ]),
    priority: dedupe(['vakcina','epidemija','pandemija','terapija','klinika','bolnica','pacijent','operacija','ambulanta']),
    negatives: dedupe([
      'izbori','vlada','ministar','mundijal','utakmica','gol',
      'glumica','glumac','film','serija','android','iphone','aplikacija','ai','gpt'
    ]),
    minScore: 3,
  },

  lifestyle: {
    label: 'Lifestyle',
    keywords: dedupe([
      'lifestyle','moda','stil','trend','saveti','zivotni stil','putovanja','putovanje','ishrana','fitnes','trening',
      'enterijer','dekor','uredjenje doma','uređenje doma','beauty','wellness','influencer','selfcare','dijeta',
      'horoskop','zabava','putopis','frizura','sminka','šminka','kozmetika','outfit','kapsulna garderoba','minimalizam',
      'odmor','vikend beg','city break','putna destinacija','putni savet'
    ]),
    phrases: dedupe(['ikona stila','modni trendovi','uređenje enterijera','saveti za putovanje','kako da','life hack','tip&trick']),
    priority: dedupe(['moda','stil','beauty','wellness','trend','saveti','frizura','šminka','putovanja']),
    negatives: dedupe([
      'izbori','vlada','ministar','kurti','kosovo','mundijal','utakmica','gol',
      'glumica','glumac','film','serija','android','iphone','aplikacija','ai','gpt','berza','inflacija'
    ]),
    minScore: 3,
  },

  zanimljivosti: {
    label: 'Zanimljivosti',
    keywords: dedupe([
      'zanimljivosti','neobicno','neobično','bizarno','rekord','viralno','kuriozitet','neverovatno','neobican','neobičan',
      'otkrice','otkriće','arheologija','misterija','enigma','zagonetka','paradoks','kuriozum','nevidjeno','neviđeno',
      'svetski rekord','guinness','guinnessova knjiga rekorda'
    ]),
    phrases: dedupe(['verovali ili ne','dosad nezabelezeno','neobična pojava','rekord sveta','najveći na svetu','najmanji na svetu']),
    priority: dedupe(['rekord','viralno','kuriozitet','misterija','otkrice','otkriće','guinness']),
    negatives: dedupe([
      'izbori','vlada','ministar','utakmica','gol','mundijal',
      'glumica','glumac','film','serija','android','iphone','aplikacija','ai','gpt','klinika','bolnica'
    ]),
    minScore: 3,
  },

  svet: {
    label: 'Svet',
    keywords: dedupe([
      'svet','globalno','medjunarodno','međunarodno','diplomatija','geopolitika','un','nato','eu','sad','usa',
      'kina','rusija','ukrajina','bliski istok','gaza','izrael','palestina','brics','afrika','latinska amerika','azija','evropa',
      'mig','avion','eskalacija','primirje','sankcije','embargo','ambasada','konsenzus'
    ]),
    phrases: dedupe(['medjunarodna zajednica','spoljna politika','globalna kriza','svetska scena','svetske vesti','mirovni pregovori']),
    priority: dedupe(['un','nato','eu','sad','kina','rusija','ukrajina','gaza','izrael','palestina','brics','mirovni sporazum']),
    negatives: dedupe(['android','iphone','aplikacija','ai','glumica','glumac','film','serija','mundijal','utakmica','gol','klinika','bolnica']),
    minScore: 3,
  },

  region: {
    label: 'Region',
    keywords: dedupe([
      'region','balkan','srbija','hrvatska','bosna','bih','crna gora','cg','slovenija','makedonija','severna makedonija',
      'albanija','kosovo','pristina','priština','banja luka','banjaluka',
      'novi sad','nis','niš','kragujevac','subotica','novi pazar','mostar','sarajevo','zagreb','split','podgorica','ljubljana','skoplje','prizren',
      'sutjeska','hercegovina','vojvodina','sandzak','sandžak','kosmet'
    ]),
    phrases: dedupe(['u regionu','zapadni balkan','srbi na kosovu','vesti iz regiona','regionalna saradnja']),
    priority: dedupe(['balkan','srbija','kosovo','hrvatska','bih','cg','slovenija','makedonija','albanija','vojvodina','hercegovina']),
    negatives: dedupe(['android','iphone','aplikacija','ai','glumica','glumac','film','serija','mundijal','utakmica','gol']),
    minScore: 3,
  },

  drustvo: {
    label: 'Društvo',
    keywords: dedupe([
      'drustvo','društvo','obrazovanje','skola','škola','ucenik','učenik','nastavnik','student','fakultet','univerzitet',
      'socijalno','zdravstvo','penzija','penzije','demografija','porodica','lokalno','komunalno','saobracaj','saobraćaj',
      'javna rasprava','nasilje u porodici','vršnjačko nasilje','vršnjacko nasilje','invaliditet','ngo','udruzenje','udruženje',
      'radnici','sindikat','plata','radno vreme','štrajk','strajk','javne usluge','komunalci','komunalna policija',
      'vrsnjacko nasilje','vršnjačko'
    ]),
    phrases: dedupe(['lokalna zajednica','obrazovna reforma','socijalna politika','javne usluge','građani apeluju','gradjani apeluju']),
    priority: dedupe(['obrazovanje','zdravstvo','porodica','socijalno','sindikat','strajk','radnici','škola','studenti']),
    negatives: dedupe([
      'izbori','vlada','ministar','mundijal','utakmica','gol','glumica','glumac','film','serija',
      'android','iphone','aplikacija','ai','gpt','berza','inflacija','gdp'
    ]),
    minScore: 2,
  },
}

// Dodatni eksporti za UI i validacije
export const CAT_KEYS = Object.keys(CATS) as Cat[]
export const CAT_LABELS: Record<Cat, string> = Object.fromEntries(
  (Object.keys(CATS) as Cat[]).map((k) => [k, CATS[k].label])
) as Record<Cat, string>

export function isValidCat(x: string | null | undefined): x is Cat {
  return !!x && (CAT_KEYS as string[]).includes(x)
}

// ------------------------
// “Hard switch” (pre-semafor) za vrlo jasne slučajeve
// ------------------------
const SPORT_STRONG = /(selektor|fudbal|fudbaler|utakmic|liga|kolo|derbi|gol|zvezda|partizan|uefa|fifa|tenis|kosarka|košarka)\b/i
const KULTURA_STRONG = /(pozorist|pozorišt|teatar|premijer[ae]?|repertoar|predstava|glumac|glumic|film|serij|festival|oscars|holivud)/i
const HRONIKA_STRONG = /(ubistv|uhaps|hapšen|hapsen|silovan|pljačk|pljack|razbojn|nesrec|nesreć|saobracajk|saobraćajk|noz|nož|pistolj|pištolj|poginuo|preminuo)/i
const TEHNO_STRONG = /(chatgpt|open\s*ai|openai|\bgpt[-\s]?\d*\b|\ballm\b|generativn|vestacka inteligencija|veštačka inteligencija|nvidia|gpu|cuda)/i
const SVET_STRONG = /\b(un|nato|eu|sad|usa|rusija|kina|ukrajina|gaza|izrael|palestina|brics)\b/i

// ------------------------
// Klasifikator
// ------------------------
export function classifyTitle(title: string, hint?: string | null): Cat {
  // 1) priprema teksta
  const cleanedTitle = stripNoisyPrefixes(title || '')
  const cleanedHint = stripNoisyPrefixes(hint || '')
  const textRaw = `${cleanedTitle} ${cleanedHint}`.trim()
  const t = normalize(textRaw)

  // 2) hard switch — ultra jasni slučajevi
  if (SPORT_STRONG.test(t)) return 'sport'
  if (HRONIKA_STRONG.test(t)) return 'hronika'
  if (KULTURA_STRONG.test(t)) return 'kultura'
  if (TEHNO_STRONG.test(t)) return 'tehnologija'
  if (SVET_STRONG.test(t)) return 'svet'

  // 3) scoring po svim kategorijama
  const scores: Record<Cat, number> = {
    politika: 0, hronika: 0, sport: 0, ekonomija: 0, tehnologija: 0,
    kultura: 0, zdravlje: 0, lifestyle: 0, zanimljivosti: 0, svet: 0, region: 0, drustvo: 0
  }

  let best: { cat: Cat; score: number } | null = null

  for (const cat of Object.keys(CATS) as Cat[]) {
    const cfg = CATS[cat]
    let score = 0

    // negativi (pre)
    if (cfg.negatives) {
      for (const neg of cfg.negatives) {
        const c = countPhrase(textRaw, neg)
        if (c) score += W.negative * c
      }
    }

    // priority
    if (cfg.priority) {
      for (const p of cfg.priority) {
        const c = countPhrase(textRaw, p)
        if (c) score += W.priority * c
      }
    }

    // fraze
    if (cfg.phrases) {
      for (const ph of cfg.phrases) {
        const c = countPhrase(textRaw, ph)
        if (c) score += W.phrase * c
      }
    }

    // keywords (single tokens)
    for (const kw of cfg.keywords) {
      const c = countPhrase(textRaw, kw)
      if (c) score += W.token * c
    }

    scores[cat] = score
    if (!best || score > best.score) best = { cat, score }
  }

  // 4) minimalni prag + tie-break
  if (best) {
    const min = CATS[best.cat].minScore ?? 1
    if (best.score < min) {
      // probaj ostale koji su presli svoj prag
      const candidates = (Object.keys(scores) as Cat[]).filter(c => scores[c] >= (CATS[c].minScore ?? 1))
      if (candidates.length) {
        // izaberi najvisi score; ako egal → tie break
        const maxScore = Math.max(...candidates.map(c => scores[c]))
        const tied = candidates.filter(c => scores[c] === maxScore)
        if (tied.length > 1) {
          for (const c of TIE_BREAK) if (tied.includes(c)) return c
        }
        return tied[0]
      }
      // niko ne prolazi prag → fallback
      return 'drustvo'
    }

    // egal na maksimumu?
    const max = Math.max(...Object.values(scores))
    const tied = (Object.keys(scores) as Cat[]).filter(c => scores[c] === max)
    if (tied.length > 1) {
      for (const c of TIE_BREAK) if (tied.includes(c)) return c
    }
    return best.cat
  }

  // 5) krajnji fallback
  return 'drustvo'
}
