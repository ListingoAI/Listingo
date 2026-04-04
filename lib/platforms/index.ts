/**
 * Strukturalna baza wiedzy o platformach e-commerce.
 *
 * Każdy `PlatformProfile` opisuje reguły i limity danego marketplace'u / silnika
 * sklepowego. Dane te wstrzykiwane są do systemu promptów (opisy, social, cena)
 * i używane w UI (selecty, marquee, onboarding).
 */

export interface PlatformProfile {
  slug: string
  name: string
  icon: string
  locale: "pl" | "en" | "de" | "multi"
  titleMaxChars: number
  titlePattern: string
  descriptionFormat: "html" | "plain_text"
  charLimits: {
    shortDesc: number
    longDescMinWords: number
    metaDesc: number
  }
  requiredSections: string[]
  forbiddenPatterns: string[]
  bestPractices: string
  exampleTitle: string
  seoNotes: string
  /**
   * Zastępuje generyczną linię limitów pod wyborem platformy w UI (np. Allegro vs meta/CMS).
   * Gdy brak — UI składa linię z charLimits.
   */
  uiLimitsSummary?: string
  /** 3 krótkie punkty nad akordeonem w formularzu (tylko UI). */
  uiKeyPoints?: string[]
  /** Punktowa treść w akordeonie zamiast długiego akapitu `seoNotes` (tylko UI; `seoNotes` zostaje pod prompty API). */
  uiAccordionBullets?: string[]
  /**
   * Opcjonalna tabela porównawcza (np. Allegro) — w akordeonie „Szczegóły platformy”.
   */
  uiOfferComparison?: {
    caption?: string
    rows: { element: string; aiDoes: string; why: string }[]
  }
  /**
   * Polityka emoji — steruje zachowaniem toggleu w UI i blokami promptów.
   * - "allowed"     — pełna swoboda; toggle działa normalnie.
   * - "restricted"  — emoji dozwolone tylko w opisie (nie w tytule), np. Allegro, Amazon.
   * - "discouraged" — platforma plain-text lub formalna; emoji możliwe technicznie ale rzadko stosowane.
   */
  emojiPolicy: "allowed" | "restricted" | "discouraged"
}

// ---------------------------------------------------------------------------
// Allegro
// ---------------------------------------------------------------------------

const allegro: PlatformProfile = {
  slug: "allegro",
  name: "Allegro",
  icon: "🛒",
  locale: "pl",
  titleMaxChars: 75,
  titlePattern: "[Produkt] [Materiał/Cecha] [Wariant] | [Marka]",
  descriptionFormat: "html",
  charLimits: { shortDesc: 250, longDescMinWords: 150, metaDesc: 160 },
  requiredSections: [
    "Dlaczego warto?",
    "Specyfikacja techniczna",
  ],
  forbiddenPatterns: [
    "linki zewnętrzne (URL-e poza Allegro)",
    "adresy WWW i numery telefonów w tytule oferty",
    "tytuł w całości WIELKIMI LITERAMI (CAPS LOCK) — obniża czytelność i ryzyko odrzucenia",
    "nadmiar wykrzykników i haseł typu „PROMOCJA!!!”, „OKAZJA” bez realnej podstawy w danych",
    "dane kontaktowe (telefon, e-mail) w opisie poza dozwolonym kontekstem",
    "odniesienia do innych platform sprzedaży",
    "słowa: najtańszy, najlepszy (bez dowodu); unikaj też „oryginalny” przy markach nieweryfikowanych — ryzyko blokady",
  ],
  bestPractices: `- Tytuł oferty: max 75 znaków (limit od września 2023 r.; każdy znak się liczy). Główną frazę umieść jak najbliżej początku — to najważniejsze pole dla wyszukiwarki Allegro.
- Parametry oferty (atrybuty): krytyczne dla filtrów. Jeśli np. kolor jest tylko w opisie HTML, a nie w parametrach, oferta może nie przejść filtrowania — opis NIE zastępuje parametrów.
- Opis HTML: służy konwersji (przekonanie do zakupu) oraz SEO w Google. Przy domyślnym sortowaniu po Trafności treść opisu nie indeksuje oferty w Allegro tak jak tytuł i parametry — nie obiecuj kupującemu, że „słowa kluczowe w opisie” podniosą pozycję w wyszukiwarce Allegro.
- Long-tail pod Allegro: umieszczaj frazy w 75-znakowym tytule i w odpowiednich parametrach — nie polegaj wyłącznie na powtarzaniu fraz w opisie pod „SEO Allegro”.
- Opis: HTML z typowym zestawem edytora (nagłówki h2/h3, akapity p, listy ul/li, wyróżnienia strong). Unikaj zbędnego h1 i skomplikowanych layoutów — czytelność na mobile ma priorytet.
- Unikaj keyword stuffing w tytule i opisie; naturalny język korzyści.
- Nie powielaj w opisie tych samych liczb i jednostek (np. moc, prąd, wymiary) w wielu sekcjach „dla SEO” — filtry Allegro biorą się głównie z parametrów w formularzu; w opisie wystarczy jedna spójna wzmianka na fakt.
- Nie wymuszaj osobnej sekcji „Co otrzymujesz?” przy pojedynczym produkcie — nagłówek typu zawartość zestawu ma sens tylko dla kompletu/zestawu z wieloma elementami w danych.
- CTA w opisie OK („Dodaj do koszyka") — zgodnie z regulaminem oferty.`,
  exampleTitle: "Plecak Turystyczny 50L Wodoodporny | HikePro",
  seoNotes:
    "W Allegro dla wyszukiwarki wewnętrznej najważniejsze są tytuł oferty (75 zn.) oraz parametry (filtry). Opis HTML wspiera sprzedaż i może pomagać w widoczności w Google, ale nie zastępuje uzupełnionych parametrów. Google zwykle sam dobiera snippet z tytułu strony i treści oferty; Allegro nie udostępnia osobnego pola „meta description” jak typowy CMS.",
  uiLimitsSummary:
    "Tytuł oferty: max 75 znaków (limit Allegro od września 2023). Limity „opis krótki” i „meta” w wyniku generatora to teksty pomocnicze (np. eksport, Google), a nie natywne pola SEO Allegro. Długi opis: zalecana objętość pod konwersję i SEO Google; Allegro nie wymaga minimalnej liczby słów w opisie, by wystawić ofertę.",
  uiKeyPoints: [
    "Tytuł (≤75 zn.): najważniejsze słowa na początku. Unikaj CAPS LOCK, nadmiaru wykrzykników i haseł typu „PROMOCJA!!!” — to obniża jakość i czytelność oferty.",
    "Parametry oferty to „sekretny składnik”: opis sprzedaje klientowi, ale parametry (atrybuty) decydują o filtrach bocznych i widoczności na liście — uzupełnij je w formularzu wystawiania.",
    "Katalog Allegro i EAN/GTIN: prawidłowy kod łączy ofertę z produktem w katalogu i ułatwia warianty — wpisz go w panelu, gdy dotyczy.",
    "Wyszukiwarka Allegro nie indeksuje opisu tak jak tytułu; tworzymy opis pod Google (SEO) i pod domknięcie sprzedaży (język korzyści). „Opis krótki” / „meta” w wyniku to eksport pod Google — nie pole meta w Allegro.",
  ],
  uiAccordionBullets: [
    "Tytuł + parametry w formularzu oferty — opis HTML ich nie zastępuje przy filtrach.",
    "Opis HTML: konwersja i widoczność w Google; parametry uzupełniasz osobno przy wystawianiu.",
    "Google dobiera snippet z tytułu i treści — osobnego pola meta jak w CMS Allegro nie ma.",
  ],
  uiOfferComparison: {
    caption: "Co robi generator względem elementów oferty",
    rows: [
      {
        element: "Tytuł",
        aiDoes: "Trzyma limit 75 znaków, stawia słowa kluczowe na początku, unika CAPS/spamu.",
        why: "Zbyt długie tytuły są obcinane; jakość tytułu wpływa na reklamy i CTR.",
      },
      {
        element: "Opis HTML",
        aiDoes: "Generuje czytelny HTML (sekcje, listy) pod mobile i konwersję.",
        why: "Skanowalność na telefonie = wyższa konwersja.",
      },
      {
        element: "Parametry",
        aiDoes: "Wyciąga z cech/zdjęcia fakty do treści; Ty przenosisz wartości do pól atrybutów w panelu.",
        why: "Filtry Allegro opierają się na parametrach — bez nich oferta ginie w liście.",
      },
      {
        element: "SEO / meta",
        aiDoes: "„Opis krótki” i meta w wyniku — pomoc pod Google i materiały zewnętrzne.",
        why: "Silna domena Allegro + dobry snippet mogą wspierać widoczność poza platformą.",
      },
    ],
  },
  emojiPolicy: "restricted",
}

// ---------------------------------------------------------------------------
// Amazon
// ---------------------------------------------------------------------------

const amazon: PlatformProfile = {
  slug: "amazon",
  name: "Amazon",
  icon: "📦",
  locale: "multi",
  titleMaxChars: 200,
  titlePattern:
    "[Marka] — [Produkt], [Kluczowa cecha 1], [Kluczowa cecha 2], [Wariant/Rozmiar]",
  descriptionFormat: "html",
  charLimits: { shortDesc: 2000, longDescMinWords: 200, metaDesc: 160 },
  requiredSections: [
    "5 Bullet Points (Key Features) — każdy max 500 znaków, indeksowane przez A9/A10",
    "Product Description (HTML lub A+ Content — tekst na grafikach A+ nie indeksuje się jak zwykły opis; Alt Text w modułach A+ bywa indeksowany)",
    "Backend Search Terms (max 249 BAJTÓW UTF-8, nie znaki — łacina 1 bajt, polskie znaki zwykle 2 bajty; przekroczenie może zignorować całe pole; słowa oddzielaj spacją, bez zbędnych przecinków)",
  ],
  forbiddenPatterns: [
    "WIELKIE LITERY w całym tytule (dozwolone tylko pierwsze litery)",
    "symbole specjalne: ~, !, *, $, ?, _ itp. w tytule",
    "linki zewnętrzne",
    "dane kontaktowe",
    "informacje o cenach/promocjach w tytule i bullet pointach",
    'słowa subiektywne bez dowodu: "najlepszy", "#1"',
    'frazy "na sprzedaż" / "kup teraz" w tytule',
  ],
  bestPractices: `- Tytuł: techniczny limit do 200 znaków; praktycznie celuj w ok. 80–120 znaków. W aplikacji mobilnej Amazon często pokazuje tylko ok. 70–80 pierwszych znaków — USP i główna fraza muszą być na początku (CTR i jasność oferty bez wchodzenia w listing). Dokładna fraza w tytule (exact match) zwykle mocniej trzyma frazę niż rozłożenie tych samych słów po polach. Unikaj keyword stuffing.
  Wzór: [Marka] — [Produkt], [Cecha1], [Cecha2], [Wariant]. Najmocniejsze frazy na początku tytułu.
- Bullet Points (5 punktów): edukacja klienta + long-tail; Amazon indeksuje — każdy punkt od KORZYŚCI, max ~500 znaków/punkt; pierwszy bullet = główny argument zakupu.
- Product Description (HTML): dla samego A9 zwykle niższa waga niż tytuł/bullety/backend, ale ważna dla konwersji i SEO w Google. Przy A+ Content tekst renderowany na grafikach nie jest indeksowany jak zwykły opis; pole Alt Text przy obrazkach w modułach A+ bywa indeksowane — sensowne uzupełnienie słów kluczowych (bez spamu).
- Backend Search Terms: limit ok. 249 BAJTÓW w UTF-8 (nie „znaki”: np. a-z często 1 bajt, polskie ogonki zwykle 2 bajty). Przekroczenie choćby o 1 bajt może sprawić, że Amazon odrzuci CAŁE pole. Oddzielaj słowa pojedynczą spacją — zbędne przecinki i interpunkcja marnują bajty. Nie duplikuj słów z tytułu i bulletów; synonimy, long-tail, literówki.
- Nie powtarzaj tych samych słów między tytułem, bulletami i backendem „dla siły” — algorytm łączy indeks, a duplikaty marnują miejsce na nowe frazy.
- Meta / snippet: jak w wielu marketplace'ach, nie edytujesz meta jak w CMS — Amazon buduje widoczność w Google m.in. z tytułu i treści; pole „meta” w eksporcie to treść pomocnicza.
- Pisz w języku docelowego marketplace'u (DE, EN, PL itd.).`,
  exampleTitle:
    "HikePro — Plecak Turystyczny 50L, Wodoodporny, Ergonomiczne Szelki, Pokrowiec Przeciwdeszczowy",
  seoNotes:
    "Amazon: najwyższy priorytet indeksowania — tytuł (początek, exact match na kluczową frazę mocniejszy niż rozłożenie słów), potem Backend (~249 BAJTÓW UTF-8: łacina 1 bajt, polskie znaki zwykle 2; przekroczenie może odrzucić całe pole; słowa tylko spacją, bez przecinków), potem Bullet Points; Description głównie konwersja i Google. A+: tekst na grafice nie indeksuje się jak opis; Alt Text w modułach A+ bywa indeksowany.",
  uiLimitsSummary:
    "tytuł do 200 zn., sensownie ~80–120 zn.; w apce mobilnej widać często ~70–80 zn. — USP na start. „Opis krótki” w wyniku = styl 5 Bullet Points. Backend: ~249 bajtów (nie znaki), uzupełniasz w panelu. „Meta” = pomocniczo; Google dobiera snippet.",
  uiKeyPoints: [
    "Tytuł: moc na początku; w apce często ~70–80 zn. widocznych.",
    "„Opis krótki” w wyniku = treść w stylu 5 Bullet Points (nie pole Seller Central).",
    "Backend Keywords ~249 bajtów UTF-8 — osobno w panelu; bez zbędnego powtarzania z tytułu.",
  ],
  uiAccordionBullets: [
    "Kolejność ważności w wyszukiwarce: tytuł → backend → bullety → opis (dla Google też znaczenie).",
    "Polskie znaki w backendzie = więcej bajtów; przekroczenie może wyzerować całe pole.",
    "A+: tekst na grafice ≠ indeks jak opis; Alt Text w modułach bywa indeksowany.",
  ],
  emojiPolicy: "restricted",
}

// ---------------------------------------------------------------------------
// Shopify
// ---------------------------------------------------------------------------

const shopify: PlatformProfile = {
  slug: "shopify",
  name: "Shopify",
  icon: "🛍️",
  locale: "multi",
  titleMaxChars: 70,
  titlePattern: "[Produkt] — [Główna korzyść/cecha] | [Marka]",
  descriptionFormat: "html",
  charLimits: { shortDesc: 320, longDescMinWords: 200, metaDesc: 155 },
  requiredSections: [
    "Overview (intro z hookiem sprzedażowym)",
    "Features & Benefits",
    "Specifications",
    "Care Instructions / FAQ",
  ],
  forbiddenPatterns: [
    "zbyt długi meta description (>155 zn.)",
    "brak alt-text w obrazach (SEO)",
    "ukryty tekst / cloaking",
  ],
  bestPractices: `- SEO Title: max 70 znaków (widoczny w Google). Keyword blisko początku.
- Meta description: max 155 znaków z CTA i keyword.
- Opis: rich HTML z h2/h3, listami, strong. Schema.org-friendly (Google Rich Snippets).
- Sekcje: Overview → Features & Benefits → Specifications → Care/FAQ.
- Warianty produktu: opisz różnice między wariantami (kolor, rozmiar, materiał).
- Linkowanie wewnętrzne: powiąż z kolekcjami i produktami komplementarnymi.
- Shopify SEO: tytuł strony + URL handle + meta + treść = ranking Google.`,
  exampleTitle: "Plecak Turystyczny 50L — Wodoodporny z pokrowcem | HikePro",
  seoNotes:
    "Google indeksuje meta title + description + treść strony. Shopify auto-generuje URL handle z tytułu — trzymaj go krótkim.",
  uiLimitsSummary:
    "Shopify: tytuł SEO do 70 zn.; opis krótki do 320 zn.; meta do 155 zn.; opis długi min. 200 słów (HTML). URL handle sklep generuje z tytułu — krótko i czytelnie.",
  uiKeyPoints: [
    "Tytuł + meta + treść strony = podstawa SEO w Google.",
    "Handle URL Shopify bywa z tytułu — nie rozdmuchuj nazwy bez potrzeby.",
    "Opis długi: HTML z nagłówkami i listami pod Rich Results.",
  ],
  uiAccordionBullets: [
    "Meta title i description ustawiasz w produkcie (SEO) — lepiej niż tylko auto.",
    "Treść strony indeksuje Google razem z meta; dopasuj słowa do intencji zakupu.",
    "Krótki URL (handle) ułatwia udostępnianie i czytelność w SERP.",
  ],
  emojiPolicy: "allowed",
}

// ---------------------------------------------------------------------------
// WooCommerce
// ---------------------------------------------------------------------------

const woocommerce: PlatformProfile = {
  slug: "woocommerce",
  name: "WooCommerce",
  icon: "🌐",
  locale: "multi",
  titleMaxChars: 70,
  titlePattern: "[Główny keyword] — [Produkt] [Wariant] | [Marka]",
  descriptionFormat: "html",
  charLimits: { shortDesc: 200, longDescMinWords: 200, metaDesc: 155 },
  requiredSections: [
    "Krótki opis (Short Description — widoczny pod ceną; zwykle krótki tekst lub prosty HTML)",
    'Pełny opis (Long Description — HTML z h2/h3, listami <ul><li> gotowymi do wklejenia w WordPress)',
    "Atrybuty wariacji (rozmiar, kolor itd.)",
  ],
  forbiddenPatterns: [
    "shortcodes wtyczek ([...]) w opisie, jeśli użytkownik ich nie podał — nie zgaduj składni",
    "brak krótkiego opisu (pole często pomijane, a kluczowe dla konwersji)",
    "opis bez nagłówków h2/h3 (gorszy SEO i czytelność)",
  ],
  bestPractices: `- Tytuł: keyword na początku — WooCommerce generuje slug z tytułu (SEO URL).
- Short Description: 2-3 zdania z hookiem i CTA. Widoczne pod ceną — decyduje o kliknięciu „Dodaj do koszyka" (zwykle plain text lub lekki HTML).
- Long Description: semantyczny HTML gotowy do wklejenia w edytor produktu (klasyczny lub Gutenberg). Listy: <ul class="wp-block-list"><li>...</li></ul> — klasa wp-block-list jest rozpoznawana przez edytor blokowy; jeśli wolisz uniwersalnie: zwykłe <ul><li> działają w każdym motywie. Nagłówki h2/h3, akapity p, strong dla wyróżnień; min. 200 słów pod SEO.
- Tabele: opcjonalnie <table> dla specyfikacji — czytelnie w treści produktu.
- Atrybuty wariacji: rozmiar, kolor, materiał — uzupełnij dla filtrowania i wyświetlania wariantów.
- Yoast/RankMath SEO: meta title max 60 zn., meta desc max 155 zn. Keyword w obu.
- Schema.org: WooCommerce + Yoast automatycznie generują Product schema — ale potrzebują kompletnych danych (cena, dostępność, oceny).
- Zdjęcia: alt-text z keyword.`,
  exampleTitle:
    "Plecak Turystyczny 50L Wodoodporny — HikePro Trail | Pokrowiec Gratis",
  seoNotes:
    "WooCommerce na WordPressie: często Gutenberg lub shortcodes wtyczek. Opis długi najlepiej jako czysty HTML (h2, ul/li) — po wklejeniu wygląda profesjonalnie; lista z class=\"wp-block-list\" pasuje do bloków listy. Yoast/RankMath + slug + treść z nagłówkami. Short description wpływa na snippet w Google.",
  uiLimitsSummary:
    "WooCommerce: tytuł SEO do 70 zn.; short do 200 zn.; meta do 155 zn.; opis długi min. 200 słów (HTML). Listy w opisie długim: preferuj <ul class=\"wp-block-list\">… lub <ul><li> — gotowe do WordPressa.",
  uiKeyPoints: [
    "Slug produktu rośnie z tytułu — słowa kluczowe na początku.",
    "Pełny opis: HTML (h2, listy) — po wklejeniu wygląda dobrze w Gutenbergu.",
    "Short pod ceną: konwersja; Yoast/RankMath dla meta title/description.",
  ],
  uiAccordionBullets: [
    "Listy: <ul class=\"wp-block-list\"><li>…</li></ul> albo zwykłe <ul><li> — bez zgadywania shortcodes.",
    "Meta i treść wspierają snippet w Google; nagłówki porządkują treść.",
    "Schema produktu — kompletne dane (cena, dostępność) pomagają w wynikach.",
  ],
  emojiPolicy: "allowed",
}

// ---------------------------------------------------------------------------
// eBay
// ---------------------------------------------------------------------------

const ebay: PlatformProfile = {
  slug: "ebay",
  name: "eBay",
  icon: "🏷️",
  locale: "multi",
  titleMaxChars: 80,
  titlePattern:
    "[Produkt] [Kluczowa cecha] [Stan: Nowy/Używany] — [Marka] [Model]",
  descriptionFormat: "html",
  charLimits: { shortDesc: 300, longDescMinWords: 150, metaDesc: 160 },
  requiredSections: [
    "Item Specifics (condition, brand, MPN, UPC/EAN)",
    "Opis HTML (bez JavaScript, bez zewnętrznych zasobów)",
    "Shipping & Returns info",
  ],
  forbiddenPatterns: [
    "JavaScript / active content w opisie (eBay blokuje od 2017)",
    "zewnętrzne linki i obrazy z obcych serwerów",
    "dane kontaktowe (telefon, e-mail, adres)",
    "odniesienia do transakcji poza eBay",
    'słowa "guaranteed", "authentic" bez programu eBay Authenticity',
    "ALL CAPS w tytule (dozwolone: akronimy, rozmiary)",
  ],
  bestPractices: `- Tytuł: max 80 znaków. Najważniejsze keyword na początku. Unikaj wykrzykników i ALL CAPS. Po generacji backend stosuje Title Optimizer: powtórzenia tego samego słowa są zamieniane na synonimy lub usuwane (bez zewnętrznego API).
- Item Specifics: OBOWIĄZKOWE. Condition, Brand, MPN, UPC/EAN, Size, Color — poprawiają widoczność w Cassini (wyszukiwarka eBay).
- Opis: HTML (h2, ul, strong, tabele). BEZ JS, bez zewn. CSS/obrazów. eBay hosting only.
- Mobile-first: >60% kupujących na eBay używa telefonu — krótkie akapity, czytelne listy.
- Wysyłka i zwroty: opisz warunki w sekcji opisu (buduje zaufanie).
- Cassini SEO: tytuł + item specifics + konwersja + seller rating = ranking.
- Międzynarodowe: eBay.de (niemiecki), eBay.co.uk (angielski), eBay.com (US) — dostosuj język.`,
  exampleTitle:
    "Plecak Turystyczny 50L Wodoodporny HikePro Trail — Nowy z Pokrowcem",
  seoNotes:
    "eBay Cassini: tytuł (waga najwyższa) > item specifics > sell-through rate. Nie powtarzaj słów w tytule — Cassini je deduplikuje.",
  uiLimitsSummary:
    "eBay: tytuł max 80 zn.; opis krótki do 300 zn.; meta do 160 zn.; opis długi min. 150 słów (HTML). Po generacji backend może zoptymalizować powtórzenia słów w tytule (Title Optimizer).",
  uiKeyPoints: [
    "Tytuł max 80 zn. — keyword na starcie; unikaj powtórzeń (Cassini i backend to wspierają).",
    "Item specifics (stan, marka, EAN…) = widoczność w wyszukiwarce eBay.",
    "Opis HTML bez JS i zewnętrznych assetów — zasady eBay.",
  ],
  uiAccordionBullets: [
    "Cassini: tytuł + specyfikacja + konwersja + ocena sprzedawcy.",
    "Mobile: krótkie akapity i listy — większość zakupów na telefonie.",
    "Title Optimizer po stronie serwera zamienia duplikaty słów na synonimy (gdy możliwe).",
  ],
  emojiPolicy: "allowed",
}

// ---------------------------------------------------------------------------
// Etsy
// ---------------------------------------------------------------------------

const etsy: PlatformProfile = {
  slug: "etsy",
  name: "Etsy",
  icon: "🧶",
  locale: "multi",
  titleMaxChars: 140,
  titlePattern: "[Big Three fraza] | [Materiał/Typ] | [Wariant/Okazja] | [Marka]",
  descriptionFormat: "plain_text",
  charLimits: { shortDesc: 220, longDescMinWords: 120, metaDesc: 160 },
  requiredSections: [
    "Materiał i wykonanie (handmade / vintage / supplies)",
    "Wymiary lub warianty (size, kolor, personalizacja)",
    "Instrukcje pielęgnacji / użytkowania",
    "Storytelling: krótka historia procesu lub autentyczności produktu",
  ],
  forbiddenPatterns: [
    "wymyślone certyfikaty lub pochodzenie materiałów",
    "obietnice dostawy bez pokrycia",
    "agresywny keyword stuffing",
  ],
  bestPractices: `- Tytuł: do 140 znaków, najważniejsze 3-4 słowa na początku (Big Three).
- Separatory "|" lub "," pomagają oddzielić frazy i poprawiają skanowalność.
- Podkreśl unikalność: ręczne wykonanie, materiały, proces, personalizacja.
- Opis: plain text (bez HTML), czytelny układ i listy od myślników.
- Dodaj informacje praktyczne: rozmiary, pielęgnacja, czas realizacji.
- Etsy promuje trafność i kompletność listingu: tytuł + 13 tagów + atrybuty + jakość oferty.`,
  exampleTitle: "Ręcznie szyta torba | len naturalny | personalizacja haftu | Pracownia Mewa",
  seoNotes:
    "Etsy: kluczowe są tytuł (Big Three na początku), 13 tagów po max 20 znaków, atrybuty oraz kompletność listingu. Opis powinien być plain text i zaczynać się mocnym hookiem.",
  uiLimitsSummary:
    "Etsy: tytuł do 140 zn.; 13 tagów po max 20 zn.; opis krótki do 220 zn.; meta do 160 zn. (pierwsze 160 zn. opisu); opis długi min. 120 słów (plain text). Największy wpływ mają tytuł, tagi i atrybuty.",
  uiKeyPoints: [
    "Pierwsze 3-4 słowa tytułu to najważniejsza fraza (mobile często ucina resztę).",
    "Tagi Etsy: 13 sztuk, każde do 20 znaków — to krytyczny element pozycjonowania.",
    "Opis plain text + krótki storytelling o procesie tworzenia podnosi konwersję.",
  ],
  uiAccordionBullets: [
    "Stosuj separatory \"|\" lub \",\" w tytule, aby rozdzielić główne frazy.",
    "Użyj czytelnych sekcji: materiał, wymiary, pielęgnacja, personalizacja.",
    "Nie obiecuj parametrów lub terminów, których nie ma w danych wejściowych.",
    "Spójność tytułu, tagów i atrybutów poprawia trafność oferty i jakość wyszukiwania.",
  ],
  emojiPolicy: "allowed",
}

// ---------------------------------------------------------------------------
// Vinted
// ---------------------------------------------------------------------------

const vinted: PlatformProfile = {
  slug: "vinted",
  name: "Vinted",
  icon: "👚",
  locale: "multi",
  titleMaxChars: 70,
  titlePattern: "[Co to jest] [Kolor] [Styl/Materiał] [Stan]",
  descriptionFormat: "plain_text",
  charLimits: { shortDesc: 180, longDescMinWords: 60, metaDesc: 0 },
  requiredSections: [
    "Stan produktu (np. nowy z metką / bardzo dobry / dobry)",
    "Marka, rozmiar i kluczowe wymiary (wysokość/szerokość dla Home)",
    "Wady / ślady użytkowania (jeśli są)",
    "Hashtagi na końcu opisu (5-8)",
  ],
  forbiddenPatterns: [
    "HTML i ozdobniki utrudniające czytelność",
    "ukrywanie wad produktu",
    "fałszywe informacje o stanie",
  ],
  bestPractices: `- Vinted lubi prostotę: krótki, konkretny tytuł i rzeczowy opis.
- Tytuł buduj pod prostą wyszukiwarkę: Co to jest + Kolor + Styl/Materiał.
- Opis najlepiej jako plain text: stan, rozmiar, marka, materiał, ewentualne wady.
- Ton bezpośredni (na „Ty”), bez formalnej formy „Państwo”.
- Kupujący szybko skanują treść — stosuj krótkie zdania i listę informacji.
- Dodaj 5-8 hashtagów na końcu opisu (np. #handmade #vintage #prezent).
- Uczciwość opisu i zgodność ze zdjęciami podnosi konwersję i zmniejsza zwroty.`,
  exampleTitle: "Sukienka czarna boho len bardzo dobry stan",
  seoNotes:
    "Vinted: skuteczność ogłoszenia wynika z prostego tytułu, jasnego stanu, wymiarów i uczciwego opisu. Hashtagi 5-8 sztuk realnie pomagają w odkrywalności.",
  uiLimitsSummary:
    "Vinted: tytuł do 70 zn.; opis krótki do 180 zn.; opis długi min. 60 słów (plain text); hashtagi 5-8 na końcu. Najważniejsze: stan, rozmiar/wymiary, marka i realny opis.",
  uiKeyPoints: [
    "Tytuł pisz pod prostą wyszukiwarkę: co to jest + kolor + styl/materiał.",
    "Na końcu opisu dodaj 5-8 hashtagów (#...), bo na Vinted pomagają w widoczności.",
    "Ton bezpośredni i szczery: stan, rozmiar, wymiary, ewentualne ślady użycia.",
  ],
  uiAccordionBullets: [
    "Jeśli produkt ma ślady użycia, opisz je jasno i krótko.",
    "Tytuł i opis muszą zgadzać się ze zdjęciami oraz kategorią; bez linków zewnętrznych.",
    "Konkret wygrywa: mniej ozdobników, więcej faktów i wymiarów.",
  ],
  emojiPolicy: "discouraged",
}

// ---------------------------------------------------------------------------
// Empik Place
// ---------------------------------------------------------------------------

const empikplace: PlatformProfile = {
  slug: "empikplace",
  name: "Empik Place",
  icon: "📚",
  locale: "pl",
  titleMaxChars: 120,
  titlePattern: "[Produkt] [Materiał/cecha] [Marka] - [Okazja/wariant]",
  descriptionFormat: "html",
  charLimits: { shortDesc: 300, longDescMinWords: 150, metaDesc: 160 },
  requiredSections: [
    "Kluczowe cechy i korzyści produktu",
    "Specyfikacja i parametry techniczne",
    "Informacje o wariantach / kompatybilności",
  ],
  forbiddenPatterns: [
    "niespójne lub sprzeczne parametry produktu",
    "CAPS LOCK i nadmiar wykrzykników w tytule",
    "promesy bez pokrycia (np. gwarancja bez danych)",
    "nienaturalne upychanie słów kluczowych",
  ],
  bestPractices: `- Tytuł: czytelny i konkretny, najważniejsze frazy na początku; bez CAPS LOCK i "!!!".
- Styl premium: balans SEO + estetyka (nie "krzykliwy marketplace").
- Opis: semantyczny HTML (np. h3, b/strong, ul/li), skupiony na korzyściach i parametrach.
- Używaj dosłownie kluczowych wartości z cech użytkownika (np. "Materiał: stal") w tytule/opisie.
- Utrzymuj spójność danych: tytuł, opis, warianty i specyfikacja.
- W marketplace liczy się jakość danych produktowych oraz ich kompletność.`,
  exampleTitle: "Ręcznie kuta róża stalowa The Anvil Rose - Prezent na rocznicę - 30 cm",
  seoNotes:
    "Empik Place: kluczowa jest spójność i kompletność danych produktowych. Rozbieżności między parametrami a tytułem/opisem często kończą się odrzuceniem oferty w weryfikacji.",
  uiLimitsSummary:
    "Empik Place: tytuł do 120 zn.; opis krótki do 300 zn.; meta do 160 zn.; opis długi min. 150 słów (HTML semantyczny). Największe znaczenie mają czytelność i spójność danych produktu.",
  uiKeyPoints: [
    "Tytuł ma wyglądać premium: czytelny, bez CAPS LOCK i bez nadmiaru wykrzykników.",
    "Opis HTML (h3, listy) jest dobrze renderowany i czytelny dla kupującego.",
    "Parametry z cech muszą 1:1 zgadzać się z tytułem i opisem.",
  ],
  uiAccordionBullets: [
    "Zadbaj o zgodność nazwy, wariantu i parametrów technicznych (bez rozbieżności).",
    "Unikaj obietnic bez danych (np. certyfikaty, gwarancje).",
    "Opis ma rozwijać korzyści i specyfikację, nie duplikować losowych fraz.",
  ],
  emojiPolicy: "allowed",
}

// ---------------------------------------------------------------------------
// OLX (zachowany dla kompatybilności)
// ---------------------------------------------------------------------------

const olx: PlatformProfile = {
  slug: "olx",
  name: "OLX",
  icon: "📋",
  locale: "pl",
  titleMaxChars: 70,
  titlePattern: "[Produkt] [Stan] [Cecha kluczowa]",
  descriptionFormat: "plain_text",
  charLimits: { shortDesc: 0, longDescMinWords: 80, metaDesc: 0 },
  requiredSections: [
    "Stan produktu",
    "Cena i forma transakcji",
    "Lokalizacja / odbiór / wysyłka",
  ],
  forbiddenPatterns: [
    "HTML (OLX nie renderuje znaczników)",
    "linki zewnętrzne",
    "treści obraźliwe / nielegalne",
  ],
  bestPractices: `- Tytuł: krótki, konkretny, max 70 znaków. Bez „OKAZJA!!!" i ALL CAPS.
- Opis: prosty tekst (plain text). OLX NIE renderuje HTML.
- Podaj: stan (nowy/używany), cenę, lokalizację, formę dostawy.
- Język bezpośredni, konkretny — kupujący na OLX nie czytają esejów.
- Zdjęcia: kluczowe na OLX — opis ma je uzupełniać, nie zastępować.`,
  exampleTitle: "Plecak turystyczny 50L wodoodporny — stan idealny",
  seoNotes:
    "OLX: wyszukiwarka prosta, tytuł + kategoria + lokalizacja. Keyword w tytule = widoczność.",
  uiLimitsSummary:
    "OLX: tytuł do 70 zn.; opis to głównie treść długa (plain text, min. 80 słów). HTML się nie renderuje — bez znaczników.",
  uiKeyPoints: [
    "Tytuł krótki i konkretny — widać go w wynikach wyszukiwania.",
    "Opis plain text — HTML nie działa na OLX.",
    "Zdjęcia + cena + lokalizacja robią większość pracy przy ogłoszeniu.",
  ],
  uiAccordionBullets: [
    "Bez linków zewnętrznych i treści niezgodnych z regulaminem.",
    "Stan, cena i odbiór — jasno w treści.",
    "Generator traktuje długi opis jako tekst, nie HTML.",
  ],
  emojiPolicy: "discouraged",
}

// ---------------------------------------------------------------------------
// Ogólny (fallback)
// ---------------------------------------------------------------------------

const ogolny: PlatformProfile = {
  slug: "ogolny",
  name: "Ogólny",
  icon: "📝",
  locale: "pl",
  titleMaxChars: 70,
  titlePattern: "[Produkt] — [Główna korzyść] | [Marka]",
  descriptionFormat: "html",
  charLimits: { shortDesc: 250, longDescMinWords: 150, metaDesc: 160 },
  requiredSections: [
    "Wprowadzenie z hookiem",
    "Korzyści i cechy",
    "Specyfikacja",
  ],
  forbiddenPatterns: [],
  bestPractices: `- Tytuł SEO: max 70 znaków z głównym keyword.
- Opis: HTML z nagłówkami h2/h3, listami, wyróżnieniami.
- Uniwersalny format — nadaje się jako baza do dostosowania pod dowolną platformę.`,
  exampleTitle: "Plecak Turystyczny 50L Wodoodporny | HikePro",
  seoNotes: "Format ogólny — dostosuj do docelowej platformy.",
  uiLimitsSummary:
    "Ogólny: tytuł do 70 zn.; opis krótki do 250 zn.; meta do 160 zn.; opis długi min. 150 słów (HTML). Dopasuj do docelowego sklepu przed publikacją.",
  uiKeyPoints: [
    "Uniwersalny szablon — potem dopasuj limity pod konkretną platformę.",
    "Tytuł z główną frazą na początku; opis z nagłówkami i listami.",
    "Meta i treść spójne z intencją zakupu.",
  ],
  uiAccordionBullets: [
    "Użyj jako bazy pod Allegro, Shopify, własny sklep itd.",
    "Sprawdź limity znaków u docelowego kanału przed publikacją.",
    "Cechy produktu poniżej mają największy wpływ na jakość tekstu.",
  ],
  emojiPolicy: "allowed",
}

// ---------------------------------------------------------------------------
// Ogólny — plain text (bez HTML)
// ---------------------------------------------------------------------------

const ogolny_plain: PlatformProfile = {
  slug: "ogolny_plain",
  name: "Ogólny (tekst)",
  icon: "📄",
  locale: "pl",
  titleMaxChars: 70,
  titlePattern: "[Produkt] — [Główna korzyść] | [Marka]",
  descriptionFormat: "plain_text",
  charLimits: { shortDesc: 250, longDescMinWords: 120, metaDesc: 160 },
  requiredSections: [
    "Wprowadzenie z hookiem",
    "Korzyści i cechy",
    "Specyfikacja (akapity lub listy od myślników)",
  ],
  forbiddenPatterns: ["HTML w opisie (ten profil generuje wyłącznie plain text)"],
  bestPractices: `- Tytuł SEO: max 70 znaków z głównym keyword.
- Opis: plain text (bez HTML), czytelne akapity i listy od myślników.
- Uniwersalny format — nadaje się jako baza do dostosowania pod dowolną platformę.`,
  exampleTitle: "Plecak Turystyczny 50L Wodoodporny | HikePro",
  seoNotes: "Format ogólny (plain text) — dostosuj do docelowej platformy.",
  uiLimitsSummary:
    "Ogólny (tekst): tytuł do 70 zn.; opis krótki do 250 zn.; meta do 160 zn.; opis długi min. 120 słów (plain text). Dopasuj do docelowego kanału przed publikacją.",
  uiKeyPoints: [
    "Szablon bez HTML — np. pod proste pola, OLX lub wklejenie do notatnika.",
    "Tytuł z główną frazą na początku; opis z krótkimi akapitami.",
    "Jeśli znasz docelową platformę, wybierz ją z listy zamiast trybu ogólnego.",
  ],
  uiAccordionBullets: [
    "Bez znaczników HTML — tylko tekst i ewentualnie myślniki.",
    "Sprawdź limity znaków u docelowego kanału przed publikacją.",
    "Cechy produktu poniżej mają największy wpływ na jakość tekstu.",
  ],
  emojiPolicy: "discouraged",
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const PLATFORM_PROFILES: Record<string, PlatformProfile> = {
  allegro,
  amazon,
  shopify,
  woocommerce,
  ebay,
  etsy,
  vinted,
  empikplace,
  olx,
  ogolny,
  ogolny_plain,
}

/** Zwraca profil platformy lub fallback `ogolny`. */
export function getPlatformProfile(slug: string): PlatformProfile {
  return PLATFORM_PROFILES[slug] ?? PLATFORM_PROFILES.ogolny
}

/** Slugi aktywnych platform (bez "ogolny") do marquee / trust pills. */
export const ACTIVE_PLATFORM_SLUGS = [
  "allegro",
  "amazon",
  "shopify",
  "woocommerce",
  "ebay",
  "etsy",
  "vinted",
  "empikplace",
] as const
