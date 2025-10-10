// lib/cats.ts

// Tipovi
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

export const UNKNOWN = 'nepoznato' as const
export type CatOrUnknown = Cat | typeof UNKNOWN

// Mapa kategorija (label + ključne reči za heuristiku)
export const CATS: Record<Cat, { label: string; keywords: string[] }> = {
  politika: {
    label: 'Politika',
    keywords: [
      'vlada','parlament','predsednik','premijer','izbori','stranka','poslanik',
      'ministar','demonstracije','sankcije','zakon','ustav','kampanja'
    ],
  },
  hronika: {
    label: 'Hronika',
    keywords: [
      'uhapšen','uhapsen','istraga','ubistvo','krađa','kradja','saobraćajka','saobracajka',
      'nesreća','nesreca','požar','pozar','prekršaj','preksaj','policija','tužilaštvo','tuzilastvo','sud'
    ],
  },
  sport: {
    label: 'Sport',
    keywords: [
      'utakmica','liga','kup','gol','tenis','košarka','kosarka','fudbal','odbojka',
      'rukomet','navijači','navijaci','selektor','trener','derbi','rekord'
    ],
  },
  ekonomija: {
    label: 'Ekonomija',
    keywords: [
      'inflacija','bnp','bdp','berza','privreda','tržište','trziste','akcije','kamatna stopa',
      'investicija','budžet','budzet','deficit','kurs','dinar','euro','evro','plata'
    ],
  },
  tehnologija: {
    label: 'Tech',
    keywords: [
      'tehnologija','ai','veštačka inteligencija','vestacka inteligencija','aplikacija','android','ios',
      'gadget','telefon','laptop','softver','hardver','startap','internet','bezbednost','cyber','sajber'
    ],
  },
  kultura: {
    label: 'Kultura',
    keywords: [
      'film','pozorište','pozoriste','knjiga','izložba','izlozba','festival','muzej','premijera',
      'koncert','umetnost','umjetnost','autor','režiser','reziser','glumac','glumica'
    ],
  },
  zdravlje: {
    label: 'Zdravlje',
    keywords: [
      'zdravlje','bolnica','klinika','lek','lijek','vakcina','virus','bakterija','epidemija',
      'simptomi','dijagnoza','dijeta','ishrana','lekari','doktor','medicina'
    ],
  },
  lifestyle: {
    label: 'Lifestyle',
    keywords: [
      'moda','putovanje','putovanja','izlasci','zabava','poznati','influencer','saveti',
      'enterijer','kuvanje','recept','beauty','lepota','fitnes'
    ],
  },
  zanimljivosti: {
    label: 'Zanimljivosti',
    keywords: [
      'zanimljivo','neverovatno','neobično','neobicno','viralno','rekord','fenomen','otkriće','otkrice',
      'arheologija','svemir','nauka','kuriozitet'
    ],
  },
  svet: {
    label: 'Svet',
    keywords: [
      'svet','međunarodno','medjunarodno','eu','un','nato','rat','konflikt','granica','ambasada',
      'diplomatija','strani','globalno'
    ],
  },
  region: {
    label: 'Region',
    keywords: [
      'hrvatska','bosna','bih','crna gora','cg','slovenija','makedonija','severna makedonija','albanija',
      'kosovo','metohija','balkan','region'
    ],
  },
  drustvo: {
    label: 'Društvo',
    keywords: [
      'škola','skola','univerzitet','fakultet','obrazovanje','socijalno','penzija','penzioner',
      'radnik','radnici','zaposleni','nvo','komunalno','saobraćaj','saobracaj','infrastruktura'
    ],
  },
}

// Niz ključeva (za where: { in: ... } i slične potrebe)
export const CAT_KEYS = Object.keys(CATS) as Cat[]

// Brendiranje po hostu (za prikaz izvora)
export function brandFromHost(host: string): string {
  const h = host.replace(/^www\./i, '').toLowerCase()
  if (h.endsWith('blic.rs')) return 'Blic'
  if (h.endsWith('kurir.rs')) return 'Kurir'
  if (h.endsWith('nova.rs')) return 'Nova.rs'
  if (h.endsWith('telegraf.rs')) return 'Telegraf'
  if (h.endsWith('b92.net')) return 'B92'
  if (h.endsWith('n1info.rs')) return 'N1'
  if (h.endsWith('rts.rs')) return 'RTS'
  if (h.endsWith('danas.rs')) return 'Danas'
  if (h.endsWith('informer.rs')) return 'Informer'
  if (h.endsWith('alo.rs')) return 'Alo'
  if (h.endsWith('mondo.rs')) return 'Mondo'
  if (h.endsWith('politika.rs')) return 'Politika'
  if (h.endsWith('nedeljnik.rs')) return 'Nedeljnik'
  if (h.endsWith('novaekonomija.rs')) return 'Nova ekonomija'
  if (h.endsWith('nova-s.tv') || h.endsWith('novas.tv')) return 'Nova S'
  return h
}

// Jednostavna provera da li je string validna kategorija
export function isValidCat(x: string | null | undefined): x is Cat {
  return !!x && (CAT_KEYS as string[]).includes(x)
}

// Mapiranje kategorija → default slika (public/cats/*.jpg|png)
const CAT_IMAGES: Partial<Record<Cat, string>> = {
  politika: '/cats/politika.jpg',
  hronika: '/cats/hronika.jpg',
  sport: '/cats/sport.jpg',
  ekonomija: '/cats/ekonomija.jpg',
  tehnologija: '/cats/tehnologija.jpg',
  kultura: '/cats/kultura.jpg',
  zdravlje: '/cats/zdravlje.jpg',
  lifestyle: '/cats/lifestyle.jpg',
  zanimljivosti: '/cats/zanimljivosti.jpg',
  svet: '/cats/svet.jpg',
  region: '/cats/region.jpg',
  drustvo: '/cats/drustvo.jpg',
}

export function getCatImage(cat: Cat): string {
  return CAT_IMAGES[cat] || '/cats/default.jpg'
}

// Heuristička klasifikacija naslova/linka
export function classifyTitle(title: string, sourceUrl?: string): Cat {
  const t = (title || '').toLowerCase()
  const url = (sourceUrl || '').toLowerCase()

  // 1) Po domenima (ako želiš “hard routing”, dodaj ovde)
  if (/sport|sports/.test(url)) return 'sport'
  if (/tech|tehnologija|it/.test(url)) return 'tehnologija'
  if (/kultura|culture|art/.test(url)) return 'kultura'
  if (/ekonomija|biznis|business|finans/.test(url)) return 'ekonomija'
  if (/zdravlje|health|medicin/.test(url)) return 'zdravlje'
  if (/lifestyl|magazin|zanimljivosti/.test(url)) return 'zanimljivosti'
  if (/region|balkan/.test(url)) return 'region'
  if (/world|svet|global/.test(url)) return 'svet'
  if (/hronika|crna-h|crna-hronika/.test(url)) return 'hronika'
  if (/politika|policy|parlament|vlada|izbori/.test(url)) return 'politika'

  // 2) Po ključnim rečima u naslovu
  let best: { cat: Cat; score: number } | null = null
  for (const cat of CAT_KEYS) {
    const kws = CATS[cat].keywords
    let score = 0
    for (const kw of kws) {
      if (t.includes(kw)) score++
    }
    if (!best || score > best.score) {
      best = { cat, score }
    }
  }

  // 3) Prag: ako ništa ne “pogađa”, spusti u društvo (ili zanimljivosti)
  if (!best || best.score === 0) return 'drustvo'
  return best.cat
}
