// app/uslovi-koriscenja/page.tsx

export const metadata = {
  title: 'Uslovi korišćenja — Diaspora24h',
  description:
    'Uslovi korišćenja Diaspora24h: prihvatanje uslova, dozvoljena upotreba, intelektualna svojina, AI sadržaj, ograničenje odgovornosti, EU/GDPR napomena i nadležnost.',
}

export default function UsloviKoriscenjaPage() {
  const lastUpdated = '09.10.2025' // izmeni po potrebi

  return (
    <main className="container" style={{ padding: 16 }}>
      <header style={{ margin: '8px 0 18px' }}>
        <h1 style={{ margin: 0, lineHeight: 1.2 }}>Uslovi korišćenja</h1>
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
          Dobro došli na <strong>Diaspora24h</strong>. Korišćenjem ovog sajta potvrđujete da ste
          pročitali i prihvatili ove Uslove korišćenja, kao i Politiku privatnosti i Politiku
          kolačića. Ako se ne slažete sa nekim delom, molimo vas da ne koristite sajt.
        </p>

        <h2 style={{ fontSize: 18, margin: 0 }}>1) Definicije</h2>
        <p>
          “Sajt” označava diaspora24h.com; “mi”/“nas” je operater sajta; “korisnik” je svaka osoba
          koja pristupa ili koristi sajt.
        </p>

        <h2 style={{ fontSize: 18, margin: 0 }}>2) Izmene</h2>
        <p>
          Zadržavamo pravo izmene Uslova. Promene važe od objave na sajtu. Vaše dalje korišćenje
          smatra se prihvatanjem izmenjenih uslova.
        </p>

        <h2 style={{ fontSize: 18, margin: 0 }}>3) Dozvoljena upotreba</h2>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          <li>koristiti sajt u skladu sa važećim propisima i ovim Uslovima;</li>
          <li>ne ugrožavati bezbednost ili funkcionalnost sajta (npr. DDoS, malware, scraping bez dozvole);</li>
          <li>ne narušavati prava trećih lica (autorska prava, privatnost, ugled);</li>
          <li>ne pokušavati neovlašćen pristup sistemima ili podacima.</li>
        </ul>

        <h2 style={{ fontSize: 18, margin: 0 }}>4) Sadržaj i intelektualna svojina</h2>
        <p>
          Sav sadržaj (tekst, grafika, logo, dizajn, kod) zaštićen je autorskim i srodnim pravima.
          Citiranje je dozvoljeno uz jasno navođenje izvora i link do stranice. Sistematsko
          preuzimanje i redistribucija bez dozvole nije dozvoljena.
        </p>

        <h2 style={{ fontSize: 18, margin: 0 }}>5) AI sadržaj i izvori</h2>
        <p>
          Deo sadržaja može biti kreiran uz pomoć alata veštačke inteligencije, uz ljudsku proveru.
          Trudimo se da informacije budu tačne i ažurne, ali ne garantujemo potpunu tačnost i
          potpunost; preporučujemo da proverite ključne informacije u originalnim izvorima.
        </p>

        <h2 style={{ fontSize: 18, margin: 0 }}>6) Linkovi trećih strana</h2>
        <p>
          Linkovi ka eksternim sajtovima služe za informisanje. Nemamo kontrolu nad njihovim
          sadržajem/politikama i ne preuzimamo odgovornost za štete nastale njihovim korišćenjem.
        </p>

        <h2 style={{ fontSize: 18, margin: 0 }}>7) Oglasi i sponzorisani sadržaji</h2>
        <p>
          Sajt može prikazivati oglase i sponzorisane sadržaje. Interakcija sa oglasima podrazumeva
          odnos sa trećom stranom — primenjuju se uslovi i politike te treće strane.
        </p>

        <h2 style={{ fontSize: 18, margin: 0 }}>8) Odricanje od garancija</h2>
        <p>
          Sajt i sadržaj se pružaju “takvi kakvi jesu” i “kako su dostupni”. Ne dajemo garancije
          bilo koje vrste; ne garantujemo neprekidnost rada ili odsustvo grešaka.
        </p>

        <h2 style={{ fontSize: 18, margin: 0 }}>9) Ograničenje odgovornosti</h2>
        <p>
          U meri dozvoljenoj zakonom, ne odgovaramo za indirektne, slučajne ili posledične štete,
          propuštenu dobit ili gubitak podataka, niti za rad eksternih servisa do kojih vodimo link.
        </p>

        <h2 style={{ fontSize: 18, margin: 0 }}>10) Naknada štete</h2>
        <p>
          Obavezujete se da nas obeštetite za potraživanja trećih lica nastala vašim kršenjem ovih
          Uslova ili važećih propisa.
        </p>

        <h2 style={{ fontSize: 18, margin: 0 }}>11) Pravo koje se primenjuje i nadležnost</h2>
        <p>
          Na ove Uslove primenjuje se pravo Republike Srbije. Za rešavanje sporova nadležan je sud u
          Novom Sadu, osim ako je kogentnim normama propisana druga nadležnost.
        </p>

        <h2 style={{ fontSize: 18, margin: 0 }}>12) Napomena za korisnike iz EU/EEA i drugih zemalja</h2>
        <p>
          Za korisnike koji se nalaze u EU/EEA, Švajcarskoj ili bilo kojoj drugoj zemlji sa važećim propisima o zaštiti podataka, obrada ličnih podataka vrši se u
          skladu sa <em>GDPR</em> i relevantnim lokalnim propisima. Vaša prava u vezi sa podacima
          (pristup, ispravka, brisanje, ograničenje, prenosivost, prigovor, opoziv pristanka) opisana
          su u našoj <a href="/politika-privatnosti">Politici privatnosti</a>.
        </p>

        <h2 style={{ fontSize: 18, margin: 0 }}>13) Kontakt</h2>
        <p>
          Za pitanja u vezi sa ovim Uslovima obratite se na{' '}
          <a href="mailto:redakcija@diaspora24h.com">redakcija@diaspora24h.com</a>.
        </p>
      </section>
    </main>
  )
}
