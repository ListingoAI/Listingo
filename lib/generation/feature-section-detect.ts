/**
 * Te same nagłówki co chipy w FormTabPremium — żeby analiza braków nie prosiła
 * o „Kolor:”, gdy użytkownik ma już „Kolory:” / „Barwa:” albo kolor w treści.
 */

function lineMatchesStructuredHeader(lineTrimmed: string, prefix: string): boolean {
  const tl = lineTrimmed.toLowerCase()
  const p = prefix.toLowerCase()
  if (!tl.startsWith(p)) return false
  const rest = tl.slice(p.length)
  return rest.startsWith(":") || rest.startsWith(" :")
}

function featuresHasAnyHeader(
  featuresText: string,
  prefixes: readonly string[]
): boolean {
  const sorted = [...prefixes].sort((a, b) => b.length - a.length)
  for (const line of featuresText.split("\n")) {
    const t = line.trim()
    if (!t) continue
    for (const prefix of sorted) {
      if (lineMatchesStructuredHeader(t, prefix)) return true
    }
  }
  return false
}

/** Zgodne z chipem „Kolory” (+ aliasy). */
const COLOR_SECTION_PREFIXES = [
  "Kolory",
  "Kolor",
  "Barwa",
  "Odcień",
  "Kolor produktu",
] as const

/** Zgodne z chipem „Rozmiary” (+ aliasy). */
const SIZE_SECTION_PREFIXES = [
  "Wymiary produktu",
  "Wymiary",
  "Wymiar",
  "Rozmiary",
  "Rozmiar",
] as const

export function featuresHasColorSectionHeader(featuresText: string): boolean {
  return featuresHasAnyHeader(featuresText, COLOR_SECTION_PREFIXES)
}

export function featuresHasSizeSectionHeader(featuresText: string): boolean {
  return featuresHasAnyHeader(featuresText, SIZE_SECTION_PREFIXES)
}

/**
 * Czy w polu cech jest realna informacja o kolorze (nagłówek sekcji albo opis słowny).
 * Używane zamiast wąskiego /\bkolor\s*:/ — obsługuje „Kolory:” i zdania typu „w kolorze granatowym”.
 */
export function featuresLikelyHasColorInfo(featuresText: string): boolean {
  if (featuresHasColorSectionHeader(featuresText)) return true
  const t = featuresText.toLowerCase()
  if (
    /\b(w\s+kolorze|koloru|kolorze|odcieniu|odcienia|barwie|barwa\s*[,;]|\bkolor\s+[a-ząćęłńóśźż])/.test(
      t
    )
  ) {
    return true
  }
  if (
    /\b(czarny|czarna|biały|biała|granatowy|granatowa|szary|szara|beżowy|zielony|czerwony|niebieski|różowy|żółty|brązowy|srebrny|złoty|wielokolor|wielobarwn|pastelow|neonow|matow|błyszcząc)\b/i.test(
      t
    )
  ) {
    return true
  }
  return false
}

/** Waga jako osobna sekcja (jak typowy wpis użytkownika). */
export function featuresHasWeightHeader(featuresText: string): boolean {
  return featuresHasAnyHeader(featuresText, ["Waga", "Masa"])
}
