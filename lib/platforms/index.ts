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
}

// ---------------------------------------------------------------------------
// Allegro
// ---------------------------------------------------------------------------

const allegro: PlatformProfile = {
  slug: "allegro",
  name: "Allegro",
  icon: "🛒",
  locale: "pl",
  titleMaxChars: 50,
  titlePattern: "[Produkt] [Materiał/Cecha] [Wariant] | [Marka]",
  descriptionFormat: "html",
  charLimits: { shortDesc: 250, longDescMinWords: 150, metaDesc: 160 },
  requiredSections: [
    "Dlaczego warto?",
    "Co otrzymujesz?",
    "Specyfikacja techniczna",
  ],
  forbiddenPatterns: [
    "linki zewnętrzne (URL-e poza Allegro)",
    "dane kontaktowe (telefon, e-mail)",
    "odniesienia do innych platform sprzedaży",
    "słowa: najtańszy, najlepszy (bez dowodu)",
  ],
  bestPractices: `- Tytuł: max 50 znaków; wzór: [Produkt] [Materiał/Cecha] [Wariant] | [Marka]
- Opis: HTML (h2, ul, strong). Sekcje: „Dlaczego warto?", „Co otrzymujesz?", „Specyfikacja".
- Parametry produktu (stan, materiał, wymiary) — OBOWIĄZKOWE, wpływają na filtrowanie.
- Używaj „Parametrów Allegro" (atrybutów) — poprawiają widoczność w wyszukiwarce.
- Unikaj keyword-stuffing; Allegro karze duplikaty i spam.
- Dodaj CTA: „Kup teraz", „Dodaj do koszyka".
- Quality Score Allegro: tytuł + parametry + zdjęcia + cena = ranking oferty.`,
  exampleTitle: "Plecak Turystyczny 50L Wodoodporny | HikePro",
  seoNotes:
    "Allegro indeksuje tytuł i parametry. Krótki tytuł z głównym keyword na początku. Long-tail w opisie HTML.",
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
    "5 Bullet Points (Key Features) — każdy max 500 znaków",
    "Product Description (HTML lub A+ Content)",
    "Backend Search Terms (max 250 bajtów, niewidoczne dla klienta)",
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
  bestPractices: `- Tytuł: max 200 znaków (rekomendacja Amazon: 80 znaków dla mobile visibility).
  Wzór: [Marka] — [Produkt], [Cecha1], [Cecha2], [Wariant].
- 5 Bullet Points: każdy zaczyna się od KORZYŚCI (nie cechy). Max 500 znaków/punkt.
  Pierwszy bullet = najważniejszy selling point.
- Backend Search Terms: max 250 bajtów; nie powtarzaj słów z tytułu; synonimy, błędy pisowni, tłumaczenia.
- A+ Content (EBC): rich HTML z obrazami i tabelami porównawczymi — wyższy conversion rate o ~5-10%.
- Amazon SEO: tytuł + bullet points + backend keywords = ranking A9/A10.
- Unikaj duplikatów treści między polami; Amazon deduplikuje indeks.
- Pisz w języku docelowego marketplace'u (DE, EN, PL itd.).`,
  exampleTitle:
    "HikePro — Plecak Turystyczny 50L, Wodoodporny, Ergonomiczne Szelki, Pokrowiec Przeciwdeszczowy",
  seoNotes:
    "Amazon A9: tytuł (najwyższa waga) > bullet points > description > backend keywords. Nie powtarzaj słów — algorytm je łączy.",
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
}

// ---------------------------------------------------------------------------
// Shoper
// ---------------------------------------------------------------------------

const shoper: PlatformProfile = {
  slug: "shoper",
  name: "Shoper",
  icon: "🏪",
  locale: "pl",
  titleMaxChars: 255,
  titlePattern: "[Produkt] [Cecha kluczowa] — [Marka] [Wariant]",
  descriptionFormat: "html",
  charLimits: { shortDesc: 300, longDescMinWords: 150, metaDesc: 160 },
  requiredSections: [
    "Opis skrócony (widoczny na liście produktów i w Ceneo)",
    "Opis pełny (HTML z nagłówkami)",
    "Atrybuty produktu (parametry filtrujące)",
  ],
  forbiddenPatterns: [
    "zbyt długi opis skrócony (Ceneo obcina po ~300 zn.)",
    "brak atrybutów (gorsze filtrowanie i porównywanie)",
  ],
  bestPractices: `- Tytuł: do 255 znaków, ale rekomendacja SEO: 60-70 zn. (Google obcina dłuższe).
- Opis skrócony: 2-3 zdania — wyświetla się na liście produktów i w feedzie Ceneo/Google Shopping.
- Opis pełny: HTML (h2, h3, ul, strong). Keyword w pierwszym akapicie.
- Atrybuty: uzupełnij wszystkie parametry (materiał, rozmiar, kolor) — wpływają na filtrowanie w sklepie i w porównywarkach.
- SEO: Shoper generuje meta title i description automatycznie, ale ręczne ustawienie daje lepsze wyniki.
- Integracja Ceneo/Google Shopping: opis skrócony i atrybuty trafiają do feedu — muszą być kompletne.
- Polskie SEO: pisz naturalnym polskim z odmianą, nie angielskimi kalkami.`,
  exampleTitle: "Plecak turystyczny 50L wodoodporny — HikePro Trail",
  seoNotes:
    "Shoper: meta title z panelu > tytuł produktu. Feed Ceneo bierze opis skrócony + atrybuty. Google Shopping — atrybuty mapowane na Google Merchant.",
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
    "Krótki opis (Short Description — widoczny pod ceną)",
    'Pełny opis (Long Description — zakładka "Opis")',
    "Atrybuty wariacji (rozmiar, kolor itd.)",
  ],
  forbiddenPatterns: [
    "brak krótkiego opisu (pole często pomijane, a kluczowe dla konwersji)",
    "opis bez nagłówków h2/h3 (gorszy SEO i czytelność)",
  ],
  bestPractices: `- Tytuł: keyword na początku — WooCommerce generuje slug z tytułu (SEO URL).
- Short Description: 2-3 zdania z hookiem i CTA. Widoczne pod ceną — decyduje o kliknięciu „Dodaj do koszyka".
- Long Description: HTML z h2/h3, listami, tabelami. Min 200 słów dla SEO.
- Atrybuty wariacji: rozmiar, kolor, materiał — uzupełnij dla filtrowania i wyświetlania wariantów.
- Yoast/RankMath SEO: meta title max 60 zn., meta desc max 155 zn. Keyword w obu.
- Schema.org: WooCommerce + Yoast automatycznie generują Product schema — ale potrzebują kompletnych danych (cena, dostępność, oceny).
- Zdjęcia: alt-text z keyword.`,
  exampleTitle:
    "Plecak Turystyczny 50L Wodoodporny — HikePro Trail | Pokrowiec Gratis",
  seoNotes:
    "WooCommerce SEO = WordPress SEO. Yoast/RankMath + slug z keyword + content z nagłówkami. Short description wpływa na snippet w Google.",
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
  bestPractices: `- Tytuł: max 80 znaków. Najważniejsze keyword na początku. Unikaj wykrzykników i ALL CAPS.
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
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const PLATFORM_PROFILES: Record<string, PlatformProfile> = {
  allegro,
  amazon,
  shopify,
  shoper,
  woocommerce,
  ebay,
  olx,
  ogolny,
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
  "shoper",
  "woocommerce",
  "ebay",
] as const
