// lib/cats.ts

export type Cat =
  | 'politika'
  | 'ekonomija'
  | 'sport'
  | 'kultura'
  | 'lifestyle'
  | 'tech'
  | 'hronika'
  | 'svet'
  | 'zanimljivosti'
  | 'nepoznato';

function norm(s?: string | null) {
  return (s || '')
    .toLowerCase()
    .normalize('NFKD') // izbacuje dijakritike za lakše matcheve
    .replace(/[^\p{Letter}\p{Number}\s/.-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function host(u?: string) {
  try { return new URL(u!).host.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}
function path(u?: string) {
  try { return new URL(u!).pathname.toLowerCase(); } catch { return ''; }
}

/** Pravila po domenu i path-u (hard signali) */
function byDomainPath(u?: string): Cat | null {
  const h = host(u);
  const p = path(u);

  // RTS
  if (h.endsWith('rts.rs')) {
    if (p.startsWith('/page/sport')) return 'sport';
    if (p.includes('/ekonomija')) return 'ekonomija';
    if (p.includes('/kultura')) return 'kultura';
    if (p.includes('/region') || p.includes('/svet') || p.includes('/balkan')) return 'svet';
    if (p.includes('/politika') || p.includes('/veste') || p.includes('/vesti') || p.includes('/stories')) return 'politika';
  }

  // N1
  if (h.endsWith('n1info.rs') || h.endsWith('rs.n1info.com')) {
    if (p.includes('/sport')) return 'sport';
    if (p.includes('/biznis')) return 'ekonomija';
    if (p.includes('/svet') || p.includes('/region')) return 'svet';
    return 'politika';
  }

  // Danas / City Magazine
  if (h.endsWith('danas.rs')) return 'politika';
  if (h.endsWith('citymagazine.danas.rs')) return 'lifestyle';

  // DW sr-lat / BBC srpski
  if (h.endsWith('dw.com') || h.endsWith('s.dw.com') || h.endsWith('bbci.co.uk') || h.endsWith('bbc.com')) {
    if (p.includes('/sport')) return 'sport';
    if (p.includes('/biznis') || p.includes('/ekonomija')) return 'ekonomija';
    if (p.includes('/kultura')) return 'kultura';
    if (p.includes('/tehnologija') || p.includes('/tech') || p.includes('/nauka')) return 'tech';
    if (p.includes('/svet') || p.includes('/region') || p.includes('/balkan')) return 'svet';
    return 'politika';
  }

  // Nova ekonomija / Biznis.rs
  if (h.endsWith('novaekonomija.rs') || h.endsWith('biznis.rs')) return 'ekonomija';

  // PC Press / Startit
  if (h.endsWith('pcpress.rs') || h.endsWith('startit.rs')) return 'tech';

  // MONDO
  if (h.endsWith('mondo.rs')) {
    if (p.startsWith('/rss/644') || p.includes('/sport')) return 'sport';
    if (p.includes('/zabava') || p.includes('/lifestyle')) return 'lifestyle';
    if (p.includes('/kultura')) return 'kultura';
    return 'zanimljivosti';
  }

  // Kurir
  if (h.endsWith('kurir.rs')) {
    if (p.includes('/hronika')) return 'hronika';
    if (p.includes('/sport')) return 'sport';
    if (p.includes('/biznis') || p.includes('/ekonomija')) return 'ekonomija';
    if (p.includes('/zabava') || p.includes('/stil')) return 'lifestyle';
    if (p.includes('/svet') || p.includes('/region')) return 'svet';
    return 'politika';
  }

  // Blic
  if (h.endsWith('blic.rs') || h.endsWith('static.blic.rs')) {
    if (p.includes('/sport')) return 'sport';
    if (p.includes('/vesti/hronika') || p.includes('/hronika')) return 'hronika';
    if (p.includes('/biznis') || p.includes('/ekonomija')) return 'ekonomija';
    if (p.includes('/kultura')) return 'kultura';
    if (p.includes('/svet') || p.includes('/region')) return 'svet';
    if (p.includes('/zabava') || p.includes('/slobodno-vreme') || p.includes('/zdravlje') || p.includes('/slatko-slano')) return 'lifestyle';
    return 'politika';
  }

  // Vreme
  if (h.endsWith('vreme.com')) {
    if (p.includes('/kultura')) return 'kultura';
    return 'politika';
  }

  // fallback
  return null;
}

/** Reči po kategorijama (meki signal) */
const KW: Record<Exclude<Cat,'nepoznato'>, RegExp[]> = {
  politika: [
    /\b(vlada|skupstina|predsednik|ministar|izbori|opozicija|koalicija|resor)\b/i,
  ],
  ekonomija: [
    /\b(bdp|inflacija|kamat|berza|privreda|ekonomija|investic|porez|plate|budzet|subvenc)\b/i,
  ],
  sport: [
    /\b(sport|fudbal|kosarka|tenis|derbi|lig(a|e)|turnir|reprezentacija|zvezda|partizan|novak|djokovi[ck])\b/i,
  ],
  kultura: [
    /\b(kultura|film|pozoriste|knjig|izlozb|festival|muzej)\b/i,
  ],
  lifestyle: [
    /\b(lifestyle|zabava|stil|moda|zdravlje|ishran|horoskop|psiholog|wellness)\b/i,
  ],
  tech: [
    /\b(tehnolog|tech|it|ai|softver|hardver|telefon|aplikacij|gadget|internet|bezbednost|cyber)\b/i,
  ],
  hronika: [
    /\b(hronika|uhaps|hapsenj|ubistv|saobracajn|nesrec|sudjenj|optuzeni|istrag|poz(ar|g))\b/i,
  ],
  svet: [
    /\b(svet|eu|un|nato|region|balkan|globalno|geopolit|ukrajina|rusija|sad|kina)\b/i,
  ],
  zanimljivosti: [
    /\b(zanimljiv|neob(icn|ično)|viral|trend|bizarno|kuriozitet)\b/i,
  ],
};

function byKeywords(title?: string, url?: string): Cat | null {
  const t = norm(title);
  const u = norm(url);

  // prvo sport/tech/hronika
  if (KW.sport.some(rx => rx.test(t) || rx.test(u))) return 'sport';
  if (KW.tech.some(rx => rx.test(t) || rx.test(u))) return 'tech';
  if (KW.hronika.some(rx => rx.test(t) || rx.test(u))) return 'hronika';

  // zatim ekonomija/svet/kultura/lifestyle
  if (KW.ekonomija.some(rx => rx.test(t) || rx.test(u))) return 'ekonomija';
  if (KW.svet.some(rx => rx.test(t) || rx.test(u))) return 'svet';
  if (KW.kultura.some(rx => rx.test(t) || rx.test(u))) return 'kultura';
  if (KW.lifestyle.some(rx => rx.test(t) || rx.test(u))) return 'lifestyle';

  // fallback politika/zanimljivosti
  if (KW.politika.some(rx => rx.test(t) || rx.test(u))) return 'politika';
  if (KW.zanimljivosti.some(rx => rx.test(t) || rx.test(u))) return 'zanimljivosti';

  return null;
}

export function classifyTitle(title: string, url?: string): Cat {
  const byDom = byDomainPath(url);
  if (byDom) return byDom;

  const byKw = byKeywords(title, url);
  if (byKw) return byKw;

  return 'nepoznato';
}
