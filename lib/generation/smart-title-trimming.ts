/**
 * Smart Trimming — gdy nazwa produktu jest dłuższa niż limit tytułu na platformie,
 * model ma przeredagować tytuł (priorytety słów), a nie ucinać końcówkę długiego tekstu.
 */

export function needsSmartTitleTrimming(
  productName: string,
  titleMaxChars: number
): boolean {
  return productName.trim().length > titleMaxChars
}

/**
 * Reguły systemowe — zawsze w promptcie; model wie, że „ucięcie” jest zabronione,
 * gdy w user prompt pojawi się blok SMART TRIMMING lub gdy NAZWA jest długa.
 */
export function getSmartTitleTrimmingSystemRules(): string {
  return `SMART TRIMMING (TYTUŁ „seoTitle”):
Jeśli NAZWA PRODUKTU od użytkownika jest dłuższa niż limit znaków tytułu na wybranej platformie, pole „seoTitle” MUSI być napisane od nowa jako skrót redakcyjny mieszczący się w limicie.
- ZAKAZ: nie wolno zbudować tytułu przez mechaniczne obcięcie końcówki NAZWY ani przez skopiowanie NAZWY i usunięcie ostatnich wyrazów bez sensownej kompresji.
- WYMAGANE: wybierz najważniejsze słowa (typ produktu / kategoria, kluczowa cecha, rozmiar lub wariant, marka jeśli zmieści się naturalnie); usuń puste słowa, powtórzenia i zbędne przymiotniki; skracaj frazy, nie „ogon”.
- Najmocniejsze słowa na początku tytułu (lewa strona).
- „seoTitle” ≤ limit platformy (każdy znak się liczy).`
}

/**
 * Dynamiczny blok do user promptu — gdy NAZWA przekracza limit, model dostaje jawny sygnał.
 */
export function buildSmartTitleTrimmingUserBlock(
  productName: string,
  titleMaxChars: number,
  platformName: string,
  platformSlug?: string
): string {
  const name = productName.trim()
  if (name.length <= titleMaxChars) return ""

  const over = name.length - titleMaxChars
  const allegroHint =
    platformSlug === "allegro"
      ? `Dla Allegro (50 zn.): tytuł oferty napędza wyszukiwarkę — pierwsze słowa muszą oddawać „co to jest” i najważniejszy wyróżnik; nie trać limitu na puste słowa.\n`
      : ""

  return `
SMART TRIMMING — AKTYWNY
NAZWA użytkownika ma ${name.length} znaków; limit „seoTitle” dla ${platformName}: ${titleMaxChars} znaków (nadmiar ok. ${over} znaków do kompresji).
${allegroHint}Wygeneruj „seoTitle” jako NOWY, skondensowany tytuł (≤ ${titleMaxChars} znaków). Nie wolno: skopiować całej NAZWY i uciąć końca.
Priorytet: 1) typ produktu / co kupuję 2) najważniejsza cecha lub rozmiar 3) marka, jeśli zmieści się bez sztucznego ściskania.
`
}
