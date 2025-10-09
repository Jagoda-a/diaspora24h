// app/politika-privatnosti/page.tsx

export const metadata = {
  title: 'Politika privatnosti — Diaspora24h',
  description:
    'Politika privatnosti Diaspora24h: koje podatke prikupljamo, pravni osnov, GDPR/EU prava, kolačići, čuvanje i bezbednost podataka.',
}

export default function PolitikaPrivatnostiPage() {
  const lastUpdated = '09.10.2025' // izmeni po potrebi (dd.mm.gggg)

  return (
    <main className="container" style={{ padding: 16 }}>
      <header style={{ margin: '8px 0 18px' }}>
        <h1 style={{ margin: 0, lineHeight: 1.2 }}>Politika privatnosti</h1>
        <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 16 }}>
          Datum poslednje izmene: {lastUpdated}
        </p>
      </header>

      <section
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 16,
          marginTop: 12,
          display: 'grid',
          gap: 12,
        }}
      >
        <p>
          Dobro došli na <strong>Diaspora24h</strong>. Ova Politika privatnosti objašnjava kako
          prikupljamo, koristimo, delimo i štitimo vaše podatke. Primjenjuje se na sve posetioce
          i korisnike našeg sajta, uključujući korisnike iz Srbije, Evropske unije/EEA (npr.
          Nemačka, Austrija) i Švajcarske.
        </p>

        <h2 style={{ fontSize: 18, margin: 0 }}>Ko smo i kontakt</h2>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          <li><strong>Kontrolor podataka:</strong> Diaspora24h</li>
          <li><strong>Adresa:</strong> Novi Sad, Srbija</li>
          <li><strong>Email:</strong> <a href="mailto:redakcija@diaspora24h.com">redakcija@diaspora24h.com</a></li>
        </ul>

        <h2 style={{ fontSize: 18, margin: 0 }}>Obim primene (Srbija, EU/EEA i Švajcarska)</h2>
        <p>
          Obrada podataka se vrši u skladu sa važećim propisima u Srbiji (Zakon o zaštiti podataka o
          ličnosti) i, kada je primenljivo, Opštom uredbom o zaštiti podataka
          <em> (GDPR)</em> za korisnike u EU/EEA, kao i relevantnim pravilima Švajcarske.
          Ova politika je namenjena da obezbedi transparentnost prema svim korisnicima.
        </p>

        <h2 style={{ fontSize: 18, margin: 0 }}>Podaci koje prikupljamo</h2>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          <li><strong>Kontakt podaci</strong> (npr. email adresa i sadržaj poruke kada nam pišete).</li>
          <li><strong>Tehnički podaci</strong> (IP adresa, tip uređaja/pregledača, URL-ovi stranica, vreme pristupa).</li>
          <li><strong>Kolačići i slične tehnologije</strong> — detalji u <a href="/cookies">Politici kolačića</a>.</li>
        </ul>
        <p>Ne tražimo niti svesno obrađujemo posebne kategorije podataka (npr. zdravstveni podaci).</p>

        <h2 style={{ fontSize: 18, margin: 0 }}>Svrhe i pravni osnov obrade</h2>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          <li><strong>Odgovor na upite</strong> i komunikacija sa korisnicima (pravni osnov: legitimni interes / ugovor). </li>
          <li><strong>Analitika i unapređenje sajta</strong> (legitimni interes). </li>
          <li><strong>Ispunjavanje pravnih obaveza</strong> kada je primenljivo (pravna obaveza). </li>
          <li><strong>Marketing poruke</strong> isključivo uz vaš <em>pristanak</em> (ako ih uvedemo kao opciju). </li>
        </ul>

        <h2 style={{ fontSize: 18, margin: 0 }}>Deljenje podataka</h2>
        <p>
          Ne prodajemo podatke. Možemo ih podeliti sa provajderima (obrađivačima) koji nam pružaju
          usluge hostinga, email-a, analitike ili zaštite — isključivo prema ugovoru o obradi i našim
          instrukcijama. Podatke možemo otkriti ako je neophodno za ispunjenje zakonske obaveze.
        </p>

        <h2 style={{ fontSize: 18, margin: 0 }}>Kolačići</h2>
        <p>
          Koristimo neophodne kolačiće za funkcionisanje sajta i, po potrebi, analitičke kolačiće.
          Detaljno objašnjenje (vrste, trajanje i kontrola) nalazi se u <a href="/cookies">Politici kolačića</a>.
          Za analitičke/nenužne kolačiće za korisnike iz EU/EEA obezbedićemo izbor pristanka.
        </p>

        <h2 style={{ fontSize: 18, margin: 0 }}>Međunarodni transferi</h2>
        <p>
          Ako dođe do prenosa podataka van Srbije/EU/Švajcarske, primenićemo odgovarajuće mere
          (npr. standardne ugovorne klauzule ili ekvivalent) kako bismo zaštitili vaše podatke.
        </p>

        <h2 style={{ fontSize: 18, margin: 0 }}>Rokovi čuvanja</h2>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          <li>Kontakt poruke: tipično 1–3 godine.</li>
          <li>Tehnički/analitički logovi: do 3 godine.</li>
          <li>Duže čuvanje kada to nalaže zakon.</li>
        </ul>

        <h2 style={{ fontSize: 18, margin: 0 }}>Vaša prava</h2>
        <p>U skladu sa važećim propisima, možete imati sledeća prava:</p>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          <li>pravo na pristup i dobijanje kopije podataka,</li>
          <li>pravo na ispravku i/ili brisanje,</li>
          <li>pravo na ograničenje obrade, prenosivost,</li>
          <li>pravo na prigovor (posebno kod obrade po legitimnom interesu),</li>
          <li>pravo na opoziv pristanka (kada je osnova pristanak).</li>
        </ul>
        <p>
          Zahtev možete poslati na <a href="mailto:redakcija@diaspora24h.com">redakcija@diaspora24h.com</a>.
          Ako smatrate da je došlo do povrede prava, možete uložiti pritužbu Povereniku za informacije
          od javnog značaja i zaštitu podataka o ličnosti (RS), nadležnom nadzornom organu EU države u kojoj boravite,
          ili nadležnom organu u Švajcarskoj.
        </p>

        <h2 style={{ fontSize: 18, margin: 0 }}>Bezbednost podataka</h2>
        <p>
          Primenujemo tehničke i organizacione mere (HTTPS, ograničenja pristupa, ažuriranja, backup).
          Iako nastojimo da zaštitimo podatke, nijedan sistem nije 100% siguran.
        </p>

        <h2 style={{ fontSize: 18, margin: 0 }}>Deca</h2>
        <p>
          Sajt nije namenjen deci mlađoj od 16 godina. Ne obrađujemo svesno podatke dece; ako
          smatrate da smo greškom prikupili takve podatke, pišite nam radi brisanja.
        </p>

        <h2 style={{ fontSize: 18, margin: 0 }}>Izmene politike</h2>
        <p>
          Zadržavamo pravo izmene ove Politike privatnosti. Ažurirana verzija biće objavljena na ovoj
          stranici sa datumom poslednje izmene.
        </p>

        <h2 style={{ fontSize: 18, margin: 0 }}>Kontakt</h2>
        <p>
          Za sva pitanja o ovoj politici, obratite se na{' '}
          <a href="mailto:redakcija@diaspora24h.com">redakcija@diaspora24h.com</a>.
        </p>
      </section>
    </main>
  )
}
