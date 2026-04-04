import { getPlatformProfile } from "@/lib/platforms"

/** Czy longDescription w profilu to plain text (bez HTML). */
export function isLongDescriptionPlainText(platformSlug: string): boolean {
  return getPlatformProfile(platformSlug).descriptionFormat === "plain_text"
}

/**
 * Wskazówki „boost sprzedaży” dopasowane do kanału — te same zasady co Allegro
 * (konwersja, skanowalność, zero halucynacji), z regułami specyficznymi dla platformy.
 * Limity znaków są dokładane osobno z `RefinementOpts` (title/short/meta).
 */
export function getPlatformBoostHints(platformSlug: string): string[] {
  const slug = platformSlug || "ogolny"

  const commonEnd = [
    "Na końcu: sprawdź, czy każde pole mieści się w limitach znaków tej platformy (seoTitle, shortDescription, metaDescription, longDescription).",
  ]

  switch (slug) {
    case "allegro":
      return [
        "- Allegro: mobile-first, skanowalne sekcje (np. cechy, rozmiary jeśli są w danych); tylko fakty z NAZWY/CECH i ze zdjęcia — bez zgadywania; nie dopisuj segmentów docelowych, funkcji z samych nazw marketingowych ani parametrów „typowych dla kategorii”; bez pustych zdań o „oznaczeniach na opakowaniu” — jeśli ze zdjęcia wynika liczba/symbol, podaj ją jak fakt, nie jako narrację o etykiecie.",
        "- Allegro ≠ blog/landing: nie rozwlekaj sekcji „Dlaczego warto?” ani FAQ — jeśli już wypisałeś korzyści w liście cech, kolejna sekcja tylko domyka decyzję (krótko), bez powtarzania tych samych faktów innymi słowami; FAQ max 2–3 krótkie pary albo brak, jeśli byłoby dublowanie.",
        "- Bez superlatywów („najlepszy”, „rewolucyjny”), bez angielskich wstawek i bez linii „Materiał: nieznane”; fakt → efekt zamiast pustych haseł.",
        "- Wybierz jedną główną oś sprzedaży produktu i podporządkuj jej hook, pierwsze benefity oraz CTA; nie sprzedawaj 5 różnych obietnic naraz.",
        "- Jedna wartość liczbowa (W, A, cm, mAh itd.) — zwykle jeden raz w treści (np. w specyfikacji), nie w hooku + w każdym punkcie listy + ponownie w tabeli „dla SEO”; Allegro i tak liczy na parametry w panelu.",
        "- Dodaj jedno krótkie zdanie zmniejszające naturalną wątpliwość kupującego (dopasowanie, wygoda, praktyczność), ale tylko jeśli wynika z danych.",
        "- Tytuł w Sellerze i parametry (filtry) osobno — w opisie nie wymyślaj parametrów spoza danych; treść raczej zwięzła niż rozlana (~20–30% krócej niż typowy „lanie wody” przy tych samych faktach).",
        "- Bez linków zewnętrznych i bez fikcyjnych obietnic.",
        ...commonEnd,
      ]
    case "amazon":
      return [
        "- Amazon: seoTitle jak tytuł listingu — bez WIELKICH LITER w całości; unikaj ~ ! * $ ? _ w tytule; najważniejsza fraza i marka na początku (w apce widać często tylko początek).",
        "- shortDescription: styl 5 Bullet Points — każdy punkt od KORZYŚCI dla klienta, konkret z danych; nie kopiuj 1:1 tytułu.",
        "- longDescription: HTML pod konwersję i Google; nie obiecuj A+ ani backend keywords — skup się na czytelnej treści z danych.",
        "- tags (w JSON): traktuj jak Search Terms — synonimy i long-tail, bez powielania słów z tytułu i bulletów.",
        ...commonEnd,
      ]
    case "shopify":
      return [
        "- Shopify (DTC): priorytet konwersja (CR) + SEO w Google; treść pod kartę produktu i mobile — krótkie sekcje, nagłówki, listy.",
        "- Ekspert direct-response: język korzyści i efektu dla klienta; zero „ładnego opisu” bez sprzedaży.",
        "- Tytuł SEO + meta description + treść strony = spójny zestaw fraz; URL handle w Shopify rośnie z tytułu — nie rozdmuchuj nazwy bez potrzeby.",
        "- Rich HTML (h2, listy) pod Rich Results / czytelność; nie dodawaj linków zewnętrznych ani danych spoza NAZWY i CECH.",
        "- metaDescription: trzymaj się limitu z profilu — Google obcina długi snippet.",
        ...commonEnd,
      ]
    case "woocommerce":
      return [
        "- WooCommerce: shortDescription = treść pod ceną (krótki hook + CTA); longDescription = pełny HTML do edytora (h2, listy).",
        "- Nie wstawiaj shortcodes wtyczek, jeśli użytkownik ich nie podał.",
        ...commonEnd,
      ]
    case "ebay":
      return [
        "- eBay: tytuł max jak w profilu — keyword na starcie; unikaj powtórzeń tego samego słowa (Cassini).",
        "- Opis HTML bez JavaScript, bez zewnętrznych assetów; Item Specifics uzupełnia się w formularzu — nie wymyślaj MPN/EAN.",
        ...commonEnd,
      ]
    case "etsy":
      return [
        "- Etsy: tytuł — Big Three na początku; separatory | lub , dla skanowalności; opis LONG = plain text (bez HTML), pierwsze zdania = mocny hook.",
        "- Tagi: dokładnie 13, każdy max 20 znaków — pokryj frazy z tytułu i synonimy (w JSON jako tablica tags).",
        ...commonEnd,
      ]
    case "vinted":
      return [
        "- Vinted: ton na „Ty”, krótko i uczciwie; na końcu longDescription dodaj 5–8 hashtagów (#...) w jednej linii lub bloku — zgodnie z danymi.",
        "- Bez HTML; skup się na stanie, rozmiarze, materiale, ewentualnych wadach.",
        ...commonEnd,
      ]
    case "empikplace":
      return [
        "- Empik Place: styl premium — bez CAPS LOCK i bez nadmiaru wykrzykników w tytule; spójność parametrów z cechami (nie rozjeżdżaj danych).",
        "- Opis HTML semantyczny (np. h3, listy) pod czytelność.",
        ...commonEnd,
      ]
    case "olx":
      return [
        "- OLX: tytuł krótki i konkretny; opis = plain text (HTML się nie renderuje — nie używaj znaczników).",
        "- Jasno: stan, ewentualnie odbiór/wysyłka jeśli wynika z danych — bez linków zewnętrznych.",
        ...commonEnd,
      ]
    case "ogolny_plain":
      return [
        "- Ogólny (tekst): całość bez HTML; sekcje jako nagłówki tekstowe lub CAPS + pusta linia; listy od myślnika lub numeracji.",
        ...commonEnd,
      ]
    case "ogolny":
    default:
      return [
        "- Format ogólny: HTML z nagłówkami i listami; przed publikacją dopasuj limity do docelowej platformy.",
        ...commonEnd,
      ]
  }
}

/**
 * Sekcje longDescription + mapowanie pozostałych pól dla „Dopracuj do 100”.
 * Dla Shopify: pełna struktura DTC zgodna z direct-response + SEO (PL).
 */
export function getLongDescriptionStructureInstruction(
  platformSlug: string,
  isPlainTextLong: boolean
): string[] {
  if (platformSlug === "allegro" && !isPlainTextLong) {
    return [
      "=== STRUKTURA ALLEGRO (HTML, mobile-first) ===",
      "Pierwszy <p>: hook (max 2 zdania) oparty o jedną główną obietnicę sprzedażową. Potem sekcje h2 zgodnie z KONTEKSTEM ALLEGRO w system prompt: np. „🔹 Najważniejsze cechy” + ul/li (fakt → efekt); opcjonalnie „📏 Rozmiary / warianty”, „🏠 Zastosowanie”, „🔧 Specyfikacja”; „📦 Zawartość zestawu” tylko przy zestawie/komplecie w danych — nie wymuszaj „Co otrzymujesz?” przy jednej sztuce; dodaj jedno krótkie zdanie redukujące obiekcję kupującego; bez sekcji „lepszy niż inne”, bez „nieznane” jako treści, bez angielskich wstawek; zwięzłość.",
    ]
  }

  if (platformSlug === "shopify") {
    return [
      "=== STRUKTURA SHOPIFY DTC / direct-response (OBOWIĄZKOWA) ===",
      "Rola: ekspert e-commerce i copywriter DTC pod Shopify — maksymalizacja konwersji (CR) i SEO w Google. Język: polski.",
      "WEJŚCIE: wyłącznie NAZWA PRODUKTU i CECHY z formularza (+ ton marki jeśli jest w danych). Nie dopisuj funkcji, certyfikatów ani liczb spoza tych danych.",
      "",
      "ZASADY KRYTYCZNE:",
      "- ZERO HALUCYNACJI — tylko to, co wynika z wejścia.",
      "- Pisz pod SPRZEDAŻ (korzyści, efekt dla klienta), nie pod „ładny esej”.",
      "- KONKRET > OGÓLNIKI — liczby i fakty tylko jeśli są w cechach; unikaj pustych fraz („wysoka jakość”).",
      "- Czytelność = konwersja: krótkie sekcje, nagłówki, listy (struktura pod motyw Shopify i mobile).",
      "- SEO naturalne: główne słowo kluczowe w tytule i na początku opisu; long-tail osadź naturalnie — bez upychania.",
      "",
      "Mapowanie pól JSON (odpowiedź to JSON, nie markdown — w longDescription używaj HTML, nie ###):",
      "- seoTitle: tytuł SEO produktu w limicie znaków profilu (~70 zn.) — keyword + konkret + kąt sprzedażowy.",
      "- shortDescription: tylko HOOK (2–3 zdania): problem/potrzeba klienta lub efekt/transformacja; zmieścić w limicie skrótu; nie duplikuj 1:1 tytułu.",
      "- longDescription: HTML: <h2>, <p>, <ul><li>, <strong>. Kolejność sekcji:",
      "  1) <h2>Kluczowe korzyści</h2> — 3–5 punktów w <ul>; każdy: co to daje użytkownikowi (w treści punktu możesz użyć ✔ jako prefiksu).",
      "  2) <h2>Dlaczego ten produkt?</h2> — wyróżnienie vs inne rozwiązania (tylko na podstawie danych).",
      "  3) <h2>Co dostajesz?</h2> — konkretne elementy / funkcje / zawartość jeśli wynika z cech.",
      "  4) <h2>Specyfikacja techniczna</h2> — uporządkowana lista parametrów z cech.",
      "  5) <h2>Dla kogo?</h2> — grupa docelowa i scenariusze zgodne z danymi.",
      "  6) <h2>Wezwanie do działania</h2> — mocne CTA pod zakup (korzyść + lekka pilność, bez manipulacji i fałszywych stocków).",
      "- metaDescription: ~140–155 znaków lub limit profilu — fraza SEO + zachęta do kliknięcia w SERP.",
      "- tags: 10–15 krótkich fraz (mix głównych + long-tail), każda inna sensownie.",
      "",
      "CEL: klient szybko rozumie produkt, widzi wartość, chce kliknąć „Dodaj do koszyka”.",
    ]
  }

  const sevenSectionsPlain = [
    "Dla longDescription użyj 7 sekcji w tej kolejności (nagłówki tekstowe, bez HTML):",
    "1. HOOK (1-2 zdania: konkret + efekt użytkownika + jedna myśl przewodnia sprzedaży)",
    "2. NAJWAŻNIEJSZE ZALETY (5-7 punktów: cecha -> efekt; bez dublowania tej samej korzyści innymi słowami)",
    "3. DLACZEGO TEN PRODUKT? (2-4 zdania, bez wymyślania danych)",
    "4. DO CZEGO SIĘ PRZYDA? (3-5 realnych zastosowań + ewentualnie jedno zdanie redukujące naturalną wątpliwość kupującego)",
    "5. CO OTRZYMUJESZ / ZAWARTOŚĆ ZESTAWU (jeśli dane istnieją; jeśli brak - pomiń sekcję)",
    "6. SPECYFIKACJA (uporządkowana lista parametrów)",
    "7. CTA (1-2 zdania: konkret + benefit wynikający z głównej osi sprzedaży, bez manipulacji)",
  ]

  const sevenSectionsHtml = [
    `Dla longDescription użyj 7 sekcji w tej kolejności (nagłówki h2 + listy ul/li):`,
    "1. HOOK (1-2 zdania: konkret + efekt użytkownika + jedna myśl przewodnia sprzedaży)",
    "2. NAJWAŻNIEJSZE ZALETY (5-7 punktów: cecha -> efekt; bez dublowania tej samej korzyści innymi słowami)",
    "3. DLACZEGO TEN PRODUKT? (2-4 zdania, bez wymyślania danych)",
    "4. DO CZEGO SIĘ PRZYDA? (3-5 realnych zastosowań + ewentualnie jedno zdanie redukujące naturalną wątpliwość kupującego)",
    "5. CO OTRZYMUJESZ / ZAWARTOŚĆ ZESTAWU (jeśli dane istnieją; jeśli brak - pomiń sekcję)",
    "6. SPECYFIKACJA (uporządkowana lista parametrów)",
    "7. CTA (1-2 zdania: konkret + benefit wynikający z głównej osi sprzedaży, bez manipulacji)",
  ]

  if (isPlainTextLong) {
    return ["=== STRUKTURA SPRZEDAŻOWA (OBOWIĄZKOWA) ===", ...sevenSectionsPlain]
  }

  return ["=== STRUKTURA SPRZEDAŻOWA (OBOWIĄZKOWA) ===", ...sevenSectionsHtml]
}

/** Krótkie doprecyzowanie mapowania pól JSON pod platformę (uzupełnia sekcję „MAPA PÓL”). */
export function getPlatformFieldMapHints(platformSlug: string): string[] {
  const slug = platformSlug || "ogolny"
  switch (slug) {
    case "amazon":
      return [
        "- Dla Amazon: shortDescription zapisz jako 5 osobnych akapitów (jak Bullet Points), każdy od korzyści.",
      ]
    case "etsy":
      return [
        "- Dla Etsy: longDescription = plain text; pierwsze ~160 znaków ma sensownie pełnić rolę „widocznego wstępu”.",
      ]
    case "shopify":
      return [
        "- Shopify DTC: seoTitle = meta title produktu; shortDescription = HOOK pod sklep (często nad foldem); longDescription = pełna struktura h2 z sekcji „STRUKTURA SHOPIFY”.",
        "- metaDescription = snippet Google (nie myl z polem w Shopify Admin — tu eksport/wklejka).",
        "- tags = 10–15 fraz SEO (krótkie, zróżnicowane).",
      ]
    case "olx":
      return [
        "- Dla OLX: jeśli shortDescription ma limit 0 lub nieużywane, skup się na longDescription jako jedynym opisie ogłoszenia.",
      ]
    case "vinted":
      return [
        "- Dla Vinted: hashtagi na końcu longDescription; metaDescription może być puste lub zbędne — nie wymuszaj.",
      ]
    default:
      return []
  }
}
