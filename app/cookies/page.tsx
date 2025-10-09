// app/cookies/page.tsx

export const metadata = {
  title: 'Politika kolačića — Diaspora24h',
  description:
    'Saznajte koje kolačiće koristimo na Diaspora24h, zašto ih koristimo, koliko traju i kako možete kontrolisati njihovu upotrebu u skladu sa GDPR i lokalnim propisima.',
}

export default function PolitikaKolacicaPage() {
  const lastUpdated = '09.10.2025'

  return (
    <main className="container" style={{ padding: 16 }}>
      <header style={{ margin: '8px 0 18px' }}>
        <h1 style={{ margin: 0, lineHeight: 1.2 }}>Politika kolačića</h1>
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
          Ova Politika kolačića objašnjava šta su kolačići, koje tipove koristimo na sajtu{' '}
          <strong>Diaspora24h</strong>, u koje svrhe, koliko dugo ih čuvamo i kako možete
          upravljati svojim izborom pristanka u skladu sa važećim zakonima (Zakon o zaštiti podataka
          o ličnosti Republike Srbije i <em>GDPR</em> za korisnike iz EU/EEA i Švajcarske).
        </p>

        <h2 style={{ fontSize: 18, margin: 0 }}>Šta su kolačići?</h2>
        <p>
          Kolačići su male tekstualne datoteke koje se čuvaju na vašem uređaju kada posetite
          veb-sajt. Oni omogućavaju pravilno funkcionisanje sajta, poboljšanje performansi i analizu
          poseta, kao i pamćenje vaših podešavanja.
        </p>

        <h2 style={{ fontSize: 18, margin: 0 }}>Vrste kolačića koje koristimo</h2>

        <h3 style={{ fontSize: 16, margin: '4px 0 0' }}>a) Neophodni kolačići</h3>
        <p>
          Ovi kolačići su ključni za rad sajta i ne mogu se isključiti u našim sistemima. Obično se
          postavljaju samo kao odgovor na vaše akcije (npr. prijava, podešavanje jezika, prihvatanje
          kolačića).
        </p>

        <h3 style={{ fontSize: 16, margin: '4px 0 0' }}>b) Analitički / statistički kolačići</h3>
        <p>
          Ovi kolačići nam pomažu da razumemo kako korisnici koriste naš sajt (npr. koje stranice su
          najposećenije) i služe za poboljšanje performansi. Koristimo alate kao što su Google
          Analytics (uz IP anonimizaciju). Ovi kolačići se postavljaju samo uz vaš pristanak.
        </p>

        <h3 style={{ fontSize: 16, margin: '4px 0 0' }}>c) Marketinški i oglasni kolačići</h3>
        <p>
          Ovi kolačići prate vaše aktivnosti radi prikazivanja relevantnih oglasa. Mogu ih postavljati
          naši partneri (npr. Google AdSense). Ovi kolačići se aktiviraju samo ako date saglasnost
          putem banera.
        </p>

        <h3 style={{ fontSize: 16, margin: '4px 0 0' }}>d) Funkcionalni kolačići</h3>
        <p>
          Omogućavaju pamćenje vaših izbora (npr. jezik, tema — svetla/tamna). Ne prikupljaju lične
          podatke koji bi mogli da vas identifikuju direktno.
        </p>

        <h2 style={{ fontSize: 18, margin: 0 }}>Tabela tipičnih kolačića</h2>
        <table
          style={{
            borderCollapse: 'collapse',
            width: '100%',
            fontSize: 14,
            marginTop: 4,
            border: '1px solid var(--border)',
          }}
        >
          <thead>
            <tr style={{ background: 'var(--surface-weak)' }}>
              <th style={{ textAlign: 'left', padding: 8 }}>Naziv</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Svrha</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Vrsta</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Trajanje</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: 8 }}>theme</td>
              <td style={{ padding: 8 }}>Pamti izabranu temu (svetla/tamna)</td>
              <td style={{ padding: 8 }}>Funkcionalni</td>
              <td style={{ padding: 8 }}>1 godina</td>
            </tr>
            <tr>
              <td style={{ padding: 8 }}>__ga, __gid</td>
              <td style={{ padding: 8 }}>Analitika poseta putem Google Analytics</td>
              <td style={{ padding: 8 }}>Analitički</td>
              <td style={{ padding: 8 }}>do 2 godine</td>
            </tr>
            <tr>
              <td style={{ padding: 8 }}>ads/ga-audiences</td>
              <td style={{ padding: 8 }}>Praćenje konverzija i prilagođavanje oglasa (Google Ads)</td>
              <td style={{ padding: 8 }}>Marketinški</td>
              <td style={{ padding: 8 }}>do 6 meseci</td>
            </tr>
          </tbody>
        </table>

        <h2 style={{ fontSize: 18, margin: 0 }}>Pravna osnova</h2>
        <p>
          - Za <strong>neophodne kolačiće</strong>: legitimni interes (funkcionisanje sajta).<br />
          - Za <strong>analitičke</strong> i <strong>marketinške kolačiće</strong>: pristanak korisnika
          u skladu sa članom 6(1)(a) GDPR i članom 12 Zakona o zaštiti podataka o ličnosti RS.
        </p>

        <h2 style={{ fontSize: 18, margin: 0 }}>Davanje i povlačenje pristanka</h2>
        <p>
          Kada prvi put posetite naš sajt, videćete baner za kolačiće. Možete prihvatiti sve kolačiće
          ili prilagoditi svoj izbor. Pristanak možete u svakom trenutku povući klikom na „Postavke
          kolačića“ u podnožju sajta ili brisanjem kolačića iz pregledača.
        </p>

        <h2 style={{ fontSize: 18, margin: 0 }}>Kako da obrišete ili blokirate kolačiće</h2>
        <p>
          Možete ručno obrisati kolačiće u podešavanjima svog pregledača:
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
          <li><a href="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
          <li><a href="https://support.apple.com/en-us/HT201265" target="_blank" rel="noopener noreferrer">Safari</a></li>
          <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
        </ul>

        <h2 style={{ fontSize: 18, margin: 0 }}>Treće strane i međunarodni prenosi</h2>
        <p>
          Neki kolačići potiču od trećih strana (npr. Google, Meta). Obrada može uključivati prenos
          podataka van Srbije ili EU, u skladu sa <em>Standardnim ugovornim klauzulama</em> (SCC)
          koje je odobrila Evropska komisija i drugim mehanizmima zaštite podataka.
        </p>

        <h2 style={{ fontSize: 18, margin: 0 }}>Bezbednost i privatnost</h2>
        <p>
          Kolačići ne sadrže poverljive informacije poput lozinki ili ličnih podataka. Ipak, svi
          podaci koji se obrađuju putem kolačića tretiraju se u skladu sa našom{' '}
          <a href="/politika-privatnosti">Politikom privatnosti</a>.
        </p>

        <h2 style={{ fontSize: 18, margin: 0 }}>Izmene politike</h2>
        <p>
          Možemo povremeno ažurirati ovu Politiku kolačića. Sve izmene biće objavljene na ovoj
          stranici sa datumom poslednje izmene. Preporučujemo da povremeno proverite ovu stranicu.
        </p>

        <h2 style={{ fontSize: 18, margin: 0 }}>Kontakt</h2>
        <p>
          Za sva pitanja ili zahteve u vezi sa kolačićima i privatnošću obratite nam se na{' '}
          <a href="mailto:redakcija@diaspora24h.com">redakcija@diaspora24h.com</a>.
        </p>
      </section>
    </main>
  )
}
