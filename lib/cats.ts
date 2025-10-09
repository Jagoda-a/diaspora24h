// lib/cats.ts
export type Cat =
  | 'sport' | 'zdravlje' | 'zanimljivosti' | 'politika' | 'svet'
  | 'ekonomija' | 'tech' | 'kultura' | 'hronika' | 'lifestyle' | 'nepoznato';

export const CATS: { slug: Cat; label: string }[] = [
  { slug: 'sport', label: 'Sport' },
  { slug: 'zdravlje', label: 'Zdravlje' },
  { slug: 'zanimljivosti', label: 'Zanimljivosti' },
  { slug: 'politika', label: 'Politika' },
  { slug: 'svet', label: 'Svet' },
  { slug: 'ekonomija', label: 'Ekonomija' },
  { slug: 'tech', label: 'Tehnologija' },
  { slug: 'kultura', label: 'Kultura' },
  { slug: 'hronika', label: 'Hronika' },
  { slug: 'lifestyle', label: 'Lifestyle' },
  { slug: 'nepoznato', label: 'Nepoznato' },
];

// ——— Heuristike ———

// precizniji sport — koristimo *reči* sa granicama, da ne hvata “goLim”
const SPORT_WORDS = [
  /\bsport\b/i, /\butakmic[aie]\b/i, /\bliga\b/i, /\bderbi\b/i,
  /\bgol\b(?!im)\b/i, /\bgolov/i, /\bgolom\b/i, /\bgolu\b/i, /\bgola\b/i, // izbegni “golim”
  /\btrener\b/i, /\btransfer\b/i, /\bmeč\b/i, /\btenis\b/i,
  /\bnovak\b/i, /\bdjokovi|džokovi\b/i, /\bkošark/i, /\bnba\b/i,
  /\bfudbal\b/i, /\bpremijer\s+liga\b/i, /\btabela\b/i, /\bstadion\b/i,
  /\bnavijač/i, /\breprezentacij/i,
];
const SPORT_CLUBS = [
  /(crvena\s+zvezda|fk\s*zvezda|kk\s*zvezda|czv|crveno\-beli)\b/i,
  /\bpartizan\b|\bfkp\b|\bkkp\b|\bradnički\b|\bvojvodina\b/i,
];

// kulturno/TV preteže nad sportom
const CULTURE_WORDS = [
  /pink(ove)?\s+zvezde/i, /zvezde\s+granda/i, /grand\s+parada/i,
  /estrad|peva(č|c)|pevačica|album|spot|koncert/i,
  /rijalit|reality|emisij|takmičenj|žiri|tv\s+pink/i,
  /glum(ac|ica)|film|serij|pozorišt|festival/i,
];

const LIFESTYLE_WORDS = [/poznat|vip|influens|moda|stil|trend/i];

const POLITICS_WORDS = [
  /\bvučić\b|\bvucic\b/i, /\bvlada\b/i, /\bministar\b/i, /\bskupštin/i,
  /\bpredsed/i, /\bizbor/i, /\bzakon\b/i, /\bautoput|putevi|koridor\b/i,
];

const HRONIKA_WORDS = [
  /\bnesreć/i, /\buhapšen/i, /\bsaobrać/i, /\bkrivič/i, /\bubist/i,
  /\bpožar/i, /\bkrađ/i, /\bpolicij/i,
  // sneg/zavejani/spasioci – česti u hronici
  /\bsneg\b|\bzavejan/i, /\bspas|spasu|spasili/i, /\bsekir/i,
];

const HEALTH_WORDS = [/zdravlj|lek|virus|simptom|bolest|klinika|vakcin|nutric|dieta|ishran/i];
const FUN_WORDS = [/zanimljiv|neverovatn|bizar|rekord|kurioz|viral|trivia/i];
const WORLD_WORDS = [/svet|global|europa|sad|rus|kina|ukrain|balkan|region/i];
const ECON_WORDS = [/ekonom|inflacij|berz|evr|dinar|budžet|gdp|bank|kamat|plate|poskupljen/i];
const TECH_WORDS = [/tehnolog|(?:\b|_)ai\b|veštačk|softver|hardver|telefon|android|apple|google|meta|\bx\b/i];

function score(words: RegExp[], text: string) {
  let s = 0; for (const rx of words) if (rx.test(text)) s++; return s;
}

function urlHint(link?: string): Cat | null {
  if (!link) return null;
  const l = link.toLowerCase();
  if (/(^|\/)(politika|politics)(\/|$)/.test(l)) return 'politika';
  if (/(^|\/)(hronika|crna-hronika|crna_hronika)(\/|$)/.test(l)) return 'hronika';
  if (/(^|\/)(sport|sports)(\/|$)/.test(l)) return 'sport';
  if (/(^|\/)(tech|tehnolog)(\/|$)/.test(l)) return 'tech';
  return null;
}

// Glavna funkcija
export function classifyTitle(title?: string, link?: string): Cat {
  const t = `${title || ''} ${link || ''}`.toLowerCase();

  // 0) Rani guardovi (sigurni slučajevi)
  if (/(pink(ove)?\s+zvezde|zvezde\s+granda|grand\s+parada)/i.test(t)) return 'kultura';
  if (/(pink\.rs|grand(\.|online)|grandonline|zvezdegranda)/i.test(t)) return 'kultura';

  // 1) URL hint (ali preferiraj politiku/hroniku nad sportom)
  const hint = urlHint(link);
  if (hint === 'politika' || hint === 'hronika' || hint === 'tech') return hint;

  // 2) Skoriranje
  const sCulture = score(CULTURE_WORDS, t) + score(LIFESTYLE_WORDS, t) * 0.5;
  if (sCulture >= 1) return 'kultura';

  const sPolitics = score(POLITICS_WORDS, t);
  const sHronika  = score(HRONIKA_WORDS, t);
  if (sPolitics >= 1 && sPolitics >= sHronika) return 'politika';
  if (sHronika  >= 1 && sHronika  >  sPolitics) return 'hronika';

  // sport tek posle gore navedenog
  const sSport = score(SPORT_WORDS, t) + score(SPORT_CLUBS, t);
  if (sSport >= 1) return 'sport';

  const sHealth = score(HEALTH_WORDS, t);
  const sFun    = score(FUN_WORDS, t);
  const sWorld  = score(WORLD_WORDS, t);
  const sEcon   = score(ECON_WORDS, t);
  const sTech   = score(TECH_WORDS, t);

  const buckets: [Cat, number][] = [
    ['zdravlje', sHealth],
    ['zanimljivosti', sFun],
    ['svet', sWorld],
    ['ekonomija', sEcon],
    ['tech', sTech],
  ];

  buckets.sort((a, b) => b[1] - a[1]);
  return buckets[0][1] > 0 ? buckets[0][0] : 'nepoznato';
}

// ——— Slike po kategoriji (po želji) ———
export const CAT_IMAGES: Record<Cat, string> = {
  sport: '/cats/sport.jpg',
  zdravlje: '/cats/zdravlje.jpg',
  zanimljivosti: '/cats/zanimljivosti.jpg',
  politika: '/cats/politika.jpg',
  svet: '/cats/svet.jpg',
  ekonomija: '/cats/ekonomija.jpg',
  tech: '/cats/tech.jpg',
  kultura: '/cats/kultura.jpg',
  hronika: '/cats/hronika.jpg',
  lifestyle: '/cats/lifestyle.jpg',
  nepoznato: '/cats/nepoznato.jpg',
};

export function getCatImage(cat: Cat | string | null | undefined) {
  const key = ((cat || 'nepoznato') as string).toLowerCase() as Cat;
  return CAT_IMAGES[key] ?? CAT_IMAGES.nepoznato;
}
