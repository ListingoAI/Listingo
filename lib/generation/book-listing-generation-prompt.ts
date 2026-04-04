/**
 * Specjalizacja copywriterska pod książki — używana przy generacji opisu (nie przy ekstrakcji JSON ze zdjęcia).
 * Wyjście modelu nadal musi być JSON-em zgodnym z OpisAI (seoTitle, shortDescription, longDescription, …).
 */

import {
  buildImageAnalysisLinesForGeneratePrompt,
  hasSubstantiveImageAnalysis,
  type ProductImageAnalysis,
} from '@/lib/generation/product-image-analysis'

/** Doklejane do system promptu OpisAI, gdy listing jest książką. */
export const BOOK_LISTING_SPECIALIZATION_BLOCK = `

--- SPECYALIZACJA: KSIĄŻKA (listing e-commerce) ---
Jesteś ekspertem e-commerce i copywriterem specjalizującym się w sprzedaży książek.

Tworzysz listingi zoptymalizowane pod:
- maksymalny CTR (kliknięcia)
- wysoki współczynnik konwersji
- SEO (Allegro / Amazon)

ZASADY KRYTYCZNE:
1. NIE HALUCYNUJ – używaj wyłącznie danych podanych przez użytkownika lub w sekcji „DANE PRODUKTU” poniżej
2. Jeśli brakuje danych → nie wymyślaj fabuły ani zakończenia treści; zamiast tego skup się na fizycznych cechach produktu, zastosowaniu (np. lektura szkolna jeśli w danych), grupie docelowej (jeśli podana); w qualityTips możesz wskazać brakujące pola do uzupełnienia w panelu
2a. Twierdzenia statusowe tylko z potwierdzeniem w danych: nie pisz kategorycznie „lektura szkolna”, „wydanie obowiązkowe”, „oryginał”, „edycja kolekcjonerska”, jeśli nie ma tego wprost w dostarczonych danych. Jeśli brak potwierdzenia, użyj neutralnego opisu i dodaj krótką sugestię w qualityTips do weryfikacji.
3. Pisz konkretnie, bez lania wody
4. Używaj języka korzyści (co klient zyskuje)
5. Unikaj ogólników typu „świetna książka”
6. Styl: dynamiczny, nowoczesny, sprzedażowy
7. Brak emoji w całej treści
8. ZAKAZ dopisków meta o źródle informacji w treści dla kupującego (seoTitle, shortDescription, longDescription, metaDescription, tags): nie umieszczaj w nawiasach fraz typu „(informacja widoczna na okładce)”, „(informacja na okładce)”, „(z okładki)”, „(ze zdjęcia)”, „(z etykiety)” — kupującemu to niepotrzebne i wygląda jak notatka wewnętrzna. Podaj fakty wprost: np. „Autor: Jan Kowalski”, „Treść: …” — bez komentarza skąd dane pochodzą. W sekcji specyfikacji tylko wartości, bez meta-komentarzy.
9. Anty-generyczny opening: pierwszy akapit ma zaczynać się od konkretu (tytuł/temat książki + dla kogo/po co), a nie od pustych szablonów typu „historia, która w przystępny sposób…”, „to wyjątkowa pozycja dla każdego…”, „idealna propozycja dla…”, jeśli nie wynikają z danych.

MAPOWANIE NA JSON (obowiązkowe):
- „seoTitle” = Tytuł SEO (max 70 znaków, chyba że limit platformy jest inny — wtedy przestrzegaj limitu platformy)
- „shortDescription” = dokładnie 5 linii — każda linia to jeden bullet sprzedażowy (krótki, konkretny); bez numeracji
- „longDescription” (HTML lub plain wg platformy) musi zawierać sensowną treść (kolejność możesz dostosować do platformy):
  (1) krótki hook / lead,
  (2) rozwinięcie (story + korzyści + zastosowanie) wyłącznie na podstawie danych,
  (3) specyfikacja techniczna w formie czytelnej (tabela-like: lista definicji / ul/li lub prosta tabela HTML jeśli platforma pozwala),
  (4) sekcja „Dla kogo?” (h2) — zwięźle,
  (5) sekcja „Dlaczego warto?” (h2) — **nie powtarzaj** listy cech z wcześniejszych akapitów; tylko domknięcie decyzji (2–4 zdania lub 2–3 krótkie punkty z nowym kątem: dla kogo, okazja, sens zakupu),
  (6) FAQ: **maks. 2–3 pytania**, krótkie odpowiedzi (1–2 zdania każda), tylko jeśli wynika z danych; na marketplace typu Allegro **pomiń FAQ**, jeśli powtarzałoby treść z sekcji (1)–(5) — lepiej krótszy, skanowalny opis niż landing jak blog
- „tags”, „metaDescription”, „qualityScore”, „qualityTips” — jak w standardowych zasadach OpisAI i limitach wybranej platformy
- Jeśli dane są niepełne, NIE zgaduj fabuły. Zamiast tego podkreśl wartość fizyczną produktu i to, co wynika z danych (okładka, format jeśli podano, ISBN jeśli podano itd.)
`

export type BookListingDataFields = {
  title: string
  author: string
  publisher: string
  year: string
  pages: string
  cover_type: string
  format: string
  isbn: string
  description: string
  visual_features: string
  target: string
  keywords: string
}

/** Wartość zastępcza dla pustego pola — użytkownik może dopisać w panelu. */
export const BOOK_FIELD_PLACEHOLDER = '[do uzupełnienia]'

function orPlaceholder(s: string): string {
  const t = s.trim()
  return t.length > 0 ? t : BOOK_FIELD_PLACEHOLDER
}

/**
 * Wyciąga pierwszą linię „Klucz: wartość” dla podanych etykiet (bez rozróżniania wielkości liter).
 */
export function pickFeatureValue(
  featureLines: string[],
  labels: string[]
): string {
  const lower = labels.map((l) => l.toLowerCase())
  for (const line of featureLines) {
    const m = line.match(/^([^:]+):\s*(.*)$/)
    if (!m) continue
    const key = m[1].trim().toLowerCase()
    if (lower.some((l) => key === l || key.startsWith(l))) {
      return m[2].trim()
    }
  }
  return ''
}

/**
 * Składa pola z nazwy, cech (linie „Klucz: wartość”) i analizy zdjęcia (jeśli jest).
 */
export function buildBookListingDataFieldsFromContext(
  effectiveProductName: string,
  rawFeatures: string,
  imageAnalysis: ProductImageAnalysis | null
): BookListingDataFields {
  const lines = rawFeatures.split('\n').map((l) => l.trim()).filter(Boolean)
  const e = imageAnalysis?.extraction

  let visual_features = ''
  if (imageAnalysis && hasSubstantiveImageAnalysis(imageAnalysis)) {
    visual_features = buildImageAnalysisLinesForGeneratePrompt(imageAnalysis).join('\n')
  }

  const publisherFromLine = pickFeatureValue(lines, ['wydawnictwo', 'publisher', 'nakład', 'naklad'])
  const publisher = publisherFromLine || (e?.brand?.trim() ?? '')

  const cover =
    pickFeatureValue(lines, ['okładka', 'okladka', 'cover', 'typ okładki']) ||
    (e?.material?.trim() ?? '')

  return {
    title: effectiveProductName,
    author: pickFeatureValue(lines, ['autor', 'author']),
    publisher,
    year: pickFeatureValue(lines, ['rok wydania', 'rok']),
    pages: pickFeatureValue(lines, ['liczba stron', 'stron', 'strony', 'objętość', 'objetosc']),
    cover_type: cover,
    format: pickFeatureValue(lines, ['format', 'wymiary', 'wymiar']),
    isbn: pickFeatureValue(lines, ['isbn', 'ean', 'kod kreskowy']),
    description: rawFeatures,
    visual_features,
    target: pickFeatureValue(lines, ['dla kogo', 'grupa docelowa', 'odbiorcy']),
    keywords: pickFeatureValue(lines, ['słowa kluczowe', 'keywords', 'tagi', 'fraza']),
  }
}

/**
 * Blok „DANE PRODUKTU” do wiadomości użytkownika przy generacji książki.
 */
export function buildBookListingDataUserBlock(fields: BookListingDataFields): string {
  return `DANE PRODUKTU (książka):
- Tytuł: ${orPlaceholder(fields.title)}
- Autor: ${orPlaceholder(fields.author)}
- Wydawnictwo: ${orPlaceholder(fields.publisher)}
- Rok wydania: ${orPlaceholder(fields.year)}
- Liczba stron: ${orPlaceholder(fields.pages)}
- Okładka: ${orPlaceholder(fields.cover_type)}
- Format: ${orPlaceholder(fields.format)}
- ISBN: ${orPlaceholder(fields.isbn)}

OPIS / KONTEKST:
${fields.description.trim() ? fields.description.trim() : BOOK_FIELD_PLACEHOLDER}

CECHY WIZUALNE (ze zdjęcia / formularza):
${fields.visual_features.trim() ? fields.visual_features.trim() : BOOK_FIELD_PLACEHOLDER}

GRUPA DOCELOWA:
${fields.target.trim() ? fields.target.trim() : BOOK_FIELD_PLACEHOLDER}

SŁOWA KLUCZOWE:
${fields.keywords.trim() ? fields.keywords.trim() : BOOK_FIELD_PLACEHOLDER}

Jeśli któreś pole ma wartość „${BOOK_FIELD_PLACEHOLDER}”, nie wymyślaj treści zamiast niego — pomiń w tekście lub napisz krótko „brak informacji w danych”, a w qualityTips możesz zasugerować uzupełnienie.`
}
