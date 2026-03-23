export default function PolitykaPrywatnosci() {
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
          Polityka Prywatności
        </h1>
        <p className="mt-2 text-muted-foreground">
          Ostatnia aktualizacja: {new Date().toLocaleDateString("pl-PL")}
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/80">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              1. Administrator danych
            </h2>
            <p>
              Administratorem danych osobowych jest [Twoje imię i nazwisko /
              nazwa firmy], z siedzibą w [miasto], Polska. Kontakt:
              kontakt@listingo.pl
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              2. Jakie dane zbieramy
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Dane konta:</strong> imię i nazwisko, adres email, hasło
                (zaszyfrowane)
              </li>
              <li>
                <strong>Dane produktów:</strong> nazwy produktów, cechy,
                kategorie (podawane przez Użytkownika do generowania opisów)
              </li>
              <li>
                <strong>Dane techniczne:</strong> adres IP, typ przeglądarki,
                czas wizyty
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              3. Cel przetwarzania
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Świadczenie usługi generowania opisów</li>
              <li>Zarządzanie kontem użytkownika</li>
              <li>Obsługa płatności</li>
              <li>Komunikacja z Użytkownikiem</li>
              <li>Poprawa jakości usługi</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              4. Przekazywanie danych
            </h2>
            <p>
              Dane produktów są przesyłane do OpenAI (USA) w celu generowania
              opisów. OpenAI przetwarza dane zgodnie z ich polityką prywatności.
              Dane płatności obsługuje Stripe (USA/EU). Baza danych
              przechowywana jest w Supabase (EU — Frankfurt).
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              5. Prawa użytkownika (RODO)
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Prawo dostępu do danych</li>
              <li>Prawo do sprostowania danych</li>
              <li>
                Prawo do usunięcia danych (&quot;prawo do bycia zapomnianym&quot;)
              </li>
              <li>Prawo do przenoszenia danych</li>
              <li>Prawo do sprzeciwu wobec przetwarzania</li>
            </ul>
            <p className="mt-2">
              Aby skorzystać z tych praw, napisz na: kontakt@listingo.pl
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              6. Cookies
            </h2>
            <p>
              Serwis używa plików cookies niezbędnych do działania (sesja
              logowania). Nie używamy cookies reklamowych ani śledzących.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              7. Okres przechowywania
            </h2>
            <p>
              Dane przechowywane są przez czas korzystania z Serwisu. Po
              usunięciu konta dane są trwale usuwane w ciągu 30 dni.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
