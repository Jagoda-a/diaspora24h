// app/o-nama/page.tsx (ili odgovarajuća ruta)

export default function ONamaPage() {
  return (
    <div className="container" style={{ padding: 16 }}>
      <header style={{ margin: '8px 0 18px' }}>
        <h1 style={{ margin: 0, lineHeight: 1.2 }}>O nama</h1>
        <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 16 }}>
          Diaspora24h je informativni portal za zajednice iz regiona koje žive širom sveta — vesti,
          priče i korisne informacije na jednom mestu.
        </p>
      </header>

      {/* Misija / šta radimo */}
      <section style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr', marginTop: 12 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Naša misija</h2>
          <p style={{ margin: 0 }}>
            Povezujemo dijasporu sa domovinom. Donosimo pregled najvažnijih tema iz regiona,
            kao i korisne informacije za život u inostranstvu: administracija, prava, posao,
            kultura i zajednica.
          </p>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Šta objavljujemo</h2>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>aktuelne vesti iz zemlje i dijaspore</li>
            <li>tematske pregled(e) i vodiče (dokumenti, boravišne dozvole, putovanja)</li>
            <li>priče i intervjue iz zajednice</li>
            <li>najave događaja i inicijativa</li>
          </ul>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Naše vrednosti</h2>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>tačnost i jasnoća informacija</li>
            <li>brzina objave uz proveru izvora</li>
            <li>poštovanje različitosti i zajednice</li>
            <li>transparentnost i otvorena komunikacija</li>
          </ul>
        </div>
      </section>

      {/* Kako radimo */}
      <section style={{ marginTop: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Kako radimo</h2>
        <p style={{ marginTop: 0 }}>
          Sadržaj nastaje prateći relevantne domaće i međunarodne izvore, zvanična saopštenja i
          informacije iz zajednice. Svaki tekst ima jasan naslov, kratki sažetak i link ka izvoru
          kada je primenljivo.
        </p>
        <p style={{ marginBottom: 0 }}>
          Ukoliko uočite grešku, pišite nam — ispravke objavljujemo brzo i jasno naznačavamo izmene.
        </p>
      </section>

      {/* Kontakt / saradnja */}
      <section style={{ marginTop: 20, display: 'grid', gap: 16, gridTemplateColumns: '1fr' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Kontakt</h2>
          <p style={{ marginTop: 0 }}>
            Imate vest, predlog ili želite da podelite priču iz dijaspore?
          </p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>E-mail: <a href="mailto:redakcija@diaspora24h.com">redakcija@diaspora24h.com</a></li>
            <li>Instagram / X / Facebook: potražite nas kao <strong>Diaspora24h</strong></li>
          </ul>
        </div>
      </section>

      {/* Pravila i napomene */}
      <section style={{ marginTop: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Napomena o sadržaju</h2>
        <p style={{ marginTop: 0 }}>
          Objave sadrže linkove ka izvorima kada je to moguće. Svi materijali i fotografije
          zaštićeni su autorskim pravima svojih vlasnika. Prenošenje sadržaja dozvoljeno je uz navođenje izvora i link.
        </p>
      </section>
    </div>
  )
}
