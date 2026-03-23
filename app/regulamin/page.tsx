export default function Regulamin() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <a
          href="/"
          className="mb-8 block text-sm text-emerald-400 hover:underline"
        >
          ← Strona główna
        </a>

        <h1 className="text-3xl font-bold text-foreground">
          Regulamin serwisu Listingo
        </h1>
        <p className="mt-2 text-muted-foreground">
          Ostatnia aktualizacja: {new Date().toLocaleDateString("pl-PL")}
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/80">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              1. Postanowienia ogólne
            </h2>
            <p>
              Serwis Listingo (dalej: Serwis) jest narzędziem do generowania
              opisów produktów e-commerce z wykorzystaniem sztucznej
              inteligencji. Właścicielem Serwisu jest [Twoje imię i nazwisko /
              nazwa firmy], z siedzibą w [miasto], Polska.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              2. Definicje
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Użytkownik</strong> — osoba korzystająca z Serwisu
              </li>
              <li>
                <strong>Konto</strong> — indywidualne konto Użytkownika w
                Serwisie
              </li>
              <li>
                <strong>Opis</strong> — treść wygenerowana przez AI na podstawie
                danych Użytkownika
              </li>
              <li>
                <strong>Kredyt</strong> — jednostka uprawniająca do wygenerowania
                jednego Opisu
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              3. Rejestracja i konto
            </h2>
            <p>
              Rejestracja wymaga podania adresu email i hasła. Użytkownik
              zobowiązuje się do podania prawdziwych danych. Jedno konto na
              osobę/firmę.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              4. Zasady korzystania
            </h2>
            <p>
              Użytkownik zobowiązuje się do korzystania z Serwisu zgodnie z
              prawem. Zabronione jest: generowanie treści niezgodnych z prawem,
              naruszających prawa osób trzecich, zawierających treści obraźliwe.
              Wygenerowane opisy stają się własnością Użytkownika.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              5. Plany i płatności
            </h2>
            <p>
              Serwis oferuje plan darmowy (Free) oraz plany płatne (Starter,
              Pro). Płatności obsługiwane są przez Stripe. Subskrypcja odnawia
              się automatycznie. Anulowanie jest możliwe w każdej chwili.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              6. Odpowiedzialność
            </h2>
            <p>
              Treści generowane przez AI mają charakter pomocniczy. Użytkownik
              ponosi odpowiedzialność za publikowane opisy. Serwis nie gwarantuje
              konkretnych wyników sprzedażowych.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              7. Kontakt
            </h2>
            <p>
              W sprawach związanych z regulaminem: kontakt@listingo.pl
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
